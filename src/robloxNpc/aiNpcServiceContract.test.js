
import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  NETWORK_CONTRACT,
  PROFILE_TEMPLATE,
  REPLICATION_BOUNDARIES
} from '../robloxRuntime/backboneContract.js';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Step 8 Roblox AI NPC runtime contract', () => {
  it('keeps persistent NPC memory and request receipts server-only', () => {
    expect(PROFILE_TEMPLATE).toHaveProperty('AiNpc.Memories');
    expect(PROFILE_TEMPLATE).toHaveProperty('AiNpc.ProcessedRequestIds');
    expect(PROFILE_TEMPLATE).toHaveProperty('AiNpc.LastRequestSequence',-1);
    expect(REPLICATION_BOUNDARIES.durableServerOnly).toEqual(
      expect.arrayContaining(['AiNpc.Memories','AiNpc.ProcessedRequestIds','AiNpc.LastRequestSequence'])
    );
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('AiNpc');
  });

  it('defines narrow client request and filtered server response events', () => {
    const source=file('roblox/network/starblox.zap');
    expect(source).toMatch(/event RequestNpcTurn/);
    expect(source).toMatch(/NpcId: string\.utf8, RequestId: string\.utf8, RequestSequence: u32, Message: string\.utf8/);
    expect(source).toMatch(/event NpcTurn/);
    expect(source).toMatch(/NpcId: string\.utf8, RequestId: string\.utf8, Text: string\.utf8/);

    const names=NETWORK_CONTRACT.map(event=>event.name);
    expect(names).toEqual(expect.arrayContaining(['RequestNpcTurn','NpcTurn']));
  });

  it('fails closed without server-side provider and text-policy adapters', () => {
    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/ModelProvider/);
    expect(source).toMatch(/ModerateInput/);
    expect(source).toMatch(/FilterOutput/);
    expect(source).toMatch(/AI NPC adapters unavailable/);
    expect(source).not.toMatch(/RequestAsync\s*\(/);
    expect(source).not.toMatch(/HttpService:GetAsync/);
  });

  it('rechecks active ProfileStore session after model/tool work before persistence', () => {
    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/currentProfile ~= profile/);
    expect(source).toMatch(/profile:IsActive\(\)/);
    expect(source).toMatch(/profile session ended during AI NPC turn/);
  });

  it('persists only memory-policy-approved facts and bounded request receipts', () => {
    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/MemoryPolicy/);
    expect(source).toMatch(/AllowFact/);
    expect(source).toMatch(/approvedFacts/);
    expect(source).toMatch(/appendBoundedUnique\(currentState\.Memories/);
    expect(source).toMatch(/appendBoundedUnique\(currentState\.ProcessedRequestIds/);
    expect(source).toMatch(/LastRequestSequence/);
    expect(source).toMatch(/stale or duplicate AI NPC request sequence/);
    expect(source).not.toMatch(/currentState\.Memories\[npcId\].*modelInput/);
  });

  it('enforces allowlisted bounded tools and forbids authority-bearing tool arguments', () => {
    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/FORBIDDEN_TOOL_WORDS/);
    expect(source).toMatch(/FORBIDDEN_ARG_WORDS/);
    expect(source).toMatch(/tool not allowed for NPC/);
    expect(source).toMatch(/model requested too many tools/);
    expect(source).toMatch(/final model response may not request tools/);
    expect(source).not.toMatch(/Economy\.Coins/);
    expect(source).not.toMatch(/Economy\.XP/);
  });

  it('uses two-phase effectful tools and runs commits only after final output validation', () => {
    const source=file('roblox/src/server/AiNpcService.luau');

    expect(source).toMatch(/ReadOnlyTools/);
    expect(source).toMatch(/effectful tool requires Prepare\/Commit\/Rollback/);
    expect(source).toMatch(/handler\.Prepare/);
    expect(source).toMatch(/handler\.Commit/);
    expect(source).toMatch(/handler\.Rollback/);
    expect(source).toMatch(/deepCopy\(profile\.Data\)/);

    const finalize=source.indexOf('provider.Generate(secondRequest)');
    const filter=source.indexOf('textPolicy.FilterOutput');
    const reserve=source.indexOf('currentState.LastRequestSequence = requestSequence');
    const commit=source.indexOf('prepared.handler.Commit');
    expect(finalize).toBeGreaterThanOrEqual(0);
    expect(filter).toBeGreaterThan(finalize);
    expect(reserve).toBeGreaterThan(filter);
    expect(commit).toBeGreaterThan(reserve);
  });

  it('reserves request IDs and request sequences together while a turn is in flight', () => {
    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/sequenceKey = "seq:"/);
    expect(source).toMatch(/self\._inFlight\[player\]\[sequenceKey\]/);
    expect(source).toMatch(/self\._inFlight\[player\]\[cleanRequestId\] = nil/);
    expect(source).toMatch(/self\._inFlight\[player\]\[sequenceKey\] = nil/);
  });

  it('composes the AI NPC service without making it a required external provider at boot', () => {
    const source=file('roblox/src/server/Bootstrap.luau');
    expect(source).toMatch(/AiNpcService/);
    expect(source).toMatch(/AiNpcService\.new\(profiles, dependencies\.AiNpcAdapters/);
    expect(source).toMatch(/aiNpc:PlayerRemoving/);
    expect(source).not.toMatch(/assert\(dependencies\.AiNpcAdapters/);
  });
});
