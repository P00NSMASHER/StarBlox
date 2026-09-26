import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Research improvements 1-6: Grade 2 learning quality',()=>{
  it('persists adaptive difficulty and skill evidence without resetting mastery on curriculum refresh',()=>{
    const profile=read('roblox/src/shared/ProfileTemplate.luau');
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    expect(profile).toContain('AdaptiveByStation = {}');
    expect(profile).toContain('SkillStats = {}');
    expect(server).toContain('recordLearningAttempt');
    expect(server).toContain('stats.ConsecutiveCorrect');
    expect(server).toContain('stats.ConsecutiveWrong');
    expect(server).toContain('targetDifficulty');
    expect(server).not.toContain('profileData.Learning.SkillStats = {}\n\t\tprofileData.Learning.QuestionBankSnapshotId');
  });

  it('uses bounded Grade 2 adaptive guardrails',()=>{
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    expect(config).toContain('AdaptiveQuestioning = table.freeze');
    expect(config).toContain('MinDifficulty = 2');
    expect(config).toContain('MaxDifficulty = 3');
    expect(config).toContain('PromoteAfterCorrect = 2');
    expect(config).toContain('ScaffoldAfterWrong = 2');
    expect(config).toContain('TargetSuccessFloor = 0.70');
    expect(config).toContain('TargetSuccessCeiling = 0.85');
  });

  it('gives misconception-specific feedback and enters a support question after repeated misses',()=>{
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    expect(server).toContain('answeredQuestion.WrongFeedback');
    expect(server).toContain('answeredQuestion.Misconceptions');
    expect(server).toContain('CoreQuestionBank.FindSupportQuestion');
    expect(server).toContain('session.supportMode = true');
    expect(server).toContain('scaffoldCleared = true');
    expect(client).toContain('Support step: solve this smaller question first.');
    expect(client).toContain('response.scaffoldCleared == true');
    expect(client).toContain('Hint: ');
  });

  it('does not reward a support question as if it completed the station',()=>{
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    const supportStart=server.indexOf('if session.supportMode == true then');
    const normalReward=server.indexOf('CoreGameLoopService.ApplyCorrectQuestionReward',supportStart);
    const supportReturn=server.indexOf('scaffoldCleared = true',supportStart);
    expect(supportStart).toBeGreaterThan(0);
    expect(supportReturn).toBeGreaterThan(supportStart);
    expect(normalReward<0||normalReward>supportReturn).toBe(true);
  });
});
