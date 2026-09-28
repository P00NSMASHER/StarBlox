import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('v39 unified mobile presentation shell',()=>{
  it('defines one shared design system and one modal owner',()=>{
    const shell=read('roblox/src/client/MobileShell.luau');
    expect(shell).toContain('MobileShell.Theme = table.freeze({');
    expect(shell).toContain('MobileShell.Metrics = table.freeze({');
    expect(shell).toContain('local activeOverlay: string? = nil');
    expect(shell).toContain('function MobileShell.RegisterPersistent(');
    expect(shell).toContain('function MobileShell.RegisterOverlay(');
    expect(shell).toContain('function MobileShell.RegisterSurfaceOverlay(');
    expect(shell).toContain('function MobileShell.RegisterPersistentSurface(');
    expect(shell).toContain('function MobileShell.Open(id: string): boolean');
    expect(shell).toContain('function MobileShell.Close(id: string)');
    expect(shell).toContain('function MobileShell.ApplyModalCard(');
    expect(shell).toContain('function MobileShell.ApplyScrim(');
  });

  it('moves every major player-facing surface onto shared shell ownership',()=>{
    const world=read('roblox/src/client/MirrorSidebar.client.luau');
    const avatar=read('roblox/src/client/AvatarEditor.client.luau');
    const family=read('roblox/src/client/FamilyPanel.client.luau');
    const cams=read('roblox/src/client/HomeCams.client.luau');
    const shop=read('roblox/src/client/Shop.client.luau');
    const build=read('roblox/src/client/HomeBuild.client.luau');
    const settings=read('roblox/src/client/Settings.client.luau');
    const run=read('roblox/src/client/RunControl.client.luau');
    const school=read('roblox/src/client/SchoolSystem.client.luau');

    expect(world).toContain('MobileShell.RegisterPersistent("world", gui)');
    expect(run).toContain('MobileShell.RegisterPersistent("run", gui)');
    expect(school).toContain('MobileShell.RegisterPersistent("school", gui)');

    for(const [source,id] of [
      [avatar,'avatar'],
      [family,'family'],
      [cams,'cams'],
      [shop,'shop'],
      [build,'build'],
    ]){
      expect(source).toContain(`MobileShell.RegisterOverlay("${id}", gui)`);
    }

    expect(settings).toContain('MobileShell.RegisterPersistentSurface("settings-gear"');
    expect(settings).toContain('MobileShell.RegisterSurfaceOverlay("settings"');
  });

  it('uses shared visual tokens rather than independent palettes on migrated surfaces',()=>{
    for(const path of [
      'roblox/src/client/MirrorSidebar.client.luau',
      'roblox/src/client/AvatarEditor.client.luau',
      'roblox/src/client/FamilyPanel.client.luau',
      'roblox/src/client/HomeCams.client.luau',
      'roblox/src/client/Shop.client.luau',
      'roblox/src/client/HomeBuild.client.luau',
      'roblox/src/client/Settings.client.luau',
      'roblox/src/client/RunControl.client.luau',
      'roblox/src/client/SchoolSystem.client.luau',
    ]){
      const source=read(path);
      expect(source).toContain('MobileShell');
    }
    expect(read('roblox/src/client/MirrorSidebar.client.luau')).toContain('local UI = MobileShell.Theme');
    expect(read('roblox/src/client/AvatarEditor.client.luau')).toContain('local COLORS = MobileShell.Theme');
    expect(read('roblox/src/client/FamilyPanel.client.luau')).toContain('local UI = MobileShell.Theme');
    expect(read('roblox/src/client/Shop.client.luau')).toContain('local UI = MobileShell.Theme');
    expect(read('roblox/src/client/Settings.client.luau')).toContain('local UI = MobileShell.Theme');
    expect(read('roblox/src/client/SchoolSystem.client.luau')).toContain('local COLORS = MobileShell.Theme');
  });

  it('prevents simultaneous major modal overlays by synchronizing all registered owners',()=>{
    const shell=read('roblox/src/client/MobileShell.luau');
    expect(shell).toContain('gui.Enabled = activeOverlay == id');
    expect(shell).toContain('setVisible(activeOverlay == id)');
    expect(shell).toContain('local showPersistent = activeOverlay == nil and not suppressed');
    expect(shell).toContain('setRoleplayTagVisible(activeOverlay == nil)');
  });

  it('keeps the home store and furniture editor inside the same modal lifecycle',()=>{
    const shop=read('roblox/src/client/Shop.client.luau');
    const build=read('roblox/src/client/HomeBuild.client.luau');
    expect(shop).toContain('MobileShell.Open("shop")');
    expect(shop).toContain('MobileShell.Close("shop")');
    expect(shop).toContain('MobileShell.ApplyModalCard(panel,16)');
    expect(build).toContain('MobileShell.Open("build")');
    expect(build).toContain('MobileShell.Close("build")');
    expect(build).toContain('MobileShell.ApplyModalCard(panel, 14)');
  });
});
