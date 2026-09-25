import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  createStarBloxLocalStudioAdapter
} from '../src/devFactory/localStudioConnector.js';
import {
  runLiveStudioPlaytestProof
} from '../src/robloxRuntime/liveStudioProof.js';
import {
  verifyStep6ReleaseGate
} from '../src/robloxRuntime/releaseGate.js';

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
const gatePath=arg('--release-gate',process.env.STARBLOX_RELEASE_GATE_RECEIPT || '');
const artifactPath=arg('--artifact',process.env.STARBLOX_RELEASE_ARTIFACT || '');
const step5Path=arg(
  '--step5',
  process.env.STARBLOX_STEP5_SNAPSHOT ||
  'docs/roblox-world/STEP_5_WORLD_EXACTNESS_AND_MOUNT.json'
);
const sourceCommit=arg('--source-commit',process.env.STARBLOX_SOURCE_COMMIT || '');

if(!gatePath) throw new Error('Step 6 live Studio proof requires --release-gate or STARBLOX_RELEASE_GATE_RECEIPT');
if(!artifactPath) throw new Error('Step 6 live Studio proof requires --artifact or STARBLOX_RELEASE_ARTIFACT');
if(!/^[a-f0-9]{40}$/.test(String(sourceCommit))){
  throw new Error('Step 6 live Studio proof requires the exact 40-character source commit');
}

const [gateBytes,step5Bytes,artifactBytes]=await Promise.all([
  readFile(resolve(gatePath)),
  readFile(resolve(step5Path)),
  readFile(resolve(artifactPath))
]);
const gate=JSON.parse(gateBytes.toString('utf8'));
const releaseBinding=verifyStep6ReleaseGate({
  gate,
  step5SnapshotBytes:step5Bytes,
  artifactBytes,
  sourceCommit
});

const studio=createStarBloxLocalStudioAdapter({
  baseUrl,
  instanceId,
  token
});

const proof=await runLiveStudioPlaytestProof(studio,{
  timeoutMs:Number(arg('--timeout-ms','20000')),
  pollMs:Number(arg('--poll-ms','250'))
});

const result=Object.freeze({
  ...proof,
  releaseGate:Object.freeze({
    version:gate.version,
    sourceCommit:releaseBinding.sourceCommit,
    artifactSha256:releaseBinding.artifactSha256,
    baselineModelSha256:releaseBinding.baselineModelSha256,
    mountedSubtreeSha256:releaseBinding.mountedSubtreeSha256
  })
});

const json=JSON.stringify(result,null,2)+'\n';
if(out) await writeFile(out,json);
process.stdout.write(json);
