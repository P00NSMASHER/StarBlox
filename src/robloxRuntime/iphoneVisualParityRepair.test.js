import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('iPhone visual parity repair',()=>{
  it('shrinks and cleans persistent mobile chrome',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(sidebar).toContain('rail.Size = UDim2.fromOffset(52, 250)');
    expect(sidebar).toContain('local y = (order - 1) * 50');
    expect(sidebar).toContain('b.Size = UDim2.fromOffset(48, 48)');
    expect(sidebar).toContain('iconScale.Scale = 0.76');
    expect(sidebar).toContain('quickChatArrow.Visible = false');
    expect(sidebar).toContain('quickChatButton.Visible = false');
    expect(sidebar).toContain('local actionHintsDismissed = true');
  });

  it('keeps school prompts contextual instead of persistent in free roam',()=>{
    const school=read('roblox/src/client/SchoolSystem.client.luau');
    expect(school).toContain('schoolCallout.Size = UDim2.fromOffset(190, 44)');
    expect(school).toContain('goToSchool.Size = UDim2.fromOffset(64, 44)');
    expect(school).toContain('local withinContextRange = if compactViewport then distance <= 90 else true');
    expect(school).toContain('payload.currentClassCompleted ~= true and not compactViewport');
  });

  it('neutralizes the holiday checkerboard and near-spawn glare only on the mutable runtime world',()=>{
    const core=read('roblox/src/server/CoreGameLoopService.luau');
    expect(core).toContain('local function applyTownCenterVisualPolish(worldRoot: Model, spawnSource: BasePart)');
    expect(core).toContain('horizontalDistance <= 58 and flatGround and looksLikeHolidayPlazaColor');
    expect(core).toContain('descendant.Color = Color3.fromRGB(190, 191, 187)');
    expect(core).toContain('descendant.Material = Enum.Material.Concrete');
    expect(core).toContain('horizontalDistance <= 36 and descendant.Material == Enum.Material.Neon');
    expect(core).toContain('worldRoot:SetAttribute("TownCenterVisualPolishApplied", true)');
    expect(core).toContain('applyTownCenterVisualPolish(worldRoot, spawnSource)');
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
