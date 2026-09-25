import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import {
  buildVerticalSliceProbeScript
} from './verticalSliceProof.js';

describe('Step 6: native player-facing vertical slice', () => {
  it('keeps the correct answer server-only', () => {
    const shared=readFileSync(
      new URL('../../roblox/src/shared/VerticalSliceConfig.luau',import.meta.url),
      'utf8'
    );
    const server=readFileSync(
      new URL('../../roblox/src/server/VerticalSliceService.luau',import.meta.url),
      'utf8'
    );

    expect(shared).toContain('word-portal-put-v1');
    expect(shared).toContain('ABVM Grade 2 current source pack');
    expect(shared).not.toMatch(/Answer\s*=/);
    expect(server).toMatch(/local ANSWER = "put"/);
    expect(server).toMatch(/function VerticalSliceService\.GradeAnswer/);
  });

  it('creates a native Roblox world, prompt, remotes, and durable reward path', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/VerticalSliceService.luau',import.meta.url),
      'utf8'
    );
    const bootstrap=readFileSync(
      new URL('../../roblox/src/server/Bootstrap.luau',import.meta.url),
      'utf8'
    );
    const template=readFileSync(
      new URL('../../roblox/src/shared/ProfileTemplate.luau',import.meta.url),
      'utf8'
    );

    expect(server).toContain('StarBloxVerticalSlice');
    expect(server).toContain('SpawnLocation');
    expect(server).toContain('ProximityPrompt');
    expect(server).toContain('QuestOpened');
    expect(server).toContain('SubmitAnswer');
    expect(server).toContain('data.Economy.Coins += Config.Reward.Coins');
    expect(server).toContain('data.Progress.VerticalSlice.RewardClaimed');
    expect(server).toContain('self._replicas:Sync(player, data)');
    expect(bootstrap).not.toContain('VerticalSliceService.new(profiles, replicas)');
    expect(bootstrap).toContain('CoreGameLoopService.new(profiles, replicas)');
    expect(template).toContain('RewardClaimed = false');
  });

  it('ships a mobile-friendly player HUD and answer interaction', () => {
    const client=readFileSync(
      new URL('../../roblox/src/client/VerticalSlice.client.luau',import.meta.url),
      'utf8'
    );

    expect(client).toContain('ScreenGui');
    expect(client).toContain('StarBlox • Brightside Plaza');
    expect(client).toContain('QuestPanel');
    expect(client).toContain('TextButton');
    expect(client).toContain('Activated:Connect');
    expect(client).toContain('submitAnswer:InvokeServer');
    expect(client).toContain('GetAttributeChangedSignal');
  });

  it('headless proof checks the real world and server grader without requiring Studio', () => {
    const script=buildVerticalSliceProbeScript();
    expect(script).toContain('StarBloxVerticalSlice');
    expect(script).toContain('StartQuestPrompt');
    expect(script).toContain('service.GradeAnswer("put") == true');
    expect(script).toContain('service.GradeAnswer("blue") == false');
    expect(script).toContain('config.Quest.Answer == nil');
    expect(script).toContain('productionActivationAllowed == false');
  });
});
