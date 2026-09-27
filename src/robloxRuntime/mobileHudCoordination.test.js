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

  it('collapses school chrome into a bottom action pill on compact phone viewports',()=>{
    expect(source).toContain('compactViewport = viewport.X <= 1024 or viewport.Y <= 600');
    expect(source).toContain('hud.Visible = false');
    expect(source).toContain('waypoint.Visible = false');
    expect(source).toContain('schoolCallout.AnchorPoint = Vector2.new(0.5, 1)');
    expect(source).toContain('schoolCallout.Position = UDim2.new(0.5, 0, 1, -10)');
    expect(source).toContain('schoolCallout.Size = UDim2.fromOffset(190, 44)');
    expect(source).toContain('calloutBody.Visible = false');
    expect(source).toContain('goToSchool.Size = UDim2.fromOffset(64, 44)');
    expect(source).toContain('return "JOIN"');
    expect(source).toContain('calloutTitle.Text = string.format("%s • %d studs"');
    expect(source).toContain('local withinContextRange = if compactViewport then distance <= 90 else true');
    expect(source).toContain('payload.currentClassCompleted ~= true and not compactViewport');
  });

  it('yields schedule, waypoint and invitation layers to every town menu',()=>{
    expect(source).toContain('playerGui:FindFirstChild("BrookhavenFamilyUI")');
    expect(source).toContain('family:IsA("ScreenGui") and family.Enabled');
    expect(source).toContain('local menuOpen = townMenuOpen()');
    expect(source).toContain('hud.Visible = payload.dismissed ~= true and not compactViewport');
    expect(source).toContain('and not panel.Visible and not report.Visible and not menuOpen');
    expect(source).toContain('waypoint.Visible = not compactViewport and not panel.Visible and not report.Visible and not menuOpen');
    expect(source).toContain('local reportAvailable = type(payload.report) == "table" and payload.report.ok == true');
    expect(source).toContain('report.Visible = reportAvailable and not panel.Visible and not menuOpen');
    expect(source).toContain('and not panel.Visible and not reportAvailable and not menuOpen');
    expect(source).toContain('local reportAvailable = state ~= nil and type(state.report) == "table" and state.report.ok == true');
    expect(source).not.toContain('report.Visible = true');
    expect(source).toContain('and not menuOpen');
  });
});
