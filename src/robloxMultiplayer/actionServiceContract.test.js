
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

describe('Step 9 Roblox authoritative multiplayer contract', () => {
  it('keeps client messages intent-only and server state/outcomes one-way', () => {
    const source=file('roblox/network/starblox.zap');

    expect(source).toMatch(/event SubmitActionInput/);
    expect(source).toMatch(/from: Client/);
    expect(source).toMatch(/Sequence: u32/);
    expect(source).toMatch(/ClientTick: u32/);
    expect(source).toMatch(/MoveX: f32/);
    expect(source).toMatch(/AimX: f32/);
    expect(source).toMatch(/ActionCode: u8/);
    expect(source).toMatch(/TargetUserId: u64/);

    const inputBlock=source.slice(
      source.indexOf('event SubmitActionInput'),
      source.indexOf('event AuthoritativeActionState')
    );
    expect(inputBlock).not.toMatch(/Damage|Score|Reward|Coins|XP|Stars|Health|Position:/);

    expect(source).toMatch(/event AuthoritativeActionState/);
    expect(source).toMatch(/event ConfirmedAction/);

    const contract=Object.fromEntries(NETWORK_CONTRACT.map(event => [event.name,event]));
    expect(contract.SubmitActionInput).toMatchObject({from:'Client',type:'Unreliable'});
    expect(contract.AuthoritativeActionState).toMatchObject({from:'Server',type:'Unreliable'});
    expect(contract.ConfirmedAction).toMatchObject({from:'Server',type:'Reliable'});
  });

  it('makes authoritative movement, rollback, weapon specs and damage server-owned boundaries', () => {
    expect(REPLICATION_BOUNDARIES.authoritativeMultiplayer).toEqual(
      expect.arrayContaining([
        'server-owned movement state',
        'accepted input sequence state',
        'rollback snapshots',
        'weapon specs',
        'hit validation',
        'damage application'
      ])
    );
  });

  it('sanitizes timing, sequence, movement, aim, action code and target before queuing', () => {
    const source=file('roblox/src/server/MultiplayerActionService.luau');

    expect(source).toMatch(/commandKeysAreSafe/);
    expect(source).toMatch(/MAX_REWIND_TICKS/);
    expect(source).toMatch(/MAX_FUTURE_TICKS/);
    expect(source).toMatch(/MAX_SEQUENCE_GAP/);
    expect(source).toMatch(/MAX_COMMANDS_PER_SECOND/);
    expect(source).toMatch(/normalizeMove/);
    expect(source).toMatch(/normalizeAim/);
    expect(source).toMatch(/duplicate_or_out_of_order_sequence/);
    expect(source).toMatch(/sequence_gap_too_large/);
    expect(source).toMatch(/command_budget_exceeded/);
    expect(source).toMatch(/command\.ClientTick > self\._serverTick/);
  });

  it('derives movement state from server adapters and never reads a client-authored position', () => {
    const source=file('roblox/src/server/MultiplayerActionService.luau');

    expect(source).toMatch(/Movement:ProcessInput/);
    expect(source).toMatch(/Movement:GetState/);
    expect(source).toMatch(/Position = position/);
    expect(source).toMatch(/Velocity = velocity/);
    expect(source).not.toMatch(/raw\.Position/);
    expect(source).not.toMatch(/raw\.Velocity/);
  });

  it('requires server weapon specs, rewind geometry, line of sight and server damage application', () => {
    const source=file('roblox/src/server/MultiplayerActionService.luau');

    expect(source).toMatch(/GetWeaponSpec/);
    expect(source).toMatch(/_snapshotAtOrBefore/);
    expect(source).toMatch(/target_out_of_range/);
    expect(source).toMatch(/target_outside_aim_cone/);
    expect(source).toMatch(/ValidateLineOfSight/);
    expect(source).toMatch(/ApplyDamage/);
    expect(source).toMatch(/context\.Weapon\.Damage/);

    expect(source).not.toMatch(/command\.Damage/);
    expect(source).not.toMatch(/raw\.Damage/);
    expect(source).not.toMatch(/Economy\.Coins/);
    expect(source).not.toMatch(/Economy\.XP/);
    expect(source).not.toMatch(/MasteredSkills/);
  });

  it('uses client prediction only as a cosmetic responsiveness layer and replays unconfirmed inputs after server correction', () => {
    const source=file('roblox/src/client/ActionPredictionClient.luau');

    expect(source).toMatch(/ApplyInput\(command, false\)/);
    expect(source).toMatch(/ReadAuthoritativeState/);
    expect(source).toMatch(/command\.Sequence > ack/);
    expect(source).toMatch(/ApplyInput\(command, true\)/);
    expect(source).toMatch(/ReplayedCommands/);
    expect(source).not.toMatch(/Damage/);
    expect(source).not.toMatch(/Score/);
    expect(source).not.toMatch(/Reward/);
  });

  it('keeps authoritative multiplayer optional at boot so noncompetitive StarBlox modes do not depend on it', () => {
    const server=file('roblox/src/server/Bootstrap.luau');
    const client=file('roblox/src/client/Bootstrap.luau');

    expect(server).toMatch(/MultiplayerActionService/);
    expect(server).toMatch(/dependencies\.MultiplayerAdapters ~= nil/);
    expect(server).toMatch(/multiplayer:Start\(\)/);
    expect(server).toMatch(/multiplayer:PlayerAdded/);
    expect(server).toMatch(/multiplayer:PlayerRemoving/);
    expect(server).not.toMatch(/assert\(dependencies\.MultiplayerAdapters/);

    expect(client).toMatch(/ActionPredictionClient/);
    expect(client).toMatch(/dependencies\.ActionPredictionAdapter ~= nil/);
    expect(client).toMatch(/ActionPrediction = prediction/);
  });
});
