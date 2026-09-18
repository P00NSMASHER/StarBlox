import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import './semanticQuestionGuardRuntime';
import './diagnosticQuestionGuardRuntime';
import { gameModel } from './gameModel';
import { VOWELS, VOWEL_EXAMPLES } from './diagnosticQuestionGuardRuntime';

const byId = () => new Map(gameModel.buildQuestions().map(question => [question.id,question]));

describe('diagnostic question semantic QA', () => {
  it('keeps the complete bank structurally valid', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(question => question.id)).size).toBe(200);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('rebuilds every vowel-listen item as a real sound-comparison diagnostic', () => {
    const questions = byId();
    for(const word of gameModel.spelling){
      const question = questions.get('vowel-listen-' + word);
      const vowel = VOWELS[word];
      expect(question).toBeTruthy();
      expect(question.role).toBe('diagnose');
      expect(question.skill).toBe('phonics');
      expect(question.masteryEligible).toBe(false);
      expect(question.difficulty).toBeGreaterThanOrEqual(2);
      expect(question.prompt).toBe('Which pair has the same middle vowel sound?');
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices.filter(choice => choice === question.answer)).toHaveLength(1);
      const answerMate = question.answer.split(' — ')[1];
      expect(VOWEL_EXAMPLES[vowel]).toContain(answerMate);
      for(const distractor of question.choices.filter(choice => choice !== question.answer)){
        const mate = distractor.split(' — ')[1];
        expect(VOWEL_EXAMPLES[vowel]).not.toContain(mate);
      }
    }
  });

  it('rebuilds every HFW recognition item from a meaning clue instead of copying the shown answer', () => {
    const questions = byId();
    for(const word of gameModel.sight){
      const question = questions.get('hfw-recognize-' + word);
      expect(question).toBeTruthy();
      expect(question.role).toBe('diagnose');
      expect(question.skill).toBe('high-frequency-words');
      expect(question.masteryEligible).toBe(false);
      expect(question.difficulty).toBeGreaterThanOrEqual(2);
      expect(question.answer).toBe(word);
      expect(question.prompt).not.toContain('“' + word + '”');
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices.filter(choice => choice === word)).toHaveLength(1);
    }
  });

  it('does not overclaim direct grammar recognition as transfer evidence', () => {
    const questions = byId();
    expect(questions.get('grammar-2').role).toBe('review');
    expect(questions.get('grammar-3').role).toBe('review');
    expect(questions.get('grammar-5').role).toBe('review');
    expect(questions.get('grammar-4').role).toBe('transfer');
  });

  it('selects five distinct fresh-save actions on the fixed audit day with valid roles', () => {
    const quest = gameModel.pickQuest({},5,Date.UTC(2026,8,18,18,0,0));
    expect(quest.map(question => question.id)).toEqual([
      'vocab-transfer-invited',
      'spell-first-tub',
      'story-character-park-care',
      'religion-transfer-0',
      'story-infer-crayons'
    ]);
    expect(new Set(quest.map(question => question.id)).size).toBe(5);
    expect(quest.some(question => question.role === 'transfer')).toBe(true);
  });
});
