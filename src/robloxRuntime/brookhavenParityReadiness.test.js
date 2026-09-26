import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('Brookhaven parity readiness receipt',()=>{
  it('records implemented architecture and school composition without overstating parity',()=>{
    const r=JSON.parse(read('docs/BROOKHAVEN_PARITY_READINESS.json'));
    expect(r.architecture.immutableWitness).toEqual({
      name:'BrookhavenWorldBaseline',location:'ServerStorage',locked:true
    });
    expect(r.architecture.runtimeProjection).toEqual({
      name:'BrookhavenWorldRuntime',location:'Workspace',verifiedBoundary:true
    });
    expect(r.school.implementationIntegrated).toBe(true);
    expect(r.school.systemEnabled).toBe(false);
    expect(r.school.starFallbackReadingCount).toBe(60);
    expect(r.school.starFallbackMathCount).toBe(60);
  });

  it('keeps catalog and interaction gaps numerically explicit',()=>{
    const r=JSON.parse(read('docs/BROOKHAVEN_PARITY_READINESS.json'));
    expect(r.catalog.vehicles).toMatchObject({target:188,runtimePlayable:8,verifiedReferenceMetadata:22,complete:false});
    expect(r.catalog.inventory).toMatchObject({target:173,runtimeItems:12,complete:false});
    expect(r.catalog.houses).toMatchObject({target:83,parityCatalogComplete:false});
    expect(r.interactions).toMatchObject({
      reviewedDoors:1,pendingStrictDoors:13,
      reviewedGarageDoors:0,pendingGarageDoors:101,
      reviewedLights:0,pendingLights:111,
      automaticCandidateActivationAllowed:false
    });
  });

  it('fails closed on exact-parity and public-release claims until external proof gates close',()=>{
    const r=JSON.parse(read('docs/BROOKHAVEN_PARITY_READINESS.json'));
    expect(r.architecture.currentLiveBrookhavenMapParityProven).toBe(false);
    expect(r.qa.finalSideBySideMobileQaPassed).toBe(false);
    expect(r.qa.currentLiveMapParityProofPassed).toBe(false);
    expect(r.qa.productionIconAssetPassComplete).toBe(false);
    expect(r.release.publicAccessChangeAllowed).toBe(false);
    expect(r.release.productionActivationAllowed).toBe(false);
    expect(r.release.exactParityClaimAllowed).toBe(false);
    expect(r.blockers.length).toBeGreaterThanOrEqual(5);
  });
});
