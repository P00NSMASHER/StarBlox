import {createHash} from 'node:crypto';

export const LEARNING_AUTOMATION_VERSION='starblox-learning-automation-v1';

function stableHash(value){
  return 'sha256:'+createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function deriveLearningAutomationState({
  baseline,
  calibration,
  starCheckpoint=null,
  policy={}
}){
  const step4MinFirst=Number(policy.step4MinFirstAttempts)||100;
  const step4MinSessions=Number(policy.step4MinCompletedSessions)||6;
  const step7MinFirst=Number(policy.step7MinFirstAttempts)||200;
  const step7MinSessions=Number(policy.step7MinCompletedSessions)||12;

  const cumulativeFirst=
    Number(baseline?.readiness?.calibrationFirstAttempts)
    || Number(calibration?.readiness?.globalFirstAttempts)
    || 0;
  const cumulativeSessions=
    Number(baseline?.readiness?.calibrationCompletedSessions)
    || Number(calibration?.readiness?.completedSessions)
    || 0;

  const step4Ready=
    cumulativeFirst>=step4MinFirst &&
    cumulativeSessions>=step4MinSessions &&
    calibration?.status==='calibration-ready';

  const step7InternalReady=
    cumulativeFirst>=step7MinFirst &&
    cumulativeSessions>=step7MinSessions;
  const externalPresent=starCheckpoint?.externalResultPresent===true;
  const checkpointEvaluated=starCheckpoint?.status==='checkpoint-evaluated';

  const result={
    schemaVersion:1,
    automationVersion:LEARNING_AUTOMATION_VERSION,
    evidence:{
      baselineEstablished:baseline?.readiness?.baselineEstablished===true,
      cumulativeFirstAttempts:cumulativeFirst,
      cumulativeCompletedSessions:cumulativeSessions
    },
    steps:{
      step4:{
        name:'data-driven-item-calibration',
        status:step4Ready?'ready':'collecting-evidence',
        minFirstAttempts:step4MinFirst,
        minCompletedSessions:step4MinSessions,
        autoRuns:true,
        autoMutatesQuestionBank:false
      },
      step5:{
        name:'learning-priority-selection',
        status:step4Ready?'runtime-unlocked':'locked',
        unlockBasis:'per-profile pilot QuestionsCompleted>=100 and SessionsCompleted>=6',
        materialFirstPreserved:true
      },
      step6:{
        name:'spaced-mastery',
        status:step4Ready?'runtime-unlocked':'locked',
        unlockBasis:'per-profile pilot QuestionsCompleted>=100 and SessionsCompleted>=6',
        masteryRequiresDelayedRetrieval:true
      },
      step7:{
        name:'external-star-checkpoint',
        status:checkpointEvaluated
          ? 'checkpoint-evaluated'
          : step7InternalReady
            ? externalPresent
              ? 'external-result-ready'
              : 'awaiting-external-star-result'
            : 'awaiting-internal-evidence',
        minFirstAttempts:step7MinFirst,
        minCompletedSessions:step7MinSessions,
        internalEvidenceReady:step7InternalReady,
        externalResultPresent:externalPresent,
        autoChangesLearningPolicy:false
      }
    },
    governance:{
      questionBankAutoMutation:false,
      itemRetirementAutoApply:false,
      itemRewriteAutoApply:false,
      externalScoreInference:false,
      starCheckpointRequiresRealExternalEvidence:true
    },
    source:{
      placeVersion:baseline?.source?.placeVersion??null,
      bankSnapshotId:baseline?.source?.bankSnapshotId??null,
      calibrationEvidenceHash:calibration?.evidenceHash??null,
      starCheckpointEvidenceHash:starCheckpoint?.evidenceHash??null
    }
  };
  return {...result,evidenceHash:stableHash(result)};
}

export function automationSummary(state){
  return {
    automationVersion:state.automationVersion,
    evidence:state.evidence,
    steps:Object.fromEntries(Object.entries(state.steps).map(([key,value])=>[
      key,
      {
        name:value.name,
        status:value.status,
        internalEvidenceReady:value.internalEvidenceReady,
        externalResultPresent:value.externalResultPresent
      }
    ])),
    governance:state.governance,
    evidenceHash:state.evidenceHash
  };
}
