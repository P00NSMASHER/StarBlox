import { readFile,writeFile,lstat } from 'node:fs/promises';
import { dirname,isAbsolute,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { verifyBrookhavenAuthoritativeWorld } from './verify-brookhaven-authoritative-world.mjs';
import { deserializeBrookhavenWorldSource } from '../src/robloxWorld/serializedWorldParser.js';

function arg(name,def=null){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  if(inline) return inline.slice(name.length+1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index+1] && !process.argv[index+1].startsWith('--')){
    return process.argv[index+1];
  }
  return def;
}

function safeResolve(root,path,label){
  if(typeof path !== 'string' || !path.trim()) throw new Error(label + ' path is required');
  if(isAbsolute(path)) return resolve(path);
  const candidate=resolve(root,path);
  const rel=relative(root,candidate);
  if(rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)){
    throw new Error(label + ' escapes repository root');
  }
  return candidate;
}

function assertGeneratedOutputOutsideProtectedRoots(root,path,label){
  const abs=resolve(path);
  const protectedRoots=['src','roblox','research-inputs'].map(name => resolve(root,name));
  for(const protectedRoot of protectedRoots){
    const rel=relative(protectedRoot,abs);
    if(rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel))){
      throw new Error(label + ' may not write into protected repository source roots');
    }
  }
}

const thisFile=fileURLToPath(import.meta.url);
const root=resolve(dirname(thisFile),'..');
const manifestPath=arg(
  '--manifest',
  'research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json'
);
const snapshotPath=arg(
  '--fingerprint',
  'docs/roblox-world/STEP_2_IMMUTABLE_FINGERPRINT.json'
);
const outPath=arg('--out',null);
const receiptPath=arg('--receipt',null);

const fingerprint=await verifyBrookhavenAuthoritativeWorld({
  repositoryRoot:root,
  manifestPath
});

const snapshot=JSON.parse(await readFile(safeResolve(root,snapshotPath,'Step 2 fingerprint'),'utf8'));
if(snapshot.fingerprintHash !== fingerprint.fingerprintHash){
  throw new Error(
    'Step 2 fingerprint drift; expected ' + snapshot.fingerprintHash +
    ' but verified ' + fingerprint.fingerprintHash
  );
}
if(snapshot.source?.sha256 !== fingerprint.source?.sha256){
  throw new Error('Step 2 source identity drift');
}

const manifestAbs=safeResolve(root,manifestPath,'authoritative manifest');
const manifestInfo=await lstat(manifestAbs);
if(!manifestInfo.isFile() || manifestInfo.isSymbolicLink()){
  throw new Error('authoritative manifest must be a regular non-symlink file');
}
const manifest=JSON.parse(await readFile(manifestAbs,'utf8'));
const chunks=[...(manifest.repositoryFreeze?.chunks || [])]
  .sort((a,b)=>Number(a.order)-Number(b.order));

const buffers=[];
for(const chunk of chunks){
  const path=safeResolve(root,chunk.path,'world source chunk');
  const info=await lstat(path);
  if(!info.isFile() || info.isSymbolicLink()){
    throw new Error('world source chunks must be regular non-symlink files');
  }
  buffers.push(await readFile(path));
}
const source=Buffer.concat(buffers).toString('ascii');

const {ir,receipt}=deserializeBrookhavenWorldSource(source,{
  sourceSha256:fingerprint.source.sha256,
  step2FingerprintHash:fingerprint.fingerprintHash
});

if(outPath){
  const out=safeResolve(root,outPath,'IR output');
  assertGeneratedOutputOutsideProtectedRoots(root,out,'IR output');
  await writeFile(out,JSON.stringify(ir,null,2)+'\n');
}
if(receiptPath){
  const receiptOut=safeResolve(root,receiptPath,'receipt output');
  assertGeneratedOutputOutsideProtectedRoots(root,receiptOut,'receipt output');
  await writeFile(receiptOut,JSON.stringify(receipt,null,2)+'\n');
}

process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
