import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven recording parity: persistent world chrome',()=>{
  it('collapses tutorial labels but leaves the Quick Chat lightning tile',()=>{
    const shell=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(shell).toContain('quickChatBolt = makeTopButton("QuickChatBolt", "⚡"');
    expect(shell).toContain('quickChatArrow.Name = "QuickChatArrow"');
    expect(shell).toContain('quickChatButton');
    expect(shell).toContain('quickChatArrow.Visible = false');
    expect(shell).toContain('quickChatButton.Visible = false');
    expect(shell).not.toContain('quickChatBolt.Visible = false');
    expect(shell).toContain('actionHintsDismissed = true');
  });

  it('keeps the small free-play shop shortcut visible at the left edge',()=>{
    const shell=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(shell).toContain('shopShortcut.Name = "ShopShortcut"');
    expect(shell).toContain('shopShortcut.Position = UDim2.new(0, 80, 0.5, -18)');
    expect(shell).toContain('shopShortcut.Text = "🛒"');
    expect(shell).toContain('openStore:Fire()');
  });

  it('provides a separate server-backed run toggle in the recorded lower-right zone',()=>{
    const service=read('roblox/src/server/MovementService.luau');
    const client=read('roblox/src/client/RunControl.client.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(service).toContain('local NORMAL_WALK_SPEED = 16');
    expect(service).toContain('local RUN_WALK_SPEED = 24');
    expect(service).toContain('toggleRun.Name = "ToggleRun"');
    expect(service).toContain('player:SetAttribute("StarBloxRunning", running)');
    expect(service).toContain('humanoid.WalkSpeed = if running then RUN_WALK_SPEED else NORMAL_WALK_SPEED');

    expect(client).toContain('gui.Name = "BrookhavenRunControlUI"');
    expect(client).toContain('button.Name = "Run"');
    expect(client).toContain('button.Position = UDim2.new(1, -282, 1, -62)');
    expect(client).toContain('button.Size = UDim2.fromOffset(56, 56)');
    expect(client).toContain('toggleRun:InvokeServer()');

    expect(bootstrap).toContain('MovementService.new()');
    expect(bootstrap).toContain('movement:PlayerReady(player)');
    expect(bootstrap).toContain('movement:PlayerRemoving(player)');
    expect(bootstrap).toContain('Movement = movement');
  });
});
