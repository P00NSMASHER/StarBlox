import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import './semanticQuestionGuardRuntime';
import './diagnosticQuestionGuardRuntime';
import { gameModel } from './gameModel';

const GRAMMAR_EXPECTATIONS = Object.freeze({
  'grammar-0':{
    role:'practice',
    answer:'boxes',
    prompt:'Which plural is correct for “box”?',
    wrong:['boxs','boxies']
  },
  'grammar-1':{
    role:'practice',
    answer:'dogs',
    prompt:'Which plural is correct for “dog”?',
    wrong:['doges','dogies']
  },
  'grammar-2':{
    role:'review',
    answer:'Please put your book away.',
    prompt:'Which sentence is a command?',
    wrong:['Where is your book?','What a great book!']
  },
  'grammar-3':{
    role:'review',
    answer:'That parade was amazing!',
    prompt:'Which sentence is an exclamation?',
    wrong:['Where is the parade?','The parade is today.']
  },
  'grammar-4':{
    role:'transfer',
    answer:'Maya’s hands shook as she waited for her turn.',
    prompt:'Which sentence best SHOWS that a character is nervous?',
    wrong:['Maya tied her shoes before school.','Maya smiled as she opened a birthday gift.']
  },
  'grammar-5':{
    role:'review',
    answer:'The puppy ran home.',
    prompt:'Which is a complete sentence?',
    wrong:['Running very fast.','Under the table.']
  }
});

const AUDIT_DAY_QUEST = [
  'vocab-transfer-invited',
  'spell-first-tub',
  'story-character-park-care',
  'religion-transfer-0',
  'story-infer-crayons'
];

const byId = () => new Map(gameModel.buildQuestions().map(question => [question.id,question]));

describe('grammar question semantic QA', () => {
  it('locks all six audited grammar IDs to one defensible key and the intended evidence role', () => {
    const questions = byId();
    expect(Object.keys(GRAMMAR_EXPECTATIONS)).toHaveLength(6);

    for(const [id,expected] of Object.entries(GRAMMAR_EXPECTATIONS)){
      const question = questions.get(id);
      expect(question,id).toBeTruthy();
      expect(question.prompt).toBe(expected.prompt);
      expect(question.answer).toBe(expected.answer);
      expect(question.role).toBe(expected.role);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices.filter(choice => choice === expected.answer)).toHaveLength(1);
      expect(question.choices).toEqual(expect.arrayContaining([expected.answer,...expected.wrong]));
      expect(question.source).toBeTruthy();
      expect(question.difficulty).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps direct recognition as practice/review and reserves transfer for the show-dont-tell application', () => {
    const questions = byId();
    expect(questions.get('grammar-0').role).toBe('practice');
    expect(questions.get('grammar-1').role).toBe('practice');
    expect(questions.get('grammar-2').role).toBe('review');
    expect(questions.get('grammar-3').role).toBe('review');
    expect(questions.get('grammar-5').role).toBe('review');
    expect(questions.get('grammar-4').role).toBe('transfer');
  });

  it('re-checks the exact five fresh-save adaptive selections for the fixed 2026-09-18 audit day', () => {
    const quest = gameModel.pickQuest({},5,Date.UTC(2026,8,18,18,0,0));
    expect(quest.map(question => question.id)).toEqual(AUDIT_DAY_QUEST);
    expect(new Set(quest.map(question => question.id)).size).toBe(5);
    expect(quest.every(question => question.choices.length === 3)).toBe(true);
    expect(quest.every(question => question.choices.filter(choice => choice === question.answer).length === 1)).toBe(true);
  });
});
