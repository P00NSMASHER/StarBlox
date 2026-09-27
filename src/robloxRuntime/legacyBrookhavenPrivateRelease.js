import {createHash} from 'node:crypto';

export const LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION=
  'starblox-legacy-brookhaven-private-release-v1';

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}
function fail(message){
  throw new Error('Legacy Brookhaven private release: '+message);
}
function requireSha(value,label){
  const text=String(value||'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text)) fail(label+' must be a SHA-256 digest');
  return text;
}
function requireCommit(value){
  const text=String(value||'').toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(text)) fail('source commit must be an exact 40-character Git SHA');
  return text;
}

export function verifyLegacyCandidateForPrivatePublish({
  candidate,
  artifactBytes,
  sourceCommit
}={}){
  if(candidate?.status!=='legacy-brookhaven-development-candidate-ready'){
    fail('verified legacy development candidate receipt is required');
  }
  const commit=requireCommit(sourceCommit);
  if(String(candidate.sourceCommit||'').toLowerCase()!==commit){
    fail('candidate source commit mismatch');
  }
  if(candidate?.authority?.privatePlaytestCandidate!==true ||
     candidate?.authority?.publicAccessChangeAllowed!==false ||
     candidate?.authority?.productionActivationAllowed!==false ||
     candidate?.authority?.exactCurrentParityClaimAllowed!==false){
    fail('candidate authority boundary is invalid');
  }
  if(candidate?.release?.releaseChannel!=='private-staging' ||
     candidate?.release?.productionActivationAllowed!==false){
    fail('candidate release channel is not private fail-closed staging');
  }
  if(!(artifactBytes instanceof Uint8Array) || artifactBytes.byteLength===0){
    fail('candidate artifact bytes are required');
  }
  const bytes=Buffer.from(artifactBytes);
  const artifactSha=sha256(bytes);
  if(requireSha(candidate?.artifact?.sha256,'candidate artifact SHA')!==artifactSha ||
     Number(candidate?.artifact?.bytes)!==bytes.length){
    fail('candidate artifact identity mismatch');
  }
  const xml=bytes.toString('utf8');
  for(const required of ['<roblox','BrookhavenWorldBaseline','StarBlox','DeploymentManifest']){
    if(!xml.includes(required)) fail('candidate artifact missing '+required);
  }
  if(Number(candidate?.world?.geometryCount)!==14459 ||
     Number(candidate?.world?.forbiddenGameplayClassCount)!==0 ||
     candidate?.world?.runtimeProjectionPresentInStaticArtifact!==false ||
     candidate?.world?.runtimeProjectionCreatedAtBoot!==true){
    fail('candidate world proof is incomplete');
  }
  const baselineModelSha256=requireSha(
    candidate?.world?.sanitizedBaselineSha256,
    'sanitized baseline SHA'
  );
  const mountedSubtreeSha256=requireSha(
    candidate?.world?.witnessSubtreeSha256,
    'witness subtree SHA'
  );
  const subtreeInstanceCount=Number(candidate?.world?.subtreeInstanceCount);
  if(!Number.isInteger(subtreeInstanceCount) || subtreeInstanceCount<=14459){
    fail('candidate witness subtree instance count is invalid');
  }
  if(candidate?.catalogs?.completion?.vehicleCatalogComplete!==true ||
     candidate?.catalogs?.completion?.inventoryCatalogComplete!==true ||
     candidate?.catalogs?.completion?.houseCatalogComplete!==true){
    fail('legacy source catalog completion proof is missing');
  }
  return Object.freeze({
    version:LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION,
    sourceCommit:commit,
    releaseId:String(candidate.release.releaseId),
    artifactSha256:artifactSha,
    artifactBytes:bytes.length,
    baselineModelSha256,
    mountedSubtreeSha256,
    subtreeInstanceCount,
    geometryCount:14459
  });
}
