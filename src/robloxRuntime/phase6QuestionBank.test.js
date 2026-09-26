import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function stable(value){
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if(value && typeof value === 'object'){
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}
function questionHash(question){
  const keys=[
    'id','stationId','subject','skill','prompt','choices','answer','explanation',
    'provenance','sourceQuestionId','sourceFact'
  ];
  const payload={};
  for(const key of keys){
    if(question[key] !== undefined) payload[key]=question[key];
  }
  return 'sha256:'+createHash('sha256').update(stable(payload)).digest('hex');
}

describe('Phase 6: certified rotating Grade 2 question bank',()=>{
  it('pins a source-grounded nine-question bank with three questions per station',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    expect(source.status).toBe('certified-source-grounded');
    expect(source.certificationVersion).toBe('phase6-abvm-question-source-v1');
    expect(source.upstream.repository).toBe('P00NSMASHER/abvmschoolstarworld');
    expect(source.upstream.path).toBe('pages/data/study-pack.json');
    expect(source.upstream.blobSha).toBe('9db898dbdba7208778ec3f61d25a427bb3dd8b60');
    expect(source.upstream.packSourceHash).toBe('teacher-pages-0ca987de6de2d3791e25');
    expect(source.rules.answersServerOnly).toBe(true);
    expect(source.rules.noLiveLlm).toBe(true);
    expect(source.questions).toHaveLength(9);

    const ids=new Set();
    const byStation=new Map();
    for(const question of source.questions){
      expect(ids.has(question.id)).toBe(false);
      ids.add(question.id);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices).toContain(question.answer);
      expect(question.contentHash).toBe(questionHash(question));
      byStation.set(question.stationId,(byStation.get(question.stationId)||0)+1);
    }
    expect(Object.fromEntries(byStation)).toEqual({
      'word-portal-put-v1':3,
      'spelling-forge-fog-v1':3,
      'culture-lab-culture-v1':3
    });
  });

  it('keeps answer keys server-only and binds sessions to the selected question id',()=>{
    const bank=read('roblox/src/server/CoreQuestionBank.luau');
    const shared=read('roblox/src/shared/CoreLoopConfig.luau');
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));

    for(const question of source.questions){
      expect(bank).toContain('Id = '+JSON.stringify(question.id));
      expect(bank).toContain('ContentHash = '+JSON.stringify(question.contentHash));
    }
    expect(bank).toContain('Answer = ');
    expect(shared).not.toContain('Answer = ');
    expect(shared).not.toContain('Choices = table.freeze');
    expect(service).toContain('local CoreQuestionBank = require(script.Parent.CoreQuestionBank)');
    expect(service).not.toContain('local ANSWERS = table.freeze');
    expect(service).toContain('questionId = selectedQuestion.Id');
    expect(service).toContain('function CoreGameLoopService.GradeAnswer');
    expect(service).toContain('return CoreQuestionBank.Grade(questionId, choice)');
    expect(service).toContain('CoreGameLoopService.GradeAnswer(session.questionId, request.choice)');
    expect(service).toContain('questionId = session.questionId');
  });

  it('rotates deterministically by run number without a live model dependency',()=>{
    const bank=read('roblox/src/server/CoreQuestionBank.luau');
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    expect(bank).toContain('local index = ((cleanRun - 1) % #pool) + 1');
    expect(bank).toContain('function CoreQuestionBank.Select');
    expect(config).toContain('Strategy = "deterministic-by-run-number"');
    expect(config).toContain('NoLiveLlm = true');
    expect(config).toContain('QuestionsPerStation = 3');
  });
});
