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
    }
    const bank=readFileSync(
      new URL('../../roblox/src/server/CoreQuestionBank.luau',import.meta.url),
      'utf8'
    );
    const source=JSON.parse(readFileSync(
      new URL('../../docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json',import.meta.url),
      'utf8'
    ));
    expect(shared.match(/Grade 2: current ABVM material first, then STAR-aligned practice/g)?.length).toBe(3);
    expect(shared).not.toMatch(/Answer\s*=/);
    expect(shared).not.toContain('Choices = table.freeze');
    expect(bank).toContain('dynamic-abvm-star-sync-v1');
    expect(bank.match(/\t\t\tAnswer = /g)?.length).toBe(source.questions.length);
    expect(server).not.toContain('local ANSWERS = table.freeze');
    expect(server).toContain('CoreQuestionBank.Select');
    expect(server).toContain('function CoreGameLoopService.GradeAnswer');
    expect(server).toContain('function CoreGameLoopService.ApplyCorrectQuestionReward');
    expect(server).toContain('profileData.Economy.Coins += Config.QuestionReward.Coins');
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

  it('binds core-loop prompts and spawn to verified Brookhaven locations without mutating the baseline', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );
    const bindings=readFileSync(
      new URL('../../roblox/src/shared/WorldActivityBindings.luau',import.meta.url),
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

    for(const token of [
      'BrookhavenWorldBaseline',
      'StarBloxActivityAnchors',
      'BHW_3461',
      'BHW_4879',
      'BHW_4876',
      'BHW_3405'
    ]){
      expect(bindings).toContain(token);
    }

    expect(server).toContain('buildWorldBindings');
    expect(server).toContain('runtimeFolder.Parent = Workspace');
    expect(server).toContain('anchor.Parent = runtimeFolder');
    expect(server).not.toContain('anchor.Parent = worldRoot');
    expect(server).toContain('SourceWorldPart');
    expect(server).toContain('Instance.new("ProximityPrompt")');
    expect(server).toContain('_placeCharacterAtWorldSpawn');
    expect(server).toContain('player.CharacterAdded:Connect');
    expect(server).toContain('removePrototypeWorld');
    expect(server).toContain('RequestStatus');

    expect(client).toContain('ScreenGui');
    expect(client).toContain('ActivityPanel');
    expect(client).toContain('TextButton');
    expect(client).toContain('Activated:Connect');
    expect(client).toContain('submitAnswer:InvokeServer');
    expect(client).not.toContain('follow the glowing signs');
  });

  it('headless proof exercises repeatability, inventory unlock, duplicate guard, and reward cap', () => {
    const script=buildCoreLoopProbeScript();
    expect(script).toContain('STARBLOX_CORE_LOOP_OK');
    expect(script).toContain('STARBLOX_CORE_LOOP_OK');
    expect(script).toContain('QuestionCursorByStation');
    expect(script).toContain('phase8-challenging-questions-v1');
    expect(script).toContain('phase8-material-first-star-fallback-v1');
    expect(script).toContain('first twelve questions must be current material');
    expect(script).toContain('fallback question must be STAR-aligned');
    expect(script).toContain('STAR fallback should remain active rather than returning to stale material');
    expect(script).not.toContain('station must have six certified questions');
    expect(script).toContain('three correct answers should grant 30 coins');
    expect(script).toContain('stale answer replay was not rejected');
    expect(script).toContain('challenge progression must not mint coins');
    expect(script).toContain('brightside-spark-trail');
    expect(script).toContain('productionActivationAllowed == false');
  });
});
