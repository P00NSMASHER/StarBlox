import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven interaction review receipt',()=>{
  it('binds certified interactions to the exact frozen-source evidence',()=>{
    const receipt=JSON.parse(read('docs/roblox-world/INTERACTION_REVIEW_STATUS.json'));
    expect(receipt.source.frozenSourceSha256).toBe('e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694');
    expect(receipt.source.irHash).toBe('sha256:558cb27979f308a171fc33165bddc5ee078326bd4aed4483a1a46f4f7ba8caba');
    expect(receipt.certified).toMatchObject({
      nativeSeats:271,
      nativeVehicleSeats:2,
      reviewedDoors:1,
      reviewedGarageDoors:0,
      reviewedLights:0,
    });
    expect(receipt.certified.reviewedDoorBindings).toEqual([
      expect.objectContaining({id:'door-proof-1454',sourceEntryIndex:1454,helperSourceEntryIndex:1461})
    ]);
  });

  it('keeps unresolved geometry inert until rendered evidence exists',()=>{
    const receipt=JSON.parse(read('docs/roblox-world/INTERACTION_REVIEW_STATUS.json'));
    expect(receipt.pendingRenderedReview).toEqual({strictDoors:13,garageDoors:101,lights:111});
    expect(receipt.safety).toEqual({
      automaticCandidateActivationAllowed:false,
      immutableWitnessMutationAllowed:false,
      runtimeProjectionOnly:true,
      renderedEvidenceRequiredForPromotion:true,
    });
  });
});
