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
    }
  });

  it('keeps room tiers at configured Star Worth thresholds', () => {
    expect(gameModel.roomTier(0).name).toBe('Tiny Starter Studio');
    expect(gameModel.roomTier(1500).name).toBe('Creator Bedroom');
    expect(gameModel.roomTier(9000).name).toBe('Star Mansion');
  });
});
