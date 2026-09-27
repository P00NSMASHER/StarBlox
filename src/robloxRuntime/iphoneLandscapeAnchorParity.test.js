import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('v37 landscape iPhone anchor parity',()=>{
  it('keeps the persistent HUD at true landscape safe-area anchors',()=>{
    const source=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(source).toContain('if viewport.X >= viewport.Y then');
    expect(source).toContain('shellScale.Scale = 1');
    expect(source).toContain('topCluster.AnchorPoint = Vector2.new(1, 0)');
    expect(source).toContain('rail.AnchorPoint = Vector2.new(1, 0)');
    expect(source).toContain('panel.AnchorPoint = Vector2.new(1, 0)');
    expect(source).toContain('plotSelector.AnchorPoint = Vector2.new(1, 0)');
  });

  it('keeps avatar-editor scrim and edge panels unshrunk in landscape',()=>{
    const source=read('roblox/src/client/AvatarEditor.client.luau');
    expect(source).toContain('scrim.Size = UDim2.fromScale(1, 1)');
    expect(source).toContain('if viewport.X >= viewport.Y then');
    expect(source).toContain('scale.Scale = 1');
    expect(source).toContain('outfitsPanel.Position = UDim2.new(0, 72, 0.5, -110)');
    expect(source).toContain('presetsPanel.AnchorPoint = Vector2.new(1, 0)');
    expect(source).toContain('equippedTray.AnchorPoint = Vector2.new(0.5, 1)');
  });

  it('keeps family modal scrim and right panel at device coordinates in landscape',()=>{
    const source=read('roblox/src/client/FamilyPanel.client.luau');
    expect(source).toContain('scrim.Size = UDim2.fromScale(1, 1)');
    expect(source).toContain('if viewport.X >= viewport.Y then');
    expect(source).toContain('scale.Scale = 1');
    expect(source).toContain('panel.AnchorPoint = Vector2.new(1, 0)');
  });
});
