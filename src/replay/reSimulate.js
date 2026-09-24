import { createReplayManifest, stableHash } from '../domainSchemas';
import {
  DeterministicSimulation,
  SIM_ENGINE_VERSION,
  SIM_TICK_RATE
} from '../sim/deterministicCore';
import {
  REPLAY_ACTION_CODEC,
  buildReplayActionBundle,
  decodeReplayActionBundle,
  replayActionHash,
  validReplayActionPack
} from './replayCodec';

export const REPLAY_RECORDING_SCHEMA = 1;
export const DEFAULT_RESIM_WALL_CLOCK_MS = 30_000;
export const DEFAULT_RESIM_MAX_TICKS = 1_200_000;

function nowMs(){
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

function cloneJson(value,label='value'){
  try{
    return JSON.parse(JSON.stringify(value));
  }catch{
    throw new TypeError(label + ' must be JSON-compatible.');
  }
}

function initialStateHash({seed,initialState,engineVersion=SIM_ENGINE_VERSION,tickRate=SIM_TICK_RATE}){
  const sim = new DeterministicSimulation({
    seed,
    initialState,
    engineVersion,
    tickRate,
    reducer:() => {}
  });
  return sim.stateHash();
}

function canonicalManifestMatches(manifest){
  if(!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return false;
  try{
    const rebuilt = createReplayManifest({
      replayId:manifest.replayId,
      engineVersion:manifest.engineVersion,
      seed:manifest.seed,
      initialStateHash:manifest.initialStateHash,
      actionCodec:manifest.actionCodec,
      actionCount:manifest.actionCount,
      actionHash:manifest.actionHash,
      summaryHash:manifest.summaryHash,
      createdAt:manifest.createdAt
    });
    return rebuilt.schemaVersion === manifest.schemaVersion && rebuilt.manifestHash === manifest.manifestHash;
  }catch{
    return false;
  }
}

export function createReplayRecording({
  replayId,
  initialState,
  simulation,
  actions,
  summary={},
  createdAt
}){
  if(!simulation || typeof simulation.stateHash !== 'function'){
    throw new TypeError('simulation must be a DeterministicSimulation-compatible instance.');
  }

  const actionBundle = buildReplayActionBundle(actions);
  const summaryValue = cloneJson(summary,'summary');
  const finalStateHash = simulation.stateHash();
  const setupHash = initialStateHash({
    seed:simulation.seed,
    initialState,
    engineVersion:simulation.engineVersion,
    tickRate:simulation.tickRate
  });

  const manifest = createReplayManifest({
    replayId,
    engineVersion:simulation.engineVersion,
    seed:simulation.seed,
    initialStateHash:setupHash,
    actionCodec:REPLAY_ACTION_CODEC,
    actionCount:actionBundle.totalCount,
    actionHash:actionBundle.manifest.actionHash,
    summaryHash:stableHash(summaryValue),
    createdAt
  });

  return Object.freeze({
    schemaVersion:REPLAY_RECORDING_SCHEMA,
    manifest,
    tickRate:simulation.tickRate,
    finalTick:simulation.tick,
    finalStateHash,
    eventCount:actionBundle.totalCount,
    actionManifest:actionBundle.manifest,
    actions:actionBundle.rootActions,
    chunks:actionBundle.chunks
  });
}

export function validateReplayRecording(recording){
  if(!recording || typeof recording !== 'object' || Array.isArray(recording)){
    return {ok:false,reason:'recording must be an object'};
  }
  if(recording.schemaVersion !== REPLAY_RECORDING_SCHEMA){
    return {ok:false,reason:'unsupported replay recording schema'};
  }
  if(!canonicalManifestMatches(recording.manifest)){
    return {ok:false,reason:'canonical replay manifest mismatch'};
  }
  if(recording.manifest.actionCodec !== REPLAY_ACTION_CODEC){
    return {ok:false,reason:'unsupported replay action codec'};
  }
  if(!validReplayActionPack(recording.actions)){
    return {ok:false,reason:'invalid root action pack'};
  }
  if(!Array.isArray(recording.chunks)){
    return {ok:false,reason:'replay chunks must be an array'};
  }
  if(!recording.actionManifest || recording.actionManifest.complete !== true){
    return {ok:false,reason:'missing complete action manifest'};
  }
  if(!Array.isArray(recording.actionManifest.chunkEventCounts)){
    return {ok:false,reason:'invalid chunk event counts'};
  }
  if(recording.chunks.length !== recording.actionManifest.chunkEventCounts.length){
    return {ok:false,reason:'chunk count does not match action manifest'};
  }

  let total = recording.actions.count;
  for(let i=0;i<recording.chunks.length;i++){
    const chunk = recording.chunks[i];
    if(!chunk || chunk.schemaVersion !== 1 || chunk.chunk !== i || !validReplayActionPack(chunk.actions)){
      return {ok:false,reason:'invalid or out-of-order replay chunk'};
    }
    if(chunk.actions.count !== recording.actionManifest.chunkEventCounts[i]){
      return {ok:false,reason:'chunk event count mismatch'};
    }
    total += chunk.actions.count;
  }

  if(total !== recording.eventCount || total !== recording.manifest.actionCount){
    return {ok:false,reason:'eventCount mismatch'};
  }

  const actionHash = replayActionHash(recording.actions,recording.chunks);
  if(
    actionHash !== recording.actionManifest.actionHash ||
    actionHash !== recording.manifest.actionHash
  ){
    return {ok:false,reason:'action hash mismatch'};
  }

  if(!Number.isInteger(recording.finalTick) || recording.finalTick < 0){
    return {ok:false,reason:'invalid finalTick'};
  }
  if(typeof recording.finalStateHash !== 'string' || !recording.finalStateHash){
    return {ok:false,reason:'missing finalStateHash'};
  }

  return {ok:true};
}

export function reSimulateReplay(recording,{
  initialState,
  reducer,
  summaryBuilder,
  expectedEngineVersion=SIM_ENGINE_VERSION,
  wallClockMs=DEFAULT_RESIM_WALL_CLOCK_MS,
  maxTicks=DEFAULT_RESIM_MAX_TICKS
}={}){
  const integrity = validateReplayRecording(recording);
  if(!integrity.ok){
    return {verdict:'unverifiable',reason:integrity.reason};
  }

  if(recording.manifest.engineVersion !== expectedEngineVersion){
    return {
      verdict:'unverifiable',
      reason:'engine mismatch: run=' + recording.manifest.engineVersion + ' current=' + expectedEngineVersion
    };
  }

  if(recording.tickRate !== SIM_TICK_RATE){
    return {verdict:'unverifiable',reason:'unsupported simulation tick rate'};
  }

  if(typeof reducer !== 'function'){
    return {verdict:'unverifiable',reason:'missing simulation reducer'};
  }

  let trustedInitialState;
  try{
    trustedInitialState = cloneJson(initialState ?? {},'initialState');
  }catch(error){
    return {verdict:'unverifiable',reason:error instanceof Error ? error.message : 'invalid initialState'};
  }

  const trustedInitialHash = initialStateHash({
    seed:recording.manifest.seed,
    initialState:trustedInitialState,
    engineVersion:recording.manifest.engineVersion,
    tickRate:recording.tickRate
  });
  if(trustedInitialHash !== recording.manifest.initialStateHash){
    return {verdict:'unverifiable',reason:'trusted initial state does not match replay setup'};
  }

  const entries = decodeReplayActionBundle(recording.actions,recording.chunks);
  if(entries.length !== recording.eventCount){
    return {verdict:'unverifiable',reason:'action decode count mismatch'};
  }

  for(let i=0;i<entries.length;i++){
    const current = entries[i];
    if(i > 0 && current.tick < entries[i - 1].tick){
      return {verdict:'unverifiable',reason:'action ticks are not monotonic'};
    }
    if(current.tick >= recording.finalTick){
      return {verdict:'unverifiable',reason:'action is scheduled at or beyond finalTick'};
    }
  }

  if(!Number.isInteger(maxTicks) || maxTicks < 0){
    return {verdict:'unverifiable',reason:'invalid re-simulation tick budget'};
  }
  if(recording.finalTick > maxTicks){
    return {verdict:'unverifiable',reason:'re-simulation step limit exceeded'};
  }

  const budget = Number.isFinite(wallClockMs) ? Math.max(0,wallClockMs) : Number.POSITIVE_INFINITY;
  const deadline = Number.isFinite(budget) ? nowMs() + budget : Number.POSITIVE_INFINITY;

  let simulation;
  try{
    simulation = new DeterministicSimulation({
      seed:recording.manifest.seed,
      initialState:trustedInitialState,
      engineVersion:recording.manifest.engineVersion,
      tickRate:recording.tickRate,
      reducer
    });
    for(const entry of entries){
      simulation.schedule(entry.action,{tick:entry.tick});
    }
  }catch(error){
    return {
      verdict:'unverifiable',
      reason:error instanceof Error ? error.message : 'could not initialize replay simulation'
    };
  }

  try{
    while(simulation.tick < recording.finalTick){
      if((simulation.tick & 63) === 0 && nowMs() >= deadline){
        return {verdict:'unverifiable',reason:'re-simulation wall-clock budget exceeded'};
      }
      simulation.step();
    }
  }catch(error){
    return {
      verdict:'divergent',
      reason:error instanceof Error ? error.message : 'recorded action stream was rejected',
      divergence:{
        field:'simulation',
        expected:'recorded action stream to apply',
        actual:'reducer rejected stream',
        at:{tick:simulation.tick}
      }
    };
  }

  const finalStateHash = simulation.stateHash();
  if(finalStateHash !== recording.finalStateHash){
    return {
      verdict:'divergent',
      reason:'final state hash mismatch',
      divergence:{
        field:'finalStateHash',
        expected:recording.finalStateHash,
        actual:finalStateHash,
        at:{tick:simulation.tick}
      },
      state:simulation.getState()
    };
  }

  let summary;
  if(typeof summaryBuilder === 'function'){
    try{
      summary = cloneJson(summaryBuilder(simulation.getState(),simulation),'summary');
    }catch(error){
      return {
        verdict:'unverifiable',
        reason:error instanceof Error ? error.message : 'summary builder failed'
      };
    }

    const summaryHash = stableHash(summary);
    if(summaryHash !== recording.manifest.summaryHash){
      return {
        verdict:'divergent',
        reason:'summary hash mismatch',
        divergence:{
          field:'summaryHash',
          expected:recording.manifest.summaryHash,
          actual:summaryHash,
          at:{tick:simulation.tick}
        },
        state:simulation.getState(),
        summary
      };
    }
  }

  return {
    verdict:'verified',
    finalStateHash,
    state:simulation.getState(),
    summary
  };
}
