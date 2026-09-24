
import { describe,expect,it } from 'vitest';
import {
  createStudioMutationPlan,
  requiresHumanApproval,
  runStudioDevelopmentFactory,
  verifyStudioMutationPlan
} from './developmentFactory.js';

function fakeAdapter({failFirst=false}={}){
  let applied=0;
  const calls=[];
  return {
    calls,
    async inspectSnapshot(){ calls.push('inspect'); return {instances:12,scripts:3,hash:'snapshot'}; },
    async dryRunMutationPlan(plan){ calls.push('dry:' + plan.taskId); return {ok:true,changes:plan.operationCount}; },
    async applyMutationPlan(plan){
      applied+=1;
      calls.push('apply:' + plan.taskId);
      return {id:'receipt-' + applied,rollback:{id:'rollback-' + applied}};
    },
    async rollbackMutationPlan(receipt){ calls.push('rollback:' + receipt.id); return {ok:true}; },
    async runTests(){
      calls.push('tests');
      return {passed:3,failed:failFirst && applied === 1 ? 1 : 0};
    },
    async getLogs(){ calls.push('logs'); return {errors:[],warnings:[]}; },
    async captureViewport(){ calls.push('screenshot'); return {base64:'AAA' + applied,mediaType:'image/png'}; },
    async getRunState(){ calls.push('runstate'); return {running:true,mode:'play'}; },
    async simulateInput({actions}){ calls.push('input:' + actions.length); return {performed:actions.length}; },
    async runAssertions(){ calls.push('assertions'); return [{id:'ui-present',passed:true}]; }
  };
}

function baseAgents({repair=false}={}){
  return {
    async plan(){ return {summary:'Add quest HUD',assertions:[{id:'ui-present',kind:'exists',target:'StarterGui/Quest'}]}; },
    async code(){
      return {
        summary:'Create UI',
        operations:[
          {op:'create_instance',parent:'StarterGui',className:'ScreenGui',name:'Quest'},
          {op:'write_script',path:'StarterGui/Quest/Controller',source:'return true'}
        ],
        requiresPlaytest:true
      };
    },
    async review({tests}){ return {ok:Number(tests.failed || 0) === 0}; },
    async repair(){
      if(!repair) return null;
      return {
        summary:'Repair controller',
        operations:[
          {op:'edit_script',path:'StarterGui/Quest/Controller',old:'return true',new:'return {ready=true}'}
        ]
      };
    },
    async playtest(){ return {actions:[{type:'key',key:'Space'},{type:'wait',seconds:0.1}]}; }
  };
}

describe('Step 2: StarBlox AI Development Factory', () => {
  it('creates immutable hashed mutation plans from a constrained operation vocabulary', () => {
    const plan=createStudioMutationPlan({
      taskId:'t1',
      summary:'Add folder',
      operations:[{op:'create_instance',parent:'ReplicatedStorage',className:'Folder',name:'StarBlox'}],
      assertions:[{id:'exists',kind:'exists',target:'ReplicatedStorage/StarBlox'}]
    });

    expect(verifyStudioMutationPlan(plan)).toEqual({ok:true,errors:[]});
    expect(plan.planHash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
    expect(plan.operationCount).toBe(1);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it('rejects publish/spend/deploy-like operations outside the Studio mutation contract', () => {
    expect(() => createStudioMutationPlan({
      taskId:'unsafe',
      summary:'bad',
      operations:[{op:'publish_place',path:'game'}]
    })).toThrow(/forbidden Studio operation/);
  });

  it('requires approval for destructive or risky plans', () => {
    const plan=createStudioMutationPlan({
      taskId:'delete',
      summary:'Delete old system',
      operations:[{op:'delete_instance',path:'Workspace/OldSystem'}]
    });
    expect(requiresHumanApproval(plan)).toBe(true);
  });

  it('runs inspect -> dry run -> mutation -> test/playtest/log/screenshot/review and returns verified evidence', async () => {
    const adapter=fakeAdapter();
    const result=await runStudioDevelopmentFactory({
      task:{taskId:'ui-1',prompt:'Add quest HUD'},
      adapter,
      agents:baseAgents(),
      approvePlan:async () => true
    });

    expect(result.status).toBe('verified');
    expect(result.progress.repairAttempts).toBe(0);
    expect(result.evaluation.tests.failed).toBe(0);
    expect(result.evaluation.screenshot.kind).toBe('image');
    expect(result.artifactHash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
    expect(adapter.calls).toEqual(expect.arrayContaining([
      'inspect','dry:ui-1','apply:ui-1','tests','runstate','input:2','logs','screenshot','assertions'
    ]));
  });

  it('performs a bounded repair loop and re-verifies after the fix', async () => {
    const adapter=fakeAdapter({failFirst:true});
    const result=await runStudioDevelopmentFactory({
      task:{taskId:'repair-1',prompt:'Repair quest HUD'},
      adapter,
      agents:baseAgents({repair:true}),
      approvePlan:async () => true,
      limits:{maxRepairs:2}
    });

    expect(result.status).toBe('verified');
    expect(result.progress.repairAttempts).toBe(1);
    expect(result.receipts).toHaveLength(2);
    expect(adapter.calls).toContain('apply:repair-1-repair-1');
    expect(adapter.calls.some(call => call.startsWith('rollback:'))).toBe(false);
  });

  it('rolls back all applied receipts in reverse order when bounded repairs still fail', async () => {
    const adapter=fakeAdapter({failFirst:true});
    adapter.runTests=async function(){
      this.calls.push('tests');
      return {passed:0,failed:1};
    };

    const result=await runStudioDevelopmentFactory({
      task:{taskId:'fail-1',prompt:'Broken feature'},
      adapter,
      agents:baseAgents({repair:true}),
      approvePlan:async () => true,
      limits:{maxRepairs:1}
    });

    expect(result.status).toBe('rolled_back');
    expect(adapter.calls.slice(-2)).toEqual(['rollback:rollback-2','rollback:rollback-1']);
  });

  it('stops before mutation when a plan requiring approval is not approved', async () => {
    const adapter=fakeAdapter();
    const agents=baseAgents();
    agents.code=async () => ({
      summary:'Delete legacy',
      operations:[{op:'delete_instance',path:'Workspace/Legacy'}]
    });

    const result=await runStudioDevelopmentFactory({
      task:{taskId:'approval-1',prompt:'Delete legacy'},
      adapter,
      agents,
      approvePlan:async () => false
    });

    expect(result.status).toBe('awaiting_approval');
    expect(adapter.calls.some(call => call.startsWith('apply:'))).toBe(false);
  });
});
