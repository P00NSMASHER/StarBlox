import {describe,expect,it} from 'vitest';
import {reviewQuestionAggregate,reviewQuestionItem} from './questionItemReview.js';

function row(overrides={}){
  return {
    firstAttempts:40,firstCorrect:24,attempts:48,correct:29,wrong:19,
    rubricPoints:70,rubricMaxPoints:96,supportAttempts:4,
    responseTimeBands:{'under-5s':5,'5-15s':24,'15-30s':15,'30s-plus':4},
    misconceptionCounts:{'off-by-one':5,'wrong-operation':3},
    sumSessionAccuracy:28,
    sumSessionAccuracySquared:20.4,
    sumItemSessionProduct:18,
    variants:{
      A:{firstAttempts:36,firstCorrect:21,rubricPoints:62,rubricMaxPoints:86},
      B:{firstAttempts:4,firstCorrect:3,rubricPoints:8,rubricMaxPoints:10}
    },
    ...overrides
  };
}

describe('anonymous question item review',()=>{
  it('computes difficulty, discrimination, rubric and experiment summaries from sufficient statistics',()=>{
    const reviewed=reviewQuestionItem('q1',row());
    expect(reviewed.difficulty).toBeCloseTo(0.6);
    expect(reviewed.discrimination).not.toBeNull();
    expect(reviewed.rubricRate).toBeCloseTo(70/96);
    expect(reviewed.variants.A.firstAttempts).toBe(36);
    expect(reviewed.variants.B.firstAttempts).toBe(4);
    expect(reviewed.variants.accuracyDeltaBMinusA).toBeCloseTo((3/4)-(21/36));
  });

  it('flags very easy low-information items for review',()=>{
    const reviewed=reviewQuestionItem('easy',row({
      firstAttempts:50,firstCorrect:49,
      sumSessionAccuracy:35,sumSessionAccuracySquared:25,sumItemSessionProduct:34.2
    }));
    expect(reviewed.flags).toContain('too-easy');
    expect(['review','retire-or-rewrite']).toContain(reviewed.action);
  });

  it('does not make item decisions before the minimum sample',()=>{
    const reviewed=reviewQuestionItem('new',row({firstAttempts:9,firstCorrect:6}));
    expect(reviewed.action).toBe('collect-more-data');
    expect(reviewed.flags).toContain('insufficient-sample');
  });

  it('keeps the aggregate privacy-preserving',()=>{
    const report=reviewQuestionAggregate({metricsVersion:'starblox-question-item-metrics-v1',items:{q1:row()}});
    expect(report.privacy.requiresUserIds).toBe(false);
    expect(report.privacy.requiresRawAnswers).toBe(false);
    expect(report.privacy.requiresSessionIds).toBe(false);
  });
});
