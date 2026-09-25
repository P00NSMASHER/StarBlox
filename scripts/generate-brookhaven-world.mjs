import { createHash } from 'node:crypto';
import { lstat,readFile,writeFile } from 'node:fs/promises';
import { dirname,isAbsolute,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyBrookhavenAuthoritativeWorld } from './verify-brookhaven-authoritative-world.mjs';
import { deserializeBrookhavenWorldSource } from '../src/robloxWorld/serializedWorldParser.js';
import { generateIsolatedBrookhavenWorld } from '../src/robloxWorld/worldModelGenerator.js';

function arg(name,def=null){
  const inline=process.argv.find(value => value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index+1] && !process.argv[index+1].startsWith('--')){
    return process.argv[index+1];
  }
  return def;
}
function safeResolve(root,path,label,{allowAbsolute=false}={}){
  if(typeof path !== 'string' || !path.trim()) throw new Error(label+' path is required');
  if(isAbsolute(path)){
    if(!allowAbsolute) throw new Error(label+' must be repository-relative');
    return resolve(path);
  }
  const candidate=resolve(root,path);
  const rel=relative(root,candidate);
  if(rel === '..' || rel.startsWith('..'+sep) || isAbsolute(rel)){
    throw new Error(label+' escapes repository root');
  }
  return candidate;
}
function assertGeneratedOutput(root,path,label){
  const abs=resolve(path);
  for(const name of ['src','roblox','research-inputs','docs']){
    const protectedRoot=resolve(root,name);
    const rel=relative(protectedRoot,abs);
    if(rel === '' || (!rel.startsWith('..'+sep) && rel !== '..' && !isAbsolute(rel))){
      throw new Error(label+' may not overwrite protected repository roots');
    }
  }
}
function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const manifestPath='research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json';
const step2Path='docs/roblox-world/STEP_2_IMMUTABLE_FINGERPRINT.json';
const step3Path='docs/roblox-world/STEP_3_SAFE_DESERIALIZATION.json';
const outRaw=arg('--out');
const receiptRaw=arg('--receipt');
if(!outRaw || !receiptRaw) throw new Error('--out and --receipt are required');

const outPath=safeResolve(root,outRaw,'generated model',{allowAbsolute:true});
const receiptPath=safeResolve(root,receiptRaw,'generation receipt',{allowAbsolute:true});
assertGeneratedOutput(root,outPath,'generated model');
assertGeneratedOutput(root,receiptPath,'generation receipt');

const fingerprint=await verifyBrookhavenAuthoritativeWorld({
  repositoryRoot:root,
  manifestPath
});
const step2=JSON.parse(await readFile(resolve(root,step2Path),'utf8'));
if(step2.fingerprintHash !== fingerprint.fingerprintHash){
  throw new Error('Step 2 fingerprint drift before Step 4 generation');
}

const step3Snapshot=JSON.parse(await readFile(resolve(root,step3Path),'utf8'));
const step3Receipt=step3Snapshot.receipt;
if(step3Receipt?.source?.step2FingerprintHash !== step2.fingerprintHash){
  throw new Error('Step 3 receipt is not bound to current Step 2 fingerprint');
}

const manifestAbs=resolve(root,manifestPath);
const manifestInfo=await lstat(manifestAbs);
if(!manifestInfo.isFile() || manifestInfo.isSymbolicLink()){
  throw new Error('authoritative source manifest must be a regular non-symlink file');
}
const manifest=JSON.parse(await readFile(manifestAbs,'utf8'));
const chunks=[...(manifest.repositoryFreeze?.chunks || [])]
  .sort((a,b)=>Number(a.order)-Number(b.order));
const buffers=[];
for(const chunk of chunks){
  const path=resolve(root,chunk.path);
  const info=await lstat(path);
  if(!info.isFile() || info.isSymbolicLink()) throw new Error('world source chunk must be a regular file');
  buffers.push(await readFile(path));
}
const source=Buffer.concat(buffers).toString('ascii');
const {ir,receipt:liveStep3Receipt}=deserializeBrookhavenWorldSource(source,{
  sourceSha256:fingerprint.source.sha256,
  step2FingerprintHash:fingerprint.fingerprintHash
});
if(JSON.stringify(liveStep3Receipt) !== JSON.stringify(step3Receipt)){
  throw new Error('live Step 3 receipt drift before generation');
}

const {xml,receipt}=generateIsolatedBrookhavenWorld(ir,{step3Receipt});
const bytes=Buffer.from(xml,'utf8');
if(sha256(bytes) !== receipt.output.sha256 || bytes.length !== receipt.output.bytes){
  throw new Error('generated model receipt identity mismatch');
}

await writeFile(outPath,bytes);
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
