import {
  STARBLOX_STUDIO_CONNECTOR_TOOLS,
  STARBLOX_STUDIO_CONNECTOR_VERSION
} from '../devFactory/localStudioConnector.js';

function sleep(ms){
  return new Promise(resolve => setTimeout(resolve,ms));
}

function peersFor(description,instanceId){
  return (Array.isArray(description?.peers) ? description.peers : [])
    .filter(peer => String(peer?.instanceId || '') === instanceId);
}

function requirePeer(peers,roleMatcher,label){
  const peer=peers.find(roleMatcher);
  if(!peer) throw new Error('live Studio attestation missing ' + label + ' peer');
  if(peer.connectorVersion !== STARBLOX_STUDIO_CONNECTOR_VERSION){
    throw new Error(label + ' peer connector protocol mismatch');
  }
  return peer;
}

export function verifyLiveStudioEditAttestation(description){
  if(description?.service !== 'starblox-studio-bridge'){
    throw new Error('unexpected Studio bridge service');
  }

  const instanceId=String(description?.instanceId || '');
  if(!instanceId) throw new Error('Studio instanceId is missing');

  const peers=peersFor(description,instanceId);
  const edit=requirePeer(peers,peer => peer.role === 'edit','edit');
  const advertised=new Set(Array.isArray(edit.tools) ? edit.tools : []);
  const missing=STARBLOX_STUDIO_CONNECTOR_TOOLS.filter(tool => !advertised.has(tool));
  if(missing.length){
    throw new Error('edit peer is missing tools: ' + missing.join(', '));
  }

  return {
    instanceId,
    editPeer:true,
    connectorVersion:edit.connectorVersion,
    connectedTools:[...advertised].sort()
  };
}

async function waitForRuntimePeers(studio,instanceId,{timeoutMs,pollMs}){
  const deadline=Date.now()+timeoutMs;
  while(Date.now() < deadline){
    const description=await studio.describe();
    const peers=peersFor(description,instanceId);
    const server=peers.find(peer => peer.role === 'server');
    const client=peers.find(peer => String(peer.role || '').startsWith('client'));
    if(server && client){
      requirePeer(peers,peer => peer.role === 'server','server');
      requirePeer(peers,peer => String(peer.role || '').startsWith('client'),'client');
      return {
        serverRole:server.role,
        clientRole:client.role,
        peerRoles:[...new Set(peers.map(peer => peer.role))].sort()
      };
    }
    await sleep(pollMs);
  }
  throw new Error('live Studio playtest did not expose server and client peers before timeout');
}

function hasErrorLogs(result){
  return (Array.isArray(result?.logs) ? result.logs : []).some(row =>
    /error|messageerror/i.test(String(row?.type || '')) ||
    /\berror\b|traceback|stack trace|attempt to/i.test(String(row?.message || ''))
  );
}

export async function runLiveStudioPlaytestProof(studio,{
  timeoutMs=20_000,
  pollMs=250
}={}){
  if(!studio || typeof studio.describe !== 'function' || typeof studio.call !== 'function'){
    throw new TypeError('live Studio proof requires an attested Studio adapter');
  }

  for(const tool of [
    'get_run_state',
    'start_playtest',
    'stop_playtest',
    'playtest_sample_state',
    'get_logs'
  ]){
    if(typeof studio.has === 'function' && !studio.has(tool)){
      throw new Error('live Studio adapter is missing required tool: ' + tool);
    }
  }

  const editAttestation=verifyLiveStudioEditAttestation(await studio.describe());
  const initial=await studio.call('get_run_state',{});
  if(initial?.running){
    throw new Error('live Studio proof requires edit mode before starting its own playtest');
  }

  let started=false;
  let stopped=false;
  try{
    const start=await studio.call('start_playtest',{mode:'play'});
    if(start?.success !== true){
      throw new Error('Studio did not acknowledge playtest start');
    }
    started=true;

    const runtimePeers=await waitForRuntimePeers(
      studio,
      editAttestation.instanceId,
      {timeoutMs,pollMs}
    );

    const sample=await studio.call('playtest_sample_state',{
      domains:['runtime','players']
    });
    if(
      sample?.runtime?.isRunning !== true ||
      sample?.runtime?.isServer !== true ||
      sample?.runtime?.isStudio !== true
    ){
      throw new Error('server runtime sample did not prove an active Studio playtest');
    }

    const logs=await studio.call('get_logs',{filter:'errors',limit:100});
    if(hasErrorLogs(logs)){
      throw new Error('Studio emitted error logs during native playtest');
    }

    const stop=await studio.call('stop_playtest',{});
    if(stop?.success !== true){
      throw new Error('Studio did not acknowledge playtest stop');
    }
    stopped=true;

    return Object.freeze({
      schemaVersion:1,
      proofVersion:'starblox-live-studio-playtest-v1',
      status:'verified',
      instanceId:editAttestation.instanceId,
      connectorVersion:editAttestation.connectorVersion,
      peerRoles:runtimePeers.peerRoles,
      runtime:Object.freeze({
        isRunning:true,
        isServer:true,
        isStudio:true,
        playerCount:Number(sample?.playerCount ?? 0)
      }),
      errorLogCount:Number(logs?.count ?? 0),
      publicationStarted:false,
      publicationAllowed:false,
      liveActivationAllowed:false
    });
  }finally{
    if(started && !stopped){
      try{
        await studio.call('stop_playtest',{});
      }catch{
        // Preserve the original proof failure. The caller must inspect Studio manually
        // if emergency stop acknowledgement also failed.
      }
    }
  }
}
