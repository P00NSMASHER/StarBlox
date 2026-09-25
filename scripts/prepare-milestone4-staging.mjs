import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFile,
  mkdir,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep
} from 'node:path';

import { loadFactoryMigrationEvidence } from '../src/devFactory/migrationInput.js';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function absolute(value){
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(),value);
}

function safeResolve(base,relativePath,label){
  if(typeof relativePath !== 'string' || !relativePath.trim()){
    throw new Error(label + ' path is required');
  }
  if(isAbsolute(relativePath)){
    throw new Error(label + ' must be relative');
  }
  const root=resolve(base);
  const candidate=resolve(root,relativePath);
  const rel=relative(root,candidate);
  if(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)){
    throw new Error(label + ' escapes its expected directory');
  }
  return candidate;
}

function digestBytes(data){
  return createHash('sha256').update(data).digest('hex');
}

async function digest(path){
  const data=await readFile(path);
  return {data,sha256:digestBytes(data),bytes:data.length};
}

function run(command,args,{cwd=process.cwd()}={}){
  const result=spawnSync(command,args,{
    cwd,
    encoding:'utf8',
    maxBuffer:64 * 1024 * 1024
  });
  if(result.error){
    throw new Error('could not start ' + command + ': ' + result.error.message);
  }
  if(result.status !== 0){
    throw new Error(
      command + ' failed (' + result.status + '): ' +
      (result.stderr || result.stdout || '').trim()
    );
  }
  return (result.stdout || '').trim();
}

function slug(value){
  const result=String(value || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g,'-')
    .replace(/^-+|-+$/g,'');
  return result || 'ImportedSource';
}

function receiptPayload(receipt){
  const {receiptHash,...payload}=receipt;
  return payload;
}

const exportReceiptPath=absolute(arg('--export-receipt',true));
const unitId=String(arg('--unit',true)).trim();
const outDir=absolute(arg('--out-dir') || 'artifacts/milestone4-staging');
const repoRoot=process.cwd();
const robloxDir=resolve(repoRoot,'roblox');
const baseProjectPath=resolve(robloxDir,'default.project.json');
const generatedProjectPath=resolve(robloxDir,'.milestone4.generated.project.json');
const exporterManifest=resolve(repoRoot,'tools/roblox_migration_exporter/Cargo.toml');

const evidence=await loadFactoryMigrationEvidence({
  exportReceiptPath,
  unitIds:[unitId]
});
const unit=evidence.units[0];
if(!unit || unit.unitId !== unitId){
  throw new Error('factory migration evidence did not resolve the requested unit');
}
if(unit.disposition !== 'quarantine' || unit.activation !== 'staging-only'){
  throw new Error('Milestone 4 staging requires a quarantined staging-only unit');
}
if(!['refactor','quarantine'].includes(unit.migrationStrategy)){
  throw new Error('Milestone 4 staging requires a refactor/quarantine migration unit');
}

const exportDir=dirname(exportReceiptPath);
const sourceArtifactPath=safeResolve(
  exportDir,
  unit.artifactFile,
  'migration artifact'
);
const sourceArtifact=await digest(sourceArtifactPath);
if(
  sourceArtifact.sha256 !== unit.artifactSha256 ||
  sourceArtifact.bytes !== unit.artifactBytes
){
  throw new Error('exact migration artifact fingerprint changed before staging');
}

await mkdir(outDir,{recursive:true});
const evidenceDir=resolve(outDir,'evidence');
await mkdir(evidenceDir,{recursive:true});
const containerName=slug(unit.systemName) + 'Source';
const containerPath=resolve(outDir,containerName + '.rbxmx');
const placePath=resolve(outDir,'StarBlox-milestone4-staging.rbxlx');
const receiptPath=resolve(outDir,'milestone4-staging-receipt.json');
const taskPath=resolve(outDir,'milestone4-task.json');

const exportReceiptJson=JSON.parse((await readFile(exportReceiptPath,'utf8')));
const exactEvidenceFiles=new Set([
  basename(exportReceiptPath),
  exportReceiptJson?.input?.migrationPlan?.file,
  exportReceiptJson?.input?.planningReceipt?.file,
  exportReceiptJson?.bundle?.file,
  unit.artifactFile,
  'migration-plan.md'
].filter(value => typeof value === 'string' && value.trim()));

for(const rel of exactEvidenceFiles){
  const source=safeResolve(exportDir,rel,'migration evidence file');
  const destination=safeResolve(evidenceDir,rel,'staging evidence directory');
  await mkdir(dirname(destination),{recursive:true});
  await copyFile(source,destination);
}

const copiedExportReceiptPath=resolve(evidenceDir,basename(exportReceiptPath));
const copiedEvidence=await loadFactoryMigrationEvidence({
  exportReceiptPath:copiedExportReceiptPath,
  unitIds:[unitId]
});
if(copiedEvidence.evidenceHash !== evidence.evidenceHash){
  throw new Error('copied migration evidence changed during staging packaging');
}

const task={
  id:'milestone-4-real-studio-cycle',
  request:[
    'Adapt exactly the verified migrated quarantine unit for StarBlox.',
    'Keep imported source inert inside ServerStorage quarantine.',
    'Add only deterministic provenance and validation scaffolding.',
    'Require Studio tests, a single-player playtest, runtime logs, and viewport evidence.',
    'Do not publish, upload assets, purchase anything, or enable live activation.'
  ].join(' '),
  migration:{
    exportReceipt:'evidence/' + basename(exportReceiptPath),
    unitIds:[unitId]
  }
};
await writeFile(taskPath,JSON.stringify(task,null,2) + '\n');

const containerStdout=run('cargo',[
  'run','--quiet',
  '--manifest-path',exporterManifest,
  '--bin','containerize',
  '--',
  '--input',sourceArtifactPath,
  '--out',containerPath,
  '--name',containerName
]);

let containerResult;
try{
  containerResult=JSON.parse(containerStdout);
}catch{
  throw new Error('quarantine containerizer returned invalid JSON');
}
if(containerResult.ok !== true || containerResult.containerClass !== 'Folder'){
  throw new Error('quarantine containerizer did not produce a neutral Folder');
}

const container=await digest(containerPath);
const baseProjectBytes=await readFile(baseProjectPath);
const baseProject=JSON.parse(baseProjectBytes.toString('utf8'));
const project=JSON.parse(JSON.stringify(baseProject));
project.name='StarBloxMilestone4Staging';
project.tree ||= {$className:'DataModel'};
project.tree.ServerStorage ||= {};
project.tree.ServerStorage.StarBloxMigration={
  $className:'Folder',
  Quarantine:{
    $className:'Folder',
    [containerName]:{
      $path:relative(robloxDir,containerPath).replaceAll('\\','/')
    }
  }
};

const projectJson=JSON.stringify(project,null,2) + '\n';
await writeFile(generatedProjectPath,projectJson);

try{
  const rojo=process.platform === 'win32' ? 'rojo.exe' : 'rojo';
  run(rojo,[
    'build',
    generatedProjectPath,
    '--output',
    placePath
  ]);

  const place=await digest(placePath);
  const xml=place.data.toString('utf8');
  if(!xml.includes('StarBlox')){
    throw new Error('staging place does not contain the StarBlox native project');
  }
  if(!xml.includes(containerName)){
    throw new Error('staging place does not contain the quarantined derived container');
  }

  const exportReceipt=await digest(exportReceiptPath);
  const base={
    schemaVersion:1,
    version:'starblox-milestone4-staging-v1',
    status:'prepared-offline',
    input:{
      migrationExportReceipt:{
        file:basename(exportReceiptPath),
        sha256:exportReceipt.sha256,
        bytes:exportReceipt.bytes,
        receiptHash:evidence.exportReceipt.receiptHash
      },
      migrationEvidenceHash:evidence.evidenceHash,
      selfContainedFactoryTask:{
        file:basename(taskPath),
        exportReceiptFile:'evidence/' + basename(exportReceiptPath)
      },
      unit:{
        unitId:unit.unitId,
        systemName:unit.systemName,
        migrationStrategy:unit.migrationStrategy,
        disposition:unit.disposition,
        activation:unit.activation,
        artifactFile:unit.artifactFile,
        artifactSha256:unit.artifactSha256,
        artifactBytes:unit.artifactBytes
      },
      nativeProject:{
        file:'roblox/default.project.json',
        sha256:digestBytes(baseProjectBytes),
        bytes:baseProjectBytes.length
      }
    },
    derived:{
      container:{
        file:basename(containerPath),
        sha256:container.sha256,
        bytes:container.bytes,
        className:'Folder',
        name:containerName,
        sourceRootClass:containerResult.sourceClass,
        sourceRootName:containerResult.sourceName,
        childCount:Number(containerResult.stagedChildCount)
      },
      stagingPlace:{
        file:basename(placePath),
        sha256:place.sha256,
        bytes:place.bytes,
        format:'rbxlx'
      },
      generatedProjectHash:'sha256:' + digestBytes(Buffer.from(projectJson,'utf8')),
      evidenceDirectory:'evidence',
      factoryTaskFile:basename(taskPath)
    },
    liveExecution:{
      studioConnectorAttested:false,
      studioMutationStarted:false,
      playtestStarted:false,
      adaptationReceiptCreated:false,
      promotionReceiptCreated:false
    },
    publicationStarted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false,
    nextStep:'open-staging-place-in-attested-studio'
  };
  const receipt={
    ...base,
    receiptHash:'sha256:' + digestBytes(Buffer.from(JSON.stringify(base),'utf8'))
  };

  await writeFile(receiptPath,JSON.stringify(receipt,null,2) + '\n');

  const verification='sha256:' + digestBytes(
    Buffer.from(JSON.stringify(receiptPayload(receipt)),'utf8')
  );
  if(verification !== receipt.receiptHash){
    throw new Error('generated staging receipt hash mismatch');
  }

  console.log('StarBlox Milestone 4 staging place');
  console.log('unit: ' + unit.unitId);
  console.log('container: ' + containerName);
  console.log('container bytes: ' + container.bytes);
  console.log('place bytes: ' + place.bytes);
  console.log('place sha256: ' + place.sha256);
  console.log('receipt: ' + receiptPath);
  console.log('task: ' + taskPath);
  console.log('evidence: ' + evidenceDir);
  console.log('publication started: false');
  console.log('live activation allowed: false');
}finally{
  await rm(generatedProjectPath,{force:true});
}
