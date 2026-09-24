
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
        return [{
          tool:'write_script',
          args:{
            path:call.args.path,
            source:current.source,
            create:true,
            className:current.className
          }
        }];
      }
    }catch{
      if(call.tool === 'write_script' && call.args.create === true){
        return [{tool:'delete_instance',args:{path:call.args.path}}];
      }
    }
  }

  if(call.tool === 'set_property'){
    try{
      const current=await studio.call('inspect_instance',{path:call.args.path});
      const properties=current?.properties;
      if(properties && Object.prototype.hasOwnProperty.call(properties,call.args.property)){
        return [{
          tool:'set_property',
          args:{
            path:call.args.path,
            property:call.args.property,
            value:clone(properties[call.args.property])
          }
        }];
      }
    }catch{}
  }

  return [];
}

function postRollbackForCall(call,result){
  if(call.tool === 'create_instance' && result && typeof result.path === 'string'){
    return [{tool:'delete_instance',args:{path:result.path}}];
  }
  return rollbackFromAdapter(result);
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
  safety={}
}){
  if(!studio || typeof studio.call !== 'function'){
    throw new TypeError('studio.call must be a function.');
  }
  if(!Array.isArray(calls)) throw new TypeError('calls must be an array.');

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

  for(const {call,assessment} of assessments){
    let preRollback=[];
    if(isWriteEffect(assessment.effect)){
      preRollback=await backupForCall(studio,call);
    }

    try{
      const result=await studio.call(call.tool,clone(call.args || {}));
      const reversals=[
        ...preRollback,
        ...postRollbackForCall(call,result)
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
