import { describe, expect, it } from 'vitest';
import {
  DeterministicSimulation,
  Mulberry32,
  SIM_ENGINE_VERSION,
  SIM_TICK_RATE
} from './deterministicCore';

function demoReducer(state,event,ctx){
  if(event.kind === 'action'){
    const action = event.action;

    if(action.type === 'spawn'){
      state.entities.push({
        id:ctx.nextEntityId(),
        x:action.x ?? 0,
        velocity:ctx.randomInt(1,4)
      });
    }

    if(action.type === 'boost'){
      const entity = state.entities.find(item => item.id === action.id);
      if(entity) entity.velocity += action.amount;
    }

    if(action.type === 'reward'){
      state.score += action.amount;
    }
  }

  if(event.kind === 'tick'){
    for(const entity of state.entities){
      entity.x += entity.velocity;
    }
    state.elapsedTicks++;
  }
}

function build(seed=123){
  return new DeterministicSimulation({
    seed,
    initialState:{entities:[],score:0,elapsedTicks:0},
    reducer:demoReducer
  });
}

describe('StarBlox deterministic simulation core', () => {
  it('pins the Mulberry32 gameplay stream', () => {
    const rng = new Mulberry32(123456789);
    const values = [rng.next(),rng.next(),rng.next(),rng.next(),rng.next()];

    expect(values).toEqual([
      0.2577907438389957,
      0.9707721115555614,
      0.7853280142880976,
      0.20616457983851433,
      0.30307188746519387
    ]);
  });

  it('runs at a fixed 60Hz by default', () => {
    const sim = build();
    expect(SIM_TICK_RATE).toBe(60);
    expect(sim.tickRate).toBe(60);
    sim.advanceTicks(60);
    expect(sim.tick).toBe(60);
    expect(sim.getState().elapsedTicks).toBe(60);
  });

  it('reproduces an identical golden state from seed plus ordered actions', () => {
    const run = () => {
      const sim = build(9001);
      sim.schedule({type:'spawn',x:2},{tick:0});
      sim.schedule({type:'spawn',x:10},{tick:0});
      sim.schedule({type:'reward',amount:7},{tick:2});
      sim.schedule({type:'boost',id:1,amount:3},{tick:3});
      sim.advanceTicks(8);
      return {
        state:sim.getState(),
        stateHash:sim.stateHash(),
        snapshotHash:sim.snapshot().snapshotHash
      };
    };

    const first = run();
    const second = run();

    expect(second).toEqual(first);
    expect(first.state).toEqual({
      entities:[
        {id:1,x:35,velocity:7},
        {id:2,x:42,velocity:4}
      ],
      score:7,
      elapsedTicks:8
    });
    expect(first.stateHash).toBe('fnv1a32:004a8c68');
    expect(first.snapshotHash).toBe('fnv1a32:f36673cf');
  });

  it('keeps same-tick actions in insertion order', () => {
    const sim = build(1);
    sim.schedule({type:'spawn',x:0},{tick:0});
    sim.schedule({type:'boost',id:1,amount:5},{tick:0});
    sim.step();

    expect(sim.getState().entities[0]).toEqual({
      id:1,
      x:7,
      velocity:7
    });
  });

  it('uses per-simulation entity IDs instead of process-global counters', () => {
    const a = build(5);
    const b = build(5);

    a.schedule({type:'spawn'},{tick:0});
    b.schedule({type:'spawn'},{tick:0});
    a.step();
    b.step();

    expect(a.getState().entities[0].id).toBe(1);
    expect(b.getState().entities[0].id).toBe(1);
    expect(a.stateHash()).toBe(b.stateHash());
  });

  it('is invariant to rendering-frame batching when elapsed time is equal', () => {
    const a = build(42);
    const b = build(42);
    a.schedule({type:'spawn'},{tick:0});
    b.schedule({type:'spawn'},{tick:0});

    for(let i=0;i<50;i++) a.advanceFrame(20);
    for(let i=0;i<100;i++) b.advanceFrame(10);

    expect(a.tick).toBe(60);
    expect(b.tick).toBe(60);
    expect(a.getState()).toEqual(b.getState());
    expect(a.stateHash()).toBe(b.stateHash());
  });

  it('diverges when the gameplay seed changes', () => {
    const a = build(41);
    const b = build(42);
    a.schedule({type:'spawn'},{tick:0});
    b.schedule({type:'spawn'},{tick:0});
    a.advanceTicks(4);
    b.advanceTicks(4);

    expect(a.stateHash()).not.toBe(b.stateHash());
  });

  it('rejects past actions and variable-time reducer stepping', () => {
    const sim = build();
    sim.advanceTicks(2);

    expect(() => sim.schedule({type:'reward',amount:1},{tick:1})).toThrow(/past/);
    expect(sim.engineVersion).toBe(SIM_ENGINE_VERSION);
  });
});
