import { spawnSync } from 'node:child_process';

import { createStarBloxLocalStudioAdapter } from '../../src/devFactory/localStudioConnector.js';

function parseArgs(){
  const raw=process.env.STARBLOX_AGENT_ARGS;
  if(!raw) return [];
  const value=JSON.parse(raw);
  if(!Array.isArray(value)) throw new Error('STARBLOX_AGENT_ARGS must be a JSON array');
  return value.map(String);
}

const agentCommand=String(process.env.STARBLOX_AGENT_COMMAND || '').trim();
if(!agentCommand){
  throw new Error(
    'STARBLOX_AGENT_COMMAND is required. Point it at a local agent wrapper that reads JSON from stdin ' +
    'and returns one JSON object on stdout.'
  );
}
const agentArgs=parseArgs();

function invokeAgent(role,context){
  const payload={
    protocol:'starblox-factory-agent-v1',
    role,
    context
  };
  const result=spawnSync(agentCommand,[...agentArgs,role],{
    input:JSON.stringify(payload),
    encoding:'utf8',
    maxBuffer:64 * 1024 * 1024,
    env:{...process.env}
  });
  if(result.error) throw new Error('could not start agent command: ' + result.error.message);
  if(result.status !== 0){
    throw new Error(
      'agent command failed for ' + role + ': ' +
      (result.stderr || result.stdout || ('exit ' + result.status)).trim()
    );
  }
  try{
    return JSON.parse(result.stdout);
  }catch{
    throw new Error('agent command returned invalid JSON for role ' + role);
  }
}

const studio=createStarBloxLocalStudioAdapter({
  baseUrl:process.env.STARBLOX_STUDIO_BRIDGE_URL || 'http://127.0.0.1:38473',
  token:process.env.STARBLOX_STUDIO_BRIDGE_TOKEN || '',
  instanceId:process.env.STARBLOX_STUDIO_INSTANCE_ID || 'default'
});

export default {
  studio,
  agents:{
    plan:async context=>invokeAgent('plan',context),
    code:async context=>invokeAgent('code',context),
    review:async context=>invokeAgent('review',context),
    repair:async context=>invokeAgent('repair',context),
    visualReview:async context=>invokeAgent('visual-review',context)
  },
  config:{
    maxRepairCycles:2,
    maxTotalMutationCalls:120,
    maxToolCallsPerBatch:50,
    allowDestructive:false,
    allowExecuteLuau:false,
    confirmed:false,
    keepFailedChanges:false
  }
};
