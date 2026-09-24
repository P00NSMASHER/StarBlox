
import { describe,expect,it } from 'vitest';
import {
  acceptMovementCommand,
  createActionAuthorityConfig,
  createPlayerActionState,
  recordAuthoritativeSnapshot,
  rewindAuthoritativePosition,
  validateAuthoritativeHitscan
} from './actionAuthority.js';

describe('Step 9 authoritative action core', () => {
  it('accepts bounded monotonic movement input and rejects speed/rate/clock abuse', () => {
    const config=createActionAuthorityConfig({
      maxCommandsPerSecond:2,
      maxClientClockSkewMs:100,
      minDeltaMs:4,
      maxDeltaMs:50
    });
    let state=createPlayerActionState({playerId:'p1'});

    const first=acceptMovementCommand(state,config,{
      sequence:1,
      clientTimeMs:1000,
      deltaMs:16,
      moveX:0.5,
      moveZ:0.5,
      jump:false,
      lookYaw:1
    },{serverTimeMs:1000});
    expect(first.ok).toBe(true);
    state=first.state;

    const stale=acceptMovementCommand(state,config,{
      sequence:1,
      clientTimeMs:1010,
      deltaMs:16,
      moveX:0,
      moveZ:0
    },{serverTimeMs:1010});
    expect(stale.ok).toBe(false);
    expect(stale.duplicate).toBe(true);

    const tooFast=acceptMovementCommand(state,config,{
      sequence:2,
      clientTimeMs:1010,
      deltaMs:16,
      moveX:2,
      moveZ:0
    },{serverTimeMs:1010});
    expect(tooFast.reason).toMatch(/magnitude/);

    const skewed=acceptMovementCommand(state,config,{
      sequence:2,
      clientTimeMs:5000,
      deltaMs:16,
      moveX:0,
      moveZ:0
    },{serverTimeMs:1020});
    expect(skewed.reason).toMatch(/clock/);

    state=acceptMovementCommand(state,config,{
      sequence:2,
      clientTimeMs:1030,
      deltaMs:16,
      moveX:0,
      moveZ:0
    },{serverTimeMs:1030}).state;

    const rate=acceptMovementCommand(state,config,{
      sequence:3,
      clientTimeMs:1040,
      deltaMs:16,
      moveX:0,
      moveZ:0
    },{serverTimeMs:1040});
    expect(rate.reason).toMatch(/rate/);
  });

  it('keeps only bounded authoritative history and interpolates rewind positions', () => {
    const config=createActionAuthorityConfig({historyMs:1000,maxSnapshotCount:10});
    let state=createPlayerActionState({playerId:'target'});
    state=recordAuthoritativeSnapshot(state,config,{
      serverTimeMs:1000,
      position:{x:0,y:0,z:0}
    });
    state=recordAuthoritativeSnapshot(state,config,{
      serverTimeMs:1500,
      position:{x:10,y:0,z:0}
    });
    state=recordAuthoritativeSnapshot(state,config,{
      serverTimeMs:2100,
      position:{x:20,y:0,z:0}
    });

    expect(state.snapshots[0].serverTimeMs).toBe(1500);
    const rewound=rewindAuthoritativePosition(state,1800);
    expect(rewound.position.x).toBeCloseTo(15,6);
  });

  it('validates hits against rewound server positions rather than client hit claims', () => {
    const config=createActionAuthorityConfig({
      maxShotOriginError:3,
      maxShotRange:100,
      defaultHitRadius:2
    });

    let shooter=createPlayerActionState({playerId:'shooter'});
    let target=createPlayerActionState({playerId:'target'});

    for(const [time,sx,tx] of [
      [1000,0,20],
      [1100,1,21],
      [1200,2,22]
    ]){
      shooter=recordAuthoritativeSnapshot(shooter,config,{
        serverTimeMs:time,
        position:{x:sx,y:0,z:0}
      });
      target=recordAuthoritativeSnapshot(target,config,{
        serverTimeMs:time,
        position:{x:tx,y:0,z:0}
      });
    }

    const hit=validateAuthoritativeHitscan({
      shooterState:shooter,
      targetStates:[{state:target,hitRadius:2}],
      config,
      clientShotTimeMs:1100,
      origin:{x:1,y:0,z:0},
      direction:{x:1,y:0,z:0}
    });

    expect(hit.ok).toBe(true);
    expect(hit.serverVerified).toBe(true);
    expect(hit.hit.playerId).toBe('target');
    expect(hit.hit.rewoundPosition.x).toBe(21);

    const forgedOrigin=validateAuthoritativeHitscan({
      shooterState:shooter,
      targetStates:[{state:target}],
      config,
      clientShotTimeMs:1100,
      origin:{x:50,y:0,z:0},
      direction:{x:-1,y:0,z:0}
    });
    expect(forgedOrigin.ok).toBe(false);
    expect(forgedOrigin.reason).toMatch(/origin/);
  });

  it('chooses the nearest valid rewound target on the server', () => {
    const config=createActionAuthorityConfig({maxShotRange:100});
    let shooter=createPlayerActionState({playerId:'s'});
    let near=createPlayerActionState({playerId:'near'});
    let far=createPlayerActionState({playerId:'far'});

    shooter=recordAuthoritativeSnapshot(shooter,config,{serverTimeMs:1000,position:{x:0,y:0,z:0}});
    near=recordAuthoritativeSnapshot(near,config,{serverTimeMs:1000,position:{x:10,y:0,z:0}});
    far=recordAuthoritativeSnapshot(far,config,{serverTimeMs:1000,position:{x:20,y:0,z:0}});

    const result=validateAuthoritativeHitscan({
      shooterState:shooter,
      targetStates:[{state:far},{state:near}],
      config,
      clientShotTimeMs:1000,
      origin:{x:0,y:0,z:0},
      direction:{x:1,y:0,z:0}
    });

    expect(result.hit.playerId).toBe('near');
  });
});
