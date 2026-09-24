import { describe, expect, it } from 'vitest';
import { recordShadowLearningEvent } from './learningEventBridge.js';

const question = {
  id:'bridge-q',
  subject:'Reading',
  district:'Lantern Lane',
  skill:'phonics',
  role:'practice',
  prompt:'Which word rhymes with bun?',
  choices:['sun','cake','bed'],
  answer:'sun',
  explanation:'Sun rhymes with bun.',
  hint:'Listen to the ending.',
  difficulty:2,
  reward:8,
  source:'ABVM Grade 2 current source pack'
};

describe('learning event bridge', () => {
  it('adds shadow evidence without changing existing save fields', () => {
    const save = {coins:40,stats:{phonics:{seen:1}}};
    const result = recordShadowLearningEvent(save,{
      question,
      choice:'sun',
      timestamp:100,
      questSeed:4
    });

    expect(result.state.coins).toBe(40);
    expect(result.state.stats).toEqual(save.stats);
    expect(result.state.shadowLearningLedger.events).toHaveLength(1);
    expect(result.event.masteryEligible).toBe(true);
  });

  it('records assisted retries but makes them ineligible for mastery', () => {
    const result = recordShadowLearningEvent({},{
      question,
      choice:'sun',
      timestamp:101,
      questSeed:4,
      wasRetry:true,
      hintUsed:true
    });
    expect(result.event.assisted).toBe(true);
    expect(result.event.masteryEligible).toBe(false);
  });
});
