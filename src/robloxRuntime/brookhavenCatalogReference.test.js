import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven catalog parity reference',()=>{
  it('pins the current externally observed parity totals without treating them as implemented',()=>{
    const reference=JSON.parse(read('docs/BROOKHAVEN_CATALOG_REFERENCE.json'));
    const config=read('roblox/src/shared/BrookhavenMirrorConfig.luau');
    const catalog=read('roblox/src/shared/MirrorCatalog.luau');

    expect(reference.status).toBe('reference-evidence-not-asset-import');
    expect(reference.verifiedTargets.vehicles.total).toBe(188);
    expect(reference.verifiedTargets.inventory.total).toBe(173);
    expect(reference.verifiedTargets.houses.total).toBe(83);
    expect(Object.values(reference.verifiedTargets.vehicles.categories).reduce((a,b)=>a+b,0)).toBe(188);

    expect(reference.currentStarBloxImplementation.vehicles).toBe(8);
    expect(reference.currentStarBloxImplementation.inventoryItems).toBe(12);
    expect(reference.currentStarBloxImplementation.parityComplete).toBe(false);

    expect(config).toContain('Vehicles = 188');
    expect(config).toContain('InventoryItems = 173');
    expect(config).toContain('Vehicles = 8');
    expect(config).toContain('InventoryItems = 12');
    expect(config).toContain('VehicleParityComplete = false');
    expect(config).toContain('InventoryParityComplete = false');

    expect((catalog.match(/Id = "vehicle-/g)||[]).length).toBe(8);
    expect((catalog.match(/Id = "tool-/g)||[]).length).toBe(12);
  });

  it('pins all six real vehicle categories and the exact first Small batch',()=>{
    const reference=JSON.parse(read('docs/BROOKHAVEN_CATALOG_REFERENCE.json'));

    expect(reference.verifiedTargets.vehicles.categories).toEqual({
      Small:22,
      Street:64,
      Work:46,
      Event:34,
      Boats:18,
      Flying:4,
    });
    expect(reference.firstVerifiedVehicleBatch.category).toBe('Small');
    expect(reference.firstVerifiedVehicleBatch.entries).toHaveLength(22);
    expect(reference.firstVerifiedVehicleBatch.entries[0]).toMatchObject({
      number:1,
      name:'Scooter',
      requirement:'Free'
    });
    expect(reference.firstVerifiedVehicleBatch.entries.at(-1)).toMatchObject({
      number:22,
      name:'Original Horse',
      requirement:'Free'
    });
  });

  it('keeps the catalog reference metadata-only and fail-closed for assets',()=>{
    const reference=JSON.parse(read('docs/BROOKHAVEN_CATALOG_REFERENCE.json'));

    expect(reference.rules.noCopiedProprietaryCode).toBe(true);
    expect(reference.rules.noUnverifiedAssetImports).toBe(true);
    expect(reference.rules.factualCatalogMetadataOnly).toBe(true);
    expect(reference.rules.doNotPadCatalogWithInventedEntries).toBe(true);
    expect(reference.stagedImplementation[0].assetRule).toContain('original StarBlox geometry/animations');
  });
});
