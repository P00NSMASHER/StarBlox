
import { describe,expect,it } from 'vitest';
import {
  assessStudioToolCall,
  stripLuauStringsAndComments
} from './studioToolContract.js';
import {
  executeStudioActionBatch
} from './transactionalStudio.js';
import {
  runDevelopmentFactory,
  verifyDevelopmentRun
} from './developmentFactory.js';

function createStudio({
  episode=true,
  initialTestFailures=0
}={}){
  const scripts=new Map([
    ['ServerScriptService/Main',{
      source:'return { value = 1 }',
      className:'ModuleScript'
    }]
  ]);
  const instances=new Map([
    ['Workspace/TestPart',{
      className:'Part',
      properties:{Anchored:false,Transparency:0}
    }]
  ]);
  const calls=[];
  let testFailures=initialTestFailures;
  let createdCounter=0;
  let running=true;

  const studio={
    calls,
    scripts,
    instances,
    has(name){
      return name === 'run_playtest_episode' ? episode : true;
    },
    setTestFailures(value){
      testFailures=value;
    },
    async call(tool,args={},meta={}){
      calls.push({tool,args:JSON.parse(JSON.stringify(args)),meta});

      if(tool === 'search_tree'){
        return {
          count:2,
          results:[
            {path:'ServerScriptService/Main',className:'ModuleScript'},
            {path:'Workspace/TestPart',className:'Part'}
          ]
        };
      }
      if(tool === 'read_all_scripts'){
        return {
          count:scripts.size,
          scripts:[...scripts.entries()].map(([path,row]) => ({
            path,
            className:row.className,
            source:row.source
          }))
        };
      }
      if(tool === 'read_script'){
        const row=scripts.get(args.path);
        if(!row) throw new Error('script not found: ' + args.path);
        return {path:args.path,source:row.source,className:row.className};
      }
      if(tool === 'write_script'){
        if(args.source === 'THROW_WRITE') throw new Error('synthetic write failure');
        scripts.set(args.path,{
          source:String(args.source),
          className:args.className || scripts.get(args.path)?.className || 'Script'
        });
        return {path:args.path,bytes:String(args.source).length};
      }
      if(tool === 'edit_script'){
        const row=scripts.get(args.path);
        if(!row) throw new Error('script not found: ' + args.path);
        const first=row.source.indexOf(args.old);
        if(first < 0) throw new Error('old text not found');
        if(row.source.indexOf(args.old,first + args.old.length) >= 0){
          throw new Error('old text not unique');
        }
        row.source=row.source.slice(0,first) + args.new + row.source.slice(first + args.old.length);
        return {path:args.path};
      }
      if(tool === 'create_instance'){
        createdCounter++;
        const path=(args.parent || 'Workspace') + '/' + (args.name || ('Instance' + createdCounter));
        instances.set(path,{
          className:args.className,
          properties:{...(args.properties || {})}
        });
        return {path,className:args.className};
      }
      if(tool === 'delete_instance'){
        scripts.delete(args.path);
        instances.delete(args.path);
        return {deleted:args.path};
      }
      if(tool === 'inspect_instance'){
        const row=instances.get(args.path);
        if(row) return {path:args.path,className:row.className,properties:{...row.properties},children:[]};
        const script=scripts.get(args.path);
        if(script) return {path:args.path,className:script.className,properties:{},children:[]};
        throw new Error('instance not found');
      }
      if(tool === 'set_property'){
        const row=instances.get(args.path);
        if(!row) throw new Error('instance not found');
        row.properties[args.property]=args.value;
        return {path:args.path,property:args.property};
      }
      if(tool === 'run_tests'){
        return {
          passed:testFailures ? 1 : 3,
          failed:testFailures,
          total:testFailures ? 1 + testFailures : 3,
          results:[]
        };
      }
      if(tool === 'get_logs'){
        return {count:0,logs:[]};
      }
      if(tool === 'get_run_state'){
        return {running,runMode:running,edit:!running};
      }
      if(tool === 'start_playtest'){
        running=true;
        return {success:true,running:true,roles:['server','client-1']};
      }
      if(tool === 'stop_playtest'){
        running=false;
        return {success:true,running:false};
      }
      if(tool === 'playtest_sample_state'){
        return {runtime:{isRunning:running,isServer:true},playerCount:1,worldValues:[]};
      }
      if(tool === 'run_gameplay_assertions'){
        return {
          allPassed:true,
          summary:{total:(args.assertions || []).length,passed:(args.assertions || []).length,failed:0},
          results:(args.assertions || []).map(item => ({name:item.name,passed:true}))
        };
      }
      if(tool === 'simulate_input'){
        return {ok:true,performed:(args.actions || []).length};
      }
      if(tool === 'capture_viewport'){
        return {
          format:'rgba8',
          width:640,
          height:360,
          dataB64:'A'.repeat(1000)
        };
      }
      if(tool === 'run_playtest_episode'){
        return {
          episodeId:'episode-1',
          verdict:'pass',
          logs:{errorCount:0,errors:[]},
          assertions:{results:[{name:'spawn',passed:true}]}
        };
      }
      if(tool === 'summarize_episode'){
        return {fixed:true,regressed:false};
      }
      throw new Error('unsupported fake Studio tool: ' + tool);
    }
  };

  return studio;
}

describe('Step 2: Studio tool safety contract', () => {
  it('ignores destructive words inside Luau strings/comments but detects executable destructive calls', () => {
    const safe=[
      'local s = "workspace:Destroy()"',
      '-- workspace:Destroy()',
      'return s'
    ].join('\n');
    const stripped=stripLuauStringsAndComments(safe);
    expect(stripped).not.toMatch(/Destroy/);

    const safeAssessment=assessStudioToolCall({
      tool:'run_luau',
      args:{code:safe}
    },{
      stage:'inspect',
      allowExecuteLuau:true
    });
    expect(safeAssessment.ok).toBe(true);

    const dangerous=assessStudioToolCall({
      tool:'run_luau',
      args:{code:'workspace.Temp:Destroy()'}
    },{
      stage:'code',
      allowExecuteLuau:true
    });
    expect(dangerous.ok).toBe(false);
    expect(dangerous.requiresConfirmation).toBe(true);
  });

  it('requires explicit confirmation before writing high-risk generated Luau', () => {
    const blocked=assessStudioToolCall({
      tool:'write_script',
      args:{
        path:'ServerScriptService/Main',
        source:'local ds = game:GetService("DataStoreService"):GetDataStore("x")\nds:SetAsync("key", 1)'
      }
    },{
      stage:'code'
    });

    expect(blocked.ok).toBe(false);
    expect(blocked.requiresConfirmation).toBe(true);
    expect(blocked.errors).toContain('tool call requires explicit confirmation');

    const confirmed=assessStudioToolCall({
      tool:'edit_script',
      args:{
        path:'ServerScriptService/Main',
        old:'return true',
        new:'workspace.Temp:Destroy()'
      }
    },{
      stage:'repair',
      confirmed:true
    });

    expect(confirmed.ok).toBe(true);
    expect(confirmed.requiresConfirmation).toBe(true);
    expect(confirmed.warnings.join(' ')).toMatch(/high-risk|destructive/);
  });

  it('does not flag dangerous-looking words that occur only inside generated-script strings/comments', () => {
    const result=assessStudioToolCall({
      tool:'write_script',
      args:{
        path:'ServerScriptService/Main',
        source:[
          'local message = "workspace.Temp:Destroy()"',
          '-- ds:SetAsync("key", 1)',
          'return message'
        ].join('\n')
      }
    },{
      stage:'code'
    });

    expect(result.ok).toBe(true);
    expect(result.requiresConfirmation).toBe(false);
  });

  it('restricts executable Studio tests to dedicated Tests roots', () => {
    const blocked=assessStudioToolCall({
      tool:'run_tests',
      args:{path:'ServerScriptService'}
    },{
      stage:'test'
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.errors.join(' ')).toMatch(/approved test root/);

    const allowed=assessStudioToolCall({
      tool:'run_tests',
      args:{path:'ServerScriptService/Tests/QuestSpecs'}
    },{
      stage:'test'
    });
    expect(allowed.ok).toBe(true);
  });

  it('prevents generic property mutation from bypassing script scanning or rollback identity', () => {
    for(const property of ['Source','Parent','Name','ClassName']){
      const result=assessStudioToolCall({
        tool:'set_property',
        args:{
          path:'ServerScriptService/Main',
          property,
          value:'unsafe'
        }
      },{
        stage:'code'
      });
      expect(result.ok).toBe(false);
      expect(result.errors.join(' ')).toMatch(/protected property/);
    }
  });

  it('requires script creation to use write_script so generated Luau is scanned', () => {
    const blockedClass=assessStudioToolCall({
      tool:'create_instance',
      args:{
        parent:'ServerScriptService',
        className:'Script',
        name:'Bypass'
      }
    },{
      stage:'code'
    });
    expect(blockedClass.ok).toBe(false);
    expect(blockedClass.errors.join(' ')).toMatch(/write_script/);

    const blockedSource=assessStudioToolCall({
      tool:'create_instance',
      args:{
        parent:'Workspace',
        className:'Folder',
        name:'Folder',
        properties:{Source:'workspace.Temp:Destroy()'}
      }
    },{
      stage:'code'
    });
    expect(blockedSource.ok).toBe(false);
    expect(blockedSource.errors.join(' ')).toMatch(/protected property Source/);
  });

  it('blocks destructive instance deletion in automated runs by default', () => {
    const result=assessStudioToolCall({
      tool:'delete_instance',
      args:{path:'Workspace/City'}
    },{
      stage:'code'
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toMatch(/disabled/);
  });
});

describe('Step 2: transactional Studio mutations', () => {
  it('rolls back earlier script edits when a later write fails', async () => {
    const studio=createStudio();
    const before=studio.scripts.get('ServerScriptService/Main').source;

    const result=await executeStudioActionBatch({
      studio,
      stage:'code',
      calls:[
        {
          tool:'write_script',
          args:{
            path:'ServerScriptService/Main',
            source:'return { value = 2 }'
          }
        },
        {
          tool:'write_script',
          args:{
            path:'ServerScriptService/Other',
            source:'THROW_WRITE',
            create:true,
            className:'ModuleScript'
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.rolledBack).toBe(true);
    expect(result.rollbackComplete).toBe(true);
    expect(studio.scripts.get('ServerScriptService/Main').source).toBe(before);
    expect(studio.scripts.has('ServerScriptService/Other')).toBe(false);
  });

  it('blocks a mutation when its previous state cannot be captured for rollback', async () => {
    const studio=createStudio();
    const result=await executeStudioActionBatch({
      studio,
      stage:'code',
      calls:[
        {
          tool:'set_property',
          args:{
            path:'Workspace/TestPart',
            property:'MissingFromInspector',
            value:123
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.failures[0].type).toBe('rollback-coverage');
    expect(studio.instances.get('Workspace/TestPart').properties.MissingFromInspector).toBeUndefined();
  });

  it('preflights rollback coverage for the whole batch before the first write lands', async () => {
    const studio=createStudio();
    const before=studio.scripts.get('ServerScriptService/Main').source;

    const result=await executeStudioActionBatch({
      studio,
      stage:'code',
      calls:[
        {
          tool:'write_script',
          args:{
            path:'ServerScriptService/Main',
            source:'return { value = 99 }'
          }
        },
        {
          tool:'set_property',
          args:{
            path:'Workspace/TestPart',
            property:'MissingFromInspector',
            value:123
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.applied).toBe(false);
    expect(result.rolledBack).toBe(false);
    expect(result.partial).toBe(false);
    expect(result.failures[0].type).toBe('rollback-coverage');
    expect(studio.scripts.get('ServerScriptService/Main').source).toBe(before);
    expect(studio.instances.get('Workspace/TestPart').properties.MissingFromInspector).toBeUndefined();

    // Only checkpoint reads are allowed before the preflight fails.
    expect(studio.calls.some(row => row.tool === 'write_script')).toBe(false);
    expect(studio.calls.some(row => row.tool === 'set_property')).toBe(false);
  });

  it('blocks oversized mutation batches before touching Studio', async () => {
    const studio=createStudio();
    const result=await executeStudioActionBatch({
      studio,
      stage:'code',
      maxToolCallsPerBatch:2,
      calls:[
        {tool:'set_property',args:{path:'Workspace/TestPart',property:'Anchored',value:true}},
        {tool:'set_property',args:{path:'Workspace/TestPart',property:'Transparency',value:0.5}},
        {tool:'set_property',args:{path:'Workspace/TestPart',property:'Anchored',value:false}}
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.failures[0].type).toBe('budget');
    expect(studio.instances.get('Workspace/TestPart').properties.Anchored).toBe(false);
  });

  it('does not treat an unreadable existing script as a newly created rollback target', async () => {
    const studio=createStudio();
    const original=studio.scripts.get('ServerScriptService/Main').source;
    const baseCall=studio.call.bind(studio);

    studio.call=async (tool,args={},meta={}) => {
      if(tool === 'read_script' && args.path === 'ServerScriptService/Main'){
        throw new Error('synthetic source read failure');
      }
      return baseCall(tool,args,meta);
    };

    const result=await executeStudioActionBatch({
      studio,
      stage:'code',
      calls:[
        {
          tool:'write_script',
          args:{
            path:'ServerScriptService/Main',
            source:'return { value = 99 }',
            create:true,
            className:'ModuleScript'
          }
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(result.failures[0].type).toBe('rollback-coverage');
    expect(result.failures[0].error).toMatch(/target exists/);
    expect(studio.scripts.get('ServerScriptService/Main').source).toBe(original);
    expect(studio.calls.some(row => row.tool === 'write_script')).toBe(false);
  });

  it('returns a reversible rollback plan for successful writes and instance creation', async () => {
    const studio=createStudio();

    const result=await executeStudioActionBatch({
      studio,
      stage:'code',
      calls:[
        {
          tool:'write_script',
          args:{
            path:'ServerScriptService/Main',
            source:'return { value = 3 }'
          }
        },
        {
          tool:'create_instance',
          args:{
            className:'Folder',
            parent:'Workspace',
            name:'Generated'
          }
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(result.rollbackPlan.length).toBeGreaterThanOrEqual(2);
    expect(result.rollbackPlan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({tool:'write_script'}),
        expect.objectContaining({tool:'delete_instance'})
      ])
    );
  });
});

describe('Step 2: AI development factory', () => {
  it('runs inspect -> plan -> code -> tests/runtime/visual -> review -> repository gates', async () => {
    const studio=createStudio();
    const stages=[];

    const agents={
      async plan({inspection}){
        stages.push('plan');
        expect(inspection.length).toBe(2);
        return {
          summary:'Update the main gameplay module and verify it.',
          tests:{required:true,path:'ServerScriptService/Tests'},
          playtest:{
            required:true,
            episodeArgs:{mode:'play',assertions:[{name:'spawn'}]}
          },
          visual:{required:true},
          acceptance:['Studio tests pass','Runtime episode passes','Visual capture succeeds']
        };
      },
      async code(){
        stages.push('code');
        return {
          summary:'Update Main',
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { value = 2 }'
              }
            }
          ]
        };
      },
      async visualReview({capture,screenshot}){
        expect(capture.dataB64).toBeTruthy();
        expect(screenshot.artifactHash).toMatch(/^fnv1a32:/);
        return {ok:true,findings:[],summary:'Viewport matches acceptance.'};
      },
      async review({verification}){
        stages.push('review');
        expect(verification.ok).toBe(true);
        return {
          verdict:'pass',
          findings:[],
          summary:'All evidence passed.'
        };
      }
    };

    const repositoryGate={
      async run(){
        stages.push('repo');
        return {
          ok:true,
          gates:{
            tests:{ok:true},
            certification:{ok:true},
            balance:{ok:true},
            build:{ok:true}
          }
        };
      }
    };

    const run=await runDevelopmentFactory({
      task:{
        id:'feature-1',
        request:'Change Main value from 1 to 2'
      },
      studio,
      agents,
      repositoryGate,
      startedAt:'2026-09-24T13:30:00Z',
      config:{requiredRepositoryGates:['tests','certification','balance','build']}
    });

    expect(run.status).toBe('verified');
    expect(studio.scripts.get('ServerScriptService/Main').source).toBe('return { value = 2 }');
    expect(stages).toEqual(['plan','code','repo','review']);
    expect(verifyDevelopmentRun(run)).toEqual({ok:true,errors:[]});

    const serialized=JSON.stringify(run);
    expect(serialized).not.toContain('return { value = 1 }');
    expect(serialized).not.toContain('A'.repeat(200));
    expect(serialized).toMatch(/artifactHash/);
  });

  it('fails closed and rolls back when a configured certification receipt is missing', async () => {
    const studio=createStudio();
    const run=await runDevelopmentFactory({
      task:{id:'cert-proof',request:'Require certification proof'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Make a reversible change.',
          tests:{required:false},
          playtest:{required:false},
          visual:{required:false}
        }),
        code:async () => ({
          summary:'Anchor a test part.',
          actions:[
            {tool:'set_property',args:{path:'Workspace/TestPart',property:'Anchored',value:true}}
          ]
        }),
        review:async ({verification}) => verification.ok
          ? {verdict:'pass',findings:[]}
          : {verdict:'fail',findings:verification.errors}
      },
      repositoryGate:{
        run:async () => ({
          ok:true,
          gates:{tests:true,balance:true,build:true}
        })
      },
      startedAt:'2026-09-24T13:30:30Z',
      config:{requiredRepositoryGates:['tests','certification','balance','build']}
    });

    expect(run.status).toBe('failed');
    expect(run.finalReview.findings.join(' ')).toMatch(/certification/);
    expect(run.rollback.attempted).toBe(true);
    expect(studio.instances.get('Workspace/TestPart').properties.Anchored).toBe(false);
  });

  it('executes a bounded reviewer-driven repair cycle until evidence turns green', async () => {
    const studio=createStudio({initialTestFailures:1});
    let reviews=0;
    let repairs=0;

    const agents={
      async plan(){
        return {
          summary:'Implement and repair until tests pass.',
          tests:{required:true},
          playtest:{required:false},
          visual:{required:false}
        };
      },
      async code(){
        return {
          summary:'First attempt',
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { value = 2 }'
              }
            }
          ]
        };
      },
      async review({verification}){
        reviews++;
        if(!verification.ok){
          return {
            verdict:'repair',
            findings:['Studio tests failed']
          };
        }
        return {verdict:'pass',findings:[]};
      },
      async repair(){
        repairs++;
        studio.setTestFailures(0);
        return {
          summary:'Repair failing implementation',
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { value = 3 }'
              }
            }
          ]
        };
      }
    };

    const run=await runDevelopmentFactory({
      task:{id:'repair-1',request:'Implement feature with repair loop'},
      studio,
      agents,
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:31:00Z',
      config:{maxRepairCycles:2}
    });

    expect(run.status).toBe('verified');
    expect(reviews).toBe(2);
    expect(repairs).toBe(1);
    expect(studio.scripts.get('ServerScriptService/Main').source).toBe('return { value = 3 }');
  });

  it('rolls back the entire run when the reviewer rejects the changed implementation', async () => {
    const studio=createStudio();
    const original=studio.scripts.get('ServerScriptService/Main').source;

    const run=await runDevelopmentFactory({
      task:{id:'reject-1',request:'Try a change that will be rejected'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Change then review',
          tests:{required:true},
          playtest:{required:false},
          visual:{required:false}
        }),
        code:async () => ({
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { value = 999 }'
              }
            }
          ]
        }),
        review:async () => ({
          verdict:'fail',
          findings:['Does not meet product requirements']
        })
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:32:00Z'
    });

    expect(run.status).toBe('failed');
    expect(run.rollback.attempted).toBe(true);
    expect(run.rollback.ok).toBe(true);
    expect(studio.scripts.get('ServerScriptService/Main').source).toBe(original);
  });

  it('fails closed and rolls back when runtime proof is mandatory but unavailable', async () => {
    const studio=createStudio({episode:false});
    studio.call=async function(tool,args={},meta={}){
      if(tool === 'get_run_state'){
        this.calls.push({tool,args,meta});
        return {running:false,edit:true};
      }
      return createStudio({episode:false}).call(tool,args,meta);
    };

    const run=await runDevelopmentFactory({
      task:{id:'runtime-required',request:'Add a runtime feature'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Runtime behavior must be proven.',
          tests:{required:true},
          playtest:{required:true,inputActions:[{type:'key',key:'Space'}]},
          visual:{required:false}
        }),
        code:async () => ({
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { runtime = true }'
              }
            }
          ]
        }),
        review:async ({verification}) => ({
          verdict:verification.ok ? 'pass' : 'fail',
          findings:verification.errors
        })
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:33:00Z'
    });

    expect(run.status).toBe('failed');
    expect(run.finalReview.findings.join(' ')).toMatch(/playtest is not running/);
    expect(run.rollback.attempted).toBe(true);
  });

  it('does not treat an empty Studio test suite as proof', async () => {
    const studio=createStudio();
    const originalCall=studio.call.bind(studio);
    studio.call=async (tool,args={},meta={}) => {
      if(tool === 'run_tests') return {passed:0,failed:0,total:0,results:[]};
      return originalCall(tool,args,meta);
    };

    const run=await runDevelopmentFactory({
      task:{id:'empty-tests',request:'Require actual proof'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Must run tests',
          tests:{required:true},
          playtest:{required:false},
          visual:{required:false}
        }),
        code:async () => ({
          actions:[{tool:'write_script',args:{path:'ServerScriptService/Main',source:'return { value = 2 }'}}]
        }),
        review:async ({verification}) => ({
          verdict:verification.ok ? 'pass' : 'fail',
          findings:verification.errors
        })
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:35:00Z'
    });

    expect(run.status).toBe('failed');
    expect(run.finalReview.findings.join(' ')).toMatch(/Studio tests failed/);
    expect(run.rollback.attempted).toBe(true);
  });

  it('supports direct BloxForge-style start/sample/assert/stop playtests when episode mode is unavailable', async () => {
    const studio=createStudio({episode:false});
    studio.call('stop_playtest',{});

    const run=await runDevelopmentFactory({
      task:{id:'direct-playtest',request:'Verify runtime behavior'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Runtime proof',
          tests:{required:true},
          playtest:{
            required:true,
            inputActions:[{type:'key',key:'Space'}],
            assertions:[{name:'running',expr:'game:GetService("RunService"):IsRunning()'}],
            telemetryDomains:['players','runtime']
          },
          visual:{required:false}
        }),
        code:async () => ({
          actions:[{tool:'write_script',args:{path:'ServerScriptService/Main',source:'return { runtime = true }'}}]
        }),
        review:async ({verification}) => ({
          verdict:verification.ok ? 'pass' : 'fail',
          findings:verification.errors
        })
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:36:00Z'
    });

    expect(run.status).toBe('verified');
    expect(studio.calls.some(row => row.tool === 'start_playtest')).toBe(true);
    expect(studio.calls.some(row => row.tool === 'playtest_sample_state')).toBe(true);
    expect(studio.calls.some(row => row.tool === 'run_gameplay_assertions')).toBe(true);
    expect(studio.calls.some(row => row.tool === 'stop_playtest')).toBe(true);
  });

  it('captures visual evidence before tearing down a factory-started playtest', async () => {
    const studio=createStudio({episode:false});
    await studio.call('stop_playtest',{});
    studio.calls.length=0;

    const run=await runDevelopmentFactory({
      task:{id:'visual-runtime-order',request:'Verify the runtime scene visually'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Run, capture and verify before teardown.',
          tests:{required:true},
          playtest:{required:true,inputActions:[]},
          visual:{required:true},
          acceptance:['Runtime viewport is visible']
        }),
        code:async () => ({
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { visual = true }'
              }
            }
          ]
        }),
        visualReview:async () => ({ok:true,findings:[],summary:'runtime visible'}),
        review:async ({verification}) => ({
          verdict:verification.ok ? 'pass' : 'fail',
          findings:verification.errors
        })
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:36:30Z'
    });

    expect(run.status).toBe('verified');
    const captureIndex=studio.calls.findIndex(row => row.tool === 'capture_viewport');
    const stopIndex=studio.calls.findIndex(row => row.tool === 'stop_playtest');
    expect(captureIndex).toBeGreaterThanOrEqual(0);
    expect(stopIndex).toBeGreaterThan(captureIndex);
  });

  it('enforces a total mutation budget across repair cycles', async () => {
    const studio=createStudio({initialTestFailures:1});
    const run=await runDevelopmentFactory({
      task:{id:'mutation-budget',request:'Bound total writes'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Budgeted repair',
          tests:{required:true},
          playtest:{required:false},
          visual:{required:false}
        }),
        code:async () => ({
          actions:[
            {tool:'set_property',args:{path:'Workspace/TestPart',property:'Anchored',value:true}},
            {tool:'set_property',args:{path:'Workspace/TestPart',property:'Transparency',value:0.5}}
          ]
        }),
        review:async () => ({verdict:'repair',findings:['retry']}),
        repair:async () => ({
          actions:[
            {tool:'set_property',args:{path:'Workspace/TestPart',property:'Anchored',value:false}},
            {tool:'set_property',args:{path:'Workspace/TestPart',property:'Transparency',value:0}}
          ]
        })
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:37:00Z',
      config:{maxRepairCycles:2,maxTotalMutationCalls:3}
    });

    expect(run.status).toBe('failed');
    expect(run.finalReview.findings.join(' ')).toMatch(/mutation budget/);
    expect(run.rollback.attempted).toBe(true);
  });

  it('stops after the configured repair bound instead of looping indefinitely', async () => {
    const studio=createStudio({initialTestFailures:1});
    let repairCalls=0;

    const run=await runDevelopmentFactory({
      task:{id:'bounded',request:'Never-ending failure'},
      studio,
      agents:{
        plan:async () => ({
          summary:'Bounded repair test',
          tests:{required:true},
          playtest:{required:false},
          visual:{required:false}
        }),
        code:async () => ({
          actions:[
            {
              tool:'write_script',
              args:{
                path:'ServerScriptService/Main',
                source:'return { value = 2 }'
              }
            }
          ]
        }),
        review:async () => ({
          verdict:'repair',
          findings:['still failing']
        }),
        repair:async () => {
          repairCalls++;
          return {
            actions:[
              {
                tool:'write_script',
                args:{
                  path:'ServerScriptService/Main',
                  source:'return { value = ' + (repairCalls + 2) + ' }'
                }
              }
            ]
          };
        }
      },
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T13:34:00Z',
      config:{maxRepairCycles:1}
    });

    expect(run.status).toBe('failed');
    expect(repairCalls).toBe(1);
    expect(run.rollback.attempted).toBe(true);
  });
});
