import { createHash } from 'node:crypto';
import { lstat,readFile } from 'node:fs/promises';
import { dirname,isAbsolute,relative,resolve,sep } from 'node:path';

import {
  verifyMigrationBundleAgainstPlan
} from '../robloxMigration/migrationBundle.js';
import { verifyRobloxMigrationPlan } from '../robloxMigration/migrationPlanner.js';
import {
  buildFactoryMigrationEvidence,
  verifyFactoryMigrationEvidence
} from './migrationEvidence.js';

function safeResolve(base,relativePath,label){
  if(typeof relativePath !== 'string' || !relativePath.trim()){
    throw new Error(label + ' path is required');
  }
  if(isAbsolute(relativePath)){
    throw new Error(label + ' must use a relative path');
  }
  const cleanBase=resolve(base);
  const candidate=resolve(cleanBase,relativePath);
  const rel=relative(cleanBase,candidate);
  if(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)){
    throw new Error(label + ' escapes migration export directory');
  }
  return candidate;
}

async function readFileDigest(path,label){
  const info=await lstat(path);
  if(info.isSymbolicLink()) throw new Error(label + ' may not be a symbolic link');
  if(!info.isFile()) throw new Error(label + ' is not a file');
  const data=await readFile(path);
  return {
    data,
    bytes:data.length,
    sha256:createHash('sha256').update(data).digest('hex')
  };
}

function assertDigest(actual,expected,label){
  const sha=String(expected?.sha256 || '');
  const bytes=Number(expected?.bytes);
  if(!/^[a-f0-9]{64}$/.test(sha) || !Number.isInteger(bytes) || bytes < 0){
    throw new Error(label + ' fingerprint metadata is invalid');
  }
  if(actual.sha256 !== sha || actual.bytes !== bytes){
    throw new Error(
      label + ' fingerprint mismatch; expected ' + sha + '/' + bytes +
      ' but found ' + actual.sha256 + '/' + actual.bytes
    );
  }
}

function verifyPayloadHash(receipt,label){
  const hash=String(receipt?.receiptHash || '');
  if(!/^sha256:[a-f0-9]{64}$/.test(hash)){
    throw new Error(label + ' receiptHash is invalid');
  }
  const {receiptHash:ignored,...payload}=receipt;
  void ignored;
  const expected='sha256:' + createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  if(expected !== hash){
    throw new Error(label + ' payload hash mismatch');
  }
}

function normalizeUnitIds(unitIds){
  if(!Array.isArray(unitIds) || unitIds.length === 0){
    throw new Error('migration task must name at least one migration unitId');
  }
  const normalized=[...new Set(unitIds.map(String).map(v => v.trim()).filter(Boolean))].sort();
  if(normalized.length !== unitIds.length){
    throw new Error('migration task unitIds must be non-empty and unique');
  }
  return normalized;
}

export async function loadFactoryMigrationEvidence({exportReceiptPath,unitIds}){
  const receiptPath=resolve(exportReceiptPath);
  const exportDir=dirname(receiptPath);
  const exportReceiptDigest=await readFileDigest(receiptPath,'migration export receipt');
  const exportReceipt=JSON.parse(exportReceiptDigest.data.toString('utf8'));

  if(
    exportReceipt?.schemaVersion !== 1 ||
    exportReceipt?.version !== 'starblox-roblox-migration-export-v1' ||
    exportReceipt?.status !== 'exported' ||
    exportReceipt?.exportCompleted !== true
  ){
    throw new Error('unsupported or incomplete migration export receipt');
  }
  if(
    exportReceipt.studioMutationStarted !== false ||
    exportReceipt.publicationStarted !== false ||
    exportReceipt.liveActivationAllowed !== false
  ){
    throw new Error('migration export receipt does not preserve the pre-Studio safety boundary');
  }
  verifyPayloadHash(exportReceipt,'migration export');

  const planPath=safeResolve(exportDir,exportReceipt?.input?.migrationPlan?.file,'migration plan');
  const bundlePath=safeResolve(exportDir,exportReceipt?.bundle?.file,'migration bundle');
  const planningReceiptPath=safeResolve(
    exportDir,
    exportReceipt?.input?.planningReceipt?.file,
    'migration planning receipt'
  );

  const [planDigest,bundleDigest,planningReceiptDigest]=await Promise.all([
    readFileDigest(planPath,'migration plan'),
    readFileDigest(bundlePath,'migration bundle'),
    readFileDigest(planningReceiptPath,'migration planning receipt')
  ]);
  assertDigest(planDigest,exportReceipt.input.migrationPlan,'migration plan');
  assertDigest(bundleDigest,exportReceipt.bundle,'migration bundle');
  assertDigest(planningReceiptDigest,exportReceipt.input.planningReceipt,'migration planning receipt');

  const plan=JSON.parse(planDigest.data.toString('utf8'));
  const bundle=JSON.parse(bundleDigest.data.toString('utf8'));
  const planningReceipt=JSON.parse(planningReceiptDigest.data.toString('utf8'));

  const planValidation=verifyRobloxMigrationPlan(plan);
  if(!planValidation.ok){
    throw new Error('migration export plan is invalid: ' + planValidation.errors.join('; '));
  }
  const binding=verifyMigrationBundleAgainstPlan(bundle,plan);
  if(!binding.ok){
    throw new Error('migration bundle does not match plan: ' + binding.errors.join('; '));
  }

  if(
    plan.planId !== exportReceipt.input.migrationPlan.planId ||
    plan.planHash !== exportReceipt.input.migrationPlan.planHash ||
    plan.catalogHash !== exportReceipt.input.migrationPlan.catalogHash
  ){
    throw new Error('migration export receipt does not match exact migration plan');
  }
  if(
    bundle.bundleId !== exportReceipt.bundle.bundleId ||
    bundle.bundleHash !== exportReceipt.bundle.bundleHash ||
    binding.bindingHash !== exportReceipt.bundle.planBindingHash
  ){
    throw new Error('migration export receipt does not match exact migration bundle binding');
  }
  if(planningReceipt.receiptHash !== exportReceipt.input.planningReceipt.receiptHash){
    throw new Error('migration export receipt does not match planning receipt payload hash');
  }
  verifyPayloadHash(planningReceipt,'migration planning');

  const requested=normalizeUnitIds(unitIds);
  const planById=new Map((plan.units || []).map(unit => [unit.unitId,unit]));
  const artifactById=new Map((bundle.artifacts || []).map(artifact => [artifact.unitId,artifact]));
  const units=[];

  for(const unitId of requested){
    const unit=planById.get(unitId);
    const artifact=artifactById.get(unitId);
    if(!unit || unit.selected !== true){
      throw new Error('migration unit is not selected in approved plan: ' + unitId);
    }
    if(!artifact){
      throw new Error('migration unit has no exact exported artifact: ' + unitId);
    }
    if(!['refactor','quarantine'].includes(unit.migrationStrategy)){
      throw new Error('factory migration input is not a refactor/quarantine unit: ' + unitId);
    }
    if(unit.exportDisposition !== 'quarantine' || artifact.disposition !== 'quarantine'){
      throw new Error('factory migration input must remain in quarantine: ' + unitId);
    }
    if(artifact.activation !== 'staging-only'){
      throw new Error('factory migration artifact is not staging-only: ' + unitId);
    }

    const artifactPath=safeResolve(exportDir,artifact.file,'migration unit artifact');
    const artifactDigest=await readFileDigest(artifactPath,'migration unit artifact ' + unitId);
    assertDigest(artifactDigest,artifact,'migration unit artifact ' + unitId);

    units.push({
      unitId,
      systemName:unit.systemName,
      migrationStrategy:unit.migrationStrategy,
      disposition:artifact.disposition,
      activation:artifact.activation,
      artifactFile:artifact.file,
      artifactSha256:artifactDigest.sha256,
      artifactBytes:artifactDigest.bytes,
      suggestedTarget:unit.suggestedTarget
    });
  }

  const evidence=buildFactoryMigrationEvidence({
    exportReceipt:{
      sha256:exportReceiptDigest.sha256,
      receiptHash:exportReceipt.receiptHash,
      bundleId:bundle.bundleId,
      bundleHash:bundle.bundleHash,
      planBindingHash:binding.bindingHash
    },
    plan:{
      planId:plan.planId,
      planHash:plan.planHash,
      catalogHash:plan.catalogHash
    },
    units
  });

  const validation=verifyFactoryMigrationEvidence(evidence);
  if(!validation.ok){
    throw new Error('generated invalid factory migration evidence: ' + validation.errors.join('; '));
  }
  return evidence;
}
