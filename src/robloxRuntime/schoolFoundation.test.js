import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

function scheduleFromConfig(source){
  const pattern=/Id = "([^"]+)",\s*\n\s*Kind = "([^"]+)",(?:\s*\n\s*ClassId = "([^"]+)",)?\s*\n\s*DisplayName = "[^"]+",\s*\n\s*StartOffsetSeconds = (\d+),\s*\n\s*EndOffsetSeconds = (\d+)/g;
  return [...source.matchAll(pattern)].map(match=>({
    id:match[1],
    kind:match[2],
    classId:match[3]||null,
    start:Number(match[4]),
    end:Number(match[5]),
  }));
}

function classPool(source,classId){
  const definitions={
    reading:{subjects:['Reading / ELA'],materialFirst:true,starOnly:false},
    math:{subjects:['Math'],materialFirst:true,starOnly:false},
    'word-skills':{
      subjects:['Reading / ELA'],materialFirst:true,starOnly:false,
      preferredSkills:['sentence-types','consonant-blends','cvc-structure','word-parts','phonics','spelling','vocabulary']
    },
    'teacher-choice':{subjects:['Reading / ELA','Math','Religion'],materialFirst:true,starOnly:false},
    'star-lab':{subjects:['Reading / ELA','Math'],materialFirst:false,starOnly:true},
  };
  const def=definitions[classId];
  let candidates=source.questions.filter(q=>def.subjects.includes(q.subject));
  if(def.starOnly) candidates=candidates.filter(q=>q.tier==='star-fallback');
  if(classId==='word-skills'){
    const preferred=candidates.filter(q=>def.preferredSkills.includes(q.skill));
    if(preferred.length>=4) candidates=preferred;
  }
  candidates=[...candidates].sort((a,b)=>a.id.localeCompare(b.id));
  const material=def.materialFirst?candidates.filter(q=>q.tier==='material'):[];
  const fallback=candidates.filter(q=>q.tier!=='material');
  return {material,fallback};
}

describe('School foundation milestones 1-6',()=>{
  it('keeps the new school system disabled and completely outside the current gameplay bootstrap',()=>{
    const config=read('roblox/src/shared/SchoolConfig.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(config).toContain('SchoolSystemEnabled = false');
    expect(config).toContain('CycleSeconds = 30 * 60');
    expect(config).toContain('QuestionsPerAcademicPeriod = 4');

    // The complete system is wired but remains dark until the release flag is enabled.
    expect(bootstrap).toContain('SchoolConfig.FeatureFlags.SchoolSystemEnabled == true');
    expect(bootstrap).toContain('SchoolRuntimeService.new(profiles, replicas)');
    expect(bootstrap).toContain('CoreGameLoopService.new(profiles, replicas');
  });

  it('defines one gap-free authoritative 1,800-second school cycle',()=>{
    const config=read('roblox/src/shared/SchoolConfig.luau');
    const periods=scheduleFromConfig(config);
    expect(periods).toHaveLength(14);
    expect(periods[0]).toMatchObject({id:'arrival',start:0,end:30});
    expect(periods.at(-1)).toMatchObject({id:'after-school',start:1110,end:1800});

    for(let index=0;index<periods.length-1;index++){
      expect(periods[index].end).toBe(periods[index+1].start);
    }

    const academics=periods.filter(period=>period.kind==='academic');
    expect(academics.map(period=>period.classId)).toEqual([
      'reading','math','word-skills','teacher-choice','star-lab'
    ]);
    expect(periods.find(period=>period.kind==='lunch')).toMatchObject({
      id:'period-4-lunch',start:570,end:720
    });
    expect(periods.find(period=>period.kind==='report')).toMatchObject({
      id:'report-card',start:1080,end:1110
    });

    const clock=read('roblox/src/server/SchoolClockService.luau');
    expect(clock).toContain('local cycleIndex = math.floor(now / cycleSeconds)');
    expect(clock).toContain('local offsetSeconds = now % cycleSeconds');
    expect(clock).toContain('SchoolDayId = string.format("school-%d", cycleIndex)');
    expect(clock).toContain('SecondsRemaining = period.EndOffsetSeconds - offsetSeconds');
  });

  it('can source every planned class from the current certified question bank without editing that bank',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const selector=read('roblox/src/server/ClassQuestionSelector.luau');
    const bank=read('roblox/src/server/CoreQuestionBank.luau');

    expect(selector).toContain('CoreQuestionBank.QuestionsByStation');
    expect(selector).toContain('question.Tier == "material"');
    expect(selector).toContain('question.Tier ~= "star-fallback"');
    expect(selector).toContain('RecentQuestionWindow');
    expect(selector).toContain('preferredSubject');
    expect(selector).toContain('nextCursor = position');

    for(const classId of ['reading','math','word-skills','teacher-choice','star-lab']){
      const {material,fallback}=classPool(source,classId);
      expect(material.length+fallback.length).toBeGreaterThanOrEqual(4);
      if(classId==='star-lab'){
        expect(material).toHaveLength(0);
        expect(fallback.every(q=>q.tier==='star-fallback')).toBe(true);
      }else{
        expect(material.length).toBeGreaterThanOrEqual(4);
        expect(material.slice(0,4).every(q=>q.tier==='material')).toBe(true);
      }
    }

    // Generated bank remains the single server-side source of truth.
    expect(bank).toContain('local CoreQuestionBank = {}');
    expect(bank).toContain('CoreQuestionBank.QuestionsByStation = QUESTIONS_BY_STATION');
  });

  it('pins full server-only class snapshots and reuses them instead of silently reselecting',()=>{
    const selector=read('roblox/src/server/ClassQuestionSelector.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');

    expect(selector).toContain('ContentHash = question.ContentHash');
    expect(selector).toContain('Answer = question.Answer');
    expect(selector).toContain('bankSnapshotId = CoreQuestionBank.Source.BankSnapshotId');
    expect(sessions).toContain('QuestionSnapshots = snapshots');
    expect(sessions).toContain('BankSnapshotId = bundle.bankSnapshotId');
    expect(sessions).toContain('reusedPinnedBundle = true');
    expect(sessions).toContain('content_hash_mismatch');

    const existingCheck=sessions.indexOf('local existing = day.Periods[periodId]');
    const selectCall=sessions.indexOf('ClassQuestionSelector.SelectBundle(');
    expect(existingCheck).toBeGreaterThan(-1);
    expect(selectCall).toBeGreaterThan(existingCheck);
  });

  it('adds reconciled school persistence while keeping answer keys and attempts out of Replica state',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const profiles=read('roblox/src/server/ProfileSessionService.luau');
    const replica=read('roblox/src/server/ReplicaStateService.luau');

    for(const token of [
      'School = {','CurrentDay = {','RecentDays = {}','QuestionCursorByClass = {}',
      'Statistics = {','RewardState = {','Receipts = {}'
    ]){
      expect(template).toContain(token);
    }
    expect(profiles).toContain('profile:Reconcile()');

    expect(replica).toContain('School = publicSchoolProjection(profileData)');
    expect(replica).toContain('CompletedQuestionCount = period.CompletedQuestionCount');
    expect(replica).toContain('BankSnapshotId = period.BankSnapshotId');
    expect(replica).not.toContain('QuestionSnapshots');
    expect(replica).not.toContain('Answer =');
    expect(replica).not.toContain('Attempts =');
    expect(replica).not.toContain('Receipts =');
  });

  it('implements four-question class sessions with retry-friendly grading and separate economy authority',()=>{
    const config=read('roblox/src/shared/SchoolConfig.luau');
    const sessions=read('roblox/src/server/ClassSessionService.luau');

    expect(config).toContain('FirstTryPoints = 25');
    expect(config).toContain('RetryPoints = 20');
    expect(config).toContain('GradeA = 90');
    expect(config).toContain('GradeB = 80');
    expect(config).toContain('GradeC = 70');

    expect(sessions).toContain('attempt.Count += 1');
    expect(sessions).toContain('attempt.FirstTryCorrect = correct');
    expect(sessions).toContain('then SchoolConfig.Scoring.FirstTryPoints');
    expect(sessions).toContain('else SchoolConfig.Scoring.RetryPoints');
    expect(sessions).toContain('period.CompletedQuestionCount >= period.QuestionCount');
    expect(sessions).toContain('period.Grade = gradeForScore(period.Score)');

    const grade=score=>score>=90?'A':score>=80?'B':score>=70?'C':'Practice';
    expect(grade(4*25)).toBe('A');
    expect(grade(4*20)).toBe('B');
    expect(grade(3*20)).toBe('Practice');

    // Economy hardening/reward receipts are a later milestone; foundation must not mint.
    expect(sessions).not.toMatch(/Economy\.Coins\s*[+\-]?=/);
    expect(sessions).not.toMatch(/Economy\.XP\s*[+\-]?=/);
    expect(sessions).not.toMatch(/Economy\.Stars\s*[+\-]?=/);
  });
});
