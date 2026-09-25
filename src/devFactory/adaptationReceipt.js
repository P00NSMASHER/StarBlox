import { createHash } from 'node:crypto';

import { stableHash } from '../domainSchemas.js';
import { verifyDevelopmentRun } from './developmentFactory.js';
import { verifyFactoryMigrationEvidence } from './migrationEvidence.js';

export const MIGRATION_ADAPTATION_RECEIPT_SCHEMA_VERSION=1;
export const MIGRATION_ADAPTATION_RECEIPT_VERSION='starblox-roblox-migration-adaptation-v1';

function gatePassed(value){
  return value === true || Boolean(value && typeof value === 'object' && value.ok === true);
}

function receiptPayload(receipt){
  return {
    schemaVersion:receipt.schemaVersion,
    version:receipt.version,
    status:receipt.status,
    input:receipt.input,
    developmentRun:receipt.developmentRun,
    studio:receipt.studio,
    repository:receipt.repository,
    adaptation:receipt.adaptation,
    nextStep:receipt.nextStep,
    publicationStarted:receipt.publicationStarted,
    liveActivationAllowed:receipt.liveActivationAllowed
  };
}

export function buildMigrationAdaptationReceipt({
  run,
  runArtifactFile='ai-development-run.json',
  runArtifactSha256,
  runArtifactBytes
}){
  const validation=verifyDevelopmentRun(run);
  if(!validation.ok){
    throw new Error('invalid development run: ' + validation.errors.join('; '));
  }
  if(run.status !== 'verified'){
    throw new Error('migration adaptation receipt requires a verified development run');
  }

  const migration=run.task?.migrationEvidence;
  const migrationValidation=verifyFactoryMigrationEvidence(migration);
  if(!migrationValidation.ok){
    throw new Error('verified development run lacks valid migration evidence');
  }

  if(run.studioAttestation?.attested !== true){
    throw new Error('migration adaptation receipt requires an attested Studio connector');
  }

  const requiredGates=['tests','certification','balance','build'];
  const missing=requiredGates.filter(name => !gatePassed(run.repository?.gates?.[name]));
  if(run.repository?.ok !== true || missing.length){
    throw new Error(
      'migration adaptation receipt requires repository proof for: ' +
      (missing.length ? missing.join(', ') : 'repository gate')
    );
  }

  if(!/^[a-f0-9]{64}$/.test(String(runArtifactSha256 || ''))){
    throw new Error('development run artifact sha256 is invalid');
  }
  if(!Number.isInteger(runArtifactBytes) || runArtifactBytes < 0){
    throw new Error('development run artifact bytes are invalid');
  }

  const targets=Array.isArray(run.mutationSummary?.targets)
    ? run.mutationSummary.targets.map(target => ({...target}))
    : [];
  if(targets.length === 0){
    throw new Error('verified migration adaptation made no persistent Studio mutations');
  }

  const units=migration.units.map(unit => ({
    unitId:unit.unitId,
    systemName:unit.systemName,
    migrationStrategy:unit.migrationStrategy,
    inputArtifactSha256:unit.artifactSha256,
    inputArtifactBytes:unit.artifactBytes,
    promotionCandidate:true,
    quarantineExitApproved:false
  }));

  const repositoryGates=Object.fromEntries(
    requiredGates.map(name => [name,gatePassed(run.repository.gates[name])])
  );

  const base={
    schemaVersion:MIGRATION_ADAPTATION_RECEIPT_SCHEMA_VERSION,
    version:MIGRATION_ADAPTATION_RECEIPT_VERSION,
    status:'verified-adaptation',
    input:{
      migrationEvidenceHash:migration.evidenceHash,
      exportReceipt:{
        sha256:migration.exportReceipt.sha256,
        receiptHash:migration.exportReceipt.receiptHash,
        bundleId:migration.exportReceipt.bundleId,
        bundleHash:migration.exportReceipt.bundleHash,
        planBindingHash:migration.exportReceipt.planBindingHash
      },
      plan:{...migration.plan},
      units
    },
    developmentRun:{
      file:runArtifactFile,
      sha256:runArtifactSha256,
      bytes:runArtifactBytes,
      runId:run.runId,
      runHash:run.runHash
    },
    studio:{
      attested:true,
      service:run.studioAttestation.service,
      instanceId:run.studioAttestation.instanceId,
      connectorVersion:run.studioAttestation.connectedConnectorVersion,
      connectedToolsHash:stableHash(run.studioAttestation.connectedTools || [])
    },
    repository:{
      ok:true,
      gates:repositoryGates,
      proofHash:stableHash(run.repository)
    },
    adaptation:{
      mutationTargetCount:targets.length,
      mutationTargets:targets,
      mutationTargetsHash:stableHash(targets),
      promotionCandidateUnitIds:units.map(unit => unit.unitId).sort(),
      quarantineExitApproved:false,
      requiresPromotionReceipt:true
    },
    nextStep:'quarantine-exit-certification',
    publicationStarted:false,
    liveActivationAllowed:false
  };

  const receiptHash='sha256:' + createHash('sha256')
    .update(JSON.stringify(base))
    .digest('hex');

  return {
    ...base,
    receiptHash
  };
}

export function verifyMigrationAdaptationReceipt(receipt){
  const errors=[];

  if(!receipt || typeof receipt !== 'object' || Array.isArray(receipt)){
    return {ok:false,errors:['adaptation receipt must be an object']};
  }
  if(receipt.schemaVersion !== MIGRATION_ADAPTATION_RECEIPT_SCHEMA_VERSION){
    errors.push('unsupported adaptation receipt schemaVersion');
  }
  if(receipt.version !== MIGRATION_ADAPTATION_RECEIPT_VERSION){
    errors.push('unsupported adaptation receipt version');
  }
  if(receipt.status !== 'verified-adaptation'){
    errors.push('adaptation receipt status must be verified-adaptation');
  }
  if(receipt.studio?.attested !== true){
    errors.push('adaptation receipt requires attested Studio evidence');
  }
  if(receipt.repository?.ok !== true){
    errors.push('adaptation receipt repository proof did not pass');
  }
  for(const gate of ['tests','certification','balance','build']){
    if(receipt.repository?.gates?.[gate] !== true){
      errors.push('adaptation receipt missing repository gate: ' + gate);
    }
  }
  if(receipt.adaptation?.quarantineExitApproved !== false){
    errors.push('adaptation receipt must not approve quarantine exit');
  }
  if(receipt.adaptation?.requiresPromotionReceipt !== true){
    errors.push('adaptation receipt must require a separate promotion receipt');
  }
  if(receipt.publicationStarted !== false || receipt.liveActivationAllowed !== false){
    errors.push('adaptation receipt must keep publication/live activation disabled');
  }
  if(!/^[a-f0-9]{64}$/.test(String(receipt.developmentRun?.sha256 || ''))){
    errors.push('adaptation receipt development run sha256 is invalid');
  }
  if(!Array.isArray(receipt.input?.units) || receipt.input.units.length === 0){
    errors.push('adaptation receipt must bind at least one migration unit');
  }else{
    for(const unit of receipt.input.units){
      if(unit.promotionCandidate !== true || unit.quarantineExitApproved !== false){
        errors.push('adaptation receipt unit promotion state is invalid: ' + unit.unitId);
      }
    }
  }
  if(!Array.isArray(receipt.adaptation?.mutationTargets) || receipt.adaptation.mutationTargets.length === 0){
    errors.push('adaptation receipt must bind at least one Studio mutation target');
  }else if(stableHash(receipt.adaptation.mutationTargets) !== receipt.adaptation.mutationTargetsHash){
    errors.push('adaptation receipt mutation target hash mismatch');
  }

  try{
    const expected='sha256:' + createHash('sha256')
      .update(JSON.stringify(receiptPayload(receipt)))
      .digest('hex');
    if(expected !== receipt.receiptHash){
      errors.push('adaptation receipt payload hash mismatch');
    }
  }catch{
    errors.push('adaptation receipt is not hashable');
  }

  return {ok:errors.length === 0,errors};
}
