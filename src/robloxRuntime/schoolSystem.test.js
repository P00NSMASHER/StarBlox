import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('School system milestones 7-12',()=>{
  it('layers physical school anchors outside the immutable Brookhaven baseline',()=>{
    const bindings=read('roblox/src/shared/SchoolWorldBindings.luau');
    const attendance=read('roblox/src/server/SchoolAttendanceService.luau');

    expect(bindings).toContain('BrookhavenWorldBaseline');
    expect(bindings).toContain('StarBloxSchoolAnchors');
    expect(bindings).toContain('BaselineMutationAllowed = false');

    for(const id of [
      'BHW_4876','BHW_3828','BHW_4309','BHW_3830',
      'BHW_3041','BHW_4667','BHW_3405','BHW_4820'
    ]){
      expect(bindings).toContain(id);
    }

    expect(attendance).toContain('folder.Parent = Workspace');
    expect(attendance).toContain('anchor.Parent = folder');
    expect(attendance).not.toContain('anchor.Parent = worldRoot');
    expect(attendance).toContain('OnTimeGraceSeconds');
    expect(attendance).toContain('"MISSED"');
  });

  it('ships a HUD, waypoint, classroom interaction UI, feedback, and report cards',()=>{
    const client=read('roblox/src/client/SchoolSystem.client.luau');

    for(const token of [
      'SchoolHud','SchoolWaypoint','ClassroomPanel','SubmitClassAnswer',
      'TODAY\'S REPORT','School dismissed — free roam!'
    ]){
      expect(client).toContain(token);
    }

    expect(client).toContain('targetAnchorName');
    expect(client).toContain('HumanoidRootPart');
    expect(client).toContain('result.scaffold');
  });

  it('keeps answer authority server-side and freezes active class snapshots',()=>{
    const selector=read('roblox/src/server/ClassQuestionSelector.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');
    const replica=read('roblox/src/server/ReplicaStateService.luau');

    expect(selector).toContain('Answer = question.Answer');
    expect(sessions).toContain('QuestionSnapshots = snapshots');
    expect(sessions).toContain('reusedPinnedBundle = true');

    expect(replica).not.toContain('QuestionSnapshots');
    expect(replica).not.toContain('Answer =');
    expect(replica).not.toContain('Attempts =');
  });

  it('makes STAR Lab weakness-aware while preserving teacher-snapshot pinning',()=>{
    const selector=read('roblox/src/server/ClassQuestionSelector.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');
    const template=read('roblox/src/shared/ProfileTemplate.luau');

    expect(selector).toContain('weaknessScore');
    expect(selector).toContain('ConsecutiveWrong');
    expect(selector).toContain('SelectBundleForProfile');
    expect(sessions).toContain('classId == "star-lab"');
    expect(sessions).toContain('BankSnapshotId = bundle.bankSnapshotId');

    expect(template).toContain('SkillStats = {}');
    expect(template).toContain('AdaptiveByStation = {}');
  });

  it('uses deterministic one-time reward receipts and a three-school-day daily cap',()=>{
    const progress=read('roblox/src/server/SchoolProgressService.luau');
    const config=read('roblox/src/shared/SchoolConfig.luau');

    expect(config).toContain('QuestionCoins = 10');
    expect(config).toContain('MaxRewardedSchoolDaysPerUtcDay = 3');

    expect(progress).toContain('questionId .. "|correct"');
    expect(progress).toContain('"|class-complete"');
    expect(progress).toContain('"|full-day"');
    expect(progress).toContain('state.Receipts[key] == true');
    expect(progress).toContain('state.RewardedSchoolDays < Config.Rewards.MaxRewardedSchoolDaysPerUtcDay');
  });

  it('keeps the completed system dark until an explicit release decision',()=>{
    const config=read('roblox/src/shared/SchoolConfig.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(config).toContain('SchoolSystemEnabled = false');
    expect(bootstrap).toContain('if SchoolConfig.FeatureFlags.SchoolSystemEnabled == true then');
    expect(bootstrap).toContain('schoolRuntime = SchoolRuntimeService.new(profiles, replicas)');
  });
});
