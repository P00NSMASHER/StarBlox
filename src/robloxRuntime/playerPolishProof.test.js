import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import {
  buildPlayerPolishProbeScript
} from './playerPolishProof.js';

describe('Step 8: player-experience polish and automated UX QA', () => {
  it('adds onboarding, recommended navigation, and fail-closed reward-cap status', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );
    const config=readFileSync(
      new URL('../../roblox/src/shared/CoreLoopConfig.luau',import.meta.url),
      'utf8'
    );
    const profile=readFileSync(
      new URL('../../roblox/src/shared/ProfileTemplate.luau',import.meta.url),
      'utf8'
    );

    expect(config).toContain('PolishRevision = "step8-release-polish-v1"');
    expect(config).toContain('Welcome to Brightside!');
    expect(config).toContain('Direction = "North"');
    expect(config).toContain('Direction = "East"');
    expect(config).toContain('Direction = "West"');

    expect(server).toContain('function CoreGameLoopService.BuildStatus');
    expect(server).toContain('function CoreGameLoopService.MarkOnboardingSeen');
    expect(server).toContain('recommendedStationName');
    expect(server).toContain('rewardCapReached');
    expect(server).toContain('DismissOnboarding');
    expect(profile).toContain('OnboardingSeen = false');
  });

  it('uses invisible real-world activity bindings while keeping prototype geometry retired', () => {
    const server=readFileSync(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url),
      'utf8'
    );
    const config=readFileSync(
      new URL('../../roblox/src/shared/CoreLoopConfig.luau',import.meta.url),
      'utf8'
    );
    const bindings=readFileSync(
      new URL('../../roblox/src/shared/WorldActivityBindings.luau',import.meta.url),
      'utf8'
    );

    for(const retiredToken of [
      'GuideTotem',
      'GuideBillboard',
      'StationHighlight',
      'StationGlow',
      'StationSign',
      'BrightsidePlaza',
      'StarBloxSpawn'
    ]){
      expect(server).not.toContain(retiredToken);
    }

    expect(server).toContain('removePrototypeWorld');
    expect(server).toContain('WorldBindings.RuntimeAnchorFolderName');
    expect(server).toContain('anchor.Parent = runtimeFolder');
    expect(server).not.toContain('anchor.Parent = worldRoot');
    expect(server).toContain('anchor.Transparency = 1');
    expect(server).toContain('anchor.CanCollide = false');
    expect(bindings).toContain('BrookhavenWorldBaseline');
    expect(bindings).toContain('BHW_3461');
    expect(bindings).toContain('BHW_4879');
    expect(bindings).toContain('BHW_4876');
    expect(bindings).toContain('BHW_3405');

    expect(config).toContain('Direction = "North"');
    expect(config).toContain('Direction = "East"');
    expect(config).toContain('Direction = "West"');
    expect(config).toContain('Explore the neighborhood');
  });

  it('uses a compact landscape-safe HUD, activity card, onboarding card, and next-activity waypoint', () => {
    const client=readFileSync(
      new URL('../../roblox/src/client/CoreGameLoop.client.luau',import.meta.url),
      'utf8'
    );

    expect(client).toContain('DeviceSafeInsets');
    expect(client).toContain('hud.AnchorPoint = Vector2.new(1, 0)');
    expect(client).toContain('hud.Position = UDim2.new(1, -12, 0, 12)');
    expect(client).toContain('nextHint.AnchorPoint = Vector2.new(1, 0)');
    expect(client).toContain('nextHint.Position = UDim2.new(1, -12, 0, 76)');
    expect(client).toContain('hud.Size = UDim2.fromOffset(286, 58)');
    expect(client).toContain('nextHint.Size = UDim2.fromOffset(220, 28)');
    expect(client).toContain('panel.Size = UDim2.new(0.84, 0, 0, 322)');
    expect(client).toContain('panelConstraint.MaxSize = Vector2.new(520, 322)');
    expect(client).toContain('button.Size = UDim2.new(1, -32, 0, 44)');
    expect(client).toContain('closeButton.Size = UDim2.fromOffset(44, 44)');
    expect(client).toContain('onboarding.Size = UDim2.new(0.78, 0, 0, 216)');
    expect(client).toContain('onboardingButton.Size = UDim2.new(1, -36, 0, 44)');
    expect(client).toContain('waypoint.Size = UDim2.fromOffset(96, 24)');
    expect(client).toContain('waypoint.MaxDistance = 220');
    expect(client).toContain('waypoint.AlwaysOnTop = false');
    expect(client).toContain('waypoint.Adornee = candidate');
    expect(client).toContain('Selectable = true');

    expect(client).not.toContain('hud.Size = UDim2.new(1, -24, 0, 132)');
    expect(client).not.toContain('panel.Size = UDim2.new(0.92, 0, 0, 442)');
    expect(client).not.toContain('onboarding.Size = UDim2.new(0.9, 0, 0, 350)');
    expect(client).not.toContain('StarBlox • Brightside Plaza');
    expect(client).not.toContain('Coins %d   •   XP %d   •   Stars %d');
  });

  it('adds clear feedback, dismissible onboarding, and recoverable failure states', () => {
    const client=readFileSync(
      new URL('../../roblox/src/client/CoreGameLoop.client.luau',import.meta.url),
      'utf8'
    );

    expect(client).toContain('TweenService');
    expect(client).toContain('showToast');
    expect(client).toContain('shakePanel');
    expect(client).toContain('friendlyFailure');
    expect(client).toContain('rate_limited');
    expect(client).toContain('profile_unavailable');
    expect(client).toContain('activity_not_open');
    expect(client).toContain('Reconnecting…');
    expect(client).toContain('tryNumber < 3');
    expect(client).toContain('dismissOnboarding:FireServer()');
    expect(client).toContain('closeButton.Activated:Connect');
  });

  it('headless proof exercises the real Roblox polish objects and state transitions', () => {
    const script=buildPlayerPolishProbeScript();
    expect(script).toContain('STARBLOX_PLAYER_POLISH_OK');
    expect(script).toContain('legacy prototype world must remain retired');
    expect(script).not.toContain('GuideTotem');
    expect(script).not.toContain('StationHighlight');
    expect(script).toContain('real-world activity anchor folder missing');
    expect(script).toContain('activity anchor mutated the locked world hierarchy');
    expect(script).toContain('real-world spawn binding missing');
    expect(script).toContain('WordPortalAnchor');
    expect(script).toContain('SpellingForgeAnchor');
    expect(script).toContain('CultureLabAnchor');
    expect(script).toContain('DismissOnboarding');
    expect(script).toContain('status0.recommendedActivityId == "word-portal-put-v1"');
    expect(script).toContain('status1.recommendedActivityId == "spelling-forge-fog-v1"');
    expect(script).toContain('status2.recommendedActivityId == "culture-lab-culture-v1"');
    expect(script).toContain('rewardCapReached == true');
    expect(script).toContain('productionActivationAllowed == false');
  });
});
