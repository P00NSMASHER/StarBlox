
import { describe,expect,it } from 'vitest';
import {
  awardNpcAffinity,
  createSocialWorldCatalog,
  createSocialWorldState,
  finishSocialMinigame,
  placeHomeItem,
  recordSocialPhoto,
  removeHomeItem,
  startSocialMinigame
} from './socialWorldEngine.js';

function catalog(){
  return createSocialWorldCatalog({
    maxPlacements:3,
    placeables:[
      {itemId:'sofa',category:'furniture',maxPerHome:2,placementRadius:20},
      {itemId:'desk',category:'furniture',maxPerHome:1,placementRadius:20}
    ],
    npcs:[
      {
        npcId:'maya',
        levels:[
          {level:1,affinity:0,unlocks:[]},
          {level:2,affinity:10,unlocks:['maya-photo-pose']},
          {level:3,affinity:25,unlocks:['maya-follower']}
        ]
      }
    ],
    minigames:[
      {
        gameId:'quickdraw',
        npcId:'maya',
        maxDurationSeconds:60,
        winRewards:[{type:'xp',amount:20}]
      }
    ]
  });
}

describe('Step 7 social world engine', () => {
  it('validates persistent home placement server-side', () => {
    const cfg=catalog();
    let state=createSocialWorldState();

    const placed=placeHomeItem(state,cfg,{
      placementId:'p1',
      plotId:'plot-a',
      itemId:'sofa',
      position:{x:2,y:0,z:3},
      rotationY:90
    });
    expect(placed.ok).toBe(true);
    state=placed.state;

    expect(placeHomeItem(state,cfg,{
      placementId:'p1',
      plotId:'plot-a',
      itemId:'sofa',
      position:{x:3,y:0,z:4}
    }).reason).toMatch(/duplicate/);

    expect(placeHomeItem(state,cfg,{
      placementId:'p2',
      plotId:'plot-a',
      itemId:'sofa',
      position:{x:30,y:0,z:0}
    }).reason).toMatch(/outside/);

    const removed=removeHomeItem(state,'p1');
    expect(removed.ok).toBe(true);
    expect(removed.state.home.placements.p1).toBeUndefined();
  });

  it('turns authoritative affinity events into deterministic NPC unlocks and deduplicates them', () => {
    const cfg=catalog();
    let state=createSocialWorldState();

    let result=awardNpcAffinity(state,cfg,{
      npcId:'maya',amount:12,eventId:'quest-1'
    });
    expect(result.ok).toBe(true);
    expect(result.level).toBe(2);
    expect(result.state.unlockedSocialItems['maya-photo-pose']).toBe(true);

    result=awardNpcAffinity(result.state,cfg,{
      npcId:'maya',amount:100,eventId:'quest-1'
    });
    expect(result.duplicate).toBe(true);
    expect(result.affinity).toBe(12);
  });

  it('keeps affinity receipts durable after the recent-receipt window would have rolled over', () => {
    const cfg=catalog();
    let state=createSocialWorldState();

    for(let index=0;index<250;index++){
      const result=awardNpcAffinity(state,cfg,{
        npcId:'maya',
        amount:1,
        eventId:'affinity-' + index
      });
      expect(result.duplicate).toBe(false);
      state=result.state;
    }

    const replay=awardNpcAffinity(state,cfg,{
      npcId:'maya',
      amount:100,
      eventId:'affinity-0'
    });
    expect(replay.duplicate).toBe(true);
    expect(replay.affinity).toBe(250);
    expect(Object.keys(replay.state.affinityReceipts)).toHaveLength(250);
  });

  it('allows only one bounded minigame session and emits rewards only for a server-confirmed win', () => {
    const cfg=catalog();
    let state=createSocialWorldState();

    const started=startSocialMinigame(state,cfg,{
      sessionId:'s1',
      gameId:'quickdraw',
      npcId:'maya',
      startedAt:'2026-09-24T12:00:00Z'
    });
    expect(started.ok).toBe(true);
    state=started.state;

    expect(startSocialMinigame(state,cfg,{
      sessionId:'s2',
      gameId:'quickdraw',
      npcId:'maya',
      startedAt:'2026-09-24T12:00:01Z'
    }).reason).toMatch(/already active/);

    const finished=finishSocialMinigame(state,cfg,{
      sessionId:'s1',
      endedAt:'2026-09-24T12:00:30Z',
      won:true
    });
    expect(finished.ok).toBe(true);
    expect(finished.rewards).toEqual([{type:'xp',amount:20}]);
    expect(finished.state.stats.minigameWins).toBe(1);

    expect(startSocialMinigame(finished.state,cfg,{
      sessionId:'s1',
      gameId:'quickdraw',
      npcId:'maya',
      startedAt:'2026-09-24T12:01:00Z'
    }).reason).toMatch(/already completed/);
  });

  it('deduplicates server-observed photos with durable receipts', () => {
    const input={
      eventId:'photo-dedupe',
      capturer:{
        position:{x:0,y:0,z:0},
        look:{x:0,y:0,z:1}
      },
      participants:[]
    };
    const first=recordSocialPhoto(createSocialWorldState(),input);
    const second=recordSocialPhoto(first.state,input);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.state.stats.photosTaken).toBe(1);
  });

  it('computes co-op photo participants from server-observed position and facing data', () => {
    const result=recordSocialPhoto(createSocialWorldState(),{
      eventId:'photo-1',
      capturer:{
        position:{x:0,y:0,z:0},
        look:{x:0,y:0,z:1}
      },
      participants:[
        {
          playerId:'near-facing',
          position:{x:0,y:0,z:10},
          look:{x:0,y:0,z:1}
        },
        {
          playerId:'far',
          position:{x:0,y:0,z:50},
          look:{x:0,y:0,z:1}
        },
        {
          playerId:'opposite',
          position:{x:1,y:0,z:8},
          look:{x:0,y:0,z:-1}
        }
      ]
    });

    expect(result.coopParticipants).toEqual(['near-facing']);
    expect(result.state.stats.photosTaken).toBe(1);
    expect(result.state.stats.coopPhotos).toBe(1);
  });
});
