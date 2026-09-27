import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity: owned vehicle controls',()=>{
  it('keeps vehicle actions server-authoritative and owner-bound',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');

    expect(service).toContain('vehicleAction.Name = "VehicleAction"');
    expect(service).toContain('model:SetAttribute("OwnerUserId", player.UserId)');
    expect(service).toContain('model:GetAttribute("OwnerUserId") ~= player.UserId');
    expect(service).toContain('action == "headlights"');
    expect(service).toContain('action == "lock"');
    expect(service).toContain('action == "flip"');
    expect(service).toContain('action == "despawn"');
    expect(service).toContain('code = "not_vehicle_owner"');
  });

  it('adds headlights and enforces locked-driver ownership on the server loop',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');

    expect(service).toContain('"Headlight",');
    expect(service).toContain('local beam = Instance.new("SpotLight")');
    expect(service).toContain('beam.Enabled = false');
    expect(service).toContain('model:SetAttribute("HeadlightsOn", enabled)');
    expect(service).toContain('model:GetAttribute("Locked") == true');
    expect(service).toContain('occupant.Sit = false');
  });

  it('lets another player drive an unlocked vehicle but ejects them when it is locked',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');
    const foreignDriverGate=service.match(
      /if seatedPlayer ~= player then\s+if model:GetAttribute\("Locked"\) == true then\s+occupant\.Sit = false\s+continue\s+end\s+end/
    );

    expect(foreignDriverGate).not.toBeNull();
    expect(service).toContain('local throttle = math.clamp(seat.ThrottleFloat, -1, 1)');
    expect(service).toContain('local steer = math.clamp(seat.SteerFloat, -1, 1)');
  });

  it('ejects competing players from every seat while the vehicle is locked',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');
    const guardStart=service.indexOf('local function ejectLockedVehicleGuests');
    const guardEnd=service.indexOf('local function toolHandle',guardStart);
    const guard=service.slice(guardStart,guardEnd);

    expect(guard).toContain('model:GetAttribute("Locked") ~= true');
    expect(guard).toContain('for _, descendant in model:GetDescendants() do');
    expect(service).toContain('instance:IsA("Seat") or instance:IsA("VehicleSeat")');
    expect(guard).toContain('if seatedPlayer ~= owner then');
    expect(guard).toContain('occupant.Sit = false');
    expect((service.match(/ejectLockedVehicleGuests\(player, model\)/g)||[]).length).toBe(2);
  });

  it('shows controls only while the owner is driving their runtime vehicle',()=>{
    const client=read('roblox/src/client/VehicleControls.client.luau');

    expect(client).toContain('gui.Name = "BrookhavenVehicleControlsUI"');
    expect(client).toContain('bar.Visible = false');
    expect(client).toContain('humanoid.Seated:Connect');
    expect(client).toContain('seatPart:IsA("VehicleSeat")');
    expect(client).toContain('tonumber(cursor:GetAttribute("OwnerUserId")) == player.UserId');
    expect(client).toContain('vehicleAction:InvokeServer(action)');
    expect(client).toContain('invoke("headlights")');
    expect(client).toContain('invoke("lock")');
    expect(client).toContain('invoke("flip")');
    expect(client).toContain('invoke("despawn")');
  });

  it('does not report a completed spawn or despawn after a rejected server request',()=>{
    const controls=read('roblox/src/client/VehicleControls.client.luau');
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(controls).toContain('local function invoke(action: string): boolean');
    expect(controls).toContain('local succeeded = ok and type(result) == "table" and result.ok == true');
    expect(controls).toContain('if invoke("despawn") then');
    expect(controls).toContain('return succeeded');

    expect(sidebar).toContain('return despawnVehicle:InvokeServer()');
    expect(sidebar).toContain('showStatus("Couldn\'t despawn vehicle")');
    expect(sidebar).toContain('return spawnVehicle:InvokeServer(id)');
    expect(sidebar).toContain('showStatus("Couldn\'t spawn vehicle")');
  });

  it('keeps the tool catalog open after rejected equip or clear requests',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const clearStart=sidebar.indexOf('toolbarButton("ClearTools"');
    const clearEnd=sidebar.indexOf('\n\tsetCategories({',clearStart);
    const clearBlock=sidebar.slice(clearStart,clearEnd);
    const equipStart=sidebar.indexOf('\n\t\t\t\tfunction()\n\t\t\t\t\tif owned then',clearEnd);
    const equipEnd=sidebar.indexOf('\n\t\t\t\telse\n\t\t\t\t\tpurchase(purchaseTool',equipStart);
    const equipBlock=sidebar.slice(equipStart,equipEnd);

    expect(clearBlock).toContain('return clearTools:InvokeServer()');
    expect(clearBlock).toContain('if ok and type(result) == "table" and result.ok == true then');
    expect(clearBlock).toContain('showStatus("Couldn\'t clear tools")');
    expect(clearBlock.indexOf('closePanel()')).toBeGreaterThan(clearBlock.indexOf('result.ok == true'));

    expect(equipBlock).toContain('return equipTool:InvokeServer(id)');
    expect(equipBlock).toContain('if ok and type(result) == "table" and result.ok == true then');
    expect(equipBlock).toContain('showStatus("Couldn\'t equip tool")');
    expect(equipBlock.indexOf('closePanel()')).toBeGreaterThan(equipBlock.indexOf('result.ok == true'));
  });
});
