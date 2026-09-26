import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity x school integration seam',()=>{
  it('keeps the Brookhaven free-play view clean until a learning activity is intentionally opened',()=>{
    const client=read('roblox/src/client/CoreGameLoop.client.luau');

    expect(client).toContain('hud.Visible = false');
    expect(client).toContain('nextHint.Visible = false');
    expect(client).toContain('local function setLearningOverlayVisible(visible: boolean)');
    expect(client).toContain('player:SetAttribute("StarBloxLearningOverlayVisible", visible)');
    expect(client).toContain('local function showActivity(activity)\n\tsetLearningOverlayVisible(true)');
    expect(client).toContain('local function hidePanel()');
    expect(client).toContain('setLearningOverlayVisible(false)');
    expect(client).toContain('task.defer(function()\n\tsetLearningOverlayVisible(false)');
  });

  it('binds the running Roblox loop to the exact certified ABVM question snapshot',()=>{
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    const bank=read('roblox/src/server/CoreQuestionBank.luau');

    expect(bank).toContain('CertificationVersion = "dynamic-abvm-star-sync-v1"');
    expect(bank).toContain('MaterialFirst = true');
    const readingCount=Number(bank.match(/StarReadingCount = (\d+)/)?.[1]||0);
    const mathCount=Number(bank.match(/StarMathCount = (\d+)/)?.[1]||0);
    expect(readingCount).toBeGreaterThanOrEqual(25);
    expect(mathCount).toBeGreaterThanOrEqual(25);

    expect(service).toContain('remoteRoot:SetAttribute("QuestionBankSnapshotId", CoreQuestionBank.Source.BankSnapshotId or "")');
    expect(service).toContain('remoteRoot:SetAttribute("QuestionPackSourceHash", CoreQuestionBank.Source.PackSourceHash or "")');
    expect(service).toContain('remoteRoot:SetAttribute("QuestionSourceWeek", CoreQuestionBank.Source.WeekLabel or "")');
    expect(service).toContain('player:SetAttribute("StarBloxQuestionBankSnapshotId", CoreQuestionBank.Source.BankSnapshotId or "")');
    expect(service).toContain('bankSnapshotId = CoreQuestionBank.Source.BankSnapshotId');
    expect(service).toContain('tier = question.Tier');
    expect(service).toContain('provenance = question.Provenance');
  });

  it('hands the next school question across scopes without undefined variables',()=>{
    const service=read('roblox/src/server/CoreGameLoopService.luau');

    expect(service).toContain('local function selectedQuestionFor(profileData, activityId: string)');
    expect(service).toContain('local nextQuestion = CoreQuestionBank.Select(');
    expect(service).toContain('nextQuestionId = if nextQuestion ~= nil then nextQuestion.Id else nil');
    expect(service).toContain('nextQuestionId = questionReward.nextQuestionId');
    expect(service).not.toContain('nextQuestionId = questionReward.nextQuestionId,\n\t}\nend\n\nfunction CoreGameLoopService.GetPublicActivity');
  });

  it('uses the same exact ABVM scanner and stages only the three curriculum artifacts',()=>{
    const workflow=read('.github/workflows/sync-abvm-questions.yml');

    expect(workflow).toContain('repository: P00NSMASHER/abvmschoolstarworld');
    expect(workflow).toContain('node .abvm/scripts/refresh-teacher-pages.mjs');
    expect(workflow).toContain('node .abvm/scripts/check-refresh-health.mjs --require-today --max-age-hours 1');
    expect(workflow).toContain('docs/phase6/ABVM_CURRENT_STUDY_PACK.json');
    expect(workflow).toContain('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json');
    expect(workflow).toContain('roblox/src/server/CoreQuestionBank.luau');

    const gitAddBlock=workflow.slice(
      workflow.indexOf('git add'),
      workflow.indexOf('if git diff --cached --quiet')
    );
    expect(gitAddBlock).not.toContain('MirrorSidebar');
    expect(gitAddBlock).not.toContain('Brookhaven');
    expect(gitAddBlock).not.toContain('HomeEconomyService');
    expect(gitAddBlock).not.toContain('CoreGameLoopService');
  });

  it('publishes a changed school bank only through the existing private fail-closed release workflow',()=>{
    const sync=read('.github/workflows/sync-abvm-questions.yml');
    const release=read('.github/workflows/step9-fast-release.yml');

    expect(sync).toContain('actions: write');
    expect(sync).toContain("if: steps.curriculum_commit.outputs.changed == 'true'");
    expect(sync).toContain('gh workflow run step9-fast-release.yml');
    expect(sync).toContain('--ref main');
    expect(sync).toContain('-f action=publish-private');

    expect(release).toContain('publish-private');
    expect(release).toContain('"publicAccessChangeAllowed": false');
    expect(release).toContain('"productionActivationAllowed": false');
    expect(release).toContain('Prepare exact native-inspected release candidate');
    expect(release).toContain('Verify exact published server boot');
  });
  it('preserves the merged Grade 2 rich-question, rubric, and alignment upgrades',()=>{
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    const service=read('roblox/src/server/CoreGameLoopService.luau');
    const workflow=read('.github/workflows/sync-abvm-questions.yml');

    expect(client).toContain('richFrame.Name = "RichQuestionVisual"');
    expect(client).toContain('renderBarChart');
    expect(client).toContain('renderClock');
    expect(client).toContain('renderNumberLine');
    expect(client).toContain('resetQuestionPresentation()');
    expect(service).toContain('local function rubricScore');
    expect(service).toContain('rubricScore = rubricPoints');
    expect(service).toContain('profileData.Learning.Experiments');
    expect(workflow).toContain('Validate Grade 2 alignment before publication');
    expect(workflow).toContain('src/robloxRuntime/questionAlignmentValidator.test.js');
    expect(workflow).toContain('src/robloxRuntime/questionItemReview.test.js');
    expect(workflow).toContain('src/robloxRuntime/researchQuestionImprovements712.test.js');
  });

});
