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
  return {
    id:safeId(raw.id,label + '.id'),
    role,
    sourceId:requiredString(raw.sourceId || raw.id,label + '.sourceId'),
    input:requiredString(raw.input,label + '.input'),
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
      return {
        id:safeId(row.id,'integrationTasks[' + index + '].id'),
        taskFile:requiredString(row.taskFile,'integrationTasks[' + index + '].taskFile'),
        purpose:typeof row.purpose === 'string' && row.purpose.trim()
          ? row.purpose.trim()
          : 'authorized-code-donor-integration'
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
    stages.push(stage(id,'factory-task',tail,{
      taskFile:task.taskFile,
      purpose:task.purpose
    }));
    tail=[id];
  }

  const questId='wire-quest-mastery';
  stages.push(stage(questId,'factory-task',tail,{
    taskFile:manifest.questMasteryTask,
    purpose:'quest-mastery-wiring'
  }));

  const integratedId='verify-integrated-slice';
  stages.push(stage(integratedId,'factory-task',[questId],{
    taskFile:manifest.integratedVerificationTask,
    purpose:'studio-build-playtest-visual-log-review-repair'
  }));

  const gateIds=[];
  for(const gateName of REQUIRED_GATES){
    const id='gate-' + gateName;
    gateIds.push(id);
    stages.push(stage(id,'release-gate',[integratedId],{
      gate:manifest.gates[gateName]
    }));
  }

  stages.push(stage('finalize-same-day-slice','finalize',gateIds,{
    requiredGates:[...REQUIRED_GATES],
    publicationAllowed:false
  }));

  const payload={
    schemaVersion:SAME_DAY_PIPELINE_SCHEMA_VERSION,
    version:SAME_DAY_PIPELINE_VERSION,
    runName:manifest.runName,
    outputDir:manifest.outputDir,
    factoryAdapter:manifest.factoryAdapter,
    maxRepairCycles:manifest.maxRepairCycles,
    rojoCommand:manifest.rojoCommand,
    sourceIds:[manifest.authorizedWorld.id,...manifest.donors.map(row=>row.id)],
    integrationTaskIds:manifest.integrationTasks.map(row=>row.id),
    stages
  };

  const plan={
    ...payload,
    planHash:stableHash(payload)
  };

  const validation=verifySameDayPipelinePlan(plan);
  if(!validation.ok){
    throw new Error('generated invalid same-day pipeline plan: ' + validation.errors.join('; '));
  }
  return plan;
}

export function verifySameDayPipelinePlan(plan){
  const errors=[];
  if(!plain(plan)) return {ok:false,errors:['plan must be an object']};
  if(plan.schemaVersion !== SAME_DAY_PIPELINE_SCHEMA_VERSION) errors.push('schemaVersion mismatch');
  if(plan.version !== SAME_DAY_PIPELINE_VERSION) errors.push('version mismatch');
  if(!Array.isArray(plan.stages) || !plan.stages.length) errors.push('stages are required');

  const stages=Array.isArray(plan.stages) ? plan.stages : [];
  const ids=stages.map(row=>row?.id).filter(Boolean);
  if(new Set(ids).size !== ids.length) errors.push('stage ids must be unique');

  const seen=new Set();
  for(const row of stages){
    if(!row || typeof row.id !== 'string') continue;
    if(row.autoPublish !== false) errors.push(row.id + ' must set autoPublish=false');
    for(const dependency of row.dependsOn || []){
      if(!seen.has(dependency)){
        errors.push(row.id + ' depends on missing or later stage ' + dependency);
      }
    }
    const serialized=JSON.stringify(row).toLowerCase();
    if(/"publicationallowed":true|"autopublish":true/.test(serialized)){
      errors.push(row.id + ' enables publication');
    }
    seen.add(row.id);
  }

  for(const name of REQUIRED_GATES){
    if(!ids.includes('gate-' + name)) errors.push('missing ' + name + ' release gate');
  }

  const final=stages.find(row=>row.id === 'finalize-same-day-slice');
  if(!final) errors.push('missing finalization stage');
  else{
    const required=new Set(REQUIRED_GATES.map(name=>'gate-' + name));
    for(const id of required){
      if(!(final.dependsOn || []).includes(id)) errors.push('finalization does not depend on ' + id);
    }
    if(final.details?.publicationAllowed !== false){
      errors.push('finalization must keep publication disabled');
    }
  }

  if(typeof plan.planHash === 'string'){
    const {planHash,...payload}=plan;
    if(stableHash(payload) !== planHash) errors.push('planHash mismatch');
  }else{
    errors.push('planHash is required');
  }

  return {ok:errors.length === 0,errors};
}

export function createSameDayPipelineState(plan){
  const validation=verifySameDayPipelinePlan(plan);
  if(!validation.ok) throw new Error('cannot create state for invalid plan: ' + validation.errors.join('; '));
  return {
    schemaVersion:1,
    version:'starblox-same-day-pipeline-state-v1',
    planHash:plan.planHash,
    status:'ready',
    completedStages:[],
    stages:Object.fromEntries(plan.stages.map(row=>[
      row.id,
      {
        status:'pending',
        stageHash:stableHash(row),
        attemptCount:0,
        result:null
      }
    ]))
  };
}

export function recordSameDayStageResult(state,plan,stageId,result){
  if(!plain(state)) throw new TypeError('state must be an object.');
  if(state.planHash !== plan.planHash) throw new Error('state planHash does not match plan');
  const stage=plan.stages.find(row=>row.id === stageId);
  if(!stage) throw new Error('unknown stage: ' + stageId);
  const current=state.stages?.[stageId];
  if(!current) throw new Error('state is missing stage: ' + stageId);

  for(const dependency of stage.dependsOn){
    if(state.stages?.[dependency]?.status !== 'complete'){
      throw new Error(stageId + ' cannot complete before dependency ' + dependency);
    }
  }

  current.attemptCount=Number(current.attemptCount || 0) + 1;
  current.result=clone(result || {});
  current.status=result?.ok === true ? 'complete' : 'failed';

  if(current.status === 'complete'){
    if(!state.completedStages.includes(stageId)) state.completedStages.push(stageId);
    state.status=stageId === 'finalize-same-day-slice' ? 'complete' : 'running';
  }else{
    state.status='blocked';
  }

  return state;
}

export function nextSameDayPipelineStage(state,plan){
  if(state.planHash !== plan.planHash) throw new Error('state planHash does not match plan');
  for(const row of plan.stages){
    const status=state.stages?.[row.id]?.status;
    if(status === 'complete') continue;
    const ready=row.dependsOn.every(id=>state.stages?.[id]?.status === 'complete');
    if(ready) return row;
  }
  return null;
}