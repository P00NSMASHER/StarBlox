import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

const client=readFileSync(
  new URL('../../roblox/src/client/CoreGameLoop.client.luau',import.meta.url),
  'utf8'
);

describe('Phase 3: phone-first StarBlox UX',()=>{
  it('keeps primary overlays within the verified 750x402 touch viewport budget',()=>{
    const hudHeight=Number(client.match(/hud\.Size = UDim2\.fromOffset\(205, (\d+)\)/)?.[1]);
    const panelHeight=Number(client.match(/panel\.Size = UDim2\.new\(0\.84, 0, 0, (\d+)\)/)?.[1]);
    const onboardingHeight=Number(client.match(/onboarding\.Size = UDim2\.new\(0\.78, 0, 0, (\d+)\)/)?.[1]);

    expect(hudHeight).toBe(46);
    expect(panelHeight).toBe(322);
    expect(onboardingHeight).toBe(216);
    expect(panelHeight).toBeLessThan(402);
    expect(onboardingHeight).toBeLessThan(402);
  });

  it('keeps touch targets at least 44px and removes verbose always-visible HUD content',()=>{
    expect(client).toContain('hud.AnchorPoint = Vector2.new(1, 0)');
    expect(client).toContain('hud.Position = UDim2.new(1, -72, 0, 8)');
    expect(client).toContain('nextHint.AnchorPoint = Vector2.new(1, 0)');
    expect(client).toContain('nextHint.Position = UDim2.new(0.5, 76, 0, 8)');
    expect(client).toContain('button.Size = UDim2.new(1, -32, 0, 44)');
    expect(client).toContain('closeButton.Size = UDim2.fromOffset(44, 44)');
    expect(client).toContain('onboardingButton.Size = UDim2.new(1, -36, 0, 44)');
    expect(client).toContain('"%d Coins"');
    expect(client).not.toContain('"Coins %d   •   XP %d   •   Stars %d"');
    expect(client).toContain('nextHint.Text = "→ " .. status.recommendedStationName');
  });

  it('uses only one small client waypoint instead of restoring world-sized signs',()=>{
    expect(client).toContain('waypoint.Name = "NextActivityWaypoint"');
    expect(client).toContain('waypoint.Size = UDim2.fromOffset(96, 24)');
    expect(client).toContain('waypoint.AlwaysOnTop = false');
    expect(client).toContain('waypoint.MaxDistance = 220');
    expect(client).toContain('waypoint.Enabled = false');
    expect(client).toContain('waypoint.Adornee = candidate');
    expect(client).not.toContain('GuideBillboard');
    expect(client).not.toContain('StationSign');
  });

  it('uses short onboarding copy appropriate for a non-blocking coach card',()=>{
    expect(client).toContain('onboardingTitle.Text = "Ready to explore?"');
    expect(client).toContain('onboardingBody.Text = "Find 3 activity spots and answer one question at each."');
    expect(client).toContain('onboardingHint.Text = "Walk near a prompt and tap Start Activity."');
    expect(client).toContain('onboardingButton.Text = "Explore"');
  });
});
