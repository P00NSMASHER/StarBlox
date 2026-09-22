// Shadow-only adaptive learning primitives for StarBlox.
//
// This module intentionally does not mutate the live Quest selector. It ports the
// small, well-understood BKT / SM-2 / microchallenge ideas already validated in
// Hunter research so they can be benchmarked against the current heuristic.
//
// Reference implementations inspected:
// - skillcoco/skillcoco@805c6c784db5ad60a02d450dc1711f1b3e1381c6
//   skillcoco-core/src/bkt.rs, sm2.rs, microlearning.rs
//
// Promotion rule: live selection may consume these functions only after a
// separate held-out comparison shows better learning behavior without reward,
// persistence, question-quality, or accessibility regressions.

export const DEFAULT_BKT_PARAMS = Object.freeze({
  pKnow:0.3,
  pLearn:0.1,
  pGuess:0.2,
  pSlip:0.1
});

export const MASTERY_THRESHOLD = 0.7;
export const STRUGGLE_LOWER = 0.3;
export const DECAY_HALF_LIFE_DAYS = 3;
export const RECENCY_PENALTY_HOURS = 48;
export const W_DECAY = 1;
export const W_SR_DUE = 1.2;
export const W_RECENCY = -100;
export const DECAY_DAYS_CAP_MULT = 5;

const DAY_MS = 86400000;
const HOUR_MS = 3600000;
const clamp = (value,min,max) => Math.min(max,Math.max(min,value));

export function updateBktMastery(priorMastery,isCorrect,params=DEFAULT_BKT_PARAMS){
  const prior = clamp(Number(priorMastery),0,1);
  const pKnow = prior;
  const pCorrectKnown = 1 - params.pSlip;
  const pCorrectUnknown = params.pGuess;

  let numerator;
  let denominator;
  if(isCorrect){
    numerator = pKnow * pCorrectKnown;
    denominator = numerator + (1 - pKnow) * pCorrectUnknown;
  }else{
    numerator = pKnow * params.pSlip;
    denominator = numerator + (1 - pKnow) * (1 - pCorrectUnknown);
  }
  const posterior = denominator > 0 ? numerator / denominator : prior;
  return clamp(posterior + (1 - posterior) * params.pLearn,0,1);
}

export function nextSm2Schedule({
  quality,
  repetitions=0,
  easeFactor=2.5,
  interval=0
}={}){
  const q = clamp(Math.trunc(Number(quality) || 0),0,5);
  const reps = Math.max(0,Math.trunc(Number(repetitions) || 0));
  const ef = Math.max(1.3,Number(easeFactor) || 2.5);
  const days = Math.max(0,Number(interval) || 0);

  if(q < 3){
    return {interval:1,easeFactor:ef,repetitions:0};
  }

  const newRepetitions = reps + 1;
  const newInterval =
    newRepetitions === 1 ? 1 :
    newRepetitions === 2 ? 6 :
    days * ef;

  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
  return {
    interval:newInterval,
    easeFactor:Math.max(1.3,ef + delta),
    repetitions:newRepetitions
  };
}

export function createShadowSkillState({
  mastery=DEFAULT_BKT_PARAMS.pKnow,
  bktUpdatedAt=0,
  nextReviewAt=0,
  lastChallengeAt=0,
  repetitions=0,
  easeFactor=2.5,
  interval=0
}={}){
  return {
    mastery:clamp(Number(mastery),0,1),
    bktUpdatedAt:Math.max(0,Number(bktUpdatedAt)||0),
    nextReviewAt:Math.max(0,Number(nextReviewAt)||0),
    lastChallengeAt:Math.max(0,Number(lastChallengeAt)||0),
    repetitions:Math.max(0,Math.trunc(Number(repetitions)||0)),
    easeFactor:Math.max(1.3,Number(easeFactor)||2.5),
    interval:Math.max(0,Number(interval)||0)
  };
}

export function applyShadowObservation(
  state,
  {correct,firstAttempt=true,masteryEligible=true,quality,now=Date.now()}={}
){
  const current = createShadowSkillState(state);

  // Preserve StarBlox's evidence policy: retries and explicitly non-mastery
  // questions must never manufacture mastery evidence.
  if(!firstAttempt || !masteryEligible) return current;

  const mastery = updateBktMastery(current.mastery,Boolean(correct));
  const derivedQuality = quality === undefined ? (correct ? 5 : 2) : quality;
  const sr = nextSm2Schedule({
    quality:derivedQuality,
    repetitions:current.repetitions,
    easeFactor:current.easeFactor,
    interval:current.interval
  });

  return {
    ...current,
    mastery,
    bktUpdatedAt:Number(now),
    nextReviewAt:Number(now) + sr.interval * DAY_MS,
    repetitions:sr.repetitions,
    easeFactor:sr.easeFactor,
    interval:sr.interval
  };
}

export function scoreMicroChallengeCandidate(state,{now=Date.now()}={}){
  const s = createShadowSkillState(state);
  if(s.mastery < STRUGGLE_LOWER || s.mastery >= MASTERY_THRESHOLD){
    return null;
  }

  const decayDays = s.bktUpdatedAt
    ? Math.max(0,(Number(now) - s.bktUpdatedAt) / DAY_MS)
    : DECAY_HALF_LIFE_DAYS * DECAY_DAYS_CAP_MULT;
  const decayContribution = W_DECAY * Math.min(
    decayDays / DECAY_HALF_LIFE_DAYS,
    DECAY_DAYS_CAP_MULT
  );
  const srDue = Boolean(s.nextReviewAt && s.nextReviewAt <= Number(now));
  const srContribution = srDue ? W_SR_DUE : 0;
  const recent = Boolean(
    s.lastChallengeAt &&
    Number(now) - s.lastChallengeAt < RECENCY_PENALTY_HOURS * HOUR_MS
  );
  const recencyPenalty = recent ? W_RECENCY : 0;

  return {
    score:decayContribution + srContribution + recencyPenalty,
    srDue,
    recent,
    decayDays
  };
}

export function selectMicroChallenge(skills,{now=Date.now()}={}){
  const rows = [];
  for(const [ordering,row] of (skills || []).entries()){
    if(!row?.skill) continue;
    const scored = scoreMicroChallengeCandidate(row.state,{now});
    if(!scored) continue;
    rows.push({
      skill:String(row.skill),
      ordering:Number.isFinite(row.ordering) ? row.ordering : ordering,
      ...scored
    });
  }

  if(!rows.length) return null;
  if(rows.every(row => row.score <= W_RECENCY / 2)) return null;

  rows.sort((a,b) =>
    b.score - a.score ||
    a.ordering - b.ordering ||
    a.skill.localeCompare(b.skill)
  );
  return rows[0];
}
