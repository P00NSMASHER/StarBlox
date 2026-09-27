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

  it('sanitizes the full legacy geometry without carrying gameplay code',()=>{
    const receipt=readJson('docs/roblox-world/LEGACY_BROOKHAVEN_GEOMETRY_SANITIZATION.json');

    expect(receipt.status).toBe('legacy-brookhaven-geometry-sanitized');
    expect(receipt.output).toMatchObject({
      rootName:'LegacyBrookhavenGeometryBaseline',
      geometryCount:14459,
      forbiddenGameplayClassCount:0,
      allGeometryAnchored:true,
      sha256:'16030b4727f00abb1755f09d97654d0f1b73885fabf89008d9315a2b845b1b1c'
    });
    expect(receipt.output.safeVisualChildCount).toBeGreaterThan(2000);
    expect(receipt.policy).toMatchObject({
      scriptsRemoved:true,
      remotesRemoved:true,
      clickDetectorsRemoved:true,
      proximityPromptsRemoved:true,
      sourceCodeExecuted:false,
      sourceCodeEvaluated:false
    });
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
    expect(plan.summary).toEqual({priorities:13,p0:0,p1:9,p2:4});
    expect(plan.completedP0).toMatchObject({
      worldGeometry:{
        closed:true,
        sanitizedGeometryCount:14459,
        forbiddenGameplayClassCount:0,
        sourceReceipt:'docs/roblox-world/LEGACY_BROOKHAVEN_GEOMETRY_SANITIZATION.json'
      },
      spawnTownCenter:{
        closed:true,
        pattern:'legacy-town-center-3x3-v1',
        slots:9,
        sourceReceipt:'docs/roblox-world/LEGACY_BROOKHAVEN_SPAWN_DECISION.json'
      }
    });
    expect(plan.measuredBaseline).toMatchObject({
      legacy:{instances:24349,geometry:14459,assets:622},
      starblox:{instances:5493,geometry:4936,assets:154},
      sanitizedDevelopmentGeometry:{
        geometry:14459,
        safeVisualChildren:2491,
        sha256:'16030b4727f00abb1755f09d97654d0f1b73885fabf89008d9315a2b845b1b1c'
      }
    });
    expect(plan.releaseBoundary).toEqual({
      developmentMayUseLegacyReference:true,
      currentLiveCertificationSatisfied:false,
      exactParityClaimAllowed:false,
      productionActivationAllowed:false
    });
  });
});
