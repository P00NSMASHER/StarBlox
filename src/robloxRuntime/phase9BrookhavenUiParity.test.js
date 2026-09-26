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
    expect(sidebar).toContain('grid.CellSize = UDim2.fromOffset(62, 64)');
    expect(sidebar).toContain('categoryRail.Name = "CategoryRail"');
    expect(sidebar).toContain('{Id = "tech", Symbol = "▯"}');
    expect(sidebar).toContain('{Id = "cars", Symbol = "▰"}');
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
    expect(config).toContain('Revision = "recording-parity-shell-v1"');
    expect(config).toContain('{Id = "quick-chat", Label = "Quick Chat", Order = 1}');
    expect(config).toContain('{Id = "houses", Label = "House", Order = 5}');
  });
});
