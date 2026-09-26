import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Brookhaven vehicle category rail contract',()=>{
  it('locks the six verified Brookhaven vehicle categories and removes the old generic buckets',()=>{
    const sidebar=read('roblox/src/client/MirrorSidebar.client.luau');

    expect(sidebar).toContain('local activeVehicleCategory = "street"');

    const vehicleCategoryBlock=sidebar.slice(
      sidebar.indexOf('setCategories({\n\t\t{Id = "small"'),
      sidebar.indexOf('}, activeVehicleCategory')
    );

    for(const id of ['small','street','work','event','boats','flying']){
      expect(vehicleCategoryBlock).toContain(`Id = "${id}"`);
    }
    for(const retired of ['cars','utility','bikes']){
      expect(vehicleCategoryBlock).not.toContain(`Id = "${retired}"`);
    }

    expect(sidebar).toContain('local catalogCategory = tostring(vehicle.Category or "")');
    expect(sidebar).toContain('vehicleMatchesCategory(catalogCategory, activeVehicleCategory)');
  });

  it('requires every temporary StarBlox vehicle to declare a verified Brookhaven category explicitly',()=>{
    const catalog=read('roblox/src/shared/MirrorCatalog.luau');
    const vehicleBlock=catalog.slice(
      catalog.indexOf('Vehicles = table.freeze({'),
      catalog.indexOf('\tInventory = table.freeze({')
    );
    const entries=vehicleBlock.match(/table\.freeze\(\{Id = "vehicle-[^\n]+/g) || [];

    expect(entries).toHaveLength(8);
    for(const entry of entries){
      expect(entry).toMatch(/Category = "(Small|Street|Work|Event|Boats|Flying)"/);
      expect(entry).toContain('ParityStatus = "temporary-starblox"');
    }
  });
});
