import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BKT_PARAMS,
  MASTERY_THRESHOLD,
  applyShadowObservation,
  nextSm2Schedule,
  scoreMicroChallengeCandidate,
  selectMicroChallenge,
  updateBktMastery
} from './masteryShadowModel';

describe('shadow mastery model', () => {
  it('matches the expected BKT direction and converges after repeated correct evidence', () => {
    const afterCorrect = updateBktMastery(0.3,true);
    const afterWrong = updateBktMastery(0.7,false);
    expect(afterCorrect).toBeGreaterThan(0.3);
    expect(afterWrong).toBeLessThan(0.7);

    let mastery = DEFAULT_BKT_PARAMS.pKnow;
    for(let i=0;i<20;i++) mastery = updateBktMastery(mastery,true);
    expect(mastery).toBeGreaterThan(0.95);
    expect(mastery).toBeLessThanOrEqual(1);
  });

  it('implements the SM-2 1, 6, previous*ease sequence and failure reset', () => {
    const first = nextSm2Schedule({quality:5,repetitions:0,easeFactor:2.5,interval:0});
    expect(first).toMatchObject({interval:1,repetitions:1});

    const second = nextSm2Schedule({quality:5,...first});
    expect(second.interval).toBe(6);
    expect(second.repetitions).toBe(2);

    const third = nextSm2Schedule({quality:5,...second});
    expect(third.interval).toBeCloseTo(6 * second.easeFactor,10);

    const failed = nextSm2Schedule({quality:2,repetitions:8,easeFactor:2.1,interval:40});
    expect(failed).toEqual({interval:1,easeFactor:2.1,repetitions:0});
  });

  it('does not let retries or non-mastery items create shadow mastery evidence', () => {
    const initial = {mastery:0.4,repetitions:1,easeFactor:2.5,interval:1};
    expect(applyShadowObservation(initial,{correct:true,firstAttempt:false,now:1000}))
      .toMatchObject(initial);
    expect(applyShadowObservation(initial,{correct:true,masteryEligible:false,now:1000}))
      .toMatchObject(initial);
  });

  it('selects stale/due struggle-zone skills and excludes mastered/unseen-zone skills', () => {
    const now = Date.UTC(2026,8,22);
    const chosen = selectMicroChallenge([
      {
        skill:'spelling',
        state:{mastery:0.45,bktUpdatedAt:now-9*86400000,nextReviewAt:now-1000,lastChallengeAt:0}
      },
      {
        skill:'vocabulary',
        state:{mastery:0.52,bktUpdatedAt:now-1*86400000,nextReviewAt:now+86400000,lastChallengeAt:0}
      },
      {
        skill:'mastered-skill',
        state:{mastery:MASTERY_THRESHOLD,bktUpdatedAt:now-20*86400000,nextReviewAt:now-1}
      },
      {
        skill:'diagnose-first',
        state:{mastery:0.1,bktUpdatedAt:now-20*86400000,nextReviewAt:now-1}
      }
    ],{now});

    expect(chosen.skill).toBe('spelling');
    expect(chosen.srDue).toBe(true);
  });

  it('treats the 48-hour recency penalty as an effective exclusion', () => {
    const now = Date.UTC(2026,8,22);
    const row = scoreMicroChallengeCandidate({
      mastery:0.5,
      bktUpdatedAt:now-10*86400000,
      nextReviewAt:now-1,
      lastChallengeAt:now-2*3600000
    },{now});
    expect(row.recent).toBe(true);
    expect(row.score).toBeLessThan(-90);

    const allRecent = selectMicroChallenge([
      {skill:'a',state:{mastery:0.4,bktUpdatedAt:now-10*86400000,lastChallengeAt:now-1000}},
      {skill:'b',state:{mastery:0.5,bktUpdatedAt:now-10*86400000,lastChallengeAt:now-1000}}
    ],{now});
    expect(allRecent).toBeNull();
  });
});
