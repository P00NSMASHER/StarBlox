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

    expect(service).toContain('lamp.Name = "Headlight"');
    expect(service).toContain('local beam = Instance.new("SpotLight")');
    expect(service).toContain('beam.Enabled = false');
    expect(service).toContain('model:SetAttribute("HeadlightsOn", enabled)');
    expect(service).toContain('model:GetAttribute("Locked") == true');
    expect(service).toContain('occupant.Sit = false');
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
});
