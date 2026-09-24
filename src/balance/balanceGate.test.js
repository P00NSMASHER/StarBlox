import { describe,expect,it } from 'vitest';
import {
  IDENTITY_BALANCE,
  balanceQuestReward,
  balanceQuestStructure,
  getBalance,
  loadRemoteBalance,
  resetBalance,
  resolveBalanceDoc,
  setBalanceDoc
} from './balanceConfig';
import {
  buildBalanceReport,
  gateBalanceCandidate
} from './balanceGate';

describe('StarBlox bounded remote balance config', () => {
  it('treats missing config as an exact identity no-op', () => {
    const {resolved,diagnostics}=resolveBalanceDoc(null);
    expect(resolved).toEqual(IDENTITY_BALANCE);
    expect(diagnostics).toEqual([]);

    const reward={
      coins:10,xp:16,stars:1,transferEvidence:1,districtProgress:1,masteryAwarded:true
    };
    expect(balanceQuestReward(reward,{correct:true,balance:resolved})).toEqual(reward);
    expect(balanceQuestStructure({stageCount:5,optionalCount:3,balance:resolved})).toEqual({
      stageCount:5,optionalCount:3
    });
  });

  it('clamps unsafe requested values while reporting every clamp', () => {
    const {resolved,diagnostics}=resolveBalanceDoc({
      version:'  wild<>version ',
      economy:{coinsMult:99,xpMult:-5,retryXpMult:2},
      quest:{difficultyMult:7,stageCountOffset:99,optionalCountOffset:-99}
    });

    expect(resolved.version).toBe('wildversion');
    expect(resolved.economy.coinsMult).toBe(1.25);
    expect(resolved.economy.xpMult).toBe(0.75);
    expect(resolved.economy.retryXpMult).toBe(1.5);
    expect(resolved.quest.difficultyMult).toBe(1.25);
    expect(resolved.quest.stageCountOffset).toBe(2);
    expect(resolved.quest.optionalCountOffset).toBe(-2);
    expect(diagnostics.length).toBeGreaterThanOrEqual(6);
  });

  it('never allows remote balance to manufacture Stars or evidence', () => {
    const {resolved}=resolveBalanceDoc({
      economy:{coinsMult:1.25,xpMult:1.25}
    });
    const out=balanceQuestReward({
      coins:10,
      xp:16,
      stars:1,
      transferEvidence:1,
      districtProgress:1,
      masteryAwarded:true
    },{correct:true,balance:resolved});

    expect(out.coins).toBe(13);
    expect(out.xp).toBe(20);
    expect(out.stars).toBe(1);
    expect(out.transferEvidence).toBe(1);
    expect(out.districtProgress).toBe(1);
    expect(out.masteryAwarded).toBe(true);
  });

  it('falls back to identity when the remote provider fails', async () => {
    setBalanceDoc({version:'temporary',economy:{coinsMult:1.2}});
    expect(getBalance().version).toBe('temporary');

    await loadRemoteBalance(async () => {
      throw new Error('offline');
    },{timeoutMs:20});

    expect(getBalance()).toEqual(IDENTITY_BALANCE);
    resetBalance();
  });
});

describe('StarBlox automated balance gates', () => {
  it('produces a deterministic identity report with fully certified generated levels', () => {
    const a=buildBalanceReport(IDENTITY_BALANCE,{sessionSeeds:24,levelSeeds:24});
    const b=buildBalanceReport(IDENTITY_BALANCE,{sessionSeeds:24,levelSeeds:24});

    expect(a).toEqual(b);
    expect(a.levels.certificateRate).toBe(1);
    expect(a.levels.failures).toEqual([]);
    expect(a.profiles.map(row => row.profile)).toEqual(['emerging','on-track','advanced']);
    expect(a.profiles[0].firstTryRate).toBeLessThanOrEqual(a.profiles[1].firstTryRate);
    expect(a.profiles[1].firstTryRate).toBeLessThanOrEqual(a.profiles[2].firstTryRate);
  });

  it('passes a modest bounded tuning candidate', () => {
    const result=gateBalanceCandidate({
      version:'candidate-safe',
      economy:{coinsMult:1.05,xpMult:1.05},
      quest:{difficultyMult:1.03}
    },{sessionSeeds:32,levelSeeds:32});

    expect(result.ok,result.failures).toBe(true);
    expect(result.current.levels.certificateRate).toBe(1);
  });

  it('fails a candidate whose requested values had to be safety-clamped', () => {
    const result=gateBalanceCandidate({
      version:'candidate-unsafe',
      economy:{coinsMult:5},
      quest:{difficultyMult:4}
    },{sessionSeeds:16,levelSeeds:16});

    expect(result.ok).toBe(false);
    expect(result.failures.some(failure => failure.type === 'unsafe-request')).toBe(true);
  });

  it('fails large economy or pacing regressions even when values are within runtime clamps', () => {
    const result=gateBalanceCandidate({
      version:'candidate-regression',
      economy:{coinsMult:1.25,xpMult:1.25},
      quest:{stageCountOffset:2}
    },{sessionSeeds:32,levelSeeds:32});

    expect(result.ok).toBe(false);
    expect(result.failures.some(failure =>
      ['action-load','coin-economy','xp-economy'].includes(failure.type)
    )).toBe(true);
  });

  it('keeps all generated levels certified under the maximum safe structure knobs', () => {
    const report=buildBalanceReport({
      version:'max-structure',
      quest:{stageCountOffset:2,optionalCountOffset:3}
    },{sessionSeeds:8,levelSeeds:100});

    expect(report.levels.structure).toEqual({stageCount:7,optionalCount:6});
    expect(report.levels.certificateRate).toBe(1);
  });
});
