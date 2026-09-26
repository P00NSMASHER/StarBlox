import { existsSync,readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 5: final StarBlox regression and release lock',()=>{
  it('pins the exact verified private v14 real-device evidence',()=>{
    const evidence=JSON.parse(read('docs/roblox-world/PHASE_4_V14_REAL_DEVICE_VERIFICATION.json'));

    expect(evidence.status).toBe('verified-private-v14-real-device-full-loop');
    expect(evidence.canonicalMainCommit).toBe('353e725427586fe8f16a46adcaa4a40a57aa38bb');
    expect(evidence.privateRelease.placeVersion).toBe(14);
    expect(evidence.privateRelease.sourceCommit).toBe('6c23bd0c0ba12d0947e47ac6c9b1d34bb9cfc469');
    expect(evidence.privateRelease.releaseArtifactSha256)
      .toBe('ad3aba385c646394f885506547121f551770c03d4bd131cfc1e14cdd9e74bbfb');
    expect(evidence.privateRelease.exactPublishedServerBootVerified).toBe(true);

    expect(evidence.realTouchSession.durationSeconds).toBe(217);
    expect(evidence.realTouchSession.viewport).toEqual({x:750,y:402});
    expect(evidence.realTouchSession.touchClient).toBe(true);
    expect(evidence.realTouchSession.allThreePanelsOpened).toBe(true);
    expect(evidence.realTouchSession.threeCorrectCompletions).toBe(true);
    expect(evidence.realTouchSession.fullLoopCompleted).toBe(true);
    expect(evidence.realTouchSession.activityIdentityVerified).toBe(true);
    expect(evidence.realTouchSession.privacyReceiptVerified).toBe(true);

    expect(evidence.authority.publicAccessChangeAllowed).toBe(false);
    expect(evidence.authority.experienceVisibilityChangeAllowed).toBe(false);
    expect(evidence.authority.liveActivationAllowed).toBe(false);
    expect(evidence.authority.productionActivationAllowed).toBe(false);
  });

  it('keeps the prototype world permanently retired',()=>{
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    for(const token of [
      'BrightsidePlaza',
      'StarBloxSpawn',
      'GuideBillboard',
      'StationSign',
      'WordPortalStation',
      'SpellingForgeStation',
      'CultureLabStation',
      'NorthPath',
      'EastPath',
      'WestPath',
      'Instance.new("SpawnLocation")',
      'Instance.new("BillboardGui")'
    ]){
      expect(server).not.toContain(token);
    }
    expect(server).toContain('removePrototypeWorld');
  });

  it('locks the three activities into the verified neighborhood cluster',()=>{
    const bindings=read('roblox/src/shared/WorldActivityBindings.luau');
    for(const token of ['BHW_3461','BHW_4879','BHW_4876','BHW_3405']){
      expect(bindings).toContain(token);
    }
    expect(bindings).not.toContain('BHW_3191');
    expect(bindings).not.toContain('BHW_4654');

    const evidence=JSON.parse(read('docs/roblox-world/PHASE_4_V14_REAL_DEVICE_VERIFICATION.json'));
    expect(evidence.activityBindings.maximumDistanceFromSpawnStuds).toBe(150);
    expect(evidence.activityBindings.baselineMutationAllowed).toBe(false);
  });

  it('locks the real-device mobile layout and subtle waypoint',()=>{
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    expect(client).toContain('hud.AnchorPoint = Vector2.new(1, 0)');
    expect(client).toContain('hud.Size = UDim2.fromOffset(205, 46)');
    expect(client).toContain('hud.Position = UDim2.new(1, -72, 0, 8)');
    expect(client).toContain('nextHint.Size = UDim2.fromOffset(150, 30)');
    expect(client).toContain('panel.Size = UDim2.new(0.84, 0, 0, 322)');
    expect(client).toContain('onboarding.Size = UDim2.new(0.78, 0, 0, 216)');
    expect(client).toContain('waypoint.Size = UDim2.fromOffset(96, 24)');
    expect(client).toContain('waypoint.MaxDistance = 220');
    expect(client).toContain('waypoint.AlwaysOnTop = false');

    expect(client).not.toContain('hud.Size = UDim2.new(1, -24, 0, 132)');
    expect(client).not.toContain('panel.Size = UDim2.new(0.92, 0, 0, 442)');
    expect(client).not.toContain('onboarding.Size = UDim2.new(0.9, 0, 0, 350)');
  });

  it('keeps the deployment private and production activation disabled',()=>{
    const manifest=read('roblox/src/shared/DeploymentManifest.luau');
    expect(manifest).toContain('releaseChannel = "private-staging"');
    expect(manifest).toContain('productionActivationAllowed = false');
    expect(manifest).toContain('worldBaselineSha256 = "4dfd451ae211dead959ec3f165e2b477a9725d04727febdc66472e95328917df"');
    expect(manifest).toContain('worldMountedSubtreeSha256 = "d2c88a68305a65475dfdab77220b69e4138d81e44250edd1849f69cee4c92a90"');
  });

  it('exposes one explicit manual private-release workflow and disables legacy publishers',()=>{
    const workflow=read('.github/workflows/step9-fast-release.yml');
    const ci=read('.github/workflows/ci.yml');

    expect(workflow).toContain('name: StarBlox Final Private Release');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).not.toContain('pull_request:');
    expect(workflow).toContain('default: verify-only');
    expect(workflow).toContain('- publish-private');
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).toContain('phase5FinalRelease.test.js');
    expect(workflow).toContain('prepare-step9-release-candidate.mjs');
    expect(workflow).toContain('npm run roblox:publish-private');
    expect(workflow).toContain('verify-roblox-production-server-boot.mjs');
    expect(workflow).toContain('"publicAccessChangeAllowed": false');
    expect(workflow).toContain('"productionActivationAllowed": false');

    expect(ci).toContain('name: Legacy Step 8 private publish disabled');
    expect(ci).toContain('name: Legacy Step 8 live polish proof disabled');
    expect(ci).toContain('name: Legacy Step 8 publish receipt upload disabled');
    expect((ci.match(/if: \$\{\{ false \}\}/g) || []).length).toBeGreaterThanOrEqual(3);

    expect(existsSync(new URL('../../.github/workflows/step9-v11-client-gate.yml',import.meta.url))).toBe(false);
    expect(existsSync(new URL('../../.github/workflows/step9-v11-verify.yml',import.meta.url))).toBe(false);
  });

  it('makes the canonical touch-client verifier target v14',()=>{
    const gate=read('src/robloxRuntime/finalClientGate.js');
    expect(gate).toContain('STEP9_FINAL_PLACE_VERSION=14');
  });
});
