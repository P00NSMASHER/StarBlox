import { describe,expect,it } from 'vitest';
import {
  buildSameDayPipelinePlan,
  createSameDayPipelineState,
  nextSameDayPipelineStage,
  recordSameDayStageResult,
  verifySameDayPipelinePlan
} from './sameDayPipeline.js';

function manifest(){
  return {
    schemaVersion:1,
    runName:'starblox-one-day-slice',
    outputDir:'artifacts/same-day',
    factoryAdapter:'config/factory-adapter.mjs',
    maxRepairCycles:2,
    authorizedWorld:{
      id:'brookhaven',
      sourceId:'authorized-brookhaven',
      input:'sources/Brookhaven.rbxl',
      migrationRules:'config/brookhaven-rules.json'
    },
    donors:[
      {
        id:'robbing',
        sourceId:'creator-robbing-simulator',
        input:'sources/Robbing-Simulator.rbxl'
      }
    ],
    integrationTasks:[
      {
        id:'flex',
        taskFile:'config/integrate-flex-task.json',
        purpose:'port authorized Flex-with-Friends quest/traffic/minigame systems'
      },
      {
        id:'rorooms',
        taskFile:'config/integrate-rorooms-task.json',
        purpose:'port authorized Rorooms social/profile/emote systems'
      }
    ],
    questMasteryTask:'config/quest-mastery-task.json',
    integratedVerificationTask:'config/integrated-slice-task.json',
    gates:{
      mobile:{command:'node',args:['scripts/mobile-gate.mjs']},
      security:{command:'npm',args:['test']},
      performance:{command:'node',args:['scripts/perf-gate.mjs']}
    }
  };
}

describe('same-day StarBlox pipeline',()=>{
  it('builds a deterministic fail-closed stage graph',()=>{
    const a=buildSameDayPipelinePlan(manifest());
    const b=buildSameDayPipelinePlan(manifest());

    expect(a).toEqual(b);
    expect(verifySameDayPipelinePlan(a)).toEqual({ok:true,errors:[]});
    expect(a.stages.map(row=>row.id)).toEqual([
      'ingest-brookhaven','plan-brookhaven','export-brookhaven','adapt-brookhaven',
      'ingest-robbing','plan-robbing','export-robbing','adapt-robbing',
      'integrate-flex','integrate-rorooms',
      'wire-quest-mastery','verify-integrated-slice',
      'gate-mobile','gate-security','gate-performance','finalize-same-day-slice'
    ]);
    expect(a.stages.every(row=>row.autoPublish === false)).toBe(true);
    expect(a.stages.at(-1).details.publicationAllowed).toBe(false);
  });

  it('rejects duplicate donors and publishing gates',()=>{
    const duplicate=manifest();
    duplicate.donors[0].id='brookhaven';
    expect(()=>buildSameDayPipelinePlan(duplicate)).toThrow(/unique ids/);

    const duplicateTask=manifest();
    duplicateTask.integrationTasks[0].id='brookhaven';
    expect(()=>buildSameDayPipelinePlan(duplicateTask)).toThrow(/unique ids/);

    const publish=manifest();
    publish.gates.security={command:'npm',args:['run','publish']};
    expect(()=>buildSameDayPipelinePlan(publish)).toThrow(/may not publish/);
  });

  it('supports resumable ordered state without skipping dependencies',()=>{
    const plan=buildSameDayPipelinePlan(manifest());
    const state=createSameDayPipelineState(plan);

    expect(nextSameDayPipelineStage(state,plan).id).toBe('ingest-brookhaven');
    expect(()=>recordSameDayStageResult(
      state,
      plan,
      'plan-brookhaven',
      {ok:true}
    )).toThrow(/before dependency/);

    recordSameDayStageResult(state,plan,'ingest-brookhaven',{ok:true,artifact:'receipt.json'});
    expect(nextSameDayPipelineStage(state,plan).id).toBe('plan-brookhaven');

    recordSameDayStageResult(state,plan,'plan-brookhaven',{ok:false,error:'review required'});
    expect(state.status).toBe('blocked');
    expect(state.stages['plan-brookhaven'].attemptCount).toBe(1);
    expect(nextSameDayPipelineStage(state,plan).id).toBe('plan-brookhaven');
  });

  it('detects plan tampering',()=>{
    const plan=buildSameDayPipelinePlan(manifest());
    const tampered=JSON.parse(JSON.stringify(plan));
    tampered.stages[0].autoPublish=true;
    const result=verifySameDayPipelinePlan(tampered);
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/autoPublish|planHash/);
  });
});