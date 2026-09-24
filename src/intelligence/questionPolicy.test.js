
import { describe,expect,it } from 'vitest';
import { importLegacyQuestionBank } from '../questionBank/questionBankV2.js';
import {
  DAY_MS,
  createConceptMemoryState,
  reviewConceptMemory
} from './fsrsMemory.js';
import {
  buildConceptKnowledgeHypotheses,
  conceptInformationGain,
  expectedInformationGain,
  invalidatedQuestionIds,
  selectEntropyQuestion
} from './entropyChoice.js';
import {
  createAbilityState
} from './irtEngine.js';
import {
  rankQuestionsWithPolicy,
  selectQuestionWithPolicy
} from './questionPolicy.js';

function question(id,skill,role,difficulty){
  return {
    id,
    subject:'Reading',
    district:'Test District',
    skill,
    role,
    prompt:'Which answer is correct for ' + id + '?',
    choices:['Correct ' + id,'Wrong A ' + id,'Wrong B ' + id],
    answer:'Correct ' + id,
    explanation:'The source explains why Correct ' + id + ' is the correct answer.',
    hint:'Use the source clue for ' + id + '.',
    difficulty,
    reward:10,
    source:'policy fixture'
  };
}

function policyBank(){
  return importLegacyQuestionBank([
    question('q-vocab-practice','vocabulary','practice',3),
    question('q-vocab-hard','vocabulary','transfer',5),
    question('q-phonics-practice','phonics','practice',3),
    question('q-phonics-transfer','phonics','transfer',4),
    question('q-easy-recovery','recovery','practice',1),
    question('q-hard-recovery','recovery','transfer',5)
  ],{
    bankId:'policy-fixture',
    title:'Policy Fixture'
  });
}

describe('Step 12: entropy-based question choice', () => {
  it('computes high information gain for a question that splits hypotheses and zero for a non-discriminating one', () => {
    const hypotheses=[
      {id:'h1',weight:0.5},
      {id:'h2',weight:0.5}
    ];

    const split=expectedInformationGain(
      hypotheses,
      h => h.id === 'h1' ? 0.95 : 0.05
    );
    const same=expectedInformationGain(
      hypotheses,
      () => 0.80
    );

    expect(split.informationGain).toBeGreaterThan(0.7);
    expect(same.informationGain).toBeCloseTo(0,12);
    expect(split.informationGain).toBeGreaterThan(same.informationGain);
  });

  it('selects the candidate with greatest weighted expected information gain', () => {
    const hypotheses=[
      {id:'known',weight:0.5},
      {id:'unknown',weight:0.5}
    ];
    const candidates=[
      {id:'weak-split',category:'review'},
      {id:'strong-split',category:'diagnose'}
    ];

    const selected=selectEntropyQuestion(candidates,{
      hypotheses,
      categoryWeights:{diagnose:1.05,review:1},
      candidateProbability(candidate,hypothesis){
        if(candidate.id === 'strong-split'){
          return hypothesis.id === 'known' ? 0.95 : 0.10;
        }
        return hypothesis.id === 'known' ? 0.70 : 0.45;
      }
    });

    expect(selected.candidate.id).toBe('strong-split');
    expect(selected.metrics.informationGain).toBeGreaterThan(0);
  });

  it('honors answer-driven dependency invalidation before entropy ranking', () => {
    const rules=[
      {
        id:'role-question',
        invalidates:{answer:'yes',questionIds:['invalidated-question']}
      },
      {id:'invalidated-question'},
      {id:'eligible-question'}
    ];

    expect(
      [...invalidatedQuestionIds(rules,[{questionId:'role-question',answer:'yes'}])]
    ).toEqual(['invalidated-question']);

    const result=selectEntropyQuestion(
      [
        {id:'invalidated-question'},
        {id:'eligible-question'}
      ],
      {
        hypotheses:[
          {id:'a',weight:0.5},
          {id:'b',weight:0.5}
        ],
        answerHistory:[{questionId:'role-question',answer:'yes'}],
        questionRules:rules,
        candidateProbability(candidate,hypothesis){
          if(candidate.id === 'invalidated-question'){
            return hypothesis.id === 'a' ? 0.99 : 0.01;
          }
          return hypothesis.id === 'a' ? 0.85 : 0.15;
        }
      }
    );

    expect(result.candidate.id).toBe('eligible-question');
  });

  it('assigns more diagnostic value to an uncertain concept than a nearly certain recent concept', () => {
    let uncertain=createConceptMemoryState({
      playerId:'p',
      conceptId:'uncertain',
      now:0
    });
    uncertain=reviewConceptMemory(uncertain,{correct:true,now:DAY_MS});

    let certain=createConceptMemoryState({
      playerId:'p',
      conceptId:'certain',
      now:0
    });
    certain=reviewConceptMemory(certain,{correct:true,now:DAY_MS});

    const uncertainInfo=conceptInformationGain(uncertain,{now:10 * DAY_MS});
    const certainInfo=conceptInformationGain(certain,{now:DAY_MS + 60_000});

    expect(uncertainInfo.normalizedInformationGain).toBeGreaterThan(
      certainInfo.normalizedInformationGain
    );
    expect(buildConceptKnowledgeHypotheses(uncertain,{now:10 * DAY_MS})).toHaveLength(3);
  });
});

describe('Step 13: unified FSRS + IRT + entropy QuestionPolicy', () => {
  it('prioritizes a forgotten concept while still choosing an ability-matched item within that concept', () => {
    const bank=policyBank();

    let vocabulary=createConceptMemoryState({
      playerId:'player',
      conceptId:'vocabulary',
      now:0
    });
    vocabulary=reviewConceptMemory(vocabulary,{correct:false,now:DAY_MS});

    let phonics=createConceptMemoryState({
      playerId:'player',
      conceptId:'phonics',
      now:0
    });
    phonics=reviewConceptMemory(phonics,{correct:true,now:DAY_MS});
    phonics=reviewConceptMemory(phonics,{correct:true,now:2 * DAY_MS});

    const result=selectQuestionWithPolicy({
      bank,
      memoryStates:[vocabulary,phonics],
      ability:createAbilityState({playerId:'player',theta:0,standardError:0.8}),
      now:10 * DAY_MS
    });

    expect(result.selected.questionId).toBe('q-vocab-practice');
    expect(result.selected.signals.memory).toBeGreaterThan(
      result.ranking.find(row => row.questionId === 'q-phonics-practice').signals.memory
    );
    expect(result.selected.diagnostics.abilityFit).toBeCloseTo(1,12);
  });

  it('applies strict concept targeting and a game role hint above the statistical score', () => {
    const bank=policyBank();

    const result=selectQuestionWithPolicy({
      bank,
      ability:createAbilityState({playerId:'player',theta:0.7,standardError:0.7}),
      context:{
        targetConceptIds:['vocabulary'],
        strictConcept:true,
        roles:['transfer'],
        roleHint:'transfer'
      },
      introduceNewConcepts:true,
      now:0
    });

    expect(result.ranking.every(row => row.conceptIds.includes('vocabulary'))).toBe(true);
    expect(result.selected.questionId).toBe('q-vocab-hard');
    expect(result.selected.signals.gameplay).toBe(1);
  });

  it('cools down an exact recent question when another eligible question exists', () => {
    const bank=policyBank();
    const base=selectQuestionWithPolicy({
      bank,
      context:{skills:['vocabulary']},
      ability:createAbilityState({playerId:'player',theta:0,standardError:1}),
      introduceNewConcepts:true,
      now:0
    });

    expect(base.selected.questionId).toBe('q-vocab-practice');

    const next=selectQuestionWithPolicy({
      bank,
      context:{skills:['vocabulary']},
      ability:createAbilityState({playerId:'player',theta:0,standardError:1}),
      introduceNewConcepts:true,
      recentQuestionIds:['q-vocab-practice'],
      now:0
    });

    expect(next.selected.questionId).toBe('q-vocab-hard');
    expect(next.ranking.some(row => row.questionId === 'q-vocab-practice')).toBe(false);
  });

  it('activates the recovery guard after repeated wrong answers', () => {
    const bank=policyBank();
    const ability=createAbilityState({
      playerId:'player',
      theta:-1.2,
      standardError:0.9
    });

    const ranking=rankQuestionsWithPolicy({
      bank,
      context:{skills:['recovery']},
      ability,
      introduceNewConcepts:true,
      recentWrongStreak:2,
      now:0
    });

    expect(ranking).toHaveLength(1);
    expect(ranking[0].questionId).toBe('q-easy-recovery');
    expect(ranking[0].probabilityCorrect).toBeGreaterThan(0.55);
    expect(ranking[0].role).toBe('practice');
  });

  it('returns a transparent normalized signal breakdown for every ranked candidate', () => {
    const bank=policyBank();
    const ranking=rankQuestionsWithPolicy({
      bank,
      ability:createAbilityState({playerId:'player',theta:0,standardError:1}),
      introduceNewConcepts:true,
      now:0
    });

    expect(ranking.length).toBeGreaterThan(0);
    for(const row of ranking){
      expect(row.score).toBeGreaterThan(0);
      for(const key of ['memory','irt','entropy','novelty','gameplay','quality']){
        expect(row.signals[key]).toBeGreaterThanOrEqual(0);
        expect(row.signals[key]).toBeLessThanOrEqual(1);
      }
      expect(row.probabilityCorrect).toBeGreaterThanOrEqual(0);
      expect(row.probabilityCorrect).toBeLessThanOrEqual(1);
      expect(row.diagnostics).toHaveProperty('abilityFit');
      expect(row.diagnostics).toHaveProperty('fisherInformation');
    }
  });

  it('is deterministic for identical player state, context and bank snapshot', () => {
    const bank=policyBank();
    const options={
      bank,
      ability:createAbilityState({playerId:'player',theta:0.25,standardError:0.8}),
      introduceNewConcepts:true,
      recentConceptIds:['phonics'],
      now:123456
    };

    expect(rankQuestionsWithPolicy(options)).toEqual(rankQuestionsWithPolicy(options));
  });
});
