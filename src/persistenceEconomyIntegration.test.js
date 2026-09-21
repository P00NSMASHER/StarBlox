// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyPermanentPurchase,
  applyQuestCompletion,
  beginQuestReceipt
} from './persistenceTransactions';
import { loadLocalSnapshot, persistSnapshot } from './storage';

const originalIndexedDbDescriptor = Object.getOwnPropertyDescriptor(globalThis,'indexedDB');

function setIndexedDb(value){
  Object.defineProperty(globalThis,'indexedDB',{
    configurable:true,
    writable:true,
    value
  });
}

beforeEach(() => {
  localStorage.clear();
  setIndexedDb(undefined);
});

afterEach(() => {
  localStorage.clear();
  if(originalIndexedDbDescriptor){
    Object.defineProperty(globalThis,'indexedDB',originalIndexedDbDescriptor);
  }else{
    delete globalThis.indexedDB;
  }
});

describe('persistence/economy transaction reload integration', () => {
  it('persists a permanent purchase receipt across reload and cannot charge the same item twice', () => {
    const initial = {
      stateVersion:2,
      coins:140,
      stars:3,
      xp:25,
      starWorth:20,
      owned:['tops-1'],
      equipped:{top:'tops-1'},
      roomDecor:['beds-1'],
      dreamGoalId:'future-no-art-item',
      daily:{quests:0,transfers:0,purchase:0},
      purchaseReceipts:[]
    };
    const item = {
      id:'future-no-art-item',
      price:60,
      starReq:0
    };

    const purchase = applyPermanentPurchase(initial,item);
    expect(purchase.status).toBe('PURCHASED');
    persistSnapshot(purchase.state);

    const reloaded = loadLocalSnapshot();
    expect(reloaded).toMatchObject({
      coins:80,
      stars:3,
      xp:25,
      starWorth:80,
      owned:['tops-1','future-no-art-item'],
      equipped:{top:'tops-1'},
      roomDecor:['beds-1'],
      dreamGoalId:'future-no-art-item',
      daily:{purchase:1},
      purchaseReceipts:['future-no-art-item']
    });

    const replay = applyPermanentPurchase(reloaded,item);
    expect(replay.status).toBe('ALREADY_OWNED');
    expect(replay.state.coins).toBe(80);
    expect(replay.state.starWorth).toBe(80);
    expect(replay.state.daily.purchase).toBe(1);
  });

  it('restores ownership from a durable receipt after a malformed partial snapshot without charging again', () => {
    persistSnapshot({
      stateVersion:2,
      coins:35,
      stars:0,
      xp:10,
      starWorth:90,
      owned:[],
      purchaseReceipts:['future-no-art-item'],
      daily:{quests:0,transfers:0,purchase:1},
      dreamGoalId:'future-no-art-item'
    });

    const reloaded = loadLocalSnapshot();
    const restored = applyPermanentPurchase(reloaded,{
      id:'future-no-art-item',
      price:90,
      starReq:0
    });

    expect(restored.status).toBe('RESTORED_FROM_RECEIPT');
    expect(restored.state.coins).toBe(35);
    expect(restored.state.starWorth).toBe(90);
    expect(restored.state.owned).toEqual(['future-no-art-item']);
    expect(restored.state.daily.purchase).toBe(1);
    expect(restored.state.dreamGoalId).toBe('future-no-art-item');
  });

  it('persists final Quest completion across reload and rejects reward replay', () => {
    const active = beginQuestReceipt({
      stateVersion:2,
      coins:22,
      stars:1,
      xp:70,
      starWorth:100,
      owned:['tops-1'],
      equipped:{top:'tops-1'},
      roomDecor:['beds-1'],
      mastered:['reading'],
      transferWins:2,
      districtProgress:{'Story Street':3},
      companionBond:7,
      questsCompleted:4,
      daily:{quests:1,transfers:1,purchase:0},
      activeQuestReceipt:'',
      lastCompletedQuestReceipt:''
    },'quest-reload-proof');

    const completion = applyQuestCompletion(active,'quest-reload-proof');
    expect(completion.status).toBe('COMPLETED');
    persistSnapshot(completion.state);

    const reloaded = loadLocalSnapshot();
    expect(reloaded).toMatchObject({
      coins:52,
      stars:1,
      xp:100,
      starWorth:100,
      owned:['tops-1'],
      equipped:{top:'tops-1'},
      roomDecor:['beds-1'],
      mastered:['reading'],
      transferWins:2,
      districtProgress:{'Story Street':3},
      companionBond:8,
      questsCompleted:5,
      daily:{quests:2,transfers:1,purchase:0},
      activeQuestReceipt:'',
      lastCompletedQuestReceipt:'quest-reload-proof'
    });

    const replay = applyQuestCompletion(reloaded,'quest-reload-proof');
    expect(replay.status).toBe('ALREADY_COMPLETED');
    expect(replay.state.coins).toBe(52);
    expect(replay.state.xp).toBe(100);
    expect(replay.state.questsCompleted).toBe(5);
    expect(replay.state.companionBond).toBe(8);
    expect(replay.state.daily.quests).toBe(2);
  });
});
