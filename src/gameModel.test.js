import { describe, expect, it } from 'vitest';
import { gameModel } from './gameModel';

describe('StarBlox game model', () => {
  it('builds exactly 200 unique validated questions', () => {
    const bank = gameModel.buildQuestions();
    expect(bank).toHaveLength(200);
    expect(new Set(bank.map(q => q.id)).size).toBe(200);
    expect(gameModel.validateQuestionBank(bank)).toEqual([]);
  });

  it('builds the full 192-item permanent catalog', () => {
    expect(gameModel.store).toHaveLength(192);
    expect(new Set(gameModel.store.map(item => item.id)).size).toBe(192);
    expect(gameModel.store.every(item => item.price > 0 && item.starReq >= 0)).toBe(true);
  });

  it('selects five distinct adaptive actions with transfer practice', () => {
    const quest = gameModel.pickQuest({},5,Date.UTC(2026,8,18));
    expect(quest).toHaveLength(5);
    expect(new Set(quest.map(q => q.id)).size).toBe(5);
    expect(quest.some(q => q.role === 'transfer')).toBe(true);
  });

  it('keeps exactly one keyed answer in every choice set', () => {
    for(const question of gameModel.buildQuestions()){
      expect(question.choices.filter(choice => choice === question.answer)).toHaveLength(1);
      expect(new Set(question.choices).size).toBe(question.choices.length);
      expect(question.choices.every(choice => typeof choice === 'string' && choice.trim().length > 0)).toBe(true);
    }
  });

  it('varies answer position across the deterministic daily pool', () => {
    const pool = gameModel.dailyPool(Date.UTC(2026,8,18));
    const counts = [0,0,0];

    for(const question of pool){
      counts[question.choices.indexOf(question.answer)] += 1;
    }

    expect(counts.every(count => count >= 40)).toBe(true);
    expect(counts.every(count => count <= 100)).toBe(true);
  });

  it('hardens known high-risk question families', () => {
    const byId = new Map(gameModel.buildQuestions().map(question => [question.id,question]));

    const grammar = byId.get('grammar-4');
    expect(grammar.answer).toBe('Maya’s hands shook as she waited for her turn.');
    expect(grammar.choices).not.toContain('Maya was nervous.');

    const rhyme = byId.get('rhyme-bun');
    expect(rhyme.answer).toBe('sun');
    expect(rhyme.choices).toEqual(['sun','cake','bed']);

    const story = byId.get('story-character-family-recipe');
    expect(story.choices).not.toContain('The passage has a beginning and an ending.');
    expect(story.choices).not.toContain('The story has words on the page.');
    expect(story.prompt).toContain('best shows what the character values or decides to do');

    const trinity = byId.get('religion-transfer-1');
    expect(trinity.role).toBe('review');
    expect(trinity.answer).toBe('Father, Son, and Holy Spirit');
    expect(trinity.prompt).toBe('Which group names the three Persons in the Trinity?');

    const creation = byId.get('religion-transfer-2');
    expect(creation.answer).toBe('Put litter in a trash can after a picnic.');
    expect(creation.choices).toHaveLength(3);

    const vocab = byId.get('vocab-transfer-language');
    expect(vocab.answer).toBe('A child learns signs to communicate with a classmate.');
  });

  it('keeps room tiers at configured Star Worth thresholds', () => {
    expect(gameModel.roomTier(0).name).toBe('Tiny Starter Studio');
    expect(gameModel.roomTier(1500).name).toBe('Creator Bedroom');
    expect(gameModel.roomTier(9000).name).toBe('Star Mansion');
  });
});
