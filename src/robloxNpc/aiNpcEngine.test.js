
import { describe,expect,it } from 'vitest';
import {
  aiNpcToolNames,
  applyAiNpcMemoryFacts,
  buildAiNpcModelRequest,
  createAiNpcCatalog,
  createAiNpcState,
  validateAiNpcModelResponse
} from './aiNpcEngine.js';

function catalog(){
  return createAiNpcCatalog({
    npcs:[
      {
        npcId:'maya',
        systemPrompt:'You are Maya, a friendly StarBlox guide. Stay in-world and concise.',
        allowedTools:['quest_hint','social_status','start_minigame','set_waypoint'],
        knowledgeTags:['story-street','math'],
        memoryLimit:3,
        maxToolCalls:2,
        maxInputChars:120,
        maxOutputChars:180
      }
    ]
  });
}

describe('Step 8 AI NPC domain boundary', () => {
  it('builds server-owned model context without player identity or answer authority', () => {
    const request=buildAiNpcModelRequest({
      catalog:catalog(),
      npcId:'maya',
      state:createAiNpcState(),
      requestId:'r1',
      message:'Where should I go next?',
      gameContext:{
        district:'Story Street',
        questId:'quest-1',
        playerId:'should-not-pass',
        answer:'secret',
        npcAffinity:12
      }
    });

    expect(request.system).toMatch(/friendly StarBlox guide/);
    expect(request.tools.map(tool=>tool.name)).toEqual([
      'quest_hint','set_waypoint','social_status','start_minigame'
    ]);
    expect(request.gameContext).toEqual({
      district:'Story Street',
      questId:'quest-1',
      npcAffinity:12
    });
    expect(JSON.stringify(request)).not.toMatch(/playerId|secret/);
  });

  it('rejects NPC definitions that attempt authoritative or executable tools', () => {
    for(const tool of ['grant_xp','award_coins','publish_place','execute_script','admin_ban']){
      expect(() => createAiNpcCatalog({
        npcs:[{npcId:'bad',systemPrompt:'test',allowedTools:[tool]}]
      })).toThrow(/authority boundary/);
    }
  });

  it('accepts bounded allowlisted tool calls and rejects authority-bearing arguments', () => {
    const cfg=catalog();
    const ok=validateAiNpcModelResponse(cfg,'maya',{
      text:'Try the library next.',
      toolCalls:[
        {name:'set_waypoint',args:{target:'library',startTime:12}},
        {name:'quest_hint',args:{questId:'quest-1'}}
      ],
      memoryFacts:['Player likes library quests.']
    });
    expect(ok.ok).toBe(true);
    expect(ok.value.toolCalls).toHaveLength(2);
    expect(ok.value.toolCalls[0].args.startTime).toBe(12);

    const bad=validateAiNpcModelResponse(cfg,'maya',{
      text:'Here you go.',
      toolCalls:[
        {name:'quest_hint',args:{coins:999,correct:true}}
      ]
    });
    expect(bad.ok).toBe(false);
    expect(bad.errors.join(' ')).toMatch(/authority boundary/);
  });

  it('rejects unknown tools, excessive tool loops, and tools on the final response', () => {
    const cfg=catalog();

    expect(validateAiNpcModelResponse(cfg,'maya',{
      text:'x',
      toolCalls:[{name:'unknown_tool',args:{}}]
    }).ok).toBe(false);

    expect(validateAiNpcModelResponse(cfg,'maya',{
      text:'x',
      toolCalls:[
        {name:'quest_hint',args:{}},
        {name:'set_waypoint',args:{}},
        {name:'social_status',args:{}}
      ]
    }).errors.join(' ')).toMatch(/too many tools/);

    expect(validateAiNpcModelResponse(cfg,'maya',{
      text:'done',
      toolCalls:[{name:'quest_hint',args:{}}]
    },{allowTools:false}).errors.join(' ')).toMatch(/may not request tools/);
  });

  it('persists only bounded safe memory facts and never raw conversation history', () => {
    const cfg=catalog();
    let state=createAiNpcState();

    const first=applyAiNpcMemoryFacts(state,cfg,'maya',{
      requestId:'r1',
      facts:[
        'Player likes space puzzles.',
        'email me at kid@example.com',
        'Discord username is starKid',
        'Player enjoys decorating houses.'
      ]
    });
    state=first.state;

    expect(first.memories).toEqual([
      'Player likes space puzzles.',
      'Player enjoys decorating houses.'
    ]);

    const second=applyAiNpcMemoryFacts(state,cfg,'maya',{
      requestId:'r2',
      facts:['Player likes racing minigames.','Player likes science.']
    });
    expect(second.memories).toHaveLength(3);
    expect(JSON.stringify(second.state)).not.toContain('Where should I go next?');

    const duplicate=applyAiNpcMemoryFacts(second.state,cfg,'maya',{
      requestId:'r2',
      facts:['Should never duplicate']
    });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.memories).toEqual(second.memories);
  });

  it('enforces input/output bounds', () => {
    const cfg=catalog();
    expect(() => buildAiNpcModelRequest({
      catalog:cfg,npcId:'maya',requestId:'r1',
      message:'x'.repeat(121)
    })).toThrow(/max length/);

    const result=validateAiNpcModelResponse(cfg,'maya',{
      text:'x'.repeat(181)
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/maxOutputChars/);
  });

  it('exposes only the NPC allowlisted tool vocabulary', () => {
    expect(aiNpcToolNames(catalog(),'maya')).toEqual([
      'quest_hint','set_waypoint','social_status','start_minigame'
    ]);
  });
});
