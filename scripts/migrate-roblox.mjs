
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
import { buildMigrationBundleManifest } from '../src/robloxMigration/migrationBundle.js';

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
    sha256:createHash('sha256').update(data).digest('hex'),
    bytes:data.length
  };
}

const catalogRaw=arg('--catalog');
const receiptRaw=arg('--ingestion-receipt');
if(Boolean(catalogRaw) === Boolean(receiptRaw)){
  throw new Error('provide exactly one of --catalog or --ingestion-receipt');
}
const outDir=absolute(arg('--out-dir') || 'roblox-migration-bundle');
const rulesPath=arg('--rules');
const sourceRootRaw=arg('--source-root');

let catalogPath=null;
let ingestionReceipt=null;
let ingestionReceiptPath=null;
let ingestionReceiptDigest=null;
let catalogDigest=null;

if(receiptRaw){
  ingestionReceiptPath=absolute(receiptRaw);
  ingestionReceiptDigest=await digest(ingestionReceiptPath);
  ingestionReceipt=JSON.parse(await readFile(ingestionReceiptPath,'utf8'));
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

const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
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

if(!sourceRootRaw){
  if(ingestionReceipt){
    const planJsonDigest=await digest(planJsonPath);
    const planMarkdownDigest=await digest(planMarkdownPath);
    const planningReceipt={
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
    await writeFile(
      resolve(outDir,'migration-planning-receipt.json'),
      JSON.stringify(planningReceipt,null,2) + '\n'
    );
    console.log('planning receipt: ' + resolve(outDir,'migration-planning-receipt.json'));
  }
  console.log('plan-only mode: pass --source-root to export exact Roblox subtrees');
  process.exit(0);
}

const sourceRoot=absolute(sourceRootRaw);
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
await writeFile(
  resolve(outDir,'migration-bundle.json'),
  JSON.stringify(manifest,null,2) + '\n'
);

console.log('exported: ' + manifest.summary.exportedUnits);
console.log('bytes: ' + manifest.summary.totalBytes);
console.log('requires human review: ' + manifest.review.requiresHumanReview);
console.log('live activation allowed: ' + manifest.review.liveActivationAllowed);
console.log('bundle: ' + manifest.bundleId);
console.log('output: ' + outDir);
