import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity: mobile settings and sprint',()=>{
  it('persists current Brookhaven-facing settings server-side',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const service=read('roblox/src/server/PlayerSettingsService.luau');

    expect(template).toContain('Brookhaven = {');
    for(const key of ['SprintButton','HideUI','MuteOtherMusic','HideHouseSigns','HidePropsTool']){
      expect(template).toContain(key+' = ');
      expect(service).toContain(key+' = ');
    }
    expect(template).toContain('BabyCarSeat = "Off"');
    expect(service).toContain('BabyCarSeat');
    expect(service).toContain('getState.Name = "GetState"');
    expect(service).toContain('setSetting.Name = "SetSetting"');
    expect(service).toContain('self._replicas:Sync(player, data)');
  });

  it('uses one existing server-authoritative 16-to-24 sprint control',()=>{
    const movement=read('roblox/src/server/MovementService.luau');
    const run=read('roblox/src/client/RunControl.client.luau');
    const settings=read('roblox/src/client/Settings.client.luau');

    expect(movement).toContain('local NORMAL_WALK_SPEED = 16');
    expect(movement).toContain('local RUN_WALK_SPEED = 24');
    expect(movement).toContain('toggleRun.Name = "ToggleRun"');
    expect(movement).toContain('humanoid.WalkSpeed = if running then RUN_WALK_SPEED else NORMAL_WALK_SPEED');
    expect(run).toContain('button.Name = "Run"');
    expect(run).toContain('toggleRun:InvokeServer()');
    expect(run).toContain('UserInputService.TouchEnabled');
    expect(run).toContain('StarBloxSetting_SprintButton');
    expect(settings).toContain('runGui:FindFirstChild("Root")');
    expect(settings).toContain('runButton.Visible = UserInputService.TouchEnabled and settings.SprintButton == true');
    expect(settings).not.toContain('toggleRun:InvokeServer()');
    expect((settings.match(/Name = "SprintButton"/g)||[]).length).toBe(0);
  });

  it('keeps one bottom-left gear and hides gameplay UI while preserving settings access',()=>{
    const settings=read('roblox/src/client/Settings.client.luau');
    const shell=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(settings).toContain('gui.Name = "BrookhavenSettingsUI"');
    expect(settings).toContain('gear.Name = "SettingsGear"');
    expect(settings).toContain('gear.Position = UDim2.new(0, 92, 1, -12)');
    expect(settings).toContain('child ~= gui');
    expect(settings).toContain('child.Enabled = false');
    expect(settings).toContain('hiddenGuiStates[child] = child.Enabled');
    expect(shell).toContain('settingsButton.Visible = false');
    expect(shell).toContain('settingsButton.Active = false');
    expect(shell).not.toContain('settingsButton.Activated:Connect(showSettings)');
  });

  it('exposes Sprint Button and Hide UI as functioning menu toggles',()=>{
    const settings=read('roblox/src/client/Settings.client.luau');

    expect(settings).toContain('"Sprint Button"');
    expect(settings).toContain('saveSetting("SprintButton"');
    expect(settings).toContain('"Hide UI"');
    expect(settings).toContain('saveSetting("HideUI"');
    expect(settings).toContain('settings.HideUI == true');
    expect(settings).toContain('settings.SprintButton == true');
  });

  it('boots settings after profile/replica services and publishes player attributes',()=>{
    const bootstrap=read('roblox/src/server/Bootstrap.luau');
    const service=read('roblox/src/server/PlayerSettingsService.luau');

    expect(bootstrap).toContain('PlayerSettingsService.new(profiles, replicas)');
    expect(bootstrap).toContain('playerSettings:PlayerReady(player, profile.Data)');
    expect(bootstrap).toContain('playerSettings:Destroy()');
    expect(bootstrap).toContain('PlayerSettings = playerSettings');
    expect(service).toContain('player:SetAttribute("StarBloxSetting_" .. key, value)');
  });
});
