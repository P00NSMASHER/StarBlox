import {existsSync,readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 10: verified private v21 placement baseline',()=>{
  it('pins the exact verified v21 artifact',()=>{
    const receipt=JSON.parse(read('docs/phase10/PHASE_10_V21_PRIVATE_BASELINE.json'));
    expect(receipt.status).toBe('verified-private-v21-home-placement-baseline');
    expect(receipt.privateRelease.placeVersion).toBe(21);
    expect(receipt.privateRelease.workflowRunId).toBe(36251753086);
    expect(receipt.privateRelease.artifactSha256)
      .toBe('d10dfd743695eedba1385c132cbc3d4444070b759f62c8ad022d204e3e3d6133');
    expect(receipt.privateRelease.exactServerBootVerified).toBe(true);
  });

  it('locks the server-authoritative placement contract and cleanup',()=>{
    const receipt=JSON.parse(read('docs/phase10/PHASE_10_V21_PRIVATE_BASELINE.json'));
    expect(receipt.placement.persistent).toBe(true);
    expect(receipt.placement.serverClamped).toBe(true);
    expect(receipt.placement.movementStepStuds).toBe(1);
    expect(receipt.placement.rotationStepDegrees).toBe(15);
    expect(receipt.placement.hideShow).toBe(true);
    expect(receipt.placement.reset).toBe(true);
    expect(receipt.placement.baselineMutationAllowed).toBe(false);
    expect(receipt.authority.publicAccessChangeAttempted).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
    expect(existsSync(new URL('../../.github/workflows/phase10-home-placement-private-publish.yml',import.meta.url))).toBe(false);
  });
});
