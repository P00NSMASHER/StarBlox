import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven reviewed runtime interaction activation',()=>{
  it('activates exactly one reviewed door while broad candidate activation stays disabled',()=>{
    const bindings=read('roblox/src/shared/WorldInteractionBindings.luau');

    expect(bindings).toContain('Revision = "reviewed-door-proof-v1"');
    expect(bindings).toContain('WorldRootName = "BrookhavenWorldRuntime"');
    expect(bindings).toContain('ImmutableWitnessName = "BrookhavenWorldBaseline"');
    expect(bindings).toContain('Id = "door-proof-1454"');
    expect(bindings).toContain('PartName = "BHW_1454"');
    expect(bindings).toContain('HelperPartName = "BHW_1461"');
    expect(bindings).toContain('ReviewBasis = "strict-standard-door-plus-nearby-tiny-helper"');
    expect(bindings).toContain('AutomaticCandidateActivationAllowed = false');
    expect((bindings.match(/Id = "door-proof-/g)||[]).length).toBe(1);
  });

  it('mutates only the runtime projection and verifies it against the immutable witness first',()=>{
    const service=read('roblox/src/server/WorldInteractionService.luau');

    expect(service).toContain('worldProjection:GetRuntimeWorld()');
    expect(service).toContain('worldProjection:GetWitness()');
    expect(service).toContain('assert(runtime ~= witness');
    expect(service).toContain('runtime:IsDescendantOf(Workspace)');
    expect(service).toContain('not witness:IsDescendantOf(Workspace)');
    expect(service).toContain('runtimeDoor.CFrame == witnessDoor.CFrame');
    expect(service).toContain('runtimeDoor.Size == witnessDoor.Size');
    expect(service).not.toContain('witnessDoor.CFrame =');
    expect(service).not.toContain('witnessDoor.CanCollide =');
  });

  it('uses a tap/click door interaction with a temporary swing and exact restore',()=>{
    const service=read('roblox/src/server/WorldInteractionService.luau');

    expect(service).toContain('local detector = Instance.new("ClickDetector")');
    expect(service).toContain('detector.MouseClick:Connect');
    expect(service).toContain('state.part.CanCollide = false');
    expect(service).toContain('CFrame.Angles(0, angle, 0)');
    expect(service).toContain('{CFrame = openCFrame}');
    expect(service).toContain('{CFrame = state.closedCFrame}');
    expect(service).toContain('state.part.CanCollide = state.closedCanCollide');
    expect(service).toContain('state.part:SetAttribute("StarBloxDoorState", "closed")');
  });

  it('boots after the runtime projection and restores before projection teardown',()=>{
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(bootstrap).toContain('local worldProjection = WorldProjectionService.new()');
    expect(bootstrap).toContain('local worldInteractions = WorldInteractionService.new(worldProjection)');
    expect(bootstrap.indexOf('WorldProjectionService.new()')).toBeLessThan(
      bootstrap.indexOf('WorldInteractionService.new(worldProjection)')
    );
    expect(bootstrap.indexOf('worldInteractions:Destroy()')).toBeLessThan(
      bootstrap.indexOf('worldProjection:Destroy()')
    );
    expect(bootstrap).toContain('WorldInteractions = worldInteractions');
  });
});
