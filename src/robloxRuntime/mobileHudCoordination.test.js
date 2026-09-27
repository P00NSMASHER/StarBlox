import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const source=readFileSync(
  new URL('../../roblox/src/client/SchoolSystem.client.luau',import.meta.url),
  'utf8'
);

describe('recorded mobile HUD coordination',()=>{
  it('keeps school actions and answers above the 44px touch minimum',()=>{
    expect(source).toContain('goToSchool.Size = UDim2.fromOffset(100, 44)');
    expect(source).toContain('closeButton.Size = UDim2.fromOffset(44, 44)');
    expect(source).toContain('button.Size = UDim2.new(1, -32, 0, 54)');
  });

  it('fits both question layouts inside the verified 402px phone budget',()=>{
    const heights=[...source.matchAll(/panel\.Size = UDim2\.new\(0\.84, 0, 0, (\d+)\)/g)]
      .map((match)=>Number(match[1]));

    expect(heights).toEqual([350,382,350]);
    expect(Math.max(...heights)).toBeLessThanOrEqual(382);
    expect(source).toContain('panel.Position = UDim2.fromScale(0.5, 0.5)');
    expect(source).toContain('panelConstraint.MaxSize = Vector2.new(520, 382)');
  });

  it('yields schedule, waypoint and invitation layers to every town menu',()=>{
    expect(source).toContain('playerGui:FindFirstChild("BrookhavenFamilyUI")');
    expect(source).toContain('family:IsA("ScreenGui") and family.Enabled');
    expect(source).toContain('local menuOpen = townMenuOpen()');
    expect(source).toContain('hud.Visible = payload.dismissed ~= true and not panel.Visible and not report.Visible and not menuOpen');
    expect(source).toContain('and not panel.Visible and not report.Visible and not menuOpen');
    expect(source).toContain('waypoint.Visible = not panel.Visible and not report.Visible and not menuOpen');
    expect(source).toContain('and not menuOpen');
  });
});
