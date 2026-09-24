import { describe,expect,it } from 'vitest';
import { DeterministicSimulation } from '../sim/deterministicCore';
import {
  ReplayActionRecorder,
  buildReplayActionBundle,
  decodeReplayActionBundle,
  encodeReplayActions,
  replayActionHash
} from './replayCodec';
import {
  createReplayRecording,
  reSimulateReplay,
  validateReplayRecording
} from './reSimulate';

const INITIAL = {entities:[],score:0,elapsedTicks:0};

function reducer(state,event,ctx){
  if(event.kind === 'action'){
    const action = event.action;
    if(action.type === 'spawn'){
      state.entities.push({
        id:ctx.nextEntityId(),
        x:action.x ?? 0,
        velocity:ctx.randomInt(1,4)
      });
    }else if(action.type === 'boost'){
      const entity = state.entities.find(item => item.id === action.id);
      if(!entity) throw new Error('boost target missing');
      entity.velocity += action.amount;
    }else if(action.type === 'reward'){
      state.score += action.amount;
    }else{
      throw new Error('unsupported action ' + action.type);
    }
  }

  if(event.kind === 'tick'){
    for(const entity of state.entities) entity.x += entity.velocity;
    state.elapsedTicks++;
  }
}

function buildRecordedRun({actionsOverride}={}){
  const sim = new DeterministicSimulation({
    seed:9001,
    initialState:INITIAL,
    reducer
  });
  const recorder = new ReplayActionRecorder();

  const schedule = (action,tick) => {
    const entry = sim.schedule(action,{tick});
    recorder.recordScheduled(entry);
  };

  schedule({type:'spawn',x:2},0);
  schedule({type:'spawn',x:10},0);
  schedule({type:'reward',amount:7},2);
  schedule({type:'boost',id:1,amount:3},3);
  sim.advanceTicks(8);

  return {
    sim,
    recorder,
    recording:createReplayRecording({
      replayId:'replay-golden-1',
      initialState:INITIAL,
      simulation:sim,
      actions:actionsOverride ?? recorder.entries(),
      summary:{score:sim.getState().score,entityCount:sim.getState().entities.length},
      createdAt:'2026-09-24T03:30:00Z'
    })
  };
}

describe('StarBlox replay action codec', () => {
  it('round-trips tick-addressed actions without changing payloads', () => {
    const entries = [
      {tick:0,sequence:0,action:{type:'spawn',x:2,label:'alpha'}},
      {tick:0,sequence:1,action:{type:'spawn',x:10,label:'beta'}},
      {tick:9,sequence:2,action:{type:'reward',amount:7}}
    ];

    const pack = encodeReplayActions(entries);
    expect(decodeReplayActionBundle(pack,[])).toEqual(entries);
    expect(pack.codec).toBe('starblox-r1');
    expect(pack.count).toBe(3);
  });

  it('chunks long action streams and binds them with one integrity hash', () => {
    const entries = Array.from({length:1400},(_,index) => ({
      tick:index,
      sequence:index,
      action:{type:index % 2 ? 'reward' : 'spawn',amount:index,x:index}
    }));
    const bundle = buildReplayActionBundle(entries);

    expect(bundle.rootActions.count).toBe(650);
    expect(bundle.chunks.map(chunk => chunk.actions.count)).toEqual([650,100]);
    expect(bundle.totalCount).toBe(1400);
    expect(bundle.manifest.chunkEventCounts).toEqual([650,100]);
    expect(decodeReplayActionBundle(bundle.rootActions,bundle.chunks)).toHaveLength(1400);
    expect(bundle.manifest.actionHash).toBe(replayActionHash(bundle.rootActions,bundle.chunks));
  });

  it('rejects non-monotonic recorded action ticks', () => {
    const recorder = new ReplayActionRecorder();
    recorder.record({type:'reward',amount:1},{tick:5,sequence:0});
    expect(() => recorder.record({type:'reward',amount:2},{tick:4,sequence:1})).toThrow(/monotonic/);
  });
});

describe('StarBlox bounded deterministic re-simulation', () => {
  it('verifies a coherent recording by reproducing the exact final state and summary', () => {
    const {recording,sim} = buildRecordedRun();

    const result = reSimulateReplay(recording,{
      initialState:INITIAL,
      reducer,
      summaryBuilder:state => ({score:state.score,entityCount:state.entities.length})
    });

    expect(validateReplayRecording(recording)).toEqual({ok:true});
    expect(result.verdict).toBe('verified');
    expect(result.finalStateHash).toBe(sim.stateHash());
    expect(result.state).toEqual(sim.getState());
  });

  it('treats action-pack tampering without a matching manifest as unverifiable', () => {
    const {recording} = buildRecordedRun();
    const tampered = JSON.parse(JSON.stringify(recording));
    tampered.actions.data += '0';

    const result = reSimulateReplay(tampered,{
      initialState:INITIAL,
      reducer,
      summaryBuilder:state => ({score:state.score,entityCount:state.entities.length})
    });

    expect(result.verdict).toBe('unverifiable');
    expect(result.reason).toMatch(/hash|pack|decode|manifest/i);
  });

  it('marks a coherently re-packed dishonest action stream as divergent', () => {
    const {recorder} = buildRecordedRun();
    const changed = recorder.entries().map(entry => JSON.parse(JSON.stringify(entry)));
    changed[2].action.amount = 70;

    const original = buildRecordedRun();
    const tampered = createReplayRecording({
      replayId:'replay-coherent-tamper',
      initialState:INITIAL,
      simulation:original.sim,
      actions:changed,
      summary:{score:original.sim.getState().score,entityCount:original.sim.getState().entities.length},
      createdAt:'2026-09-24T03:30:00Z'
    });

    const result = reSimulateReplay(tampered,{
      initialState:INITIAL,
      reducer,
      summaryBuilder:state => ({score:state.score,entityCount:state.entities.length})
    });

    expect(validateReplayRecording(tampered)).toEqual({ok:true});
    expect(result.verdict).toBe('divergent');
    expect(result.divergence.field).toBe('finalStateHash');
  });

  it('returns unverifiable instead of hanging when the wall-clock budget is exhausted', () => {
    const {recording} = buildRecordedRun();

    const result = reSimulateReplay(recording,{
      initialState:INITIAL,
      reducer,
      wallClockMs:0,
      summaryBuilder:state => ({score:state.score,entityCount:state.entities.length})
    });

    expect(result.verdict).toBe('unverifiable');
    expect(result.reason).toMatch(/wall-clock/);
  });

  it('refuses to verify recordings from a different engine version', () => {
    const {recording} = buildRecordedRun();
    const changed = JSON.parse(JSON.stringify(recording));
    changed.manifest.engineVersion = 'future-engine';
    changed.manifest.manifestHash = 'fnv1a32:00000000';

    const result = reSimulateReplay(changed,{
      initialState:INITIAL,
      reducer
    });

    expect(result.verdict).toBe('unverifiable');
  });

  it('refuses a trusted setup that does not match the recorded initial-state hash', () => {
    const {recording} = buildRecordedRun();

    const result = reSimulateReplay(recording,{
      initialState:{...INITIAL,score:999},
      reducer
    });

    expect(result.verdict).toBe('unverifiable');
    expect(result.reason).toMatch(/initial state/);
  });
});
