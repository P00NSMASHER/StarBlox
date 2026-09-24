import { toQuestionV2, validateQuestionV2 } from './learningContracts.js';
import {
  SOURCE_REGISTRY,
  SOURCE_REGISTRY_VERSION,
  sourceRecord
} from './learningSourceRegistry.js';

export const CONTENT_BUNDLE_SCHEMA_VERSION = 'starblox-content-bundle-v1';

function stableValue(value){
  if(Array.isArray(value)) return value.map(stableValue);
  if(value && typeof value === 'object'){
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key,stableValue(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value){
  return JSON.stringify(stableValue(value));
}

export function fnv1a32(text){
  let hash = 0x811c9dc5;
  for(let i=0;i<text.length;i++){
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash,0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8,'0');
}

function fingerprintPayload(bundle){
  const {contentFingerprint,...rest} = bundle;
  return rest;
}

export function buildContentBundle(questions,{
  contentVersion='bootstrap-current-bank',
  generatorSystem='starblox-existing-bank',
  generatorVersion='1',
  generatorSeed=0
}={}){
  const normalized = (questions || [])
    .map(question => toQuestionV2(question,{
      contentVersion,
      generatorSystem,
      generatorVersion,
      generatorSeed
    }))
    .sort((a,b) => a.id.localeCompare(b.id));

  const usedSourceIds = [...new Set(normalized.flatMap(question => question.sourceIds))].sort();
  const sources = usedSourceIds
    .map(sourceId => sourceRecord(sourceId) || {
      id:sourceId,
      label:sourceId,
      kind:'unknown',
      provenanceStatus:'unknown'
    })
    .sort((a,b) => a.id.localeCompare(b.id));

  const base = {
    schemaVersion:CONTENT_BUNDLE_SCHEMA_VERSION,
    sourceRegistryVersion:SOURCE_REGISTRY_VERSION,
    contentVersion:String(contentVersion),
    generator:{
      system:String(generatorSystem),
      version:String(generatorVersion),
      seed:Number(generatorSeed) || 0
    },
    sources,
    questions:normalized
  };

  return {
    ...base,
    contentFingerprint:'fnv1a32:' + fnv1a32(canonicalJson(base))
  };
}

export function validateContentBundle(bundle,{strictProvenance=false}={}){
  const issues = [];
  if(bundle?.schemaVersion !== CONTENT_BUNDLE_SCHEMA_VERSION){
    issues.push({type:'bundle-schema-version'});
  }
  if(!bundle?.contentVersion) issues.push({type:'missing-content-version'});
  if(!Array.isArray(bundle?.questions) || !bundle.questions.length){
    issues.push({type:'missing-questions'});
    return issues;
  }

  const ids = new Set();
  for(const question of bundle.questions){
    for(const type of validateQuestionV2(question)){
      issues.push({id:question.id,type});
    }
    if(ids.has(question.id)) issues.push({id:question.id,type:'duplicate-id'});
    ids.add(question.id);

    for(const sourceId of question.sourceIds || []){
      const source = sourceRecord(sourceId);
      if(!source){
        issues.push({id:question.id,type:'unknown-source-id',sourceId});
      }else if(strictProvenance && source.provenanceStatus === 'declared-source'){
        issues.push({id:question.id,type:'source-snapshot-required',sourceId});
      }
    }
  }

  const expected = 'fnv1a32:' + fnv1a32(canonicalJson(fingerprintPayload(bundle)));
  if(bundle?.contentFingerprint !== expected){
    issues.push({type:'content-fingerprint-mismatch'});
  }

  return issues;
}

export function provenanceDebt(bundle){
  const declared = (bundle?.sources || []).filter(
    source => source.provenanceStatus === 'declared-source'
  );
  return {
    declaredSourceCount:declared.length,
    declaredSourceIds:declared.map(source => source.id).sort(),
    strictReady:declared.length === 0
  };
}

export { SOURCE_REGISTRY };
