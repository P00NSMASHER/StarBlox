import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Step 2: balanced Study Pilot mode',()=>{
  it('defines an 18-question balanced mix with repetition caps',()=>{
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    expect(config).toContain('PilotMode = table.freeze');
    expect(config).toContain('SessionLength = 18');
    expect(config).toContain('CurrentMaterialQuestions = 6');
    expect(config).toContain('PriorSkillQuestions = 4');
    expect(config).toContain('StarReadingQuestions = 4');
    expect(config).toContain('StarMathQuestions = 4');
    expect(config).toContain('MaxQuestionsPerSkill = 3');
    expect(config).toContain('MaxConsecutiveSameSkill = 1');
    expect(config).toContain('AwardsEconomy = false');
    expect(config).toContain('AdvancesChallenge = false');

    const mixer=read('roblox/src/server/PilotQuestionMixer.luau');
    const match=mixer.match(/local pattern = \{([\s\S]*?)\n\t\}/);
    expect(match).toBeTruthy();
    const pattern=match[1];
    expect((pattern.match(/"current"/g)||[]).length).toBe(6);
    expect((pattern.match(/"spaced"/g)||[]).length).toBe(4);
    expect((pattern.match(/"star-reading"/g)||[]).length).toBe(4);
    expect((pattern.match(/"star-math"/g)||[]).length).toBe(4);
    expect(mixer).toContain('state.lastSkill == skill');
    expect(mixer).toContain('(state.skillCounts[skill] or 0) >= maxPerSkill');
  });

  it('uses previously practiced skills for cumulative retrieval and bootstraps safely when history is thin',()=>{
    const mixer=read('roblox/src/server/PilotQuestionMixer.luau');
    expect(mixer).toContain('profileData.Learning');
    expect(mixer).toContain('learning.SkillStats');
    expect(mixer).toContain('(tonumber(row.Seen) or 0) > 0');
    expect(mixer).toContain('skills[question.Skill] == true');
    expect(mixer).toContain('sourceBucket = "prior-skill"');
    expect(mixer).toContain('sourceBucket = "cumulative-bootstrap"');

    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const material=source.questions.filter(q=>q.tier==='material');
    const starReading=source.questions.filter(q=>q.tier==='star-fallback'&&q.subject==='Reading / ELA');
    const starMath=source.questions.filter(q=>q.tier==='star-fallback'&&q.subject==='Math');
    expect(material.length).toBeGreaterThanOrEqual(6);
    expect(starReading.length).toBeGreaterThanOrEqual(4);
    expect(starMath.length).toBeGreaterThanOrEqual(4);
    expect(new Set(source.questions.map(q=>q.skill)).size).toBeGreaterThanOrEqual(12);
  });

  it('keeps pilot learning separate from normal challenge rewards and progression',()=>{
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    const start=server.indexOf('function CoreGameLoopService:_submitPilot');
    const end=server.indexOf('function CoreGameLoopService:_submit(player',start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const pilotBlock=server.slice(start,end);
    expect(pilotBlock).toContain('recordLearningAttempt');
    expect(pilotBlock).toContain('pilotState.QuestionsCompleted += 1');
    expect(pilotBlock).not.toContain('ApplyCorrectQuestionReward');
    expect(pilotBlock).not.toContain('ApplyCompletion');
    expect(pilotBlock).not.toContain('Economy.Coins +=');
    expect(pilotBlock).not.toContain('Economy.XP +=');
    expect(pilotBlock).not.toContain('Economy.Stars +=');
  });

  it('ships a playable private Study Pilot entry point and 1-18 progress',()=>{
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    expect(server).toContain('StartPilot');
    expect(server).toContain('SubmitPilotAnswer');
    expect(server).toContain('pilotPublicActivity');
    expect(server).toContain('result.mode = "pilot"');
    expect(client).toContain('StudyPilotButton');
    expect(client).toContain('pilotButton.Text = "Study Pilot"');
    expect(client).toContain('startPilot:InvokeServer()');
    expect(client).toContain('submitPilotAnswer:InvokeServer');
    expect(client).toContain('currentActivity.mode == "pilot"');
    expect(client).toContain('"Study Pilot • %d/%d"');
  });

  it('persists only minimal pilot progress and tags anonymous pilot attempts',()=>{
    const profile=read('roblox/src/shared/ProfileTemplate.luau');
    const telemetry=read('roblox/src/server/PrivatePlaytestTelemetryService.luau');
    expect(profile).toContain('SessionsStarted = 0');
    expect(profile).toContain('SessionsCompleted = 0');
    expect(profile).toContain('QuestionsCompleted = 0');
    expect(profile).toContain('LastCompletedAt = 0');
    expect(telemetry).toContain('pilot_started = true');
    expect(telemetry).toContain('pilot_completed = true');
    expect(telemetry).toContain('pilotAttempts');
    expect(telemetry).toContain('pilotBucketCounts');
    expect(telemetry).toContain('storesUsername = false');
    expect(telemetry).toContain('storesUserId = false');
    expect(telemetry).toContain('storesRawAnswers = false');
  });

  it('does not embed the child identity in game or repository runtime code',()=>{
    const combined=[
      read('roblox/src/server/PilotQuestionMixer.luau'),
      read('roblox/src/server/CoreGameLoopService.luau'),
      read('roblox/src/client/CoreGameLoop.client.luau'),
      read('roblox/src/shared/CoreLoopConfig.luau')
    ].join('\n');
    expect(combined).not.toMatch(/Emma/i);
  });
});
