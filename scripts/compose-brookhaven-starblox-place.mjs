import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {dirname,isAbsolute,relative,resolve,sep} from 'node:path';

import {createBrookhavenMountedProject} from '../src/robloxWorld/worldMountProject.js';

function arg(name){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const index=process.argv.indexOf(name);
  return index>=0 ? process.argv[index+1] : null;
}
function digest(data){ return createHash('sha256').update(data).digest('hex'); }
function absolute(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new Error(label+' is required');
  return isAbsolute(value) ? resolve(value) : resolve(process.cwd(),value);
}
function run(command,args,{cwd=process.cwd()}={}){
  const result=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:64*1024*1024});
  if(result.error) throw result.error;
  if(result.status !== 0){
    throw new Error(command+' failed ('+result.status+'): '+(result.stderr||result.stdout||'').trim());
  }
  return (result.stdout||'').trim();
}
function receiptHash(payload){
  return 'sha256:'+digest(Buffer.from(JSON.stringify(payload),'utf8'));
}

const outPath=absolute(arg('--out'),'--out');
const receiptPath=absolute(arg('--receipt'),'--receipt');
const repoRoot=process.cwd();
const robloxDir=resolve(repoRoot,'roblox');
const baseProjectPath=resolve(robloxDir,'default.project.json');
const generatedProjectPath=resolve(robloxDir,'.step5.generated.project.json');
const step4Path=resolve(repoRoot,'docs/roblox-world/STEP_4_ISOLATED_GENERATION.json');
const verifierManifest=resolve(repoRoot,'tools/roblox_world_mount_verifier/Cargo.toml');
const temp=await mkdtemp(resolve(tmpdir(),'starblox-step5-'));
const baselinePath=resolve(temp,'BrookhavenWorldBaseline.rbxmx');
const generationReceiptPath=resolve(temp,'generation-receipt.json');

try{
  run(process.execPath,[
    resolve(repoRoot,'scripts/generate-brookhaven-world.mjs'),
    '--out',baselinePath,
    '--receipt',generationReceiptPath
  ]);

  const step4Bytes=await readFile(step4Path);
  const step4=JSON.parse(step4Bytes.toString('utf8'));
  const generation=JSON.parse(await readFile(generationReceiptPath,'utf8'));
  const baselineBytes=await readFile(baselinePath);

  if(generation.output?.sha256 !== step4.receipt?.output?.sha256 ||
     generation.output?.bytes !== step4.receipt?.output?.bytes ||
     generation.output?.generatedEntrySequenceSha256 !== step4.receipt?.output?.generatedEntrySequenceSha256){
    throw new Error('live Step 4 generation does not match the verified Step 4 snapshot');
  }
  if(digest(baselineBytes) !== step4.receipt.output.sha256){
    throw new Error('generated Brookhaven baseline bytes do not match Step 4 SHA-256');
  }

  const baseProjectBytes=await readFile(baseProjectPath);
  const baseProject=JSON.parse(baseProjectBytes.toString('utf8'));
  const worldPath=relative(robloxDir,baselinePath).split(sep).join('/');
  const project=createBrookhavenMountedProject(baseProject,worldPath);
  const projectBytes=Buffer.from(JSON.stringify(project,null,2)+'\n','utf8');
  await writeFile(generatedProjectPath,projectBytes);

  const rojo=process.platform === 'win32' ? 'rojo.exe' : 'rojo';
  run(rojo,['build',generatedProjectPath,'--output',outPath]);

  const mountedBytes=await readFile(outPath);
  const verifierRaw=run('cargo',[
    'run','--quiet',
    '--manifest-path',verifierManifest,
    '--',
    baselinePath,
    outPath
  ]);
  const verifier=JSON.parse(verifierRaw);

  if(verifier?.ok !== true ||
     verifier?.world?.propertyExact !== true ||
     verifier?.world?.instanceCount !== step4.receipt.output.generatedObjectCount ||
     verifier?.world?.scriptCount !== 0 ||
     verifier?.world?.remoteCount !== 0 ||
     verifier?.starBlox?.replicatedStorageRoot !== true ||
     verifier?.starBlox?.serverScriptServiceRoot !== true ||
     verifier?.starBlox?.starterPlayerScriptsRoot !== true){
    throw new Error('Step 5 mount verifier returned incomplete evidence');
  }

  const base={
    schemaVersion:1,
    version:'starblox-brookhaven-world-mount-v1',
    step:'target-architecture-5-of-6',
    status:'verified-property-exact-starblox-mount',
    input:{
      step4Snapshot:{
        file:'docs/roblox-world/STEP_4_ISOLATED_GENERATION.json',
        sha256:digest(step4Bytes)
      },
      brookhavenWorld:{
        sourceStep4Sha256:step4.receipt.output.sha256,
        generatedSha256:digest(baselineBytes),
        bytes:baselineBytes.length,
        generatedEntrySequenceSha256:generation.output.generatedEntrySequenceSha256
      },
      starBloxProject:{
        file:'roblox/default.project.json',
        sha256:digest(baseProjectBytes)
      }
    },
    composition:{
      worldPath:'Workspace/BrookhavenWorldBaseline',
      projectSha256:digest(projectBytes),
      method:'temporary-rojo-project-exact-rbxmx-mount',
      baselineMutated:false
    },
    verification:verifier,
    output:{
      format:'rbxlx',
      bytes:mountedBytes.length,
      sha256:digest(mountedBytes)
    },
    boundaries:{
      studioMutationStarted:false,
      productionPlaceMutated:false,
      publicationStarted:false,
      liveActivationAllowed:false
    },
    nextStep:'target-architecture-6-private-publish-and-real-client-verification'
  };
  const receipt={...base,receiptHash:receiptHash(base)};
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
}finally{
  await rm(generatedProjectPath,{force:true});
  await rm(temp,{recursive:true,force:true});
}
