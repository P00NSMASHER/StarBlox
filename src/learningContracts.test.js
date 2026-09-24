import { describe, expect, it } from 'vitest';
import {
  createLearningEvent,
  toQuestionV2,
  validateLearningEvent,
  validateQuestionV2
} from './learningContracts.js';

const legacyQuestion = {
  id:'demo-1',
  subject:'Reading',
  district:'Lantern Lane',
  skill:'phonics',
  role:'practice',
  prompt:'Which word rhymes with bun?',
  choices:['sun','cake','bed'],
  answer:'sun',
  explanation:'Sun rhymes with bun.',
  hint:'Listen to the ending sound.',
  difficulty:2,
  reward:8,
  source:'ABVM Grade 2 current source pack'
};

describe('learning contracts', () => {
  it('normalizes the current StarBlox question shape without changing gameplay fields', () => {
    const q = toQuestionV2(legacyQuestion,{contentVersion:'test-v1'});
    expect(q.id).toBe(legacyQuestion.id);
    expect(q.answer).toBe(legacyQuestion.answer);
    expect(q.choices).toEqual(legacyQuestion.choices);
    expect(q.conceptIds).toEqual(['skill:phonics']);
    expect(q.sourceIds.length).toBeGreaterThan(0);
    expect(validateQuestionV2(q)).toEqual([]);
  });

  it('preserves the independent-vs-assisted mastery rule in the event contract', () => {
    const q = toQuestionV2(legacyQuestion,{contentVersion:'test-v1'});
    const first = createLearningEvent({
      question:q,
      choice:'sun',
      timestamp:100,
      questSeed:7,
      wasRetry:false,
      hintUsed:false
    });
    const retry = createLearningEvent({
      question:q,
      choice:'sun',
      timestamp:101,
      questSeed:7,
      wasRetry:true,
      hintUsed:true
    });

    expect(first.correct).toBe(true);
    expect(first.firstAttempt).toBe(true);
    expect(first.masteryEligible).toBe(true);
    expect(validateLearningEvent(first)).toEqual([]);

    expect(retry.correct).toBe(true);
    expect(retry.firstAttempt).toBe(false);
    expect(retry.assisted).toBe(true);
    expect(retry.masteryEligible).toBe(false);
    expect(validateLearningEvent(retry)).toEqual([]);
  });
});
