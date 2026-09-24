
import { describe,expect,it } from 'vitest';
import {
  advanceAuthorityTick,
  authorityStateDigest,
  createActionAuthorityState,
  recordAuthoritativeSnapshot,
  snapshotAtOrBefore,
  submitActionIntent,
  validateLagCompensatedHit,
  verifyActionAuthorityState
} from './actionAuthorityEngine.js';

function stateAt(tick=100){
  return createActionAuthorityState({
    serverTick:tick,
    maxRewindTicks:60,
    maxFutureTicks:2,
    maxSequenceGap:20,
    maxCommandsPerPlayer:4,
    maxSnapshots:8
  });
}

describe('Step 9 authoritative action core', () => {
  it('accepts intent only and rejects client-authored state/outcome fields', () => {
    const state=stateAt();
    const badFields=['position','velocity','health','damage','score','reward','coins','xp','stars','correct','hit'];

    for(const field of badFields){
      expect(() => submitActionIntent(state,{
        playerId:'1',
        intent:{
          sequence:1,
          clientTick:100,
          moveX:0,
          moveZ:0,
          action:'move',
          [field]:123
        }
      })).toThrow(/authoritative outcome\/state field/);
    }
  });

  it('normalizes movement and aim vectors and enforces monotonic sequences', () => {
    const state=stateAt();
    const first=submitActionIntent(state,{
      playerId:'1',
      intent:{
        sequence:1,
        clientTick:100,
        moveX:3,
        moveZ:4,
        action:'primary',
        aimX:10,
        aimY:0,
        aimZ:0,
        targetId:'2'
      }
    });

    expect(first.accepted).toBe(true);
    expect(Math.hypot(first.command.moveX,first.command.moveZ)).toBeCloseTo(1,12);
    expect(first.command.aimX).toBeCloseTo(1,12);
    expect(first.command.aimY).toBe(0);
    expect(first.command.aimZ).toBe(0);

    const duplicate=submitActionIntent(first.state,{
      playerId:'1',
      intent:{
        sequence:1,
        clientTick:100,
        moveX:0,
        moveZ:0,
        action:'move'
      }
    });
    expect(duplicate).toMatchObject({
      accepted:false,
      reason:'duplicate_or_out_of_order_sequence'
    });

    const hugeGap=submitActionIntent(first.state,{
      playerId:'1',
      intent:{
        sequence:50,
        clientTick:100,
        moveX:0,
        moveZ:0,
        action:'move'
      }
    });
    expect(hugeGap).toMatchObject({
      accepted:false,
      reason:'sequence_gap_too_large'
    });
  });

  it('rejects stale and future-tick manipulation outside the bounded timing window', () => {
    const state=stateAt(100);

    expect(() => submitActionIntent(state,{
      playerId:'1',
      intent:{sequence:1,clientTick:39,moveX:0,moveZ:0,action:'move'}
    })).toThrow(/outside rewind window/);

    expect(() => submitActionIntent(state,{
      playerId:'1',
      intent:{sequence:1,clientTick:103,moveX:0,moveZ:0,action:'move'}
    })).toThrow(/too far ahead/);
  });

  it('uses a rolling command budget rather than a lifetime input cap', () => {
    let state=stateAt(100);

    for(let i=1;i<=4;i++){
      const result=submitActionIntent(state,{
        playerId:'1',
        intent:{sequence:i,clientTick:100,moveX:0,moveZ:0,action:'move'}
      });
      expect(result.accepted).toBe(true);
      state=result.state;
    }

    const limited=submitActionIntent(state,{
      playerId:'1',
      intent:{sequence:5,clientTick:100,moveX:0,moveZ:0,action:'move'}
    });
    expect(limited).toMatchObject({accepted:false,reason:'command_budget_exceeded'});

    state=advanceAuthorityTick(state,{ticks:61});
    const later=submitActionIntent(state,{
      playerId:'1',
      intent:{sequence:5,clientTick:161,moveX:0,moveZ:0,action:'move'}
    });
    expect(later.accepted).toBe(true);
  });

  it('stores only bounded authoritative snapshots and resolves rewind state at or before a tick', () => {
    let state=createActionAuthorityState({
      serverTick:10,
      maxSnapshots:3
    });

    for(let tick=8;tick<=10;tick++){
      state=recordAuthoritativeSnapshot(state,{
        tick,
        players:{
          '1':{position:{x:tick,y:0,z:0},velocity:{x:1,y:0,z:0},radius:2}
        }
      });
    }

    state=advanceAuthorityTick(state,{ticks:1});
    state=recordAuthoritativeSnapshot(state,{
      tick:11,
      players:{
        '1':{position:{x:11,y:0,z:0},velocity:{x:1,y:0,z:0},radius:2}
      }
    });

    expect(state.snapshots.map(row => row.tick)).toEqual([9,10,11]);
    expect(snapshotAtOrBefore(state,10).players['1'].position.x).toBe(10);
  });

  it('verifies hits against rewound server snapshots, not current client claims', () => {
    let state=stateAt(120);

    state=recordAuthoritativeSnapshot(state,{
      tick:100,
      players:{
        '1':{position:{x:0,y:0,z:0},radius:2},
        '2':{position:{x:20,y:0,z:0},radius:2}
      }
    });
    state=recordAuthoritativeSnapshot(state,{
      tick:120,
      players:{
        '1':{position:{x:0,y:0,z:0},radius:2},
        '2':{position:{x:200,y:0,z:0},radius:2}
      }
    });

    const submitted=submitActionIntent(state,{
      playerId:'1',
      intent:{
        sequence:1,
        clientTick:100,
        moveX:0,
        moveZ:0,
        action:'primary',
        aimX:1,
        aimY:0,
        aimZ:0,
        targetId:'2'
      }
    });
    state=submitted.state;

    const result=validateLagCompensatedHit(state,{
      shooterId:'1',
      targetId:'2',
      clientTick:100,
      weapon:{range:50,minAimDot:0.95}
    });

    expect(result.verified).toBe(true);
    expect(result.rewindTick).toBe(100);
    expect(result.distance).toBe(20);
    expect(result.reason).toMatch(/requires_server_line_of_sight/);
  });

  it('rejects range, aim-cone, and target-intent mismatches without applying damage', () => {
    let state=stateAt(100);
    state=recordAuthoritativeSnapshot(state,{
      tick:100,
      players:{
        '1':{position:{x:0,y:0,z:0},radius:2},
        '2':{position:{x:0,y:0,z:30},radius:2},
        '3':{position:{x:5,y:0,z:0},radius:2}
      }
    });

    let result=submitActionIntent(state,{
      playerId:'1',
      intent:{
        sequence:1,
        clientTick:100,
        moveX:0,
        moveZ:0,
        action:'primary',
        aimX:1,
        aimY:0,
        aimZ:0,
        targetId:'2'
      }
    });
    state=result.state;

    expect(validateLagCompensatedHit(state,{
      shooterId:'1',
      targetId:'2',
      clientTick:100,
      weapon:{range:50,minAimDot:0.95}
    })).toMatchObject({verified:false,reason:'target_outside_aim_cone'});

    expect(validateLagCompensatedHit(state,{
      shooterId:'1',
      targetId:'3',
      clientTick:100,
      weapon:{range:50,minAimDot:0.95}
    })).toMatchObject({verified:false,reason:'target_intent_mismatch'});

    expect(validateLagCompensatedHit(state,{
      shooterId:'1',
      targetId:'2',
      clientTick:100,
      weapon:{range:5,minAimDot:-1}
    })).toMatchObject({verified:false,reason:'target_out_of_range'});
  });

  it('is deterministic and tamper-evident', () => {
    const a=stateAt();
    const b=stateAt();
    expect(authorityStateDigest(a)).toBe(authorityStateDigest(b));
    expect(verifyActionAuthorityState(a)).toEqual({ok:true,errors:[]});

    const tampered=JSON.parse(JSON.stringify(a));
    tampered.serverTick=999;
    expect(verifyActionAuthorityState(tampered).ok).toBe(false);
  });
});
