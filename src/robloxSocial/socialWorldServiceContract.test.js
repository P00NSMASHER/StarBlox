import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Repair 7: social-world side-effect consistency', () => {
  it('requires placement world adapters instead of persisting invisible items', () => {
    const source=file('roblox/src/server/SocialWorldService.luau');
    expect(source).toMatch(/placement spawn adapter unavailable/);
    expect(source).toMatch(/type\(self\._adapters\.SpawnPlacedItem\) ~= "function"/);
    expect(source).toMatch(/type\(self\._adapters\.RemovePlacedItem\) ~= "function"/);
  });

  it('spawns a placement before committing it to persistent profile state', () => {
    const source=file('roblox/src/server/SocialWorldService.luau');
    const place=source.slice(
      source.indexOf('function SocialWorldService:PlaceItem'),
      source.indexOf('function SocialWorldService:RemoveItem')
    );

    const spawn=place.indexOf('self._adapters.SpawnPlacedItem');
    const persist=place.indexOf('social.Home.Placements[placementId] = placement');
    expect(spawn).toBeGreaterThanOrEqual(0);
    expect(persist).toBeGreaterThan(spawn);
    expect(place).toMatch(/placement spawn failed/);
    expect(place).toMatch(/adapterAccepted\(spawnResult\)/);
  });

  it('removes the world object before deleting the persistent placement', () => {
    const source=file('roblox/src/server/SocialWorldService.luau');
    const remove=source.slice(
      source.indexOf('function SocialWorldService:RemoveItem'),
      source.indexOf('function SocialWorldService:AwardNpcAffinity')
    );

    const world=remove.indexOf('self._adapters.RemovePlacedItem');
    const persist=remove.indexOf('social.Home.Placements[placementId] = nil');
    expect(world).toBeGreaterThanOrEqual(0);
    expect(persist).toBeGreaterThan(world);
    expect(remove).toMatch(/adapterAccepted\(removeResult\)/);
  });

  it('does not consume an active minigame session until the server result is valid', () => {
    const source=file('roblox/src/server/SocialWorldService.luau');
    const finish=source.slice(
      source.indexOf('function SocialWorldService:FinishMinigame'),
      source.indexOf('function SocialWorldService:RecordPhoto')
    );

    const validate=finish.indexOf('type(serverResult) ~= "table"');
    const clear=finish.indexOf('self._activeMinigames[player] = nil');
    expect(validate).toBeGreaterThanOrEqual(0);
    expect(clear).toBeGreaterThan(validate);
  });
});
