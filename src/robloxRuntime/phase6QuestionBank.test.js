import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function stable(value){
  if(Array.isArray(value)) return '['+value.map(stable).join(',')+']';
  if(value&&typeof value==='object'){
    return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';
  }
  return JSON.stringify(value);
}
function questionHash(question){
  const keys=['id','stationId','subject','skill','prompt','choices','answer','explanation','provenance','sourceFact','tier','domain','difficulty','standards','dok','cognitiveDemand','hint','scaffold','choiceDiagnostics','rubric','alignmentEvidence','responseType','richContent','experiment'];
  const payload={};
  for(const key of keys) if(question[key]!==undefined) payload[key]=question[key];
  return 'sha256:'+createHash('sha256').update(stable(payload)).digest('hex');
}
function grouped(source){
  const map=new Map();
  for(const q of source.questions){
    const pool=map.get(q.stationId)||[];
    pool.push(q);
    map.set(q.stationId,pool);
  }
  return map;
}

describe('Dynamic material-first Grade 2 bank with regenerated STAR fallback',()=>{
  it('is bound to one verified ABVM curriculum snapshot',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    expect(source.schemaVersion).toBe(4);
    expect(source.status).toBe('certified-daily-abvm-material-plus-regenerated-star-fallback');
    expect(source.certificationVersion).toBe('dynamic-abvm-star-sync-v1');
    expect(source.generatedFrom.repository).toBe('P00NSMASHER/abvmschoolstarworld');
    expect(source.generatedFrom.path).toBe('pages/data/study-pack.json');
    expect(source.generatedFrom.scanner).toBe('scripts/refresh-teacher-pages.mjs');
    expect(source.generatedFrom.healthCheck).toBe('scripts/check-refresh-health.mjs');
    expect(source.generatedFrom.sourceHash).toMatch(/^teacher-pages-[a-f0-9]{20}$/);
    expect(source.generatedFrom.bankSnapshotId).toMatch(/^abvm-[a-f0-9]{12}-[a-f0-9]{6}$/);
  });

  it('keeps material first and 40 STAR fallback questions at every station',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const pools=grouped(source);
    expect([...pools.keys()].sort()).toEqual([
      'culture-lab-culture-v1','spelling-forge-fog-v1','word-portal-put-v1'
    ]);
    for(const [stationId,pool] of pools){
      const materialCount=source.qualityPolicy.materialCountByStation[stationId]||0;
      expect(pool.length).toBe(materialCount+40);
      expect(pool.slice(0,materialCount).every(q=>q.tier==='material')).toBe(true);
      expect(pool.slice(materialCount).every(q=>q.tier==='star-fallback')).toBe(true);
    }
  });

  it('validates every generated item and permanently blocks meta/list questions',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const forbidden=[
      /sight word/i,/which .* is on the current .* list/i,/being practiced this week/i,
      /teacher page/i,/study list/i
    ];
    const ids=new Set();
    for(const question of source.questions){
      expect(ids.has(question.id)).toBe(false);
      ids.add(question.id);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices).toContain(question.answer);
      expect(question.difficulty).toBeGreaterThanOrEqual(2);
      expect(question.difficulty).toBeLessThanOrEqual(3);
      expect(question.standards.length).toBeGreaterThan(0);
      expect([1,2,3]).toContain(question.dok);
      expect(['recall-and-fluency','skill-and-concept-application','strategic-reasoning']).toContain(question.cognitiveDemand);
      expect(question.hint.length).toBeGreaterThan(10);
      expect(question.scaffold.length).toBeGreaterThan(10);
      expect(question.rubric?.maxPoints).toBe(2);
      expect(question.rubric?.criteria?.length).toBeGreaterThanOrEqual(2);
      expect(question.alignmentEvidence?.ruleVersion).toBe('grade2-alignment-v1');
      expect(question.responseType).toBe('multiple-choice');
      const wrongChoices=question.choices.filter(choice=>choice!==question.answer);
      expect(question.choiceDiagnostics).toHaveLength(wrongChoices.length);
      for(const choice of wrongChoices){
        const diagnostic=question.choiceDiagnostics.find(item=>item.choice===choice);
        expect(diagnostic?.misconception?.length).toBeGreaterThan(2);
        expect(diagnostic?.feedback?.length).toBeGreaterThan(10);
      }
      expect(question.contentHash).toBe(questionHash(question));
      for(const pattern of forbidden) expect(question.prompt).not.toMatch(pattern);
    }
  });

  it('mixes recall, application, and strategic reasoning while including multi-step math',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const doks=new Set(source.questions.map(q=>q.dok));
    expect([...doks].sort()).toEqual([1,2,3]);
    expect(source.questions.filter(q=>q.dok===3).length).toBeGreaterThanOrEqual(6);
    expect(source.questions.filter(q=>q.skill==='two-step-word-problem'&&q.subject==='Math').length).toBeGreaterThanOrEqual(3);
  });

  it('contains at least 60 original STAR Reading and 60 original STAR Math questions',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const fallback=source.questions.filter(q=>q.tier==='star-fallback');
    const reading=fallback.filter(q=>q.subject==='Reading / ELA');
    const math=fallback.filter(q=>q.subject==='Math');
    expect(reading.length).toBeGreaterThanOrEqual(60);
    expect(math.length).toBeGreaterThanOrEqual(60);
    expect(reading).toHaveLength(source.starAlignment.readingQuestionCount);
    expect(math).toHaveLength(source.starAlignment.mathQuestionCount);
    expect(fallback.every(q=>q.provenance==='original-star-aligned-practice-regenerated-with-curriculum-snapshot')).toBe(true);
    const domains=new Set(fallback.map(q=>q.domain));
    for(const domain of source.starAlignment.readingDomains) expect(domains.has(domain)).toBe(true);
    for(const domain of source.starAlignment.mathDomains) expect(domains.has(domain)).toBe(true);
  });

  it('keeps answer keys server-only and stays in the current STAR fallback after material exhaustion',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const bank=read('roblox/src/server/CoreQuestionBank.luau');
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    for(const question of source.questions){
      expect(bank).toContain('Id = '+JSON.stringify(question.id));
      expect(bank).toContain('ContentHash = '+JSON.stringify(question.contentHash));
    }
    expect(bank.match(/\t\t\tAnswer = /g)?.length).toBe(source.questions.length);
    expect(bank).toContain('local MATERIAL_COUNT_BY_STATION = table.freeze');
    expect(bank).toContain('local materialCount = MATERIAL_COUNT_BY_STATION[stationId] or 0');
    expect(bank).toContain('fallbackOffset = (clean - materialCount) % fallbackCount');
    expect(config).toContain('BankRevision = "dynamic-abvm-star-sync-v1"');
    expect(config).toContain('StarFallbackPerStation = 40');
    expect(config).toContain('Strategy = "fresh-material-once-then-current-snapshot-star-fallback-loop"');
    expect(config).toContain('ResetCursorOnBankSnapshotChange = true');
  });
});
