
import { describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import { canonicalizeLegacyQuestion } from '../domainSchemas.js';
import {
  DAY_MS,
  createConceptMemoryState,
  memoryNeedScore,
  nextReviewAt,
  projectConceptMemory,
  rankConceptsByMemoryNeed,
  retrievabilityAt,
  reviewConceptMemory
} from './fsrsMemory.js';
import {
  abilityFitScore,
  authoredDifficultyToIrt,
  confidenceInterval,
  createAbilityState,
  createIrtItem,
  estimateAbility,
  fisherInformation,
  irtItemFromQuestionVersion,
  probabilityCorrect,
  selectNextQuestion,
  updateAbility,
  updateItemCalibration
} from './irtEngine.js';

describe('Step 10: FSRS-compatible concept memory', () => {
  it('starts unseen concepts at maximum memory need', () => {
    const state=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'culture',
      now:0
    });

    expect(state.exposures).toBe(0);
    expect(state.retrievability).toBe(0);
    expect(memoryNeedScore(state,{now:0})).toBe(1);
  });

  it('defines stability as the interval where retrievability reaches 90%', () => {
    let state=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'culture',
      now:0
    });
    state=reviewConceptMemory(state,{correct:true,now:DAY_MS});

    expect(state.stability).toBeCloseTo(1,10);
    expect(retrievabilityAt(state,DAY_MS + DAY_MS)).toBeCloseTo(0.9,10);
    expect(nextReviewAt(state,{desiredRetention:0.9})).toBeCloseTo(
      state.lastSeenAt + state.stability * DAY_MS,
      6
    );
  });

  it('rewards successful recall after forgetting with more stability than an immediate repeat', () => {
    let base=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'culture',
      now:0
    });
    base=reviewConceptMemory(base,{correct:true,now:DAY_MS});

    const immediate=reviewConceptMemory(base,{
      correct:true,
      now:DAY_MS + 60_000
    });
    const delayed=reviewConceptMemory(base,{
      correct:true,
      now:DAY_MS + 7 * DAY_MS
    });

    expect(delayed.stability).toBeGreaterThan(immediate.stability);
    expect(delayed.fsrsDifficulty).toBeLessThanOrEqual(immediate.fsrsDifficulty);
  });

  it('counts lapses, raises difficulty, and sharply reduces stability after failure', () => {
    let state=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'creation-care',
      now:0
    });
    state=reviewConceptMemory(state,{correct:true,now:DAY_MS});
    const before=state;
    const failed=reviewConceptMemory(state,{
      correct:false,
      now:DAY_MS + DAY_MS
    });

    expect(failed.lapses).toBe(before.lapses + 1);
    expect(failed.fsrsDifficulty).toBeGreaterThan(before.fsrsDifficulty);
    expect(failed.stability).toBeLessThan(before.stability);
    expect(failed.retrievability).toBe(1);
  });

  it('projects current retrievability without mutating stored review history', () => {
    let state=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'phonics',
      now:0
    });
    state=reviewConceptMemory(state,{correct:true,now:DAY_MS});
    const projected=projectConceptMemory(state,{now:DAY_MS + 3 * DAY_MS});

    expect(projected.lastSeenAt).toBe(state.lastSeenAt);
    expect(projected.exposures).toBe(state.exposures);
    expect(projected.retrievability).toBeLessThan(0.9);
    expect(state.retrievability).toBe(1);
  });

  it('ranks forgotten/lapsed concepts above stable recent concepts', () => {
    let stable=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'stable',
      now:0
    });
    stable=reviewConceptMemory(stable,{correct:true,now:DAY_MS});
    stable=reviewConceptMemory(stable,{correct:true,now:2 * DAY_MS});

    let weak=createConceptMemoryState({
      playerId:'player-1',
      conceptId:'weak',
      now:0
    });
    weak=reviewConceptMemory(weak,{correct:false,now:DAY_MS});

    const ranked=rankConceptsByMemoryNeed([stable,weak],{
      now:10 * DAY_MS
    });

    expect(ranked[0].state.conceptId).toBe('weak');
    expect(ranked[0].need).toBeGreaterThanOrEqual(ranked[1].need);
  });
});

describe('Step 11: 2PL IRT ability and item difficulty', () => {
  it('maps authored 1..5 difficulty onto a centered -2..2 IRT prior', () => {
    expect(authoredDifficultyToIrt(1)).toBe(-2);
    expect(authoredDifficultyToIrt(3)).toBe(0);
    expect(authoredDifficultyToIrt(5)).toBe(2);
  });

  it('converts canonical QuestionVersion records into IRT items', () => {
    const legacy=gameModel.buildQuestions().find(question => question.difficulty === 3);
    const canonical=canonicalizeLegacyQuestion(legacy);
    const item=irtItemFromQuestionVersion(canonical.version);

    expect(item.questionId).toBe(canonical.id);
    expect(item.difficulty).toBe(0);
    expect(item.discrimination).toBe(1);
    expect(item.conceptId).toBe(canonical.version.skill);
  });

  it('returns 50% probability at matched ability and difficulty', () => {
    const item=createIrtItem({
      questionId:'q1',
      difficulty:0.75,
      discrimination:1.4
    });
    expect(probabilityCorrect(0.75,item)).toBeCloseTo(0.5,12);
    expect(fisherInformation(0.75,item)).toBeCloseTo((1.4 ** 2) * 0.25,12);
  });

  it('uses all-correct and all-incorrect edge guards from the upstream engine', () => {
    const correct=estimateAbility([
      {questionId:'q1',correct:true,difficulty:-0.5,discrimination:1},
      {questionId:'q2',correct:true,difficulty:0.5,discrimination:1}
    ],{playerId:'p'});

    const wrong=estimateAbility([
      {questionId:'q1',correct:false,difficulty:-0.5,discrimination:1},
      {questionId:'q2',correct:false,difficulty:0.5,discrimination:1}
    ],{playerId:'p'});

    expect(correct.theta).toBe(1.5);
    expect(wrong.theta).toBe(-1.5);
    expect(correct.standardError).toBeCloseTo(1 / Math.sqrt(2),12);
    expect(wrong.standardError).toBeCloseTo(1 / Math.sqrt(2),12);
  });

  it('estimates mixed-response ability with bounded uncertainty', () => {
    const responses=[
      {questionId:'q1',correct:true,difficulty:-1.5,discrimination:1.2},
      {questionId:'q2',correct:true,difficulty:-0.5,discrimination:1.0},
      {questionId:'q3',correct:false,difficulty:0.5,discrimination:1.1},
      {questionId:'q4',correct:false,difficulty:1.5,discrimination:1.3}
    ];
    const ability=estimateAbility(responses,{playerId:'p'});

    expect(ability.theta).toBeGreaterThan(-1);
    expect(ability.theta).toBeLessThan(1);
    expect(ability.standardError).toBeGreaterThan(0);
    expect(ability.standardError).toBeLessThan(1.5);
    expect(confidenceInterval(ability)).toHaveLength(2);
  });

  it('updates ability from accumulated exact item parameters', () => {
    let ability=createAbilityState({playerId:'p'});
    const easy=createIrtItem({questionId:'easy',difficulty:-1,discrimination:1});
    const hard=createIrtItem({questionId:'hard',difficulty:1,discrimination:1});

    ability=updateAbility(ability,easy,true);
    ability=updateAbility(ability,hard,false);

    expect(ability.responses).toHaveLength(2);
    expect(ability.responses[0].questionId).toBe('easy');
    expect(ability.responses[1].questionId).toBe('hard');
  });

  it('selects the most informative or closest-to-50-percent candidate', () => {
    const ability=createAbilityState({playerId:'p',theta:0.4,standardError:0.8});
    const items=[
      createIrtItem({questionId:'too-easy',difficulty:-2,discrimination:1}),
      createIrtItem({questionId:'matched',difficulty:0.4,discrimination:1.5}),
      createIrtItem({questionId:'too-hard',difficulty:2.5,discrimination:1})
    ];

    expect(selectNextQuestion(ability,items,{method:'max_info'}).questionId).toBe('matched');
    expect(selectNextQuestion(ability,items,{method:'target_50'}).questionId).toBe('matched');
    expect(abilityFitScore(ability,items[1])).toBeCloseTo(1,12);
  });

  it('calibrates surprising responses in the expected direction with shrinkage', () => {
    const item=createIrtItem({
      questionId:'q-cal',
      difficulty:1.5,
      discrimination:1
    });

    const unexpectedlyCorrect=updateItemCalibration(item,{
      theta:-0.5,
      correct:true,
      learningRate:0.1,
      shrinkage:0
    });
    expect(unexpectedlyCorrect.difficulty).toBeLessThan(item.difficulty);

    const unexpectedlyWrong=updateItemCalibration(item,{
      theta:2.5,
      correct:false,
      learningRate:0.1,
      shrinkage:0
    });
    expect(unexpectedlyWrong.difficulty).toBeGreaterThan(item.difficulty);
    expect(unexpectedlyWrong.responseCount).toBe(1);
  });
});
