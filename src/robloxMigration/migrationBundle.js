
import { stableHash } from '../domainSchemas.js';
import { verifyRobloxMigrationPlan } from './migrationPlanner.js';

export const ROBLOX_MIGRATION_BUNDLE_SCHEMA_VERSION=1;
export const ROBLOX_MIGRATION_BUNDLE_VERSION='starblox-roblox-migration-bundle-v1';

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function safeRelativePath(value){
  if(typeof value !== 'string' || !value.trim()) return false;
  const normalized=value.replaceAll('\\','/');
  if(normalized.startsWith('/') || normalized.includes('../') || normalized === '..') return false;
  return !/^[a-zA-Z]:\//.test(normalized);
}

function manifestPayload(manifest){
  return {
    schemaVersion:manifest.schemaVersion,
    bundleVersion:manifest.bundleVersion,
    planId:manifest.planId,
    planHash:manifest.planHash,
    catalogHash:manifest.catalogHash,
    summary:manifest.summary,
    artifacts:manifest.artifacts,
    review:manifest.review
  };
}

export function buildMigrationBundleManifest(plan,artifacts){
  const planValidation=verifyRobloxMigrationPlan(plan);
  if(!planValidation.ok){
    throw new Error('invalid Roblox migration plan: ' + planValidation.errors[0]);
  }
  if(!Array.isArray(artifacts)) throw new TypeError('artifacts must be an array.');

  const unitsById=new Map(plan.units.map(unit => [unit.unitId,unit]));
  const selected=plan.units.filter(unit => unit.selected);
  const seen=new Set();

  const normalized=artifacts.map((artifact,index) => {
    if(!artifact || typeof artifact !== 'object' || Array.isArray(artifact)){
      throw new TypeError('artifact ' + index + ' must be an object.');
    }
    const unitId=String(artifact.unitId || '');
    if(!unitId || seen.has(unitId)){
      throw new Error(!unitId ? 'artifact unitId is required' : 'duplicate artifact unitId: ' + unitId);
    }
    seen.add(unitId);

    const unit=unitsById.get(unitId);
    if(!unit || !unit.selected){
      throw new Error('artifact does not belong to a selected migration unit: ' + unitId);
    }

    const file=String(artifact.file || '');
    if(!safeRelativePath(file)){
      throw new Error('artifact file must be a safe relative path: ' + unitId);
    }

    const sha256=String(artifact.sha256 || '').toLowerCase();
    if(!/^[a-f0-9]{64}$/.test(sha256)){
      throw new Error('artifact sha256 is invalid: ' + unitId);
    }

    const bytes=Number(artifact.bytes);
    if(!Number.isInteger(bytes) || bytes < 0){
      throw new Error('artifact bytes must be a non-negative integer: ' + unitId);
    }

    const disposition=String(artifact.disposition || '');
    if(disposition !== unit.exportDisposition){
      throw new Error('artifact disposition does not match migration plan: ' + unitId);
    }

    return {
      unitId,
      systemName:unit.systemName,
      sourceId:unit.sourceId,
      sourceFile:unit.sourceFile,
      sourceRootPath:unit.rootPath,
      migrationStrategy:unit.migrationStrategy,
      disposition,
      file:file.replaceAll('\\','/'),
      sha256,
      bytes,
      suggestedTarget:unit.suggestedTarget,
      activation:'staging-only'
    };
  }).sort((a,b) => a.unitId.localeCompare(b.unitId));

  const missing=selected
    .filter(unit => !seen.has(unit.unitId))
    .map(unit => unit.unitId)
    .sort();

  const reviewReasons=[];
  for(const unit of selected){
    if(unit.exportDisposition === 'quarantine'){
      reviewReasons.push(unit.unitId + ':quarantine');
    }
    for(const blocker of unit.blockers || []){
      reviewReasons.push(unit.unitId + ':' + blocker);
    }
  }

  const base={
    schemaVersion:ROBLOX_MIGRATION_BUNDLE_SCHEMA_VERSION,
    bundleVersion:ROBLOX_MIGRATION_BUNDLE_VERSION,
    planId:plan.planId,
    planHash:plan.planHash,
    catalogHash:plan.catalogHash,
    summary:{
      selectedUnits:selected.length,
      exportedUnits:normalized.length,
      missingUnits:missing.length,
      stagingArtifacts:normalized.filter(item => item.disposition === 'staging').length,
      quarantineArtifacts:normalized.filter(item => item.disposition === 'quarantine').length,
      totalBytes:normalized.reduce((sum,item) => sum + item.bytes,0)
    },
    artifacts:normalized,
    review:{
      complete:missing.length === 0,
      missingUnitIds:missing,
      requiresHumanReview:reviewReasons.length > 0,
      reasons:[...new Set(reviewReasons)].sort(),
      liveActivationAllowed:false
    }
  };

  const hash=stableHash(manifestPayload(base));
  return deepFreeze({
    ...base,
    bundleId:'roblox-migration-bundle-' + hash.split(':')[1],
    bundleHash:hash
  });
}

export function verifyMigrationBundleManifest(manifest){
  const errors=[];
  if(!manifest || typeof manifest !== 'object' || Array.isArray(manifest)){
    return {ok:false,errors:['manifest must be an object']};
  }
  if(manifest.schemaVersion !== ROBLOX_MIGRATION_BUNDLE_SCHEMA_VERSION){
    errors.push('unsupported migration bundle schemaVersion');
  }
  if(manifest.bundleVersion !== ROBLOX_MIGRATION_BUNDLE_VERSION){
    errors.push('unsupported migration bundleVersion');
  }
  if(manifest.review?.liveActivationAllowed !== false){
    errors.push('migration bundle must be staging-only');
  }
  for(const artifact of manifest.artifacts || []){
    if(!safeRelativePath(artifact.file)) errors.push('unsafe artifact file path');
    if(artifact.activation !== 'staging-only') errors.push('artifact is not staging-only');
    if(!String(artifact.suggestedTarget || '').startsWith('ServerStorage/StarBloxMigration/')){
      errors.push('artifact target escapes StarBlox migration staging root');
    }
  }
  try{
    const expected=stableHash(manifestPayload(manifest));
    if(expected !== manifest.bundleHash) errors.push('migration bundle hash mismatch');
    const expectedId='roblox-migration-bundle-' + expected.split(':')[1];
    if(expectedId !== manifest.bundleId) errors.push('migration bundle ID mismatch');
  }catch{
    errors.push('migration bundle is not hashable');
  }
  return {ok:errors.length === 0,errors};
}
