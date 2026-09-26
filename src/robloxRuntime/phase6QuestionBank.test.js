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

describe('Phase 7: material-first rotating Grade 2 question bank',()=>{
  it('pins 18 source-grounded questions with six questions per station',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    expect(source.status).toBe('certified-source-grounded');
    expect(source.certificationVersion).toBe('phase7-material-first-question-source-v1');
    expect(source.upstream.repository).toBe('P00NSMASHER/abvmschoolstarworld');
    expect(source.upstream.path).toBe('pages/data/study-pack.json');
    expect(source.upstream.blobSha).toBe('9db898dbdba7208778ec3f61d25a427bb3dd8b60');
    expect(source.upstream.packSourceHash).toBe('teacher-pages-0ca987de6de2d3791e25');
    expect(source.qualityPolicy.answersServerOnly).toBe(true);
    expect(source.qualityPolicy.materialFirst).toBe(true);
    expect(source.qualityPolicy.noLiveLlm).toBe(true);
    expect(source.qualityPolicy.rotation).toBe('persistent-per-station-after-correct-answer');
    expect(source.questions).toHaveLength(18);

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
      'word-portal-put-v1':6,
      'spelling-forge-fog-v1':6,
      'culture-lab-culture-v1':6
    });
  });

  it('forbids meta/list-recognition questions and tests the material itself',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const forbidden=[
      /which .* is a (?:current )?sight word/i,
      /which .* is on the current .* list/i,
      /what .* is being practiced this week/i,
      /which story is on the current .* page/i,
      /which word is on the current vocabulary list/i,
      /what phonics skill is being practiced/i
    ];
    for(const question of source.questions){
      for(const pattern of forbidden){
        expect(question.prompt).not.toMatch(pattern);
      }
      expect(question.prompt).not.toMatch(/teacher page|current list|study list/i);
    }

    expect(source.questions.some(q=>q.prompt.includes('___ is your favorite book?'))).toBe(true);
    expect(source.questions.some(q=>q.prompt.includes('What kind of sentence is this?'))).toBe(true);
    expect(source.questions.some(q=>q.prompt.includes('consonant-vowel-consonant'))).toBe(true);
    expect(source.questions.some(q=>q.prompt.includes('three Persons in the Trinity'))).toBe(true);
  });

  it('keeps answer keys server-only and binds every question to a station',()=>{
    const bank=read('roblox/src/server/CoreQuestionBank.luau');
    const shared=read('roblox/src/shared/CoreLoopConfig.luau');
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));

    for(const question of source.questions){
      expect(bank).toContain('Id = '+JSON.stringify(question.id));
      expect(bank).toContain('StationId = '+JSON.stringify(question.stationId));
      expect(bank).toContain('ContentHash = '+JSON.stringify(question.contentHash));
    }
    expect(bank.match(/\t\t\tAnswer = /g)?.length).toBe(18);
    expect(shared).not.toContain('Answer = ');
    expect(shared).not.toContain('Choices = table.freeze');
    expect(service).not.toContain('local ANSWERS = table.freeze');
    expect(service).toContain('questionId = selectedQuestion.Id');
    expect(service).toContain('question.StationId ~= activityId');
    expect(service).toContain('expected.Id ~= questionId');
    expect(service).toContain('CoreGameLoopService.GradeAnswer(session.questionId, request.choice)');
  });

  it('rotates by persistent per-station cursor after a correct answer',()=>{
    const bank=read('roblox/src/server/CoreQuestionBank.luau');
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    const template=read('roblox/src/shared/ProfileTemplate.luau');

    expect(bank).toContain('local index = (clean % #pool) + 1');
    expect(config).toContain('Strategy = "persistent-per-station-after-correct-answer"');
    expect(config).toContain('QuestionsPerStation = 6');
    expect(template).toContain('QuestionCursorByStation = {}');
    expect(service).toContain('cursors[activityId] = currentCursor + 1');
    expect(service).toContain('CoreQuestionBank.Select(activityId, currentCursor + 1)');
  });
});
