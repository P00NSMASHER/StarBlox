import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

function json(path){
  return JSON.parse(read(path));
}

describe('Mirror sidebar action icon integrity',()=>{
  const source=read('roblox/src/client/MirrorSidebar.client.luau');
  const receipt=json('docs/roblox-world/MENU_ACTION_ICON_REPAIR_RECEIPT.json');

  it('uses five deterministic pictograms instead of unsupported action-button glyphs',()=>{
    expect(source).toContain('local function drawActionIcon(button: TextButton, iconName: string)');
    expect(source).toContain('b.Text = ""');
    expect(source).not.toContain('actionButton("☺"');
    expect(source).not.toContain('actionButton("♙"');
    expect(source).not.toContain('actionButton("♟"');
    expect(source).not.toContain('actionButton("▰"');
    expect(source).not.toContain('actionButton("⌂"');

    const expected=[
      ['avatar','Avatar','Avatar Editor'],
      ['tools','Tools','Tools'],
      ['animations','Animations','Animations'],
      ['vehicle','Vehicle','Vehicle'],
      ['house','House','House']
    ];
    for(const [icon,name,label] of expected){
      expect(source).toContain(`actionButton("${icon}", "${name}", "${label}"`);
      expect(source).toContain(`iconName == "${icon}"`);
    }
    expect((source.match(/Btn = actionButton\("/g)||[]).length).toBe(5);
  });

  it('keeps the repair asset-independent and outside Mobile HUD layout ownership',()=>{
    expect(receipt.implementation).toEqual({
      file:'roblox/src/client/MirrorSidebar.client.luau',
      approach:'five action-rail pictograms plus three plot-mode composites; no Image asset dependency',
      externalAssetIds:[],
      thirdPartyArtCopied:false,
      mobileHudLayoutChanged:false,
      actionBindingsChanged:false
    });
    expect(receipt.comparison).toHaveLength(6);
    expect(receipt.comparison.every(row=>row.legacyAssetId===null)).toBe(true);
    expect(receipt.comparison.every(row=>row.exactCurrentLiveArtParity==='UNVERIFIED')).toBe(true);
  });

  it('fails closed when native screenshots and end-to-end action proof are unavailable',()=>{
    expect(receipt.screenEvidence.map(row=>row.result)).toEqual([
      'OBSERVED_PICTORIAL_CONTROLS',
      'FAIL_UNSUPPORTED_SQUARE_LIKE_GLYPHS',
      'UNKNOWN_NATIVE_CLIENT_UNAVAILABLE'
    ]);
    expect(receipt.verification).toMatchObject({
      nativeClientResult:'UNKNOWN',
      fullActionResult:'NOT_RETESTED'
    });
    expect(receipt.claims).toEqual({
      unsupportedGlyphDefectRemovedByConstruction:true,
      currentLiveVisualParityCertified:false,
      nativeClientProofAvailable:false,
      releaseReady:false
    });
  });

  it('draws the three house plot modes without the unsupported house or tree glyphs',()=>{
    const start=source.indexOf('local plotModes = Instance.new("Frame")');
    const end=source.indexOf('local previousPlot',start);
    const plotModes=source.slice(start,end);

    expect(source).toContain('local function drawPlotModeIcon(button: TextButton, modeIndex: number)');
    expect(source).toContain('local function drawMiniHouse(parent: GuiObject');
    expect(source).toContain('part.ZIndex = parent.ZIndex + 1');
    expect(plotModes).toContain('for index = 1, 3 do');
    expect(plotModes).toContain('mode.Text = ""');
    expect(plotModes).toContain('drawPlotModeIcon(mode, index)');
    expect(plotModes).not.toContain('⌂');
    expect(plotModes).not.toContain('♣');
  });
});
