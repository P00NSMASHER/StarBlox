
import { createPlayerConceptState } from '../domainSchemas.js';

export const FSRS6_DEFAULT_DECAY = 0.1542;
export const FSRS6_DEFAULT_PARAMETERS = Object.freeze([
  0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,
  0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,
  FSRS6_DEFAULT_DECAY
]);

export const FSRS_STABILITY_MIN = 0.0001;
export const FSRS_STABILITY_MAX = 36500;
export const FSRS_DIFFICULTY_MIN = 1;
export const FSRS_DIFFICULTY_MAX = 10;
export const DEFAULT_DESIRED_RETENTION = 0.9;
const DAY_MS = 86_400_000;

function clamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function finite(value,label){
  if(typeof value !== 'number' || !Number.isFinite(value)){
    throw new TypeError(label + ' must be a finite number.');
  }
  return value;
}

function ratingValue(rating){
  if(!Number.isInteger(rating) || rating < 1 || rating > 4){
    throw new TypeError('rating must be an integer 1..4.');
  }
  return rating;
}

function elapsedDays(lastSeenAt,atMs,{round=true}={}){
  const delta=Math.max(0,finite(atMs,'atMs') - Math.max(0,finite(lastSeenAt,'lastSeenAt')));
  const days=delta / DAY_MS;
  return round ? Math.round(days) : days;
}

export function ratingFromAttempt({
  correct,
  wasRetry=false,
  fluent=false
}={}){
  if(typeof correct !== 'boolean') throw new TypeError('correct must be boolean.');
  if(!correct) return 1;       // Again
  if(wasRetry) return 2;       // Hard / relearning
  if(fluent) return 4;         // Easy
  return 3;                    // Good
}

export function fsrsRetrievability(stability,daysElapsed,{
  decay=FSRS6_DEFAULT_DECAY,
  roundElapsedDays=true
}={}){
  const s=clamp(finite(stability,'stability'),FSRS_STABILITY_MIN,FSRS_STABILITY_MAX);
  const d=Math.max(0,finite(daysElapsed,'daysElapsed'));
  const t=roundElapsedDays ? Math.round(d) : d;
  const cleanDecay=finite(decay,'decay');
  if(cleanDecay <= 0) throw new RangeError('decay must be positive.');

  const factor=Math.pow(0.9,1 / -cleanDecay) - 1;
  return Math.pow((t / s) * factor + 1,-cleanDecay);
}

export function retrievabilityAt(state,atMs,{
  decay=FSRS6_DEFAULT_DECAY,
  roundElapsedDays=true
}={}){
  if(!state || typeof state !== 'object') throw new TypeError('state must be an object.');
  if((state.exposures ?? 0) <= 0 || (state.stability ?? 0) <= 0) return 0;
  const days=elapsedDays(state.lastSeenAt ?? 0,atMs,{round:roundElapsedDays});
  return fsrsRetrievability(state.stability,days,{decay,roundElapsedDays:false});
}

function initDifficulty(params,rating){
  return clamp(
    params[4] - Math.exp(params[5] * (rating - 1)) + 1,
    FSRS_DIFFICULTY_MIN,
    FSRS_DIFFICULTY_MAX
  );
}

function meanReversion(params,initial,current){
  return params[7] * initial + (1 - params[7]) * current;
}

function nextDifficulty(params,difficulty,rating){
  const d=clamp(difficulty,FSRS_DIFFICULTY_MIN,FSRS_DIFFICULTY_MAX);
  const delta=-params[6] * (rating - 3);
  const next=d + ((10 - d) / 9) * delta;
  return clamp(
    meanReversion(params,initDifficulty(params,4),next),
    FSRS_DIFFICULTY_MIN,
    FSRS_DIFFICULTY_MAX
  );
}

function stabilityAfterSuccess(params,stability,retrievability,difficulty,rating){
  const hardPenalty=rating === 2 ? params[15] : 1;
  const easyBonus=rating === 4 ? params[16] : 1;
  const growth=
    Math.exp(params[8]) *
    (11 - difficulty) *
    Math.pow(stability,-params[9]) *
    (Math.exp((1 - retrievability) * params[10]) - 1) *
    hardPenalty *
    easyBonus;

  return clamp(stability * (growth + 1),FSRS_STABILITY_MIN,FSRS_STABILITY_MAX);
}

function stabilityAfterFailure(params,stability,retrievability,difficulty){
  const newMin=stability / Math.exp(params[17] * params[18]);
  const candidate=
    params[11] *
    Math.pow(difficulty,-params[12]) *
    (Math.pow(stability + 1,params[13]) - 1) *
    Math.exp((1 - retrievability) * params[14]);
  return clamp(Math.min(candidate,newMin),FSRS_STABILITY_MIN,FSRS_STABILITY_MAX);
}

function shortTermStability(params,stability,rating){
  const multiplier=
    Math.exp(params[17] * (rating - 3 + params[18])) *
    Math.pow(stability,-params[19]);
  const adjusted=rating >= 2 ? Math.max(1,multiplier) : multiplier;
  return clamp(stability * adjusted,FSRS_STABILITY_MIN,FSRS_STABILITY_MAX);
}

export function nextFsrsMemoryState({
  stability,
  difficulty,
  rating,
  daysElapsed,
  params=FSRS6_DEFAULT_PARAMETERS
}){
  const r=ratingValue(rating);
  const s=clamp(finite(stability,'stability'),FSRS_STABILITY_MIN,FSRS_STABILITY_MAX);
  const d=clamp(finite(difficulty,'difficulty'),FSRS_DIFFICULTY_MIN,FSRS_DIFFICULTY_MAX);
  const elapsed=Math.max(0,Math.round(finite(daysElapsed,'daysElapsed')));
  const retrievability=fsrsRetrievability(s,elapsed,{roundElapsedDays:false});

  const nextStability=elapsed === 0
    ? shortTermStability(params,s,r)
    : r === 1
      ? stabilityAfterFailure(params,s,retrievability,d)
      : stabilityAfterSuccess(params,s,retrievability,d,r);

  return {
    stability:nextStability,
    difficulty:nextDifficulty(params,d,r),
    retrievability
  };
}

export function initializeFsrsMemoryState({
  playerId,
  conceptId,
  rating,
  atMs,
  params=FSRS6_DEFAULT_PARAMETERS
}){
  const r=ratingValue(rating);
  const now=finite(atMs,'atMs');
  return createPlayerConceptState({
    playerId,
    conceptId,
    fsrsDifficulty:initDifficulty(params,r),
    stability:clamp(params[r - 1],FSRS_STABILITY_MIN,FSRS_STABILITY_MAX),
    retrievability:1,
    exposures:1,
    lapses:r === 1 ? 1 : 0,
    lastSeenAt:now,
    irtAbilityContribution:0,
    updatedAt:now
  });
}

export function updateConceptMemory(state,{
  correct,
  wasRetry=false,
  fluent=false,
  rating,
  atMs,
  params=FSRS6_DEFAULT_PARAMETERS
}={}){
  if(!state || typeof state !== 'object') throw new TypeError('state must be an object.');
  const now=finite(atMs,'atMs');
  const resolvedRating=rating == null
    ? ratingFromAttempt({correct,wasRetry,fluent})
    : ratingValue(rating);

  if((state.exposures ?? 0) <= 0 || (state.stability ?? 0) <= 0){
    return initializeFsrsMemoryState({
      playerId:state.playerId,
      conceptId:state.conceptId,
      rating:resolvedRating,
      atMs:now,
      params
    });
  }

  const days=elapsedDays(state.lastSeenAt ?? now,now,{round:true});
  const next=nextFsrsMemoryState({
    stability:state.stability,
    difficulty:state.fsrsDifficulty,
    rating:resolvedRating,
    daysElapsed:days,
    params
  });

  return createPlayerConceptState({
    playerId:state.playerId,
    conceptId:state.conceptId,
    fsrsDifficulty:next.difficulty,
    stability:next.stability,
    retrievability:1,
    exposures:(state.exposures ?? 0) + 1,
    lapses:(state.lapses ?? 0) + (resolvedRating === 1 ? 1 : 0),
    lastSeenAt:now,
    irtAbilityContribution:state.irtAbilityContribution ?? 0,
    updatedAt:now
  });
}

export function nextReviewIntervalDays(state,{
  desiredRetention=DEFAULT_DESIRED_RETENTION,
  decay=FSRS6_DEFAULT_DECAY
}={}){
  if(!state || typeof state !== 'object') throw new TypeError('state must be an object.');
  const stability=clamp(finite(state.stability,'state.stability'),FSRS_STABILITY_MIN,FSRS_STABILITY_MAX);
  const retention=clamp(finite(desiredRetention,'desiredRetention'),0.0001,0.9999);
  const cleanDecay=finite(decay,'decay');
  const power=-cleanDecay;
  const factor=Math.pow(0.9,1 / power) - 1;
  return clamp(
    stability / factor * (Math.pow(retention,1 / power) - 1),
    0,
    FSRS_STABILITY_MAX
  );
}

export function memoryNeed(state,atMs,{
  desiredRetention=DEFAULT_DESIRED_RETENTION
}={}){
  const r=retrievabilityAt(state,atMs);
  const target=clamp(desiredRetention,0.0001,0.9999);
  return {
    retrievability:r,
    desiredRetention:target,
    due:r <= target,
    need:clamp((target - r) / target,0,1)
  };
}
