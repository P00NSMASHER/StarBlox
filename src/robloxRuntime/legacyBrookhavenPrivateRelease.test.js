import {createHash} from 'node:crypto';
import {describe,expect,it} from 'vitest';
import {
  LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION,
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
    catalogs:{
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
});
