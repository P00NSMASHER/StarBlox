import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import './semanticQuestionGuardRuntime';
import { gameModel } from './gameModel';

describe('remaining semantic question guards', () => {
  it('preserves the exact validated 200-question bank', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(question => question.id)).size).toBe(200);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('covers all 20 high-frequency cloze items with reviewed prompts', () => {
    const family = gameModel.buildQuestions().filter(question => question.id.startsWith('hfw-cloze-'));
    expect(family).toHaveLength(20);
    expect(family.every(question => question.choices.length === 3 && new Set(question.choices).size === 3)).toBe(true);

    const help = family.find(question => question.id === 'hfw-cloze-help');
    expect(help.prompt).toContain('could not lift the box alone');
    expect(help.answer).toBe('help');

    const why = family.find(question => question.id === 'hfw-cloze-why');
    expect(why.prompt).toContain('asks for a reason');
    expect(why.choices).toEqual(['why','when','where']);
  });

  it('covers all 12 spelling context items with narrowed sentence clues', () => {
    const family = gameModel.buildQuestions().filter(question => question.id.startsWith('context-'));
    expect(family).toHaveLength(12);

    const fog = family.find(question => question.id === 'context-fog');
    expect(fog.prompt).toContain('Thick _____ covered the road');
    expect(fog.answer).toBe('fog');

    const hut = family.find(question => question.id === 'context-hut');
    expect(hut.prompt).toContain('small one-room _____ had a roof');
    expect(hut.answer).toBe('hut');
  });

  it('keeps guarded answer positions varied in the deterministic daily pool', () => {
    const guarded = gameModel.dailyPool(Date.UTC(2026,8,18)).filter(question =>
      question.id.startsWith('hfw-cloze-') || question.id.startsWith('context-')
    );
    const positions = new Set(guarded.map(question => question.choices.indexOf(question.answer)));
    expect(positions.size).toBeGreaterThan(1);
  });
});
