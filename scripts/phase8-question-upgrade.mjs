import {readFileSync,writeFileSync,unlinkSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

const questions=JSON.parse(gunzipSync(Buffer.from("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",'base64')).toString('utf8'));
const VERSION='phase8-material-first-star-fallback-v1';
const STATIONS=['word-portal-put-v1','spelling-forge-fog-v1','culture-lab-culture-v1'];

const source={
  schemaVersion:3,
  certificationVersion:VERSION,
  status:'certified-source-grounded-plus-star-fallback',
  upstream:{
    repository:'P00NSMASHER/abvmschoolstarworld',
    path:'pages/data/study-pack.json',
    blobSha:'9db898dbdba7208778ec3f61d25a427bb3dd8b60',
    packSourceHash:'teacher-pages-0ca987de6de2d3791e25',
    sourceCapturedAt:'2026-09-24T20:13:58.158Z',
    weekLabel:'Week of September 21, 2026'
  },
  starAlignment:{
    assessment:'Renaissance Star Reading and Star Math',
    itemPolicy:'original-practice-only-not-copied-test-items',
    readingDomains:['Word knowledge and skills','Comprehension strategies and constructing meaning','Analyzing literary text','Understanding author’s craft'],
    mathDomains:['Numbers and operations','Algebra','Geometry and measurement','Data analysis, statistics, and probability']
  },
  qualityPolicy:{
    materialFirst:true,
    materialQuestionsPerStation:12,
    starFallbackQuestionsPerStation:8,
    forbiddenMetaPromptPatterns:['sight word','which .* is on the current .* list','what .* is being practiced this week','which story is on the current .* page','teacher page','study list'],
    minimumDifficulty:2,
    answersServerOnly:true,
    minimumQuestionsPerStation:20,
    rotation:'persistent-per-station-after-correct-answer',
    tierOrder:'12 material questions, then 8 original STAR-aligned fallback questions',
    noLiveLlm:true
  },
  questions
};
writeFileSync('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json',JSON.stringify(source,null,2)+'\n');

const q=JSON.stringify;
const lines=[];
lines.push('--!strict','','-- Phase 8: challenging material-first Grade 2 questions with original STAR-aligned fallback.','-- Answers remain server-only because this module lives under ServerScriptService.','local CoreQuestionBank = {}','');
lines.push('local SOURCE = table.freeze({');
lines.push('\tCertificationVersion = '+q(VERSION)+',');
lines.push('\tUpstreamRepository = '+q(source.upstream.repository)+',');
lines.push('\tUpstreamPath = '+q(source.upstream.path)+',');
lines.push('\tUpstreamBlobSha = '+q(source.upstream.blobSha)+',');
lines.push('\tPackSourceHash = '+q(source.upstream.packSourceHash)+',');
lines.push('\tSourceCapturedAt = '+q(source.upstream.sourceCapturedAt)+',');
lines.push('\tWeekLabel = '+q(source.upstream.weekLabel)+',');
lines.push('\tAnswersServerOnly = true,','\tMaterialFirst = true,','\tStarFallback = true,','\tNoLiveLlm = true,','})','');
lines.push('local QUESTIONS_BY_STATION = table.freeze({');
for(const stationId of STATIONS){
  lines.push('\t['+q(stationId)+'] = table.freeze({');
  for(const item of questions.filter(x=>x.stationId===stationId)){
    lines.push('\t\ttable.freeze({');
    const fields=[['Id','id'],['StationId','stationId'],['ContentHash','contentHash'],['Prompt','prompt']];
    for(const [lua,key] of fields) lines.push('\t\t\t'+lua+' = '+q(item[key])+',');
    lines.push('\t\t\tChoices = table.freeze({'+item.choices.map(q).join(', ')+'}),');
    for(const [lua,key] of [['Answer','answer'],['Explanation','explanation'],['Subject','subject'],['Skill','skill'],['Provenance','provenance'],['SourceFact','sourceFact'],['Tier','tier'],['Domain','domain']]){
      lines.push('\t\t\t'+lua+' = '+q(item[key])+',');
    }
    lines.push('\t\t\tDifficulty = '+item.difficulty+',');
    lines.push('\t\t}),');
  }
  lines.push('\t}),');
}
lines.push('})','',
'local BY_ID = {}',
'for _, pool in QUESTIONS_BY_STATION do',
'\tfor _, question in pool do',
'\t\tBY_ID[question.Id] = question',
'\tend',
'end','',
'local function normalizedCursor(value: any): number',
'\tlocal parsed = tonumber(value) or 0',
'\tif parsed ~= parsed then return 0 end',
'\treturn math.max(0, math.floor(parsed))',
'end','',
'function CoreQuestionBank.Select(stationId: string, cursor: any)',
'\tlocal pool = QUESTIONS_BY_STATION[stationId]',
'\tif pool == nil or #pool == 0 then return nil end',
'\tlocal clean = normalizedCursor(cursor)',
'\tlocal index = (clean % #pool) + 1',
'\treturn pool[index]',
'end','',
'function CoreQuestionBank.GetById(questionId: string)',
'\treturn BY_ID[questionId]',
'end','',
'function CoreQuestionBank.Grade(questionId: any, choice: any): boolean',
'\tif type(questionId) ~= "string" or type(choice) ~= "string" then return false end',
'\tlocal question = BY_ID[questionId]',
'\treturn question ~= nil and string.lower(choice) == string.lower(question.Answer)',
'end','',
'function CoreQuestionBank.CountForStation(stationId: string): number',
'\tlocal pool = QUESTIONS_BY_STATION[stationId]',
'\treturn if pool == nil then 0 else #pool',
'end','',
'CoreQuestionBank.Source = SOURCE',
'CoreQuestionBank.QuestionsByStation = QUESTIONS_BY_STATION','',
'return table.freeze(CoreQuestionBank)','');
writeFileSync('roblox/src/server/CoreQuestionBank.luau',lines.join('\n'));

let config=readFileSync('roblox/src/shared/CoreLoopConfig.luau','utf8');
config=config
 .replace('PolishRevision = "phase7-questions-coins-homes-v1"','PolishRevision = "phase8-challenging-questions-v1"')
 .replace('BankRevision = "phase7-material-first-question-source-v1"','BankRevision = "phase8-material-first-star-fallback-v1"')
 .replace('QuestionsPerStation = 6','QuestionsPerStation = 20')
 .replaceAll('Source = "ABVM Grade 2 current source pack"','Source = "Grade 2: current ABVM material first, then STAR-aligned practice"');
writeFileSync('roblox/src/shared/CoreLoopConfig.luau',config);

const test = String.raw`import {createHash} from 'node:crypto';
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
`;
writeFileSync('src/robloxRuntime/phase6QuestionBank.test.js',test);

for(const file of ['scripts/phase8-question-upgrade.mjs','.github/workflows/phase8-question-upgrade.yml']){
  if(existsSync(file)) unlinkSync(file);
}
console.log('phase8 question upgrade generated:',questions.length,'questions');
