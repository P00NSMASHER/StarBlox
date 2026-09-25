import { describe,expect,it } from 'vitest';

import adapter from '../../tools/dev_factory/milestone4-live-adapter.mjs';
import { assessStudioToolCall } from './studioToolContract.js';

const SOURCE_ROOT='ServerStorage/StarBloxMigration/Quarantine/StarterGuiSource';
const ADAPTATION_ROOT=SOURCE_ROOT + '/StarBloxAdaptation';
const TEST_ROOT='ServerScriptService/Tests';

function validInspection(){
  return [
    {
      call:{tool:'inspect_instance',args:{path:SOURCE_ROOT}},
      ok:true,
      result:{path:SOURCE_ROOT,className:'Folder'}
    },
    {
      call:{tool:'inspect_instance',args:{path:ADAPTATION_ROOT}},
      ok:false,
      error:'not found'
    },
    {
      call:{tool:'inspect_instance',args:{path:TEST_ROOT}},
      ok:false,
      error:'not found'
    },
    {
      call:{tool:'read_all_scripts',args:{root:SOURCE_ROOT,maxBytes:80_000}},
      ok:true,
      result:{
        total:1,
        returned:1,
        truncated:false,
        scripts:[{
          path:SOURCE_ROOT + '/ImportedUi/Controller',
          className:'LocalScript',
          source:'print("never executed from ServerStorage")'
        }]
      }
    }
  ];
}

describe('Milestone 4 deterministic live adapter', () => {
  it('requires Studio tests, live playtest, runtime evidence, and visual proof', async () => {
    const plan=await adapter.agents.plan({});
    expect(plan.tests).toEqual({
      required:true,
      path:'ServerScriptService/Tests'
    });
    expect(plan.playtest.required).toBe(true);
    expect(plan.playtest.telemetryDomains).toEqual(['runtime','players','world']);
    expect(plan.visual.required).toBe(true);
    expect(plan.acceptance.length).toBeGreaterThan(4);
    expect(adapter.config.maxRepairCycles).toBe(0);
    expect(adapter.config.allowDestructive).toBe(false);
    expect(adapter.config.allowExecuteLuau).toBe(false);
    expect(adapter.studio.requiresAttestation).toBe(true);
  });

  it('creates only bounded quarantine metadata plus an approved test module', async () => {
    const result=await adapter.agents.code({
      inspection:validInspection()
    });

    expect(result.actions.map(action => action.tool)).toEqual([
      'create_instance',
      'create_instance',
      'create_instance',
      'create_instance',
      'write_script'
    ]);

    for(const action of result.actions){
      const assessment=assessStudioToolCall(action,{
        stage:'code',
        allowDestructive:false,
        allowExecuteLuau:false,
        confirmed:false
      });
      expect(assessment.ok,assessment.errors.join('; ')).toBe(true);
    }

    const testAction=result.actions.at(-1);
    expect(testAction.args.path).toBe(
      'ServerScriptService/Tests/Milestone4MigrationSpec'
    );
    expect(testAction.args.className).toBe('ModuleScript');
    expect(testAction.args.source).toContain(
      'quarantined StarterGuiSource folder is missing'
    );
    expect(testAction.args.source).not.toMatch(
      /SetAsync|RemoveAsync|loadstring|:Destroy\(|HttpService/
    );
  });

  it('refuses to mutate when the exact staged source is absent', async () => {
    const inspection=validInspection();
    inspection[0]={...inspection[0],ok:false,error:'missing'};

    await expect(adapter.agents.code({inspection}))
      .rejects
      .toThrow(/staging source is missing/i);
  });

  it('accepts visual evidence only when bounded pixels and dimensions exist', async () => {
    expect((await adapter.agents.visualReview({
      capture:{width:640,height:360,dataB64:'A'.repeat(40)}
    })).ok).toBe(true);

    expect((await adapter.agents.visualReview({
      capture:{width:0,height:0,dataB64:''}
    })).ok).toBe(false);
  });

  it('passes review only when deterministic verification passed', async () => {
    expect((await adapter.agents.review({
      verification:{ok:true,errors:[]}
    })).verdict).toBe('pass');

    expect((await adapter.agents.review({
      verification:{ok:false,errors:['test failure']}
    })).verdict).toBe('fail');
  });
});
