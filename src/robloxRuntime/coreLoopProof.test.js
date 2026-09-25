import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import {
  buildCoreLoopProbeScript
} from './coreLoopProof.js';

describe('Step 7: Roblox-native StarBlox core loop', () => {
  it('ships three source-grounded activities without replicating answer keys', () => {
    const shared=readFileSync(
      new URL('../../roblox/src/shared/CoreLoopConfig.luau',import.meta.url),
      'utf8'
    );
    const server=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );

    for(const id of [
      'word-portal-put-v1',
      'spelling-forge-fog-v1',
      'culture-lab-culture-v1'
    ]){
      expect(shared).toContain(id);
      expect(server).toContain(id);
    }
    expect(shared.match(/ABVM Grade 2 current source pack/g)?.length).toBe(3);
    expect(shared).not.toMatch(/Answer\s*=/);
    expect(server).toContain('local ANSWERS = table.freeze');
    expect(server).toContain('function CoreGameLoopService.GradeAnswer');
  });

  it('promotes the core loop into production bootstrap and retires the old vertical-slice startup', () => {
    const bootstrap=readFileSync(
      new URL('../../roblox/src/server/Bootstrap.luau',import.meta.url),
      'utf8'
    );
    expect(bootstrap).toContain('CoreGameLoopService.new(profiles, replicas');
    expect(bootstrap).toContain('coreLoop:PlayerReady');
    expect(bootstrap).toContain('coreLoop:PlayerRemoving');
    expect(bootstrap).toContain('CoreLoop = coreLoop');
    expect(bootstrap).not.toContain('VerticalSliceService.new');
  });

  it('persists repeatable progression, a daily reward cap, and first-loop inventory unlock', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );
    const template=readFileSync(
      new URL('../../roblox/src/shared/ProfileTemplate.luau',import.meta.url),
      'utf8'
    );
    const replica=readFileSync(
      new URL('../../roblox/src/server/ReplicaStateService.luau',import.meta.url),
      'utf8'
    );

    expect(server).toContain('DailyRewardRunCap');
    expect(server).toContain('CompletedByRun');
    expect(server).toContain('RewardedRunsToday');
    expect(server).toContain('FirstLoopCosmeticId');
    expect(server).toContain('profileData.Inventory.Cosmetics[Config.FirstLoopCosmeticId] = true');
    expect(server).toContain('profileData.Progress.Districts[Config.DistrictName] = state.LoopRuns');
    expect(template).toContain('CoreLoop = {');
    expect(replica).toContain('CoreLoop = profileData.Progress.CoreLoop');
  });

  it('retires prototype geometry while preserving core-loop remotes and mobile activity UI', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );
    const client=readFileSync(
      new URL('../../roblox/src/client/CoreGameLoop.client.luau',import.meta.url),
      'utf8'
    );

    for(const retiredToken of [
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
      'Instance.new("BillboardGui")',
      'Vector3.new(0, 3, -24)',
      'Vector3.new(26, 3, 4)',
      'Vector3.new(-26, 3, 4)'
    ]){
      expect(server).not.toContain(retiredToken);
    }
    expect(server).toContain('removePrototypeWorld');
    expect(server).toContain('RequestStatus');
    expect(client).toContain('ScreenGui');
    expect(client).toContain('ActivityPanel');
    expect(client).toContain('TextButton');
    expect(client).toContain('Activated:Connect');
    expect(client).toContain('submitAnswer:InvokeServer');
  });

  it('headless proof exercises repeatability, inventory unlock, duplicate guard, and reward cap', () => {
    const script=buildCoreLoopProbeScript();
    expect(script).toContain('STARBLOX_CORE_LOOP_OK');
    expect(script).toContain('profile.Progress.CoreLoop.LoopRuns == 3');
    expect(script).toContain('brightside-spark-trail');
    expect(script).toContain('fourth.rewardEligible == false');
    expect(script).toContain('duplicate.duplicate == true');
    expect(script).toContain('productionActivationAllowed == false');
  });
});
