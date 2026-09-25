import { stableHash } from '../domainSchemas.js';

export const SAME_DAY_PIPELINE_SCHEMA_VERSION=1;
export const SAME_DAY_PIPELINE_VERSION='starblox-same-day-pipeline-v1';

const REQUIRED_GATES=Object.freeze(['mobile','security','performance']);

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function plain(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function safeId(value,label){
  const id=requiredString(value,label);
  if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(id)){
    throw new TypeError(label + ' must match /^[a-z0-9][a-z0-9-]{1,62}$/');
  }
  return id;
}

function normalizeSource(raw,label,role){
  if(!plain(raw)) throw new TypeError(label + ' must be an object.');
  let download=null;
  if(raw.download != null){
    if(!plain(raw.download)) throw new TypeError(label + '.download must be an object.');
    const url=requiredString(raw.download.url,label + '.download.url');
    if(!/^https:\/\//i.test(url)){
      throw new TypeError(label + '.download.url must use https');
    }
    const sha256=requiredString(raw.download.sha256,label + '.download.sha256').toLowerCase();
    if(!/^[a-f0-9]{64}$/.test(sha256)){
      throw new TypeError(label + '.download.sha256 must be an exact SHA-256');
    }
    const bytes=Number(raw.download.bytes);
    if(!Number.isInteger(bytes) || bytes < 1){
      throw new TypeError(label + '.download.bytes must be a positive integer');
    }
    download={url,sha256,bytes};
  }
  return {
    id:safeId(raw.id,label + '.id'),
    role,
    sourceId:requiredString(raw.sourceId || raw.id,label + '.sourceId'),
    input:requiredString(raw.input,label + '.input'),
    download,
    migrationRules:typeof raw.migrationRules === 'string' && raw.migrationRules.trim()
      ? raw.migrationRules.trim()
      : null,
    request:typeof raw.request === 'string' && raw.request.trim()
      ? raw.request.trim()
      : 'Adapt the verified migrated ' + role + ' systems behind StarBlox authority boundaries.',
    required:raw.required !== false
  };
}

function normalizeGate(raw,name){
  if(!plain(raw)) throw new TypeError('gates.' + name + ' must be an object.');
  const command=requiredString(raw.command,'gates.' + name + '.command');
  const args=Array.isArray(raw.args) ? raw.args.map(String) : [];
  const joined=[command,...args].join(' ').toLowerCase();
  if(/\bpublish\b|open[- ]?cloud.*(write|create|update|delete)/i.test(joined)){
    throw new TypeError('gates.' + name + ' may not publish or mutate production Open Cloud state.');
  }
  return {
    id:name,
    command,
    args,
    required:true
  };
}

function stage(id,type,dependsOn,details={}){
  return {
    id,
    type,
    dependsOn:[...dependsOn],
    details:clone(details),
    autoPublish:false
  };
}

export function normalizeSameDayPipelineManifest(input){
  if(!plain(input)) throw new TypeError('manifest must be an object.');
  if(input.schemaVersion !== SAME_DAY_PIPELINE_SCHEMA_VERSION){
    throw new TypeError('manifest.schemaVersion must be 1.');
  }

  const authorizedWorld=normalizeSource(input.authorizedWorld,'authorizedWorld','authorized-world');
  const donors=Array.isArray(input.donors)
    ? input.donors.map((row,index)=>normalizeSource(row,'donors[' + index + ']','donor'))
    : [];

  const integrationTasks=Array.isArray(input.integrationTasks)
    ? input.integrationTasks.map((row,index)=>{
      if(!plain(row)) throw new TypeError('integrationTasks[' + index + '] must be an object.');
      const repository=typeof row.repository === 'string' && row.repository.trim()
        ? row.repository.trim()
        : null;
      const commit=typeof row.commit === 'string' && row.commit.trim()
        ? row.commit.trim().toLowerCase()
        : null;
      const checkout=typeof row.checkout === 'string' && row.checkout.trim()
        ? row.checkout.trim()
        : null;
      const checkoutConfigured=Boolean(repository || commit || checkout);
      if(checkoutConfigured){
        if(!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)){
          throw new TypeError('integrationTasks[' + index + '].repository must be owner/repo');
        }
        if(!commit || !/^[a-f0-9]{40}$/.test(commit)){
          throw new TypeError('integrationTasks[' + index + '].commit must be an exact 40-character Git SHA');
        }
        if(!checkout) throw new TypeError('integrationTasks[' + index + '].checkout is required');
      }
      return {
        id:safeId(row.id,'integrationTasks[' + index + '].id'),
        taskFile:requiredString(row.taskFile,'integrationTasks[' + index + '].taskFile'),
        purpose:typeof row.purpose === 'string' && row.purpose.trim()
          ? row.purpose.trim()
          : 'authorized-code-donor-integration',
        repository,
        commit,
        checkout
      };
    })
    : [];

  const ids=[
    authorizedWorld.id,
    ...donors.map(row=>row.id),
    ...integrationTasks.map(row=>row.id)
  ];
  if(new Set(ids).size !== ids.length){
    throw new TypeError('authorizedWorld, donors and integrationTasks must use unique ids.');
  }

  const factoryAdapter=requiredString(input.factoryAdapter,'factoryAdapter');
  const questMasteryTask=requiredString(input.questMasteryTask,'questMasteryTask');
  const integratedVerificationTask=requiredString(
    input.integratedVerificationTask,
    'integratedVerificationTask'
  );

  if(!plain(input.gates)) throw new TypeError('gates must be an object.');
  const gates={};
  for(const name of REQUIRED_GATES){
    gates[name]=normalizeGate(input.gates[name],name);
  }

  return {
    schemaVersion:SAME_DAY_PIPELINE_SCHEMA_VERSION,
    version:SAME_DAY_PIPELINE_VERSION,
    runName:requiredString(input.runName || 'same-day-starblox','runName'),
    outputDir:typeof input.outputDir === 'string' && input.outputDir.trim()
      ? input.outputDir.trim()
      : 'artifacts/same-day-starblox',
    factoryAdapter,
    maxRepairCycles:Number.isInteger(input.maxRepairCycles) && input.maxRepairCycles >= 0
      ? Math.min(input.maxRepairCycles,3)
      : 2,
    maxParallel:Number.isInteger(input.maxParallel) && input.maxParallel > 0
      ? Math.min(input.maxParallel,8)
      : 4,
    rojoCommand:typeof input.rojoCommand === 'string' && input.rojoCommand.trim()
      ? input.rojoCommand.trim()
      : 'rojo',
    authorizedWorld,
    donors,
    integrationTasks,
    questMasteryTask,
    integratedVerificationTask,
    gates
  };
}

export function buildSameDayPipelinePlan(input){
  const manifest=normalizeSameDayPipelineManifest(input);
  const stages=[];
  const sources=[manifest.authorizedWorld,...manifest.donors];
  const exportIds=[];
  const adaptRows=[];

  for(const source of sources){
    const ingestId='ingest-' + source.id;
    const planId='plan-' + source.id;
    const exportId='export-' + source.id;
    const adaptId='adapt-' + source.id;

    stages.push(stage(ingestId,'source-ingest',[],{source}));
    stages.push(stage(planId,'migration-plan',[ingestId],{sourceId:source.id}));
    stages.push(stage(exportId,'migration-export',[planId],{sourceId:source.id}));
    exportIds.push(exportId);
    adaptRows.push({source,exportId,adaptId});
  }

  const checkoutStages=new Map();
  for(const task of manifest.integrationTasks){
    if(!task.repository) continue;
    const id='checkout-' + task.id;
    checkoutStages.set(task.id,id);
    stages.push(stage(id,'code-donor-checkout',[],{
      id:task.id,
      repository:task.repository,
      commit:task.commit,
      checkout:task.checkout
    }));
  }

  stages.push(stage('build-staging-place','staging-project',exportIds,{
    sourceIds:sources.map(row=>row.id),
    rojoCommand:manifest.rojoCommand
  }));
  stages.push(stage('verify-studio-staging','studio-check',['build-staging-place'],{
    expectedRoot:'StarBloxImported'
  }));

  let tail=['verify-studio-staging'];
  for(const row of adaptRows){
    stages.push(stage(row.adaptId,'factory-adapt',[...tail,row.exportId],{
      sourceId:row.source.id,
      request:row.source.request,
      maxRepairCycles:manifest.maxRepairCycles
    }));
    tail=[row.adaptId];
  }

  for(const task of manifest.integrationTasks){
    const id='integrate-' + task.id;