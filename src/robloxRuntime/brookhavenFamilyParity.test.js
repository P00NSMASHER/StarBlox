import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven recording parity: ephemeral family groups',()=>{
  it('creates session-only family authority with invite, response, leave, and remove-member remotes',()=>{
    const service=read('roblox/src/server/FamilyService.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    for(const remote of ['GetState','Invite','RespondInvite','Leave','RemoveMember','StateChanged']){
      expect(service).toContain('Name = "'+remote+'"');
    }
    expect(service).toContain('local INVITE_TTL_SECONDS = 60');
    expect(service).toContain('local INVITE_DISTANCE_STUDS = 90');
    expect(service).toContain('code = "target_not_nearby"');
    expect(service).toContain('code = "owner_only"');
    expect(service).toContain('code = "target_in_family"');
    expect(bootstrap).toContain('FamilyService.new()');
    expect(bootstrap).toContain('family:PlayerRemoving(player)');
    expect(bootstrap).toContain('Family = family');
  });

  it('does not persist temporary family relationships into ProfileTemplate',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const service=read('roblox/src/server/FamilyService.luau');

    expect(template).not.toContain('FamilyMembers');
    expect(template).not.toContain('FamilyOwner');
    expect(service).not.toContain('_profiles');
    expect(service).not.toContain('_replicas');
  });

  it('turns the top Family control into actual nearby-player family actions',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(sidebar).toContain('familyGetState:InvokeServer()');
    expect(sidebar).toContain('familyInvite:InvokeServer(userId)');
    expect(sidebar).toContain('familyRespond:InvokeServer(ownerId, true)');
    expect(sidebar).toContain('familyRespond:InvokeServer(ownerId, false)');
    expect(sidebar).toContain('familyRemoveMember:InvokeServer(memberId)');
    expect(sidebar).toContain('familyLeave:InvokeServer()');
    expect(sidebar).toContain('familyStateChanged.OnClientEvent:Connect');
    expect(sidebar).toContain('"No players nearby"');
  });
});
