import { stableHash } from '../domainSchemas.js';

export const SIM_TICK_RATE = 60;
export const SIM_STEP_SECONDS = 1 / SIM_TICK_RATE;
export const SIM_ENGINE_VERSION = 'starblox-sim-v1';

const FRAME_MICROS_PER_MS = 1000;
const TICK_ACCUMULATOR_SCALE = 1_000_000;
const DEFAULT_MAX_FRAME_MS = 50;
const DEFAULT_MAX_TICKS_PER_FRAME = 12;
const DEFAULT_MAX_DEBT_TICKS = 2;

function assertFiniteNumber(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function assertNonNegativeInteger(value,label){
  if(!Number.isInteger(value) || value < 0){
    throw new TypeError(label + ' must be a non-negative integer.');
  }
  return value;
}

function assertPositiveInteger(value,label){
  if(!Number.isInteger(value) || value < 1){
    throw new TypeError(label + ' must be a positive integer.');
  }
  return value;
}

function cloneJson(value,label='value'){
  try{
    return JSON.parse(JSON.stringify(value));
  }catch{
    throw new TypeError(label + ' must be JSON-compatible.');
  }
}

function normalizeSeed(seed){
  assertFiniteNumber(seed,'seed');
  return Math.trunc(seed) >>> 0;
}

/**
 * Stateful Mulberry32 PRNG ported from the deterministic gameplay stream used by
 * Calculator5329/neon-vector-defense. Gameplay code must receive randomness from
 * a simulation instance instead of calling Math.random().
 */
export class Mulberry32 {
  constructor(seed){
    this.state = normalizeSeed(seed);
  }

  next(){
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15),1 | t);
    t = (t + Math.imul(t ^ (t >>> 7),61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(min,max){
    assertFiniteNumber(min,'min');
    assertFiniteNumber(max,'max');
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    if(hi < lo) throw new RangeError('max must be greater than or equal to min.');
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  snapshot(){
    return this.state >>> 0;
  }
}

function normalizeReducer(reducer){
  if(typeof reducer !== 'function'){
    throw new TypeError('reducer must be a function.');
  }
  return reducer;
}

function normalizeAction(action){
  if(!action || typeof action !== 'object' || Array.isArray(action)){
    throw new TypeError('simulation actions must be objects.');
  }
  if(typeof action.type !== 'string' || !action.type.trim()){
    throw new TypeError('simulation actions require a non-empty type.');
  }
  return cloneJson(action,'action');
}

function normalizeTickRate(value){
  const rate = value == null ? SIM_TICK_RATE : assertPositiveInteger(value,'tickRate');
  if(rate > 1000) throw new RangeError('tickRate must be at most 1000.');
  return rate;
}

function normalizeSpeed(value){
  const speed = value == null ? 1 : assertFiniteNumber(value,'speed');
  if(speed <= 0 || speed > 16) throw new RangeError('speed must be in (0,16].');
  return speed;
}

/**
 * Minimal deterministic engine kernel.
 *
 * Ordering invariant for each tick:
 *   1. apply actions scheduled for that tick in insertion order;
 *   2. apply exactly one fixed-size tick event.
 *
 * A reducer may mutate the supplied state and return undefined, or return a
 * replacement JSON-compatible state. All simulation randomness and entity IDs
 * must come from the provided context.
 */
export class DeterministicSimulation {
  constructor({
    seed,
    initialState,
    reducer,
    engineVersion=SIM_ENGINE_VERSION,
    tickRate=SIM_TICK_RATE,
    maxFrameMs=DEFAULT_MAX_FRAME_MS,
    maxTicksPerFrame=DEFAULT_MAX_TICKS_PER_FRAME,
    maxDebtTicks=DEFAULT_MAX_DEBT_TICKS
  }){
    this.seed = normalizeSeed(seed);
    this.engineVersion = String(engineVersion || SIM_ENGINE_VERSION);
    this.tickRate = normalizeTickRate(tickRate);
    this.stepSeconds = 1 / this.tickRate;
    this.reducer = normalizeReducer(reducer);
    this.state = cloneJson(initialState ?? {},'initialState');

    this.maxFrameMs = assertFiniteNumber(maxFrameMs,'maxFrameMs');
    this.maxTicksPerFrame = assertPositiveInteger(maxTicksPerFrame,'maxTicksPerFrame');
    this.maxDebtTicks = assertPositiveInteger(maxDebtTicks,'maxDebtTicks');
    if(this.maxFrameMs <= 0) throw new RangeError('maxFrameMs must be positive.');

    this.tick = 0;
    this.rng = new Mulberry32(this.seed);
    this.uidSeq = 1;
    this.actionSequence = 0;
    this.pendingActions = new Map();
    this.frameAccumulatorUnits = 0;
  }

  random(){
    return this.rng.next();
  }

  randomInt(min,max){
    return this.rng.nextInt(min,max);
  }

  nextEntityId(){
    return this.uidSeq++;
  }

  schedule(action,{tick=this.tick}={}){
    assertNonNegativeInteger(tick,'action tick');
    if(tick < this.tick) throw new RangeError('cannot schedule an action in the past.');

    const entry = {
      tick,
      sequence:this.actionSequence++,
      action:normalizeAction(action)
    };
    const queue = this.pendingActions.get(tick) || [];
    queue.push(entry);
    this.pendingActions.set(tick,queue);
    return Object.freeze(cloneJson(entry));
  }

  scheduledActionsAt(tick){
    assertNonNegativeInteger(tick,'tick');
    return (this.pendingActions.get(tick) || []).map(entry => cloneJson(entry));
  }

  context(){
    return {
      tick:this.tick,
      timeSeconds:this.tick * this.stepSeconds,
      dt:this.stepSeconds,
      seed:this.seed,
      engineVersion:this.engineVersion,
      random:() => this.random(),
      randomInt:(min,max) => this.randomInt(min,max),
      nextEntityId:() => this.nextEntityId()
    };
  }

  applyEvent(event){
    const next = this.reducer(this.state,event,this.context());
    if(next !== undefined) this.state = next;
    if(this.state === undefined){
      throw new Error('simulation reducer produced undefined state.');
    }
    return this.state;
  }

  step(){
    const currentTick = this.tick;
    const queue = this.pendingActions.get(currentTick) || [];

    for(const entry of queue){
      this.applyEvent({
        kind:'action',
        tick:currentTick,
        sequence:entry.sequence,
        action:cloneJson(entry.action)
      });
    }
    this.pendingActions.delete(currentTick);

    this.applyEvent({
      kind:'tick',
      tick:currentTick,
      dt:this.stepSeconds
    });

    this.tick++;
    return this.getState();
  }

  advanceTicks(count){
    assertNonNegativeInteger(count,'count');
    for(let i=0;i<count;i++) this.step();
    return this.getState();
  }

  advanceToTick(targetTick){
    assertNonNegativeInteger(targetTick,'targetTick');
    if(targetTick < this.tick) throw new RangeError('cannot move simulation backward.');
    return this.advanceTicks(targetTick - this.tick);
  }

  /**
   * Rendering-frame adapter. It never passes variable dt into game rules.
   * Authoritative simulations/replays should prefer advanceTicks().
   */
  advanceFrame(rawDeltaMs,{speed=1}={}){
    const deltaMs = assertFiniteNumber(rawDeltaMs,'rawDeltaMs');
    if(deltaMs < 0) throw new RangeError('rawDeltaMs cannot be negative.');
    const normalizedSpeed = normalizeSpeed(speed);

    const clampedMs = Math.min(deltaMs,this.maxFrameMs);
    const deltaMicros = Math.round(clampedMs * FRAME_MICROS_PER_MS);
    this.frameAccumulatorUnits += deltaMicros * this.tickRate * normalizedSpeed;

    let stepped = 0;
    while(
      this.frameAccumulatorUnits >= TICK_ACCUMULATOR_SCALE &&
      stepped < this.maxTicksPerFrame
    ){
      this.frameAccumulatorUnits -= TICK_ACCUMULATOR_SCALE;
      this.step();
      stepped++;
    }

    this.frameAccumulatorUnits = Math.min(
      this.frameAccumulatorUnits,
      TICK_ACCUMULATOR_SCALE * this.maxDebtTicks
    );

    return {
      ticks:stepped,
      tick:this.tick,
      alpha:this.frameAccumulatorUnits / TICK_ACCUMULATOR_SCALE
    };
  }

  getState(){
    return cloneJson(this.state,'state');
  }

  stateHash(){
    return stableHash({
      engineVersion:this.engineVersion,
      seed:this.seed,
      tick:this.tick,
      rngState:this.rng.snapshot(),
      nextEntityId:this.uidSeq,
      state:this.state
    });
  }

  snapshot(){
    const pendingActions = [...this.pendingActions.entries()]
      .sort((a,b) => a[0] - b[0])
      .flatMap(([,entries]) => entries.map(entry => cloneJson(entry)));

    const payload = {
      schemaVersion:1,
      engineVersion:this.engineVersion,
      seed:this.seed,
      tickRate:this.tickRate,
      tick:this.tick,
      rngState:this.rng.snapshot(),
      nextEntityId:this.uidSeq,
      nextActionSequence:this.actionSequence,
      frameAccumulatorUnits:this.frameAccumulatorUnits,
      pendingActions,
      state:this.getState()
    };

    return Object.freeze({
      ...payload,
      snapshotHash:stableHash(payload)
    });
  }
}

export function createDeterministicSimulation(options){
  return new DeterministicSimulation(options);
}
