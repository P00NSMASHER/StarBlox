import {createHash} from 'node:crypto';

export const CURRENT_BROOKHAVEN_BEHAVIOR_EVIDENCE_VERSION=
  'starblox-current-brookhaven-behavior-evidence-v1';

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

function nonEmpty(value,label){
  if(typeof value!=='string' || !value.trim()) throw new Error(label+' is required');
  return value.trim();
}

function positiveInteger(value,label){
  const n=Number(value);
  if(!Number.isInteger(n) || n<1) throw new Error(label+' must be a positive integer');
  return n;
}

function timestamp(value,label){
  const d=new Date(value);
  if(!value || Number.isNaN(d.getTime())) throw new Error(label+' must be a valid timestamp');
  return d.toISOString();
}

function parseTrace(bytes,label){
  if(!Buffer.isBuffer(bytes) || bytes.length===0){
    throw new Error(label+' must be a non-empty Buffer');
  }
  let trace;
  try{
    trace=JSON.parse(bytes.toString('utf8'));
  }catch{
    throw new Error(label+' must contain valid JSON');
  }
  if(trace?.schemaVersion!==1) throw new Error(label+' schemaVersion must be 1');
  const scenarioId=nonEmpty(trace.scenarioId,label+'.scenarioId');
  const deviceProfile=nonEmpty(trace.deviceProfile,label+'.deviceProfile');
  const capturedAt=timestamp(trace.capturedAt,label+'.capturedAt');
  if(!Array.isArray(trace.events) || trace.events.length===0){
    throw new Error(label+'.events must be a non-empty array');
  }
  for(let index=0;index<trace.events.length;index++){
    const event=trace.events[index];
    if(Number(event?.sequence)!==index+1){
      throw new Error(label+'.events sequence must be contiguous from 1');
    }
    nonEmpty(event?.actionId,label+'.events['+index+'].actionId');
    nonEmpty(event?.outcome,label+'.events['+index+'].outcome');
  }
  const source=trace.sourceBinding;
  if(!source || typeof source!=='object'){
    throw new Error(label+'.sourceBinding is required');
  }
  return Object.freeze({
    trace:Object.freeze(trace),
    bytes:bytes.length,
    sha256:sha256(bytes),
    scenarioId,
    deviceProfile,
    capturedAt,
    eventCount:trace.events.length,
    sourceBinding:Object.freeze({
      candidateSha256:nonEmpty(source.candidateSha256,label+'.sourceBinding.candidateSha256'),
      sourcePlaceId:positiveInteger(source.sourcePlaceId,label+'.sourceBinding.sourcePlaceId'),
      sourcePlaceVersion:positiveInteger(
        source.sourcePlaceVersion,
        label+'.sourceBinding.sourcePlaceVersion'
      )
    }),
    runtime:Object.freeze({
      placeId:positiveInteger(trace.runtime?.placeId,label+'.runtime.placeId'),
      placeVersion:positiveInteger(trace.runtime?.placeVersion,label+'.runtime.placeVersion')
    })
  });
}

function assertSourceBinding(trace,rendered,label){
  if(trace.sourceBinding.candidateSha256!==rendered.candidateSha256 ||
     trace.sourceBinding.sourcePlaceId!==rendered.candidatePlaceId ||
     trace.sourceBinding.sourcePlaceVersion!==rendered.candidatePlaceVersion){
    throw new Error(label+' is not bound to the structurally/rendered-verified source candidate');
  }
}

export function buildCurrentBrookhavenBehaviorEvidenceReceipt({
  renderedParityReceipt,
  referenceTraceBytes,
  candidateTraceBytes,
  referenceSource='live-brookhaven-mobile-trace',
  candidateSource='starblox-mobile-trace'
}={}){
  if(renderedParityReceipt?.status!=='rendered-parity-verified' ||
     renderedParityReceipt?.proofState?.renderedParityVerified!==true){
    throw new Error('verified rendered parity receipt is required before behavioral evidence intake');
  }
  if(renderedParityReceipt?.authority?.mayPublishCandidate!==false){
    throw new Error('rendered parity authority boundary is unexpectedly permissive');
  }

  const reference=parseTrace(referenceTraceBytes,'referenceTraceBytes');
  const candidate=parseTrace(candidateTraceBytes,'candidateTraceBytes');

  if(reference.scenarioId!==candidate.scenarioId){
    throw new Error('behavior traces must describe the same scenario');
  }
  if(reference.deviceProfile!==candidate.deviceProfile){
    throw new Error('behavior traces must use the same device profile');
  }

  const renderedBinding={
    candidateSha256:nonEmpty(
      renderedParityReceipt.sourceBinding?.candidateSha256,
      'renderedParityReceipt.sourceBinding.candidateSha256'
    ),
    candidatePlaceId:positiveInteger(
      renderedParityReceipt.sourceBinding?.candidatePlaceId,
      'renderedParityReceipt.sourceBinding.candidatePlaceId'
    ),
    candidatePlaceVersion:positiveInteger(
      renderedParityReceipt.sourceBinding?.candidatePlaceVersion,
      'renderedParityReceipt.sourceBinding.candidatePlaceVersion'
    )
  };
  assertSourceBinding(reference,renderedBinding,'reference trace');
  assertSourceBinding(candidate,renderedBinding,'candidate trace');

  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_BEHAVIOR_EVIDENCE_VERSION,
    status:'behavior-parity-evidence-locked',
    sourceBinding:Object.freeze(renderedBinding),
    scenario:Object.freeze({
      scenarioId:reference.scenarioId,
      deviceProfile:reference.deviceProfile
    }),
    reference:Object.freeze({
      source:nonEmpty(referenceSource,'referenceSource'),
      capturedAt:reference.capturedAt,
      trace:Object.freeze({
        bytes:reference.bytes,
        sha256:reference.sha256,
        eventCount:reference.eventCount,
        runtime:reference.runtime
      })
    }),
    candidate:Object.freeze({
      source:nonEmpty(candidateSource,'candidateSource'),
      capturedAt:candidate.capturedAt,
      trace:Object.freeze({
        bytes:candidate.bytes,
        sha256:candidate.sha256,
        eventCount:candidate.eventCount,
        runtime:candidate.runtime
      })
    }),
    proofState:Object.freeze({
      behaviorEvidenceLocked:true,
      traceIdentityVerified:true,
      scenarioIdentityLocked:true,
      behaviorComparisonCompleted:false,
      behaviorParityVerified:false,
      exactParityClaimAllowed:false
    }),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:'compare-locked-behavior-traces'
  });
}

export function parseCurrentBrookhavenBehaviorTrace(bytes,label='behaviorTrace'){
  return parseTrace(bytes,label);
}
