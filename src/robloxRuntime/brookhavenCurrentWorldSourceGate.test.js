import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven exact parity: current-world source gate',()=>{
  it('treats the pinned serialized world as a reference snapshot, not current-live proof',()=>{
    const source=JSON.parse(read('research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json'));
    expect(source.source.referenceSnapshotOnly).toBe(true);
    expect(source.source.currentLiveBrookhavenMapParityProven).toBe(false);
    expect(source.source.exactParityProductionEligible).toBe(false);
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
