
import { stableHash, stableStringify } from '../domainSchemas.js';
import {
  decodeReplayActionBundle
} from './replayCodec.js';
import {
  reSimulateReplay,
  validateReplayRecording
} from './reSimulate.js';
import {
  getDailyRelease,
  verifyDailyReleaseRegistry
} from '../daily/dailyReleaseRegistry.js';

export const GHOST_TRACK_SCHEMA_VERSION=1;
export const SHAREABLE_CHALLENGE_SCHEMA_VERSION=1;
export const SHAREABLE_CHALLENGE_VERSION='starblox-share-v1';

function clone(value,label='value'){
  try{
    return JSON.parse(JSON.stringify(value));
  }catch{
    throw new TypeError(label + ' must be JSON-compatible.');
  }
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function normalizeReleaseIdentity(release){
  if(!release) return null;
  return {
    releaseId:requireString(release.releaseId,'release.releaseId'),
    date:requireString(release.date,'release.date'),
    artifactHash:requireString(release.artifactHash,'release.artifactHash'),
    manifestHash:requireString(release.manifestHash,'release.manifestHash'),
    bundleHash:requireString(release.bundleHash,'release.bundleHash')
  };
}

function sourceIdentity(recording){
  return {
    replayId:recording.manifest.replayId,
    replayManifestHash:recording.manifest.manifestHash,
    engineVersion:recording.manifest.engineVersion,
    seed:recording.manifest.seed,
    initialStateHash:recording.manifest.initialStateHash,
    actionHash:recording.manifest.actionHash,
    finalStateHash:recording.finalStateHash,
    finalTick:recording.finalTick,
    tickRate:recording.tickRate
  };
}

export function createGhostTrack(recording){
  const validation=validateReplayRecording(recording);
  if(!validation.ok){
    throw new Error('invalid replay recording: ' + validation.reason);
  }

  const decoded=decodeReplayActionBundle(recording.actions,recording.chunks);
  if(decoded.length !== recording.eventCount){
    throw new Error('replay action decode count mismatch.');
  }

  const actions=decoded.map(entry => ({
    tick:entry.tick,
    sequence:entry.sequence,
    type:entry.action.type,
    action:clone(entry.action)
  }));

  const payload={
    schemaVersion:GHOST_TRACK_SCHEMA_VERSION,
    replayId:recording.manifest.replayId,
    replayManifestHash:recording.manifest.manifestHash,
    engineVersion:recording.manifest.engineVersion,
    seed:recording.manifest.seed,
    tickRate:recording.tickRate,
    finalTick:recording.finalTick,
    actionCount:actions.length,
    actions
  };

  return deepFreeze({
    ...payload,
    trackHash:stableHash(payload)
  });
}

export function verifyGhostTrack(track,recording=null){
  const errors=[];
  if(!track || typeof track !== 'object' || Array.isArray(track)){
    return {ok:false,errors:['ghost track must be an object']};
  }
  if(track.schemaVersion !== GHOST_TRACK_SCHEMA_VERSION){
    errors.push('unsupported ghost track schema');
  }
  if(!Array.isArray(track.actions)){
    errors.push('ghost actions must be an array');
  }else{
    let previousTick=-1;
    for(const [index,entry] of track.actions.entries()){
      if(!Number.isInteger(entry.tick) || entry.tick < 0){
        errors.push('invalid ghost tick at index ' + index);
        continue;
      }
      if(entry.tick < previousTick) errors.push('ghost ticks are not monotonic');
      previousTick=entry.tick;
      if(typeof entry.type !== 'string' || !entry.type){
        errors.push('ghost action type missing at index ' + index);
      }
      if(entry.action?.type !== entry.type){
        errors.push('ghost action/type mismatch at index ' + index);
      }
    }
    if(track.actionCount !== track.actions.length){
      errors.push('ghost action count mismatch');
    }
  }

  const payload={
    schemaVersion:track.schemaVersion,
    replayId:track.replayId,
    replayManifestHash:track.replayManifestHash,
    engineVersion:track.engineVersion,
    seed:track.seed,
    tickRate:track.tickRate,
    finalTick:track.finalTick,
    actionCount:track.actionCount,
    actions:track.actions
  };
  try{
    if(stableHash(payload) !== track.trackHash) errors.push('ghost track hash mismatch');
  }catch{
    errors.push('ghost track is not hashable');
  }

  if(recording){
    const replay=validateReplayRecording(recording);
    if(!replay.ok){
      errors.push('source replay invalid: ' + replay.reason);
    }else{
      const rebuilt=createGhostTrack(recording);
      if(rebuilt.trackHash !== track.trackHash){
        errors.push('ghost track does not match source replay');
      }
      if(rebuilt.replayManifestHash !== track.replayManifestHash){
        errors.push('ghost replay manifest mismatch');
      }
    }
  }

  return {ok:errors.length === 0,errors};
}

export function ghostActionsBetween(track,{
  fromTick=0,
  toTick=track?.finalTick ?? 0
}={}){
  const validation=verifyGhostTrack(track);
  if(!validation.ok) throw new Error('invalid ghost track: ' + validation.errors[0]);
  if(!Number.isInteger(fromTick) || fromTick < 0) throw new TypeError('fromTick must be a non-negative integer.');
  if(!Number.isInteger(toTick) || toTick < fromTick) throw new TypeError('toTick must be an integer >= fromTick.');

  return track.actions
    .filter(entry => entry.tick >= fromTick && entry.tick <= toTick)
    .map(entry => clone(entry));
}

export function ghostCursorAtTick(track,tick){
  const validation=verifyGhostTrack(track);
  if(!validation.ok) throw new Error('invalid ghost track: ' + validation.errors[0]);
  if(!Number.isInteger(tick) || tick < 0) throw new TypeError('tick must be a non-negative integer.');

  let completed=0;
  while(completed < track.actions.length && track.actions[completed].tick <= tick){
    completed++;
  }
  return {
    tick,
    completedActions:completed,
    nextAction:completed < track.actions.length ? clone(track.actions[completed]) : null,
    progress:track.finalTick > 0 ? Math.min(1,tick / track.finalTick) : 1,
    terminal:tick >= track.finalTick
  };
}

function challengePayload(challenge){
  return {
    schemaVersion:challenge.schemaVersion,
    challengeVersion:challenge.challengeVersion,
    challengeId:challenge.challengeId,
    title:challenge.title,
    createdAt:challenge.createdAt,
    source:challenge.source,
    dailyRelease:challenge.dailyRelease,
    benchmarkSummary:challenge.benchmarkSummary,
    recording:challenge.recording,
    ghost:challenge.ghost
  };
}

export function createShareableChallenge({
  recording,
  benchmarkSummary=null,
  release=null,
  title='StarBlox Ghost Challenge',
  createdAt=null
}){
  const validation=validateReplayRecording(recording);
  if(!validation.ok) throw new Error('invalid replay recording: ' + validation.reason);

  const summary=benchmarkSummary == null ? null : clone(benchmarkSummary,'benchmarkSummary');
  if(summary != null && stableHash(summary) !== recording.manifest.summaryHash){
    throw new Error('benchmark summary does not match replay summary hash.');
  }

  const source=sourceIdentity(recording);
  const dailyRelease=normalizeReleaseIdentity(release);
  const challengeId='challenge-' + stableHash({
    namespace:'starblox-shareable-challenge-v1',
    source,
    dailyRelease
  }).split(':')[1];

  const base={
    schemaVersion:SHAREABLE_CHALLENGE_SCHEMA_VERSION,
    challengeVersion:SHAREABLE_CHALLENGE_VERSION,
    challengeId,
    title:requireString(title,'title').slice(0,120),
    createdAt:requireString(createdAt ?? recording.manifest.createdAt,'createdAt'),
    source,
    dailyRelease,
    benchmarkSummary:summary,
    recording:clone(recording),
    ghost:createGhostTrack(recording)
  };

  return deepFreeze({
    ...base,
    challengeHash:stableHash(challengePayload(base))
  });
}

export function validateShareableChallenge(challenge,{releaseRegistry=null}={}){
  const errors=[];
  if(!challenge || typeof challenge !== 'object' || Array.isArray(challenge)){
    return {ok:false,errors:['challenge must be an object']};
  }
  if(challenge.schemaVersion !== SHAREABLE_CHALLENGE_SCHEMA_VERSION){
    errors.push('unsupported challenge schema');
  }
  if(challenge.challengeVersion !== SHAREABLE_CHALLENGE_VERSION){
    errors.push('unsupported challenge version');
  }

  const replay=validateReplayRecording(challenge.recording);
  if(!replay.ok){
    errors.push('challenge replay invalid: ' + replay.reason);
  }else{
    const expectedSource=sourceIdentity(challenge.recording);
    if(stableStringify(expectedSource) !== stableStringify(challenge.source)){
      errors.push('challenge source identity mismatch');
    }
  }

  const ghost=verifyGhostTrack(challenge.ghost,challengesafeRecording(challenge.recording));
  if(!ghost.ok) errors.push(...ghost.errors.map(error => 'ghost: ' + error));

  if(challenge.benchmarkSummary != null && replay.ok){
    try{
      if(stableHash(challenge.benchmarkSummary) !== challenge.recording.manifest.summaryHash){
        errors.push('benchmark summary hash mismatch');
      }
    }catch{
      errors.push('benchmark summary is not hashable');
    }
  }

  if(challenge.dailyRelease != null){
    try{
      normalizeReleaseIdentity(challenge.dailyRelease);
    }catch(error){
      errors.push(error.message);
    }
  }

  if(releaseRegistry){
    const registry=verifyDailyReleaseRegistry(releaseRegistry);
    if(!registry.ok){
      errors.push('invalid release registry: ' + registry.errors[0]);
    }else if(challenge.dailyRelease){
      const release=getDailyRelease(releaseRegistry,challenge.dailyRelease.releaseId);
      if(!release){
        errors.push('challenge Daily release not found');
      }else{
        const current=normalizeReleaseIdentity(release);
        if(stableStringify(current) !== stableStringify(challenge.dailyRelease)){
          errors.push('challenge Daily release identity mismatch');
        }
      }
    }
  }

  try{
    if(stableHash(challengePayload(challenge)) !== challenge.challengeHash){
      errors.push('challenge hash mismatch');
    }
  }catch{
    errors.push('challenge is not hashable');
  }

  const expectedId='challenge-' + stableHash({
    namespace:'starblox-shareable-challenge-v1',
    source:challenge.source,
    dailyRelease:challenge.dailyRelease ?? null
  }).split(':')[1];
  if(challenge.challengeId !== expectedId){
    errors.push('challenge ID mismatch');
  }

  return {ok:errors.length === 0,errors};
}

function challengesafeRecording(recording){
  return recording && typeof recording === 'object' ? recording : null;
}

export function serializeShareableChallenge(challenge){
  const validation=validateShareableChallenge(challenge);
  if(!validation.ok) throw new Error('invalid shareable challenge: ' + validation.errors[0]);
  return stableStringify(challenge);
}

export function parseShareableChallenge(text,{releaseRegistry=null}={}){
  if(typeof text !== 'string' || !text.trim()) throw new TypeError('challenge text is required.');
  let parsed;
  try{
    parsed=JSON.parse(text);
  }catch{
    throw new Error('challenge text is not valid JSON.');
  }
  const validation=validateShareableChallenge(parsed,{releaseRegistry});
  if(!validation.ok){
    throw new Error('invalid shareable challenge: ' + validation.errors[0]);
  }
  return deepFreeze(clone(parsed));
}

/**
 * Verify an attempt against a shared challenge setup.
 *
 * The attempt does not need the same action stream or final state as the source
 * ghost; it must start from the exact same deterministic setup. Its own replay is
 * independently re-simulated before any benchmark comparison is considered.
 */
export function verifyShareableChallengeAttempt(challenge,attemptRecording,{
  initialState,
  reducer,
  summaryBuilder,
  releaseRegistry=null,
  wallClockMs,
  maxTicks
}={}){
  const challengeValidation=validateShareableChallenge(challenge,{releaseRegistry});
  if(!challengeValidation.ok){
    return {
      verdict:'unverifiable',
      reason:'challenge invalid: ' + challengeValidation.errors[0]
    };
  }

  const attemptValidation=validateReplayRecording(attemptRecording);
  if(!attemptValidation.ok){
    return {
      verdict:'unverifiable',
      reason:'attempt replay invalid: ' + attemptValidation.reason
    };
  }

  for(const [field,expected,actual] of [
    ['engineVersion',challenge.source.engineVersion,attemptRecording.manifest.engineVersion],
    ['seed',challenge.source.seed,attemptRecording.manifest.seed],
    ['initialStateHash',challenge.source.initialStateHash,attemptRecording.manifest.initialStateHash],
    ['tickRate',challenge.source.tickRate,attemptRecording.tickRate]
  ]){
    if(expected !== actual){
      return {
        verdict:'unverifiable',
        reason:'challenge setup mismatch: ' + field
      };
    }
  }

  const result=reSimulateReplay(attemptRecording,{
    initialState,
    reducer,
    summaryBuilder,
    expectedEngineVersion:challenge.source.engineVersion,
    wallClockMs,
    maxTicks
  });

  if(result.verdict !== 'verified'){
    return result;
  }

  return {
    verdict:'verified',
    challengeId:challenge.challengeId,
    sourceReplayId:challenge.source.replayId,
    sourceFinalTick:challenge.source.finalTick,
    attemptFinalTick:attemptRecording.finalTick,
    sourceBenchmark:challenge.benchmarkSummary == null ? null : clone(challenge.benchmarkSummary),
    attemptSummary:result.summary == null ? null : clone(result.summary),
    finalStateHash:result.finalStateHash
  };
}
