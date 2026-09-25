import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile,stat } from 'node:fs/promises';
import { dirname,isAbsolute,resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildSameDayPipelinePlan,
  createSameDayPipelineState,
  readySameDayPipelineStages,
  recordSameDayStageResult
} from '../src/sameDayPipeline/sameDayPipeline.js';
import { buildSameDayStagingProject } from '../src/sameDayPipeline/stagingProject.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (()=>{
    const i=process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function has(name){
  return process.argv.includes(name);
}

function abs(base,value){
  return isAbsolute(value) ? resolve(value) : resolve(base,value);
}

async function exists(path){
  try{ await stat(path); return true; }catch(error){
    if(error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function ensurePinnedSource(source,input){
  const pin=source.download;
  if(!pin) return {downloaded:false,verified:false};

  let bytes;
  let downloaded=false;
  if(await exists(input)){
    bytes=await readFile(input);
  }else{
    const response=await fetch(pin.url,{redirect:'follow'});
    if(!response.ok){
      throw new Error(
        'could not download authorized source ' + source.id +
        ': HTTP ' + response.status
      );
    }
    bytes=Buffer.from(await response.arrayBuffer());
    downloaded=true;
  }

  const sha256=createHash('sha256').update(bytes).digest('hex');
  if(bytes.length !== Number(pin.bytes) || sha256 !== String(pin.sha256).toLowerCase()){
    throw new Error(
      'authorized source fingerprint mismatch for ' + source.id +
      '; expected ' + pin.sha256 + '/' + pin.bytes +
      ' but found ' + sha256 + '/' + bytes.length
    );
  }

  if(downloaded){
    await mkdir(dirname(input),{recursive:true});
    await writeFile(input,bytes);
  }

  return {
    downloaded,
    verified:true,
    sha256,
    bytes:bytes.length,
    input
  };
}

function run(command,args,{cwd,env={}}={}){
  return new Promise(resolveRun => {
    const child=spawn(command,args,{
      cwd,
      env:{...process.env,...env},
      stdio:['ignore','pipe','pipe']
    });
    let stdout='';
    let stderr='';
    const keepTail=(current,chunk)=>{
      const next=current + String(chunk || '');
      return next.length > 120_000 ? next.slice(-120_000) : next;
    };
    child.stdout?.on('data',chunk=>{ stdout=keepTail(stdout,chunk); });
    child.stderr?.on('data',chunk=>{ stderr=keepTail(stderr,chunk); });
    child.on('error',error=>{
      resolveRun({
        ok:false,
        command:[command,...args].join(' '),
        status:null,
        stdout:stdout.slice(-30_000),
        stderr:(stderr + '\n' + error.message).trim().slice(-30_000)
      });
    });
    child.on('close',status=>{
      resolveRun({
        ok:status === 0,
        command:[command,...args].join(' '),
        status,
        stdout:stdout.slice(-30_000),
        stderr:stderr.slice(-30_000)
      });
    });
  });
}

const manifestPath=resolve(process.cwd(),arg('--manifest',true));
const manifestDir=dirname(manifestPath);
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const plan=buildSameDayPipelinePlan(manifest);
const root=process.cwd();
const outDir=abs(manifestDir,manifest.outputDir || plan.outputDir);
const statePath=resolve(outDir,'same-day-pipeline-state.json');
const planPath=resolve(outDir,'same-day-pipeline-plan.json');

await mkdir(outDir,{recursive:true});
await writeFile(planPath,JSON.stringify(plan,null,2) + '\n');

if(has('--plan-only')){
  console.log('StarBlox same-day pipeline');
  console.log('status: planned');
  console.log('stages: ' + plan.stages.length);
  console.log('hash: ' + plan.planHash);
  console.log('plan: ' + planPath);
  process.exit(0);
}

let state;
if(has('--resume') && await exists(statePath)){
  state=JSON.parse(await readFile(statePath,'utf8'));
  if(state.planHash !== plan.planHash){
    throw new Error('cannot resume: manifest changed since the saved pipeline state');
  }
}else{
  state=createSameDayPipelineState(plan);
  await writeFile(statePath,JSON.stringify(state,null,2) + '\n');
}

const normalizedSources=[
  manifest.authorizedWorld,
  ...(Array.isArray(manifest.donors) ? manifest.donors : [])
];
const sources=new Map(normalizedSources.map(source=>[source.id,source]));
const adapterPath=abs(manifestDir,manifest.factoryAdapter);
let loadedAdapter=null;

async function factoryAdapter(){
  if(loadedAdapter) return loadedAdapter;
  const module=await import(pathToFileURL(adapterPath).href);
  loadedAdapter=module.default || module;
  if(!loadedAdapter?.studio || typeof loadedAdapter.studio.call !== 'function'){
    throw new Error('factory adapter must expose studio.call');
  }
  return loadedAdapter;
}

function sourceOut(id){
  return resolve(outDir,'sources',id);
}

async function execute(stage){
  const startedAt=new Date().toISOString();

  if(stage.type === 'source-ingest'){
    const source=stage.details.source;
    const input=abs(manifestDir,source.input);
    const bootstrap=await ensurePinnedSource(source,input);
    const dir=sourceOut(source.id);
    await mkdir(dir,{recursive:true});
    const result=await run(process.execPath,[
      resolve(root,'scripts/ingest-roblox-source.mjs'),
      '--input',input,
      '--out-dir',resolve(dir,'ingestion'),
      '--source-id',source.sourceId,
      '--overwrite'
    ],{cwd:root});
    return {
      ...result,
      startedAt,
      completedAt:new Date().toISOString(),
      bootstrap,
      artifacts:result.ok ? {
        ingestionReceipt:resolve(dir,'ingestion/ingestion-receipt.json')
      } : null
    };
  }

  if(stage.type === 'migration-plan'){
    const source=sources.get(stage.details.sourceId);
    const dir=sourceOut(source.id);
    const args=[
      resolve(root,'scripts/migrate-roblox.mjs'),
      '--ingestion-receipt',resolve(dir,'ingestion/ingestion-receipt.json'),
      '--out-dir',resolve(dir,'planning')
    ];
    if(source.migrationRules){
      args.push('--rules',abs(manifestDir,source.migrationRules));
    }
    const result=await run(process.execPath,args,{cwd:root});
    return {
      ...result,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:result.ok ? {
        planningReceipt:resolve(dir,'planning/migration-planning-receipt.json'),
        plan:resolve(dir,'planning/migration-plan.json')
      } : null
    };
  }

  if(stage.type === 'migration-export'){
    const source=sources.get(stage.details.sourceId);
    const input=abs(manifestDir,source.input);
    const info=await stat(input);
    const sourceRoot=info.isDirectory() ? input : dirname(input);
    const dir=sourceOut(source.id);
    const result=await run(process.execPath,[
      resolve(root,'scripts/migrate-roblox.mjs'),
      '--planning-receipt',resolve(dir,'planning/migration-planning-receipt.json'),
      '--source-root',sourceRoot,
      '--out-dir',resolve(dir,'export')
    ],{cwd:root});
    return {
      ...result,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:result.ok ? {
        exportReceipt:resolve(dir,'export/migration-export-receipt.json')
      } : null
    };
  }

  if(stage.type === 'code-donor-checkout'){
    const repository=stage.details.repository;
    const commit=stage.details.commit;
    const checkout=abs(manifestDir,stage.details.checkout);
    const repoUrl='https://github.com/' + repository + '.git';

    if(await exists(checkout)){
      if(!await exists(resolve(checkout,'.git'))){
        return {
          ok:false,
          status:2,
          startedAt,
          completedAt:new Date().toISOString(),
          error:'authorized donor checkout exists but is not a Git repository: ' + checkout
        };
      }
      const dirty=await run('git',['-C',checkout,'status','--porcelain'],{cwd:root});
      if(!dirty.ok || dirty.stdout.trim()){
        return {
          ok:false,
          status:2,
          startedAt,