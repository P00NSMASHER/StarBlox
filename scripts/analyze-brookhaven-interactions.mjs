import {readFile,writeFile,lstat} from 'node:fs/promises';
import {dirname,isAbsolute,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

import {verifyBrookhavenAuthoritativeWorld} from './verify-brookhaven-authoritative-world.mjs';
import {deserializeBrookhavenWorldSource} from '../src/robloxWorld/serializedWorldParser.js';
import {buildBrookhavenInteractionCandidateManifest} from '../src/robloxWorld/interactionCandidateAnalysis.js';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const index=process.argv.indexOf(name);
  if(index>=0 && process.argv[index+1] && !process.argv[index+1].startsWith('--')){
    return process.argv[index+1];
  }
  return def;
}

function safeResolve(root,path,label){
  if(typeof path!=='string'||!path.trim()) throw new Error(label+' path is required');
  if(isAbsolute(path)) return resolve(path);
  const candidate=resolve(root,path);
  const rel=relative(root,candidate);
  if(rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)) throw new Error(label+' escapes repository root');
  return candidate;
}

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const manifestPath=arg('--manifest','research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json');
const step3Path=arg('--step3','docs/roblox-world/STEP_3_SAFE_DESERIALIZATION.json');
const outPath=arg('--out',null);

const fingerprint=await verifyBrookhavenAuthoritativeWorld({repositoryRoot:root,manifestPath});
const manifest=JSON.parse(await readFile(safeResolve(root,manifestPath,'manifest'),'utf8'));
const step3=JSON.parse(await readFile(safeResolve(root,step3Path,'Step 3 receipt'),'utf8')).receipt;

const buffers=[];
for(const chunk of [...manifest.repositoryFreeze.chunks].sort((a,b)=>Number(a.order)-Number(b.order))){
  const chunkPath=safeResolve(root,chunk.path,'world source chunk');
  const info=await lstat(chunkPath);
  if(!info.isFile()||info.isSymbolicLink()) throw new Error('world source chunks must be regular files');
  buffers.push(await readFile(chunkPath));
}
const source=Buffer.concat(buffers).toString('ascii');
const {ir}=deserializeBrookhavenWorldSource(source,{
  sourceSha256:fingerprint.source.sha256,
  step2FingerprintHash:fingerprint.fingerprintHash
});
const candidateManifest=buildBrookhavenInteractionCandidateManifest(ir,{
  irHash:'sha256:558cb27979f308a171fc33165bddc5ee078326bd4aed4483a1a46f4f7ba8caba'
});

if(outPath){
  await writeFile(safeResolve(root,outPath,'interaction candidate output'),JSON.stringify(candidateManifest,null,2)+'\n');
}
process.stdout.write(JSON.stringify(candidateManifest,null,2)+'\n');
