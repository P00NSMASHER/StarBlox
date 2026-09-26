import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven recording parity: ephemeral family groups',()=>{
  it('creates session-only family authority with invite, response, leave, and remove-member remotes',()=>{
    const service=read('roblox/src/server/FamilyService.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    for(const remote of ['GetState','Create','Invite','RespondInvite','Leave','RemoveMember','StateChanged']){
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

  it('matches the recorded My Family panel and keeps actions on the family service',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');
    const panel=read('roblox/src/client/FamilyPanel.client.luau');

    expect(sidebar).toContain('familyGui:FindFirstChild("OpenFamilyPanel")');
    expect(sidebar).toContain('openPanel:Fire()');
    expect(panel).toContain('gui.Name = "BrookhavenFamilyUI"');
    expect(panel).toContain('panel.Name = "MyFamilyPanel"');
    expect(panel).toContain('title.Text = "My Family"');
    expect(panel).toContain('close.BackgroundColor3 = UI.red');
    expect(panel).toContain('"✚  Create a Family"');
    expect(panel).toContain('"Hide Invites"');
    expect(panel).toContain('createFamily:InvokeServer()');
    expect(panel).toContain('invite:InvokeServer(userId)');
    expect(panel).toContain('respondInvite:InvokeServer(ownerId, true)');
    expect(panel).toContain('respondInvite:InvokeServer(ownerId, false)');
    expect(panel).toContain('removeMember:InvokeServer(memberId)');
    expect(panel).toContain('leave:InvokeServer()');
    expect(panel).toContain('stateChanged.OnClientEvent:Connect');
  });
});
