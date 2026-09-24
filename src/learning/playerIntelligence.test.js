
import { describe,expect,it } from 'vitest';
import { createPlayerConceptState } from '../domainSchemas.js';
import { gameModel } from '../gameModel.js';
import { canonicalizeLegacyQuestion } from '../domainSchemas.js';
import {
  DEFAULT_DESIRED_RETENTION,
  FSRS6_DEFAULT_PARAMETERS,
  fsrsRetrievability,
  initializeFsrsMemoryState,
  memoryNeed,
  nextReviewIntervalDays,
  ratingFromAttempt,
  retrievabilityAt,
  updateConceptMemory
} from './fsrsMemory.js';
import {
  createItemCalibration,
  createIrtItemFromQuestionVersion,
  estimateAbility,
  fisherInformation,
  probabilityCorrect,
  selectNextQuestion,
  updateAbility,
  updateItemCalibration
} from './irtEngine.js';

const DAY=86_400_000;

describe('Step 10: FSRS player memory', () => {
  it('preserves the FSRS-6 S90 definition: at stability days, recall is 90%', () => {
    expect(fsrsRetrievability(10,10)).toBeCloseTo(0.9,8);
    expect(fsrsRetrievability(2.3065,2.3065,{roundElapsedDays:false})).toBeCloseTo(0.9,8);
  });

  it('maps StarBlox attempt outcomes onto FSRS review ratings', () => {
    expect(ratingFromAttempt({correct:false})).toBe(1);
    expect(ratingFromAttempt({correct:true,wasRetry:true})).toBe(2);
    expect(ratingFromAttempt({correct:true})).toBe(3);
    expect(ratingFromAttempt({correct:true,fluent:true})).toBe(4);
  });

  it('initializes a concept from the exact FSRS-6 default stability for Good', () => {
    const state=initializeFsrsMemoryState({
      playerId:'player-1',
      conceptId:'culture',
      rating:3,
      atMs:1000
    });

    expect(state.stability).toBeCloseTo(FSRS6_DEFAULT_PARAMETERS[2],10);
    expect(state.fsrsDifficulty).toBeGreaterThanOrEqual(1);
    expect(state.fsrsDifficulty).toBeLessThanOrEqual(10);
    expect(state.exposures).toBe(1);
    expect(state.retrievability).toBe(1);
  });

  it('increases stability after a successful delayed review and records lapses after failure', () => {
    const initial=initializeFsrsMemoryState({
      playerId:'player-1',
      conceptId:'culture',
      rating:3,
      atMs:0
    });

    const success=updateConceptMemory(initial,{
      correct:true,
      atMs:3 * DAY
    });
    const failure=updateConceptMemory(initial,{
      correct:false,
      atMs:3 * DAY
    });

    expect(success.stability).toBeGreaterThan(initial.stability);
    expect(success.lapses).toBe(0);
    expect(failure.stability).toBeLessThan(initial.stability);
    expect(failure.lapses).toBe(1);
    expect(success.exposures).toBe(2);
    expect(failure.exposures).toBe(2);
  });

  it('decays retrievability over time and marks memory due below desired retention', () => {
    const state=createPlayerConceptState({
      playerId:'player-1',
      conceptId:'creation-care',
      fsrsDifficulty:5,
      stability:10,
      retrievability:1,
      exposures:4,
      lapses:0,
      lastSeenAt:0,
      updatedAt:0
    });

    const day5=retrievabilityAt(state,5 * DAY);
    const day15=retrievabilityAt(state,15 * DAY);

    expect(day5).toBeGreaterThan(day15);
    expect(memoryNeed(state,5 * DAY).due).toBe(false);
    expect(memoryNeed(state,15 * DAY).due).toBe(true);
  });

  it('returns stability itself as the 90% review interval under FSRS-6', () => {
    const state=createPlayerConceptState({
      playerId:'p',
      conceptId:'c',
      fsrsDifficulty:5,
      stability:12.345,
      retrievability:1,
      exposures:2,
      lapses:0,
      lastSeenAt:0,
      updatedAt:0
    });

    expect(nextReviewIntervalDays(state,{
      desiredRetention:DEFAULT_DESIRED_RETENTION
    })).toBeCloseTo(12.345,8);
  });
});

describe('Step 11: IRT ability and item difficulty', () => {
  it('implements the 2PL probability model and Fisher information', () => {
    const medium={id:'medium',difficulty:0,discrimination:1.5};
    expect(probabilityCorrect(0,medium)).toBeCloseTo(0.5,10);
    expect(fisherInformation(0,medium)).toBeGreaterThan(fisherInformation(2.5,medium));
    expect(fisherInformation(0,{id:'high-a',difficulty:0,discrimination:2}))
      .toBeGreaterThan(fisherInformation(0,{id:'low-a',difficulty:0,discrimination:0.5}));
  });

  it('handles empty, all-correct, all-incorrect, and mixed response patterns', () => {
    expect(estimateAbility([]).theta).toBe(0);

    const allCorrect=estimateAbility([
      {questionId:'q1',correct:true,difficulty:0,discrimination:1},
      {questionId:'q2',correct:true,difficulty:0.5,discrimination:1},
      {questionId:'q3',correct:true,difficulty:1,discrimination:1}
    ]);
    const allWrong=estimateAbility([
      {questionId:'q1',correct:false,difficulty:0,discrimination:1},
      {questionId:'q2',correct:false,difficulty:-0.5,discrimination:1},
      {questionId:'q3',correct:false,difficulty:-1,discrimination:1}
    ]);
    const mixed=estimateAbility([
      {questionId:'q1',correct:true,difficulty:-1,discrimination:1},
      {questionId:'q2',correct:true,difficulty:0,discrimination:1},
      {questionId:'q3',correct:false,difficulty:0.5,discrimination:1},
      {questionId:'q4',correct:false,difficulty:1,discrimination:1}
    ]);

    expect(allCorrect.theta).toBeGreaterThan(1);
    expect(allCorrect.theta).toBeLessThanOrEqual(3);
    expect(allWrong.theta).toBeLessThan(-1);
    expect(allWrong.theta).toBeGreaterThanOrEqual(-3);
    expect(mixed.theta).toBeGreaterThan(-2);
    expect(mixed.theta).toBeLessThan(2);
    expect(mixed.standardError).toBeGreaterThan(0);
  });

  it('selects maximum-information or roughly 50%-success questions at current ability', () => {
    const questions=[
      {id:'easy',difficulty:-1.5,discrimination:1},
      {id:'medium',difficulty:0,discrimination:1.5},
      {id:'hard',difficulty:1.5,discrimination:1.2}
    ];
    const ability={theta:0,standardError:1,responses:[]};

    expect(selectNextQuestion(ability,questions,{method:'max_info'}).id).toBe('medium');
    const target=selectNextQuestion(ability,questions,{method:'target_50'});
    expect(Math.abs(probabilityCorrect(0,target) - 0.5)).toBeLessThan(0.2);
  });

  it('updates player ability in the expected direction from question evidence', () => {
    const start={theta:0,standardError:1,responses:[]};
    const hard={id:'hard',difficulty:1,discrimination:1};
    const easy={id:'easy',difficulty:-1,discrimination:1};

    expect(updateAbility(start,hard,true).theta).toBeGreaterThan(0);
    expect(updateAbility(start,easy,false).theta).toBeLessThan(0);
  });

  it('creates version-specific IRT priors from canonical StarBlox questions', () => {
    const legacy=gameModel.buildQuestions().find(q => q.difficulty === 3);
    const canonical=canonicalizeLegacyQuestion(legacy);
    const item=createIrtItemFromQuestionVersion(canonical.version);

    expect(item.questionId).toBe(canonical.id);
    expect(item.version).toBe(1);
    expect(item.contentHash).toBe(canonical.currentVersionHash);
    expect(item.difficulty).toBe(0);
    expect(item.discrimination).toBe(1);
  });

  it('calibrates question difficulty harder after unexpected failure and easier after success', () => {
    const legacy=gameModel.buildQuestions().find(q => q.difficulty === 3);
    const canonical=canonicalizeLegacyQuestion(legacy);
    const base=createItemCalibration(canonical.version);

    const afterCorrect=updateItemCalibration(base,{
      theta:0,
      correct:true,
      atMs:1000
    });
    const afterWrong=updateItemCalibration(base,{
      theta:0,
      correct:false,
      atMs:1000
    });

    expect(afterCorrect.difficulty).toBeLessThan(base.difficulty);
    expect(afterWrong.difficulty).toBeGreaterThan(base.difficulty);
    expect(afterCorrect.responseCount).toBe(1);
    expect(afterWrong.responseCount).toBe(1);
  });
});
