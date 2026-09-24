
import { stableHash,stableStringify } from '../domainSchemas.js';
import { DeterministicSimulation,SIM_ENGINE_VERSION } from '../sim/deterministicCore.js';
import { decodeReplayActionBundle } from '../replay/replayCodec.js';
import {
  reSimulateReplay,
  validateReplayRecording
} from '../replay/reSimulate.js';
import {
  getDailyRelease,
  verifyDailyReleaseRegistry
} from '../daily/dailyReleaseRegistry.js';

export const REPLAY_GHOST_SCHEMA_VERSION=1;
export const SHARE_CHALLENGE_SCHEMA_VERSION=1;
export const SHARE_CHALLENGE_TOKEN_PREFIX='sbx1';

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

function isObject(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function requirePositiveInteger(value,label){
  if(!Number.isInteger(value) || value < 1){
    throw new TypeError(label + ' must be a positive integer.');
  }
  return value;
}

function normalizeChallengeContext(raw={}){
  if(!isObject(raw)) throw new TypeError('challengeContext must be an object.');
  const context={};
  for(const key of ['releaseId','bundleHash','levelHash']){
    if(raw[key] != null) context[key]=requireString(raw[key],'challengeContext.' + key);
  }
  return context;
}

function ghostPayload(ghost){
  return {
    schemaVersion:ghost.schemaVersion,
    replayId:ghost.replayId,
    replayManifestHash:ghost.replayManifestHash,
    actionHash:ghost.actionHash,
    finalStateHash:ghost.finalStateHash,
    engineVersion:ghost.engineVersion,
    seed:ghost.seed,
    finalTick:ghost.finalTick,
    tickRate:ghost.tickRate,
    sampleEveryTicks:ghost.sampleEveryTicks,
    challengeContext:ghost.challengeContext,
    points:ghost.points,
    pointsHash:ghost.pointsHash
  };
}

function sampleGhostPoint(simulation,sampleState){
  const sample=clone(
    sampleState(simulation.getState(),simulation),
    'ghost sample'
  );
  if(!isObject(sample)){
    throw new TypeError('sampleState must return a JSON object.');
  }
  return {
    tick:simulation.tick,
    timeSeconds:simulation.tick / simulation.tickRate,
    stateHash:simulation.stateHash(),
    sample
  };
}

/**
 * Build a presentation-only ghost from a replay that passes authoritative
 * deterministic re-simulation first.
 *
 * The caller supplies trusted initialState/reducer exactly as Step 3 does.
 * challengeContext should be derived from a trusted frozen Daily release when
 * the ghost is intended for a shareable Daily challenge.
 */
export function createVerifiedReplayGhost(recording,{
  initialState,
  reducer,
  summaryBuilder,
  sampleState,
  sampleEveryTicks=30,
  maxPoints=2000,
  expectedEngineVersion=SIM_ENGINE_VERSION,
  challengeContext={}
}={}){
  if(typeof reducer !== 'function') throw new TypeError('reducer must be a function.');
  if(typeof sampleState !== 'function') throw new TypeError('sampleState must be a function.');
  requirePositiveInteger(sampleEveryTicks,'sampleEveryTicks');
  requirePositiveInteger(maxPoints,'maxPoints');

  const integrity=validateReplayRecording(recording);
  if(!integrity.ok){
    return deepFreeze({
      ok:false,
      verdict:'unverifiable',
      reason:integrity.reason,
      ghost:null
    });
  }

  const verification=reSimulateReplay(recording,{
    initialState,
    reducer,
    summaryBuilder,
    expectedEngineVersion
  });

  if(verification.verdict !== 'verified'){
    return deepFreeze({
      ok:false,
      verdict:verification.verdict,
      reason:verification.reason || 'replay failed deterministic verification',
      divergence:verification.divergence ? clone(verification.divergence) : undefined,
      ghost:null
    });
  }

  const entries=decodeReplayActionBundle(recording.actions,recording.chunks);
  if(entries.length !== recording.eventCount){
    return deepFreeze({
      ok:false,
      verdict:'unverifiable',
      reason:'replay action decode count mismatch during ghost reconstruction',
      ghost:null
    });
  }

  const effectiveEvery=Math.max(
    sampleEveryTicks,
    Math.ceil(Math.max(1,recording.finalTick) / Math.max(1,maxPoints - 1))
  );

  const simulation=new DeterministicSimulation({
    seed:recording.manifest.seed,
    initialState:clone(initialState ?? {}),
    engineVersion:recording.manifest.engineVersion,
    tickRate:recording.tickRate,
    reducer
  });

  for(const entry of entries){
    simulation.schedule(entry.action,{tick:entry.tick});
  }

  const points=[sampleGhostPoint(simulation,sampleState)];

  while(simulation.tick < recording.finalTick){
    simulation.step();
    if(
      simulation.tick === recording.finalTick ||
      simulation.tick % effectiveEvery === 0
    ){
      points.push(sampleGhostPoint(simulation,sampleState));
    }
  }

  if(simulation.stateHash() !== recording.finalStateHash){
    return deepFreeze({
      ok:false,
      verdict:'divergent',
      reason:'ghost reconstruction final state hash mismatch',
      ghost:null
    });
  }

  const pointsHash=stableHash(points);
  const base={
    schemaVersion:REPLAY_GHOST_SCHEMA_VERSION,
    replayId:recording.manifest.replayId,
    replayManifestHash:recording.manifest.manifestHash,
    actionHash:recording.manifest.actionHash,
    finalStateHash:recording.finalStateHash,
    engineVersion:recording.manifest.engineVersion,
    seed:recording.manifest.seed,
    finalTick:recording.finalTick,
    tickRate:recording.tickRate,
    sampleEveryTicks:effectiveEvery,
    challengeContext:normalizeChallengeContext(challengeContext),
    points,
    pointsHash
  };

  const ghost=deepFreeze({
    ...base,
    ghostHash:stableHash(base)
  });

  return deepFreeze({
    ok:true,
    verdict:'verified',
    ghost
  });
}

export function verifyReplayGhost(ghost){
  const errors=[];
  if(!isObject(ghost)) return {ok:false,errors:['ghost must be an object']};
  if(ghost.schemaVersion !== REPLAY_GHOST_SCHEMA_VERSION) errors.push('unsupported ghost schema');
  for(const key of ['replayId','replayManifestHash','actionHash','finalStateHash','engineVersion','pointsHash','ghostHash']){
    if(typeof ghost[key] !== 'string' || !ghost[key]) errors.push('missing ghost field ' + key);
  }
  if(!Number.isInteger(ghost.finalTick) || ghost.finalTick < 0) errors.push('invalid ghost finalTick');
  if(!Number.isInteger(ghost.tickRate) || ghost.tickRate < 1) errors.push('invalid ghost tickRate');
  if(!Number.isInteger(ghost.sampleEveryTicks) || ghost.sampleEveryTicks < 1) errors.push('invalid ghost sampleEveryTicks');
  if(!Array.isArray(ghost.points) || ghost.points.length === 0) errors.push('ghost points are required');

  if(Array.isArray(ghost.points) && ghost.points.length){
    let previous=-1;
    for(const [index,point] of ghost.points.entries()){
      if(!isObject(point) || !Number.isInteger(point.tick) || point.tick < 0){
        errors.push('invalid ghost point at index ' + index);
        continue;
      }
      if(point.tick <= previous && index > 0) errors.push('ghost points must have strictly increasing ticks');
      previous=point.tick;
      if(!isObject(point.sample)) errors.push('ghost sample must be an object at index ' + index);
      if(typeof point.stateHash !== 'string' || !point.stateHash) errors.push('ghost point state hash missing at index ' + index);
    }
    if(ghost.points[0]?.tick !== 0) errors.push('ghost must start at tick 0');
    if(ghost.points[ghost.points.length - 1]?.tick !== ghost.finalTick){
      errors.push('ghost must end at finalTick');
    }
    if(stableHash(ghost.points) !== ghost.pointsHash) errors.push('ghost points hash mismatch');
  }

  try{
    normalizeChallengeContext(ghost.challengeContext || {});
  }catch(error){
    errors.push(error instanceof Error ? error.message : 'invalid challenge context');
  }

  if(errors.length === 0 && stableHash(ghostPayload(ghost)) !== ghost.ghostHash){
    errors.push('ghost hash mismatch');
  }

  return {ok:errors.length === 0,errors};
}

export function ghostAtTick(ghost,tick){
  const validation=verifyReplayGhost(ghost);
  if(!validation.ok) throw new Error('invalid replay ghost: ' + validation.errors[0]);
  if(!Number.isFinite(tick)) throw new TypeError('tick must be finite.');

  const target=Math.max(0,Math.floor(tick));
  let best=ghost.points[0];
  for(const point of ghost.points){
    if(point.tick <= target) best=point;
    else break;
  }
  return best;
}

function releaseIdentity(release){
  return {
    releaseId:release.releaseId,
    date:release.date,
    manifestHash:release.manifestHash,
    bundleHash:release.bundleHash,
    artifactHash:release.artifactHash,
    seed:release.artifact.bundle.seed,
    engineVersion:release.artifact.bundle.engineVersion,
    levelHash:release.artifact.bundle.levelSpec?.levelHash ?? null,
    questionRefs:clone(release.artifact.bundle.questionRefs || [])
  };
}

function ghostReference(ghost){
  if(!ghost) return null;
  const validation=verifyReplayGhost(ghost);
  if(!validation.ok) throw new Error('invalid replay ghost: ' + validation.errors[0]);
  return {
    replayId:ghost.replayId,
    replayManifestHash:ghost.replayManifestHash,
    actionHash:ghost.actionHash,
    finalStateHash:ghost.finalStateHash,
    ghostHash:ghost.ghostHash,
    engineVersion:ghost.engineVersion,
    finalTick:ghost.finalTick
  };
}

function capsulePayload(capsule){
  return {
    schemaVersion:capsule.schemaVersion,
    capsuleVersion:capsule.capsuleVersion,
    release:capsule.release,
    ghost:capsule.ghost,
    label:capsule.label
  };
}

export function createShareableChallengeCapsule({
  registry,
  releaseId,
  ghost=null,
  label=null
}){
  const registryValidation=verifyDailyReleaseRegistry(registry);
  if(!registryValidation.ok){
    throw new Error('invalid Daily release registry: ' + registryValidation.errors[0]);
  }

  const release=getDailyRelease(registry,requireString(releaseId,'releaseId'));
  if(!release) throw new Error('unknown Daily release: ' + releaseId);

  const releaseRef=releaseIdentity(release);
  const ghostRef=ghostReference(ghost);

  if(ghost){
    const context=ghost.challengeContext || {};
    if(context.releaseId && context.releaseId !== release.releaseId){
      throw new Error('ghost release context does not match challenge release.');
    }
    if(context.bundleHash && context.bundleHash !== release.bundleHash){
      throw new Error('ghost bundle context does not match challenge release.');
    }
    if(context.levelHash && context.levelHash !== releaseRef.levelHash){
      throw new Error('ghost level context does not match challenge release.');
    }
    if(ghost.engineVersion !== releaseRef.engineVersion){
      throw new Error('ghost engine version does not match challenge release.');
    }
  }

  const base={
    schemaVersion:SHARE_CHALLENGE_SCHEMA_VERSION,
    capsuleVersion:'share-challenge-v1',
    release:releaseRef,
    ghost:ghostRef,
    label:label == null ? null : String(label).slice(0,120)
  };

  return deepFreeze({
    ...base,
    challengeId:'challenge-' + stableHash(base).split(':')[1],
    capsuleHash:stableHash(base)
  });
}

export function verifyShareableChallengeCapsule(capsule,{
  registry,
  ghost=null
}={}){
  const errors=[];
  if(!isObject(capsule)) return {ok:false,errors:['challenge capsule must be an object']};
  if(capsule.schemaVersion !== SHARE_CHALLENGE_SCHEMA_VERSION) errors.push('unsupported challenge capsule schema');
  if(capsule.capsuleVersion !== 'share-challenge-v1') errors.push('unsupported challenge capsule version');
  if(!isObject(capsule.release)) errors.push('challenge release identity is missing');

  if(errors.length === 0){
    const expectedHash=stableHash(capsulePayload(capsule));
    if(capsule.capsuleHash !== expectedHash) errors.push('challenge capsule hash mismatch');
    if(capsule.challengeId !== 'challenge-' + expectedHash.split(':')[1]){
      errors.push('challenge ID mismatch');
    }
  }

  if(registry){
    const rv=verifyDailyReleaseRegistry(registry);
    if(!rv.ok){
      errors.push('invalid Daily release registry: ' + rv.errors[0]);
    }else if(isObject(capsule.release)){
      const release=getDailyRelease(registry,capsule.release.releaseId);
      if(!release){
        errors.push('challenge release is unavailable');
      }else if(stableStringify(releaseIdentity(release)) !== stableStringify(capsule.release)){
        errors.push('challenge release identity no longer matches frozen release');
      }
    }
  }

  if(capsule.ghost){
    if(!isObject(capsule.ghost)) errors.push('invalid ghost reference');
    if(ghost){
      const gv=verifyReplayGhost(ghost);
      if(!gv.ok){
        errors.push('provided ghost is invalid: ' + gv.errors[0]);
      }else{
        const expected=ghostReference(ghost);
        if(stableStringify(expected) !== stableStringify(capsule.ghost)){
          errors.push('provided ghost does not match challenge ghost reference');
        }
        if(
          ghost.challengeContext?.releaseId &&
          ghost.challengeContext.releaseId !== capsule.release?.releaseId
        ){
          errors.push('provided ghost is bound to a different release');
        }
      }
    }
  }

  return {ok:errors.length === 0,errors};
}

function utf8ToBase64Url(text){
  const bytes=new TextEncoder().encode(text);
  let binary='';
  for(const byte of bytes) binary+=String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g,'-')
    .replace(/\//g,'_')
    .replace(/=+$/,'');
}

function base64UrlToUtf8(value){
  const padded=value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - value.length % 4) % 4);
  const binary=atob(padded);
  const bytes=Uint8Array.from(binary,char => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeShareableChallengeCapsule(capsule){
  const validation=verifyShareableChallengeCapsule(capsule);
  if(!validation.ok) throw new Error('invalid challenge capsule: ' + validation.errors[0]);
  return SHARE_CHALLENGE_TOKEN_PREFIX + '.' + utf8ToBase64Url(stableStringify(capsule));
}

export function decodeShareableChallengeCapsule(token){
  if(typeof token !== 'string' || token.length > 30_000){
    throw new TypeError('invalid challenge token.');
  }
  const prefix=SHARE_CHALLENGE_TOKEN_PREFIX + '.';
  if(!token.startsWith(prefix)) throw new Error('unsupported challenge token prefix.');

  let capsule;
  try{
    capsule=JSON.parse(base64UrlToUtf8(token.slice(prefix.length)));
  }catch{
    throw new Error('challenge token payload is malformed.');
  }

  const validation=verifyShareableChallengeCapsule(capsule);
  if(!validation.ok) throw new Error('invalid challenge token: ' + validation.errors[0]);
  return deepFreeze(capsule);
}

export function challengeSharePath(capsule){
  return '/?challenge=' + encodeURIComponent(encodeShareableChallengeCapsule(capsule));
}
