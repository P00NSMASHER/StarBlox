import { writeFile } from 'node:fs/promises';

import {
  createStarBloxLocalStudioAdapter
} from '../src/devFactory/localStudioConnector.js';
import {
  runLiveStudioPlaytestProof
} from '../src/robloxRuntime/liveStudioProof.js';

function arg(name,def=null){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')){
    return process.argv[index + 1];
  }
  return def;
}

const baseUrl=arg('--bridge',process.env.STARBLOX_STUDIO_BRIDGE_URL || 'http://127.0.0.1:38473');
const instanceId=arg('--instance',process.env.STARBLOX_STUDIO_INSTANCE_ID || 'default');
const token=arg('--token',process.env.STARBLOX_STUDIO_BRIDGE_TOKEN || '');
const out=arg('--out',null);

const studio=createStarBloxLocalStudioAdapter({
  baseUrl,
  instanceId,
  token
});

const proof=await runLiveStudioPlaytestProof(studio,{
  timeoutMs:Number(arg('--timeout-ms','20000')),
  pollMs:Number(arg('--poll-ms','250'))
});

const json=JSON.stringify(proof,null,2)+'\n';
if(out) await writeFile(out,json);
process.stdout.write(json);
