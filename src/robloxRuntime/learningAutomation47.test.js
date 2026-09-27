import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {deriveLearningAutomationState} from './learningAutomationController.js';
import {evaluateStarCheckpoint} from './starCheckpoint.js';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function baseline({first=0,sessions=0,established=false}={}){
  return {
    source:{placeVersion:25,bankSnapshotId:'bank-1'},
    readiness:{
      baselineEstablished:established,
      calibrationFirstAttempts:first,
      calibrationCompletedSessions:sessions
    },
    bySubject:{
      'Reading / ELA':{firstAttemptAccuracy:0.62},
      Math:{firstAttemptAccuracy:0.74}
    },
    byDomain:{
      'Numbers and operations':{firstAttemptAccuracy:0.70},
      'Comprehension strategies and constructing meaning':{firstAttemptAccuracy:0.58}
    }
  };
}
function calibration({ready=false,first=0,sessions=0}={}){
  return {
    status:ready?'calibration-ready':'collecting-evidence',
    readiness:{globalFirstAttempts:first,completedSessions:sessions},
    evidenceHash:'sha256:test'
  };
}

describe('Automated learning Steps 4-7',()=>{
  it('keeps Step 4-6 locked below the evidence gate',()=>{
    const state=deriveLearningAutomationState({
      baseline:baseline({first:90,sessions:5,established:true}),
      calibration:calibration({ready:false,first:90,sessions:5})
    });
    expect(state.steps.step4.status).toBe('collecting-evidence');
    expect(state.steps.step5.status).toBe('locked');
    expect(state.steps.step6.status).toBe('locked');
    expect(state.governance.questionBankAutoMutation).toBe(false);
  });

  it('unlocks Steps 5-6 when Step 4 reaches 100 first attempts and 6 sessions',()=>{
    const state=deriveLearningAutomationState({
      baseline:baseline({first:108,sessions:6,established:true}),
      calibration:calibration({ready:true,first:108,sessions:6})
    });
    expect(state.steps.step4.status).toBe('ready');
    expect(state.steps.step5.status).toBe('runtime-unlocked');
    expect(state.steps.step6.status).toBe('runtime-unlocked');
    expect(state.steps.step5.materialFirstPreserved).toBe(true);
  });

  it('keeps Step 7 dormant until both internal evidence and a real external result exist',()=>{
    const noResult=deriveLearningAutomationState({
      baseline:baseline({first:216,sessions:12,established:true}),
      calibration:calibration({ready:true,first:216,sessions:12}),
      starCheckpoint:evaluateStarCheckpoint({baseline:baseline({first:216,sessions:12}),externalResult:null})
    });
    expect(noResult.steps.step7.status).toBe('awaiting-external-star-result');

    const checkpoint=evaluateStarCheckpoint({
      baseline:baseline({first:216,sessions:12}),
      externalResult:{
        assessmentName:'STAR',
        assessmentDate:'2026-09-26',
        metric:'relative-domain-score',
        scores:[
          {dimension:'Reading / ELA',value:55},
          {dimension:'Math',value:70}
        ]
      }
    });
    const ready=deriveLearningAutomationState({
      baseline:baseline({first:216,sessions:12,established:true}),
      calibration:calibration({ready:true,first:216,sessions:12}),
      starCheckpoint:checkpoint
    });
    expect(checkpoint.status).toBe('checkpoint-evaluated');
    expect(ready.steps.step7.status).toBe('checkpoint-evaluated');
    expect(ready.steps.step7.externalResultPresent).toBe(true);
  });

  it('compares only relative ordering and never persists raw STAR scores',()=>{
    const report=evaluateStarCheckpoint({
      baseline:baseline({first:216,sessions:12}),
      externalResult:{
        assessmentName:'STAR',
        assessmentDate:'2026-09-26',
        metric:'relative-domain-score',
        scores:[
          {dimension:'Reading / ELA',value:55},
          {dimension:'Math',value:70}
        ]
      }
    });
    expect(report.interpretation.relativeOrderingOnly).toBe(true);
    expect(report.interpretation.absoluteScorePrediction).toBe(false);
    expect(report.privacy.rawScoresPersisted).toBe(false);
    expect(JSON.stringify(report)).not.toContain('"value":55');
    expect(JSON.stringify(report)).not.toContain('"value":70');
  });

  it('preserves ABVM material-first selection and gates runtime priority to 100/6',()=>{
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    const priority=read('roblox/src/server/LearningPriority.luau');
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    expect(config).toContain('UnlockMinQuestionsCompleted = 100');
    expect(config).toContain('UnlockMinCompletedSessions = 6');
    expect(priority).toContain('if cursor < materialCount');
    expect(priority).toContain('recentQuestionSet');
    expect(server).toContain('LearningPriority.SelectForStation');
    expect(server).toContain('sessionAuthorized ~= true');
  });

  it('requires delayed retrieval for mastery and resets mastery on a miss',()=>{
    const spaced=read('roblox/src/server/SpacedMastery.luau');
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    expect(config).toContain('IntervalsSeconds = table.freeze({14400, 172800, 604800, 1209600})');
    expect(config).toContain('MasteredStage = 3');
    expect(spaced).toContain('state.Mastered = state.Stage >= ');
    expect(spaced).toContain('state.Stage = math.max(0, math.floor(tonumber(config.MissResetStage) or 0))');
    expect(spaced).toContain('state.DueAt = cleanNow + delayForStage(config, 0)');
  });

  it('routes due skills into spaced pilot slots once the evidence gate is open',()=>{
    const mixer=read('roblox/src/server/PilotQuestionMixer.luau');
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    expect(mixer).toContain('sourceBucket = "spaced-due"');
    expect(mixer).toContain('SpacedRetrieval = spacedRetrieval == true');
    expect(server).toContain('entry.SpacedRetrieval == true');
    expect(server).toContain('attemptIndex == 1');
  });

  it('automates governance on schedule while keeping external STAR data private',()=>{
    const workflow=read('.github/workflows/pilot-learning-evidence.yml');
    expect(workflow).toContain('STARBLOX_STAR_CHECKPOINT_JSON');
    expect(workflow).toContain('scripts/evaluate-star-checkpoint.mjs');
    expect(workflow).toContain('scripts/derive-learning-automation.mjs');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('rm -rf artifacts/pilot-private');
    expect(workflow).not.toContain('echo "$STARBLOX_STAR_CHECKPOINT_JSON"');
  });
});
