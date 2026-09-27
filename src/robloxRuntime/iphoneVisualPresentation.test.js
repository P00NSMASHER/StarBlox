import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('iPhone spawn presentation polish',()=>{
  it('mutates only the runtime projection and preserves the immutable witness boundary',()=>{
    const service=read('roblox/src/server/WorldPresentationService.luau');
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    expect(service).toContain('local runtimeWorld = worldProjection:GetRuntimeWorld()');
    expect(service).not.toContain('GetWitness()');
    expect(service).not.toContain('BrookhavenWorldBaseline');
    expect(service).toContain('StarBloxPresentationPolishRevision');
    expect(bootstrap).toContain('WorldPresentationService.new(worldProjection)');
    expect(bootstrap).toContain('worldPresentation:Destroy()');
    expect(bootstrap).toContain('WorldPresentation = worldPresentation');
  });

  it('rettones saturated spawn plaza surfaces without applying a world-wide recolor',()=>{
    const service=read('roblox/src/server/WorldPresentationService.luau');

    expect(service).toContain('local SPAWN_RADIUS = 92');
    expect(service).toContain('local NEON_RADIUS = 58');
    expect(service).toContain('isFlatSurface(part)');
    expect(service).toContain('Color3.fromRGB(112, 114, 118)');
    expect(service).toContain('Color3.fromRGB(82, 121, 72)');
    expect(service).toContain('part.Material = Enum.Material.Concrete');
    expect(service).toContain('part.Material = Enum.Material.Grass');
  });

  it('caps local glow and lighting rather than deleting lighting wholesale',()=>{
    const service=read('roblox/src/server/WorldPresentationService.luau');

    expect(service).toContain('child:IsA("BloomEffect")');
    expect(service).toContain('math.min(child.Intensity, 0.15)');
    expect(service).toContain('math.max(child.Threshold, 1.35)');
    expect(service).toContain('descendant.Brightness = math.min(descendant.Brightness, 1.2)');
    expect(service).toContain('descendant.Range = math.min(descendant.Range, 14)');
    expect(service).not.toContain(':Destroy()');
  });
});
