import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven recording parity: live-world avatar editor',()=>{
  it('persists four server-authoritative My Outfits slots',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const service=read('roblox/src/server/RoleplayService.luau');

    expect(template).toContain('AvatarOutfits = {}');
    expect(service).toContain('local OUTFIT_SLOT_COUNT = 4');
    for(const remote of ['SaveOutfit','LoadOutfit','DeleteOutfit','ApplyAvatarPreset']){
      expect(service).toContain('Name = "'+remote+'"');
    }
    expect(service).toContain('humanoid:GetAppliedDescription()');
    expect(service).toContain('humanoid:ApplyDescriptionReset(description)');
    expect(service).toContain('rp.AvatarOutfits[tostring(slot)] = serialized');
    expect(service).toContain('rp.AvatarOutfits[tostring(slot)] = nil');
  });

  it('keeps the actual player character visible between My Outfits and the preset grid',()=>{
    const editor=read('roblox/src/client/AvatarEditor.client.luau');

    expect(editor).toContain('gui.Name = "BrookhavenAvatarEditorUI"');
    expect(editor).toContain('outfitsPanel.Name = "MyOutfits"');
    expect(editor).toContain('outfitsTitle.Text = "My Outfits"');
    expect(editor).toContain('presetsPanel.Name = "PresetPanel"');
    expect(editor).toContain('presetGrid.FillDirectionMaxCells = 4');
    expect(editor).toContain('presetGrid.CellSize = UDim2.fromOffset(84, 84)');
    expect(editor).toContain('camera.CameraType = Enum.CameraType.Scriptable');
    expect(editor).toContain('camera.CFrame = CFrame.lookAt(cameraPosition, target)');
    expect(editor).toContain('local viewport = Instance.new("ViewportFrame")');
    expect(editor).toContain('viewport.Name = "AvatarPreview"');
    expect(editor).toContain('local world = Instance.new("WorldModel")');
    expect(editor).toContain('clone:PivotTo(CFrame.new(0, 0, 0))');
  });

  it('matches the recording interaction structure: outfit slots, category tabs, red close, and live apply',()=>{
    const editor=read('roblox/src/client/AvatarEditor.client.luau');
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    for(let slot=1;slot<=4;slot++){
      expect(editor).toContain('"Outfit" .. tostring(slot)');
    }
    for(const tab of ['all','classic','body','style','saved']){
      expect(editor).toContain('makeTab("'+tab+'"');
    }
    expect(editor).toContain('closeButton.BackgroundColor3 = COLORS.red');
    expect(editor).toContain('applyAvatarPreset:InvokeServer(id)');
    expect(editor).toContain('saveOutfit:InvokeServer(slot)');
    expect(editor).toContain('loadOutfit:InvokeServer(slot)');
    expect(sidebar).toContain('openEditor:Fire()');
  });

  it('does not let the avatar editor client directly apply arbitrary HumanoidDescriptions',()=>{
    const editor=read('roblox/src/client/AvatarEditor.client.luau');

    expect(editor).not.toContain('ApplyDescription');
    expect(editor).not.toContain('HumanoidDescription');
    expect(editor).toContain('roleplayRemotes:WaitForChild("ApplyAvatarPreset")');
  });
  it('matches the recorded equipped-item strip and removes only whitelisted worn assets',()=>{
    const editor=read('roblox/src/client/AvatarEditor.client.luau');
    const service=read('roblox/src/server/RoleplayService.luau');

    expect(editor).toContain('equippedTray.Name = "EquippedItems"');
    expect(editor).toContain('equippedTray.Size = UDim2.fromOffset(378, 58)');
    expect(editor).toContain('for slot = 1, 7 do');
    expect(editor).toContain('remove.BackgroundColor3 = COLORS.red');
    expect(editor).toContain('removeAvatarItem:InvokeServer(key, assetId)');

    expect(service).toContain('removeAvatarItem.Name = "RemoveAvatarItem"');
    expect(service).toContain('REMOVABLE_AVATAR_NUMBER_FIELDS');
    expect(service).toContain('REMOVABLE_AVATAR_STRING_FIELDS');
    expect(service).toContain('function RoleplayService:_removeAvatarItem');
    expect(service).toContain('code = "avatar_item_mismatch"');
    expect(service).toContain('outcome.avatarItems = avatarItemSummary(player)');
    expect(service).toContain('Preview = preview');

  });

});
