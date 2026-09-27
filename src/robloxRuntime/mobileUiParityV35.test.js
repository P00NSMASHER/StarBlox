import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('v35 iPhone render-truth mobile parity repairs',()=>{
  it('groups persistent utilities and keeps the action rail compact and coherent',()=>{
    const source=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(source).toContain('topCluster.Name = "TopUtilityCluster"');
    expect(source).toContain('topCluster.Position = UDim2.new(1, -72, 0, 8)');
    expect(source).toContain('topCluster.Size = UDim2.fromOffset(218, 72)');
    expect(source).toContain('rail.Position = UDim2.new(1, -12, 0, 86)');
    expect(source).toContain('rail.Size = UDim2.fromOffset(50, 246)');
    expect(source).toContain('holder.Size = UDim2.fromOffset(46, 46)');
    expect(source).toContain('shadow.BackgroundTransparency = 0.90');
  });

  it('keeps tools, animations and vehicles inside one adjacent mobile card',()=>{
    const source=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(source).toContain('panel.Position = UDim2.new(1, -70, 0, 96)');
    expect(source).toContain('panel.Size = UDim2.fromOffset(288, 300)');
    expect(source).toContain('panel.BackgroundTransparency = 0.06');
    expect(source).toContain('grid.CellSize = UDim2.fromOffset(58, 58)');
    expect(source).toContain('setSecondaryChromeVisible(false)');
    expect(source).toContain('setSecondaryChromeVisible(true)');
    expect(source).toContain('previewType == "animation"');
  });

  it('uses a compact house picker instead of the old center-screen strip',()=>{
    const source=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(source).toContain('plotSelector.Position = UDim2.new(1, -70, 0, 96)');
    expect(source).toContain('plotSelector.Size = UDim2.fromOffset(300, 184)');
    expect(source).toContain('mode.Size = UDim2.fromOffset(88, 44)');
    expect(source).toContain('previousPlot = plotArrow("PreviousPlot", "←", -116)');
    expect(source).toContain('nextPlot = plotArrow("NextPlot", "→", 116)');
  });

  it('gives dedicated overlays clean HUD ownership',()=>{
    const avatar=read('roblox/src/client/AvatarEditor.client.luau');
    const family=read('roblox/src/client/FamilyPanel.client.luau');
    const cams=read('roblox/src/client/HomeCams.client.luau');

    expect(avatar).toContain('scrim.BackgroundTransparency = 0.34');
    expect(avatar).toContain('setRoleplayTagVisible(false)');
    expect(avatar).toContain('setWorldHudVisible(false)');
    expect(avatar).toContain('setWorldHudVisible(true)');

    expect(family).toContain('scrim.Name = "FamilyScrim"');
    expect(family).toContain('setWorldHudVisible(false)');
    expect(family).toContain('setWorldHudVisible(true)');

    expect(cams).toContain('setWorldHudVisible(false)');
    expect(cams).toContain('setWorldHudVisible(true)');
  });

  it('finds an exterior GO HOME point with ground and collision checks',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');
    expect(service).toContain('function HomeEconomyService:_homeArrivalCFrame(player: Player): CFrame?');
    expect(service).toContain('Workspace:Raycast(rayOrigin, Vector3.new(0, -90, 0), rayParams)');
    expect(service).toContain('Workspace:GetPartBoundsInBox(');
    expect(service).toContain('if part:IsA("BasePart") and part.CanCollide and part.Transparency < 0.95 then');
    expect(service).toContain('return CFrame.lookAt(rootPosition, lookAt)');
  });
});
