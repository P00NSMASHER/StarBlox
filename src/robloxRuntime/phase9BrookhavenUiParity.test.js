import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven recording parity: post-opening world shell',()=>{
  it('uses the five persistent right-side Brookhaven actions from the reference recording',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(sidebar).toContain('gui.Name = "BrookhavenMirrorSidebar"');
    expect(sidebar).toContain('shell.Name = "BrookhavenWorldShell"');
    expect(sidebar).toContain('rail.Name = "RightActionRail"');

    for(const required of [
      '"Avatar", "Avatar Editor", 1',
      '"Tools", "Tools", 2',
      '"Animations", "Animations", 3',
      '"Vehicle", "Vehicle", 4',
      '"House", "House", 5',
    ]){
      expect(sidebar).toContain(required);
    }

    for(const removed of [
      '"BioButton"',
      '"JobsButton"',
      '"MapButton"',
      '"ShopButton"',
      '"InventoryButton"',
      '"EmotesButton"',
    ]){
      expect(sidebar).not.toContain(removed);
    }
  });

  it('matches the top utility hierarchy visible in the recording',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(sidebar).toContain('"QuickChatBolt"');
    expect(sidebar).toContain('"QuickChatButton"');
    expect(sidebar).toContain('"HomeCamsButton"');
    expect(sidebar).toContain('clockBox.Name = "Clock"');
    expect(sidebar).toContain('"FamilyButton"');
    expect(sidebar).toContain('FormatLocalTime("h:mm A", "en-us")');
    expect(sidebar).toContain('FormatLocalTime("dddd", "en-us")');
  });

  it('keeps contextual menus floating over the world instead of inside a large dashboard',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(sidebar).toContain('panel.Name = "BrookhavenContextPanel"');
    expect(sidebar).toContain('panel.BackgroundTransparency = 1');
    expect(sidebar).toContain('grid.CellSize = UDim2.fromOffset(49, 49)');
    expect(sidebar).toContain('categoryRail.Name = "CategoryRail"');
    expect(sidebar).toContain('{Id = "tech", Symbol = "▯"}');
    for(const required of [
      '{Id = "small", Symbol = "○"}',
      '{Id = "street", Symbol = "▰"}',
      '{Id = "work", Symbol = "▱"}',
      '{Id = "event", Symbol = "★"}',
      '{Id = "boats", Symbol = "≈"}',
      '{Id = "flying", Symbol = "↑"}',
    ]){
      expect(sidebar).toContain(required);
    }
    for(const retired of ['{Id = "cars"', '{Id = "utility"', '{Id = "bikes"']){
      expect(sidebar).not.toContain(retired);
    }
    expect(sidebar).toContain('close.BackgroundColor3 = UI.red');
    expect(sidebar).toContain('setActionLabelsVisible(false)');
  });

  it('does not show persistent StarBlox learning/economy chrome in the ordinary world view',()=>{
    const core=read('roblox/src/client/CoreGameLoop.client.luau');

    expect(core).toContain('hud.Visible = false');
    expect(core).toContain('nextHint.Visible = false');
    expect(core).toContain('player:GetAttribute("StarBloxLearningOverlayVisible") ~= true');
    expect(core).toContain('player:GetAttribute("StarBloxLearningOverlayVisible") == true');
  });

  it('keeps the exact frozen Brookhaven world baseline contract while changing only the client shell',()=>{
    const config=read('roblox/src/shared/BrookhavenMirrorConfig.luau');

    expect(config).toContain('Mode = "exact-frozen-brookhaven-world"');
    expect(config).toContain('BrookhavenBaselineLocked = true');
    expect(config).toContain('RuntimeSystemsMayMutateBaseline = false');
    expect(config).toContain('Revision = "recording-parity-shell-catalog-reference-v3"');
    expect(config).toContain('{Id = "quick-chat", Label = "Quick Chat", Order = 1}');
    expect(config).toContain('{Id = "houses", Label = "House", Order = 5}');
  });
  it('uses the Brookhaven vacant-lot selector before the house catalog',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(sidebar).toContain('plotSelector.Name = "HousePlotSelector"');
    expect(sidebar).toContain('previousPlot = plotArrow("PreviousPlot", "←", -178)');
    expect(sidebar).toContain('nextPlot = plotArrow("NextPlot", "→", 178)');
    expect(sidebar).toContain('plotGo.Name = "PlotGo"');
    expect(sidebar).toContain('plotStatus.Text = "Vacant"');
    expect(sidebar).toContain('selectPlot:InvokeServer(selected.Id)');
    expect(service).toContain('getPlots.Name = "GetPlots"');
    expect(service).toContain('selectPlot.Name = "SelectPlot"');
    expect(service).toContain('code = "plot_occupied"');
  });

  it('matches the recorded compact right-rail menu geometry and functional toolbar',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(sidebar).toContain('local function configureIconPanel(withCategoryRail: boolean)');
    expect(sidebar).toContain('panel.Position = UDim2.new(1, -164, 0, 126)');
    expect(sidebar).toContain('panel.Size = UDim2.fromOffset(258, 264)');
    expect(sidebar).toContain('grid.CellSize = UDim2.fromOffset(49, 49)');
    expect(sidebar).toContain('categoryRail.Position = UDim2.fromOffset(0, 50)');
    expect(sidebar).toContain('panelToolbar.Name = "PanelToolbar"');
    expect(sidebar).toContain('toolbarButton("OwnedTools", "✓"');
    expect(sidebar).toContain('toolbarButton("ClearTools", "×"');
    expect(sidebar).toContain('toolbarButton("OwnedVehicles", "✓"');
    expect(sidebar).toContain('toolbarButton("DespawnVehicle", "×"');
    expect(sidebar).toContain('clearTools:InvokeServer()');
  });

  it('renders the current tool and vehicle catalog as live 3D previews instead of glyph-only placeholders',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const catalog=read('roblox/src/shared/MirrorCatalog.luau');

    expect(sidebar).toContain('local function viewportFor(frame: GuiObject): (ViewportFrame, WorldModel)');
    expect(sidebar).toContain('viewport.Name = "ObjectPreview"');
    expect(sidebar).toContain('local function renderVehiclePreview');
    expect(sidebar).toContain('local function renderToolPreview');
    expect(sidebar).toContain('"vehicle",\n\t\t\t\tkind');
    expect(sidebar).toContain('"tool",\n\t\t\t\tkind');

    const vehicleCount=(catalog.match(/Id = "vehicle-/g)||[]).length;
    const toolCount=(catalog.match(/Id = "tool-/g)||[]).length;
    expect(vehicleCount).toBe(8);
    expect(toolCount).toBe(12);
  });

});
