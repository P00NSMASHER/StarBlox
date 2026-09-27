import {
  parseCurrentBrookhavenBehaviorTrace
} from './currentBrookhavenBehaviorEvidence.js';

export const CURRENT_BROOKHAVEN_BEHAVIOR_PARITY_VERSION=
  'starblox-current-brookhaven-behavior-parity-v1';

function nonEmpty(value,label){
  if(typeof value!=='string' || !value.trim()) throw new Error(label+' is required');
  return value.trim();
}

function boolean(value,label){
  if(typeof value!=='boolean') throw new Error(label+' must be boolean');
  return value;
}

function canonical(value){
  if(Array.isArray(value)) return value.map(canonical);
  if(value && typeof value==='object'){
    return Object.fromEntries(
      Object.keys(value).sort().map(key=>[key,canonical(value[key])])
    );
  }
  return value ?? null;
}

function semanticEvent(event){
  return Object.freeze({
    actionId:String(event?.actionId||''),
    target:event?.target ?? null,
    outcome:String(event?.outcome||''),
    visibleState:canonical(event?.visibleState ?? null),
    authoritativeState:canonical(event?.authoritativeState ?? null)
  });
}

function same(a,b){
  return JSON.stringify(a)===JSON.stringify(b);
}

function assertEvidenceBinding(parsed,evidence,side){
  const locked=evidence?.[side]?.trace;
  if(!locked) throw new Error(side+' locked trace evidence is missing');
  if(parsed.sha256!==locked.sha256 || parsed.bytes!==locked.bytes){
    throw new Error(side+' trace bytes do not match locked evidence');
  }
  if(parsed.eventCount!==locked.eventCount){
    throw new Error(side+' trace event count does not match locked evidence');
  }
  if(parsed.scenarioId!==evidence.scenario?.scenarioId ||
     parsed.deviceProfile!==evidence.scenario?.deviceProfile){
    throw new Error(side+' trace scenario/device does not match locked evidence');
  }
}

export function buildCurrentBrookhavenBehaviorParityReceipt({
  evidenceReceipt,
  referenceTraceBytes,
  candidateTraceBytes,
  humanReview
}={}){
  if(evidenceReceipt?.status!=='behavior-parity-evidence-locked' ||
     evidenceReceipt?.proofState?.behaviorEvidenceLocked!==true){
    throw new Error('locked behavioral evidence receipt is required');
  }
  if(humanReview?.status!=='completed'){
    throw new Error('completed behavioral side-by-side review is required');
  }

  const reference=parseCurrentBrookhavenBehaviorTrace(referenceTraceBytes,'referenceTraceBytes');
  const candidate=parseCurrentBrookhavenBehaviorTrace(candidateTraceBytes,'candidateTraceBytes');
  assertEvidenceBinding(reference,evidenceReceipt,'reference');
  assertEvidenceBinding(candidate,evidenceReceipt,'candidate');

  const referenceEvents=reference.trace.events.map(semanticEvent);
  const candidateEvents=candidate.trace.events.map(semanticEvent);
  const total=Math.max(referenceEvents.length,candidateEvents.length);
  const mismatches=[];

  for(let index=0;index<total;index++){
    const expected=referenceEvents[index] ?? null;
    const observed=candidateEvents[index] ?? null;
    if(!same(expected,observed)){
      mismatches.push(Object.freeze({
        sequence:index+1,
        expected,
        observed
      }));
    }
  }

  const traceParity=
    referenceEvents.length===candidateEvents.length &&
    mismatches.length===0;

  const reviewScenario=nonEmpty(humanReview.scenarioId,'humanReview.scenarioId');
  if(reviewScenario!==evidenceReceipt.scenario.scenarioId){
    throw new Error('human behavior review scenario does not match locked evidence');
  }

  const reviewChecks=Object.freeze({
    openCloseFlow:boolean(humanReview.openCloseFlow,'humanReview.openCloseFlow'),
    actionOrder:boolean(humanReview.actionOrder,'humanReview.actionOrder'),
    resultingState:boolean(humanReview.resultingState,'humanReview.resultingState'),
    mobileControlsUnobstructed:boolean(
      humanReview.mobileControlsUnobstructed,
      'humanReview.mobileControlsUnobstructed'
    ),
    legacyChromeAbsent:boolean(
      humanReview.legacyChromeAbsent,
      'humanReview.legacyChromeAbsent'
    )
  });
  const humanPass=Object.values(reviewChecks).every(Boolean);
  const behaviorParityVerified=traceParity && humanPass;

  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_BEHAVIOR_PARITY_VERSION,
    status:behaviorParityVerified
      ? 'behavior-parity-verified'
      : 'behavior-parity-mismatch',
    sourceBinding:Object.freeze({...evidenceReceipt.sourceBinding}),
    scenario:Object.freeze({...evidenceReceipt.scenario}),
    automated:Object.freeze({
      completed:true,
      referenceEventCount:referenceEvents.length,
      candidateEventCount:candidateEvents.length,
      eventMismatchCount:mismatches.length,
      mismatches:Object.freeze(mismatches.slice(0,100)),
      passed:traceParity
    }),
    humanReview:Object.freeze({
      completed:true,
      reviewer:nonEmpty(humanReview.reviewer,'humanReview.reviewer'),
      checks:reviewChecks,
      passed:humanPass
    }),
    proofState:Object.freeze({
      behaviorEvidenceLocked:true,
      behaviorComparisonCompleted:true,
      behaviorParityVerified,
      exactParityClaimAllowed:false
    }),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:behaviorParityVerified
      ? 'add-scenario-to-combined-current-live-parity-gate'
      : 'repair-behavior-mismatches-and-repeat-trace-review'
  });
}
