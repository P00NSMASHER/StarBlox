import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven Step 7 real-source execution gate',()=>{
  it('records the current live source as unavailable rather than substituting a fixture',()=>{
    const status=JSON.parse(read('docs/CURRENT_BROOKHAVEN_STEP7_STATUS.json'));
    expect(status.liveBrookhaven).toMatchObject({
      universeId:1686885941,
      rootPlaceId:4924922222,
      copyingAllowed:false,
      publicSourceDownloadEligible:false
    });
    expect(status.sourceDiscovery.sourceCandidateAvailable).toBe(false);
    expect(status.sourceDiscovery.fixtureExcluded).toContain('CI mechanics only');
    expect(status.step7A.completed).toBe(false);
    expect(status.step7A.failClosed).toBe(true);
  });

  it('keeps Step 7B catalog and interaction breadth explicit and fail closed',()=>{
    const status=JSON.parse(read('docs/CURRENT_BROOKHAVEN_STEP7_STATUS.json'));
    expect(status.step7B.completed).toBe(false);
    expect(status.step7B.remainingCatalogGap).toEqual({
      vehiclesTarget:188,
      runtimePlayable:8,
      inventoryTarget:173,
      runtimeItems:12,
      housesTarget:83,
      parityHousesVerified:0
    });
    expect(status.step7B.remainingInteractionGap).toEqual({
      strictDoorsPending:13,
      garageDoorsPending:101,
      lightsPending:111
    });
    expect(status.authority.exactParityClaimAllowed).toBe(false);
    expect(status.authority.candidatePublicationAllowed).toBe(false);
    expect(status.authority.productionActivationAllowed).toBe(false);
  });

  it('pins the supplied real Brookhaven reference recording without committing user media',()=>{
    const status=JSON.parse(read('docs/CURRENT_BROOKHAVEN_STEP7_STATUS.json'));
    expect(status.referenceRecording.available).toBe(true);
    expect(status.referenceRecording.sha256)
      .toBe('c9a4481b8e33443eface2b6937020dcae9fcbcc8ffa8f4305d2542b916e11100');
    expect(status.referenceRecording.width).toBe(512);
    expect(status.referenceRecording.height).toBe(1112);
    expect(status.referenceRecording.userMediaCommittedToRepository).toBe(false);
  });
});
