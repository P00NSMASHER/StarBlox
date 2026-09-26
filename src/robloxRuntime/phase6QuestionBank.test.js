import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){ return readFileSync(new URL('../../'+path,import.meta.url),'utf8'); }
function stable(value){
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if(value && typeof value === 'object'){
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}
function questionHash(question){
  const keys=['id','stationId','subject','skill','prompt','choices','answer','explanation','provenance','sourceFact','tier','domain','difficulty'];
  const payload={};
  for(const key of keys) if(question[key] !== undefined) payload[key]=question[key];
  return 'sha256:'+createHash('sha256').update(stable(payload)).digest('hex');
}
function byStation(source){
  const result=new Map();
  for(const question of source.questions){
    const pool=result.get(question.stationId)||[];
    pool.push(question);
    result.set(question.stationId,pool);
  }
  return result;
}

describe('Phase 8: challenging material-first Grade 2 bank with STAR-aligned fallback',()=>{
  it('pins 60 validated questions with 20 per station and material-first ordering',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    expect(source.status).toBe('certified-source-grounded-plus-star-fallback');
    expect(source.certificationVersion).toBe('phase8-material-first-star-fallback-v1');
    expect(source.upstream.repository).toBe('P00NSMASHER/abvmschoolstarworld');
    expect(source.upstream.path).toBe('pages/data/study-pack.json');
    expect(source.upstream.blobSha).toBe('9db898dbdba7208778ec3f61d25a427bb3dd8b60');
    expect(source.upstream.packSourceHash).toBe('teacher-pages-0ca987de6de2d3791e25');
    expect(source.qualityPolicy.materialFirst).toBe(true);
    expect(source.qualityPolicy.materialQuestionsPerStation).toBe(12);
    expect(source.qualityPolicy.starFallbackQuestionsPerStation).toBe(8);
    expect(source.qualityPolicy.minimumDifficulty).toBe(2);
    expect(source.questions).toHaveLength(60);

    const ids=new Set();
    const grouped=byStation(source);
    for(const question of source.questions){
      expect(ids.has(question.id)).toBe(false);
      ids.add(question.id);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices).toContain(question.answer);
      expect(question.difficulty).toBeGreaterThanOrEqual(2);
      expect(question.contentHash).toBe(questionHash(question));
    }
    expect([...grouped.keys()].sort()).toEqual(['culture-lab-culture-v1','spelling-forge-fog-v1','word-portal-put-v1']);
    for(const pool of grouped.values()){
      expect(pool).toHaveLength(20);
      expect(pool.slice(0,12).every(q=>q.tier==='material')).toBe(true);
      expect(pool.slice(12).every(q=>q.tier==='star-fallback')).toBe(true);
    }
  });

  it('hard-rejects meta/list recognition and requires material-focused challenge',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const forbidden=[/sight word/i,/which .* is on the current .* list/i,/what .* is being practiced this week/i,/which story is on the current .* page/i,/teacher page/i,/study list/i];
    for(const question of source.questions){
      for(const pattern of forbidden) expect(question.prompt).not.toMatch(pattern);
      expect(question.prompt.length).toBeGreaterThan(20);
    }
    const material=source.questions.filter(q=>q.tier==='material');
    expect(material.some(q=>q.sourceFact.includes('Subtraction to 12'))).toBe(true);
    expect(material.some(q=>q.sourceFact.includes('types of sentences'))).toBe(true);
    expect(material.some(q=>q.sourceFact.includes('2-letter consonant blends'))).toBe(true);
    expect(material.some(q=>q.subject==='Religion')).toBe(true);
  });

  it('covers public STAR Reading and Math domains with original fallback items only',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const fallback=source.questions.filter(q=>q.tier==='star-fallback');
    expect(fallback).toHaveLength(24);
    expect(fallback.every(q=>q.provenance==='original-star-aligned-practice')).toBe(true);
    expect(fallback.every(q=>['Reading / ELA','Math'].includes(q.subject))).toBe(true);
    const domains=new Set(fallback.map(q=>q.domain));
    for(const domain of source.starAlignment.readingDomains) expect(domains.has(domain)).toBe(true);
    for(const domain of source.starAlignment.mathDomains) expect(domains.has(domain)).toBe(true);
    expect(source.starAlignment.itemPolicy).toBe('original-practice-only-not-copied-test-items');
  });

  it('keeps answer keys server-only and rotates all 20 questions per station',()=>{
    const bank=read('roblox/src/server/CoreQuestionBank.luau');
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    for(const question of source.questions){
      expect(bank).toContain('Id = '+JSON.stringify(question.id));
      expect(bank).toContain('ContentHash = '+JSON.stringify(question.contentHash));
    }
    expect(bank.match(/\t\t\tAnswer = /g)?.length).toBe(60);
    expect(bank).toContain('local index = (clean % #pool) + 1');
    expect(config).toContain('BankRevision = "phase8-material-first-star-fallback-v1"');
    expect(config).toContain('QuestionsPerStation = 20');
    expect(config).toContain('Strategy = "persistent-per-station-after-correct-answer"');
  });
});
