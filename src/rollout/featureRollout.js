
import { stableHash, stableStringify } from '../domainSchemas.js';

export const FEATURE_ROLLOUT_SCHEMA_VERSION=1;
export const FEATURE_ROLLOUT_VERSION='starblox-rollout-v1';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function stringArray(value){
  return Array.isArray(value)
    ? [...new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))].sort()
    : [];
}

function percent(value,def=0){
  const numeric=Number(value);
  return Number.isFinite(numeric) ? Math.min(100,Math.max(0,numeric)) : def;
}

function normalizeFeature(id,raw={}){
  const evaluatePercent=percent(raw.evaluatePercent,0);
  const usePercent=Math.min(evaluatePercent,percent(raw.usePercent,0));
  return {
    id,
    enabled:Boolean(raw.enabled),
    killSwitch:Boolean(raw.killSwitch),
    evaluatePercent,
    usePercent,
    salt:typeof raw.salt === 'string' ? raw.salt : '',
    allowSubjects:stringArray(raw.allowSubjects),
    blockSubjects:stringArray(raw.blockSubjects),
    callsiteBlocklist:stringArray(raw.callsiteBlocklist),
    useExperimentalCallsites:stringArray(raw.useExperimentalCallsites),
    metadata:raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
      ? clone(raw.metadata)
      : {}
  };
}

function configPayload(config){
  return {
    schemaVersion:config.schemaVersion,
    rolloutVersion:config.rolloutVersion,
    globalKillSwitch:config.globalKillSwitch,
    features:config.features,
    killSwitches:config.killSwitches
  };
}

function normalizeKillSwitch(raw,index){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('killSwitches[' + index + '] must be an object.');
  }
  if(typeof raw.id !== 'string' || !raw.id.trim()){
    throw new TypeError('killSwitches[' + index + '].id is required.');
  }
  const match=raw.match && typeof raw.match === 'object' && !Array.isArray(raw.match)
    ? clone(raw.match)
    : {};
  return {
    id:raw.id.trim(),
    enabled:raw.enabled !== false,
    featureId:typeof raw.featureId === 'string' && raw.featureId.trim() ? raw.featureId.trim() : '*',
    match
  };
}

export function createFeatureRolloutConfig({
  globalKillSwitch=false,
  features={},
  killSwitches=[]
}={}){
  if(!features || typeof features !== 'object' || Array.isArray(features)){
    throw new TypeError('features must be an object.');
  }
  const normalizedFeatures={};
  for(const [id,value] of Object.entries(features)){
    if(!id.trim()) throw new TypeError('feature ID cannot be empty.');
    normalizedFeatures[id]=normalizeFeature(id,value);
  }
  const normalizedSwitches=(killSwitches || []).map(normalizeKillSwitch);
  const base={
    schemaVersion:FEATURE_ROLLOUT_SCHEMA_VERSION,
    rolloutVersion:FEATURE_ROLLOUT_VERSION,
    globalKillSwitch:Boolean(globalKillSwitch),
    features:normalizedFeatures,
    killSwitches:normalizedSwitches
  };
  return deepFreeze({
    ...base,
    configHash:stableHash(configPayload(base))
  });
}

export function verifyFeatureRolloutConfig(config){
  const errors=[];
  if(!config || typeof config !== 'object' || Array.isArray(config)){
    return {ok:false,errors:['rollout config must be an object']};
  }
  if(config.schemaVersion !== FEATURE_ROLLOUT_SCHEMA_VERSION){
    errors.push('unsupported rollout schema version');
  }
  if(config.rolloutVersion !== FEATURE_ROLLOUT_VERSION){
    errors.push('unsupported rollout implementation version');
  }
  if(!config.features || typeof config.features !== 'object' || Array.isArray(config.features)){
    errors.push('features must be an object');
  }else{
    for(const [id,feature] of Object.entries(config.features)){
      if(feature.id !== id) errors.push('feature key/id mismatch: ' + id);
      if(!Number.isFinite(feature.evaluatePercent) || feature.evaluatePercent < 0 || feature.evaluatePercent > 100){
        errors.push('invalid evaluatePercent: ' + id);
      }
      if(!Number.isFinite(feature.usePercent) || feature.usePercent < 0 || feature.usePercent > feature.evaluatePercent){
        errors.push('invalid usePercent: ' + id);
      }
    }
  }
  if(!Array.isArray(config.killSwitches)){
    errors.push('killSwitches must be an array');
  }else{
    const ids=new Set();
    for(const [index,rule] of config.killSwitches.entries()){
      if(!rule || typeof rule !== 'object' || Array.isArray(rule)){
        errors.push('invalid kill switch at index ' + index);
        continue;
      }
      if(typeof rule.id !== 'string' || !rule.id){
        errors.push('kill switch ID missing at index ' + index);
      }else if(ids.has(rule.id)){
        errors.push('duplicate kill switch ID: ' + rule.id);
      }else{
        ids.add(rule.id);
      }
    }
  }

  try{
    const expected=stableHash(configPayload(config));
    if(config.configHash !== expected) errors.push('rollout config hash mismatch');
  }catch{
    errors.push('rollout config is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function deterministicCohortBucket({
  featureId,
  subjectId,
  salt=''
}){
  if(typeof featureId !== 'string' || !featureId.trim()) throw new TypeError('featureId is required.');
  if(typeof subjectId !== 'string' || !subjectId.trim()) throw new TypeError('subjectId is required.');
  const hex=stableHash({
    namespace:'starblox-feature-cohort-v1',
    featureId:featureId.trim(),
    subjectId:subjectId.trim(),
    salt:String(salt)
  }).split(':')[1];
  return (parseInt(hex,16) >>> 0) % 10_000;
}

export function cohortPercent(input){
  return deterministicCohortBucket(input) / 100;
}

function contextMatch(match,context){
  for(const [field,expected] of Object.entries(match || {})){
    const actual=context?.[field];
    if(Array.isArray(expected)){
      if(!expected.includes(actual)) return false;
    }else if(actual !== expected){
      return false;
    }
  }
  return true;
}

function matchingKillSwitch(config,featureId,context){
  return (config.killSwitches || []).find(rule =>
    rule.enabled !== false &&
    (rule.featureId === '*' || rule.featureId === featureId) &&
    contextMatch(rule.match,context)
  ) || null;
}

/**
 * Resolve one deterministic rollout decision.
 *
 * Precedence:
 * global kill > matching contextual kill > subject block > disabled >
 * callsite block > explicit subject allow > deterministic use cohort >
 * deterministic shadow cohort > control.
 */
export function resolveFeatureRollout(config,{
  featureId,
  subjectId,
  callsite='default',
  context={}
}){
  const validation=verifyFeatureRolloutConfig(config);
  if(!validation.ok){
    return deepFreeze({
      featureId,
      subjectId,
      callsite,
      mode:'control',
      evaluateExperimental:false,
      useExperimental:false,
      bucket:null,
      reason:'invalid rollout config: ' + validation.errors[0]
    });
  }

  const feature=config.features[featureId];
  if(config.globalKillSwitch){
    return deepFreeze({
      featureId,subjectId,callsite,
      mode:'killed',evaluateExperimental:false,useExperimental:false,bucket:null,
      reason:'global kill switch'
    });
  }

  const kill=matchingKillSwitch(config,featureId,context);
  if(kill){
    return deepFreeze({
      featureId,subjectId,callsite,
      mode:'killed',evaluateExperimental:false,useExperimental:false,bucket:null,
      reason:'kill switch: ' + kill.id
    });
  }

  if(!feature || !feature.enabled){
    return deepFreeze({
      featureId,subjectId,callsite,
      mode:'control',evaluateExperimental:false,useExperimental:false,bucket:null,
      reason:'feature disabled'
    });
  }

  if(feature.killSwitch){
    return deepFreeze({
      featureId,subjectId,callsite,
      mode:'killed',evaluateExperimental:false,useExperimental:false,bucket:null,
      reason:'feature kill switch'
    });
  }

  const subject=String(subjectId || '');
  if(feature.blockSubjects.includes(subject)){
    return deepFreeze({
      featureId,subjectId:subject,callsite,
      mode:'control',evaluateExperimental:false,useExperimental:false,bucket:null,
      reason:'subject blocklist'
    });
  }

  if(feature.callsiteBlocklist.includes(callsite)){
    return deepFreeze({
      featureId,subjectId:subject,callsite,
      mode:'control',evaluateExperimental:false,useExperimental:false,bucket:null,
      reason:'callsite blocklist'
    });
  }

  const bucket=cohortPercent({
    featureId,
    subjectId:subject,
    salt:feature.salt
  });

  const subjectForced=feature.allowSubjects.includes(subject);
  const useCallsiteAllowed=
    feature.useExperimentalCallsites.length === 0 ||
    feature.useExperimentalCallsites.includes('*') ||
    feature.useExperimentalCallsites.includes(callsite);

  if(subjectForced && useCallsiteAllowed){
    return deepFreeze({
      featureId,subjectId:subject,callsite,
      mode:'experimental',evaluateExperimental:true,useExperimental:true,bucket,
      reason:'explicit subject allowlist'
    });
  }

  if(bucket < feature.usePercent && useCallsiteAllowed){
    return deepFreeze({
      featureId,subjectId:subject,callsite,
      mode:'experimental',evaluateExperimental:true,useExperimental:true,bucket,
      reason:'deterministic use cohort'
    });
  }

  if(bucket < feature.evaluatePercent){
    return deepFreeze({
      featureId,subjectId:subject,callsite,
      mode:'shadow',evaluateExperimental:true,useExperimental:false,bucket,
      reason:bucket < feature.usePercent && !useCallsiteAllowed
        ? 'use cohort blocked at callsite; shadow only'
        : 'deterministic shadow cohort'
    });
  }

  return deepFreeze({
    featureId,subjectId:subject,callsite,
    mode:'control',evaluateExperimental:false,useExperimental:false,bucket,
    reason:'outside evaluation cohort'
  });
}

function defaultExact(a,b){
  try{return stableStringify(a) === stableStringify(b);}
  catch{return a === b;}
}

/**
 * Evaluate control/experimental paths safely.
 *
 * - control is always evaluated;
 * - experimental runs only for shadow/experimental decisions;
 * - experimental failure always falls back to control;
 * - shadow never changes chosen output;
 * - comparison telemetry contains no values unless caller explicitly serializes.
 */
export async function runSafeRollout({
  decision,
  control,
  experimental,
  exactComparator=defaultExact,
  reasonableComparator=null,
  serialize=null
}){
  if(typeof control !== 'function') throw new TypeError('control must be a function.');
  if(typeof experimental !== 'function') throw new TypeError('experimental must be a function.');

  const controlValue=await control();
  if(!decision?.evaluateExperimental){
    return Object.freeze({
      chosen:'control',
      value:controlValue,
      comparison:null
    });
  }

  let experimentalValue;
  try{
    experimentalValue=await experimental();
  }catch(error){
    return Object.freeze({
      chosen:'control',
      value:controlValue,
      comparison:Object.freeze({
        exactMatch:false,
        reasonableMatch:false,
        experimentalError:error instanceof Error ? error.message : 'experimental path failed',
        control:typeof serialize === 'function' ? serialize(controlValue) : null,
        experimental:null
      })
    });
  }

  const exact=Boolean(exactComparator(controlValue,experimentalValue));
  const reasonable=typeof reasonableComparator === 'function'
    ? Boolean(reasonableComparator(controlValue,experimentalValue))
    : exact;

  return Object.freeze({
    chosen:decision.useExperimental ? 'experimental' : 'control',
    value:decision.useExperimental ? experimentalValue : controlValue,
    comparison:Object.freeze({
      exactMatch:exact,
      reasonableMatch:reasonable,
      experimentalError:null,
      control:typeof serialize === 'function' ? serialize(controlValue) : null,
      experimental:typeof serialize === 'function' ? serialize(experimentalValue) : null
    })
  });
}
