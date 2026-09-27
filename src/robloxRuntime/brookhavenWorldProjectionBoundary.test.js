import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven immutable witness and runtime projection boundary',()=>{
  it('clones the exact ServerStorage witness into a separately mutable Workspace runtime',()=>{
    const service=read('roblox/src/server/WorldProjectionService.luau');

    expect(service).toContain('local ServerStorage = game:GetService("ServerStorage")');
    expect(service).toContain('local WITNESS_NAME = "BrookhavenWorldBaseline"');
    expect(service).toContain('local RUNTIME_NAME = "BrookhavenWorldRuntime"');
    expect(service).toContain('local witness = ServerStorage:FindFirstChild(WITNESS_NAME)');
    expect(service).toContain('Workspace:FindFirstChild(WITNESS_NAME)');
    expect(service).toContain('local runtime = witness:Clone()');
    expect(service).toContain('runtime.Name = RUNTIME_NAME');
    expect(service).toContain('runtime:SetAttribute("StarBloxRuntimeProjection", true)');
    expect(service).toContain('runtime:SetAttribute("ImmutableWitnessName", WITNESS_NAME)');
    expect(service).toContain('runtime:SetAttribute("RuntimeMutationAllowed", true)');
    expect(service).toContain('runtime.Parent = Workspace');
  });

  it('rejects gameplay classes in the immutable witness before cloning',()=>{
    const service=read('roblox/src/server/WorldProjectionService.luau');

    for(const className of [
      'Script','LocalScript','ModuleScript','RemoteEvent','RemoteFunction','UnreliableRemoteEvent'
    ]){
      expect(service).toContain('descendant:IsA("'+className+'")');
    }
    expect(service).toContain('Brookhaven immutable witness contains forbidden gameplay class');
  });

  it('boots projection before world interactions and all world-bound services',()=>{
    const bootstrap=read('roblox/src/server/Bootstrap.luau');

    const projection=bootstrap.indexOf('WorldProjectionService.new()');
    const interactions=bootstrap.indexOf('WorldInteractionService.new(worldProjection)');
    const core=bootstrap.indexOf('CoreGameLoopService.new');
    const homes=bootstrap.indexOf('HomeEconomyService.new');
    expect(projection).toBeGreaterThan(-1);
    expect(projection).toBeLessThan(interactions);
    expect(projection).toBeLessThan(core);
    expect(projection).toBeLessThan(homes);
    expect(bootstrap).toContain('WorldProjection = worldProjection');
    expect(bootstrap).toContain('WorldInteractions = worldInteractions');
  });

  it('points activities, plots, and reviewed interactions only at BrookhavenWorldRuntime',()=>{
    const activities=read('roblox/src/shared/WorldActivityBindings.luau');
    const plots=read('roblox/src/shared/WorldPlotBindings.luau');
    const interactions=read('roblox/src/shared/WorldInteractionBindings.luau');

    expect(activities).toContain('WorldRootName = "BrookhavenWorldRuntime"');
    expect(plots).toContain('WorldRootName = "BrookhavenWorldRuntime"');
    expect(interactions).toContain('WorldRootName = "BrookhavenWorldRuntime"');
    expect(interactions).toContain('ImmutableWitnessName = "BrookhavenWorldBaseline"');
  });
});
