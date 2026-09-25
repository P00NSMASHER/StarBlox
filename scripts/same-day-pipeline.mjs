import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile,stat } from 'node:fs/promises';
import { dirname,isAbsolute,resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildSameDayPipelinePlan,
  collectSameDayInputProvenance,
  createSameDayPipelineState,
  readySameDayPipelineStages,
  recordSameDayStageResult
} from '../src/sameDayPipeline/sameDayPipeline.js';
import { buildSameDayStagingProject } from '../src/sameDayPipeline/stagingProject.js';
import { ensurePinnedSource } from '../src/sameDayPipeline/sourceBootstrap.js';

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
const stopAfter=arg('--stop-after');
const skipCodeDonors=has('--skip-code-donors');
if(stopAfter && !plan.stages.some(stage=>stage.id === stopAfter)){
  throw new Error('unknown --stop-after stage: ' + stopAfter);
}

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
    const bootstrap=await ensurePinnedSource({source,input});
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
          completedAt:new Date().toISOString(),
          error:'authorized donor checkout is not clean: ' + checkout
        };
      }
      const remote=await run('git',['-C',checkout,'remote','get-url','origin'],{cwd:root});
      if(!remote.ok || !remote.stdout.toLowerCase().includes(repository.toLowerCase())){
        return {
          ok:false,
          status:2,
          startedAt,
          completedAt:new Date().toISOString(),
          error:'authorized donor checkout origin does not match ' + repository
        };
      }
    }else{
      await mkdir(dirname(checkout),{recursive:true});
      const cloned=await run('git',[
        'clone','--filter=blob:none','--no-checkout',repoUrl,checkout
      ],{cwd:root});
      if(!cloned.ok){
        return {
          ...cloned,
          startedAt,
          completedAt:new Date().toISOString(),
          error:'could not clone authorized donor ' + repository
        };
      }
    }

    const fetched=await run('git',[
      '-C',checkout,'fetch','--depth=1','origin',commit
    ],{cwd:root});
    if(!fetched.ok){
      return {
        ...fetched,
        startedAt,
        completedAt:new Date().toISOString(),
        error:'could not fetch pinned donor commit ' + commit
      };
    }

    const checkedOut=await run('git',[
      '-C',checkout,'checkout','--detach',commit
    ],{cwd:root});
    if(!checkedOut.ok){
      return {
        ...checkedOut,
        startedAt,
        completedAt:new Date().toISOString(),
        error:'could not checkout pinned donor commit ' + commit
      };
    }

    const head=await run('git',['-C',checkout,'rev-parse','HEAD'],{cwd:root});
    const exact=head.ok ? head.stdout.trim().toLowerCase() : '';
    if(!head.ok || exact !== commit.toLowerCase()){
      return {
        ok:false,
        status:2,
        startedAt,
        completedAt:new Date().toISOString(),
        error:'donor checkout HEAD mismatch; expected ' + commit + ' but found ' + exact
      };
    }

    return {
      ok:true,
      status:0,
      startedAt,
      completedAt:new Date().toISOString(),
      repository,
      commit:exact,
      checkout
    };
  }

  if(stage.type === 'staging-project'){
    const staged=await buildSameDayStagingProject({
      repoRoot:root,
      outDir,
      sourceIds:stage.details.sourceIds
    });
    const placePath=resolve(outDir,'StarBloxSameDay.rbxlx');
    const result=await run(
      stage.details.rojoCommand || plan.rojoCommand || 'rojo',
      ['build',staged.projectPath,'-o',placePath],
      {cwd:root}
    );
    return {
      ...result,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:result.ok ? {
        project:staged.projectPath,
        stagingReport:staged.reportPath,
        place:placePath
      } : {
        project:staged.projectPath,
        stagingReport:staged.reportPath
      }
    };
  }

  if(stage.type === 'studio-check'){
    const adapter=await factoryAdapter();
    let description=null;
    try{
      description=typeof adapter.studio.describe === 'function'
        ? await adapter.studio.describe()
        : null;
      const staging=JSON.parse(
        await readFile(resolve(outDir,'same-day-staging-report.json'),'utf8')
      );
      const treeResult=await adapter.studio.call('search_tree',{
        query:stage.details.expectedRoot || 'StarBloxImported',
        limit:50
      });
      const count=Number(treeResult?.count ?? treeResult?.results?.length ?? 0);
      const needsImported=(staging.included || []).length > 0;
      if(needsImported && count < 1){
        return {
          ok:false,
          status:2,
          startedAt,
          completedAt:new Date().toISOString(),
          error:
            'Studio is connected but the staged donor world is not loaded. Open ' +
            resolve(outDir,'StarBloxSameDay.rbxlx') +
            ' (or sync same-day.project.json with Rojo), then resume.',
          description
        };
      }
      return {
        ok:true,
        status:0,
        startedAt,
        completedAt:new Date().toISOString(),
        description,
        stagedAssetCount:(staging.included || []).length,
        treeCount:count
      };
    }catch(error){
      return {
        ok:false,
        status:2,
        startedAt,
        completedAt:new Date().toISOString(),
        error:
          'Studio staging check failed: ' +
          (error instanceof Error ? error.message : String(error)) +
          '. Open the generated StarBloxSameDay.rbxlx, connect the StarBlox Studio connector, then resume.',
        description
      };
    }
  }

  if(stage.type === 'factory-adapt'){
    const source=sources.get(stage.details.sourceId);
    const dir=sourceOut(source.id);
    const migrationPlan=JSON.parse(await readFile(resolve(dir,'planning/migration-plan.json'),'utf8'));
    const unitIds=(migrationPlan.units || [])
      .filter(row =>
        row.selected === true &&
        row.exportDisposition === 'quarantine' &&
        ['refactor','quarantine'].includes(row.migrationStrategy)
      )
      .map(row=>row.unitId);
    if(!unitIds.length){
      return {
        ok:true,
        status:0,
        startedAt,
        completedAt:new Date().toISOString(),
        skipped:true,
        reason:'no quarantined/refactor code units require factory adaptation; safe assets are staged through Rojo'
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
    const result=await run(process.execPath,[
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
    const result=await run(process.execPath,[
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
    const receiptPath=resolve(outDir,'gate-' + gate.id + '-receipt.json');
    const integratedRun=resolve(
      outDir,
      'verify-integrated-slice-development-run.json'
    );
    const result=await run(gate.command,gate.args,{
      cwd:root,
      env:{
        STARBLOX_PIPELINE_OUT_DIR:outDir,
        STARBLOX_PIPELINE_STATE:statePath,
        STARBLOX_PIPELINE_INTEGRATED_RUN:integratedRun,
        STARBLOX_PIPELINE_GATE_RECEIPT:receiptPath
      }
    });
    return {
      ...result,
      gate:gate.id,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:result.ok ? {receipt:receiptPath,integratedRun} : null
    };
  }

  if(stage.type === 'finalize'){
    const integratedRunPath=resolve(
      outDir,
      'verify-integrated-slice-development-run.json'
    );
    const integratedRunBytes=await readFile(integratedRunPath);
    const planBytes=await readFile(planPath);
    const crypto=await import('node:crypto');
    const sha256=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
    const integratedRunSha256=sha256(integratedRunBytes);
    const planSha256=sha256(planBytes);
    const gateReceipts={};

    for(const gateName of ['mobile','security','performance']){
      const receiptPath=resolve(outDir,'gate-' + gateName + '-receipt.json');
      const receiptBytes=await readFile(receiptPath);
      const receipt=JSON.parse(receiptBytes.toString('utf8'));
      if(
        receipt?.version !== 'starblox-same-day-evidence-gate-v1' ||
        receipt?.status !== 'passed' ||
        receipt?.gate !== gateName ||
        receipt?.publicationAllowed !== false
      ){
        throw new Error('invalid same-day gate receipt: ' + gateName);
      }
      if(receipt?.integratedRun?.sha256 !== integratedRunSha256){
        throw new Error(
          gateName + ' gate receipt does not bind to the exact integrated development run'
        );
      }
      const {receiptHash,...receiptPayload}=receipt;
      const expectedReceiptHash='sha256:' + crypto.createHash('sha256')
        .update(JSON.stringify(receiptPayload))
        .digest('hex');
      if(receiptHash !== expectedReceiptHash){
        throw new Error('same-day gate receipt hash mismatch: ' + gateName);
      }
      gateReceipts[gateName]={
        file:receiptPath,
        sha256:sha256(receiptBytes),
        receiptHash,
        integratedRunSha256:receipt.integratedRun.sha256,
        metrics:receipt.metrics
      };
    }

    const {placeSources,codeDonors}=collectSameDayInputProvenance(state,plan);
    const migrationExports={};
    for(const planStage of plan.stages){
      if(planStage.type === 'migration-export' && planStage.details?.sourceId){
        migrationExports[planStage.details.sourceId]={
          receipt:resolve(
            sourceOut(planStage.details.sourceId),
            'export/migration-export-receipt.json'
          )
        };
      }
    }

    for(const [sourceId,evidence] of Object.entries(migrationExports)){
      if(typeof evidence.receipt !== 'string' || !evidence.receipt){
        throw new Error('final summary migration export receipt is missing: ' + sourceId);
      }
      const receiptBytes=await readFile(evidence.receipt);
      const receipt=JSON.parse(receiptBytes.toString('utf8'));
      if(
        receipt?.version !== 'starblox-roblox-migration-export-v1' ||
        receipt?.status !== 'exported' ||
        receipt?.liveActivationAllowed !== false
      ){
        throw new Error('invalid migration export receipt in final summary: ' + sourceId);
      }
      evidence.sha256=sha256(receiptBytes);
      evidence.receiptHash=receipt.receiptHash || null;
    }

    const summaryPayload={
      schemaVersion:1,
      version:'starblox-same-day-slice-summary-v2',
      ok:true,
      plan:{
        file:planPath,
        planHash:plan.planHash,
        sha256:planSha256
      },
      completedStages:[...state.completedStages],
      provenance:{
        placeSources,
        codeDonors,
        migrationExports
      },
      integratedRun:{
        file:integratedRunPath,
        sha256:integratedRunSha256
      },
      gates:gateReceipts,
      publicationAllowed:false,
      readyForInternalVerticalSliceReview:true
    };
    const summary={
      ...summaryPayload,
      summaryHash:'sha256:' + crypto.createHash('sha256')
        .update(JSON.stringify(summaryPayload))
        .digest('hex')
    };
    const summaryPath=resolve(outDir,'same-day-slice-summary.json');
    await writeFile(summaryPath,JSON.stringify(summary,null,2) + '\n');
    return {
      ok:true,
      status:0,
      startedAt,
      completedAt:new Date().toISOString(),
      artifacts:{summary:summaryPath},
      summaryHash:summary.summaryHash
    };
  }

  throw new Error('unsupported same-day pipeline stage type: ' + stage.type);
}

const PARALLEL_SAFE_TYPES=new Set([
  'source-ingest',
  'migration-plan',
  'migration-export',
  'code-donor-checkout',
  'release-gate'
]);

while(true){
  let ready=readySameDayPipelineStages(state,plan);
  if(skipCodeDonors){
    ready=ready.filter(stage=>stage.type !== 'code-donor-checkout');
  }
  if(!ready.length) break;

  const first=ready[0];
  const parallelReady=ready.filter(stage=>PARALLEL_SAFE_TYPES.has(stage.type));
  const batch=PARALLEL_SAFE_TYPES.has(first.type)
    ? parallelReady.slice(0,Number(plan.maxParallel || 4))
    : [first];

  console.log(
    '\nRunning ' + batch.length + ' stage' + (batch.length === 1 ? '' : 's') +
    ' [' + (state.completedStages.length + 1) + '/' + plan.stages.length + ']'
  );
  for(const stage of batch) console.log('  → ' + stage.id);

  const results=await Promise.all(
    batch.map(async stage=>({stage,result:await execute(stage)}))
  );

  let blocked=false;
  for(const {stage,result} of results){
    recordSameDayStageResult(state,plan,stage.id,result);
    if(result.ok){
      console.log('PASS: ' + stage.id);
    }else{
      blocked=true;
      console.error('BLOCKED: ' + stage.id);
      if(result.stderr) console.error(result.stderr);
      if(result.error) console.error(result.error);
    }
  }
  await writeFile(statePath,JSON.stringify(state,null,2) + '\n');

  if(blocked){
    process.exitCode=2;
    break;
  }

  if(stopAfter && state.stages?.[stopAfter]?.status === 'complete'){
    console.log('PAUSED AFTER: ' + stopAfter);
    break;
  }
}

console.log('\nStarBlox same-day pipeline');
console.log('status: ' + state.status);
console.log('completed: ' + state.completedStages.length + '/' + plan.stages.length);
if(stopAfter && state.stages?.[stopAfter]?.status === 'complete' && state.status !== 'complete'){
  console.log('paused after: ' + stopAfter);
  console.log('resume: npm run same-day:pipeline -- --manifest ' + manifestPath + ' --resume');
}
if(
  stopAfter &&
  state.stages?.[stopAfter]?.status !== 'complete' &&
  !process.exitCode
){
  throw new Error(
    'pipeline stopped before requested --stop-after stage completed: ' + stopAfter
  );
}
console.log('state: ' + statePath);
console.log('plan: ' + planPath);