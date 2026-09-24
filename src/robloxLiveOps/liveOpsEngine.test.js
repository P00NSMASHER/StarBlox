
import { describe,expect,it } from 'vitest';
import {
  authorizeCoinBundlePurchase,
  claimEngagementReward,
  claimMissionReward,
  claimSeasonTier,
  createLiveOpsCatalog,
  createLiveOpsState,
  recordAuthoritativeLiveOpsEvent,
  recordLiveOpsVisit
} from './liveOpsEngine.js';

function catalog(){
  return createLiveOpsCatalog({
    missions:[
      {
        missionId:'daily-scholar',
        categoryId:'daily',
        tasks:[
          {taskId:'daily',eventType:'daily_completed',target:1},
          {taskId:'mastery',eventType:'skill_mastered',target:2}
        ],
        rewards:[
          {type:'coins',amount:50},
          {type:'seasonXp',amount:100,seasonId:'season-1'}
        ]
      }
    ],
    seasons:[
      {
        seasonId:'season-1',
        startsAt:'2026-09-01T00:00:00Z',
        endsAt:'2026-10-01T00:00:00Z',
        tiers:[
          {tierId:'tier-1',xp:100,rewards:[{type:'cosmetic',itemId:'season-hat'}]}
        ]
      }
    ],
    engagementRewards:[
      {rewardId:'day-2',kind:'daily',threshold:2,rewards:[{type:'stars',amount:1}]},
      {rewardId:'play-10m',kind:'time',threshold:600,rewards:[{type:'xp',amount:75}]}
    ],
    bundles:[
      {
        bundleId:'starter-coins',
        priceType:'coins',
        price:100,
        singleUse:true,
        rewards:[{type:'cosmetic',itemId:'starter-backpack'}]
      },
      {
        bundleId:'marketplace-pack',
        priceType:'marketplace',
        productId:123,
        rewards:[{type:'coins',amount:500}]
      }
    ]
  });
}

describe('Step 6 Roblox LiveOps shell', () => {
  it('advances missions only from matching authoritative events and deduplicates event IDs', () => {
    let state=createLiveOpsState();
    const cfg=catalog();

    let result=recordAuthoritativeLiveOpsEvent(state,cfg,{
      eventId:'evt-1',streamId:'test',sequence:0,type:'daily_completed',
      amount:1,
      at:'2026-09-20T12:00:00Z'
    });
    state=result.state;
    expect(result.completedMissions).toEqual([]);

    result=recordAuthoritativeLiveOpsEvent(state,cfg,{
      eventId:'evt-2',streamId:'test',sequence:1,type:'skill_mastered',
      amount:2,
      at:'2026-09-20T12:01:00Z'
    });
    expect(result.completedMissions).toEqual(['daily-scholar']);
    expect(result.state.missions['daily-scholar'].completed).toBe(true);

    const duplicate=recordAuthoritativeLiveOpsEvent(result.state,cfg,{
      eventId:'evt-2',streamId:'test',sequence:2,type:'skill_mastered',
      amount:99,
      at:'2026-09-20T12:02:00Z'
    });
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.state.counters.skill_mastered).toBe(2);
  });

  it('rejects stale authoritative stream sequences after recent-ID compaction', () => {
    const cfg=catalog();
    let state=createLiveOpsState();

    for(let index=0;index<520;index++){
      const result=recordAuthoritativeLiveOpsEvent(state,cfg,{
        eventId:'bulk-' + index,
        streamId:'quest-events',
        sequence:index,
        type:'play_seconds',
        amount:1,
        at:'2026-09-20T12:00:00Z'
      });
      expect(result.duplicate).toBe(false);
      state=result.state;
    }

    expect(state.processedEventIds).toHaveLength(500);
    expect(state.processedEventIds).not.toContain('bulk-0');

    const replay=recordAuthoritativeLiveOpsEvent(state,cfg,{
      eventId:'bulk-0',
      streamId:'quest-events',
      sequence:0,
      type:'play_seconds',
      amount:999,
      at:'2026-09-20T13:00:00Z'
    });

    expect(replay.duplicate).toBe(true);
    expect(replay.stale).toBe(true);
    expect(replay.state.engagement.playSeconds).toBe(520);
    expect(replay.state.eventStreams['quest-events']).toBe(519);
  });

  it('claims mission rewards once and routes season XP into the configured season', () => {
    const cfg=catalog();
    let state=createLiveOpsState();
    state=recordAuthoritativeLiveOpsEvent(state,cfg,{
      eventId:'a',streamId:'test',sequence:3,type:'daily_completed',amount:1,at:'2026-09-20T12:00:00Z'
    }).state;
    state=recordAuthoritativeLiveOpsEvent(state,cfg,{
      eventId:'b',streamId:'test',sequence:4,type:'skill_mastered',amount:2,at:'2026-09-20T12:01:00Z'
    }).state;

    const claimed=claimMissionReward(state,cfg,'daily-scholar');
    expect(claimed.ok).toBe(true);
    expect(claimed.receipts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({type:'coins',amount:50}),
        expect.objectContaining({type:'seasonXp',amount:100,seasonId:'season-1'})
      ])
    );
    expect(claimed.state.seasons['season-1'].xp).toBe(100);

    const again=claimMissionReward(claimed.state,cfg,'daily-scholar');
    expect(again.ok).toBe(false);
    expect(again.reason).toMatch(/already claimed/);
  });

  it('unlocks season tiers from mission XP without directly mutating player inventory', () => {
    const cfg=catalog();
    const state={
      ...createLiveOpsState(),
      seasons:{'season-1':{xp:100,claimedTiers:{}}}
    };

    const result=claimSeasonTier(state,cfg,'season-1','tier-1',{
      at:'2026-09-20T12:00:00Z'
    });
    expect(result.ok).toBe(true);
    expect(result.receipts).toEqual([
      expect.objectContaining({type:'cosmetic',itemId:'season-hat'})
    ]);
    expect(result).not.toHaveProperty('inventory');
  });

  it('tracks consecutive visits and play-time rewards idempotently', () => {
    const cfg=catalog();
    let state=createLiveOpsState();
    state=recordLiveOpsVisit(state,{at:'2026-09-20T09:00:00Z'});
    state=recordLiveOpsVisit(state,{at:'2026-09-21T09:00:00Z'});
    expect(state.engagement.streak).toBe(2);

    const daily=claimEngagementReward(state,cfg,'day-2');
    expect(daily.ok).toBe(true);
    expect(daily.receipts[0]).toEqual(expect.objectContaining({type:'stars',amount:1}));

    state=recordAuthoritativeLiveOpsEvent(daily.state,cfg,{
      eventId:'play',streamId:'test',sequence:5,type:'play_seconds',
      amount:600,
      at:'2026-09-21T10:00:00Z'
    }).state;
    const time=claimEngagementReward(state,cfg,'play-10m');
    expect(time.ok).toBe(true);
    expect(time.receipts[0]).toEqual(expect.objectContaining({type:'xp',amount:75}));
  });

  it('authorizes in-game-currency bundles but never trusts marketplace purchases without a platform receipt', () => {
    const cfg=catalog();
    const state=createLiveOpsState();

    const poor=authorizeCoinBundlePurchase(state,cfg,'starter-coins',{coins:50});
    expect(poor.ok).toBe(false);

    const bought=authorizeCoinBundlePurchase(state,cfg,'starter-coins',{coins:150});
    expect(bought.ok).toBe(true);
    expect(bought.coinsDelta).toBe(-100);
    expect(bought.receipts[0]).toEqual(expect.objectContaining({itemId:'starter-backpack'}));

    const second=authorizeCoinBundlePurchase(bought.state,cfg,'starter-coins',{coins:150});
    expect(second.ok).toBe(false);

    const marketplace=authorizeCoinBundlePurchase(state,cfg,'marketplace-pack',{coins:9999});
    expect(marketplace.ok).toBe(false);
    expect(marketplace.reason).toMatch(/platform receipt/);
  });
});
