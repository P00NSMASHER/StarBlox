import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 11: selectable Brookhaven-style house architectures',()=>{
  it('ships eight learning-coin house styles across the existing five home tiers',()=>{
    const catalog=read('roblox/src/shared/StoreCatalog.luau');

    const styles=[
      ['home-starter','Starter Home',1,0,'starter'],
      ['home-suburban','Suburban Home',2,1500,'suburban'],
      ['home-modern','Modern Glass Home',2,2500,'modern'],
      ['home-ranch','Ranch House',3,5000,'ranch'],
      ['home-townhouse','Townhouse',3,6500,'townhouse'],
      ['home-lakehouse','Lake House',4,10000,'lakehouse'],
      ['home-villa','Modern Villa',4,14000,'villa'],
      ['home-mansion','Star Mansion',5,30000,'mansion']
    ];

    for(const [id,name,tier,price,kind] of styles){
      expect(catalog).toContain(
        'Id = "'+id+'", Name = "'+name+'", RequiredTier = '+tier+', Price = '+price+', Kind = "'+kind+'"'
      );
    }
    expect(catalog.match(/Id = "home-/g)?.length).toBe(8);
  });

  it('migrates old profiles safely to the free starter style and persists ownership/selection',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(template).toContain('SelectedStyle = "home-starter"');
    expect(template).toContain('OwnedStyles = {["home-starter"] = true}');
    expect(service).toContain('home.OwnedStyles["home-starter"] = true');
    expect(service).toContain('home.SelectedStyle = "home-starter"');
    expect(service).toContain('STYLE_BY_ID[home.SelectedStyle]');
  });

  it('keeps style purchases authoritative, tier-gated, persistent, and learning-coin funded',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('function HomeEconomyService:_purchaseHomeStyle');
    expect(service).toContain('function HomeEconomyService:_selectHomeStyle');
    expect(service).toContain('home.Tier < style.RequiredTier');
    expect(service).toContain('code = "home_tier_required"');
    expect(service).toContain('data.Economy.Coins -= style.Price');
    expect(service).toContain('home.OwnedStyles[styleId] = true');
    expect(service).toContain('home.SelectedStyle = styleId');
    expect(service).toContain('code = "not_owned"');
    expect(service).not.toContain('Robux');
    expect(service).not.toContain('MarketplaceService');
  });

  it('renders eight distinct architecture modes without moving furniture coordinates or mutating Brookhaven',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    for(const kind of ['modern','suburban','ranch','townhouse','lakehouse','villa','mansion']){
      expect(service).toContain('kind == "'+kind+'"');
    }
    expect(service).toContain('renderHouseShell(model, base, tier, style)');
    expect(service).toContain('model:SetAttribute("HomeStyleId", style.Id)');
    expect(service).toContain('model:SetAttribute("HomeStyleKind", style.Kind)');
    expect(service).toContain('FrontWallLeft');
    expect(service).toContain('FrontWallRight');
    expect(service).toContain('FrontDeck');
    expect(service).toContain('Window');
    expect(service).toContain('Column');
    expect(service).toContain('TownhouseBand');
    expect(service).toContain('ModernAccent');

    // Furniture still uses the same tier-local placement contract independent of style.
    expect(service).toMatch(/base\s*\*\s*CFrame\.new\(placement\.X, 0\.5, placement\.Z\)\s*\*\s*CFrame\.Angles/);
    expect(service).not.toContain('BrookhavenWorldBaseline');
  });

  it('exposes style selection in the Brookhaven-style light thumbnail grid',()=>{
    const client=read('roblox/src/client/Shop.client.luau');

    expect(client).toContain('PurchaseHomeStyle');
    expect(client).toContain('SelectHomeStyle');
    expect(client).toContain('state.styles');
    expect(client).toContain('state.ownedStyles');
    expect(client).toContain('state.selectedStyle');
    expect(client).toContain('upgrade your home tier first');
    expect(client).toContain('tile(');
    expect(client).toContain('grid.CellSize = UDim2.fromOffset(76,64)');
  });
});
