
import { describe,expect,it,vi } from 'vitest';
import {
  buildAiNpcPrompt,
  checkAiNpcCooldown,
  commitAiNpcTurn,
  createAiNpcCatalog,
  createAiNpcState,
  runAiNpcTurn,
  validateAiNpcModelResult
} from './aiNpcRuntime.js';

function catalog(){
  return createAiNpcCatalog({
    npcs:[
      {
        npcId:'maya',
        displayName:'Maya',
        personality:'You are Maya, a warm StarBlox guide who keeps answers brief.',
        allowedTools:['offerQuest','explainHint','startMinigame','setWaypoint'],
        cooldownSeconds:1.5,
        memoryTurns:2,
        maxInputChars:120,
        maxOutputChars:180
      }
    ]
  });
}

describe('Step 8 bounded AI NPC runtime', () => {
  it('rejects forbidden authority tools at catalog construction', () => {
    expect(()=>createAiNpcCatalog({
      npcs:[{
        npcId:'bad',
        personality:'bad',
        allowedTools:['awardCoins']
      }]
    })).toThrow(/forbidden NPC tool/);
  });

  it('builds prompts with bounded memory, lore and an explicit server-tool contract', () => {
    const cfg=catalog();
    const state={
      ...createAiNpcState(),
      memories:{
        maya:[
          {role:'player',text:'old 1'},
          {role:'npc',text:'old 2'},
          {role:'player',text:'recent 1'},
          {role:'npc',text:'recent 2'},
          {role:'player',text:'recent 3'}
        ]
      }
    };
    const prompt=buildAiNpcPrompt({
      catalog:cfg,
      state,
      npcId:'maya',
      playerMessage:'Can you help me?',
      playerContext:{district:'Math Market',coins:22},
      lore:['Maya is the district guide.']
    });

    expect(prompt.memory).toHaveLength(2);
    expect(prompt.system).toMatch(/do not award currency/);
    expect(prompt.system).toMatch(/offerQuest/);
    expect(prompt.input).toBe('Can you help me?');
  });

  it('validates structured model output and rejects tools outside the NPC allowlist', () => {
    const cfg=catalog();
    const good=validateAiNpcModelResult(cfg,'maya',{
      text:'Try the next vocabulary challenge.',
      toolCalls:[
        {tool:'offerQuest',args:{questId:'vocab-1'}}
      ]
    });
    expect(good.ok).toBe(true);

    const bad=validateAiNpcModelResult(cfg,'maya',{
      text:'Here you go.',
      toolCalls:[
        {tool:'openShop',args:{}}
      ]
    });
    expect(bad.ok).toBe(false);
    expect(bad.reason).toMatch(/not allowed/);
  });

  it('enforces per-NPC cooldown and turn-id dedupe', () => {
    const cfg=catalog();
    let state=createAiNpcState();

    expect(checkAiNpcCooldown(state,cfg,'maya',{nowMs:1000}).ok).toBe(true);

    const committed=commitAiNpcTurn(state,cfg,{
      npcId:'maya',
      turnId:'t1',
      nowMs:1000,
      playerMessage:'Hi',
      filteredNpcText:'Hello!'
    });
    state=committed.state;

    expect(checkAiNpcCooldown(state,cfg,'maya',{nowMs:2000}).ok).toBe(false);
    expect(checkAiNpcCooldown(state,cfg,'maya',{nowMs:2500}).ok).toBe(true);

    const duplicate=commitAiNpcTurn(state,cfg,{
      npcId:'maya',
      turnId:'t1',
      nowMs:5000,
      playerMessage:'Again',
      filteredNpcText:'No duplicate'
    });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state.memories.maya).toHaveLength(2);
  });

  it('runs moderation, provider, output filter and bounded server tools in order', async () => {
    const cfg=catalog();
    const calls=[];
    const provider=vi.fn(async prompt=>{
      calls.push('provider');
      expect(prompt.npcId).toBe('maya');
      return {
        text:'Meet me by the quest gate.',
        toolCalls:[
          {tool:'setWaypoint',args:{waypointId:'quest-gate'}},
          {tool:'offerQuest',args:{questId:'math-1'}}
        ]
      };
    });

    const result=await runAiNpcTurn({
      catalog:cfg,
      state:createAiNpcState(),
      npcId:'maya',
      turnId:'turn-1',
      nowMs:10000,
      playerMessage:'What should I do?',
      playerContext:{district:'Math Market'},
      moderateInput:async ()=>{
        calls.push('moderate');
        return true;
      },
      provider,
      filterOutput:async text=>{
        calls.push('filter');
        return text;
      },
      executeTool:async call=>{
        calls.push('tool:' + call.tool);
        return {ok:true};
      }
    });

    expect(result.ok).toBe(true);
    expect(result.text).toBe('Meet me by the quest gate.');
    expect(result.toolResults).toHaveLength(2);
    expect(calls).toEqual([
      'moderate',
      'provider',
      'filter',
      'tool:setWaypoint',
      'tool:offerQuest'
    ]);
    expect(result.state.memories.maya).toHaveLength(2);
  });

  it('does not execute tools when moderation blocks or the provider fails', async () => {
    const cfg=catalog();
    const tool=vi.fn();

    const blocked=await runAiNpcTurn({
      catalog:cfg,
      state:createAiNpcState(),
      npcId:'maya',
      turnId:'blocked',
      nowMs:1000,
      playerMessage:'blocked',
      moderateInput:async()=>false,
      provider:async()=>({text:'should not run'}),
      filterOutput:async text=>text,
      executeTool:tool
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.reason).toMatch(/moderation/);
    expect(tool).not.toHaveBeenCalled();

    const failed=await runAiNpcTurn({
      catalog:cfg,
      state:createAiNpcState(),
      npcId:'maya',
      turnId:'failed',
      nowMs:1000,
      playerMessage:'hello',
      moderateInput:async()=>true,
      provider:async()=>{throw new Error('offline');},
      filterOutput:async text=>text,
      executeTool:tool
    });
    expect(failed.ok).toBe(false);
    expect(failed.reason).toMatch(/provider failed/);
    expect(tool).not.toHaveBeenCalled();
  });
});
