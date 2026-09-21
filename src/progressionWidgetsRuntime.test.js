import { describe, expect, it } from 'vitest';
import { deriveProgressionModel } from './progressionWidgetsRuntime';

function save(overrides = {}){
  return {
    coins:40,
    stars:0,
    xp:0,
    starWorth:0,
    owned:['tops-1','bottoms-1','shoes-1','beds-1','desks-1','companions-1'],
    mastered:[],
    stats:{},
    daily:{quests:0,transfers:0,purchase:0},
    dreamGoalId:'companions-8',
    ...overrides
  };
}

describe('progression widget state model',() => {
  it('preserves the five canonical Home tiers and exact names',() => {
    const model = deriveProgressionModel(save());
    expect(model.room.tiers.map(tier => tier.name)).toEqual([
      'Tiny Starter Studio',
      'Cozy Loft',
      'Creator Bedroom',
      'Skyline Penthouse',
      'Star Mansion'
    ]);
    expect(model.room.tiers).toHaveLength(5);
    expect(model.room.name).toBe('Tiny Starter Studio');
  });

  it('binds Dream Goal progress only to owned state and real Coins',() => {
    const model = deriveProgressionModel(save({coins:100,dreamGoalId:'companions-8'}));
    expect(model.dream.name).toBe('Bubble Axolotl');
    expect(model.dream.owned).toBe(false);
    expect(model.dream.coins).toBe(100);
    expect(model.dream.toGo).toBe(model.dream.price - 100);
    expect(model.dream.pct).toBeCloseTo(100 / model.dream.price * 100);
  });

  it('marks a Dream Goal complete only when the real item is owned',() => {
    const model = deriveProgressionModel(save({
      coins:0,
      dreamGoalId:'companions-8',
      owned:['tops-1','bottoms-1','shoes-1','beds-1','desks-1','companions-1','companions-8']
    }));
    expect(model.dream.owned).toBe(true);
    expect(model.dream.pct).toBe(100);
    expect(model.dream.toGo).toBe(0);
  });

  it('derives Daily Quest completion from the existing three tracked counters',() => {
    const model = deriveProgressionModel(save({daily:{quests:1,transfers:1,purchase:0}}));
    expect(model.daily.map(row => [row.value,row.goal])).toEqual([[1,1],[1,2],[0,1]]);
    expect(model.dailyDone).toBe(1);
    expect(model.daily).toHaveLength(3);
  });

  it('uses independent mastery evidence without inventing progress',() => {
    const model = deriveProgressionModel(save({
      stars:2,
      mastered:['short-vowels'],
      stats:{
        'short-vowels':{seen:5,independentCorrect:5,masteryCorrect:4,lastSeen:10},
        'reading-inference':{seen:4,independentCorrect:3,masteryCorrect:3,lastSeen:20}
      }
    }));
    expect(model.mastery.stars).toBe(2);
    expect(model.mastery.masteredCount).toBe(1);
    expect(model.mastery.next.skill).toBe('reading-inference');
    expect(model.mastery.next.masteryCorrect).toBe(3);
  });

  it('derives permanent collection progress from real ownership only',() => {
    const model = deriveProgressionModel(save());
    expect(model.collection.ownedCount).toBe(6);
    expect(model.collection.totalCount).toBe(192);
    expect(model.collection.groups.find(group => group.id === 'outfit').owned).toBe(3);
    expect(model.collection.groups.find(group => group.id === 'buddy').owned).toBe(1);
    expect(model.collection.groups.find(group => group.id === 'room').owned).toBe(2);
  });

  it('uses Star Worth for long-term Home progress and never subtracts progress',() => {
    const model = deriveProgressionModel(save({starWorth:1700}));
    expect(model.room.name).toBe('Creator Bedroom');
    expect(model.room.nextName).toBe('Skyline Penthouse');
    expect(model.room.toNext).toBe(2300);
    expect(model.room.mansionPct).toBeCloseTo(20);
  });
});
