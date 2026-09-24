
import {
  assessStudioToolCall,
  studioToolEffect
} from './studioToolContract.js';

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function isWriteEffect(effect){
  return effect === 'write' || effect === 'destructive' || effect === 'execute';
}

function rollbackFromAdapter(result){
  if(!result || typeof result !== 'object') return [];
  if(Array.isArray(result.rollback)){
    return result.rollback
      .filter(item => item && typeof item === 'object' && typeof item.tool === 'string')
      .map(item => ({tool:item.tool,args:clone(item.args || {})}));
  }
  return [];
}

async function backupForCall(studio,call){
  if(call.tool === 'write_script' || call.tool === 'edit_script'){
    try{
      const current=await studio.call('read_script',{path:call.args.path});
      if(current && typeof current.source === 'string'){
        return {
          covered:true,
          calls:[{
            tool:'write_script',
            args:{
              path:call.args.path,
              source:current.source,
              create:true,
              className:current.className
            }
          }]
        };
      }
    }catch{
      if(call.tool === 'write_script' && call.args.create === true){
        return {
          covered:true,
          calls:[{tool:'delete_instance',args:{path:call.args.path}}]
        };
      }
    }
    return {
      covered:false,
      calls:[],
      reason:'could not capture the pre-edit script source'
    };
  }

  if(call.tool === 'set_property'){
    try{
      const current=await studio.call('inspect_instance',{path:call.args.path});
      const properties=current?.properties;
      if(properties && Object.prototype.hasOwnProperty.call(properties,call.args.property)){
        return {
          covered:true,
          calls:[{
            tool:'set_property',
            args:{
              path:call.args.path,
              property:call.args.property,
              value:clone(properties[call.args.property])
            }
          }]
        };
      }
    }catch{}
    return {
      covered:false,
      calls:[],
      reason:'could not capture the pre-edit property value'
    };
  }

  if(call.tool === 'create_instance'){
    return {covered:'deferred',calls:[]};
  }

  return {
    covered:false,
    calls:[],
    reason:'no deterministic rollback strategy exists for this tool'
  };
}

function postRollbackForCall(call,result){
  if(call.tool === 'create_instance'){
    if(result && typeof result.path === 'string' && result.path.trim()){
      return {
        covered:true,
        calls:[{tool:'delete_instance',args:{path:result.path}}]
      };
    }
    return {
      covered:false,
      calls:[],
      reason:'create_instance did not return the created instance path'
    };
  }

  const adapter=rollbackFromAdapter(result);
  return {
    covered:adapter.length > 0,
    calls:adapter
  };
}

async function rollbackCalls(studio,calls){
  const failures=[];
  for(const call of [...calls].reverse()){
    try{
      await studio.call(call.tool,clone(call.args || {}),{rollback:true});
    }catch(error){
      failures.push({
        tool:call.tool,
        args:clone(call.args || {}),
        error:error instanceof Error ? error.message : String(error)
      });
    }
  }
  return failures;
}

export async function executeStudioActionBatch({
  studio,
  calls,
  stage='code',
  atomic=true,
  confirmed=false,
  safety={},
  maxToolCallsPerBatch=50,
  allowUnrollbackable=false
}){
  if(!studio || typeof studio.call !== 'function'){
    throw new TypeError('studio.call must be a function.');
  }
  if(!Array.isArray(calls)) throw new TypeError('calls must be an array.');
  if(calls.length > maxToolCallsPerBatch){
    return {
      ok:false,
      applied:false,
      rolledBack:false,
      rollbackComplete:null,
      partial:false,
      receipts:[],
      failures:[{
        type:'budget',
        errors:['mutation batch exceeds ' + maxToolCallsPerBatch + ' tool calls']
      }],
      rollbackFailures:[]
    };
  }

  const assessments=calls.map(call => ({
    call:clone(call),
    assessment:assessStudioToolCall(call,{
      stage,
      confirmed,
      ...safety
    })
  }));

  const blocked=assessments.filter(row => !row.assessment.ok);
  if(blocked.length){
    return {
      ok:false,
      applied:false,
      rolledBack:false,
      rollbackComplete:null,
      partial:false,
      receipts:[],
      failures:blocked.map(row => ({
        type:'safety',
        tool:row.call.tool,
        errors:row.assessment.errors,
        warnings:row.assessment.warnings
      })),
      rollbackFailures:[]
    };
  }

  const receipts=[];
  const rollback=[];
  const failures=[];
  const preflight=[];

  // Whole-batch checkpoint: capture every reversible pre-state before the
  // first persistent mutation lands. This is the factory's dry-run boundary.
  // If any later operation lacks deterministic rollback coverage, nothing in
  // the batch has been changed yet.
  for(const {call,assessment} of assessments){
    let preRollback={covered:true,calls:[]};
    if(isWriteEffect(assessment.effect)){
      preRollback=await backupForCall(studio,call);
      if(preRollback.covered === false && !allowUnrollbackable){
        failures.push({
          type:'rollback-coverage',
          tool:call.tool,
          error:preRollback.reason || 'mutation has no deterministic rollback coverage'
        });
        return {
          ok:false,
          applied:false,
          rolledBack:false,
          rollbackComplete:null,
          partial:false,
          preflight:preflight.map(row => ({
            tool:row.call.tool,
            effect:row.assessment.effect,
            rollbackCoverage:row.preRollback.covered
          })),
          receipts:[],
          failures,
          rollbackFailures:[]
        };
      }
    }
    preflight.push({call,assessment,preRollback});
  }

  for(const {call,assessment,preRollback} of preflight){
    try{
      const result=await studio.call(call.tool,clone(call.args || {}));
      const postRollback=postRollbackForCall(call,result);
      if(
        call.tool === 'create_instance' &&
        postRollback.covered === false &&
        !allowUnrollbackable
      ){
        failures.push({
          type:'rollback-coverage',
          tool:call.tool,
          error:postRollback.reason
        });
        receipts.push({
          tool:call.tool,
          effect:studioToolEffect(call.tool),
          ok:false,
          error:postRollback.reason,
          rollbackCount:0
        });
        const rollbackFailures=await rollbackCalls(studio,rollback);
        return {
          ok:false,
          applied:false,
          rolledBack:rollback.length > 0,
          rollbackComplete:false,
          partial:true,
          receipts,
          failures,
          rollbackFailures:[
            ...rollbackFailures,
            {
              tool:call.tool,
              args:clone(call.args || {}),
              error:'created instance cannot be located for rollback'
            }
          ]
        };
      }

      const reversals=[
        ...preRollback.calls,
        ...postRollback.calls
      ];

      receipts.push({
        tool:call.tool,
        effect:studioToolEffect(call.tool),
        ok:true,
        result:clone(result ?? null),
        rollbackCount:reversals.length
      });
      rollback.push(...reversals);
    }catch(error){
      failures.push({
        type:'tool',
        tool:call.tool,
        error:error instanceof Error ? error.message : String(error)
      });
      receipts.push({
        tool:call.tool,
        effect:studioToolEffect(call.tool),
        ok:false,
        error:error instanceof Error ? error.message : String(error),
        rollbackCount:0
      });

      if(atomic){
        const rollbackFailures=await rollbackCalls(studio,rollback);
        return {
          ok:false,
          applied:false,
          rolledBack:true,
          rollbackComplete:rollbackFailures.length === 0,
          partial:rollbackFailures.length > 0,
          receipts,
          failures,
          rollbackFailures
        };
      }
    }
  }

  return {
    ok:failures.length === 0,
    applied:receipts.some(receipt => receipt.ok && isWriteEffect(receipt.effect)),
    rolledBack:false,
    rollbackComplete:null,
    partial:failures.length > 0 && receipts.some(receipt => receipt.ok),
    receipts,
    failures,
    rollbackFailures:[],
    preflight:preflight.map(row => ({
      tool:row.call.tool,
      effect:row.assessment.effect,
      rollbackCoverage:row.preRollback.covered
    })),
    rollbackPlan:rollback
  };
}

export async function rollbackStudioActionBatch(studio,batch){
  if(!batch || !Array.isArray(batch.rollbackPlan)){
    return {ok:true,attempted:0,failures:[]};
  }
  const failures=await rollbackCalls(studio,batch.rollbackPlan);
  return {
    ok:failures.length === 0,
    attempted:batch.rollbackPlan.length,
    failures
  };
}
