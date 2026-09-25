import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

import {
  STARBLOX_STUDIO_CONNECTOR_TOOLS,
  STARBLOX_STUDIO_CONNECTOR_VERSION,
  createStarBloxLocalStudioAdapter
} from '../src/devFactory/localStudioConnector.js';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const i=process.argv.indexOf(name);
  if(i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')){
    return process.argv[i + 1];
  }
  return def;
}

function sleep(ms){
  return new Promise(resolveSleep=>setTimeout(resolveSleep,ms));
}

function hash(value){
  return 'sha256:' + createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function requirePeer(description,role){
  const peer=(description.peers || []).find(row =>
    row.instanceId === description.instanceId &&
    (
      row.role === role ||
      (role === 'client' && String(row.role).startsWith('client'))
    ) &&
    row.connectorVersion === STARBLOX_STUDIO_CONNECTOR_VERSION
  );
  if(!peer) throw new Error('missing attested Studio peer role: ' + role);
  const advertised=new Set(peer.tools || []);
  for(const tool of STARBLOX_STUDIO_CONNECTOR_TOOLS){
    if(['write_script','edit_script','create_instance','set_property','delete_instance'].includes(tool)){
      continue;
    }
    if(!advertised.has(tool) && ['search_tree','inspect_instance','list_children'].includes(tool)){
      throw new Error(role + ' peer missing required tool: ' + tool);
    }
  }
  return peer;
}

async function waitForRoles(adapter,roles,{timeoutMs=45_000}={}){
  const deadline=Date.now()+timeoutMs;
  let last=null;
  while(Date.now() < deadline){
    last=await adapter.describe();
    const ok=roles.every(role => {
      try{ requirePeer(last,role); return true; }catch{ return false; }
    });
    if(ok) return last;
    await sleep(750);
  }
  throw new Error(
    'timed out waiting for Studio roles ' + roles.join(', ') +
    '; last peers=' + JSON.stringify(last?.peers || [])
  );
}

const baseUrl=arg('--bridge-url',process.env.STARBLOX_STUDIO_BRIDGE_URL || 'http://127.0.0.1:38473');
const token=arg('--token',process.env.STARBLOX_STUDIO_BRIDGE_TOKEN || '');
const instanceId=arg('--instance-id',process.env.STARBLOX_STUDIO_INSTANCE_ID || 'default');
const outPath=resolve(process.cwd(),arg('--out','artifacts/same-day-starblox/studio-staging-smoke.json'));

const adapter=createStarBloxLocalStudioAdapter({baseUrl,token,instanceId});
const startedAt=new Date().toISOString();

const editDescription=await waitForRoles(adapter,['edit']);
requirePeer(editDescription,'edit');

const structure={};
for(const path of [
  'Workspace/StarBloxImported',
  'Workspace/StarBloxImported/brookhaven',
  'Workspace/StarBloxImported/robbing',
  'ReplicatedStorage/StarBlox',
  'ServerScriptService/StarBlox',
  'StarterPlayer/StarterPlayerScripts/StarBlox'
]){
  structure[path]=await adapter.call('inspect_instance',{path});
}

const imported=await adapter.call('list_children',{path:'Workspace/StarBloxImported'});
const importedNames=new Set((imported.children || []).map(row=>row.name));
for(const required of ['brookhaven','robbing']){
  if(!importedNames.has(required)){
    throw new Error('staging place missing imported source folder: ' + required);
  }
}

const treeSample=await adapter.call('search_tree',{
  root:'Workspace/StarBloxImported',
  limit:100
});
if(Number(treeSample.count || 0) < 2){
  throw new Error('staging place contains too little imported world content');
}

const logsBefore=await adapter.call('get_logs',{limit:200});
await adapter.call('start_playtest',{mode:'play'});

let playtestDescription;
let serverState;
let capture;
try{
  playtestDescription=await waitForRoles(adapter,['edit','server','client'],{timeoutMs:60_000});
  requirePeer(playtestDescription,'server');
  requirePeer(playtestDescription,'client');

  serverState=await adapter.call('playtest_sample_state',{
    domains:['players','world','runtime','performance'],
    sampleSeconds:0.75
  });
  if(serverState?.runtime?.isRunning !== true || serverState?.runtime?.isServer !== true){
    throw new Error('server playtest runtime evidence is invalid');
  }
  if(!Number.isFinite(Number(serverState?.performance?.averageHz))){
    throw new Error('server performance telemetry is missing');
  }

  capture=await adapter.call('capture_viewport',{maxWidth:1280,maxHeight:720});
  if(!(Number(capture?.width) > 0 && Number(capture?.height) > 0)){
    throw new Error('Studio viewport capture failed');
  }
}finally{
  try{ await adapter.call('stop_playtest',{}); }catch{}
}

await sleep(1000);
const logsAfter=await adapter.call('get_logs',{limit:300});
const receiptPayload={
  schemaVersion:1,
  version:'starblox-studio-staging-smoke-v1',
  status:'passed',
  startedAt,
  completedAt:new Date().toISOString(),
  bridge:{
    baseUrl,
    instanceId,
    connectorVersion:STARBLOX_STUDIO_CONNECTOR_VERSION,
    editPeers:editDescription.peers || [],
    playtestPeers:playtestDescription?.peers || []
  },
  structure:{
    importedChildren:imported.children || [],
    treeSampleCount:Number(treeSample.count || 0),
    verifiedPaths:Object.keys(structure)
  },
  runtime:{
    playerCount:Number(serverState?.playerCount || 0),
    worldValueCount:Number(serverState?.worldValueCount || 0),
    performance:serverState?.performance || null
  },
  viewport:{
    width:Number(capture?.width || 0),
    height:Number(capture?.height || 0),
    originalWidth:Number(capture?.originalWidth || capture?.width || 0),
    originalHeight:Number(capture?.originalHeight || capture?.height || 0),
    device:capture?.device || null
  },
  logs:{
    beforeCount:Array.isArray(logsBefore?.entries) ? logsBefore.entries.length : null,
    afterCount:Array.isArray(logsAfter?.entries) ? logsAfter.entries.length : null
  },
  mutationCalls:0,
  publicationAllowed:false
};
const receipt={...receiptPayload,receiptHash:hash(receiptPayload)};
await mkdir(dirname(outPath),{recursive:true});
await writeFile(outPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
