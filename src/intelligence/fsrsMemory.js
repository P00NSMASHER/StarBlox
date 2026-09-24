
import { createPlayerConceptState } from '../domainSchemas.js';

export const FSRS_MEMORY_MODEL_VERSION='starblox-fsrs-compat-v1';
export const DAY_MS=86_400_000;
export const DEFAULT_DESIRED_RETENTION=0.90;

const MIN_STABILITY_DAYS=0.15;
const MAX_STABILITY_DAYS=3650;
const MIN_DIFFICULTY=1;
const MAX_DIFFICULTY=10;

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function requireFinite(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function requireBoolean(value,label){
  if(typeof value !== 'boolean') throw new TypeError(label + ' must be boolean.');
  return value;
}

function normalizeNow(value){
  return Math.max(0,requireFinite(value,'now'));
}

function elapsedDays(state,now){
  if(!state?.lastSeenAt) return 0;
  return Math.max(0,(now - state.lastSeenAt) / DAY_MS);
}

/**
 * FSRS-compatible memory-state interpretation.
 *
 * Stability is defined as the elapsed-day interval at which retrievability
 * falls to 90%. This makes the forgetting curve intuitive:
 *   R(t) = 1 / (1 + t / (9*S))
 * and therefore R(S) = 0.9.
 *
 * The state fields intentionally match the D/S/R concepts used by Anki FSRS.
 * StarBlox keeps the update coefficients local/versioned so they can later be
 * replaced by fitted FSRS parameters without changing persisted state shape.
 */
export function retrievabilityAt(state,now){
  if(!state || (state.exposures ?? 0) <= 0 || !(state.stability > 0)) return 0;
  const days=elapsedDays(state,normalizeNow(now));
  return clamp(1 / (1 + days / (9 * state.stability)),0,1);
}

export function createConceptMemoryState({
  playerId,
  conceptId,
  now=0,
  difficulty=5
}){
  return createPlayerConceptState({
    playerId,
    conceptId,
    fsrsDifficulty:clamp(requireFinite(difficulty,'difficulty'),MIN_DIFFICULTY,MAX_DIFFICULTY),
    stability:0,
    retrievability:0,
    exposures:0,
    lapses:0,
    lastSeenAt:0,
    irtAbilityContribution:0,
    updatedAt:normalizeNow(now)
  });
}

function initialStateAfterReview(state,{correct,now}){
  const difficulty=correct
    ? clamp(state.fsrsDifficulty - 0.35,MIN_DIFFICULTY,MAX_DIFFICULTY)
    : clamp(state.fsrsDifficulty + 1.25,MIN_DIFFICULTY,MAX_DIFFICULTY);
  const stability=correct ? 1.0 : MIN_STABILITY_DAYS;

  return createPlayerConceptState({
    ...state,
    fsrsDifficulty:difficulty,
    stability,
    retrievability:1,
    exposures:1,
    lapses:correct ? 0 : 1,
    lastSeenAt:now,
    updatedAt:now
  });
}

/**
 * Apply one observed recall result to the D/S/R state.
 *
 * Correct recalls increase stability most when memory had begun to decay;
 * failures increase difficulty, count a lapse, and reduce stability.
 *
 * This follows FSRS's state semantics but intentionally does not claim to be
 * Anki's fitted FSRS parameter vector. It is a deterministic StarBlox adapter
 * whose persisted D/S/R state can be recalculated later by an exact FSRS engine.
 */
export function reviewConceptMemory(state,{
  correct,
  now,
  difficultySignal=0
}){
  if(!state || typeof state !== 'object') throw new TypeError('state must be an object.');
  requireBoolean(correct,'correct');
  const timestamp=normalizeNow(now);
  const signal=clamp(requireFinite(difficultySignal,'difficultySignal'),-1,1);

  if((state.exposures ?? 0) === 0 || !(state.stability > 0)){
    return initialStateAfterReview(state,{correct,now:timestamp});
  }

  const beforeR=retrievabilityAt(state,timestamp);
  const oldD=clamp(requireFinite(state.fsrsDifficulty,'state.fsrsDifficulty'),MIN_DIFFICULTY,MAX_DIFFICULTY);
  const oldS=clamp(requireFinite(state.stability,'state.stability'),MIN_STABILITY_DAYS,MAX_STABILITY_DAYS);

  let difficulty;
  let stability;
  let lapses=state.lapses ?? 0;

  if(correct){
    // Harder-than-expected successful recalls slightly lower D; easy/immediate
    // recalls barely change it.
    const desirableDifficultyShift=0.08 + (1 - beforeR) * 0.22 - signal * 0.10;
    difficulty=clamp(oldD - desirableDifficultyShift,MIN_DIFFICULTY,MAX_DIFFICULTY);

    // Successful recall after some forgetting is more informative and produces
    // a larger stability increase than an immediate repeat.
    const difficultyHeadroom=(MAX_DIFFICULTY + 1 - oldD) / MAX_DIFFICULTY;
    const forgettingBonus=0.35 + (1 - beforeR) * 1.65;
    const challengeBonus=1 + signal * 0.12;
    const growth=Math.max(0.08,difficultyHeadroom * forgettingBonus * challengeBonus);
    stability=clamp(oldS * (1 + growth),MIN_STABILITY_DAYS,MAX_STABILITY_DAYS);
  }else{
    lapses+=1;
    difficulty=clamp(
      oldD + 0.75 + beforeR * 0.55 + signal * 0.10,
      MIN_DIFFICULTY,
      MAX_DIFFICULTY
    );
    // A lapse sharply lowers current stability but never erases all history.
    const retainedFraction=clamp(0.28 + (1 - beforeR) * 0.12,0.22,0.45);
    stability=clamp(oldS * retainedFraction,MIN_STABILITY_DAYS,MAX_STABILITY_DAYS);
  }

  return createPlayerConceptState({
    ...state,
    fsrsDifficulty:difficulty,
    stability,
    retrievability:1,
    exposures:(state.exposures ?? 0) + 1,
    lapses,
    lastSeenAt:timestamp,
    updatedAt:timestamp
  });
}

export function projectConceptMemory(state,{now}){
  const timestamp=normalizeNow(now);
  return createPlayerConceptState({
    ...state,
    retrievability:retrievabilityAt(state,timestamp),
    updatedAt:timestamp
  });
}

export function nextReviewAt(state,{
  desiredRetention=DEFAULT_DESIRED_RETENTION
}={}){
  if(!state || (state.exposures ?? 0) <= 0 || !(state.stability > 0)) return state?.lastSeenAt ?? 0;
  const retention=clamp(requireFinite(desiredRetention,'desiredRetention'),0.5,0.99);
  // Solve R(t)=retention for the curve above.
  const intervalDays=9 * state.stability * ((1 / retention) - 1);
  return (state.lastSeenAt ?? 0) + intervalDays * DAY_MS;
}

export function memoryNeedScore(state,{
  now,
  desiredRetention=DEFAULT_DESIRED_RETENTION
}={}){
  if(!state || (state.exposures ?? 0) <= 0) return 1;
  const retention=clamp(requireFinite(desiredRetention,'desiredRetention'),0.5,0.99);
  const r=retrievabilityAt(state,normalizeNow(now));
  const deficit=clamp((retention - r) / retention,0,1);
  const lapsePressure=clamp((state.lapses ?? 0) * 0.03,0,0.18);
  const difficultyPressure=clamp(((state.fsrsDifficulty ?? 5) - 5) * 0.02,0,0.10);
  return clamp(deficit + lapsePressure + difficultyPressure,0,1);
}

export function rankConceptsByMemoryNeed(states,{
  now,
  desiredRetention=DEFAULT_DESIRED_RETENTION
}={}){
  const timestamp=normalizeNow(now);
  return [...states]
    .map(state => ({
      state,
      retrievability:retrievabilityAt(state,timestamp),
      need:memoryNeedScore(state,{now:timestamp,desiredRetention}),
      dueAt:nextReviewAt(state,{desiredRetention})
    }))
    .sort((a,b) =>
      b.need - a.need ||
      a.retrievability - b.retrievability ||
      String(a.state.conceptId).localeCompare(String(b.state.conceptId))
    );
}
