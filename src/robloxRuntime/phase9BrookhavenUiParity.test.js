import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 9: Brookhaven UI parity skin',()=>{
  it('uses a light square right rail instead of a dark StarBlox navigation container',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    expect(sidebar).toContain('rail.BackgroundTransparency = 1');
    expect(sidebar).toContain('b.Size = UDim2.fromOffset(50, 50)');
    expect(sidebar).toContain('b.BackgroundColor3 = UI.white');
    expect(sidebar).toContain('round(b, 8)');
    expect(sidebar).not.toContain('Color3.fromRGB(30, 36, 56)');
  });

  it('renders vehicles, items, jobs, and houses as light thumbnail grids with a red close tile',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const shop=read('roblox/src/client/Shop.client.luau');

    for(const source of [sidebar,shop]){
      expect(source).toContain('BackgroundColor3 = UI.white');
      expect(source).toContain('UIGridLayout');
      expect(source).toContain('CellSize = UDim2.fromOffset(78, 78)');
      expect(source).toContain('BackgroundColor3 = UI.red');
      expect(source).toContain('Text = "X"');
    }
    expect(sidebar).toContain('panel.Position = UDim2.new(1, -70, 0.5, 4)');
    expect(shop).toContain('panel.Position = UDim2.new(1,-70,0.5,4)');
  });

  it('uses a sparse Brookhaven-style top status strip instead of the old game dashboard',()=>{
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    expect(client).toContain('hud.Size = UDim2.fromOffset(205, 46)');
    expect(client).toContain('hud.Position = UDim2.new(1, -72, 0, 8)');
    expect(client).toContain('DateTime.now()');
    expect(client).toContain('FormatLocalTime("h:mm A", "en-us")');
    expect(client).toContain('FormatLocalTime("dddd", "en-us")');
    expect(client).toContain('economy.Text = string.format("%d Coins"');
    expect(client).not.toContain('Challenge %d/%d • %s');
  });

  it('skins learning cards with the same pale Brookhaven UI language',()=>{
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    expect(client).toContain('panel = Color3.fromRGB(245, 245, 245)');
    expect(client).toContain('panelSoft = Color3.fromRGB(222, 222, 222)');
    expect(client).toContain('text = Color3.fromRGB(42, 42, 42)');
    expect(client).toContain('closeButton.BackgroundColor3 = COLORS.danger');
    expect(client).toContain('round(panel, 5)');
    expect(client).toContain('round(button, 4)');
  });
});
