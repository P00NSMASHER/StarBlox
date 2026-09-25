import { describe,expect,it } from 'vitest';

import {
  buildStarBloxHeadlessProbeScript,
  runStarBloxOpenCloudProof
} from './openCloudProof.js';

function response(status,payload,headers={}){
  const normalized=Object.fromEntries(
    Object.entries(headers).map(([key,value]) => [key.toLowerCase(),String(value)])
  );
  return {
    ok:status >= 200 && status < 300,
    status,
    headers:{
      get(name){
        return normalized[String(name).toLowerCase()] ?? null;
      }
    },
    async text(){ return JSON.stringify(payload); }
  };
}

describe('Step 4: Roblox Open Cloud headless proof', () => {
  it('builds a non-mutating probe bound to the exact StarBlox IDs', () => {
    const script=buildStarBloxHeadlessProbeScript({
      universeId:'6027194615',
      placeId:'17602626136'
    });
    expect(script).toContain('game.GameId == 6027194615');
    expect(script).toContain('game.PlaceId == 17602626136');
    expect(script).toContain('RunService:IsServer()');
    expect(script).toContain('not RunService:IsStudio()');
    expect(script).not.toMatch(/SavePlaceAsync|SetAsync|RemoveAsync|PublishAsync/);
  });

  it('verifies a real-task-shaped response only after matching logs', async () => {
    const calls=[];
    let statusReads=0;
    const fetchImpl=async (url,options={}) => {
      calls.push({url,options});
      if(options.method === 'POST'){
        return response(200,{
          path:'universes/6027194615/places/17602626136/versions/7/luau-execution-sessions/session-a/tasks/task-a',
          state:'PROCESSING'
        });
      }
      if(url.endsWith('/logs')){
        return response(200,{
          luauExecutionSessionTaskLogs:[{
            messages:['STARBLOX_OPEN_CLOUD_PROOF_OK universe=6027194615 place=17602626136 server=true studio=false version=7']
          }]
        });
      }
      statusReads+=1;
      return response(200,{
        path:'universes/6027194615/places/17602626136/versions/7/luau-execution-sessions/session-a/tasks/task-a',
        state:statusReads === 1 ? 'PROCESSING' : 'COMPLETE',
        output:{results:['6027194615','17602626136','7']}
      });
    };

    const proof=await runStarBloxOpenCloudProof({
      apiKey:'test-key',
      universeId:'6027194615',
      placeId:'17602626136',
      fetchImpl,
      pollIntervalMs:0,
      timeoutMs:1000
    });

    expect(proof).toEqual(expect.objectContaining({
      status:'verified',
      universeId:'6027194615',
      placeId:'17602626136',
      publicationStarted:false,
      placeMutationPerformed:false,
      liveActivationAllowed:false
    }));
    expect(proof.evidence).toEqual({
      headlessRobloxServer:true,
      serverRuntime:true,
      studioRuntime:false,
      exactTargetIds:true,
      logSentinelVerified:true
    });
    expect(calls[0].options.headers['x-api-key']).toBe('test-key');
  });

  it('retries bounded Roblox task-creation throttling and honors Retry-After', async () => {
    let postAttempts=0;
    const fetchImpl=async (url,options={}) => {
      if(options.method === 'POST'){
        postAttempts+=1;
        if(postAttempts === 1){
          return response(
            429,
            {message:'Luau task creation rate limit exceeded'},
            {'retry-after':'0'}
          );
        }
        return response(200,{
          path:'universes/6027194615/places/17602626136/versions/9/luau-execution-sessions/session-r/tasks/task-r',
          state:'COMPLETE'
        });
      }
      if(url.endsWith('/logs')){
        return response(200,{
          messages:[
            'STARBLOX_OPEN_CLOUD_PROOF_OK universe=6027194615 place=17602626136 server=true studio=false version=9'
          ]
        });
      }
      return response(200,{
        path:'universes/6027194615/places/17602626136/versions/9/luau-execution-sessions/session-r/tasks/task-r',
        state:'COMPLETE'
      });
    };

    const proof=await runStarBloxOpenCloudProof({
      apiKey:'key',
      universeId:'6027194615',
      placeId:'17602626136',
      fetchImpl,
      createRetryAttempts:2,
      createRetryBaseMs:0,
      createRetryMaxMs:0,
      pollIntervalMs:0
    });

    expect(postAttempts).toBe(2);
    expect(proof.status).toBe('verified');
    expect(proof.evidence.logSentinelVerified).toBe(true);
  });

  it('fails closed on missing credentials, task errors, or missing sentinel logs', async () => {
    await expect(runStarBloxOpenCloudProof({
      apiKey:'',
      universeId:'6027194615',
      placeId:'17602626136',
      fetchImpl:async () => response(500,{})
    })).rejects.toThrow(/API_KEY/);

    const failedFetch=async (_url,options={}) => {
      if(options.method === 'POST'){
        return response(200,{path:'task/path',state:'PROCESSING'});
      }
      return response(200,{path:'task/path',state:'FAILED',error:{message:'probe failed'}});
    };
    await expect(runStarBloxOpenCloudProof({
      apiKey:'key',
      universeId:'6027194615',
      placeId:'17602626136',
      fetchImpl:failedFetch,
      pollIntervalMs:0
    })).rejects.toThrow(/probe failed/);

    const noSentinelFetch=async (url,options={}) => {
      if(options.method === 'POST'){
        return response(200,{path:'task/path',state:'COMPLETE'});
      }
      if(url.endsWith('/logs')) return response(200,{messages:['other log']});
      return response(200,{path:'task/path',state:'COMPLETE'});
    };
    await expect(runStarBloxOpenCloudProof({
      apiKey:'key',
      universeId:'6027194615',
      placeId:'17602626136',
      fetchImpl:noSentinelFetch
    })).rejects.toThrow(/sentinel/);
  });
});
