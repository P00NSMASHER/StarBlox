
import { describe,expect,it } from 'vitest';
import {
  createAdaptiveMusicState,
  desiredMusicZone,
  musicMix,
  setMusicPaused,
  setMusicVolume,
  updateAdaptiveMusic
} from './adaptiveMusicDirector.js';

describe('Step 21: adaptive music director', () => {
  it('maps gameplay snapshots to calm, explore, challenge, and boss zones', () => {
    expect(desiredMusicZone({})).toBe('calm');
    expect(desiredMusicZone({phase:'quest'})).toBe('explore');
    expect(desiredMusicZone({pressure:0.8})).toBe('challenge');
    expect(desiredMusicZone({boss:true})).toBe('boss');
    expect(desiredMusicZone({boss:true,completed:true})).toBe('calm');
  });

  it('requires hysteresis and commits urgent transitions on a one-cycle phrase grid', () => {
    let state=createAdaptiveMusicState({zone:'calm',nowCycles:0});

    state=updateAdaptiveMusic(state,{
      dtSeconds:0.1,
      nowCycles:0.1,
      snapshot:{phase:'challenge'}
    });
    expect(state.zone).toBe('calm');
    expect(state.pending).toBeNull();

    state=updateAdaptiveMusic(state,{
      dtSeconds:0.4,
      nowCycles:0.5,
      snapshot:{phase:'challenge'}
    });
    expect(state.pending).toBe('challenge');
    expect(state.commitAt).toBe(1);
    expect(state.zone).toBe('calm');

    state=updateAdaptiveMusic(state,{
      dtSeconds:0.5,
      nowCycles:1,
      snapshot:{phase:'challenge'}
    });
    expect(state.zone).toBe('challenge');
    expect(state.offsets.challenge).toBe(1);
    expect(state.pending).toBeNull();
  });

  it('uses a four-cycle phrase grid for calm-to-explore transitions', () => {
    let state=createAdaptiveMusicState({zone:'calm',nowCycles:0});
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.01,
      nowCycles:0,
      snapshot:{phase:'explore'}
    });
    state=updateAdaptiveMusic(state,{
      dtSeconds:1.3,
      nowCycles:1.3,
      snapshot:{phase:'explore'}
    });

    expect(state.pending).toBe('explore');
    expect(state.commitAt).toBe(4);

    state=updateAdaptiveMusic(state,{
      dtSeconds:2.7,
      nowCycles:4,
      snapshot:{phase:'explore'}
    });
    expect(state.zone).toBe('explore');
    expect(state.offsets.explore).toBe(4);
  });

  it('crossfades weights gradually instead of hard-cutting songs', () => {
    let state=createAdaptiveMusicState({zone:'calm',nowCycles:0});
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.01,
      nowCycles:0,
      snapshot:{phase:'challenge'}
    });
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.5,
      nowCycles:0.5,
      snapshot:{phase:'challenge'}
    });
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.2,
      nowCycles:1,
      snapshot:{phase:'challenge'}
    });

    expect(state.zone).toBe('challenge');
    expect(state.weights.challenge).toBeGreaterThan(0);
    expect(state.weights.challenge).toBeLessThan(1);
    expect(state.weights.calm).toBeGreaterThan(0);
    expect(state.weights.calm).toBeLessThan(1);
  });

  it('restarts urgent tracks while calm/explore tracks resume from phrase-aligned saved positions', () => {
    let state=createAdaptiveMusicState({zone:'explore',nowCycles:0});
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.01,
      nowCycles:0,
      snapshot:{phase:'boss'}
    });
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.5,
      nowCycles:0.5,
      snapshot:{phase:'boss'}
    });
    state=updateAdaptiveMusic(state,{
      dtSeconds:0.5,
      nowCycles:1,
      snapshot:{phase:'boss'}
    });

    expect(state.zone).toBe('boss');
    expect(state.positions.explore).toBeCloseTo(1,12);
    expect(state.offsets.boss).toBe(1);

    state=updateAdaptiveMusic(state,{
      dtSeconds:0.01,
      nowCycles:2,
      snapshot:{phase:'explore'}
    });
    state=updateAdaptiveMusic(state,{
      dtSeconds:1.3,
      nowCycles:3.3,
      snapshot:{phase:'explore'}
    });
    expect(state.pending).toBe('explore');
    expect(state.commitAt).toBe(4);

    state=updateAdaptiveMusic(state,{
      dtSeconds:0.7,
      nowCycles:4,
      snapshot:{phase:'explore'}
    });
    expect(state.zone).toBe('explore');
    expect(state.offsets.explore).toBe(4);
  });

  it('pause freezes director transitions and volume changes only affect mix output', () => {
    const original=createAdaptiveMusicState({zone:'calm',nowCycles:0,userVolume:0.6});
    const paused=setMusicPaused(original,true);
    const after=updateAdaptiveMusic(paused,{
      dtSeconds:10,
      nowCycles:20,
      snapshot:{boss:true}
    });

    expect(after).toEqual(paused);

    const loud=setMusicVolume(original,0.9);
    expect(loud.userVolume).toBe(0.9);
    expect(musicMix(loud).gains.calm).toBeCloseTo(0.9,12);
    expect(original.userVolume).toBe(0.6);
  });

  it('never mutates the gameplay snapshot supplied to the music director', () => {
    const snapshot={
      phase:'challenge',
      pressure:0.8,
      nested:{score:12}
    };
    const before=JSON.parse(JSON.stringify(snapshot));

    updateAdaptiveMusic(
      createAdaptiveMusicState({zone:'calm',nowCycles:0}),
      {dtSeconds:0.5,nowCycles:1,snapshot}
    );

    expect(snapshot).toEqual(before);
  });
});
