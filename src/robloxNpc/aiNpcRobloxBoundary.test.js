
import { describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPLICATION_BOUNDARIES } from '../robloxRuntime/backboneContract.js';

function file(path){
  return readFileSync(resolve(process.cwd(),path),'utf8');
}

describe('Step 8 Roblox AI NPC boundary', () => {
  it('keeps NPC memory server-only and requires a server-side provider plus output filter', () => {
    expect(REPLICATION_BOUNDARIES.durableServerOnly).toContain('AiNpc.Memory');
    expect(REPLICATION_BOUNDARIES.playerReplica).not.toContain('AiNpc');

    const source=file('roblox/src/server/AiNpcService.luau');
    expect(source).toMatch(/adapters\.Provider/);
    expect(source).toMatch(/adapters\.FilterOutput/);
    expect(source).toMatch(/NPC output filter rejected response/);
    expect(source).not.toMatch(/HttpService:RequestAsync/);
  });

  it('hard-blocks direct economy mastery persistence code execution and publishing tools', () => {
    const source=file('roblox/src/server/AiNpcService.luau');
    for(const tool of [
      'awardCoins','awardXp','awardStars','setMastery','setAbility',
      'writeProfile','setDataStore','executeLuau','runCode','publishPlace','purchaseProduct'
    ]){
      expect(source).toContain(tool);
    }
    expect(source).toMatch(/FORBIDDEN_TOOLS\[call\.Tool\]/);
  });

  it('adds narrow talk messages instead of client-authored tool or reward payloads', () => {
    const zap=file('roblox/network/starblox.zap');
    const talk=zap.slice(zap.indexOf('event RequestNpcTalk'),zap.indexOf('event NpcTalkResponse'));
    expect(talk).toMatch(/NpcId/);
    expect(talk).toMatch(/Message/);
    expect(talk).not.toMatch(/Tool/);
    expect(talk).not.toMatch(/Reward/);
    expect(talk).not.toMatch(/Coins/);
  });
});
