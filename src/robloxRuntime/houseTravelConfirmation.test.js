import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('house travel confirmation',()=>{
  it('fails closed until the authoritative server observes arrival',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('return false, "character_unavailable"');
    expect(service).toContain('return false, "character_root_unavailable"');
    expect(service).toContain('if (root.Position - target.Position).Magnitude > 12 then');
    expect(service).toContain('return false, "travel_not_confirmed"');
    expect(service).toContain('return {ok = false, code = "plot_unavailable"}');
    expect(service).toContain('function HomeEconomyService:_homeArrivalCFrame(player: Player): CFrame?');
    expect(service).toContain('Workspace:Raycast(rayOrigin, Vector3.new(0, -90, 0), rayParams)');
    expect(service).toContain('Workspace:GetPartBoundsInBox(');
    expect(service).toContain('if not blocked then');
    expect(service).toContain('return CFrame.lookAt(rootPosition, lookAt)');
    expect(service).toContain('local target = self:_homeArrivalCFrame(player)');
    expect(service).toContain('code = "safe_home_arrival_unavailable"');
    expect(service).toContain('local ok, code = self:_teleport(player, target)');
    expect(service).toContain('return {ok = ok, code = code}');
  });

  it('keeps GO HOME recoverable when claim succeeds but travel does not',()=>{
    const client=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(client).toContain('local function travelHome(): boolean');
    expect(client).toContain('local success = ok and type(result) == "table" and result.ok == true');
    expect(client).toContain('task.defer(stabilizeThirdPersonCamera)');
    expect(client).toContain('current.CameraType = Enum.CameraType.Custom');
    expect(client).toContain('plotStatus.Text = "Travel failed — try again"');
    expect(client).toContain('if travelHome() then');
    expect((client.match(/if travelHome\(\) then/g)||[]).length).toBe(2);
    expect((client.match(/showTravelFailure\(\)/g)||[]).length).toBe(3);
  });
});
