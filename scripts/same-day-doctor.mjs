import { spawnSync } from 'node:child_process';
import { readFile,stat } from 'node:fs/promises';
import { dirname,isAbsolute,resolve } from 'node:path';
import { buildSameDayPipelinePlan } from '../src/sameDayPipeline/sameDayPipeline.js';
import { ensurePinnedSource } from '../src/sameDayPipeline/sourceBootstrap.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (()=>{
    const i=process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function abs(base,value){
  return isAbsolute(value) ? resolve(value) : resolve(base,value);
}

function command(name,args=['--version']){
  const r=spawnSync(name,args,{encoding:'utf8'});
  return {
    ok:r.status === 0,
    detail:(r.stdout || r.stderr || '').trim().split('\n')[0] || null
  };
}

async function exists(path){
  try{ await stat(path); return true; }catch(error){
    if(error?.code === 'ENOENT') return false;
    throw error;
  }
}

const strictRuntime=process.argv.includes('--strict-runtime');
const manifestPath=resolve(process.cwd(),arg('--manifest',true));
const base=dirname(manifestPath);
const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
const plan=buildSameDayPipelinePlan(manifest);
const checks=[];

for(const [name,args] of [
  ['node',['--version']],
  ['git',['--version']],
  ['cargo',['--version']],
  [manifest.rojoCommand || 'rojo',['--version']]
]){
  const result=command(name,args);
  checks.push({id:'command:'+name,...result,required:true});
}

const adapterPath=abs(base,manifest.factoryAdapter);
checks.push({
  id:'factory-adapter',
  ok:await exists(adapterPath),
  required:true,
  detail:adapterPath
});

for(const source of [manifest.authorizedWorld,...(manifest.donors || [])]){
  const input=abs(base,source.input);
  try{
    const proof=await ensurePinnedSource({source,input});
    checks.push({
      id:'source:'+source.id,
      ok:proof.verified === true || !source.download,
      required:true,
      detail:proof.verified
        ? proof.sha256 + '/' + proof.bytes
        : input
    });
  }catch(error){
    checks.push({
      id:'source:'+source.id,
      ok:false,
      required:true,
      detail:error instanceof Error ? error.message : String(error)
    });
  }
}

for(const task of manifest.integrationTasks || []){
  if(!task.repository) continue;
  const checkout=abs(base,task.checkout);
  const present=await exists(resolve(checkout,'.git'));
  let ok=present;
  let detail=present ? checkout : 'will clone on pipeline run';
  if(present){
    const head=spawnSync('git',['-C',checkout,'rev-parse','HEAD'],{encoding:'utf8'});
    const sha=(head.stdout || '').trim().toLowerCase();
    ok=head.status === 0 && sha === task.commit.toLowerCase();
    detail=ok ? sha : 'expected '+task.commit+', found '+(sha || 'unreadable');
  }
  checks.push({
    id:'donor:'+task.id,
    ok:present ? ok : true,
    required:false,
    detail
  });
}

const bridgeUrl=process.env.STARBLOX_STUDIO_BRIDGE_URL || 'http://127.0.0.1:38473';
let bridge={ok:false,detail:'unreachable'};
try{
  const response=await fetch(bridgeUrl.replace(/\/$/,'') + '/health',{
    headers:process.env.STARBLOX_STUDIO_BRIDGE_TOKEN
      ? {'x-starblox-bridge-token':process.env.STARBLOX_STUDIO_BRIDGE_TOKEN}
      : {}
  });
  const payload=await response.json();
  bridge={
    ok:response.ok && payload?.ok === true,
    detail:response.ok
      ? JSON.stringify({service:payload.service,peers:payload.peers || []})
      : 'HTTP '+response.status
  };
}catch(error){
  bridge.detail=error instanceof Error ? error.message : String(error);
}
checks.push({
  id:'studio-bridge',
  ok:bridge.ok,
  required:strictRuntime,
  detail:bridge.detail
});

const agentCommand=String(process.env.STARBLOX_AGENT_COMMAND || '').trim();
checks.push({
  id:'agent-command',
  ok:Boolean(agentCommand),
  required:strictRuntime,
  detail:agentCommand || 'STARBLOX_AGENT_COMMAND not configured'
});

const blockers=checks.filter(row=>row.required && !row.ok);
const warnings=checks.filter(row=>!row.required && !row.ok);
const report={
  schemaVersion:1,
  version:'starblox-same-day-doctor-v1',
  mode:strictRuntime ? 'strict-runtime' : 'prep',
  ready:blockers.length === 0,
  planHash:plan.planHash,
  blockers,
  warnings,
  checks
};

console.log(JSON.stringify(report,null,2));
if(blockers.length){
  process.exitCode=2;
}