import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function runGenerator(pack,scannerCommit='test-scanner-sha'){
  const dir=mkdtempSync(join(tmpdir(),'starblox-question-sync-'));
  try{
    const packPath=join(dir,'pack.json');
    const sourcePath=join(dir,'source.json');
    const luaPath=join(dir,'bank.luau');
    const packOut=join(dir,'pack-out.json');
    writeFileSync(packPath,JSON.stringify(pack,null,2));
    execFileSync(process.execPath,[
      fileURLToPath(new URL('../../scripts/sync-question-bank-from-abvm.mjs',import.meta.url)),
      '--pack',packPath,
      '--source-out',sourcePath,
      '--lua-out',luaPath,
      '--pack-out',packOut,
      '--scanner-commit',scannerCommit
    ],{stdio:'pipe'});
    return JSON.parse(readFileSync(sourcePath,'utf8'));
  }finally{
    rmSync(dir,{recursive:true,force:true});
  }
}

describe('Daily ABVM curriculum -> StarBlox question sync',()=>{
  it('runs the exact ABVM scanner and health gate on the same two daily times',()=>{
    const workflow=read('.github/workflows/sync-abvm-questions.yml');
    expect(workflow).toContain("cron: '17 13 * * *'");
    expect(workflow).toContain("cron: '47 15 * * *'");
    expect(workflow.match(/timezone: 'America\/New_York'/g)?.length).toBe(2);
    expect(workflow).toContain('repository: P00NSMASHER/abvmschoolstarworld');
    expect(workflow).toContain('node .abvm/scripts/refresh-teacher-pages.mjs');
    expect(workflow).toContain('node .abvm/scripts/check-refresh-health.mjs --require-today --max-age-hours 1');
    expect(workflow).toContain('git -C .abvm rev-parse HEAD');
    expect(workflow).toContain('--scanner-commit');
    expect(workflow).toContain("if(data?.delivery!=='verified') throw new Error('legacy ABVM fallback is not verified')");
    expect(workflow).toContain('legacy ABVM fallback integrity passed');
  });

  it('regenerates school-material and STAR questions together when verified material changes',()=>{
    const current=JSON.parse(read('docs/phase6/ABVM_CURRENT_STUDY_PACK.json'));
    const changed=structuredClone(current);
    changed.pack.sourceHash='teacher-pages-11111111111111111111';
    changed.sourceCapturedAt='2026-09-26T12:00:00.000Z';
    changed.sourceLastCheckedAt='2026-09-26T12:00:00.000Z';

    const math=changed.pack.subjects.find(item=>item.subject==='Math');
    expect(math).toBeTruthy();
    math.topics=['Addition within 20'];
    math.studyNotes=['New verified math focus for this curriculum snapshot.'];

    const before=runGenerator(current,'scanner-before');
    const after=runGenerator(changed,'scanner-after');

    expect(before.generatedFrom.sourceHash).not.toBe(after.generatedFrom.sourceHash);
    expect(before.generatedFrom.bankSnapshotId).not.toBe(after.generatedFrom.bankSnapshotId);
    expect(after.generatedFrom.scannerCommit).toBe('scanner-after');
    expect(after.generatedFrom.generatorVersion).toBe('dynamic-abvm-star-sync-generator-v3-research-1-6');

    const beforeMaterial=before.questions.filter(q=>q.tier==='material'&&q.subject==='Math').map(q=>q.prompt);
    const afterMaterial=after.questions.filter(q=>q.tier==='material'&&q.subject==='Math').map(q=>q.prompt);
    expect(afterMaterial).not.toEqual(beforeMaterial);

    const beforeStar=before.questions.filter(q=>q.tier==='star-fallback').map(q=>[q.prompt,q.choices]);
    const afterStar=after.questions.filter(q=>q.tier==='star-fallback').map(q=>[q.prompt,q.choices]);
    expect(afterStar).not.toEqual(beforeStar);
    expect(after.starAlignment.regenerationPolicy).toBe('regenerate-on-every-verified-ABVM-source-change');
  });

  it('publishes at least 25 STAR Reading and 25 STAR Math questions in every snapshot',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    expect(source.starAlignment.readingQuestionCount).toBeGreaterThanOrEqual(25);
    expect(source.starAlignment.mathQuestionCount).toBeGreaterThanOrEqual(25);
    const fallback=source.questions.filter(q=>q.tier==='star-fallback');
    expect(fallback.filter(q=>q.subject==='Reading / ELA')).toHaveLength(source.starAlignment.readingQuestionCount);
    expect(fallback.filter(q=>q.subject==='Math')).toHaveLength(source.starAlignment.mathQuestionCount);
    expect(fallback.every(q=>q.provenance==='original-star-aligned-practice-regenerated-with-curriculum-snapshot')).toBe(true);
  });

  it('resets question rotation when a new certified bank snapshot arrives',()=>{
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
