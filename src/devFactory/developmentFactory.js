
import { stableHash } from '../domainSchemas.js';
import { sanitizeDiagnosticValue } from '../observability/sessionDiagnostics.js';
import { assessStudioToolCall } from './studioToolContract.js';
import {
  executeStudioActionBatch,
  rollbackStudioActionBatch
} from './transactionalStudio.js';

export const DEVELOPMENT_RUN_SCHEMA_VERSION=1;
export const DEVELOPMENT_RUN_VERSION='starblox-ai-dev-run-v1';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function requireString(value,label){
  if(typeof value !== 'string' || !value.trim()){
    throw new TypeError(label + ' must be a non-empty string.');
  }
  return value.trim();
}

function iso(value,label){
  const date=value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) throw new TypeError(label + ' must be a valid date/time.');
  return date.toISOString();
}

function truncate(value,max=400){
  const text=String(value ?? '');
  return text.length > max ? text.slice(0,max - 1) + '…' : text;
}

function sanitizedResult(result){
  if(result === undefined) return null;
  if(result == null || typeof result !== 'object'){
    return sanitizeDiagnosticValue(result);
  }
  if(Array.isArray(result)) return result.slice(0,50).map(sanitizedResult);

  const out={};
  for(const [key,value] of Object.entries(result)){
    if(value === undefined) continue;
    const lower=key.toLowerCase();
    if(
      lower === 'source' ||
      lower.includes('base64') ||
      lower === 'datab64' ||
      lower === 'pixels' ||
      lower === 'image' ||
      lower === 'raw'
    ){
      out[key + 'Hash']=stableHash(value);
      continue;
    }
    if(typeof value === 'string') out[key]=truncate(value,500);
    else if(value && typeof value === 'object') out[key]=sanitizedResult(value);
    else out[key]=value;
  }
  return JSON.parse(JSON.stringify(sanitizeDiagnosticValue(out)));
}

async function executeReadCall(studio,call,{stage='inspect',safety={}}={}){
  const assessment=assessStudioToolCall(call,{stage,...safety});
  if(!assessment.ok){
    throw new Error(
      'Studio tool rejected: ' + call.tool + ' — ' + assessment.errors.join('; ')
    );
  }
  const result=await studio.call(call.tool,clone(call.args || {}));
  return result;
}

async function executeReadCalls(studio,calls,options={}){
  const results=[];
  for(const call of calls || []){
    try{
      const result=await executeReadCall(studio,call,options);
      results.push({call:clone(call),ok:true,result});
    }catch(error){
      results.push({
        call:clone(call),
        ok:false,
        error:error instanceof Error ? error.message : String(error)
      });
    }
  }
  return results;
}

function defaultInspectionCalls(task){
  const query=typeof task.searchQuery === 'string' && task.searchQuery.trim()
    ? task.searchQuery.trim()
    : undefined;
  return [
    {
      tool:'search_tree',
      args:{query,limit:100}
    },
    {
      tool:'read_all_scripts',
      args:{maxBytes:120_000}
    }
  ];
}

function normalizePlan(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError('planner must return a plan object.');
  }
  return {
    summary:requireString(raw.summary || 'Development plan','plan.summary'),
    inspectionCalls:Array.isArray(raw.inspectionCalls) ? clone(raw.inspectionCalls) : [],
    tests:{
      required:raw.tests?.required !== false,
      path:typeof raw.tests?.path === 'string' ? raw.tests.path : undefined
    },
    playtest:{
      required:Boolean(raw.playtest?.required),
      episodeArgs:raw.playtest?.episodeArgs && typeof raw.playtest.episodeArgs === 'object'
        ? clone(raw.playtest.episodeArgs)
        : {mode:'play'},
      inputActions:Array.isArray(raw.playtest?.inputActions)
        ? clone(raw.playtest.inputActions)
        : [],
      assertions:Array.isArray(raw.playtest?.assertions)
        ? raw.playtest.assertions
          .filter(item => item && typeof item === 'object')
          .map(item => ({name:String(item.name || ''),expr:String(item.expr || '')}))
          .filter(item => item.name && item.expr)
          .slice(0,50)
        : [],
      telemetryDomains:Array.isArray(raw.playtest?.telemetryDomains)
        ? raw.playtest.telemetryDomains.map(String).slice(0,10)
        : ['players','world','runtime']
    },
    visual:{
      required:Boolean(raw.visual?.required)
    },
    acceptance:Array.isArray(raw.acceptance)
      ? raw.acceptance.map(value => String(value)).slice(0,50)
      : []
  };
}

function normalizeActionSet(raw,label){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    throw new TypeError(label + ' must return an object.');
  }
  const actions=Array.isArray(raw.actions) ? clone(raw.actions) : [];
  return {
    summary:typeof raw.summary === 'string' ? raw.summary : '',
    actions
  };
}

function testsPassed(result){
  if(!result || typeof result !== 'object') return false;
  const failed=Number(result.failed ?? result.failureCount ?? 0);
  const total=Number(result.total ?? ((result.passed ?? 0) + failed));
  return Number.isFinite(failed) && failed === 0 && Number.isFinite(total) && total > 0;
}

function logsHaveErrors(result){
  const logs=Array.isArray(result?.logs) ? result.logs : [];
  return logs.some(row =>
    String(row?.type || '').toLowerCase() === 'error' ||
    /\berror\b|traceback|stack trace|attempt to/i.test(String(row?.message || ''))
  );
}

function episodePassed(result){
  if(!result || typeof result !== 'object') return false;
  if(result.verdict != null) return result.verdict === 'pass' || result.verdict === 'verified';
  return result.ok === true;
}

async function gatherRuntimeEvidence(studio,plan,{safety={}}={}){
  const evidence={
    required:plan.playtest.required,
    available:true,
    method:null,
    episode:null,
    runState:null,
    input:null,
    logs:null,
    screenshot:null,
    errors:[]
  };

  if(!plan.playtest.required && !plan.visual.required){
    return {evidence,visualCapture:null};
  }

  let visualCapture=null;

  if(plan.playtest.required){
    if(typeof studio.has === 'function' && studio.has('run_playtest_episode')){
      evidence.method='episode';
      try{
        evidence.episode=await executeReadCall(
          studio,
          {tool:'run_playtest_episode',args:plan.playtest.episodeArgs},
          {stage:'test',safety}
        );
        if(!episodePassed(evidence.episode)){
          evidence.errors.push('playtest episode did not pass');
        }
      }catch(error){
        evidence.available=false;
        evidence.errors.push(error instanceof Error ? error.message : String(error));
      }
    }else{
      evidence.method='live';
      let startedByFactory=false;
      try{
        evidence.runState=await executeReadCall(
          studio,
          {tool:'get_run_state',args:{}},
          {stage:'test',safety}
        );

        if(!evidence.runState?.running && typeof studio.has === 'function' && studio.has('start_playtest')){
          await executeReadCall(
            studio,
            {tool:'start_playtest',args:{mode:'play'}},
            {stage:'test',safety}
          );
          startedByFactory=true;
          evidence.runState=await executeReadCall(
            studio,
            {tool:'get_run_state',args:{}},
            {stage:'test',safety}
          );
        }

        if(!evidence.runState?.running){
          evidence.available=false;
          evidence.errors.push('required playtest is not running and adapter cannot start an episode');
        }else{
          if(plan.playtest.inputActions.length){
            evidence.input=await executeReadCall(
              studio,
              {tool:'simulate_input',args:{actions:plan.playtest.inputActions}},
              {stage:'test',safety}
            );
          }

          if(typeof studio.has === 'function' && studio.has('playtest_sample_state')){
            evidence.telemetry=await executeReadCall(
              studio,
              {tool:'playtest_sample_state',args:{domains:plan.playtest.telemetryDomains}},
              {stage:'test',safety}
            );
          }

          if(plan.playtest.assertions.length){
            if(typeof studio.has === 'function' && studio.has('run_gameplay_assertions')){
              evidence.assertions=await executeReadCall(
                studio,
                {tool:'run_gameplay_assertions',args:{assertions:plan.playtest.assertions,target:'server'}},
                {stage:'test',safety}
              );
              if(evidence.assertions?.allPassed !== true){
                evidence.errors.push('gameplay assertions failed');
              }
            }else{
              evidence.errors.push('gameplay assertions required but adapter does not support them');
            }
          }

          evidence.logs=await executeReadCall(
            studio,
            {tool:'get_logs',args:{filter:'errors',limit:200}},
            {stage:'test',safety}
          );
          if(logsHaveErrors(evidence.logs)){
            evidence.errors.push('runtime error logs detected');
          }
        }
      }catch(error){
        evidence.available=false;
        evidence.errors.push(error instanceof Error ? error.message : String(error));
      }finally{
        if(startedByFactory && typeof studio.has === 'function' && studio.has('stop_playtest')){
          try{
            await executeReadCall(
              studio,
              {tool:'stop_playtest',args:{}},
              {stage:'test',safety}
            );
          }catch(error){
            evidence.errors.push('factory-started playtest could not stop: ' + (error instanceof Error ? error.message : String(error)));
          }
        }
      }
    }
  }

  if(plan.visual.required){
    try{
      const capture=await executeReadCall(
        studio,
        {tool:'capture_viewport',args:{}},
        {stage:'review',safety}
      );
      visualCapture=capture;
      evidence.screenshot={
        captured:true,
        width:Number(capture?.width) || null,
        height:Number(capture?.height) || null,
        artifactHash:stableHash(capture)
      };
    }catch(error){
      evidence.errors.push(
        'visual capture failed: ' + (error instanceof Error ? error.message : String(error))
      );
    }
  }

  return {evidence,visualCapture};
}

function normalizeVisualReview(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    return {ok:false,findings:['visual reviewer returned invalid result'],summary:''};
  }
  return {
    ok:raw.ok === true,
    findings:Array.isArray(raw.findings) ? raw.findings.map(String).slice(0,50) : [],
    summary:typeof raw.summary === 'string' ? raw.summary : ''
  };
}

async function runVerificationCycle({
  studio,
  plan,
  repositoryGate,
  safety,
  visualReviewer=null
}){
  let studioTests=null;
  const errors=[];

  if(plan.tests.required){
    try{
      studioTests=await executeReadCall(
        studio,
        {tool:'run_tests',args:plan.tests.path ? {path:plan.tests.path} : {}},
        {stage:'test',safety}
      );
      if(!testsPassed(studioTests)){
        errors.push('Studio tests failed');
      }
    }catch(error){
      errors.push('Studio tests could not run: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  let logs=null;
  try{
    logs=await executeReadCall(
      studio,
      {tool:'get_logs',args:{filter:'errors',limit:200}},
      {stage:'test',safety}
    );
    if(logsHaveErrors(logs)) errors.push('Studio error logs detected');
  }catch(error){
    errors.push('Studio logs unavailable: ' + (error instanceof Error ? error.message : String(error)));
  }

  const runtimeResult=await gatherRuntimeEvidence(studio,plan,{safety});
  const runtime=runtimeResult.evidence;
  errors.push(...runtime.errors);

  let visualReview=null;
  if(plan.visual.required){
    if(!runtimeResult.visualCapture){
      errors.push('visual review required but no viewport capture is available');
    }else if(typeof visualReviewer !== 'function'){
      errors.push('visual review required but no agents.visualReview hook is available');
    }else{
      try{
        visualReview=normalizeVisualReview(await visualReviewer({
          capture:runtimeResult.visualCapture,
          screenshot:clone(runtime.screenshot),
          acceptance:clone(plan.acceptance)
        }));
        if(!visualReview.ok){
          errors.push('visual reviewer rejected the captured viewport');
        }
      }catch(error){
        visualReview={
          ok:false,
          findings:[error instanceof Error ? error.message : String(error)],
          summary:''
        };
        errors.push('visual review errored: ' + visualReview.findings[0]);
      }
    }
  }

  let repository=null;
  if(repositoryGate && typeof repositoryGate.run === 'function'){
    try{
      repository=await repositoryGate.run();
      if(repository?.ok !== true){
        errors.push('repository gates failed');
      }
    }catch(error){
      errors.push('repository gates errored: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  return {
    ok:errors.length === 0,
    studioTests,
    logs,
    runtime,
    visualReview,
    repository,
    errors
  };
}

function reviewerVerdict(raw){
  if(!raw || typeof raw !== 'object' || Array.isArray(raw)){
    return {verdict:'repair',findings:['reviewer returned invalid result']};
  }
  const verdict=['pass','repair','fail'].includes(raw.verdict)
    ? raw.verdict
    : 'repair';
  return {
    verdict,
    findings:Array.isArray(raw.findings) ? raw.findings.map(String).slice(0,50) : [],
    summary:typeof raw.summary === 'string' ? raw.summary : ''
  };
}

function artifactPayload(run){
  return {
    schemaVersion:run.schemaVersion,
    developmentRunVersion:run.developmentRunVersion,
    runId:run.runId,
    task:run.task,
    startedAt:run.startedAt,
    status:run.status,
    plan:run.plan,
    cycles:run.cycles,
    finalReview:run.finalReview,
    rollback:run.rollback,
    repository:run.repository
  };
}

export async function runDevelopmentFactory({
  task,
  studio,
  agents,
  repositoryGate=null,
  startedAt,
  config={}
}){
  if(!studio || typeof studio.call !== 'function'){
    throw new TypeError('studio.call must be provided.');
  }
  if(!agents || typeof agents.plan !== 'function' || typeof agents.code !== 'function' || typeof agents.review !== 'function'){
    throw new TypeError('agents.plan, agents.code and agents.review are required.');
  }

  const normalizedTask={
    id:requireString(task?.id || 'starblox-task','task.id'),
    request:requireString(task?.request,'task.request'),
    searchQuery:typeof task?.searchQuery === 'string' ? task.searchQuery : '',
    inspectCalls:Array.isArray(task?.inspectCalls) ? clone(task.inspectCalls) : []
  };
  const start=iso(startedAt,'startedAt');
  const runId='devrun-' + stableHash({task:normalizedTask,startedAt:start}).split(':')[1];
  const maxRepairCycles=Math.max(0,Math.min(5,Number(config.maxRepairCycles ?? 2)));
  const maxTotalMutationCalls=Math.max(1,Math.min(500,Number(config.maxTotalMutationCalls ?? 120)));
  const maxToolCallsPerBatch=Math.max(1,Math.min(100,Number(config.maxToolCallsPerBatch ?? 50)));
  let totalMutationCalls=0;
  const safety={
    allowDestructive:Boolean(config.allowDestructive),
    allowExecuteLuau:Boolean(config.allowExecuteLuau),
    confirmed:Boolean(config.confirmed),
    maxScriptSize:Number(config.maxScriptSize ?? 200_000),
    maxInputActions:Number(config.maxInputActions ?? 200)
  };

  const audit=[];
  const batches=[];

  const initialInspection=await executeReadCalls(
    studio,
    normalizedTask.inspectCalls.length
      ? normalizedTask.inspectCalls
      : defaultInspectionCalls(normalizedTask),
    {stage:'inspect',safety}
  );

  audit.push({
    stage:'inspect',
    calls:initialInspection.map(row => ({
      tool:row.call.tool,
      ok:row.ok,
      result:row.ok ? sanitizedResult(row.result) : undefined,
      error:row.error
    }))
  });

  const plan=normalizePlan(await agents.plan({
    task:clone(normalizedTask),
    inspection:initialInspection.map(row => ({
      call:row.call,
      ok:row.ok,
      result:row.result,
      error:row.error
    }))
  }));

  const extraInspection=await executeReadCalls(
    studio,
    plan.inspectionCalls,
    {stage:'inspect',safety}
  );

  audit.push({
    stage:'plan',
    summary:plan.summary,
    extraInspection:extraInspection.map(row => ({
      tool:row.call.tool,
      ok:row.ok,
      result:row.ok ? sanitizedResult(row.result) : undefined,
      error:row.error
    }))
  });

  let actionSet=normalizeActionSet(await agents.code({
    task:clone(normalizedTask),
    plan:clone(plan),
    inspection:[
      ...initialInspection,
      ...extraInspection
    ]
  }),'coder');

  let finalReview=null;
  let finalVerification=null;
  let status='failed';

  for(let cycle=0;cycle<=maxRepairCycles;cycle++){
    const stage=cycle === 0 ? 'code' : 'repair';
    totalMutationCalls+=actionSet.actions.length;
    if(totalMutationCalls > maxTotalMutationCalls){
      finalReview={
        verdict:'fail',
        findings:['development run exceeded the total mutation budget of ' + maxTotalMutationCalls]
      };
      status='failed';
      break;
    }

    const batch=await executeStudioActionBatch({
      studio,
      calls:actionSet.actions,
      stage,
      atomic:true,
      confirmed:safety.confirmed,
      safety,
      maxToolCallsPerBatch,
      allowUnrollbackable:Boolean(config.allowUnrollbackable)
    });
    batches.push(batch);

    audit.push({
      stage,
      cycle,
      summary:actionSet.summary,
      actionCount:actionSet.actions.length,
      actionHash:stableHash(actionSet.actions),
      batch:sanitizedResult(batch)
    });

    if(!batch.ok){
      status=batch.partial ? 'rollback_incomplete' : 'failed';
      finalReview={
        verdict:'fail',
        findings:['Studio mutation batch failed before verification']
      };
      break;
    }

    const verification=await runVerificationCycle({
      studio,
      plan,
      repositoryGate,
      safety,
      visualReviewer:typeof agents.visualReview === 'function' ? agents.visualReview : null
    });
    finalVerification=verification;

    audit.push({
      stage:'verify',
      cycle,
      evidence:sanitizedResult(verification)
    });

    const review=reviewerVerdict(await agents.review({
      task:clone(normalizedTask),
      plan:clone(plan),
      cycle,
      verification:clone(verification),
      changeReceipts:clone(batch.receipts)
    }));

    finalReview=review;
    audit.push({
      stage:'review',
      cycle,
      review:clone(review)
    });

    if(review.verdict === 'pass' && verification.ok){
      status='verified';
      break;
    }

    if(review.verdict === 'fail'){
      status='failed';
      break;
    }

    if(cycle >= maxRepairCycles || typeof agents.repair !== 'function'){
      status='failed';
      break;
    }

    actionSet=normalizeActionSet(await agents.repair({
      task:clone(normalizedTask),
      plan:clone(plan),
      cycle,
      review:clone(review),
      verification:clone(verification)
    }),'repair');
  }

  const rollback={
    attempted:false,
    ok:true,
    failures:[]
  };

  if(status !== 'verified' && config.keepFailedChanges !== true){
    rollback.attempted=true;
    for(const batch of [...batches].reverse()){
      if(!batch?.rollbackPlan?.length) continue;
      const result=await rollbackStudioActionBatch(studio,batch);
      if(!result.ok){
        rollback.ok=false;
        rollback.failures.push(...result.failures);
      }
    }
    if(!rollback.ok) status='rollback_incomplete';
  }

  const cycles=audit.map(item => sanitizedResult(item));
  const base={
    schemaVersion:DEVELOPMENT_RUN_SCHEMA_VERSION,
    developmentRunVersion:DEVELOPMENT_RUN_VERSION,
    runId,
    task:normalizedTask,
    startedAt:start,
    status,
    plan:sanitizedResult(plan),
    cycles,
    finalReview:sanitizedResult(finalReview),
    rollback:sanitizedResult(rollback),
    repository:sanitizedResult(finalVerification?.repository ?? null)
  };

  return deepFreeze({
    ...base,
    runHash:stableHash(artifactPayload(base))
  });
}

export function verifyDevelopmentRun(run){
  const errors=[];
  if(!run || typeof run !== 'object' || Array.isArray(run)){
    return {ok:false,errors:['run must be an object']};
  }
  if(run.schemaVersion !== DEVELOPMENT_RUN_SCHEMA_VERSION){
    errors.push('unsupported development run schema');
  }
  if(run.developmentRunVersion !== DEVELOPMENT_RUN_VERSION){
    errors.push('unsupported development run version');
  }
  if(!['verified','failed','rollback_incomplete'].includes(run.status)){
    errors.push('invalid development run status');
  }
  try{
    if(stableHash(artifactPayload(run)) !== run.runHash){
      errors.push('development run hash mismatch');
    }
  }catch{
    errors.push('development run is not hashable');
  }
  return {ok:errors.length === 0,errors};
}
