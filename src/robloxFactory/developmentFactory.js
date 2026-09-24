
import { stableHash } from '../domainSchemas.js';

export const DEVELOPMENT_FACTORY_VERSION='starblox-studio-factory-v1';

export const SAFE_STUDIO_TOOLS=Object.freeze([
  'inspect_snapshot',
  'search_tree',
  'inspect_instance',
  'read_script',
  'script_grep',
  'dry_run_mutation_plan',
  'apply_mutation_plan',
  'rollback_mutation_plan',
  'run_tests',
  'get_run_state',
  'simulate_input',
  'get_logs',
  'capture_viewport'
]);

export const MUTATION_OPERATIONS=Object.freeze([
  'write_script',
  'edit_script',
  'create_instance',
  'delete_instance',
  'set_property',
  'set_attribute',
  'add_tag',
  'remove_tag'
]);

const FORBIDDEN_OPERATION_RE=/(publish|purchase|spend|robux|monetize|upload|release|deploy|secret|credential|cookie|token|billing)/i;

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value){
  if(!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for(const child of Object.values(value)) deepFreeze(child);
  return value;
}

function string(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label + ' must be a non-empty string.');
  return value.trim();
}

function int(value,label,{min=0,max=Number.MAX_SAFE_INTEGER}={}){
  if(!Number.isInteger(value) || value < min || value > max){
    throw new TypeError(label + ' must be an integer in [' + min + ',' + max + '].');
  }
  return value;
}

function plainObject(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function planPayload(plan){
  return {
    version:plan.version,
    taskId:plan.taskId,
    summary:plan.summary,
    requiresPlaytest:plan.requiresPlaytest,
    operations:plan.operations,
    assertions:plan.assertions
  };
}

function normalizeOperation(raw,index){
  if(!plainObject(raw)) throw new TypeError('operation ' + index + ' must be an object.');
  const op=string(raw.op,'operation.op');
  if(!MUTATION_OPERATIONS.includes(op)){
    if(FORBIDDEN_OPERATION_RE.test(op)){
      throw new Error('forbidden Studio operation: ' + op);
    }
    throw new Error('unsupported Studio mutation operation: ' + op);
  }

  const normalized={
    op,
    path:raw.path == null ? null : string(raw.path,'operation.path'),
    parent:raw.parent == null ? null : string(raw.parent,'operation.parent'),
    className:raw.className == null ? null : string(raw.className,'operation.className'),
    name:raw.name == null ? null : string(raw.name,'operation.name'),
    property:raw.property == null ? null : string(raw.property,'operation.property'),
    value:raw.value === undefined ? null : clone(raw.value),
    old:raw.old == null ? null : String(raw.old),
    new:raw.new == null ? null : String(raw.new),
    attribute:raw.attribute == null ? null : string(raw.attribute,'operation.attribute'),
    tag:raw.tag == null ? null : string(raw.tag,'operation.tag'),
    source:raw.source == null ? null : String(raw.source)
  };

  if(op === 'write_script' && normalized.source == null){
    throw new Error('write_script requires source.');
  }
  if(op === 'edit_script' && (normalized.path == null || normalized.old == null || normalized.new == null)){
    throw new Error('edit_script requires path, old and new.');
  }
  if(op === 'create_instance' && (normalized.parent == null || normalized.className == null)){
    throw new Error('create_instance requires parent and className.');
  }
  if(['delete_instance','set_property','set_attribute','add_tag','remove_tag'].includes(op) && normalized.path == null){
    throw new Error(op + ' requires path.');
  }
  if(op === 'set_property' && normalized.property == null){
    throw new Error('set_property requires property.');
  }
  if(op === 'set_attribute' && normalized.attribute == null){
    throw new Error('set_attribute requires attribute.');
  }
  if(['add_tag','remove_tag'].includes(op) && normalized.tag == null){
    throw new Error(op + ' requires tag.');
  }

  return normalized;
}

function operationRisk(operation){
  if(operation.op === 'delete_instance') return 3;
  if(operation.op === 'write_script' || operation.op === 'edit_script'){
    const source=(operation.source || operation.new || '');
    if(/loadstring|HttpService\s*[:\.]\s*(GetAsync|PostAsync|RequestAsync)|require\s*\(\s*\d{5,}/i.test(source)){
      return 3;
    }
    return 2;
  }
  if(operation.op === 'create_instance') return 1;
  return 1;
}

export function createStudioMutationPlan({
  taskId,
  summary,
  operations,
  assertions=[],
  requiresPlaytest=true
}){
  if(!Array.isArray(operations) || operations.length === 0){
    throw new TypeError('operations must be a non-empty array.');
  }
  const normalizedOps=operations.map(normalizeOperation);
  const normalizedAssertions=(assertions || []).map((raw,index) => {
    if(!plainObject(raw)) throw new TypeError('assertion ' + index + ' must be an object.');
    return {
      id:string(raw.id,'assertion.id'),
      kind:string(raw.kind,'assertion.kind'),
      target:raw.target == null ? null : String(raw.target),
      expected:raw.expected === undefined ? null : clone(raw.expected)
    };
  });

  const base={
    version:DEVELOPMENT_FACTORY_VERSION,
    taskId:string(taskId,'taskId'),
    summary:string(summary,'summary'),
    requiresPlaytest:Boolean(requiresPlaytest),
    operations:normalizedOps,
    assertions:normalizedAssertions
  };
  const maxRisk=Math.max(...normalizedOps.map(operationRisk));
  return deepFreeze({
    ...base,
    operationCount:normalizedOps.length,
    maxRisk,
    planHash:stableHash(planPayload(base))
  });
}

export function verifyStudioMutationPlan(plan){
  const errors=[];
  if(!plainObject(plan)) return {ok:false,errors:['plan must be an object']};
  if(plan.version !== DEVELOPMENT_FACTORY_VERSION) errors.push('unsupported factory version');
  if(!Array.isArray(plan.operations) || plan.operations.length === 0) errors.push('plan has no operations');
  try{
    for(const [index,op] of (plan.operations || []).entries()) normalizeOperation(op,index);
  }catch(error){
    errors.push(error.message);
  }
  try{
    if(stableHash(planPayload(plan)) !== plan.planHash) errors.push('plan hash mismatch');
  }catch{
    errors.push('plan is not hashable');
  }
  return {ok:errors.length === 0,errors};
}

export function requiresHumanApproval(plan,{
  operationThreshold=8,
  riskThreshold=3
}={}){
  const validation=verifyStudioMutationPlan(plan);
  if(!validation.ok) return true;
  return plan.operationCount >= operationThreshold || plan.maxRisk >= riskThreshold;
}

function evidenceDigest(value){
  if(value == null) return null;
  if(typeof value === 'string'){
    return {
      kind:'text',
      size:value.length,
      hash:stableHash(value)
    };
  }
  if(plainObject(value) && typeof value.base64 === 'string'){
    return {
      kind:'image',
      size:value.base64.length,
      mediaType:value.mediaType || null,
      hash:stableHash(value.base64)
    };
  }
  return {
    kind:'json',
    hash:stableHash(value)
  };
}

function normalizeFactoryLimits(raw={}){
  return {
    maxRepairs:int(raw.maxRepairs ?? 2,'maxRepairs',{min:0,max:10}),
    maxOperationsPerPlan:int(raw.maxOperationsPerPlan ?? 50,'maxOperationsPerPlan',{min:1,max:500}),
    maxScreenshots:int(raw.maxScreenshots ?? 4,'maxScreenshots',{min:0,max:20}),
    maxInputActions:int(raw.maxInputActions ?? 40,'maxInputActions',{min:0,max:500}),
    maxLogs:int(raw.maxLogs ?? 200,'maxLogs',{min:1,max:2000})
  };
}

function assertAdapter(adapter){
  const required=[
    'inspectSnapshot',
    'dryRunMutationPlan',
    'applyMutationPlan',
    'rollbackMutationPlan',
    'runTests',
    'getLogs',
    'captureViewport',
    'getRunState'
  ];
  for(const name of required){
    if(typeof adapter?.[name] !== 'function'){
      throw new TypeError('Studio adapter missing ' + name + '().');
    }
  }
}

function assertAgents(agents){
  for(const name of ['plan','code','review','repair']){
    if(typeof agents?.[name] !== 'function'){
      throw new TypeError('factory agents missing ' + name + '().');
    }
  }
}

function normalizedEvaluation(raw){
  const result=plainObject(raw) ? raw : {};
  const assertions=Array.isArray(result.assertions) ? result.assertions : [];
  const failed=assertions.filter(item => item && item.passed === false);
  const tests=result.tests || {};
  const logs=result.logs || {};
  return {
    ok:Boolean(result.ok) && failed.length === 0 && Number(tests.failed || 0) === 0,
    assertions:clone(assertions),
    tests:clone(tests),
    logs:clone(logs),
    reviewer:clone(result.reviewer || {}),
    screenshot:evidenceDigest(result.screenshot)
  };
}

async function collectEvidence({adapter,plan,agents,limits,task,snapshot,receipt,iteration}){
  const tests=await adapter.runTests({task,plan,iteration});
  const runState=await adapter.getRunState();
  let inputResult=null;

  if(plan.requiresPlaytest && runState?.running && typeof adapter.simulateInput === 'function'){
    const proposed=typeof agents.playtest === 'function'
      ? await agents.playtest({task,snapshot,plan,receipt,iteration,runState})
      : {actions:[]};
    const actions=Array.isArray(proposed?.actions)
      ? proposed.actions.slice(0,limits.maxInputActions)
      : [];
    if(actions.length){
      inputResult=await adapter.simulateInput({actions});
    }
  }

  const logs=await adapter.getLogs({filter:'all',limit:limits.maxLogs});
  const screenshot=limits.maxScreenshots > 0
    ? await adapter.captureViewport()
    : null;
  const reviewer=await agents.review({
    task,
    snapshot,
    plan,
    receipt,
    iteration,
    tests,
    logs,
    screenshotDigest:evidenceDigest(screenshot),
    runState,
    inputResult
  });

  const assertions=typeof adapter.runAssertions === 'function'
    ? await adapter.runAssertions({assertions:plan.assertions,task,plan,iteration})
    : [];

  return normalizedEvaluation({
    ok:Boolean(reviewer?.ok !== false),
    assertions,
    tests,
    logs,
    reviewer,
    screenshot
  });
}

export async function runStudioDevelopmentFactory({
  task,
  adapter,
  agents,
  approvePlan,
  limits={}
}){
  assertAdapter(adapter);
  assertAgents(agents);
  const budget=normalizeFactoryLimits(limits);
  const taskId=string(task?.taskId || task?.id || 'studio-task','task.taskId');
  const prompt=string(task?.prompt || task?.description || 'Studio task','task.prompt');

  const snapshot=await adapter.inspectSnapshot({taskId,prompt});
  const planning=await agents.plan({taskId,prompt,snapshot});
  const rawPlan=await agents.code({taskId,prompt,snapshot,planning});
  let plan=createStudioMutationPlan({
    taskId,
    summary:rawPlan.summary || planning.summary || prompt,
    operations:rawPlan.operations,
    assertions:rawPlan.assertions || planning.assertions || [],
    requiresPlaytest:rawPlan.requiresPlaytest !== false
  });

  if(plan.operationCount > budget.maxOperationsPerPlan){
    throw new Error('mutation plan exceeds operation budget.');
  }

  const dryRun=await adapter.dryRunMutationPlan(plan);
  const approvalNeeded=requiresHumanApproval(plan);
  let approved=!approvalNeeded;
  if(typeof approvePlan === 'function'){
    approved=Boolean(await approvePlan({plan,dryRun,approvalNeeded}));
  }
  if(!approved){
    return deepFreeze({
      version:DEVELOPMENT_FACTORY_VERSION,
      taskId,
      status:'awaiting_approval',
      plan,
      dryRun:clone(dryRun),
      progress:{repairAttempts:0}
    });
  }

  const receipts=[];
  let receipt=await adapter.applyMutationPlan(plan);
  receipts.push(clone(receipt));
  let evaluation=await collectEvidence({
    adapter,plan,agents,limits:budget,task:{taskId,prompt},snapshot,receipt,iteration:0
  });

  let repairAttempts=0;
  while(!evaluation.ok && repairAttempts < budget.maxRepairs){
    repairAttempts+=1;
    const repairRaw=await agents.repair({
      taskId,
      prompt,
      snapshot,
      previousPlan:plan,
      previousReceipt:receipt,
      evaluation,
      iteration:repairAttempts
    });
    if(!repairRaw || !Array.isArray(repairRaw.operations) || repairRaw.operations.length === 0){
      break;
    }

    const repairPlan=createStudioMutationPlan({
      taskId:taskId + '-repair-' + repairAttempts,
      summary:repairRaw.summary || ('Repair attempt ' + repairAttempts),
      operations:repairRaw.operations,
      assertions:repairRaw.assertions || plan.assertions,
      requiresPlaytest:repairRaw.requiresPlaytest !== false
    });
    if(repairPlan.operationCount > budget.maxOperationsPerPlan){
      throw new Error('repair mutation plan exceeds operation budget.');
    }

    const repairDryRun=await adapter.dryRunMutationPlan(repairPlan);
    const repairApprovalNeeded=requiresHumanApproval(repairPlan);
    let repairApproved=!repairApprovalNeeded;
    if(typeof approvePlan === 'function'){
      repairApproved=Boolean(await approvePlan({
        plan:repairPlan,
        dryRun:repairDryRun,
        approvalNeeded:repairApprovalNeeded,
        repairAttempt:repairAttempts
      }));
    }
    if(!repairApproved) break;

    receipt=await adapter.applyMutationPlan(repairPlan);
    receipts.push(clone(receipt));
    plan=repairPlan;
    evaluation=await collectEvidence({
      adapter,plan,agents,limits:budget,task:{taskId,prompt},snapshot,receipt,iteration:repairAttempts
    });
  }

  if(!evaluation.ok){
    for(const applied of [...receipts].reverse()){
      await adapter.rollbackMutationPlan(applied.rollback || applied);
    }
  }

  const artifact={
    version:DEVELOPMENT_FACTORY_VERSION,
    taskId,
    status:evaluation.ok ? 'verified' : 'rolled_back',
    snapshotHash:stableHash(snapshot),
    finalPlanHash:plan.planHash,
    receipts:receipts.map(item => ({
      receiptHash:stableHash(item),
      rollbackHash:stableHash(item.rollback || item)
    })),
    evaluation,
    progress:{repairAttempts}
  };

  return deepFreeze({
    ...artifact,
    artifactHash:stableHash(artifact)
  });
}
