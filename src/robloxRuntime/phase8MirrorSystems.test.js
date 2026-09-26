import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 8: Brookhaven mirror systems with learning economy',()=>{
  it('defines the Brookhaven-style sidebar and keeps learning coins as the purchase currency',()=>{
    const config=read('roblox/src/shared/BrookhavenMirrorConfig.luau');
    expect(config).toContain('Mode = "exact-frozen-brookhaven-world"');
    expect(config).toContain('BrookhavenBaselineLocked = true');
    expect(config).toContain('RuntimeSystemsMayMutateBaseline = false');
    expect(config).toContain('CurrencyName = "Coins"');
    expect(config).toContain('CorrectAnswerCoins = 10');
    expect(config).toContain('EconomyRevision = "long-horizon-v1"');
    expect(config).toContain('StarMansionCorrectAnswers = 3750');
    expect(config).toContain('PremiumSportsCarCorrectAnswers = 1200');
    expect(config).toContain('PaidCurrencyRequiredForGameplayUnlocks = false');
    for(const label of ['Avatar','Inventory','Emotes','Vehicles','Houses','Bio','Jobs','Map','Shop']){
      expect(config).toContain('Label = "'+label+'"');
    }
  });

  it('persists vehicle/tool ownership and keeps phone as a free starter tool',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const replica=read('roblox/src/server/ReplicaStateService.luau');
    expect(template).toContain('OwnedVehicles = {}');
    expect(template).toContain('OwnedTools = {["tool-phone"] = true}');
    expect(replica).toContain('OwnedVehicles = table.clone(profileData.Inventory.OwnedVehicles or {})');
    expect(replica).toContain('OwnedTools = table.clone(profileData.Inventory.OwnedTools or {})');
  });

  it('ships a real vehicle garage and backpack tool system',()=>{
    const catalog=read('roblox/src/shared/MirrorCatalog.luau');
    const service=read('roblox/src/server/MirrorLifestyleService.luau');
    expect(catalog.match(/Id = "vehicle-/g)?.length).toBe(8);
    expect(catalog.match(/Id = "tool-/g)?.length).toBe(12);
    expect(catalog).toContain('Name = "Sports Car", Price = 12000');
    expect(catalog).toContain('Name = "Motorcycle", Price = 4500');
    expect(catalog).toContain('Name = "Laptop", Price = 1000');
    expect(service).toContain('PurchaseVehicle');
    expect(service).toContain('SpawnVehicle');
    expect(service).toContain('DespawnVehicle');
    expect(service).toContain('PurchaseTool');
    expect(service).toContain('EquipTool');
    expect(service).toContain('data.Economy.Coins -= definition.Price');
    expect(service).toContain('VehicleSeat');
    expect(service).toContain('AssemblyLinearVelocity');
    expect(service).toContain('SetNetworkOwner(player)');
    expect(service).toContain('Tool');
    expect(service).toContain('SpotLight');
  });

  it('keeps mirror runtime geometry outside the locked Brookhaven model',()=>{
    const lifestyle=read('roblox/src/server/MirrorLifestyleService.luau');
    const homes=read('roblox/src/server/HomeEconomyService.luau');
    expect(lifestyle).toContain('VEHICLE_FOLDER_NAME = "StarBloxVehicles"');
    expect(lifestyle).toContain('BaselineMutationAllowed');
    expect(lifestyle).not.toContain('BrookhavenWorldBaseline');
    expect(homes).toContain('HOME_FOLDER_NAME = "StarBloxPlayerHomes"');
    expect(homes).toContain('BaselineMutationAllowed');
    expect(homes).not.toContain('BrookhavenWorldBaseline');
  });

  it('adds jobs, filtered bio, avatar reset, and roleplay overhead identity',()=>{
    const service=read('roblox/src/server/RoleplayService.luau');
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(template).toContain('Roleplay = {');
    expect(template).toContain('Job = "Citizen"');
    expect(service).toContain('TextService:FilterStringAsync');
    expect(service).toContain('GetNonChatStringForBroadcastAsync');
    expect(service).toContain('SetJob');
    expect(service).toContain('SaveBio');
    expect(service).toContain('ResetAvatar');
    expect(service).toContain('Police Officer');
    expect(service).toContain('Teacher');
    expect(service).toContain('Doctor');
    expect(service).toContain('StarBloxRoleplayTag');
    expect(bootstrap).toContain('RoleplayService.new(profiles, replicas)');
    expect(bootstrap).toContain('Roleplay = roleplay');
  });

  it('binds player homes onto verified Brookhaven plots rather than a synthetic sky neighborhood',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');
    const bindings=read('roblox/src/shared/WorldPlotBindings.luau');
    expect(bindings.match(/Id = "plot-/g)?.length).toBe(8);
    expect(service).toContain('WorldPlotBindings.WorldRootName');
    expect(service).toContain('self._usedPlots');
    expect(service).toContain('SourceWorldPart');
    expect(service).not.toContain('HOME_HEIGHT');
    expect(service).not.toContain('HOME_SPACING');
  });

  it('uses one compact Brookhaven-style phone sidebar instead of duplicate shop buttons',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const shop=read('roblox/src/client/Shop.client.luau');
    expect(sidebar).toContain('gui.Name = "BrookhavenMirrorSidebar"');
    expect(sidebar).toContain('rail.Size = UDim2.fromOffset(54, 326)');
    for(const call of [
      'railButton("☺", "Avatar", 1)',
      'railButton("▣", "Inventory", 2)',
      'railButton("✦", "Emotes", 3)',
      'railButton("▰", "Vehicles", 4)',
      'railButton("⌂", "Houses", 5)',
      'railButton("ID", "Bio", 6)',
      'railButton("JOB", "Jobs", 7)',
      'railButton("◇", "Map", 8)',
      'railButton("$", "Shop", 9)'
    ]){
      expect(sidebar).toContain(call);
    }
    expect(sidebar).toContain('panel.AnchorPoint = Vector2.new(1, 0.5)');
    expect(sidebar).toContain('panel.Size = UDim2.fromOffset(356, 326)');
    expect(sidebar).toContain('grid.CellSize = UDim2.fromOffset(78, 78)');
    expect(sidebar).toContain('close.BackgroundColor3 = UI.red');
    expect(sidebar).toContain('Humanoid');
    expect(sidebar).toContain('PlayEmote');
    expect(sidebar).toContain('Save Bio');
    expect(shop).toContain('shopButton.Visible = false');
    expect(shop).toContain('homeButton.Visible = false');
    expect(shop).toContain('OpenStore');
    expect(shop).toContain('ToggleHome');
  });
});
