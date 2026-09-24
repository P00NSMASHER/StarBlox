import { describe, expect, it } from 'vitest';
import {
  LIFE_SIM_PROGRESSION_RULES,
  deriveLifeSimProgressionShadow,
  unlockedLifeSimIds
} from './lifeSimProgressionShadowRuntime.js';

describe('lifeSimProgressionShadowRuntime', () => {
  it('is read-only and exposes baseline house/town unlocks without minting economy', () => {
    const save={coins:25,stars:0,starWorth:0,questsCompleted:0,mastered:[]};
    const before=JSON.stringify(save);
    const model=deriveLifeSimProgressionShadow(save);
    expect(JSON.stringify(save)).toBe(before);
    expect(model.mode).toBe('shadow-read-only');
    expect(model.economyMutation).toEqual({coins:0,stars:0,starWorth:0,xp:0});
    expect(unlockedLifeSimIds(save,'residential')).toEqual(
      expect.arrayContaining(['front-door','mailbox'])
    );
    expect(unlockedLifeSimIds(save,'town')).toEqual(
      expect.arrayContaining(['town-hall','school','commercial-stores'])
    );
    expect(unlockedLifeSimIds(save,'vehicle')).toHaveLength(0);
  });

  it('unlocks more content monotonically as existing StarBlox progression grows', () => {
    const early={stars:1,starWorth:50,questsCompleted:1,mastered:['phonics']};
    const advanced={
      stars:5,
      starWorth:320,
      questsCompleted:7,
      mastered:['phonics','vocabulary','inference','language','text-evidence']
    };
    const a=deriveLifeSimProgressionShadow(early);
    const b=deriveLifeSimProgressionShadow(advanced);
    expect(b.unlockedCounts.residential).toBeGreaterThanOrEqual(a.unlockedCounts.residential);
    expect(b.unlockedCounts.vehicle).toBeGreaterThanOrEqual(a.unlockedCounts.vehicle);
    expect(b.unlockedCounts.town).toBeGreaterThanOrEqual(a.unlockedCounts.town);
    expect(unlockedLifeSimIds(advanced,'vehicle')).toEqual(
      expect.arrayContaining(['school-bus','fire-truck','cadillac','limo'])
    );
  });

  it('derives mastery from unique mastered skills rather than question attempts', () => {
    const model=deriveLifeSimProgressionShadow({
      mastered:['phonics','phonics','vocabulary'],
      questsCompleted:0,
      stars:0,
      starWorth:0
    });
    expect(model.metrics.masteredCount).toBe(2);
    expect(unlockedLifeSimIds({mastered:['phonics','vocabulary']},'town')).toContain('church');
  });

  it('has only valid data-driven target rules and produces next-unlock guidance', () => {
    expect(LIFE_SIM_PROGRESSION_RULES.length).toBeGreaterThan(30);
    const model=deriveLifeSimProgressionShadow({
      questsCompleted:1,
      stars:1,
      starWorth:30,
      mastered:['phonics']
    });
    expect(model.nextUnlocks.length).toBeGreaterThan(0);
    expect(model.nextUnlocks.every(row => row.unlocked === false)).toBe(true);
    expect(model.nextUnlocks.every(row => row.progressPct >= 0 && row.progressPct <= 100)).toBe(true);
  });
});
