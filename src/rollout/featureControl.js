
import { stableHash } from '../domainSchemas.js';

export const FEATURE_CONTROL_SCHEMA_VERSION=1;
export const FEATURE_CONTROL_VERSION='starblox-feature-control-v1';

const VALID_OPERATORS=new Set(['equals','not_equals','in','not_in','exists']);

function clone(value){
  return JSON.parse(JSON.stringify(value));
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

function clampRollout(value){
  const numeric=Number(value);
  if(!Number.isFinite(numeric)) throw new TypeError('rollout must be a finite number.');
  return Math.min(100,Math.max(0,numeric));
}

function normalizeScalar(value){
  if(['string','number','boolean'].includes(typeof value) || value === null) return value;
  throw new TypeError('feature context values must be string, number, boolean, or null.');
}

function normalizeCondition(raw,index){
  if(!isObject(raw)) throw new TypeError('condition ' + index + ' must be an object.');
  const property=requireString(raw.property,'condition.property');
  const operator=requireString(raw.operator ?? 'equals','condition.operator');
  if(!VALID_OPERATORS.has(operator)) throw new TypeError('unsupported condition operator: ' + operator);

  let value=raw.value;
  if(operator === 'in' || operator === 'not_in'){
    if(!Array.isArray(value) || value.length === 0){
      throw new TypeError(operator + ' condition requires a non-empty value array.');
    }
    value=value.map(normalizeScalar);
  }else if(operator !== 'exists'){
    value=normalizeScalar(value);
  }else{
    value=Boolean(value ?? true);
  }

  return {property,operator,value};
}

function normalizeSegment(raw,index){
  if(!isObject(raw)) throw new TypeError('segment ' + index + ' must be an object.');
  return {
    name:requireString(raw.name ?? ('segment-' + index),'segment.name'),
    rollout:clampRollout(raw.rollout ?? 100),
    conditions:Array.isArray(raw.conditions)
      ? raw.conditions.map(normalizeCondition)
      : []
  };
}

function normalizeFeature(name,raw){
  if(!isObject(raw)) throw new TypeError('feature ' + name + ' must be an object.');
  return {
    name,
    enabled:raw.enabled !== false,
    default:Boolean(raw.default ?? false),
    identityFields:Array.isArray(raw.identityFields) && raw.identityFields.length
      ? [...new Set(raw.identityFields.map(value => requireString(value,'identity field')))].sort()
      : ['playerId'],
    segments:Array.isArray(raw.segments)
      ? raw.segments.map(normalizeSegment)
      : []
  };
}

function normalizeKillCondition(raw,index){
  if(!isObject(raw)) throw new TypeError('kill switch condition ' + index + ' must be an object.');
  const fields={};
  for(const [key,value] of Object.entries(raw)){
    const field=requireString(key,'kill switch field');
    if(value === undefined) continue;
    fields[field]=value === null ? null : normalizeScalar(value);
  }
  if(Object.keys(fields).length === 0){
    throw new TypeError('kill switch condition cannot be empty.');
  }
  return fields;
}

function configPayload(config){
  return {
    schemaVersion:config.schemaVersion,
    version:config.version,
    features:config.features,
    killSwitches:config.killSwitches
  };
}

export function createFeatureControlConfig({
  version='local-v1',
  features={},
  killSwitches=[]
}={}){
  if(!isObject(features)) throw new TypeError('features must be an object.');
  if(!Array.isArray(killSwitches)) throw new TypeError('killSwitches must be an array.');

  const normalizedFeatures={};
  for(const [name,raw] of Object.entries(features).sort(([a],[b]) => a.localeCompare(b))){
    normalizedFeatures[requireString(name,'feature name')]=normalizeFeature(name,raw);
  }

  const base={
    schemaVersion:FEATURE_CONTROL_SCHEMA_VERSION,
    version:requireString(version,'feature config version'),
    features:normalizedFeatures,
    killSwitches:killSwitches.map(normalizeKillCondition)
  };

  return deepFreeze({
    ...base,
    configHash:stableHash(configPayload(base))
  });
}

export function verifyFeatureControlConfig(config){
  const errors=[];
  if(!isObject(config)) return {ok:false,errors:['feature config must be an object']};
  if(config.schemaVersion !== FEATURE_CONTROL_SCHEMA_VERSION) errors.push('unsupported feature-control schema');
  if(config.version == null || typeof config.version !== 'string') errors.push('feature config version is required');
  if(!isObject(config.features)) errors.push('features must be an object');
  if(!Array.isArray(config.killSwitches)) errors.push('killSwitches must be an array');

  try{
    const rebuilt=createFeatureControlConfig({
      version:config.version,
      features:config.features,
      killSwitches:config.killSwitches
    });
    if(rebuilt.configHash !== config.configHash) errors.push('feature config hash mismatch');
  }catch(error){
    errors.push(error instanceof Error ? error.message : 'invalid feature config');
  }

  return {ok:errors.length === 0,errors};
}

function conditionMatches(condition,context){
  const has=Object.prototype.hasOwnProperty.call(context,condition.property);
  const actual=context[condition.property];

  switch(condition.operator){
    case 'exists':
      return Boolean(condition.value) ? has : !has;
    case 'equals':
      return has && actual === condition.value;
    case 'not_equals':
      return !has || actual !== condition.value;
    case 'in':
      return has && condition.value.includes(actual);
    case 'not_in':
      return !has || !condition.value.includes(actual);
    default:
      return false;
  }
}

function segmentMatches(segment,context){
  return segment.conditions.every(condition => conditionMatches(condition,context));
}

function identityVector(feature,context){
  const fields=feature.identityFields.filter(field =>
    Object.prototype.hasOwnProperty.call(context,field)
  );

  const keys=fields.length ? fields : Object.keys(context).sort();
  return keys.flatMap(key => [key,String(context[key])]);
}

export function rolloutBucket(featureName,feature,context){
  const vector=identityVector(feature,context);
  const hash=stableHash({
    namespace:'starblox-feature-bucket-v1',
    feature:featureName,
    identity:vector
  });
  const hex=hash.split(':')[1];
  const value=parseInt(hex,16) >>> 0;
  return value % 10_000;
}

function killSwitchMatches(condition,context){
  for(const [field,expected] of Object.entries(condition)){
    if(expected === null) continue;
    if(!Object.prototype.hasOwnProperty.call(context,field)) return false;
    if(context[field] !== expected) return false;
  }
  return true;
}

export function matchingKillSwitches(config,context){
  const validation=verifyFeatureControlConfig(config);
  if(!validation.ok) throw new Error('invalid feature config: ' + validation.errors[0]);
  if(!isObject(context)) throw new TypeError('feature context must be an object.');
  return config.killSwitches
    .map((condition,index) => ({index,condition}))
    .filter(row => killSwitchMatches(row.condition,context));
}

export function evaluateFeature(config,featureName,context={}){
  const validation=verifyFeatureControlConfig(config);
  if(!validation.ok) throw new Error('invalid feature config: ' + validation.errors[0]);
  if(!isObject(context)) throw new TypeError('feature context must be an object.');

  const feature=config.features[featureName];
  const killContext={feature:featureName,...clone(context)};
  const killed=matchingKillSwitches(config,killContext);

  if(killed.length){
    return deepFreeze({
      enabled:false,
      feature:featureName,
      reason:'kill_switch',
      segment:null,
      rollout:null,
      bucket:null,
      configVersion:config.version,
      configHash:config.configHash,
      matchedKillSwitches:killed
    });
  }

  if(!feature){
    return deepFreeze({
      enabled:false,
      feature:featureName,
      reason:'unknown_feature',
      segment:null,
      rollout:null,
      bucket:null,
      configVersion:config.version,
      configHash:config.configHash,
      matchedKillSwitches:[]
    });
  }

  if(!feature.enabled){
    return deepFreeze({
      enabled:false,
      feature:featureName,
      reason:'feature_disabled',
      segment:null,
      rollout:null,
      bucket:null,
      configVersion:config.version,
      configHash:config.configHash,
      matchedKillSwitches:[]
    });
  }

  const matching=feature.segments.find(segment => segmentMatches(segment,context));
  if(!matching){
    return deepFreeze({
      enabled:feature.default,
      feature:featureName,
      reason:feature.default ? 'default_on' : 'no_matching_segment',
      segment:null,
      rollout:null,
      bucket:null,
      configVersion:config.version,
      configHash:config.configHash,
      matchedKillSwitches:[]
    });
  }

  const bucket=rolloutBucket(featureName,feature,context);
  const threshold=Math.round(matching.rollout * 100);
  const enabled=bucket < threshold;

  return deepFreeze({
    enabled,
    feature:featureName,
    reason:enabled ? 'segment_rollout' : 'outside_rollout',
    segment:matching.name,
    rollout:matching.rollout,
    bucket,
    configVersion:config.version,
    configHash:config.configHash,
    matchedKillSwitches:[]
  });
}

export function evaluateFeatureSet(config,featureNames,context={}){
  if(!Array.isArray(featureNames)) throw new TypeError('featureNames must be an array.');
  return Object.fromEntries(
    featureNames.map(name => [name,evaluateFeature(config,name,context)])
  );
}

export function cohortAssignment(config,experimentFeature,context={}){
  const decision=evaluateFeature(config,experimentFeature,context);
  return deepFreeze({
    experiment:experimentFeature,
    cohort:decision.enabled ? 'active' : 'control',
    decision
  });
}
