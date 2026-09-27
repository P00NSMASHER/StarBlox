import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {
  LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION,
  buildLegacyPublishedServerProbeScript,
  verifyLegacyCandidateForPrivatePublish
} from './legacyBrookhavenPrivateRelease.js';

function sha(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}
function candidate(bytes){
  return {
    status:'legacy-brookhaven-development-candidate-ready',
    sourceCommit:'a'.repeat(40),
    artifact:{sha256:sha(bytes),bytes:bytes.length},
    world:{
      sanitizedBaselineSha256:'b'.repeat(64),
      witnessSubtreeSha256:'c'.repeat(64),
      subtreeInstanceCount:16951,
      geometryCount:14459,
      forbiddenGameplayClassCount:0,
      runtimeProjectionCreatedAtBoot:true,
      runtimeProjectionPresentInStaticArtifact:false
    },
    release:{
      releaseId:'starblox-legacy-brookhaven-development-v1',
      releaseChannel:'private-staging',
      productionActivationAllowed:false
    },
    bindings:{
      doors:39,
      garages:5,
      lights:8,
      plots:7
    },
    catalogs:{
      runtime:{
        vehicles:19,
        inventoryRuntimeEntries:51,
        houses:12
      },
      completion:{
        vehicleCatalogComplete:true,
        inventoryCatalogComplete:true,
        houseCatalogComplete:true
      }
    },
    authority:{
      privatePlaytestCandidate:true,
      publicAccessChangeAllowed:false,
      productionActivationAllowed:false,
      exactCurrentParityClaimAllowed:false
    }
  };
}

describe('legacy Brookhaven private release binding',()=>{
  it('binds the exact private candidate while preserving all public/production stops',()=>{
    const bytes=Buffer.from('<roblox>BrookhavenWorldBaseline StarBlox DeploymentManifest</roblox>');
    const result=verifyLegacyCandidateForPrivatePublish({
      candidate:candidate(bytes),
      artifactBytes:bytes,
      sourceCommit:'a'.repeat(40)
    });
    expect(result.version).toBe(LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION);
    expect(result.artifactSha256).toBe(sha(bytes));
    expect(result.geometryCount).toBe(14459);
    expect(result.subtreeInstanceCount).toBe(16951);
    expect(result).toMatchObject({
      seatCount:399,
      vehicleSeatCount:12,
      doors:39,
      garages:5,
      lights:8,
      plots:7,
      catalogVehicles:19,
      catalogInventory:51,
      catalogHouses:12
    });
  });

  it('fails closed on artifact, source, catalog, or authority drift',()=>{
    const bytes=Buffer.from('<roblox>BrookhavenWorldBaseline StarBlox DeploymentManifest</roblox>');
    const base=candidate(bytes);
    expect(()=>verifyLegacyCandidateForPrivatePublish({
      candidate:base,artifactBytes:Buffer.from(bytes.toString()+'x'),sourceCommit:'a'.repeat(40)
    })).toThrow(/artifact identity mismatch/);
    expect(()=>verifyLegacyCandidateForPrivatePublish({
      candidate:base,artifactBytes:bytes,sourceCommit:'d'.repeat(40)
    })).toThrow(/source commit mismatch/);
    expect(()=>verifyLegacyCandidateForPrivatePublish({
      candidate:{...base,catalogs:{completion:{...base.catalogs.completion,houseCatalogComplete:false}}},
      artifactBytes:bytes,sourceCommit:'a'.repeat(40)
    })).toThrow(/catalog completion/);
    expect(()=>verifyLegacyCandidateForPrivatePublish({
      candidate:{...base,authority:{...base.authority,publicAccessChangeAllowed:true}},
      artifactBytes:bytes,sourceCommit:'a'.repeat(40)
    })).toThrow(/authority boundary/);
  });
  it('verifies a published Luau session by explicitly starting the production bootstrap',()=>{
    const script=buildLegacyPublishedServerProbeScript({
      releaseId:'starblox-legacy-brookhaven-development-v1',
      versionNumber:27,
      geometryCount:14459,
      seatCount:399,
      vehicleSeatCount:12,
      doors:39,
      garages:5,
      lights:8,
      plots:7,
      catalogVehicles:19,
      catalogInventory:51,
      catalogHouses:12
    });
    expect(script).toContain('Bootstrap.start({');
    expect(script).toContain('mirrorConfig.World.Mode == "legacy-reference-safe-world"');
    expect(script).toContain('assert(geometry == 14459');
    expect(script).toContain('assert(seats == 399');
    expect(script).toContain('assert(vehicleSeats == 12');
    expect(script).toContain('assert(#legacyInteractions.Doors == 39');
    expect(script).toContain('assert(#legacyPlots.Plots == 7');
    expect(script).toContain('assert(#legacyMirror.Vehicles == 19');
    expect(script).toContain('assert(#legacyMirror.Inventory == 51');
    expect(script).toContain('assert(#legacyStore.Styles == 12');
    expect(script).toContain('STARBLOX_LEGACY_PRIVATE_BOOT_OK');
    expect(script).not.toContain('Workspace:WaitForChild("BrookhavenWorldRuntime")');
  });

});
