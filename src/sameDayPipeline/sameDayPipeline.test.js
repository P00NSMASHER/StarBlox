import { describe,expect,it } from 'vitest';
import {
  buildSameDayPipelinePlan,
  collectSameDayInputProvenance,
  createSameDayPipelineState,
  nextSameDayPipelineStage,
  readySameDayPipelineStages,
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
    maxParallel:4,
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
        purpose:'port authorized Flex-with-Friends quest/traffic/minigame systems',
        repository:'bsantanna/roblox-flex-with-friends',
        commit:'f23ff0b06c759e60aa651a6618a8d81692719fc9',
        checkout:'vendor/authorized/roblox-flex-with-friends'
      },
      {
        id:'rorooms',
        taskFile:'config/integrate-rorooms-task.json',
        purpose:'port authorized Rorooms social/profile/emote systems',
        repository:'Rorooms/Rorooms',
        commit:'3d06941343b5bd70a92044b45fe25deb3e4e2095',
        checkout:'vendor/authorized/Rorooms'
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
      'ingest-brookhaven','plan-brookhaven','export-brookhaven',
      'ingest-robbing','plan-robbing','export-robbing',
      'checkout-flex','checkout-rorooms',
      'build-staging-place','verify-studio-staging',
      'adapt-brookhaven','adapt-robbing',
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

    const badPin=manifest();
    badPin.integrationTasks[0].commit='main';
    expect(()=>buildSameDayPipelinePlan(badPin)).toThrow(/exact 40-character Git SHA/);

    const publish=manifest();
    publish.gates.security={command:'npm',args:['run','publish']};
    expect(()=>buildSameDayPipelinePlan(publish)).toThrow(/may not publish/);
  });

  it('supports resumable ordered state without skipping dependencies',()=>{
    const plan=buildSameDayPipelinePlan(manifest());
    const state=createSameDayPipelineState(plan);

    expect(nextSameDayPipelineStage(state,plan).id).toBe('ingest-brookhaven');
    expect(readySameDayPipelineStages(state,plan).map(row=>row.id)).toEqual([
      'ingest-brookhaven',
      'ingest-robbing',
      'checkout-flex',
      'checkout-rorooms'
    ]);
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


  it('binds provenance to exact completed source fingerprints and donor commits',()=>{
    const input=manifest();
    input.authorizedWorld.download={
      url:'https://example.com/Brookhaven.rbxl',
      sha256:'a'.repeat(64),
      bytes:1276795
    };
    input.donors[0].download={
      url:'https://example.com/Robbing-Simulator.rbxl',
      sha256:'b'.repeat(64),
      bytes:2531904
    };
    const plan=buildSameDayPipelinePlan(input);
    const state=createSameDayPipelineState(plan);

    for(const [stageId,sha256,bytes] of [
      ['ingest-brookhaven','a'.repeat(64),1276795],
      ['ingest-robbing','b'.repeat(64),2531904]
    ]){
      state.stages[stageId].status='complete';
      state.stages[stageId].result={
        ok:true,
        bootstrap:{verified:true,downloaded:true,sha256,bytes}
      };
    }
    for(const [stageId,repository,commit,checkout] of [
      ['checkout-flex','bsantanna/roblox-flex-with-friends',
        'f23ff0b06c759e60aa651a6618a8d81692719fc9','vendor/authorized/roblox-flex-with-friends'],
      ['checkout-rorooms','Rorooms/Rorooms',
        '3d06941343b5bd70a92044b45fe25deb3e4e2095','vendor/authorized/Rorooms']
    ]){
      state.stages[stageId].status='complete';
      state.stages[stageId].result={ok:true,repository,commit,checkout};
    }

    const provenance=collectSameDayInputProvenance(state,plan);
    expect(provenance.placeSources.brookhaven.sha256).toBe('a'.repeat(64));
    expect(provenance.placeSources.robbing.bytes).toBe(2531904);
    expect(provenance.codeDonors.flex.commit)
      .toBe('f23ff0b06c759e60aa651a6618a8d81692719fc9');
    expect(provenance.codeDonors.rorooms.repository).toBe('Rorooms/Rorooms');

    state.stages['ingest-brookhaven'].result.bootstrap.sha256='c'.repeat(64);
    expect(()=>collectSameDayInputProvenance(state,plan))
      .toThrow(/source fingerprint does not match pinned manifest/);

    state.stages['ingest-brookhaven'].result.bootstrap.sha256='a'.repeat(64);
    state.stages['checkout-flex'].result.commit='d'.repeat(40);
    expect(()=>collectSameDayInputProvenance(state,plan))
      .toThrow(/code donor commit mismatch/);
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