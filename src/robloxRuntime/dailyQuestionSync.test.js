import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Daily ABVM curriculum -> StarBlox question sync',()=>{
  it('runs the same hardened ABVM scanner and health gate on the same daily cadence',()=>{
    const workflow=read('.github/workflows/sync-abvm-questions.yml');
    expect(workflow).toContain("cron: '17 13 * * *'");
    expect(workflow).toContain("cron: '47 15 * * *'");
    expect(workflow.match(/timezone: 'America\/New_York'/g)?.length).toBe(2);
    expect(workflow).toContain('repository: P00NSMASHER/abvmschoolstarworld');
    expect(workflow).toContain('node .abvm/scripts/refresh-teacher-pages.mjs');
    expect(workflow).toContain('node .abvm/scripts/check-refresh-health.mjs --require-today --max-age-hours 1');
    expect(workflow).toContain('node scripts/sync-question-bank-from-abvm.mjs --pack .abvm/pages/data/study-pack.json');
  });

  it('regenerates STAR practice only when the verified curriculum source hash changes',()=>{
    const generator=read('scripts/sync-question-bank-from-abvm.mjs');
    expect(generator).toContain("previous?.generatedFrom?.sourceHash===rawSourceHash");
    expect(generator).toContain("status:'unchanged'");
    expect(generator).toContain("regenerationPolicy:'regenerate-on-every-verified-ABVM-source-change'");
    expect(generator).toContain("for(let i=0;i<30;i++)");
    expect(generator).toContain("starRead.length<25||starMathQuestions.length<25");
    expect(generator).toContain("original-star-aligned-practice-regenerated-with-curriculum-snapshot");
  });

  it('publishes at least 25 STAR Reading and 25 STAR Math questions in every current snapshot',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    expect(source.certificationVersion).toBe('dynamic-abvm-star-sync-v1');
    expect(source.starAlignment.regenerationPolicy).toBe('regenerate-on-every-verified-ABVM-source-change');
    expect(source.starAlignment.readingQuestionCount).toBeGreaterThanOrEqual(25);
    expect(source.starAlignment.mathQuestionCount).toBeGreaterThanOrEqual(25);
    const fallback=source.questions.filter(q=>q.tier==='star-fallback');
    expect(fallback.filter(q=>q.subject==='Reading / ELA')).toHaveLength(source.starAlignment.readingQuestionCount);
    expect(fallback.filter(q=>q.subject==='Math')).toHaveLength(source.starAlignment.mathQuestionCount);
  });

  it('resets only question rotation when a new certified bank snapshot arrives',()=>{
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    expect(template).toContain('QuestionBankSnapshotId = ""');
    expect(service).toContain('CoreQuestionBank.Source.BankSnapshotId');
    expect(service).toContain('profileData.Learning.QuestionBankSnapshotId ~= snapshotId');
    expect(service).toContain('profileData.Learning.QuestionCursorByStation = {}');
    expect(service).toContain('profileData.Learning.RecentQuestionIds = {}');
    expect(service).toContain('profileData.Learning.QuestionBankSnapshotId = snapshotId');
    expect(service).not.toContain('profileData.Learning.Ability = {}');
  });
});
