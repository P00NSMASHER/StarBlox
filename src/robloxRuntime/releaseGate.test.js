import { describe,expect,it } from 'vitest';
import { buildStep6ReleaseGate,verifyStep6ReleaseGate } from './releaseGate.js';

const commit='a'.repeat(40);
const snapshotBytes=Buffer.from('{"step":5}\n');
const artifact=Buffer.from('<roblox><Item class="Model"><string name="Name">BrookhavenWorldBaseline</string></Item><string>StarBlox</string></roblox>');
function exactness(){
  return {
    status:'exactness-verified-and-baseline-locked',
    baseline:{modelSha256:'b'.repeat(64)},
    readOnlyPolicy:{
      baselineMutationAllowed:false,
      runtimeMayParentGameplayIntoBaseline:false,
      mountMode:'serverstorage-immutable-witness-with-runtime-projection'
    }
  };
}
function inspection(){
  return {
    baseline:{
      mountedSubtreeSha256:'c'.repeat(64),
      subtreeInstanceCount:5493,
      scriptsOrRemotesInsideBaseline:0,
      witnessLocation:'ServerStorage/BrookhavenWorldBaseline'
    },
    runtime:{
      mountCount:3,
      mounts:[
        'ReplicatedStorage/StarBlox',
        'ServerScriptService/StarBlox',
        'StarterPlayer/StarterPlayerScripts/StarBlox'
      ],
      parentedIntoBaseline:false,
      projectionName:'BrookhavenWorldRuntime',
      projectionPresentInStaticArtifact:false
    }
  };
}
function mount(){
  return {
    status:'starblox-mounted-beside-locked-world',
    baseline:{
      modelSha256:'b'.repeat(64),
      fileBytesUnchanged:true,
      isolatedSubtreeSha256:'c'.repeat(64),
      mountedSubtreeSha256:'c'.repeat(64),
      subtreeInstanceCount:5493,
      scriptsOrRemotesAdded:0,
      witnessLocation:'ServerStorage/BrookhavenWorldBaseline'
    },
    runtime:{
      parentedIntoBaseline:false,
      projectionName:'BrookhavenWorldRuntime',
      projectionLocation:'Workspace/BrookhavenWorldRuntime',
      projectionCreatedAtBoot:true,
      projectionPresentInStaticArtifact:false
    },
    boundaries:{worldBaselineMutated:false}
  };
}
function snapshot(){
  const e=exactness();
  const m=mount();
  return {
    schemaVersion:'starblox-brookhaven-step5-snapshot-v1',
    status:'verified-exact-world-with-starblox-mounted-beside-it',
    exactnessLock:e,
    mountReceipt:m
  };
}

describe('Target Architecture Step 6 release gate',()=>{
  it('binds the verified Step 5 world, exact artifact, and source commit',()=>{
    const s=snapshot();
    const gate=buildStep6ReleaseGate({
      step5Snapshot:s,
      step5SnapshotBytes:snapshotBytes,
      liveExactnessLock:s.exactnessLock,
      liveMountReceipt:s.mountReceipt,
      artifactBytes:artifact,
      artifactInspection:inspection(),
      sourceCommit:commit
    });
    expect(gate.status).toBe('private-release-gate-open');
    expect(gate.step5.subtreeInstanceCount).toBe(5493);
    expect(gate.step5.witnessLocation).toBe('ServerStorage/BrookhavenWorldBaseline');
    expect(gate.step5.runtimeProjectionName).toBe('BrookhavenWorldRuntime');
    expect(gate.gates.immutableWitnessVerified).toBe(true);
    expect(gate.gates.runtimeProjectionBootOnlyVerified).toBe(true);
    expect(gate.authority.privatePublicationAllowed).toBe(true);
    expect(gate.authority.publicAccessChangeAllowed).toBe(false);
    expect(verifyStep6ReleaseGate({
      gate,
      step5SnapshotBytes:snapshotBytes,
      artifactBytes:artifact,
      artifactInspection:inspection(),
      sourceCommit:commit
    }).ok).toBe(true);
  });

  it('fails closed on stale world proof, artifact drift, or source-commit drift',()=>{
    const s=snapshot();
    const gate=buildStep6ReleaseGate({
      step5Snapshot:s,
      step5SnapshotBytes:snapshotBytes,
      liveExactnessLock:s.exactnessLock,
      liveMountReceipt:s.mountReceipt,
      artifactBytes:artifact,
      artifactInspection:inspection(),
      sourceCommit:commit
    });
    expect(()=>verifyStep6ReleaseGate({
      gate,
      step5SnapshotBytes:snapshotBytes,
      artifactBytes:Buffer.concat([artifact,Buffer.from('tamper')]),
      sourceCommit:commit
    })).toThrow(/artifact changed/);
    expect(()=>verifyStep6ReleaseGate({
      gate,
      step5SnapshotBytes:snapshotBytes,
      artifactBytes:artifact,
      sourceCommit:'d'.repeat(40)
    })).toThrow(/source commit mismatch/);

    const badInspection=inspection();
    badInspection.baseline.mountedSubtreeSha256='e'.repeat(64);
    expect(()=>buildStep6ReleaseGate({
      step5Snapshot:s,
      step5SnapshotBytes:snapshotBytes,
      liveExactnessLock:s.exactnessLock,
      liveMountReceipt:s.mountReceipt,
      artifactBytes:artifact,
      artifactInspection:badInspection,
      sourceCommit:commit
    })).toThrow(/release artifact Brookhaven subtree/);

    const stale=mount();
    stale.baseline.mountedSubtreeSha256='e'.repeat(64);
    expect(()=>buildStep6ReleaseGate({
      step5Snapshot:s,
      step5SnapshotBytes:snapshotBytes,
      liveExactnessLock:s.exactnessLock,
      liveMountReceipt:stale,
      artifactBytes:artifact,
      artifactInspection:inspection(),
      sourceCommit:commit
    })).toThrow(/live mount receipt does not match/);
  });
});
