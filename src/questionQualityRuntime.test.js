import { describe, expect, it } from 'vitest';
import './questionQualityRuntime';
import { gameModel } from './gameModel';

const byId = () => new Map(gameModel.buildQuestions().map(question => [question.id,question]));

describe('StarBlox hardened question runtime', () => {
  it('preserves a 200-question structurally valid bank after hardening', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(question => question.id)).size).toBe(200);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('rebuilds all 20 hfw-use questions with grammatical, purposeful distractors', () => {
    const family = gameModel.buildQuestions().filter(question => question.id.startsWith('hfw-use-'));
    expect(family).toHaveLength(20);
    expect(family.every(question => question.role === 'practice')).toBe(true);
    expect(family.every(question => question.choices.length === 3 && new Set(question.choices).size === 3)).toBe(true);
    expect(family.flatMap(question => question.choices).some(choice => /purple yesterday|quickly chair/i.test(choice))).toBe(false);

    const questions = byId();
    expect(questions.get('hfw-use-why').answer).toBe('Why are you wearing boots?');
    expect(questions.get('hfw-use-why').choices).toEqual([
      'Why are you wearing boots?',
      'Where are your boots?',
      'How did you tie your boots?'
    ]);
    expect(questions.get('hfw-use-both').answer).toBe('Mia and Leo both finished.');
    expect(questions.get('hfw-use-could').answer).toBe('We could go outside later.');
  });

  it('uses passage-specific alternatives for all main-idea, inference, and evidence questions', () => {
    const family = gameModel.buildQuestions().filter(question => /^story-(main|infer|evidence)-/.test(question.id));
    expect(family).toHaveLength(12);
    const oldGeneric = /mostly about the weather|do not care about anyone|nothing important happens|has several sentences|uses punctuation/i;
    expect(family.flatMap(question => question.choices).some(choice => oldGeneric.test(choice))).toBe(false);

    const questions = byId();
    expect(questions.get('story-main-new-student').choices).toContain('Maya thinks lunch is the best time to read books.');
    expect(questions.get('story-infer-family-recipe').choices).toContain('Ana decides she does not want classmates to ask questions.');
    expect(questions.get('story-evidence-park-care').choices).toContain('The paper is near a tree.');
    expect(questions.get('story-evidence-crayons').answer).toBe('Mateo gives Priya some crayons so both children can finish.');
  });

  it('replaces giveaway base Religion distractors with other source-faithful Unit 1 ideas', () => {
    const family = gameModel.buildQuestions().filter(question => /^religion-\d$/.test(question.id));
    expect(family).toHaveLength(5);
    expect(family.flatMap(question => question.choices).some(choice => /winning games|only care about themselves/i.test(choice))).toBe(false);

    const questions = byId();
    const trinity = questions.get('religion-1');
    expect(trinity.answer).toBe('Father, Son, and Holy Spirit');
    expect(trinity.choices).toContain('People can think, choose, and love.');
    expect(trinity.choices.filter(choice => choice === trinity.answer)).toHaveLength(1);
  });

  it('keeps hardened answer positions varied in the deterministic daily pool', () => {
    const pool = gameModel.dailyPool(Date.UTC(2026,8,18));
    const hardened = pool.filter(question => question.id.startsWith('hfw-use-') || /^story-(main|infer|evidence)-/.test(question.id) || /^religion-\d$/.test(question.id));
    const positions = new Set(hardened.map(question => question.choices.indexOf(question.answer)));
    expect(positions.size).toBeGreaterThan(1);
  });
});
