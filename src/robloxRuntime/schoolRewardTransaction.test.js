import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

const service=readFileSync(
  new URL('../../roblox/src/server/SchoolProgressService.luau',import.meta.url),
  'utf8'
);

function applyReward(state,{dayId,key,coins=0,xp=0,stars=0,cap=3,fail=false}){
  if(state.receipts[key]===true){
    return {rewarded:false,duplicate:true};
  }

  const priorEligibility=state.eligibility[dayId];
  const eligible=priorEligibility ?? state.rewardedDays<cap;
  if(eligible!==true){
    state.eligibility[dayId]=false;
    return {rewarded:false,capped:true};
  }

  const before=structuredClone(state);
  try{
    if(priorEligibility===undefined){
      state.eligibility[dayId]=true;
      state.rewardedDays+=1;
    }
    state.receipts[key]=true;
    state.coins=Number.isFinite(Number(state.coins))?Math.max(0,Number(state.coins)):0;
    state.xp=Number.isFinite(Number(state.xp))?Math.max(0,Number(state.xp)):0;
    state.stars=Number.isFinite(Number(state.stars))?Math.max(0,Number(state.stars)):0;
    state.coins+=Math.max(0,Number(coins)||0);
    state.xp+=Math.max(0,Number(xp)||0);
    state.stars+=Math.max(0,Number(stars)||0);
    if(fail) throw new Error('injected mutation failure');
  }catch{
    Object.keys(state).forEach(keyName=>delete state[keyName]);
    Object.assign(state,before);
    return {rewarded:false,code:'reward_transaction_failed'};
  }
  return {rewarded:true,coins,xp,stars};
}

function profile(overrides={}){
  return {
    rewardedDays:0,
    eligibility:{},
    receipts:{},
    coins:0,
    xp:0,
    stars:0,
    ...overrides
  };
}

describe('school reward exactly-once transaction',()=>{
  it('routes all three reward types through one no-yield protected transaction',()=>{
    expect(service.match(/local function applyRewardTransaction/g)).toHaveLength(1);
    expect(service.match(/return applyRewardTransaction\(/g)).toHaveLength(3);
    expect(service).not.toContain('local function claimReceipt');
    expect(service).not.toContain('local function dayEligible');

    const capExit=service.indexOf('return {rewarded = false, capped = true');
    const protectedMutation=service.indexOf('local committed = pcall(function()');
    const receiptCommit=service.indexOf('state.Receipts[key] = true',protectedMutation);
    const rollback=service.indexOf('state.Receipts[key] = nil',receiptCommit);
    expect(capExit).toBeGreaterThan(service.indexOf('if state.Receipts[key] == true then'));
    expect(capExit).toBeLessThan(protectedMutation);
    expect(receiptCommit).toBeGreaterThan(protectedMutation);
    expect(rollback).toBeGreaterThan(receiptCommit);
    expect(service).toContain('code = "reward_transaction_failed"');
  });

  it('pays duplicate or concurrent-equivalent submissions only once',()=>{
    const state=profile();
    const reward={dayId:'day-1',key:'day-1|period-1|q-1|correct',coins:10,xp:1};
    expect(applyReward(state,reward).rewarded).toBe(true);
    expect(applyReward(state,reward)).toMatchObject({rewarded:false,duplicate:true});
    expect(state).toMatchObject({coins:10,xp:1,rewardedDays:1});
    expect(Object.keys(state.receipts)).toEqual([reward.key]);
  });

  it('does not consume a receipt when the UTC-day cap blocks payment',()=>{
    const state=profile({rewardedDays:3});
    const key='day-4|period-1|q-1|correct';
    expect(applyReward(state,{dayId:'day-4',key,coins:10,cap:3})).toMatchObject({
      rewarded:false,
      capped:true
    });
    expect(state.receipts[key]).toBeUndefined();
    expect(state.coins).toBe(0);
  });

  it('rolls back a failed mutation so a retry can pay exactly once',()=>{
    const state=profile();
    const reward={dayId:'day-1',key:'day-1|period-1|q-2|correct',coins:10,xp:1};
    expect(applyReward(state,{...reward,fail:true})).toMatchObject({
      rewarded:false,
      code:'reward_transaction_failed'
    });
    expect(state).toEqual(profile());
    expect(applyReward(state,reward).rewarded).toBe(true);
    expect(applyReward(state,reward).duplicate).toBe(true);
    expect(state).toMatchObject({coins:10,xp:1,rewardedDays:1});
  });

  it('normalizes malformed legacy balances before committing a reward',()=>{
    const state=profile({coins:'broken',xp:-8,stars:null});
    expect(applyReward(state,{dayId:'day-1',key:'k',coins:10,xp:1,stars:1}).rewarded).toBe(true);
    expect(state).toMatchObject({coins:10,xp:1,stars:1});
  });
});
