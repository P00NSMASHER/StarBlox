import { readFile,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { assertPublishCompatibleXml } from '../src/robloxRuntime/privatePublish.js';
import { buildStep6ReleaseGate } from '../src/robloxRuntime/releaseGate.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  const value=inline ? inline.slice(name.length+1) : (() => {
    const i=process.argv.indexOf(name);
    return i>=0 ? process.argv[i+1] : null;
  })();
  if(required && !value) throw new Error(name+' is required');
  return value;
}
const step5Path=resolve(arg('--step5',true));
const lockPath=resolve(arg('--lock',true));
const mountPath=resolve(arg('--mount',true));
const artifactPath=resolve(arg('--artifact',true));
const sourceCommit=String(arg('--source-commit',true));
const out=resolve(arg('--out',true));

const [step5Bytes,lockBytes,mountBytes,artifactBytes]=await Promise.all([
  readFile(step5Path),
  readFile(lockPath),
  readFile(mountPath),
  readFile(artifactPath)
]);
const step5=JSON.parse(step5Bytes.toString('utf8'));
const lock=JSON.parse(lockBytes.toString('utf8'));
const mount=JSON.parse(mountBytes.toString('utf8'));
assertPublishCompatibleXml(artifactBytes.toString('utf8'));

const gate=buildStep6ReleaseGate({
  step5Snapshot:step5,
  step5SnapshotBytes:step5Bytes,
  liveExactnessLock:lock,
  liveMountReceipt:mount,
  artifactBytes,
  sourceCommit
});
await writeFile(out,JSON.stringify(gate,null,2)+'\n');
process.stdout.write(JSON.stringify(gate,null,2)+'\n');
