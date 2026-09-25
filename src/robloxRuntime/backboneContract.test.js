
import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  NETWORK_CONTRACT,
  PROFILE_TEMPLATE,
  REPLICATION_BOUNDARIES,
  validateRobloxBackboneContract
} from './backboneContract.js';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Step 3: Roblox production backbone', () => {
  it('keeps durable learning state server-only while replicating only the intended player projection', () => {
    expect(validateRobloxBackboneContract()).toEqual({ok:true,errors:[]});
    expect(REPLICATION_BOUNDARIES.durableServerOnly).toEqual(
      expect.arrayContaining([
        'Learning.Concepts',
        'Learning.Ability',
        'Daily.Completed',
        'Settings',
        'LiveOps.EventStreams',
        'Social.CompletedSessionIds',
        'Social.AffinityReceipts'
      ])
    );
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('Learning.Concepts');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('Learning.Ability');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('LiveOps');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('LiveOps.ProcessedEventIds');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('LiveOps.EventStreams');
  });

  it('defines a versioned StarBlox profile with economy, progress, intelligence, daily, inventory and rollout state', () => {
    expect(PROFILE_TEMPLATE.SchemaVersion).toBe(1);
    expect(PROFILE_TEMPLATE).toHaveProperty('Economy.Coins',0);
    expect(PROFILE_TEMPLATE).toHaveProperty('Learning.Ability.Theta',0);
    expect(PROFILE_TEMPLATE).toHaveProperty('Daily.Completed');
    expect(PROFILE_TEMPLATE).toHaveProperty('Rollout.Assignments');
  });

  it('uses ProfileStore session locking/reconciliation lifecycle rather than raw DataStore writes', () => {
    const source=file('roblox/src/server/ProfileSessionService.luau');
    expect(source).toMatch(/StartSessionAsync/);
    expect(source).toMatch(/AddUserId/);
    expect(source).toMatch(/Reconcile/);
    expect(source).toMatch(/OnSessionEnd/);
    expect(source).toMatch(/EndSession/);
    expect(source).not.toMatch(/SetAsync\s*\(/);
    expect(source).not.toMatch(/UpdateAsync\s*\(/);
  });

  it('replicates a controlled projection instead of the entire persisted learning profile', () => {
    const source=file('roblox/src/server/ReplicaStateService.luau');
    expect(source).toMatch(/publicProjection/);
    expect(source).toMatch(/replicaModule\.Token\("StarBloxPlayerState"\)/);
    expect(source).toMatch(/replicaModule\.New\(\{/);
    expect(source).toMatch(/NewReadyPlayer/);
    expect(source).toMatch(/ReadyPlayers\[player\]/);
    expect(source).toMatch(/replica:Subscribe\(player\)/);
    expect(source).toMatch(/replica:Set\(/);
    expect(source).not.toMatch(/NewClassToken|NewReplica|SetValue/);
    expect(source).not.toMatch(/Learning =/);
  });

  it('defines narrow typed Zap network messages with authoritative client submissions and unreliable ghost samples', () => {
    const source=file('roblox/network/starblox.zap');
    expect(source).toMatch(/event SubmitQuestionAttempt/);
    expect(source).toMatch(/from: Client/);
    expect(source).toMatch(/ChoiceIndex: u8/);
    expect(source).toMatch(/event QuestState/);
    expect(source).toMatch(/event DailyState/);
    expect(source).toMatch(/event GhostSample/);
    expect(source).toMatch(/type: Unreliable/);

    const names=NETWORK_CONTRACT.map(event => event.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('isolates ephemeral high-volume world state behind Matter components', () => {
    const components=file('roblox/src/shared/Components.luau');
    const world=file('roblox/src/server/WorldEcsService.luau');

    expect(components).toMatch(/Matter\.component/);
    for(const name of ['Npc','QuestMarker','District','Vehicle','Transform','Health']){
      expect(components).toContain('"' + name + '"');
    }
    expect(world).toMatch(/Matter\.World\.new/);
    expect(world).toMatch(/queryChanged/);
    expect(world).toMatch(/ReplicatedStorage\.StarBlox\.Components/);
  });

  it('composes injected production dependencies in the server bootstrap and requests client replica data only after listeners exist', () => {
    const server=file('roblox/src/server/Bootstrap.luau');
    const client=file('roblox/src/client/Bootstrap.luau');

    expect(server).toMatch(/ProfileSessionService\.new/);
    expect(server).toMatch(/ReplicaStateService\.new/);
    expect(server).toMatch(/WorldEcsService\.new/);
    expect(server).toMatch(/RuntimeArtifactService\.new/);
    expect(server).toMatch(/ReplayIngressService\.new/);
    expect(server).toMatch(/IntelligenceShadowService\.new/);
    expect(server).toMatch(/BindToClose/);
    expect(server).toMatch(/profiles:ReleaseAll/);

    expect(server).toMatch(/dependencies\.Replica/);
    expect(server).not.toMatch(/dependencies\.ReplicaService/);
    expect(server).toMatch(/replicas:Shutdown/);

    const listener=client.indexOf('OnNew("StarBloxPlayerState"');
    const request=client.indexOf('RequestData');
    expect(listener).toBeGreaterThanOrEqual(0);
    expect(request).toBeGreaterThan(listener);
  });

  it('keeps social-world placement fail-closed and durable affinity dedupe server-side', () => {
    const source=file('roblox/src/server/SocialWorldService.luau');
    expect(source).toMatch(/placement validator unavailable/);
    expect(source).toMatch(/AffinityReceipts/);
    expect(source).toMatch(/social\.AffinityReceipts\[awardId\] == true/);
    expect(source).toMatch(/PhotoReceipts/);
    expect(source).toMatch(/LiveOpsSequence/);
    expect(source).toMatch(/not duplicate and self\._liveOps/);
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('Social.AffinityReceipts');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('Social.PhotoReceipts');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('Social.LiveOpsSequence');
  });

  it('keeps hardened AI NPC facts/receipts server-only and fails closed without policy/provider adapters', () => {
    expect(REPLICATION_BOUNDARIES.durableServerOnly).toEqual(
      expect.arrayContaining(['AiNpc.Memories','AiNpc.ProcessedRequestIds','AiNpc.LastRequestSequence'])
    );
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('AiNpc');

    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/ModelProvider/);
    expect(source).toMatch(/ModerateInput/);
    expect(source).toMatch(/FilterOutput/);
    expect(source).toMatch(/AI NPC adapters unavailable/);
    expect(source).toMatch(/FORBIDDEN_TOOL_WORDS/);
    expect(source).toMatch(/FORBIDDEN_ARG_WORDS/);
  });

  it('pins the production Roblox packages, vendored Replica identity and self-starting composition roots', () => {
    const wally=file('roblox/wally.toml');
    const lock=JSON.parse(file('roblox/toolchain.lock.json'));
    const serverRuntime=file('roblox/src/server/Runtime.server.luau');
    const clientRuntime=file('roblox/src/client/Runtime.client.luau');

    expect(wally).toContain('Matter = "matter-ecs/matter@0.8.4"');
    expect(wally).toContain('ProfileStore = "lm-loleris/profilestore@1.0.3"');
    expect(lock.runtimePackages.Replica.upstreamRevision)
      .toBe('9cae236aee840b1f436b6b1a63c76f4384e285b7');
    expect(lock.runtimePackages.Replica.files).toHaveLength(7);
    expect(lock.generators.Zap.version).toBe('0.6.29');
    expect(lock.generators.Zap.upstreamRevision)
      .toBe('8cd17ab78192217600eec6f688ed8f8aab18d707');
    expect(serverRuntime).toMatch(/ProfileStore = require\(profileStoreModule\)/);
    expect(serverRuntime).toMatch(/Replica = require\(replicaServerModule\)/);
    expect(serverRuntime).toMatch(/Matter = require\(matterModule\)/);
    expect(clientRuntime).toMatch(/Bootstrap\.start\(require\(replicaClientModule\)\)/);
  });

  it('maps the Rojo tree into shared, server, and client Roblox service boundaries', () => {
    const project=JSON.parse(file('roblox/default.project.json'));
    expect(project.tree.ReplicatedStorage.StarBlox.$path).toBe('src/shared');
    expect(project.tree.ServerScriptService.StarBlox.$path).toBe('src/server');
    expect(project.tree.StarterPlayer.StarterPlayerScripts.StarBlox.$path).toBe('src/client');
    expect(project.tree.ReplicatedStorage.Packages.$path.optional).toBe('Packages');
    expect(project.tree.ServerScriptService.ServerPackages.$path.optional).toBe('ServerPackages');
    expect(project.tree.ReplicatedStorage.ReplicaClient.$path)
      .toBe('vendor/Replica/ReplicatedStorage/ReplicaClient.luau');
    expect(project.tree.ReplicatedStorage.ReplicaShared.$path)
      .toBe('vendor/Replica/ReplicatedStorage/ReplicaShared');
    expect(project.tree.ServerScriptService.ReplicaServer.$path)
      .toBe('vendor/Replica/ServerScriptService/ReplicaServer.luau');
  });
});
