// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportSave,
  importSave,
  loadLocalSnapshot,
  persistSnapshot,
  sanitizeSnapshotShape
} from './storage';

afterEach(() => {
  localStorage.clear();
});

describe('StarBlox persistence recovery', () => {
  it('preserves valid progression and unknown owned IDs while de-duplicating stable IDs', () => {
    const raw = {
      stateVersion:2,
      coins:875,
      stars:6,
      xp:1480,
      starWorth:2125,
      owned:['tops-1','future-item-without-art','future-item-without-art'],
      equipped:{top:'tops-1',back:'future-item-without-art'},
      roomDecor:['beds-1','future-room-item','future-room-item'],
      mastered:['phonics','phonics','reading'],
      stats:{
        phonics:{seen:8,correct:7,wrong:1,lastSeen:1234,independentCorrect:6,masteryCorrect:4}
      },
      questsCompleted:11,
      transferWins:5,
      daily:{quests:2,transfers:1,purchase:1},
      dreamGoalId:'future-item-without-art',
      districtProgress:{'Lantern Lane':9,'Story Street':4,'Wordwood Garden':2},
      companionBond:12
    };

    expect(sanitizeSnapshotShape(raw)).toEqual({
      ...raw,
      owned:['tops-1','future-item-without-art'],
      roomDecor:['beds-1','future-room-item'],
      mastered:['phonics','reading']
    });
  });

  it('removes malformed nested state instead of allowing it to crash or poison counters', () => {
    const cleaned = sanitizeSnapshotShape({
      coins:'not-a-number',
      stars:-1,
      xp:Infinity,
      owned:'not-an-array',
      equipped:[],
      roomDecor:null,
      mastered:{bad:true},
      daily:'broken',
      districtProgress:[],
      companionBond:Infinity,
      stats:{
        reading:'broken',
        phonics:{seen:'oops',correct:2,wrong:-3,lastSeen:20,independentCorrect:1,masteryCorrect:'4'}
      }
    });

    expect(cleaned.coins).toBeUndefined();
    expect(cleaned.stars).toBeUndefined();
    expect(cleaned.xp).toBeUndefined();
    expect(cleaned.owned).toBeUndefined();
    expect(cleaned.equipped).toBeUndefined();
    expect(cleaned.roomDecor).toBeUndefined();
    expect(cleaned.mastered).toBeUndefined();
    expect(cleaned.daily).toBeUndefined();
    expect(cleaned.districtProgress).toBeUndefined();
    expect(cleaned.companionBond).toBeUndefined();
    expect(cleaned.stats.reading).toBeUndefined();
    expect(cleaned.stats.phonics).toMatchObject({
      seen:0,
      correct:2,
      wrong:0,
      lastSeen:20,
      independentCorrect:1,
      masteryCorrect:4
    });
  });

  it('falls through a corrupt current local snapshot to the older recoverable key', () => {
    localStorage.setItem('starblox-save-v2','{broken-json');
    localStorage.setItem('abvm-brightside-floot-v2',JSON.stringify({
      coins:222,
      owned:['tops-1','legacy-owned-item'],
      dreamGoalId:'legacy-owned-item'
    }));

    expect(loadLocalSnapshot()).toMatchObject({
      coins:222,
      owned:['tops-1','legacy-owned-item'],
      dreamGoalId:'legacy-owned-item'
    });
  });

  it('round-trips a valid save through persistence without losing economy or progression state', () => {
    const save = {
      stateVersion:2,
      coins:410,
      stars:3,
      xp:721,
      starWorth:900,
      owned:['tops-1','beds-2','companions-4'],
      equipped:{top:'tops-1',companion:'companions-4'},
      stats:{reading:{seen:5,correct:4,wrong:1,lastSeen:500,independentCorrect:4,masteryCorrect:4}},
      mastered:['reading'],
      roomDecor:['beds-2'],
      questsCompleted:4,
      transferWins:2,
      lastDailyKey:'2026-09-21',
      daily:{quests:1,transfers:1,purchase:0},
      dreamGoalId:'beds-3',
      districtProgress:{'Lantern Lane':2,'Story Street':3,'Wordwood Garden':1},
      companionBond:5
    };

    persistSnapshot(save);
    expect(loadLocalSnapshot()).toEqual(save);
  });

  it('rejects arrays as imported saves and preserves valid imports through export/import', () => {
    expect(() => importSave('[]')).toThrow('That file is not a valid StarBlox save.');

    const save = {coins:99,owned:['tops-1','no-art-yet'],equipped:{top:'tops-1'}};
    expect(importSave(exportSave(save))).toEqual(save);
  });
});
