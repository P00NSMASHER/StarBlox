import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven recording parity: Home Cams',()=>{
  it('turns the top Home Cams control into a real four-view security camera mode',()=>{
    const cams=read('roblox/src/client/HomeCams.client.luau');
    const shell=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(cams).toContain('gui.Name = "BrookhavenHomeCamsUI"');
    expect(cams).toContain('openHomeCams.Name = "OpenHomeCams"');
    expect(cams).toContain('local function cameraPointsFor(model: Model): {CFrame}');
    expect(cams).toContain('CFrame.lookAt(frontPosition, center)');
    expect(cams).toContain('CFrame.lookAt(sidePosition, center)');
    expect(cams).toContain('CFrame.lookAt(rearPosition, center)');
    expect(cams).toContain('CFrame.lookAt(overviewPosition, center)');
    expect(cams).toContain('camera.CameraType = Enum.CameraType.Scriptable');
    expect(cams).toContain('Home Cam %d/%d');
    expect(shell).toContain('openCams:Fire()');
  });

  it('only watches the current player home and restores the previous camera on exit',()=>{
    const cams=read('roblox/src/client/HomeCams.client.luau');

    expect(cams).toContain('player:GetAttribute("StarBloxHomePlotId")');
    expect(cams).toContain('Workspace:FindFirstChild("StarBloxPlayerHomes")');
    expect(cams).toContain('child:GetAttribute("PlotId") == plotId');
    expect(cams).toContain('savedCameraType = camera.CameraType');
    expect(cams).toContain('savedCFrame = camera.CFrame');
    expect(cams).toContain('camera.CameraType = savedCameraType');
    expect(cams).toContain('camera.CFrame = savedCFrame');
  });

  it('hands camera ownership cleanly between Avatar Editor and Home Cams',()=>{
    const cams=read('roblox/src/client/HomeCams.client.luau');
    const avatar=read('roblox/src/client/AvatarEditor.client.luau');

    expect(avatar).toContain('closeAvatarEditor.Name = "CloseAvatarEditor"');
    expect(avatar).toContain('closeAvatarEditor.Event:Connect(closeEditor)');
    expect(cams).toContain('avatarEditor:FindFirstChild("CloseAvatarEditor")');
    expect(cams).toContain('closeEditor:Fire()');
  });
});
