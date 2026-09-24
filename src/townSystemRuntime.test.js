import { describe, expect, it } from 'vitest';
import {
  TOWN_LOCATION_CATALOG,
  createTownState,
  deriveTownRoute,
  townLocationView,
  unlockTownLocation,
  visitTownLocation
} from './townSystemRuntime.js';

describe('townSystemRuntime', () => {
  it('preserves 17 evidence-backed town concepts while deferring two non-player-facing zones', () => {
    expect(Object.keys(TOWN_LOCATION_CATALOG)).toHaveLength(17);
    expect(TOWN_LOCATION_CATALOG['school'].playerFacingEligible).toBe(true);
    expect(TOWN_LOCATION_CATALOG['mystery-zone'].playerFacingEligible).toBe(false);
  });

  it('unlocks and visits a location without mutating the prior state', () => {
    const base=createTownState();
    const unlocked=unlockTownLocation(base,'hospital');
    const visited=visitTownLocation(unlocked,'hospital');
    expect(base.unlocked.hospital).toBeUndefined();
    expect(unlocked.unlocked.hospital).toBe(true);
    expect(visited.visits.hospital).toBe(1);
    expect(visited.lastVisited).toBe('hospital');
  });

  it('routes only through unlocked nodes on the original StarBlox proxy topology', () => {
    let state=createTownState({
      unlockedLocationIds:['school','town-hall','subway','airport']
    });
    expect(deriveTownRoute(state,'school','airport')).toEqual([
      'school','town-hall','subway','airport'
    ]);
    expect(() => deriveTownRoute(state,'school','yacht')).toThrow(/destination locked/);
  });

  it('keeps research-deferred zones out of player-facing state', () => {
    const state=createTownState({unlockedLocationIds:['mystery-zone','school']});
    expect(state.unlocked['mystery-zone']).toBeUndefined();
    expect(() => unlockTownLocation(state,'mystery-zone')).toThrow(/research-deferred/);
    expect(townLocationView(state,'mystery-zone').playerFacingEligible).toBe(false);
  });
});
