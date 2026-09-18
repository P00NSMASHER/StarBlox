import { describe, expect, it } from 'vitest';
import { homeFingerprint } from './homeHeroRuntime';

const BASE_SAVE = {
  coins:40,
  stars:0,
  xp:0,
  starWorth:0,
  dreamGoalId:'companions-8',
  owned:['tops-1','bottoms-1','shoes-1','companions-1'],
  daily:{quests:0,transfers:0,purchase:0},
  equipped:{top:'tops-1',bottom:'bottoms-1',shoes:'shoes-1',companion:'companions-1'},
  roomDecor:['beds-1','desks-1'],
  companionBond:0,
  stats:{phonics:{seen:2,correct:1,wrong:1,lastSeen:123,independentCorrect:1}}
};

describe('Home hero refresh fingerprint', () => {
  it('is stable for an equivalent persisted save', () => {
    const equivalent = JSON.parse(JSON.stringify(BASE_SAVE));
    expect(homeFingerprint(equivalent)).toBe(homeFingerprint(BASE_SAVE));
  });

  it('changes when Home-visible ownership changes', () => {
    const changed = {...BASE_SAVE,owned:[...BASE_SAVE.owned,'tops-2']};
    expect(homeFingerprint(changed)).not.toBe(homeFingerprint(BASE_SAVE));
  });
});
