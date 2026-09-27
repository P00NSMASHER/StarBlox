import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const STARBLOX_STEP6_RELEASE_GATE_VERSION='starblox-step6-release-gate-v1';

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}
function fail(message){
  throw new Error('Step 6 release gate: '+message);
}
function requireSha(value,label){
  const text=String(value || '').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text)) fail(label+' must be a SHA-256 digest');
  return text;
}
function requireCommit(value){
  const text=String(value || '').toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(text)) fail('source commit must be an exact 40-character Git SHA');
  return text;
}
function bytesBuffer(value,label){
  if(Buffer.isBuffer(value)) return value;
  if(value instanceof Uint8Array) return Buffer.from(value);
  fail(label+' bytes are required');
}
function requireStep5(step5Snapshot,liveExactnessLock,liveMountReceipt){
  if(step5Snapshot?.schemaVersion !== 'starblox-brookhaven-step5-snapshot-v1' ||
     step5Snapshot?.status !== 'verified-exact-world-with-starblox-mounted-beside-it'){
    fail('verified Step 5 snapshot is required');
  }
  if(!isDeepStrictEqual(step5Snapshot.exactnessLock,liveExactnessLock)){
    fail('live exactness lock does not match the checked-in Step 5 snapshot');
  }
  if(!isDeepStrictEqual(step5Snapshot.mountReceipt,liveMountReceipt)){
    fail('live mount receipt does not match the checked-in Step 5 snapshot');
  }
  if(liveExactnessLock?.status !== 'exactness-verified-and-baseline-locked'){
    fail('live Step 5 exactness lock is not verified');
  }
  if(liveMountReceipt?.status !== 'starblox-mounted-beside-locked-world'){
    fail('live Step 5 mount receipt is not verified');
  }
  if(liveExactnessLock?.readOnlyPolicy?.baselineMutationAllowed !== false ||
     liveExactnessLock?.readOnlyPolicy?.runtimeMayParentGameplayIntoBaseline !== false ||
     liveExactnessLock?.readOnlyPolicy?.mountMode !== 'serverstorage-immutable-witness-with-runtime-projection'){
    fail('Step 5 read-only witness/projection policy is not enforced');
  }
  if(liveMountReceipt?.baseline?.fileBytesUnchanged !== true ||
     liveMountReceipt?.baseline?.witnessLocation !== 'ServerStorage/BrookhavenWorldBaseline' ||
     liveMountReceipt?.runtime?.parentedIntoBaseline !== false ||
     liveMountReceipt?.runtime?.projectionName !== 'BrookhavenWorldRuntime' ||
     liveMountReceipt?.runtime?.projectionLocation !== 'Workspace/BrookhavenWorldRuntime' ||
     liveMountReceipt?.runtime?.projectionCreatedAtBoot !== true ||
     liveMountReceipt?.runtime?.projectionPresentInStaticArtifact !== false ||
     liveMountReceipt?.boundaries?.worldBaselineMutated !== false){
    fail('Step 5 mount receipt does not prove immutable witness/runtime projection separation');
  }

  const modelSha=requireSha(liveExactnessLock?.baseline?.modelSha256,'world baseline model SHA');
  if(modelSha !== requireSha(liveMountReceipt?.baseline?.modelSha256,'mounted world model SHA')){
    fail('exactness and mount receipts disagree on world model identity');
  }
  const isolated=requireSha(liveMountReceipt?.baseline?.isolatedSubtreeSha256,'isolated subtree SHA');
  const mounted=requireSha(liveMountReceipt?.baseline?.mountedSubtreeSha256,'mounted subtree SHA');
  if(isolated !== mounted) fail('mounted world subtree differs from the isolated world');
  if(Number(liveMountReceipt?.baseline?.subtreeInstanceCount) !== 5493){
    fail('mounted world subtree instance count must remain 5493');
  }
  if(Number(liveMountReceipt?.baseline?.scriptsOrRemotesAdded) !== 0){
    fail('mounted world baseline contains gameplay scripts/remotes');
  }
  return {modelSha,mountedSubtreeSha256:mounted};
}
function assertArtifactShape(bytes){
  const text=bytes.toString('utf8');
  if(!text.includes('<roblox')) fail('release artifact is not a Roblox XML place');
  if(!text.includes('BrookhavenWorldBaseline')) fail('release artifact is missing the locked world root');
  if(!text.includes('StarBlox')) fail('release artifact is missing StarBlox runtime');
}

export function buildStep6ReleaseGate({
  step5Snapshot,
  step5SnapshotBytes,
  liveExactnessLock,
  liveMountReceipt,
  artifactBytes,
  artifactInspection,
  sourceCommit
}={}){
  const commit=requireCommit(sourceCommit);
  const snapshotBytes=bytesBuffer(step5SnapshotBytes,'Step 5 snapshot');
  const artifact=bytesBuffer(artifactBytes,'release artifact');
  const world=requireStep5(step5Snapshot,liveExactnessLock,liveMountReceipt);
  assertArtifactShape(artifact);

  const snapshotSha=sha256(snapshotBytes);
  const artifactSha=sha256(artifact);
  if(snapshotBytes.length <= 0 || artifact.length <= 0) fail('release inputs may not be empty');

  if(!artifactInspection || typeof artifactInspection !== 'object'){
    fail('native release-artifact inspection is required');
  }
  if(requireSha(
      artifactInspection?.baseline?.mountedSubtreeSha256,
      'artifact mounted subtree SHA'
    ) !== world.mountedSubtreeSha256){
    fail('release artifact Brookhaven subtree does not match verified Step 5 mount');
  }
  if(Number(artifactInspection?.baseline?.subtreeInstanceCount) !== 5493){
    fail('release artifact Brookhaven subtree instance count must remain 5493');
  }
  if(Number(artifactInspection?.baseline?.scriptsOrRemotesInsideBaseline) !== 0){
    fail('release artifact Brookhaven witness contains gameplay scripts/remotes');
  }
  if(artifactInspection?.baseline?.witnessLocation !== 'ServerStorage/BrookhavenWorldBaseline'){
    fail('release artifact Brookhaven witness is not stored in ServerStorage');
  }
  if(artifactInspection?.runtime?.projectionName !== 'BrookhavenWorldRuntime' ||
     artifactInspection?.runtime?.projectionPresentInStaticArtifact !== false){
    fail('release artifact must defer mutable Brookhaven projection to server boot');
  }
  if(Number(artifactInspection?.runtime?.mountCount) !== 3 ||
     artifactInspection?.runtime?.parentedIntoBaseline !== false){
    fail('release artifact StarBlox runtime mounts are invalid');
  }
  const requiredMounts=[
    'ReplicatedStorage/StarBlox',
    'ServerScriptService/StarBlox',
    'StarterPlayer/StarterPlayerScripts/StarBlox'
  ];
  if(!isDeepStrictEqual([...(artifactInspection?.runtime?.mounts || [])],requiredMounts)){
    fail('release artifact StarBlox runtime mount set is invalid');
  }

  return Object.freeze({
    schemaVersion:1,
    version:STARBLOX_STEP6_RELEASE_GATE_VERSION,
    status:'private-release-gate-open',
    sourceCommit:commit,
    step5:Object.freeze({
      snapshotSha256:snapshotSha,
      baselineModelSha256:world.modelSha,
      mountedSubtreeSha256:world.mountedSubtreeSha256,
      subtreeInstanceCount:5493,
      exactnessVerified:true,
      mountVerified:true,
      witnessLocation:'ServerStorage/BrookhavenWorldBaseline',
      runtimeProjectionName:'BrookhavenWorldRuntime'
    }),
    artifact:Object.freeze({
      format:'rbxlx',
      sha256:artifactSha,
      bytes:artifact.length,
      containsLockedWorld:true,
      containsStarBloxRuntime:true
    }),
    gates:Object.freeze({
      checkedInStep5MatchesLiveProof:true,
      worldReadOnlyBoundaryVerified:true,
      runtimeMountedBesideWorld:true,
      sourceCommitBound:true,
      releaseArtifactBound:true,
      nativeArtifactWorldVerified:true,
      nativeArtifactRuntimeVerified:true,
      immutableWitnessVerified:true,
      runtimeProjectionBootOnlyVerified:true
    }),
    authority:Object.freeze({
      studioPlaytestAllowed:true,
      privatePublicationAllowed:true,
      publicAccessChangeAllowed:false,
      experienceVisibilityChangeAllowed:false,
      productionActivationAllowed:false
    })
  });
}

export function verifyStep6ReleaseGate({
  gate,
  step5SnapshotBytes,
  artifactBytes,
  sourceCommit
}={}){
  if(gate?.schemaVersion !== 1 ||
     gate?.version !== STARBLOX_STEP6_RELEASE_GATE_VERSION ||
     gate?.status !== 'private-release-gate-open'){
    fail('valid private release gate receipt is required');
  }
  const commit=requireCommit(sourceCommit);
  if(gate.sourceCommit !== commit) fail('release gate source commit mismatch');

  const snapshot=bytesBuffer(step5SnapshotBytes,'Step 5 snapshot');
  const artifact=bytesBuffer(artifactBytes,'release artifact');
  assertArtifactShape(artifact);

  if(requireSha(gate?.step5?.snapshotSha256,'gate Step 5 snapshot SHA') !== sha256(snapshot)){
    fail('checked-in Step 5 snapshot changed after gate creation');
  }
  if(requireSha(gate?.artifact?.sha256,'gate artifact SHA') !== sha256(artifact) ||
     Number(gate?.artifact?.bytes) !== artifact.length){
    fail('release artifact changed after gate creation');
  }
  if(gate?.gates?.checkedInStep5MatchesLiveProof !== true ||
     gate?.gates?.worldReadOnlyBoundaryVerified !== true ||
     gate?.gates?.runtimeMountedBesideWorld !== true ||
     gate?.gates?.sourceCommitBound !== true ||
     gate?.gates?.releaseArtifactBound !== true ||
     gate?.gates?.nativeArtifactWorldVerified !== true ||
     gate?.gates?.nativeArtifactRuntimeVerified !== true ||
     gate?.gates?.immutableWitnessVerified !== true ||
     gate?.gates?.runtimeProjectionBootOnlyVerified !== true){
    fail('release gate is missing required verified conditions');
  }
  if(gate?.authority?.privatePublicationAllowed !== true ||
     gate?.authority?.studioPlaytestAllowed !== true ||
     gate?.authority?.publicAccessChangeAllowed !== false ||
     gate?.authority?.experienceVisibilityChangeAllowed !== false ||
     gate?.authority?.productionActivationAllowed !== false){
    fail('release gate authority is invalid');
  }
  return Object.freeze({
    ok:true,
    artifactSha256:gate.artifact.sha256,
    artifactBytes:gate.artifact.bytes,
    baselineModelSha256:gate.step5.baselineModelSha256,
    mountedSubtreeSha256:gate.step5.mountedSubtreeSha256,
    sourceCommit:gate.sourceCommit
  });
}
