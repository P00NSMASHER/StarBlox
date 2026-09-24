
import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  NETWORK_CONTRACT,
  REPLICATION_BOUNDARIES
} from '../robloxRuntime/backboneContract.js';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Step 9 Roblox authoritative action boundary', () => {
  it('accepts only client movement/fire intent and never client-authored outcomes', () => {
    const zap=file('roblox/network/starblox.zap');
    const input=zap.slice(zap.indexOf('event ActionInput'),zap.indexOf('event FireAction'));
    const fire=zap.slice(zap.indexOf('event FireAction'),zap.indexOf('event ActionSnapshot'));

    expect(input).toMatch(/Seq: u32/);
    expect(input).toMatch(/MoveX: f32/);
    expect(input).toMatch(/MoveZ: f32/);
    expect(input).not.toMatch(/Position|Health|Damage|Target|Score|Outcome/);

    expect(fire).toMatch(/Seq: u32/);
    expect(fire).toMatch(/RequestId/);
    expect(fire).toMatch(/WeaponId/);
    expect(fire).toMatch(/ShotTime/);
    expect(fire).toMatch(/OriginX/);
    expect(fire).toMatch(/DirX/);
    expect(fire).not.toMatch(/TargetEntityId|Damage|Health|Score|Outcome/);
  });

  it('uses unreliable movement/snapshot traffic but reliable fire receipts/events', () => {
    const byName=Object.fromEntries(NETWORK_CONTRACT.map(row=>[row.name,row]));
    expect(byName.ActionInput).toEqual(
      expect.objectContaining({from:'Client',type:'Unreliable'})
    );
    expect(byName.FireAction).toEqual(
      expect.objectContaining({from:'Client',type:'Reliable'})
    );
    expect(byName.ActionSnapshot).toEqual(
      expect.objectContaining({from:'Server',type:'Unreliable'})
    );
    expect(byName.ActionEvent).toEqual(
      expect.objectContaining({from:'Server',type:'Reliable'})
    );
  });

  it('keeps server simulation, rewind, world-raycast and damage authority in the server service', () => {
    const source=file('roblox/src/server/AuthoritativeActionService.luau');

    expect(source).toMatch(/ApplyInput/);
    expect(source).toMatch(/GetWeaponDefinition/);
    expect(source).toMatch(/WorldRaycast/);
    expect(source).toMatch(/ApplyDamage/);
    expect(source).toMatch(/sampleHistory/);
    expect(source).toMatch(/LastFireSeq/);
    expect(source).toMatch(/stale or duplicate fire sequence/);
    expect(source).toMatch(/shot origin does not match server rewind state/);
    expect(source).toMatch(/client-authored fire outcome field/);
    expect(source).not.toMatch(/payload\.Damage/);
    expect(source).not.toMatch(/payload\.Target/);
  });

  it('fails closed when competitive-mode server adapters are absent', () => {
    const source=file('roblox/src/server/AuthoritativeActionService.luau');
    expect(source).toMatch(/server movement adapter unavailable/);
    expect(source).toMatch(/server combat adapters unavailable/);

    const bootstrap=file('roblox/src/server/Bootstrap.luau');
    expect(bootstrap).toMatch(/AuthoritativeActionService\.new\(dependencies\.ActionAdapters/);
    expect(bootstrap).not.toMatch(/assert\(dependencies\.ActionAdapters/);
  });

  it('keeps client prediction cosmetic and replays only commands above the server acknowledgement', () => {
    const source=file('roblox/src/client/ActionPredictionController.luau');
    expect(source).toMatch(/Predict\(command, false\)/);
    expect(source).toMatch(/ApplyAuthoritative\(snapshot\)/);
    expect(source).toMatch(/command\.Seq > snapshot\.AckSeq/);
    expect(source).toMatch(/Predict\(command, true\)/);
    expect(source).not.toMatch(/Damage/);
    expect(source).not.toMatch(/Health =/);
  });

  it('adds action/combat state only to ephemeral ECS, never durable/profile replicas', () => {
    expect(REPLICATION_BOUNDARIES.ephemeralEcs).toEqual(
      expect.arrayContaining(['ActionActor','CombatState','Hitbox'])
    );
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('CombatState');
    expect(REPLICATION_BOUNDARIES.durableServerOnly).not.toContain('CombatState');
  });
});
