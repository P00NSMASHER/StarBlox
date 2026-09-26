import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven parity: current tool behavior',()=>{
  it('keeps server-visible tool effects authoritative',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');

    expect(service).toContain('toolAction.Name = "ToolAction"');
    expect(service).toContain('tool:SetAttribute("ToolKind", definition.Kind)');
    expect(service).toContain('tool:SetAttribute("ToolActive", false)');
    expect(service).toContain('function MirrorLifestyleService:_toolAction');
    expect(service).toContain('code = "tool_not_equipped"');

    expect(service).toContain('definition.Kind == "flashlight"');
    expect(service).toContain('light.Name = "Beam"');
    expect(service).toContain('light.Enabled = false');
    expect(service).toContain('beam.Enabled = not beam.Enabled');

    expect(service).toContain('definition.Kind == "umbrella"');
    expect(service).toContain('canopy.Transparency = if active then 0 else 1');

    expect(service).toContain('definition.Kind == "extinguisher"');
    expect(service).toContain('spray.Name = "Spray"');
    expect(service).toContain('spray.Enabled = true');
    expect(service).toContain('task.delay(1.2');
  });

  it('keeps camera and binocular zoom local to the owning client and restores it on unequip',()=>{
    const client=read('roblox/src/client/ToolBehavior.client.luau');

    expect(client).toContain('local toolAction = mirrorRemotes:WaitForChild("ToolAction")');
    expect(client).toContain('kind == "binoculars"');
    expect(client).toContain('toggleZoom(tool, 28)');
    expect(client).toContain('kind == "camera"');
    expect(client).toContain('toggleZoom(tool, 42)');
    expect(client).toContain('tool.Unequipped:Connect');
    expect(client).toContain('camera.FieldOfView = savedFieldOfView');
    expect(client).toContain('toolAction:InvokeServer(itemId)');
  });

  it('does not invent actions for the passive tools that are not yet behavior-certified',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');
    const client=read('roblox/src/client/ToolBehavior.client.luau');

    expect(service).toContain('return {ok = false, code = "client_or_passive_tool"}');
    expect(client).not.toContain('kind == "phone" then');
    expect(client).not.toContain('kind == "laptop" then');
    expect(client).not.toContain('kind == "stroller" then');
  });
});
