import { stableHash } from '../domainSchemas.js';

export const FACTORY_MIGRATION_EVIDENCE_SCHEMA_VERSION=1;
export const FACTORY_MIGRATION_EVIDENCE_VERSION='starblox-dev-factory-migration-input-v1';

function evidencePayload(evidence){
  return {
    schemaVersion:evidence.schemaVersion,
    version:evidence.version,
    status:evidence.status,
    scope:evidence.scope,
    exportReceipt:evidence.exportReceipt,
    plan:evidence.plan,
    units:evidence.units,
    liveActivationAllowed:evidence.liveActivationAllowed
  };
}

export function buildFactoryMigrationEvidence(payload){
  const base={
    schemaVersion:FACTORY_MIGRATION_EVIDENCE_SCHEMA_VERSION,
    version:FACTORY_MIGRATION_EVIDENCE_VERSION,
    status:'verified',
    scope:'quarantine-refactor-only',
    exportReceipt:payload.exportReceipt,
    plan:payload.plan,
    units:payload.units,
    liveActivationAllowed:false
  };
  return {
    ...base,
    evidenceHash:stableHash(evidencePayload(base))
  };
}

export function verifyFactoryMigrationEvidence(evidence){
  const errors=[];
  if(!evidence || typeof evidence !== 'object' || Array.isArray(evidence)){
    return {ok:false,errors:['migration evidence must be an object']};
  }
  if(evidence.schemaVersion !== FACTORY_MIGRATION_EVIDENCE_SCHEMA_VERSION){
    errors.push('unsupported migration evidence schemaVersion');
  }
  if(evidence.version !== FACTORY_MIGRATION_EVIDENCE_VERSION){
    errors.push('unsupported migration evidence version');
  }
  if(evidence.status !== 'verified'){
    errors.push('migration evidence status must be verified');
  }
  if(evidence.scope !== 'quarantine-refactor-only'){
    errors.push('migration evidence scope must be quarantine-refactor-only');
  }
  if(evidence.liveActivationAllowed !== false){
    errors.push('migration evidence must not allow live activation');
  }

  const receipt=evidence.exportReceipt;
  if(!receipt || typeof receipt !== 'object'){
    errors.push('migration evidence exportReceipt is required');
  }else{
    if(!/^[a-f0-9]{64}$/.test(String(receipt.sha256 || ''))){
      errors.push('migration evidence export receipt sha256 is invalid');
    }
    if(!/^sha256:[a-f0-9]{64}$/.test(String(receipt.receiptHash || ''))){
      errors.push('migration evidence export receipt payload hash is invalid');
    }
    if(typeof receipt.bundleId !== 'string' || !receipt.bundleId){
      errors.push('migration evidence bundleId is required');
    }
    if(typeof receipt.bundleHash !== 'string' || !receipt.bundleHash){
      errors.push('migration evidence bundleHash is required');
    }
    if(typeof receipt.planBindingHash !== 'string' || !receipt.planBindingHash){
      errors.push('migration evidence planBindingHash is required');
    }
  }

  const plan=evidence.plan;
  if(!plan || typeof plan !== 'object'){
    errors.push('migration evidence plan is required');
  }else{
    for(const field of ['planId','planHash','catalogHash']){
      if(typeof plan[field] !== 'string' || !plan[field]){
        errors.push('migration evidence plan.' + field + ' is required');
      }
    }
  }

  if(!Array.isArray(evidence.units) || evidence.units.length === 0){
    errors.push('migration evidence must contain at least one unit');
  }else{
    const seen=new Set();
    for(const unit of evidence.units){
      const id=String(unit?.unitId || '');
      if(!id) errors.push('migration evidence unitId is required');
      if(id && seen.has(id)) errors.push('migration evidence repeats unitId: ' + id);
      seen.add(id);

      if(!['refactor','quarantine'].includes(unit?.migrationStrategy)){
        errors.push('migration evidence unit must be refactor or quarantine: ' + id);
      }
      if(unit?.disposition !== 'quarantine'){
        errors.push('migration evidence unit must have quarantine disposition: ' + id);
      }
      if(unit?.activation !== 'staging-only'){
        errors.push('migration evidence unit must remain staging-only: ' + id);
      }
      if(!/^[a-f0-9]{64}$/.test(String(unit?.artifactSha256 || ''))){
        errors.push('migration evidence artifact sha256 is invalid: ' + id);
      }
      if(!Number.isInteger(unit?.artifactBytes) || unit.artifactBytes < 0){
        errors.push('migration evidence artifact bytes are invalid: ' + id);
      }
    }
  }

  try{
    if(stableHash(evidencePayload(evidence)) !== evidence.evidenceHash){
      errors.push('migration evidence hash mismatch');
    }
  }catch{
    errors.push('migration evidence is not hashable');
  }

  return {ok:errors.length === 0,errors};
}
