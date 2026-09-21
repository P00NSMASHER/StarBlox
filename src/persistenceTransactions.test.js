import { describe, expect, it } from 'vitest';
import {
  applyPermanentPurchase,
  applyQuestCompletion,
  beginQuestReceipt
} from './persistenceTransactions';

describe('durable persistence transactions', () => {
  it('revalidates permanent purchase eligibility inside the transaction and charges once', () => {
    const initial = {
      coins:100,
      stars:2,
      starWorth:10,
      owned:['tops-1'],
      purchaseReceipts:[],
      daily:{quests:0,transfers:0,purchase:0}
    };
    const item = {id:'tops-2',price:60,starReq:0};

    const first = applyPermanentPurchase(initial,item);
    expect(first.status).toBe('PURCHASED');
    expect(first.state).toMatchObject({
      coins:40,
      starWorth:70,
      owned:['tops-1','tops-2'],
      purchaseReceipts:['tops-2'],
      daily:{purchase:1}
    });

    const replay = applyPermanentPurchase(first.state,item);
    expect(replay.status).toBe('ALREADY_OWNED');
    expect(replay.state).toBe(first.state);
    expect(replay.state.coins).toBe(40);
    expect(replay.state.starWorth).toBe(70);
    expect(replay.state.daily.purchase).toBe(1);
  });

  it('blocks a stale purchase when current transaction state no longer has enough currency or stars', () => {
    const item = {id:'beds-2',price:75,starReq:3};

    const locked = applyPermanentPurchase({
      coins:100,
      stars:2,
      starWorth:0,
      owned:[],
      daily:{purchase:0}
    },item);
    expect(locked.status).toBe('LOCKED');

    const short = applyPermanentPurchase({
      coins:50,
      stars:3,
      starWorth:0,
      owned:[],
      daily:{purchase:0}
    },item);
    expect(short.status).toBe('INSUFFICIENT_COINS');
  });

  it('uses a durable receipt to restore ownership without charging again', () => {
    const repaired = applyPermanentPurchase({
      coins:25,
      stars:0,
      starWorth:80,
      owned:[],
      purchaseReceipts:['decor-2'],
      daily:{purchase:1}
    },{id:'decor-2',price:80,starReq:0});

    expect(repaired.status).toBe('RESTORED_FROM_RECEIPT');
    expect(repaired.state.coins).toBe(25);
    expect(repaired.state.starWorth).toBe(80);
    expect(repaired.state.owned).toEqual(['decor-2']);
    expect(repaired.state.daily.purchase).toBe(1);
  });

  it('persists the final quest reward atomically and rejects replay of the same completion receipt', () => {
    const active = beginQuestReceipt({
      coins:12,
      xp:40,
      questsCompleted:2,
      companionBond:4,
      daily:{quests:0,transfers:0,purchase:0},
      activeQuestReceipt:'',
      lastCompletedQuestReceipt:''
    },'quest-run-1');

    const completed = applyQuestCompletion(active,'quest-run-1');
    expect(completed.status).toBe('COMPLETED');
    expect(completed.state).toMatchObject({
      coins:42,
      xp:70,
      questsCompleted:3,
      companionBond:5,
      activeQuestReceipt:'',
      lastCompletedQuestReceipt:'quest-run-1',
      daily:{quests:1}
    });

    const replay = applyQuestCompletion(completed.state,'quest-run-1');
    expect(replay.status).toBe('ALREADY_COMPLETED');
    expect(replay.state).toBe(completed.state);
  });

  it('does not award a stale or unknown quest completion receipt', () => {
    const active = beginQuestReceipt({
      coins:0,
      xp:0,
      questsCompleted:0,
      companionBond:0,
      daily:{quests:0}
    },'quest-run-current');

    const stale = applyQuestCompletion(active,'quest-run-old');
    expect(stale.status).toBe('STALE_RECEIPT');
    expect(stale.state).toBe(active);
  });
});
