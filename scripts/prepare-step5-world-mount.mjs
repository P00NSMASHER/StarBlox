import { createHash } from 'node:crypto';
import { chmod,lstat,mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,isAbsolute,relative,resolve,sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStep5MountProject } from '../src/robloxWorld/worldMountVerification.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : null;
}
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}
function within(root,path,label){
  const abs=resolve(path);
  const rel=relative(resolve(root),abs);
  if(rel==='..' || rel.startsWith('..'+sep) || isAbsolute(rel)) throw new Error(label+' escapes Roblox root');
  return abs;
}

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'..');
const robloxRoot=resolve(repo,'roblox');
const baseline=resolve(arg('--baseline') || '');
const lockPath=resolve(arg('--lock') || '');
const outProject=within(robloxRoot,arg('--out-project') || resolve(robloxRoot,'.step5-mounted.project.json'),'project');
const baselineCopy=within(robloxRoot,arg('--baseline-copy') || resolve(robloxRoot,'.step5-generated/BrookhavenWorldBaseline.rbxmx'),'baseline copy');
const receiptPath=resolve(arg('--receipt') || '/tmp/starblox-step5-mount-preparation.json');

for(const [path,label] of [[baseline,'baseline'],[lockPath,'lock'],[resolve(robloxRoot,'default.project.json'),'default project']]){
  const info=await lstat(path);
  if(!info.isFile() || info.isSymbolicLink()) throw new Error(label+' must be a regular non-symlink file');
}
const baselineBytes=await readFile(baseline);
const lock=JSON.parse(await readFile(lockPath,'utf8'));
if(lock?.status !== 'exactness-verified-and-baseline-locked') throw new Error('verified Step 5 exactness lock required');
if(sha256(baselineBytes) !== lock.baseline?.modelSha256 || baselineBytes.length !== lock.baseline?.bytes){
  throw new Error('baseline bytes do not match Step 5 exactness lock');
}

const baseProject=JSON.parse(await readFile(resolve(robloxRoot,'default.project.json'),'utf8'));
const baselineRel=relative(dirname(outProject),baselineCopy).replaceAll('\\','/');
const mountedProject=createStep5MountProject(baseProject,{baselinePath:baselineRel});
await mkdir(dirname(baselineCopy),{recursive:true});
await writeFile(baselineCopy,baselineBytes,{flag:'wx'});
await chmod(baselineCopy,0o444);
await writeFile(outProject,JSON.stringify(mountedProject,null,2)+'\n',{flag:'wx'});
const copied=await readFile(baselineCopy);
if(sha256(copied)!==lock.baseline.modelSha256) throw new Error('read-only baseline copy identity drift');

const receipt={
  schemaVersion:1,
  status:'step5-mount-prepared',
  baseline:{
    sourceSha256:sha256(baselineBytes),
    copiedSha256:sha256(copied),
    bytes:copied.length,
    copyMode:'0444-read-only'
  },
  project:{
    base:'roblox/default.project.json',
    generated:relative(repo,outProject).replaceAll('\\','/'),
    committed:false,
    ownsWorkspaceOnlyForEphemeralBuild:true
  },
  runtimeMounts:[
    'ReplicatedStorage/StarBlox',
    'ServerScriptService/StarBlox',
    'StarterPlayer/StarterPlayerScripts/StarBlox'
  ]
};
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify(receipt,null,2));
