import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('iPhone visual parity repair',()=>{
  it('rebuilds persistent mobile chrome with real image icons and glass controls',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(sidebar).toContain('rail.Size = UDim2.fromOffset(48, 230)');
    expect(sidebar).toContain('railLayout.Padding = UDim.new(0, 5)');
    expect(sidebar).toContain('button.Size = UDim2.fromOffset(44, 44)');
    expect(sidebar).toContain('local ICONS: {[string]: string} = table.freeze({');
    expect(sidebar).toContain('local function glass(guiObject: GuiObject, radius: number)');
    expect(sidebar).toContain('local function drawRailIcon(button: GuiObject, iconName: string)');
    expect(sidebar).toContain('setRailSelection');
    expect(sidebar).toContain('quickChatArrow.Visible = false');
    expect(sidebar).toContain('quickChatButton.Visible = false');
    expect(sidebar).toContain('local actionHintsDismissed = true');
    expect(sidebar).not.toContain('local function drawActionIcon');
  });

  it('keeps school prompts contextual instead of persistent in free roam',()=>{
    const school=read('roblox/src/client/SchoolSystem.client.luau');
    expect(school).toContain('schoolCallout.Size = UDim2.fromOffset(190, 44)');
    expect(school).toContain('goToSchool.Size = UDim2.fromOffset(64, 44)');
    expect(school).toContain('local withinContextRange = if compactViewport then distance <= 90 else true');
    expect(school).toContain('payload.currentClassCompleted ~= true and not compactViewport');
  });

  it('targets the exact v31 checkerboard and skyline holiday geometry',()=>{
    const core=read('roblox/src/server/CoreGameLoopService.luau');
    expect(core).toContain('for index = 14342, 14376 do');
    expect(core).toContain('part.Color = Color3.fromRGB(194, 194, 190)');
    expect(core).toContain('part.Material = Enum.Material.Concrete');
    expect(core).toContain('for index = 10677, 10683 do');
    expect(core).toContain('part.Transparency = 1');
    expect(core).toContain('part.CanCollide = false');
    expect(core).toContain('worldRoot:SetAttribute("TownCenterGroundTilesRecolored", recoloredGround)');
    expect(core).toContain('worldRoot:SetAttribute("TownCenterHolidayMeshesHidden", hiddenHolidayMeshes)');
    expect(core).toContain('applyTownCenterVisualPolish(worldRoot, spawnSource)');
  });

  it('moves legacy staging spawn framing toward the street while preserving slot spacing',()=>{
    const core=read('roblox/src/server/CoreGameLoopService.luau');
    expect(core).toContain('BrookhavenMirrorConfig.World.Mode == "legacy-reference-safe-world"');
    expect(core).toContain('spawnCFrame = spawnCFrame * CFrame.new(0, 0, -7.5)');
  });

  it('reduces roleplay nameplate clutter in the first camera frame',()=>{
    const roleplay=read('roblox/src/server/RoleplayService.luau');
    expect(roleplay).toContain('billboard.Size = UDim2.fromOffset(142, 32)');
    expect(roleplay).toContain('billboard.StudsOffsetWorldSpace = Vector3.new(0, 2.55, 0)');
    expect(roleplay).toContain('detail.Size = UDim2.new(1, 0, 0, 13)');
  });

  it('caps bloom and extreme color grading without touching the immutable witness',()=>{
    const projection=read('roblox/src/server/WorldProjectionService.luau');
    expect(projection).toContain('local function tamePostProcessing()');
    expect(projection).toContain('effect.Intensity = math.min(effect.Intensity, 0.12)');
    expect(projection).toContain('effect.Threshold = math.max(effect.Threshold, 1.15)');
    expect(projection).toContain('effect.Saturation = math.clamp(effect.Saturation, -0.05, 0.08)');
    expect(projection).toContain('runtime.Parent = Workspace');
    expect(projection).toContain('tamePostProcessing()');
  });
});
