import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function json(path){
  return JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
}
function text(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('legacy Brookhaven completed development track',()=>{
  it('closes every P0/P1/P2 development priority without claiming current-live certification',()=>{
    const completion=json('docs/roblox-world/LEGACY_BROOKHAVEN_DEVELOPMENT_COMPLETION.json');
    expect(completion.status).toBe('legacy-brookhaven-development-and-private-release-complete');
    expect(completion.summary).toEqual({
      closed:15,
      remaining:0,
      p0Remaining:0,
      p1Remaining:0,
      p2Remaining:0,
      remainingAutomated:0
    });
    expect(new Set(completion.closedPriorities.map(row=>row.area)).size).toBe(15);
    expect(completion.boundaries).toEqual({
      requestedLegacyDevelopmentScopeComplete:true,
      current2026CertificationIsSeparate:true,
      currentLiveCertificationSatisfied:false,
      exactCurrentParityClaimAllowed:false,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false,
      legacyPrivateReleaseVerified:true,
      finalRealDeviceVisualQaPassed:false
    });
  });

  it('has full legacy geometry, source-bound interactions, plots and source-snapshot catalogs',()=>{
    const completion=json('docs/roblox-world/LEGACY_BROOKHAVEN_DEVELOPMENT_COMPLETION.json');
    expect(completion.world.geometryCoverage).toBe(1);
    expect(completion.world.geometryCount).toBe(14459);
    expect(completion.world.plots).toBeGreaterThan(0);
    expect(completion.world.houseGeometry).toBeGreaterThan(0);
    expect(completion.world.vehicleGeometry).toBeGreaterThan(0);
    expect(completion.world.lotGeometry).toBeGreaterThan(0);
    expect(completion.world.roadGeometry).toBeGreaterThan(0);

    expect(completion.interactions.doors).toBeGreaterThan(0);
    expect(completion.interactions.garages).toBeGreaterThan(0);
    expect(completion.interactions.lights).toBeGreaterThan(0);
    expect(completion.interactions.pendingReview).toEqual({doors:0,garages:0,lights:0});

    expect(completion.catalogs.sourceTargets).toEqual({
      vehicles:19,
      inventoryUnique:50,
      houses:12
    });
    expect(Object.values(completion.catalogs.completion).every(Boolean)).toBe(true);
  });

  it('wires legacy mode to the generated source-bound modules while preserving default mode',()=>{
    const core=text('roblox/src/server/CoreGameLoopService.luau');
    const home=text('roblox/src/server/HomeEconomyService.luau');
    const interactions=text('roblox/src/server/WorldInteractionService.luau');
    const lifestyle=text('roblox/src/server/MirrorLifestyleService.luau');
    const config=text('roblox/src/shared/BrookhavenMirrorConfig.luau');

    expect(config).toContain('Mode = "exact-frozen-brookhaven-world"');
    for(const source of [core,home,interactions,lifestyle]){
      expect(source).toContain('legacy-reference-safe-world');
    }
    expect(core).toContain('LegacyWorldActivityBindings');
    expect(home).toContain('LegacyWorldPlotBindings');
    expect(home).toContain('LegacyStoreCatalog');
    expect(interactions).toContain('LegacyWorldInteractionBindings');
    expect(lifestyle).toContain('LegacyMirrorCatalog');
  });
});
