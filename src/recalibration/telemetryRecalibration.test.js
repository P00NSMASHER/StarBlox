
import { describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import {
  getQuestionRef,
  importLegacyQuestionBank
} from '../questionBank/questionBankV2.js';
import { DEFAULT_POLICY_WEIGHTS } from '../intelligence/questionPolicy.js';
import {
  assertRecalibrationReviewable,
  buildTelemetryRecalibrationProposal,
  normalizeTrustedTelemetry,
  TRUSTED_TELEMETRY_SOURCE,
  verifyRecalibrationProposal
} from './telemetryRecalibration.js';

function bank(){
  return importLegacyQuestionBank(gameModel.buildQuestions(),{
    bankId:'recalibration-bank',
    title:'Recalibration Bank'
  });
}

function questionFixture(){
  const value=bank();
  const question=gameModel.buildQuestions().find(item => item.difficulty === 3) || gameModel.buildQuestions()[0];
  const ref=getQuestionRef(value,question.id);
  return {bank:value,ref};
}

function questionEvent(ref,index,{
  correct=index % 4 === 0,
  theta=1.5,
  standardError=0.5,
  wasRetry=false
}={}){
  return {
    eventId:'q-' + index,
    kind:'question_response',
    source:TRUSTED_TELEMETRY_SOURCE,
    occurredAt:new Date(Date.parse('2026-09-01T00:00:00Z') + index * 1000).toISOString(),
    questionRef:ref,
    correct,
    wasRetry,
    theta,
    abilityStandardError:standardError,
    responseMs:1200 + index
  };
}

function policyEvent(index){
  const positive=index % 2 === 0;
  return {
    eventId:'p-' + index,
    kind:'policy_outcome',
    source:TRUSTED_TELEMETRY_SOURCE,
    occurredAt:new Date(Date.parse('2026-09-02T00:00:00Z') + index * 1000).toISOString(),
    utility:positive ? 1 : 0,
    signals:{
      memory:positive ? 0.95 : 0.05,
      irt:0.5,
      entropy:0.5,
      novelty:0.5,
      gameplay:0.5,
      quality:0.5
    }
  };
}

function sessionEvent(index,{
  firstTryRate=0.4,
  actions=10,
  coins=200,
  xp=300
}={}){
  return {
    eventId:'s-' + index,
    kind:'session_summary',
    source:TRUSTED_TELEMETRY_SOURCE,
    occurredAt:new Date(Date.parse('2026-09-03T00:00:00Z') + index * 1000).toISOString(),
    firstTryRate,
    actions,
    coins,
    xp,
    completed:true
  };
}

describe('Step 22: trusted telemetry normalization', () => {
  it('rejects untrusted or identifying telemetry before recalibration', () => {
    const rows=[
      {
        eventId:'bad-source',
        kind:'session_summary',
        source:'client',
        occurredAt:'2026-09-01T00:00:00Z',
        firstTryRate:0.5,
        actions:8,
        coins:100,
        xp:150
      },
      {
        eventId:'pii',
        kind:'policy_outcome',
        source:TRUSTED_TELEMETRY_SOURCE,
        occurredAt:'2026-09-01T00:00:01Z',
        playerId:'player-123',
        utility:1,
        signals:{
          memory:1,irt:1,entropy:1,novelty:1,gameplay:1,quality:1
        }
      }
    ];

    const normalized=normalizeTrustedTelemetry(rows);
    expect(normalized.accepted).toHaveLength(0);
    expect(normalized.rejected).toHaveLength(2);
    expect(normalized.rejected.map(row => row.reason).join(' ')).toMatch(/untrusted|forbidden/);
  });

  it('deduplicates event IDs and makes fingerprints independent of input order', () => {
    const events=[policyEvent(1),policyEvent(2),policyEvent(3)];
    const a=normalizeTrustedTelemetry(events);
    const b=normalizeTrustedTelemetry([...events].reverse());

    expect(a.dataFingerprint).toBe(b.dataFingerprint);

    const duplicate=normalizeTrustedTelemetry([events[0],events[0]]);
    expect(duplicate.accepted).toHaveLength(1);
    expect(duplicate.rejected[0].reason).toMatch(/duplicate eventId/);
  });
});

describe('Step 22: question IRT recalibration proposals', () => {
  it('requires enough mixed non-retry responses before proposing an item change', () => {
    const fixture=questionFixture();
    const low=Array.from({length:8},(_,index) => questionEvent(fixture.ref,index,{
      correct:index % 2 === 0
    }));

    const proposal=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events:low,
      options:{
        minItemResponses:20,
        minOutcomeCount:4,
        minPolicyOutcomes:999,
        minSessionSummaries:999
      }
    });

    expect(proposal.itemCalibrations).toHaveLength(0);
    expect(proposal.itemDiagnostics.some(row => row.status === 'insufficient_data')).toBe(true);
    expect(proposal.review.readyForHumanReview).toBe(false);
    expect(proposal.review.blockers).toContain('no statistically supported recalibration changes');
  });

  it('proposes a bounded harder item when high-ability players miss far more often than expected', () => {
    const fixture=questionFixture();
    const events=Array.from({length:40},(_,index) => questionEvent(fixture.ref,index,{
      correct:index < 10,
      theta:1.5,
      standardError:0.45
    }));

    const proposal=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      options:{
        minItemResponses:30,
        minOutcomeCount:5,
        minPolicyOutcomes:999,
        minSessionSummaries:999,
        maxDifficultyDelta:0.25,
        maxDiscriminationDelta:0.10,
        calibrationTolerance:0.001
      }
    });

    expect(proposal.itemCalibrations).toHaveLength(1);
    const item=proposal.itemCalibrations[0];
    expect(item.responses).toBe(40);
    expect(item.observedRate).toBe(0.25);
    expect(item.expectedRate).toBeGreaterThan(item.observedRate);
    expect(item.after.difficulty).toBeGreaterThan(item.before.difficulty);
    expect(item.deltas.difficulty).toBeLessThanOrEqual(0.25 + 1e-12);
    expect(Math.abs(item.deltas.discrimination)).toBeLessThanOrEqual(0.10 + 1e-12);
    expect(item.status).toBe('review_change');
    expect(proposal.review.readyForHumanReview).toBe(true);
    expect(assertRecalibrationReviewable(proposal)).toBe(true);
  });

  it('excludes retry evidence and stale/mismatched QuestionVersion hashes', () => {
    const fixture=questionFixture();
    const stale={...fixture.ref,contentHash:'fnv1a32:deadbeef'};
    const events=[
      ...Array.from({length:30},(_,index) => questionEvent(fixture.ref,index,{
        correct:index % 2 === 0,
        wasRetry:true
      })),
      questionEvent(stale,100,{correct:false})
    ];

    const proposal=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      options:{
        minItemResponses:10,
        minOutcomeCount:2,
        minPolicyOutcomes:999,
        minSessionSummaries:999
      }
    });

    expect(proposal.itemCalibrations).toHaveLength(0);
    expect(proposal.telemetryCounts.rejected).toBe(1);
    expect(Object.keys(proposal.rejectionCounts.reasons).join(' ')).toMatch(/QuestionVersion/);
  });
});

describe('Step 22: policy-weight recalibration', () => {
  it('nudges only within conservative relative bounds using trusted multi-objective utility telemetry', () => {
    const fixture=questionFixture();
    const events=Array.from({length:240},(_,index) => policyEvent(index));

    const proposal=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      policyWeights:DEFAULT_POLICY_WEIGHTS,
      options:{
        minItemResponses:999,
        minPolicyOutcomes:200,
        maxPolicyRelativeDelta:0.10,
        minSessionSummaries:999
      }
    });

    expect(proposal.policy.status).toBe('review_change');
    expect(proposal.policy.samples).toBe(240);
    expect(proposal.policy.correlations.memory).toBeGreaterThan(0.99);
    expect(proposal.policy.after.memory).toBeGreaterThan(proposal.policy.before.memory);
    expect(
      Object.values(proposal.policy.after).reduce((sum,value) => sum + value,0)
    ).toBeCloseTo(1,12);
    expect(proposal.review.readyForHumanReview).toBe(true);
  });
});

describe('Step 22: telemetry-driven balance candidates', () => {
  it('moves economy and difficulty only a small amount and requires the deterministic balance gate to pass', () => {
    const fixture=questionFixture();
    const events=Array.from({length:60},(_,index) => sessionEvent(index));

    const proposal=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      balanceTargets:{
        firstTryRate:[0.60,0.75],
        avgCoins:[100,120],
        avgXp:[150,170]
      },
      options:{
        minItemResponses:999,
        minPolicyOutcomes:999,
        minSessionSummaries:50,
        maxEconomyRelativeDelta:0.01,
        maxDifficultyRelativeDelta:0.01,
        balanceGateOptions:{sessionSeeds:16,levelSeeds:16}
      }
    });

    expect(proposal.balance.status).toBe('review_change');
    expect(proposal.balance.aggregate.samples).toBe(60);
    expect(proposal.balance.candidate.economy.coinsMult).toBeCloseTo(0.99,12);
    expect(proposal.balance.candidate.economy.xpMult).toBeCloseTo(0.99,12);
    expect(proposal.balance.candidate.quest.difficultyMult).toBeCloseTo(0.99,12);
    expect(proposal.balance.gate.ok,proposal.balance.gate.failures).toBe(true);
    expect(proposal.review.readyForHumanReview).toBe(true);
  });

  it('does not create a fake balance change from a candidate version label alone', () => {
    const fixture=questionFixture();
    const events=Array.from({length:60},(_,index) => sessionEvent(index,{
      firstTryRate:0.65,
      coins:110,
      xp:160
    }));

    const proposal=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      balanceTargets:{
        firstTryRate:[0.60,0.75],
        avgCoins:[100,120],
        avgXp:[150,170]
      },
      options:{
        minItemResponses:999,
        minPolicyOutcomes:999,
        minSessionSummaries:50,
        balanceGateOptions:{sessionSeeds:8,levelSeeds:8}
      }
    });

    expect(proposal.balance.status).toBe('stable');
    expect(proposal.balance.before.economy).toEqual(proposal.balance.candidate.economy);
    expect(proposal.balance.before.quest).toEqual(proposal.balance.candidate.quest);
  });
});

describe('Step 22: proposal integrity and determinism', () => {
  it('produces the same proposal for the same evidence regardless of input ordering', () => {
    const fixture=questionFixture();
    const events=[
      ...Array.from({length:40},(_,index) => questionEvent(fixture.ref,index,{
        correct:index < 12
      })),
      ...Array.from({length:220},(_,index) => policyEvent(index))
    ];

    const options={
      minItemResponses:30,
      minOutcomeCount:5,
      minPolicyOutcomes:200,
      minSessionSummaries:999
    };

    const a=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      options
    });
    const b=buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events:[...events].reverse(),
      options
    });

    expect(b).toEqual(a);
    expect(verifyRecalibrationProposal(a)).toEqual({ok:true,errors:[]});
    expect(a.review.autoApply).toBe(false);
  });

  it('detects proposal tampering and never permits auto-apply semantics', () => {
    const fixture=questionFixture();
    const events=Array.from({length:220},(_,index) => policyEvent(index));
    const proposal=JSON.parse(JSON.stringify(buildTelemetryRecalibrationProposal({
      bank:fixture.bank,
      events,
      options:{
        minItemResponses:999,
        minPolicyOutcomes:200,
        minSessionSummaries:999
      }
    })));

    proposal.review.autoApply=true;
    const validation=verifyRecalibrationProposal(proposal);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/auto-apply|hash/);
  });
});
