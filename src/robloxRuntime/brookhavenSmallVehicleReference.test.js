import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven verified Small vehicle reference boundary',()=>{
  it('contains all 22 verified Small entries in ordinal order',()=>{
    const catalog=read('roblox/src/shared/MirrorCatalog.luau');
    const entries=[...catalog.matchAll(/referenceSmall\("reference-small-[^"]+",\s*(\d+),\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"\)/g)];
    expect(entries).toHaveLength(22);
    expect(entries.map(x=>Number(x[1]))).toEqual(Array.from({length:22},(_,i)=>i+1));
    expect(entries[0][2]).toBe('Scooter');
    expect(entries.at(-1)[2]).toBe('Original Horse');
    expect(catalog).toContain('ParityStatus = "verified-reference-only"');
    expect(catalog).toContain('RuntimePlayable = false');
  });

  it('fails closed instead of charging coins or spawning reference-only entries',()=>{
    const service=read('roblox/src/server/MirrorLifestyleService.luau');
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(service).toContain('if definition.RuntimePlayable == false then');
    expect(service).toContain('code = "reference_only"');
    expect(service).toContain('requirement = tostring(definition.Requirement or "Unavailable")');
    expect(sidebar).toContain('local runtimePlayable = vehicle.RuntimePlayable ~= false');
    expect(sidebar).toContain('showStatus("Reference only • " .. tostring(vehicle.Requirement or "Unavailable"))');
    expect(sidebar).toContain('local badgeText = if not runtimePlayable then "R"');
  });

  it('keeps runtime implementation counts separate from factual reference coverage',()=>{
    const config=read('roblox/src/shared/BrookhavenMirrorConfig.luau');
    const reference=JSON.parse(read('docs/BROOKHAVEN_CATALOG_REFERENCE.json'));

    expect(config).toContain('RuntimePlayableVehicles = 8');
    expect(config).toContain('VerifiedReferenceSmallVehicles = 22');
    expect(config).toContain('SmallReferenceMetadataComplete = true');
    expect(reference.currentStarBloxImplementation.runtimePlayableVehicles).toBe(8);
    expect(reference.currentStarBloxImplementation.verifiedReferenceSmallVehicles).toBe(22);
    expect(reference.currentStarBloxImplementation.vehicleParityComplete).toBe(false);
  });
});
