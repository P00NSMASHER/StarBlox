import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('Brookhaven final private-playtest handoff',()=>{
  it('runs the composed parity, interaction, catalog, and school contracts before private publish',()=>{
    const workflow=read('.github/workflows/step9-fast-release.yml');
    for(const path of [
      'brookhavenVehicleCategoryRail.test.js',
      'brookhavenCatalogReference.test.js',
      'brookhavenSmallVehicleReference.test.js',
      'brookhavenWorldInteractionProof.test.js',
      'brookhavenInteractionReviewReceipt.test.js',
      'brookhavenSchoolIntegrationSeam.test.js',
      'schoolFoundation.test.js',
      'schoolSystem.test.js',
      'brookhavenParityReadiness.test.js',
    ]){
      expect(workflow).toContain(path);
    }
  });

  it('keeps the handoff private and fail-closed while exact-parity proof gates remain open',()=>{
    const workflow=read('.github/workflows/step9-fast-release.yml');
    const readiness=JSON.parse(read('docs/BROOKHAVEN_PARITY_READINESS.json'));
    const school=read('roblox/src/shared/SchoolConfig.luau');

    expect(workflow).toContain('default: verify-only');
    expect(workflow).toContain('publish-private');
    expect(workflow).toContain('"publicAccessChangeAllowed": false');
    expect(workflow).toContain('"productionActivationAllowed": false');
    expect(readiness.release.exactParityClaimAllowed).toBe(false);
    expect(readiness.release.publicAccessChangeAllowed).toBe(false);
    expect(readiness.release.productionActivationAllowed).toBe(false);
    expect(school).toContain('SchoolSystemEnabled = true');
  });

  it('preserves the immutable witness during the final handoff',()=>{
    const readiness=JSON.parse(read('docs/BROOKHAVEN_PARITY_READINESS.json'));
    const interactions=read('roblox/src/shared/WorldInteractionBindings.luau');

    expect(readiness.architecture.immutableWitness.locked).toBe(true);
    expect(readiness.interactions.automaticCandidateActivationAllowed).toBe(false);
    expect(interactions).toContain('AutomaticCandidateActivationAllowed = false');
    expect(interactions).toContain('ImmutableWitnessName = "BrookhavenWorldBaseline"');
  });
});
