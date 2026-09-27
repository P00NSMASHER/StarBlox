import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function readJson(path){
  return JSON.parse(readFileSync(new URL('../../'+path,import.meta.url),'utf8'));
}

describe('legacy Brookhaven development-reference pipeline',()=>{
  it('pins the exact upstream legacy place bytes',()=>{
    const source=readJson('research-inputs/brookhaven/legacy-reference/SOURCE.json');
    const acquisition=readJson('docs/roblox-world/LEGACY_BROOKHAVEN_ACQUISITION.json');

    expect(source.classification).toBe('legacy_reference_source');
    expect(source.source).toMatchObject({
      repository:'IIIStatusIII/Roblox-Uncopylocked-Games',
      path:'Brookhaven.rbxl',
      sourceCommit:'d92b5bf18bec7866356b154b56ffb525e137bd34',
      gitBlobSha1:'c0f49a326ab670ffe6bd8218e5aff680eb5df863',
      bytes:1276795,
      sha256:'ddc2248663770e968dfe2b27b97b577c0c12fd93177305b884bed9c929923217'
    });
    expect(acquisition.source.sha256).toBe(source.source.sha256);
    expect(acquisition.source.bytes).toBe(source.source.bytes);
  });

  it('deserializes the legacy Workspace and profiles the StarBlox world baseline',()=>{
    const profile=readJson('docs/roblox-world/LEGACY_BROOKHAVEN_PROFILE.json');

    expect(profile.status).toBe('legacy-reference-profiled');
    expect(profile.selection).toEqual({
      legacySubtree:'Workspace',
      starbloxSubtree:'BrookhavenWorldBaseline'
    });
    expect(profile.legacy).toMatchObject({
      instanceCount:24349,
      geometryCount:14459,
      scriptRemoteCount:156,
      seatCount:399,
      vehicleSeatCount:12,
      uniqueAssetIdCount:622
    });
    expect(profile.starblox).toMatchObject({
      instanceCount:5493,
      geometryCount:4936,
      uniqueAssetIdCount:154
    });
  });

  it('produces a measured structural diff and a fail-closed 7B development plan',()=>{
    const diff=readJson('docs/roblox-world/LEGACY_VS_STARBLOX_WORLD_DIFF.json');
    const plan=readJson('docs/roblox-world/LEGACY_BROOKHAVEN_7B_WORKPLAN.json');

    expect(diff.status).toBe('legacy-vs-starblox-compared');
    expect(diff.comparison.topologyIdentical).toBe(false);
    expect(diff.comparison.geometryCountDelta).toBe(4936-14459);

    expect(plan.status).toBe('legacy-reference-7b-development-plan-generated');
    expect(plan.summary).toEqual({priorities:15,p0:2,p1:9,p2:4});
    expect(plan.measuredBaseline).toEqual({
      legacy:{instances:24349,geometry:14459,assets:622},
      starblox:{instances:5493,geometry:4936,assets:154}
    });
    expect(plan.releaseBoundary).toEqual({
      developmentMayUseLegacyReference:true,
      currentLiveCertificationSatisfied:false,
      exactParityClaimAllowed:false,
      productionActivationAllowed:false
    });
  });
});
