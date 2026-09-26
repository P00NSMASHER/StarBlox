import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Phase 10: persistent Brookhaven-style home prop placement',()=>{
  it('persists versioned per-item placements in the player profile',()=>{
    const template=read('roblox/src/shared/ProfileTemplate.luau');
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(template).toContain('PlacementVersion = 1');
    expect(template).toContain('Placements = {}');
    expect(service).toContain('local PLACEMENT_VERSION = 1');
    expect(service).toContain('home.Placements[item.Id] = sanitizePlacement');
    expect(service).toContain('placements = publicPlacements(home)');
  });

  it('keeps placement authority server-side and clamps every move to the owned home',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('function HomeEconomyService:_setPlacement');
    expect(service).toContain('function HomeEconomyService:_setPlacementVisibility');
    expect(service).toContain('function HomeEconomyService:_resetPlacement');
    expect(service).toContain('owned[itemId] ~= true');
    expect(service).toContain('code = "not_owned"');
    expect(service).toContain('finiteNumber');
    expect(service).toContain('math.clamp(snap(x, PLACEMENT_STEP), -maxX, maxX)');
    expect(service).toContain('math.clamp(snap(z, PLACEMENT_STEP), -maxZ, maxZ)');
    expect(service).toContain('normalizeYaw');
    expect(service).toContain('local PLACEMENT_STEP = 1');
    expect(service).toContain('local ROTATION_STEP = 15');
  });

  it('renders only player-owned visible items in runtime-owned home geometry',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    expect(service).toContain('if owned[item.Id] == true then');
    expect(service).toContain('placement.Visible ~= false');
    expect(service).toContain('model:SetAttribute("RuntimeOwned", true)');
    expect(service).toContain('model:SetAttribute("BaselineMutationAllowed", false)');
    expect(service).toContain('CFrame.new(placement.X, 0.5, placement.Z)');
    expect(service).toContain('CFrame.Angles(0, math.rad(placement.Yaw), 0)');
    expect(service).toMatch(/base\s*\*\s*CFrame\.new\(placement\.X, 0\.5, placement\.Z\)\s*\*\s*CFrame\.Angles/);
    expect(service).not.toContain('BrookhavenWorldBaseline');
  });

  it('exposes placement remotes without creating a second currency or client authority path',()=>{
    const service=read('roblox/src/server/HomeEconomyService.luau');

    for(const remote of ['SetPlacement','SetPlacementVisibility','ResetPlacement']){
      expect(service).toContain('Name = "'+remote+'"');
    }
    expect(service).toContain('data.Economy.Coins -= item.Price');
    expect(service).not.toContain('Robux');
    expect(service).not.toContain('MarketplaceService');
  });

  it('opens build mode from owned furniture and keeps all touch controls at least 44px',()=>{
    const shop=read('roblox/src/client/Shop.client.luau');
    const build=read('roblox/src/client/HomeBuild.client.luau');

    expect(shop).toContain('editPlacement.Name = "EditPlacement"');
    expect(shop).toContain('editPlacement:Fire(id)');
    expect(build).toContain('gui.Name = "StarBloxHomeBuild"');
    expect(build).toContain('panel.Size = UDim2.fromOffset(390, 126)');
    expect(build).toContain('button.Size = UDim2.fromOffset(44, 44)');
    expect(build).toContain('setPlacement:InvokeServer');
    expect(build).toContain('setVisibility:InvokeServer');
    expect(build).toContain('resetPlacement:InvokeServer');
    expect(build).toContain('applyPlacement(0, 0, 15)');
    expect(build).toContain('visitHome:InvokeServer()');
  });
});
