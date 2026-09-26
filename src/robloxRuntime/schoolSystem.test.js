import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('School system milestones 7-12',()=>{
  it('layers classrooms, entrance, cafeteria, and make-up library outside the immutable Brookhaven baseline',()=>{
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
    expect(attendance).toContain('SchoolEntrance');
    expect(attendance).toContain('SchoolCafeteria');
    expect(attendance).toContain('SchoolLibrary');
    expect(attendance).toContain('MakeUpClassPrompt');
    expect(attendance).toContain('ValidateProximity');
    expect(attendance).toContain('OnTimeGraceSeconds');
    expect(attendance).toContain('"MISSED"');
  });

  it('provides synchronized period state, passing-period navigation, and a live client countdown',()=>{
    const clock=read('roblox/src/server/SchoolClockService.luau');
    const runtime=read('roblox/src/server/SchoolRuntimeService.luau');
    const client=read('roblox/src/client/SchoolSystem.client.luau');

    expect(clock).toContain('CycleOffsetSeconds = offsetSeconds');
    expect(clock).toContain('UpcomingClassId');
    expect(clock).toContain('UpcomingClassName');
    expect(clock).toContain('PeriodEndsAtUnix');
    expect(runtime).toContain('clock.PeriodKind == "arrival" or clock.PeriodKind == "passing"');
    expect(runtime).toContain('SchoolCafeteria');
    expect(runtime).toContain('targetDisplayName');
    expect(runtime).toContain('targetRoom');

    expect(client).toContain('stateReceivedAt = os.clock()');
    expect(client).toContain('state.clock.SecondsRemaining - elapsed');
    expect(client).toContain('state.targetDisplayName');
    expect(client).toContain('state.targetRoom');
    expect(client).toContain('HumanoidRootPart');
  });

  it('ships classroom UI, retry feedback/scaffolding, report cards, and dismissal/make-up messaging',()=>{
    const client=read('roblox/src/client/SchoolSystem.client.luau');

    for(const token of [
      'SchoolHud','SchoolWaypoint','ClassroomPanel','SubmitClassAnswer',
      'TODAY\'S REPORT','School dismissed — free roam!','Missed work available at the Library.'
    ]){
      expect(client).toContain(token);
    }

    expect(client).toContain('result.scaffold');
    expect(client).toContain('MAKE-UP');
    expect(client).toContain('submitting');
    expect(client).toContain('UISizeConstraint');
  });

  it('keeps answer authority server-side, freezes active bundles, and resets cursors only for future classes after teacher updates',()=>{
    const selector=read('roblox/src/server/ClassQuestionSelector.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');
    const replica=read('roblox/src/server/ReplicaStateService.luau');
    const template=read('roblox/src/shared/ProfileTemplate.luau');

    expect(selector).toContain('Answer = question.Answer');
    expect(selector).toContain('CurrentSnapshotId');
    expect(sessions).toContain('QuestionSnapshots = pinBundle(bundle)');
    expect(sessions).toContain('reusedPinnedBundle = true');
    expect(sessions).toContain('resetClassCursorsForNewSnapshot');
    expect(sessions).toContain('school.QuestionCursorByClass = {}');
    expect(sessions).toContain('LastQuestionBankSnapshotId');
    expect(template).toContain('LastQuestionBankSnapshotId = ""');

    expect(replica).not.toContain('QuestionSnapshots');
    expect(replica).not.toContain('Answer =');
    expect(replica).not.toContain('Attempts =');
  });

  it('makes STAR Lab choose the weaker subject and weakest current skills without a live model dependency',()=>{
    const selector=read('roblox/src/server/ClassQuestionSelector.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const config=read('roblox/src/shared/SchoolConfig.luau');

    expect(selector).toContain('weaknessScore');
    expect(selector).toContain('subjectWeakness');
    expect(selector).toContain('ChooseStarLabSubject');
    expect(selector).toContain('ConsecutiveWrong');
    expect(selector).toContain('effectiveCursor = 0');
    expect(selector).toContain('SelectBundleForProfile');
    expect(sessions).toContain('classId == "star-lab"');
    expect(sessions).toContain('BankSnapshotId = bundle.bankSnapshotId');

    expect(template).toContain('SkillStats = {}');
    expect(template).toContain('AdaptiveByStation = {}');
    expect(config).toContain('NoLiveLlm = true');
  });

  it('records on-time/tardy/missed attendance once, reconciles late joins, and resumes missed work after school',()=>{
    const attendance=read('roblox/src/server/SchoolAttendanceService.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');
    const runtime=read('roblox/src/server/SchoolRuntimeService.luau');

    expect(attendance).toContain('AttendanceCounted');
    expect(attendance).toContain('"ON_TIME"');
    expect(attendance).toContain('"TARDY"');
    expect(attendance).toContain('"MISSED"');

    expect(runtime).toContain('_reconcilePastPeriods');
    expect(runtime).toContain('definition.EndOffsetSeconds <= clock.CycleOffsetSeconds');
    expect(runtime).toContain('Sessions.FinalizePeriod');
    expect(runtime).toContain('clock.PeriodKind ~= "after-school"');
    expect(runtime).toContain('Makeup');
    expect(runtime).toContain('rate_limited');

    expect(sessions).toContain('FindMakeupPeriod');
    expect(sessions).toContain('OpenMakeupClass');
    expect(sessions).toContain('ResolvePeriodForSession');
    expect(sessions).toContain('existing.Makeup = true');
  });

  it('uses deterministic one-time receipts, pays at most 200 base coins per school day, and caps paid days at three',()=>{
    const progress=read('roblox/src/server/SchoolProgressService.luau');
    const config=read('roblox/src/shared/SchoolConfig.luau');
    const report=read('roblox/src/server/ReportCardService.luau');

    expect(config).toContain('QuestionCoins = 10');
    expect(config).toContain('QuestionsPerAcademicPeriod = 4');
    expect(config).toContain('MaxRewardedSchoolDaysPerUtcDay = 3');
    const academicClasses=5;
    const questionsPerClass=4;
    const coinsPerQuestion=10;
    expect(academicClasses*questionsPerClass*coinsPerQuestion).toBe(200);

    expect(progress).toContain('questionId .. "|correct"');
    expect(progress).toContain('"|class-complete"');
    expect(progress).toContain('"|full-day"');
    expect(progress).toContain('state.Receipts[key] == true');
    expect(progress).toContain('state.RewardedSchoolDays < Config.Rewards.MaxRewardedSchoolDaysPerUtcDay');
    expect(report).toContain('SchoolProgressService.ApplyFullDay');
  });

  it('turns the school flag into a clean learning-loop migration switch',()=>{
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');
    const runtime=read('roblox/src/server/SchoolRuntimeService.luau');

    expect(server).toContain('SchoolConfig.FeatureFlags.SchoolSystemEnabled ~= true');
    expect(client).toContain('SchoolConfig.FeatureFlags.SchoolSystemEnabled == true');
    expect(client).toContain('return');
    expect(bootstrap).toContain('SchoolRuntimeService.new(profiles, replicas, coreLoop)');
    expect(runtime).toContain('_syncLegacyPrompts');
  });

  it('keeps the completed system dark until an explicit release decision',()=>{
    const config=read('roblox/src/shared/SchoolConfig.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(config).toContain('SchoolSystemEnabled = false');
    expect(bootstrap).toContain('if SchoolConfig.FeatureFlags.SchoolSystemEnabled == true then');
    expect(bootstrap).toContain('schoolRuntime = SchoolRuntimeService.new(profiles, replicas, coreLoop)');
  });
});
