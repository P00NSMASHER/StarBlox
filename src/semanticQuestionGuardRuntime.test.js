import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import { HFW_CLOZE, SPELLING_CONTEXT } from './semanticQuestionGuardRuntime';
import { gameModel } from './gameModel';

const byId = () => new Map(gameModel.buildQuestions().map(question => [question.id,question]));

describe('remaining semantic question guards', () => {
  it('preserves the exact validated 200-question bank', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(question => question.id)).size).toBe(200);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('audits and hardens all 20 high-frequency cloze items with one keyed choice and meaning-led stems', () => {
    const family = gameModel.buildQuestions().filter(question => question.id.startsWith('hfw-cloze-'));
    expect(family).toHaveLength(20);
    expect(Object.keys(HFW_CLOZE)).toHaveLength(20);

    for(const question of family){
      expect(question.skill).toBe('high-frequency-words');
      expect(question.role).toBe('practice');
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices.filter(choice => choice === question.answer)).toHaveLength(1);
    }

    const questions = byId();
    expect(questions.get('hfw-cloze-for').prompt).toContain('who should receive the card');
    expect(questions.get('hfw-cloze-for').choices).toEqual(['for','from','with']);
    expect(questions.get('hfw-cloze-both').choices).toEqual(['both','already','nearly']);
    expect(questions.get('hfw-cloze-could').choices).toEqual(['could','will','must']);
  });

  it('covers all 12 spelling context items as spelling-in-context, not word-meaning evidence', () => {
    const family = gameModel.buildQuestions().filter(question => question.id.startsWith('context-'));
    expect(family).toHaveLength(12);
    expect(Object.keys(SPELLING_CONTEXT)).toHaveLength(12);

    for(const question of family){
      expect(question.skill).toBe('spelling');
      expect(question.role).toBe('practice');
      expect(question.prompt).toMatch(/correctly spelled weekly word/i);
      expect(question.choices).toHaveLength(3);
      expect(new Set(question.choices).size).toBe(3);
      expect(question.choices.filter(choice => choice === question.answer)).toHaveLength(1);
      const distractors = question.choices.filter(choice => choice !== question.answer);
      expect(distractors.every(choice => !gameModel.spelling.includes(choice))).toBe(true);
    }

    const questions = byId();
    expect(questions.get('context-fog').choices).toEqual(['fog','fogg','feg']);
    expect(questions.get('context-hut').choices).toEqual(['hut','hutt','het']);
    expect(questions.get('context-has').choices).toEqual(['has','haz','hass']);
  });

  it('keeps guarded answer positions varied in the deterministic daily pool', () => {
    const guarded = gameModel.dailyPool(Date.UTC(2026,8,18)).filter(question =>
      question.id.startsWith('hfw-cloze-') || question.id.startsWith('context-')
    );
    const positions = new Set(guarded.map(question => question.choices.indexOf(question.answer)));
    expect(guarded).toHaveLength(32);
    expect(positions.size).toBeGreaterThan(1);
  });
});
