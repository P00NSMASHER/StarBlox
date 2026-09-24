import { createHash } from 'node:crypto';
import { mkdir,readFile,stat,writeFile } from 'node:fs/promises';
import { dirname,isAbsolute,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  buildRobloxMigrationPlan,
  verifyRobloxMigrationPlan
} from '../src/robloxMigration/migrationPlanner.js';
import { migrationPlanMarkdown } from '../src/robloxMigration/migrationReport.js';
import {
  buildMigrationBundleManifest,
  verifyMigrationBundleAgainstPlan
} from '../src/robloxMigration/migrationBundle.js';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const exporterManifest=resolve(root,'tools/roblox_migration_exporter/Cargo.toml');

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function hasFlag(name){
  return process.argv.includes(name);
}

function absolute(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

function safeResolve(base,relativePath,label='base directory'){
  const cleanBase=resolve(base);
  const candidate=resolve(cleanBase,relativePath);
  const rel=relative(cleanBase,candidate);
  if(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)){
    throw new Error('path escapes ' + label + ': ' + relativePath);
  }
  return candidate;
}

function resolveLinkedPath(base,value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new Error(label + ' path is required');
  }
  return isAbsolute(value)
    ? resolve(value)
    : safeResolve(base,value,label);
}

function runExporter({input,instancePath,out}){
  const result=spawnSync(
    'cargo',
    [
      'run','--quiet',
      '--manifest-path',exporterManifest,
      '--',
      '--input',input,
      '--path',instancePath,
      '--out',out
    ],
    {
      cwd:root,
      encoding:'utf8',
      maxBuffer:64 * 1024 * 1024
    }
  );

  if(result.error){
    throw new Error('could not start migration exporter: ' + result.error.message);
  }
  if(result.status !== 0){
    throw new Error(
      'migration exporter failed for ' + instancePath + ': ' +
      (result.stderr || result.stdout || ('exit ' + result.status)).trim()
    );
  }

  try{
    return JSON.parse(result.stdout);
  }catch{
    throw new Error('migration exporter returned invalid JSON for ' + instancePath);
  }
}

async function digest(path){
  const data=await readFile(path);
  return {
    data,
    sha256:createHash('sha256').update(data).digest('hex'),
    bytes:data.length
  };
}

async function readJson(path,label){
  try{
    return JSON.parse(await readFile(path,'utf8'));
  }catch(error){
    throw new Error('could not read ' + label + ': ' + error.message);
  }
}

function assertDigest(actual,expected,label){
  if(
    !expected ||
    !/^[a-f0-9]{64}$/.test(String(expected.sha256 || '')) ||
    !Number.isInteger(Number(expected.bytes)) ||
    Number(expected.bytes) < 0
  ){
    throw new Error(label + ' fingerprint metadata is invalid');
  }
  if(actual.sha256 !== expected.sha256 || actual.bytes !== Number(expected.bytes)){
    throw new Error(
      label + ' fingerprint mismatch; expected ' +
      expected.sha256 + '/' + expected.bytes +
      ' but found ' + actual.sha256 + '/' + actual.bytes
    );
  }
}

function verifyPayloadHash(receipt,label){
  const receiptHash=String(receipt?.receiptHash || '');
  if(!/^sha256:[a-f0-9]{64}$/.test(receiptHash)){
    throw new Error(label + ' receiptHash is invalid');
  }
  const {receiptHash:ignored,...payload}=receipt;
  void ignored;
  const expected='sha256:' + createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
  if(expected !== receiptHash){
    throw new Error(label + ' payload hash mismatch');
  }
}

async function loadPlanningReceipt(planningReceiptRaw){
  const planningReceiptPath=absolute(planningReceiptRaw);
  const planningReceiptDigest=await digest(planningReceiptPath);
  const receipt=JSON.parse(planningReceiptDigest.data.toString('utf8'));

  if(
    receipt?.schemaVersion !== 1 ||
    receipt?.version !== 'starblox-roblox-migration-planning-v1' ||
    receipt?.status !== 'planned'
  ){
    throw new Error('unsupported or incomplete migration planning receipt');
  }
  if(
    receipt.exportStarted !== false ||
    receipt.migrationBundleCreated !== false ||
    receipt.studioMutationStarted !== false ||
    receipt.publicationStarted !== false
  ){
    throw new Error('migration planning receipt does not attest a clean plan-only boundary');
  }
  verifyPayloadHash(receipt,'migration planning');

  const base=dirname(planningReceiptPath);

  const planArtifact=receipt?.artifacts?.migrationPlan;
  const reportArtifact=receipt?.artifacts?.migrationPlanReport;
  const planPath=resolveLinkedPath(base,planArtifact?.file,'migration plan artifact');
  const reportPath=resolveLinkedPath(base,reportArtifact?.file,'migration plan report artifact');
  const planDigest=await digest(planPath);
  const reportDigest=await digest(reportPath);
  assertDigest(planDigest,planArtifact,'migration plan artifact');
  assertDigest(reportDigest,reportArtifact,'migration plan report artifact');

  const plan=JSON.parse(planDigest.data.toString('utf8'));
  const planValidation=verifyRobloxMigrationPlan(plan);
  if(!planValidation.ok){
    throw new Error('planning receipt migration plan is invalid: ' + planValidation.errors.join('; '));
  }
  if(
    plan.planId !== receipt?.plan?.planId ||
    plan.planHash !== receipt?.plan?.planHash ||
    plan.catalogHash !== receipt?.plan?.catalogHash ||
    plan.summary?.selectedUnits !== receipt?.plan?.selectedUnits ||
    plan.summary?.blockerCount !== receipt?.plan?.blockerCount
  ){
    throw new Error('planning receipt does not match the exact migration plan');
  }

  const ingestionInput=receipt?.input?.ingestionReceipt;
  const ingestionReceiptPath=resolveLinkedPath(base,ingestionInput?.file,'ingestion receipt input');
  const ingestionReceiptDigest=await digest(ingestionReceiptPath);
  assertDigest(ingestionReceiptDigest,ingestionInput,'ingestion receipt input');
  const ingestionReceipt=JSON.parse(ingestionReceiptDigest.data.toString('utf8'));
  if(
    ingestionReceipt?.schemaVersion !== 1 ||
    ingestionReceipt?.version !== 'starblox-roblox-ingestion-v1' ||
    ingestionReceipt?.status !== 'cataloged' ||
    ingestionReceipt?.migrationStarted !== false
  ){
    throw new Error('planning receipt links an invalid ingestion receipt');
  }

  const catalogInput=receipt?.input?.catalog;
  const catalogPath=resolveLinkedPath(base,catalogInput?.file,'catalog input');
  const catalogDigest=await digest(catalogPath);
  assertDigest(catalogDigest,catalogInput,'catalog input');
  const catalog=JSON.parse(catalogDigest.data.toString('utf8'));
  if(
    catalog.catalogHash !== catalogInput.catalogHash ||
    catalog.catalogHash !== plan.catalogHash ||
    catalog.catalogHash !== ingestionReceipt.catalogHash
  ){
    throw new Error('planning receipt catalog chain does not match the migration plan');
  }
  if(ingestionReceipt?.artifacts?.catalog?.sha256 !== catalogDigest.sha256){
    throw new Error('planning receipt catalog does not match the ingestion receipt catalog artifact');
  }

  return {
    receipt,
    planningReceiptPath,
    planningReceiptDigest,
    plan,
    planPath,
    planDigest,
    reportPath,
    reportDigest,
    ingestionReceiptPath,
    ingestionReceiptDigest,
    catalogPath,
    catalogDigest
  };
}

async function planMode({catalogRaw,receiptRaw,outDir,rulesPath}){
  if(Boolean(catalogRaw) === Boolean(receiptRaw)){
    throw new Error('plan mode requires exactly one of --catalog or --ingestion-receipt');
  }

  let catalogPath=null;
  let ingestionReceipt=null;
  let ingestionReceiptPath=null;
  let ingestionReceiptDigest=null;
  let catalogDigest=null;

  if(receiptRaw){
    ingestionReceiptPath=absolute(receiptRaw);
    ingestionReceiptDigest=await digest(ingestionReceiptPath);
    ingestionReceipt=JSON.parse(ingestionReceiptDigest.data.toString('utf8'));
    if(
      ingestionReceipt?.schemaVersion !== 1 ||
      ingestionReceipt?.version !== 'starblox-roblox-ingestion-v1' ||
      ingestionReceipt?.status !== 'cataloged'
    ){
      throw new Error('unsupported or incomplete Roblox ingestion receipt');
    }
    if(ingestionReceipt.migrationStarted !== false){
      throw new Error('ingestion receipt does not attest migrationStarted=false');
    }

    const artifact=ingestionReceipt?.artifacts?.catalog;
    if(
      !artifact ||
      typeof artifact.file !== 'string' ||
      !artifact.file.trim() ||
      !/^[a-f0-9]{64}$/.test(String(artifact.sha256 || ''))
    ){
      throw new Error('ingestion receipt catalog artifact is invalid');
    }

    catalogPath=safeResolve(dirname(ingestionReceiptPath),artifact.file,'ingestion receipt directory');
    catalogDigest=await digest(catalogPath);
    if(catalogDigest.sha256 !== artifact.sha256){
      throw new Error(
        'ingestion receipt catalog SHA-256 mismatch; expected ' + artifact.sha256 +
        ' but found ' + catalogDigest.sha256
      );
    }
  }else{
    catalogPath=absolute(catalogRaw);
  }

  const catalog=await readJson(catalogPath,'Roblox capability catalog');
  if(ingestionReceipt && catalog.catalogHash !== ingestionReceipt.catalogHash){
    throw new Error(
      'ingestion receipt catalog hash mismatch; expected ' + ingestionReceipt.catalogHash +
      ' but found ' + catalog.catalogHash
    );
  }

  let rules={};
  if(rulesPath){
    rules=JSON.parse(await readFile(absolute(rulesPath),'utf8'));
  }
  if(hasFlag('--include-risky')) rules={...rules,includeRisky:true};
  const minScore=arg('--min-score');
  if(minScore != null){
    rules={...rules,minEngineeringLeverageScore:Number(minScore)};
  }

  const plan=buildRobloxMigrationPlan(catalog,rules);
  const validation=verifyRobloxMigrationPlan(plan);
  if(!validation.ok){
    throw new Error('generated invalid migration plan: ' + validation.errors.join('; '));
  }

  await mkdir(outDir,{recursive:true});
  const planJsonPath=resolve(outDir,'migration-plan.json');
  const planMarkdownPath=resolve(outDir,'migration-plan.md');
  await writeFile(planJsonPath,JSON.stringify(plan,null,2) + '\n');
  await writeFile(planMarkdownPath,migrationPlanMarkdown(plan));

  console.log('Brookhaven -> StarBlox migration plan');
  console.log('plan: ' + plan.planId);
  console.log('selected: ' + plan.summary.selectedUnits + '/' + plan.summary.totalUnits);
  console.log('staging: ' + plan.summary.stagingUnits);
  console.log('quarantine: ' + plan.summary.quarantineUnits);
  console.log('blockers: ' + plan.summary.blockerCount);

  if(ingestionReceipt){
    const planJsonDigest=await digest(planJsonPath);
    const planMarkdownDigest=await digest(planMarkdownPath);
    const planningReceiptPayload={
      schemaVersion:1,
      version:'starblox-roblox-migration-planning-v1',
      status:'planned',
      input:{
        ingestionReceipt:{
          file:ingestionReceiptPath,
          sha256:ingestionReceiptDigest.sha256,
          bytes:ingestionReceiptDigest.bytes
        },
        catalog:{
          file:catalogPath,
          sha256:catalogDigest.sha256,
          bytes:catalogDigest.bytes,
          catalogHash:catalog.catalogHash
        }
      },
      plan:{
        planId:plan.planId,
        planHash:plan.planHash,
        catalogHash:plan.catalogHash,
        selectedUnits:plan.summary.selectedUnits,
        blockerCount:plan.summary.blockerCount
      },
      artifacts:{
        migrationPlan:{
          file:'migration-plan.json',
          sha256:planJsonDigest.sha256,
          bytes:planJsonDigest.bytes
        },
        migrationPlanReport:{
          file:'migration-plan.md',
          sha256:planMarkdownDigest.sha256,
          bytes:planMarkdownDigest.bytes
        }
      },
      nextStep:'review-migration-plan',
      exportStarted:false,
      migrationBundleCreated:false,
      studioMutationStarted:false,
      publicationStarted:false
    };
    const receiptHash=createHash('sha256')
      .update(JSON.stringify(planningReceiptPayload))
      .digest('hex');
    const planningReceipt={
      ...planningReceiptPayload,
      receiptHash:'sha256:' + receiptHash
    };
    await writeFile(
      resolve(outDir,'migration-planning-receipt.json'),
      JSON.stringify(planningReceipt,null,2) + '\n'
    );
    console.log('planning receipt: ' + resolve(outDir,'migration-planning-receipt.json'));
  }else{
    console.log('diagnostic plan only: catalog-only plans are not export-authorizing inputs');
  }

  console.log('plan-only mode: export requires --planning-receipt plus --source-root');
}

async function exportMode({planningReceiptRaw,sourceRootRaw,outDir}){
  if(!planningReceiptRaw || !sourceRootRaw){
    throw new Error('export mode requires both --planning-receipt and --source-root');
  }
  if(arg('--catalog') || arg('--ingestion-receipt') || arg('--rules') || arg('--min-score') != null || hasFlag('--include-risky')){
    throw new Error(
      'export mode refuses catalog/rule inputs; export must use the exact approved planning receipt'
    );
  }

  const verified=await loadPlanningReceipt(planningReceiptRaw);
  const plan=verified.plan;
  const sourceRoot=absolute(sourceRootRaw);

  await mkdir(outDir,{recursive:true});

  // Copy the exact verified planning evidence into the export bundle directory.
  await writeFile(resolve(outDir,'migration-plan.json'),verified.planDigest.data);
  await writeFile(resolve(outDir,'migration-plan.md'),verified.reportDigest.data);
  await writeFile(
    resolve(outDir,'migration-planning-receipt.json'),
    verified.planningReceiptDigest.data
  );

  const artifacts=[];
  for(const unit of plan.units.filter(item => item.selected)){
    const input=safeResolve(sourceRoot,unit.sourceFile,'--source-root');
    const inputInfo=await stat(input);
    if(!inputInfo.isFile()){
      throw new Error('migration source is not a file: ' + input);
    }

    if(!unit.sourceSha256 || unit.sourceBytes == null){
      throw new Error(
        'migration source fingerprint is missing for ' + unit.sourceFile +
        '; rebuild the capability catalog before exporting'
      );
    }
    const sourceDigest=await digest(input);
    if(sourceDigest.sha256 !== unit.sourceSha256 || sourceDigest.bytes !== unit.sourceBytes){
      throw new Error(
        'migration source fingerprint mismatch for ' + unit.sourceFile +
        '; expected ' + unit.sourceSha256 + '/' + unit.sourceBytes +
        ' but found ' + sourceDigest.sha256 + '/' + sourceDigest.bytes
      );
    }

    const folder=resolve(outDir,unit.exportDisposition);
    await mkdir(folder,{recursive:true});
    const out=resolve(folder,unit.unitId + '.rbxmx');

    process.stderr.write(
      'migration: ' + unit.systemName + ' -> ' + unit.exportDisposition + '/' +
      unit.unitId + '.rbxmx\n'
    );

    runExporter({
      input,
      instancePath:unit.rootPath,
      out
    });

    const fileDigest=await digest(out);
    artifacts.push({
      unitId:unit.unitId,
      disposition:unit.exportDisposition,
      file:relative(outDir,out).replaceAll('\\','/'),
      sha256:fileDigest.sha256,
      bytes:fileDigest.bytes
    });
  }

  const manifest=buildMigrationBundleManifest(plan,artifacts);
  const binding=verifyMigrationBundleAgainstPlan(manifest,plan);
  if(!binding.ok){
    throw new Error('migration bundle does not match approved plan: ' + binding.errors.join('; '));
  }

  const bundlePath=resolve(outDir,'migration-bundle.json');
  await writeFile(bundlePath,JSON.stringify(manifest,null,2) + '\n');
  const bundleDigest=await digest(bundlePath);

  const exportReceiptPayload={
    schemaVersion:1,
    version:'starblox-roblox-migration-export-v1',
    status:'exported',
    input:{
      planningReceipt:{
        file:'migration-planning-receipt.json',
        sha256:verified.planningReceiptDigest.sha256,
        bytes:verified.planningReceiptDigest.bytes,
        receiptHash:verified.receipt.receiptHash
      },
      migrationPlan:{
        file:'migration-plan.json',
        sha256:verified.planDigest.sha256,
        bytes:verified.planDigest.bytes,
        planId:plan.planId,
        planHash:plan.planHash,
        catalogHash:plan.catalogHash
      }
    },
    bundle:{
      file:'migration-bundle.json',
      sha256:bundleDigest.sha256,
      bytes:bundleDigest.bytes,
      bundleId:manifest.bundleId,
      bundleHash:manifest.bundleHash,
      planBindingHash:binding.bindingHash
    },
    summary:{
      selectedUnits:manifest.summary.selectedUnits,
      exportedUnits:manifest.summary.exportedUnits,
      stagingArtifacts:manifest.summary.stagingArtifacts,
      quarantineArtifacts:manifest.summary.quarantineArtifacts,
      totalBytes:manifest.summary.totalBytes
    },
    nextStep:'review-migration-bundle',
    exportCompleted:true,
    studioMutationStarted:false,
    publicationStarted:false,
    liveActivationAllowed:false
  };
  const receiptHash='sha256:' + createHash('sha256')
    .update(JSON.stringify(exportReceiptPayload))
    .digest('hex');
  const exportReceipt={...exportReceiptPayload,receiptHash};
  await writeFile(
    resolve(outDir,'migration-export-receipt.json'),
    JSON.stringify(exportReceipt,null,2) + '\n'
  );

  console.log('Brookhaven -> StarBlox migration export');
  console.log('plan: ' + plan.planId);
  console.log('exported: ' + manifest.summary.exportedUnits);
  console.log('bytes: ' + manifest.summary.totalBytes);
  console.log('requires human review: ' + manifest.review.requiresHumanReview);
  console.log('live activation allowed: ' + manifest.review.liveActivationAllowed);
  console.log('bundle: ' + manifest.bundleId);
  console.log('binding: ' + binding.bindingHash);
  console.log('export receipt: ' + resolve(outDir,'migration-export-receipt.json'));
  console.log('output: ' + outDir);
}

const catalogRaw=arg('--catalog');
const receiptRaw=arg('--ingestion-receipt');
const planningReceiptRaw=arg('--planning-receipt');
const sourceRootRaw=arg('--source-root');
const outDir=absolute(arg('--out-dir') || 'roblox-migration-bundle');
const rulesPath=arg('--rules');

const wantsExport=Boolean(planningReceiptRaw || sourceRootRaw);
if(wantsExport){
  await exportMode({planningReceiptRaw,sourceRootRaw,outDir});
}else{
  await planMode({catalogRaw,receiptRaw,outDir,rulesPath});
}
