import { describe,expect,it } from 'vitest';

import {
  STARBLOX_STUDIO_CONNECTOR_TOOLS,
  STARBLOX_STUDIO_CONNECTOR_VERSION
} from '../devFactory/localStudioConnector.js';
import {
  runLiveStudioPlaytestProof,
  verifyLiveStudioEditAttestation
} from './liveStudioProof.js';

function description(roles=['edit']){
  return {
    service:'starblox-studio-bridge',
    instanceId:'studio-a',
    peers:roles.map(role => ({
      instanceId:'studio-a',
      role,
      connectorVersion:STARBLOX_STUDIO_CONNECTOR_VERSION,
      tools:[...STARBLOX_STUDIO_CONNECTOR_TOOLS]
    }))
  };
}

describe('Step 4: live Roblox Studio playtest proof', () => {
  it('rejects missing live edit peer attestation', () => {
    expect(() => verifyLiveStudioEditAttestation({
      service:'starblox-studio-bridge',
      instanceId:'studio-a',
      peers:[]
    })).toThrow(/missing edit peer/);
  });

  it('rejects stale connector protocols', () => {
    const stale=description();
    stale.peers[0].connectorVersion='stale-protocol';
    expect(() => verifyLiveStudioEditAttestation(stale)).toThrow(/protocol mismatch/);
  });

  it('requires a real server and client playtest before verifying', async () => {
    let describeCalls=0;
    const calls=[];
    const studio={
      has:tool => STARBLOX_STUDIO_CONNECTOR_TOOLS.includes(tool),
      async describe(){
        describeCalls+=1;
        return describe(describeCalls >= 2 ? ['edit','server','client-1'] : ['edit']);
      },
      async call(tool,args){
        calls.push({tool,args});
        if(tool === 'get_run_state') return {running:false,edit:true,role:'edit'};
        if(tool === 'start_playtest') return {success:true,mode:'play'};
        if(tool === 'playtest_sample_state'){
          return {
            runtime:{isRunning:true,isServer:true,isStudio:true},
            playerCount:1
          };
        }
        if(tool === 'get_logs') return {logs:[],count:0};
        if(tool === 'stop_playtest') return {success:true};
        throw new Error('unexpected tool: ' + tool);
      }
    };

    const proof=await runLiveStudioPlaytestProof(studio,{timeoutMs:100,pollMs:1});

    expect(proof).toEqual(expect.objectContaining({
      status:'verified',
      instanceId:'studio-a',
      connectorVersion:STARBLOX_STUDIO_CONNECTOR_VERSION,
      publicationStarted:false,
      publicationAllowed:false,
      liveActivationAllowed:false
    }));
    expect(proof.peerRoles).toEqual(['client-1','edit','server']);
    expect(calls.map(call => call.tool)).toEqual([
      'get_run_state',
      'start_playtest',
      'playtest_sample_state',
      'get_logs',
      'stop_playtest'
    ]);
  });

  it('fails closed when runtime peers never appear and attempts cleanup', async () => {
    const calls=[];
    const studio={
      has:tool => STARBLOX_STUDIO_CONNECTOR_TOOLS.includes(tool),
      async describe(){ return description(['edit']); },
      async call(tool){
        calls.push(tool);
        if(tool === 'get_run_state') return {running:false};
        if(tool === 'start_playtest') return {success:true};
        if(tool === 'stop_playtest') return {success:true};
        throw new Error('unexpected tool: ' + tool);
      }
    };

    await expect(
      runLiveStudioPlaytestProof(studio,{timeoutMs:5,pollMs:1})
    ).rejects.toThrow(/server and client peers/);
    expect(calls).toContain('stop_playtest');
  });

  it('rejects Studio error logs instead of certifying the playtest', async () => {
    let describeCalls=0;
    const calls=[];
    const studio={
      has:tool => STARBLOX_STUDIO_CONNECTOR_TOOLS.includes(tool),
      async describe(){
        describeCalls+=1;
        return description(describeCalls >= 2 ? ['edit','server','client'] : ['edit']);
      },
      async call(tool){
        calls.push(tool);
        if(tool === 'get_run_state') return {running:false};
        if(tool === 'start_playtest') return {success:true};
        if(tool === 'playtest_sample_state'){
          return {runtime:{isRunning:true,isServer:true,isStudio:true},playerCount:1};
        }
        if(tool === 'get_logs'){
          return {count:1,logs:[{type:'MessageError',message:'test failure'}]};
        }
        if(tool === 'stop_playtest') return {success:true};
        throw new Error('unexpected tool: ' + tool);
      }
    };

    await expect(
      runLiveStudioPlaytestProof(studio,{timeoutMs:100,pollMs:1})
    ).rejects.toThrow(/error logs/);
    expect(calls.filter(tool => tool === 'stop_playtest')).toHaveLength(1);
  });
});
