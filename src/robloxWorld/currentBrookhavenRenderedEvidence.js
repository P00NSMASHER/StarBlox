import {createHash} from 'node:crypto';

export const CURRENT_BROOKHAVEN_RENDERED_EVIDENCE_VERSION=
  'starblox-current-brookhaven-rendered-evidence-v1';

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

function positiveInteger(value,label){
  const n=Number(value);
  if(!Number.isInteger(n) || n<1) throw new Error(label+' must be a positive integer');
  return n;
}

function nonEmpty(value,label){
  if(typeof value!=='string' || !value.trim()) throw new Error(label+' is required');
  return value.trim();
}

function lockedImage(bytes,label){
  if(!Buffer.isBuffer(bytes) || bytes.length===0){
    throw new Error(label+' must be a non-empty Buffer');
  }
  return Object.freeze({
    bytes:bytes.length,
    sha256:sha256(bytes)
  });
}

export function buildCurrentBrookhavenRenderedEvidenceReceipt({
  structuralComparison,
  referenceImageBytes,
  candidateImageBytes,
  viewportWidth,
  viewportHeight,
  deviceProfile,
  referenceCapturedAt,
  candidateCapturedAt,
  sceneId,
  referenceSource='user-supplied-brookhaven-recording',
  candidateSource='starblox-current-source-playtest'
}={}){
  if(structuralComparison?.status!=='current-live-structure-compared'){
    throw new Error('completed current-live structural comparison is required');
  }
  if(structuralComparison?.proofState?.structuralComparisonCompleted!==true){
    throw new Error('structural comparison must be complete');
  }
  if(structuralComparison?.proofState?.structuralParityVerified!==true){
    throw new Error('structural parity must be verified before rendered parity evidence can enter the proof gate');
  }

  const width=positiveInteger(viewportWidth,'viewportWidth');
  const height=positiveInteger(viewportHeight,'viewportHeight');
  const referenceTime=new Date(referenceCapturedAt);
  const candidateTime=new Date(candidateCapturedAt);
  if(!referenceCapturedAt || Number.isNaN(referenceTime.getTime())){
    throw new Error('referenceCapturedAt must be a valid timestamp');
  }
  if(!candidateCapturedAt || Number.isNaN(candidateTime.getTime())){
    throw new Error('candidateCapturedAt must be a valid timestamp');
  }

  const reference=lockedImage(referenceImageBytes,'referenceImageBytes');
  const candidate=lockedImage(candidateImageBytes,'candidateImageBytes');

  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_RENDERED_EVIDENCE_VERSION,
    status:'rendered-parity-evidence-locked',
    sourceBinding:Object.freeze({
      candidateSha256:structuralComparison.candidateSource.sha256,
      candidatePlaceId:structuralComparison.candidateSource.placeId,
      candidatePlaceVersion:structuralComparison.candidateSource.placeVersion,
      structuralParityVerified:true
    }),
    scene:Object.freeze({
      sceneId:nonEmpty(sceneId,'sceneId'),
      viewport:Object.freeze({width,height}),
      deviceProfile:nonEmpty(deviceProfile,'deviceProfile')
    }),
    reference:Object.freeze({
      source:nonEmpty(referenceSource,'referenceSource'),
      capturedAt:referenceTime.toISOString(),
      image:Object.freeze(reference)
    }),
    candidate:Object.freeze({
      source:nonEmpty(candidateSource,'candidateSource'),
      capturedAt:candidateTime.toISOString(),
      image:Object.freeze(candidate)
    }),
    proofState:Object.freeze({
      renderedEvidenceLocked:true,
      imageIdentityVerified:true,
      viewportIdentityLocked:true,
      renderedComparisonCompleted:false,
      renderedParityVerified:false,
      behaviorParityVerified:false,
      exactParityClaimAllowed:false
    }),
    reviewBoundary:Object.freeze({
      automatedPixelComparisonCompleted:false,
      perceptualComparisonCompleted:false,
      sideBySideHumanReviewCompleted:false,
      materialMismatchCount:null
    }),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:'run-rendered-comparison-on-locked-evidence'
  });
}
