import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}
function json(path){
  return JSON.parse(read(path));
}

describe('legacy Brookhaven town-center spawn parity',()=>{
  it('uses the measured 3x3 four-stud spawn pattern on the existing town-square tile',()=>{
    const bindings=read('roblox/src/shared/WorldActivityBindings.luau');

    expect(bindings).toContain('SourcePartName = "BHW_1202"');
    expect(bindings).toContain('FacingSourcePartName = "BHW_2442"');
    expect(bindings).toContain('Pattern = "legacy-town-center-3x3-v1"');
    expect((bindings.match(/table\.freeze\(\{X = /g)||[]).length).toBe(9);

    for(const pair of [
      '{X = -4, Z = -4}','{X = 0, Z = -4}','{X = 4, Z = -4}',
      '{X = -4, Z = 0}','{X = 0, Z = 0}','{X = 4, Z = 0}',
      '{X = -4, Z = 4}','{X = 0, Z = 4}','{X = 4, Z = 4}'
    ]){
      expect(bindings).toContain(pair);
    }
  });

  it('places initial characters and respawns into deterministic town-center slots',()=>{
    const service=read('roblox/src/server/CoreGameLoopService.luau');

    expect(service).toContain('local function playerSpawnCFrame(baseSpawnCFrame: CFrame, player: Player): CFrame');
    expect(service).toContain('local slotIndex = (math.abs(player.UserId) % #slots) + 1');
    expect(service).toContain('return baseSpawnCFrame * CFrame.new(slot.X, 0, slot.Z)');
    expect(service).toContain('function CoreGameLoopService:_placeCharacterAtWorldSpawn(player: Player, character: Model)');
    expect((service.match(/self:_placeCharacterAtWorldSpawn\(player, character\)/g)||[]).length).toBe(2);
  });

  it('binds the decision to the extracted legacy spawn evidence and keeps release claims closed',()=>{
    const evidence=json('docs/roblox-world/LEGACY_BROOKHAVEN_SPAWN_REFERENCE.json');
    const decision=json('docs/roblox-world/LEGACY_BROOKHAVEN_SPAWN_DECISION.json');

    expect(evidence.legacy.spawnLocationCount).toBe(18);
    expect(decision.evidence).toMatchObject({
      legacySpawnLocationCount:18,
      observedLayout:'two 3x3 SpawnLocation grids',
      observedGridSpacingStuds:4,
      starbloxSpawnSource:'BHW_1202',
      starbloxFacingSource:'BHW_2442'
    });
    expect(decision.implementation.slots).toBe(9);
    expect(decision.boundary).toEqual({
      developmentParityImproved:true,
      currentLiveCertificationSatisfied:false,
      exactParityClaimAllowed:false
    });
  });
});
