import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven exact parity: current-world source gate',()=>{
  it('keeps the pinned serialized world immutable while current-live qualification lives in separate gates',()=>{
    const source=JSON.parse(read('research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json'));

    expect(source.status).toBe('complete-source-frozen');
    expect(source.source.sha256)
      .toBe('e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694');
    expect(source.repositoryFreeze.reconstructedSha256).toBe(source.source.sha256);
    expect(source.repositoryFreeze.exactReconstructionVerified).toBe(true);
    expect(source.boundaries).toMatchObject({
      sourceExecuted:false,
      sourceInsertedIntoLiveRuntime:false,
      publicationStarted:false,
      liveActivationAllowed:false
    });

    // Current-live qualification is deliberately not written into the immutable
    // source provenance object; doing so would change its fingerprint.
    expect(source.source.referenceSnapshotOnly).toBeUndefined();
    expect(source.source.currentLiveBrookhavenMapParityProven).toBeUndefined();
    expect(source.source.exactParityProductionEligible).toBeUndefined();
  });

  it('keeps the runtime and readiness contract fail-closed for exact current-live parity',()=>{
    const config=read('roblox/src/shared/BrookhavenMirrorConfig.luau');
    const readiness=JSON.parse(read('docs/BROOKHAVEN_PARITY_READINESS.json'));

    expect(config).toContain('ReferenceSnapshotOnly = true');
    expect(config).toContain('CurrentLiveMapParityProven = false');
    expect(config).toContain('ExactParityProductionEligible = false');

    expect(readiness.worldSource.referenceSnapshotOnly).toBe(true);
    expect(readiness.worldSource.currentLiveMapParityProven).toBe(false);
    expect(readiness.release.exactParityClaimAllowed).toBe(false);
  });
});
