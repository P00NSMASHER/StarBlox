import { spawnSync } from 'node:child_process';
import { mkdir,readFile,writeFile,stat } from 'node:fs/promises';
import { dirname,isAbsolute,resolve } from 'node:path';

import {
  buildSameDayPipelinePlan,
  createSameDayPipelineState,
  nextSameDayPipelineStage,
  recordSameDayStageResult
} from '../src/sameDayPipeline/sameDayPipeline.js';

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

function run(command,args,{cwd,env={}}={}){
  const result=spawnSync(command,args,{
    cwd,
    env:{...process.env,...env},
    encoding:'utf8',
    maxBuffer:128 * 1024 * 1024
  });
  return {
    ok:result.status === 0,
    command:[command,...args].join(' '),
    status:result.status,
    stdout:(result.stdout || '').slice(-30_000),
    stderr:(result.stderr || '').slice(-30_000)
  };
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

function sourceOut(id){
  return resolve(outDir,'sources',id);
}

async function execute(stage){
  const startedAt=new Date().toISOString();

  if(stage.type === 'source-ingest'){
    const source=stage.details.source;
    const input=abs(manifestDir,source.input);
    const dir=sourceOut(source.id);
    await mkdir(dir,{recursive:true});
    const result=run(process.execPath,[
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
    const result=run(process.execPath,args,{cwd:root});
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
    const result=run(process.execPath,[
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

  if(stage.type === 'factory-adapt'){
    const source=sources.get(stage.details.sourceId);
    const dir=sourceOut(source.id);
    const migrationPlan=JSON.parse(await readFile(resolve(dir,'planning/migration-plan.json'),'utf8'));
    const unitIds=(migrationPlan.units || []).filter(row=>row.selected).map(row=>row.unitId);
    if(!unitIds.length){
      return {
        ok:source.required === false,
        status:source.required === false ? 0 : 2,
        startedAt,
        completedAt:new Date().toISOString(),
        error:'no selected migration units'
      };
    }
    const task={
      id:'same-day-adapt-' + source.id,
      request:source.request || stage.details.request,
      migration:{
        exportReceipt:resolve(dir,'export/migration-export-receipt.json'),
        unitIds
      },
      config:{
        maxRepairCycles:plan.maxRepairCycles
      }
    };
    const taskPath=resolve(dir,'adapt-task.json');
    const runPath=resolve(dir,'adapt-development-run.json');
    await writeFile(taskPath,JSON.stringify(task,null,2) + '\n');
    const result=run(process.execPath,[
      resolve(root,'scripts/ai-development-factory.mjs'),
      '--task',taskPath,
      '--adapter',adapterPath,
      '--out',runPath
    ],{cwd:root});
    return {
      ...result,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:result.ok ? {task:taskPath,developmentRun:runPath} : {task:taskPath}
    };
  }

  if(stage.type === 'factory-task'){
    const taskPath=abs(manifestDir,stage.details.taskFile);
    const runPath=resolve(outDir,stage.id + '-development-run.json');
    const result=run(process.execPath,[
      resolve(root,'scripts/ai-development-factory.mjs'),
      '--task',taskPath,
      '--adapter',adapterPath,
      '--out',runPath
    ],{cwd:root});
    return {
      ...result,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:result.ok ? {developmentRun:runPath} : null
    };
  }

  if(stage.type === 'release-gate'){
    const gate=stage.details.gate;
    const result=run(gate.command,gate.args,{cwd:root});
    return {
      ...result,
      gate:gate.id,
      startedAt,
      completedAt:new Date().toISOString()
    };
  }

  if(stage.type === 'finalize'){
    const summary={
      ok:true,
      planHash:plan.planHash,
      completedStages:[...state.completedStages],
      publicationAllowed:false,
      readyForInternalVerticalSliceReview:true
    };
    const summaryPath=resolve(outDir,'same-day-slice-summary.json');
    await writeFile(summaryPath,JSON.stringify(summary,null,2) + '\n');
    return {
      ok:true,
      status:0,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:{summary:summaryPath}
    };
  }

  throw new Error('unsupported same-day pipeline stage type: ' + stage.type);
}

while(true){
  const stage=nextSameDayPipelineStage(state,plan);
  if(!stage) break;

  console.log('\n[' + (state.completedStages.length + 1) + '/' + plan.stages.length + '] ' + stage.id);
  const result=await execute(stage);
  recordSameDayStageResult(state,plan,stage.id,result);
  await writeFile(statePath,JSON.stringify(state,null,2) + '\n');

  if(!result.ok){
    console.error('BLOCKED: ' + stage.id);
    if(result.stderr) console.error(result.stderr);
    if(result.error) console.error(result.error);
    process.exitCode=2;
    break;
  }
  console.log('PASS: ' + stage.id);
}

console.log('\nStarBlox same-day pipeline');
console.log('status: ' + state.status);
console.log('completed: ' + state.completedStages.length + '/' + plan.stages.length);
console.log('state: ' + statePath);
console.log('plan: ' + planPath);
