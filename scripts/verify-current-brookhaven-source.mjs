import {lstat,readFile,writeFile} from 'node:fs/promises';
import {basename,resolve} from 'node:path';
import {buildCurrentBrookhavenSourceReceipt} from '../src/robloxWorld/currentBrookhavenSourceGate.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  const value=inline ? inline.slice(name.length+1) : (() => {
    const i=process.argv.indexOf(name);
    return i>=0 ? process.argv[i+1] : null;
  })();
  if(required && !value) throw new Error(name+' is required');
  return value;
}

const candidatePath=resolve(arg('--candidate',true));
const out=arg('--out',null);
const info=await lstat(candidatePath);
if(info.isSymbolicLink() || !info.isFile()){
  throw new Error('candidate must be a regular non-symlink file');
}
const bytes=await readFile(candidatePath);
const referenceManifest=JSON.parse(
  await readFile(resolve('research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json'),'utf8')
);
const receipt=buildCurrentBrookhavenSourceReceipt({
  candidateBytes:bytes,
  fileName:basename(candidatePath),
  placeId:arg('--place-id',true),
  placeVersion:arg('--place-version',true),
  capturedAt:arg('--captured-at',true),
  captureMethod:arg('--capture-method') || 'authorized-studio-export',
  referenceSourceSha256:referenceManifest.source.sha256
});
const json=JSON.stringify(receipt,null,2)+'\n';
if(out) await writeFile(resolve(out),json);
process.stdout.write(json);
