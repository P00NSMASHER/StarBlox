import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity: house access and swap rules',()=>{
  it('uses a 10-minute session cooldown for house swaps and exposes it to both house UIs',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');
    const shop=read('roblox/src/client/Shop.client.luau');
    const shell=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(service).toContain('local HOUSE_SWAP_COOLDOWN_SECONDS = 600');
    expect(service).toContain('function HomeEconomyService:_houseSwapRemaining');
    expect(service).toContain('code = "house_swap_cooldown"');
    expect(service).toContain('houseSwapCooldownRemaining = math.ceil(self:_houseSwapRemaining(player))');
    expect(shop).toContain('"House Cooldown"');
    expect(shop).toContain('state.houseSwapCooldownRemaining');
    expect(shell).toContain('plotState.houseSwapCooldownRemaining');
    expect(shell).toContain('plotGo.Text = "WAIT"');
  });

  it('renders a real front door and keeps door state server-authoritative',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('"FrontDoor"');
    expect(service).toContain('local detector = Instance.new("ClickDetector")');
    expect(service).toContain('detector.MouseClick:Connect');
    expect(service).toContain('door.CanCollide = false');
    expect(service).toContain('CFrame.Angles(0, math.rad(88 * direction), 0)');
    expect(service).toContain('door.CanCollide = state.closedCanCollide');
    expect(service).toContain('door:SetAttribute("DoorState", "closed")');
  });

  it('supports Lock Doors and lets family act as automatic roommates',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');
    const family=read('roblox/src/server/FamilyService.luau');
    const shop=read('roblox/src/client/Shop.client.luau');

    expect(service).toContain('setDoorsLocked.Name = "SetDoorsLocked"');
    expect(service).toContain('function HomeEconomyService:_setDoorsLocked');
    expect(service).toContain('self._family:CanAccessHome(owner, visitor)');
    expect(family).toContain('function FamilyService:CanAccessHome');
    expect(family).toContain('return owner == visitor or self:AreFamily(owner, visitor)');
    expect(shop).toContain('setDoorsLocked:InvokeServer(nextLocked)');
    expect(shop).toContain('"Lock Doors"');
    expect(shop).toContain('"locked • family access"');
  });

  it('resets house access settings when the player moves or swaps house style',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('self._doorLocked[player] = false');
    expect(service).toContain('self:_markHouseSwap(player)');
    expect(service).toContain('model:SetAttribute("DoorsLocked", self._doorLocked[player] == true)');
    expect(service).toContain('door:SetAttribute("DoorsLocked", locked)');
  });
  it('supports one roommate plus House Ban while family stays non-bannable',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');
    const shop=read('roblox/src/client/Shop.client.luau');

    for(const remote of ['GetHouseAccessState','SetRoommate','SetHouseBan']){
      expect(service).toContain('Name = "'+remote+'"');
    }
    expect(service).toContain('function HomeEconomyService:_setRoommate');
    expect(service).toContain('function HomeEconomyService:_setHouseBan');
    expect(service).toContain('code = "family_cannot_be_banned"');
    expect(service).toContain('code = "family_already_has_access"');
    expect(service).toContain('self._roommateByOwner[owner] == visitor');
    expect(service).toContain('banned[visitor] == true');
    expect(shop).toContain('"House Access"');
    expect(shop).toContain('setRoommate:InvokeServer(userId)');
    expect(shop).toContain('setHouseBan:InvokeServer(userId,banned)');
    expect(shop).toContain('"make roommate"');
    expect(shop).toContain('"ban from house"');
  });

  it('clears lock roommate and bans together when house access resets',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('function HomeEconomyService:_resetAccessSettings');
    expect(service).toContain('self._doorLocked[player] = false');
    expect(service).toContain('self._roommateByOwner[player] = nil');
    expect(service).toContain('self._bannedByOwner[player] = {}');
    expect((service.match(/self:_resetAccessSettings\(player\)/g)||[]).length).toBeGreaterThanOrEqual(4);
  });

});
