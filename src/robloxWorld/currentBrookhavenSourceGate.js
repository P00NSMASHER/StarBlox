import {createHash} from 'node:crypto';
import {extname} from 'node:path';

export const CURRENT_BROOKHAVEN_SOURCE_GATE_VERSION='starblox-current-brookhaven-source-gate-v1';

const ALLOWED_FORMATS=new Set(['.rbxl','.rbxlx','.rbxm','.rbxmx']);

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

function integer(value,label,{min=1}={}){
  const n=Number(value);
  if(!Number.isInteger(n) || n<min) throw new Error(label+' must be an integer >= '+min);
  return n;
}

export function buildCurrentBrookhavenSourceReceipt({
  candidateBytes,
  fileName,
  placeId,
  placeVersion,
  capturedAt,
  captureMethod='authorized-studio-export',
  referenceSourceSha256
}={}){
  if(!Buffer.isBuffer(candidateBytes) || candidateBytes.length===0){
    throw new Error('candidateBytes must be a non-empty Buffer');
  }
  if(typeof fileName!=='string' || !fileName.trim()){
    throw new Error('fileName is required');
  }
  const format=extname(fileName).toLowerCase();
  if(!ALLOWED_FORMATS.has(format)){
    throw new Error('candidate must be rbxl, rbxlx, rbxm, or rbxmx');
  }
  const normalizedCapturedAt=new Date(capturedAt);
  if(!capturedAt || Number.isNaN(normalizedCapturedAt.getTime())){
    throw new Error('capturedAt must be a valid timestamp');
  }
  if(typeof captureMethod!=='string' || !captureMethod.trim()){
    throw new Error('captureMethod is required');
  }
  if(!/^[a-f0-9]{64}$/.test(String(referenceSourceSha256||''))){
    throw new Error('referenceSourceSha256 must be a SHA-256 hex digest');
  }

  const candidateSha256=sha256(candidateBytes);
  return Object.freeze({
    schemaVersion:1,
    version:CURRENT_BROOKHAVEN_SOURCE_GATE_VERSION,
    status:'current-live-source-candidate-captured',
    candidate:Object.freeze({
      fileName,
      format:format.slice(1),
      bytes:candidateBytes.length,
      sha256:candidateSha256
    }),
    provenance:Object.freeze({
      placeId:integer(placeId,'placeId'),
      placeVersion:integer(placeVersion,'placeVersion'),
      capturedAt:normalizedCapturedAt.toISOString(),
      captureMethod
    }),
    frozenReference:Object.freeze({
      sourceSha256:referenceSourceSha256,
      sameBytesAsCandidate:candidateSha256===referenceSourceSha256
    }),
    proofState:Object.freeze({
      candidateIdentityLocked:true,
      currentLiveSourceCaptureRecorded:true,
      structuralParityVerified:false,
      renderedParityVerified:false,
      behaviorParityVerified:false,
      exactParityClaimAllowed:false
    }),
    authority:Object.freeze({
      mayReplaceFrozenReference:false,
      mayPublishCandidate:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false
    }),
    nextStep:'compare-current-candidate-against-frozen-reference-and-rendered-recording'
  });
}
