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

  it('uses one compact Brookhaven-style phone sidebar instead of duplicate shop buttons',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const shop=read('roblox/src/client/Shop.client.luau');
    expect(sidebar).toContain('gui.Name = "BrookhavenMirrorSidebar"');
    expect(sidebar).toContain('rail.Size = UDim2.fromOffset(54, 232)');
    expect(sidebar).toContain('local homeBtn = button("Home")');
    expect(sidebar).toContain('local vehicleBtn = button("Cars")');
    expect(sidebar).toContain('local inventoryBtn = button("Items")');
    expect(sidebar).toContain('local shopBtn = button("Shop")');
    expect(sidebar).toContain('actionButton.Size = UDim2.fromOffset(104, 44)');
    expect(sidebar).toContain('Answer questions to earn coins.');
    expect(shop).toContain('shopButton.Visible = false');
    expect(shop).toContain('homeButton.Visible = false');
    expect(shop).toContain('OpenStore');
    expect(shop).toContain('ToggleHome');
  });
});
