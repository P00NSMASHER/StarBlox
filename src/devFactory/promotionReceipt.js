import { createHash } from 'node:crypto';

import { stableHash } from '../domainSchemas.js';
import {
  verifyMigrationAdaptationReceipt
} from './adaptationReceipt.js';
import { verifyDevelopmentRun } from './developmentFactory.js';
import { verifyFactoryMigrationEvidence } from './migrationEvidence.js';

export const MIGRATION_PROMOTION_RECEIPT_SCHEMA_VERSION=1;
export const MIGRATION_PROMOTION_RECEIPT_VERSION='starblox-roblox-migration-promotion-v1';

function normalizeUnitIds(unitIds){
  if(!Array.isArray(unitIds) || unitIds.length === 0){
    throw new Error('promotion requires at least one explicit unitId');
  }
  const normalized=unitIds
    .map(value => String(value || '').trim())
    .filter(Boolean);
  if(normalized.length !== unitIds.length){
    throw new Error('promotion unitIds must be non-empty strings');
  }
  if(new Set(normalized).size !== normalized.length){
    throw new Error('promotion unitIds must be unique');
  }
  return [...normalized].sort();
}

function receiptPayload(receipt){
  return {
    schemaVersion:receipt.schemaVersion,
    version:receipt.version,
    status:receipt.status,
    input:receipt.input,
    certification:receipt.certification,
    units:receipt.units,
    promotion:receipt.promotion,
    nextStep:receipt.nextStep,
    publicationStarted:receipt.publicationStarted,
    liveActivationAllowed:receipt.liveActivationAllowed,
    productionActivationAllowed:receipt.productionActivationAllowed
  };
}

function requirePromotionCertification(run){
  const summary=run.verificationSummary;
  const failures=[];

  if(summary?.studioTestsRequired !== true){
    failures.push('Studio tests were not required by the adaptation plan');
  }
  if(summary?.studioTestsPassed !== true){
    failures.push('Studio tests did not pass');
  }
  if(summary?.runtimeRequired === true && summary?.runtimePassed !== true){
    failures.push('required runtime proof did not pass');
  }
  if(summary?.visualRequired === true && summary?.visualPassed !== true){
    failures.push('required visual proof did not pass');
  }
  if(summary?.reviewerPassed !== true){
    failures.push('reviewer did not pass the adaptation');
  }
  if(summary?.verificationOk !== true){
    failures.push('factory verification did not pass');
  }
  if(summary?.repositoryPassed !== true){
    failures.push('repository proof did not pass');
  }
  if(run.rollback?.attempted !== false || run.rollback?.ok !== true){
    failures.push('adaptation required rollback or rollback state is not clean');
  }
  if(run.studioAttestation?.attested !== true){
    failures.push('Studio connector was not attested');
  }
  if(run.mutationSummary?.count < 1){
    failures.push('adaptation has no persistent mutation proof');
  }

  if(failures.length){
    throw new Error(
      'quarantine-exit certification failed: ' + failures.join('; ')
    );
  }

  return {
    studioTestsRequired:true,
    studioTestsPassed:true,
    runtimeRequired:Boolean(summary.runtimeRequired),
    runtimePassed:Boolean(summary.runtimePassed),
    visualRequired:Boolean(summary.visualRequired),
    visualPassed:Boolean(summary.visualPassed),
    reviewerPassed:true,
    verificationOk:true,
    repositoryPassed:true,
    repositoryRequiredGates:[...(summary.repositoryRequiredGates || [])],
    studioAttested:true,
    mutationTargetsHash:run.mutationSummary.targetsHash,
    developmentVerificationSummaryHash:summary.summaryHash
  };
}

export function buildMigrationPromotionReceipt({
  adaptationReceipt,
  adaptationReceiptFile='migration-adaptation-receipt.json',
  adaptationReceiptSha256,
  adaptationReceiptBytes,
  run,
  unitIds
}){
  const adaptationValidation=verifyMigrationAdaptationReceipt(adaptationReceipt);
  if(!adaptationValidation.ok){
    throw new Error(
      'invalid migration adaptation receipt: ' +
      adaptationValidation.errors.join('; ')
    );
  }

  const runValidation=verifyDevelopmentRun(run);
  if(!runValidation.ok){
    throw new Error(
      'invalid development run: ' + runValidation.errors.join('; ')
    );
  }
  if(run.status !== 'verified'){
    throw new Error('quarantine exit requires a verified development run');
  }

  if(!/^[a-f0-9]{64}$/.test(String(adaptationReceiptSha256 || ''))){
    throw new Error('adaptation receipt sha256 is invalid');
  }
  if(!Number.isInteger(adaptationReceiptBytes) || adaptationReceiptBytes < 0){
    throw new Error('adaptation receipt bytes are invalid');
  }

  if(
    adaptationReceipt.developmentRun?.runId !== run.runId ||
    adaptationReceipt.developmentRun?.runHash !== run.runHash
  ){
    throw new Error('adaptation receipt does not match exact development run');
  }

  const migration=run.task?.migrationEvidence;
  const migrationValidation=verifyFactoryMigrationEvidence(migration);
  if(!migrationValidation.ok){
    throw new Error('development run migration evidence is invalid');
  }
  if(
    adaptationReceipt.input?.migrationEvidenceHash !== migration.evidenceHash
  ){
    throw new Error('adaptation receipt migration evidence hash mismatch');
  }
  if(
    adaptationReceipt.studio?.instanceId !== run.studioAttestation?.instanceId ||
    adaptationReceipt.studio?.connectorVersion !==
      run.studioAttestation?.connectedConnectorVersion
  ){
    throw new Error('adaptation receipt Studio identity mismatch');
  }
  if(adaptationReceipt.repository?.proofHash !== stableHash(run.repository)){
    throw new Error('adaptation receipt repository proof mismatch');
  }
  if(
    adaptationReceipt.adaptation?.mutationTargetsHash !==
      run.mutationSummary?.targetsHash
  ){
    throw new Error('adaptation receipt mutation target proof mismatch');
  }

  const certification=requirePromotionCertification(run);
  const selectedIds=normalizeUnitIds(unitIds);

  const adaptationUnits=new Map(
    (adaptationReceipt.input?.units || []).map(unit => [unit.unitId,unit])
  );
  const migrationUnits=new Map(
    (migration.units || []).map(unit => [unit.unitId,unit])
  );

  const units=selectedIds.map(unitId => {
    const adapted=adaptationUnits.get(unitId);
    const source=migrationUnits.get(unitId);

    if(!adapted || !source){
      throw new Error(
        'promotion unit is not bound to the verified adaptation: ' + unitId
      );
    }
    if(
      adapted.promotionCandidate !== true ||
      adapted.quarantineExitApproved !== false
    ){
      throw new Error(
        'promotion unit is not an eligible quarantine candidate: ' + unitId
      );
    }
    if(
      !['refactor','quarantine'].includes(source.migrationStrategy) ||
      source.disposition !== 'quarantine' ||
      source.activation !== 'staging-only'
    ){
      throw new Error(
        'promotion unit does not originate from approved quarantine: ' + unitId
      );
    }
    if(
      adapted.inputArtifactSha256 !== source.artifactSha256 ||
      adapted.inputArtifactBytes !== source.artifactBytes
    ){
      throw new Error(
        'promotion unit input artifact proof mismatch: ' + unitId
      );
    }

    return {
      unitId,
      systemName:adapted.systemName,
      migrationStrategy:adapted.migrationStrategy,
      inputArtifactSha256:adapted.inputArtifactSha256,
      inputArtifactBytes:adapted.inputArtifactBytes,
      previousStatus:'quarantine',
      promotedStatus:'certified-adapted-staging',
      quarantineExitApproved:true,
      publicationAllowed:false,
      liveActivationAllowed:false
    };
  });

  const promotionScope={
    unitIds:units.map(unit => unit.unitId),
    mutationTargetsHash:run.mutationSummary.targetsHash,
    developmentRunHash:run.runHash,
    adaptationReceiptHash:adaptationReceipt.receiptHash
  };

  const base={
    schemaVersion:MIGRATION_PROMOTION_RECEIPT_SCHEMA_VERSION,
    version:MIGRATION_PROMOTION_RECEIPT_VERSION,
    status:'quarantine-exit-certified',
    input:{
      adaptationReceipt:{
        file:adaptationReceiptFile,
        sha256:adaptationReceiptSha256,
        bytes:adaptationReceiptBytes,
        receiptHash:adaptationReceipt.receiptHash
      },
      developmentRun:{
        file:adaptationReceipt.developmentRun.file,
        sha256:adaptationReceipt.developmentRun.sha256,
        bytes:adaptationReceipt.developmentRun.bytes,
        runId:run.runId,
        runHash:run.runHash
      },
      migrationEvidenceHash:migration.evidenceHash,
      plan:{...migration.plan},
      exportReceipt:{...migration.exportReceipt}
    },
    certification:{
      ...certification,
      certificationHash:stableHash(certification)
    },
    units,
    promotion:{
      explicitUnitSelection:true,
      promotedUnitCount:units.length,
      promotionScopeHash:stableHash(promotionScope),
      targetStatus:'certified-adapted-staging',
      requiresIntegrationReview:true
    },
    nextStep:'integration-readiness-review',
    publicationStarted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  };

  return {
    ...base,
    receiptHash:'sha256:' + createHash('sha256')
      .update(JSON.stringify(base))
      .digest('hex')
  };
}

export function verifyMigrationPromotionReceipt(receipt){
  const errors=[];

  if(!receipt || typeof receipt !== 'object' || Array.isArray(receipt)){
    return {ok:false,errors:['promotion receipt must be an object']};
  }
  if(receipt.schemaVersion !== MIGRATION_PROMOTION_RECEIPT_SCHEMA_VERSION){
    errors.push('unsupported promotion receipt schemaVersion');
  }
  if(receipt.version !== MIGRATION_PROMOTION_RECEIPT_VERSION){
    errors.push('unsupported promotion receipt version');
  }
  if(receipt.status !== 'quarantine-exit-certified'){
    errors.push('promotion receipt status must be quarantine-exit-certified');
  }
  if(receipt.promotion?.explicitUnitSelection !== true){
    errors.push('promotion receipt must use explicit unit selection');
  }
  if(receipt.promotion?.targetStatus !== 'certified-adapted-staging'){
    errors.push('promotion receipt target status is invalid');
  }
  if(receipt.promotion?.requiresIntegrationReview !== true){
    errors.push('promotion receipt must require integration review');
  }
  if(
    receipt.publicationStarted !== false ||
    receipt.liveActivationAllowed !== false ||
    receipt.productionActivationAllowed !== false
  ){
    errors.push(
      'promotion receipt must keep publication and production activation disabled'
    );
  }

  const certification=receipt.certification;
  if(!certification || typeof certification !== 'object'){
    errors.push('promotion receipt certification is required');
  }else{
    for(const field of [
      'studioTestsRequired',
      'studioTestsPassed',
      'reviewerPassed',
      'verificationOk',
      'repositoryPassed',
      'studioAttested'
    ]){
      if(certification[field] !== true){
        errors.push('promotion certification field must be true: ' + field);
      }
    }
    if(
      certification.runtimeRequired === true &&
      certification.runtimePassed !== true
    ){
      errors.push('promotion certification required runtime proof did not pass');
    }
    if(
      certification.visualRequired === true &&
      certification.visualPassed !== true
    ){
      errors.push('promotion certification required visual proof did not pass');
    }
    const {certificationHash,...certificationPayload}=certification;
    if(stableHash(certificationPayload) !== certificationHash){
      errors.push('promotion certification hash mismatch');
    }
  }

  if(!Array.isArray(receipt.units) || receipt.units.length === 0){
    errors.push('promotion receipt must contain at least one unit');
  }else{
    const seen=new Set();
    for(const unit of receipt.units){
      if(!unit?.unitId || seen.has(unit.unitId)){
        errors.push('promotion receipt contains invalid or duplicate unitId');
      }
      seen.add(unit?.unitId);
      if(
        unit?.previousStatus !== 'quarantine' ||
        unit?.promotedStatus !== 'certified-adapted-staging' ||
        unit?.quarantineExitApproved !== true ||
        unit?.publicationAllowed !== false ||
        unit?.liveActivationAllowed !== false
      ){
        errors.push('promotion unit state is invalid: ' + unit?.unitId);
      }
    }
    if(receipt.promotion?.promotedUnitCount !== receipt.units.length){
      errors.push('promotion unit count mismatch');
    }
  }

  if(!/^[a-f0-9]{64}$/.test(String(receipt.input?.adaptationReceipt?.sha256 || ''))){
    errors.push('promotion adaptation receipt sha256 is invalid');
  }
  if(!/^sha256:[a-f0-9]{64}$/.test(String(receipt.input?.adaptationReceipt?.receiptHash || ''))){
    errors.push('promotion adaptation receipt payload hash is invalid');
  }

  try{
    const expected='sha256:' + createHash('sha256')
      .update(JSON.stringify(receiptPayload(receipt)))
      .digest('hex');
    if(expected !== receipt.receiptHash){
      errors.push('promotion receipt payload hash mismatch');
    }
  }catch{
    errors.push('promotion receipt is not hashable');
  }

  return {ok:errors.length === 0,errors};
}
