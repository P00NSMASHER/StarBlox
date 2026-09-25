import { describe,expect,it } from 'vitest';
import {
  createPlaytestRun,
  finalizePlaytestRun,
  recordPlaytestScreen,
  verifyPlaytestReceipt
} from './playtestEvidence.js';

describe('human playtest evidence receipts', () => {
  it('creates a tamper-evident external positive playtest receipt without PII', () => {
    let run=createPlaytestRun({
      runId:'pt-1',
      startedAt:'2026-09-25T14:00:00Z',
      testerContext:'supervised_minor_external',
      consentConfirmed:true,
      saveSnapshot:{coins:10,stars:1,questsCompleted:2,transferWins:1,mastered:['a']}
    });
    run=recordPlaytestScreen(run,{screen:'world',at:'2026-09-25T14:00:01Z'});
    run=recordPlaytestScreen(run,{screen:'quest',at:'2026-09-25T14:01:00Z'});
    const receipt=finalizePlaytestRun(run,{
      endedAt:'2026-09-25T14:10:00Z',
      feedback:'positive',
      wouldPlayAgain:true,
      saveSnapshot:{coins:25,stars:2,questsCompleted:3,transferWins:2,mastered:['a','b']}
    });

    expect(verifyPlaytestReceipt(receipt)).toEqual({ok:true,errors:[]});
    expect(receipt.externalEvidenceEligible).toBe(true);
    expect(receipt.outcomeClassification).toBe('PLAYTEST_POSITIVE_SIGNAL');
    expect(receipt.retentionEligible).toBe(false);
    expect(receipt.progressDelta.questsCompleted).toBe(1);
    expect(receipt.progressDelta.transferWins).toBe(1);
    expect(JSON.stringify(receipt)).not.toMatch(/email|phone|address|deviceId|playerName/i);
  });

  it('never treats internal testing as external outcome evidence', () => {
    const run=createPlaytestRun({
      runId:'pt-internal',
      startedAt:'2026-09-25T14:00:00Z',
      testerContext:'internal_staff',
      consentConfirmed:true
    });
    const receipt=finalizePlaytestRun(run,{
      endedAt:'2026-09-25T14:05:00Z',
      feedback:'positive',
      wouldPlayAgain:true
    });
    expect(receipt.externalEvidenceEligible).toBe(false);
    expect(verifyPlaytestReceipt(receipt).ok).toBe(true);
  });

  it('keeps neutral feedback unclassified and non-allocation evidence', () => {
    const run=createPlaytestRun({
      runId:'pt-neutral',
      startedAt:'2026-09-25T14:00:00Z',
      testerContext:'adult_external',
      consentConfirmed:true
    });
    const receipt=finalizePlaytestRun(run,{
      endedAt:'2026-09-25T14:01:00Z',
      feedback:'neutral',
      wouldPlayAgain:false
    });
    expect(receipt.outcomeClassification).toBe('UNCLASSIFIED');
    expect(receipt.externalEvidenceEligible).toBe(false);
  });

  it('requires explicit consent', () => {
    expect(() => createPlaytestRun({
      runId:'pt-no-consent',
      startedAt:'2026-09-25T14:00:00Z',
      testerContext:'adult_external',
      consentConfirmed:false
    })).toThrow(/consent/i);
  });

  it('detects receipt tampering', () => {
    const run=createPlaytestRun({
      runId:'pt-tamper',
      startedAt:'2026-09-25T14:00:00Z',
      testerContext:'adult_external',
      consentConfirmed:true
    });
    const receipt=finalizePlaytestRun(run,{
      endedAt:'2026-09-25T14:02:00Z',
      feedback:'negative',
      wouldPlayAgain:false
    });
    const tampered=JSON.parse(JSON.stringify(receipt));
    tampered.feedback.overall='positive';
    expect(verifyPlaytestReceipt(tampered).ok).toBe(false);
  });
});
