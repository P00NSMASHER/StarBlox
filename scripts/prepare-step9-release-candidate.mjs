import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir,readFile,rm,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  const value=inline ? inline.slice(name.length+1) : (() => {
    const index=process.argv.indexOf(name);
    return index>=0 ? process.argv[index+1] : null;
  })();
  if(required && !value) throw new Error(name+' is required');
  return value;
}
function run(command,args,label,{capture=false}={}){
  const result=spawnSync(command,args,{
    cwd:process.cwd(),
    encoding:'utf8',
    maxBuffer:128*1024*1024
  });
  if(result.error) throw new Error(label+' could not start: '+result.error.message);
  if(result.status!==0){
    throw new Error(label+' failed ('+result.status+'): '+String(result.stderr||result.stdout||'').trim());
  }
  return capture ? String(result.stdout||'') : '';
}
function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

const sourceCommit=String(arg('--source-commit',true)).toLowerCase();
if(!/^[a-f0-9]{40}$/.test(sourceCommit)){
  throw new Error('--source-commit must be an exact 40-character Git SHA');
}
const outDir=resolve(arg('--out-dir') || 'artifacts/step9-release-candidate');
const step5Path=resolve('docs/roblox-world/STEP_5_WORLD_EXACTNESS_AND_MOUNT.json');
const worldPath=resolve(outDir,'BrookhavenWorldBaseline.rbxmx');
const generationReceiptPath=resolve(outDir,'generation-receipt.json');
const lockPath=resolve(outDir,'step5-exactness-lock.json');
const isolatedDomPath=resolve(outDir,'isolated-dom.json');
const mountedProjectPath=resolve('roblox/.step5-mounted.project.json');
const mountedBaselinePath=resolve('roblox/.step5-generated/BrookhavenWorldBaseline.rbxmx');
const mountPreparationPath=resolve(outDir,'step5-mount-preparation.json');
const mountedPlacePath=resolve(outDir,'StarBlox-Step9-Step6-Gated.rbxlx');
const mountedDomPath=resolve(outDir,'mounted-dom.json');
const mountReceiptPath=resolve(outDir,'step5-mount-receipt.json');
const releaseGatePath=resolve(outDir,'step6-release-gate.json');

await rm(outDir,{recursive:true,force:true});
await rm(mountedProjectPath,{force:true});
await rm(resolve('roblox/.step5-generated'),{recursive:true,force:true});
await mkdir(outDir,{recursive:true});

run(process.execPath,[
  resolve('scripts/generate-brookhaven-world.mjs'),
  '--out',worldPath,
  '--receipt',generationReceiptPath
],'Brookhaven world generation');

const [step5,worldBytes,generation]=await Promise.all([
  readFile(step5Path,'utf8').then(JSON.parse),
  readFile(worldPath),
  readFile(generationReceiptPath,'utf8').then(JSON.parse)
]);
if(step5?.status!=='verified-exact-world-with-starblox-mounted-beside-it'){
  throw new Error('checked-in Step 5 snapshot is not verified');
}
const lock=step5.exactnessLock;
if(lock?.status!=='exactness-verified-and-baseline-locked'){
  throw new Error('checked-in Step 5 exactness lock is not verified');
}
if(sha256(worldBytes)!==lock.baseline?.modelSha256 || worldBytes.length!==Number(lock.baseline?.bytes)){
  throw new Error('freshly generated Brookhaven world does not match Step 5 exactness lock');
}
if(generation?.output?.sha256!==lock.baseline?.modelSha256 ||
   generation?.output?.generatedEntrySequenceSha256!==lock.baseline?.generatedEntrySequenceSha256 ||
   generation?.output?.sourceCanonicalSequenceSha256!==lock.baseline?.sourceCanonicalSequenceSha256 ||
   generation?.output?.sourceSliceSequenceSha256!==lock.baseline?.sourceSliceSequenceSha256){
  throw new Error('fresh Step 4 generation receipt does not reproduce Step 5 locked identity');
}
await writeFile(lockPath,JSON.stringify(lock,null,2)+'\n');

const readerArgs=path=>[
  'run','--quiet','--manifest-path','tools/roblox_catalog_reader/Cargo.toml','--',path
];
await writeFile(
  isolatedDomPath,
  run('cargo',readerArgs(worldPath),'isolated rbx-dom read',{capture:true})
);

const baselineShaBefore=sha256(worldBytes);
run(process.execPath,[
  resolve('scripts/prepare-step5-world-mount.mjs'),
  '--baseline',worldPath,
  '--lock',lockPath,
  '--out-project',mountedProjectPath,
  '--baseline-copy',mountedBaselinePath,
  '--receipt',mountPreparationPath
],'Step 5 mount preparation');

const rojo=process.platform==='win32' ? 'rojo.exe' : 'rojo';
run(rojo,['build',mountedProjectPath,'--output',mountedPlacePath],'Step 5 mounted place build');
await writeFile(
  mountedDomPath,
  run('cargo',readerArgs(mountedPlacePath),'mounted rbx-dom read',{capture:true})
);

run(process.execPath,[
  resolve('scripts/verify-step5-world-mount.mjs'),
  '--isolated-dom',isolatedDomPath,
  '--mounted-dom',mountedDomPath,
  '--lock',lockPath,
  '--baseline',mountedBaselinePath,
  '--baseline-sha-before',baselineShaBefore,
  '--out',mountReceiptPath
],'Step 5 mounted-world verification');

const mountReceipt=JSON.parse(await readFile(mountReceiptPath,'utf8'));
if(JSON.stringify(mountReceipt)!==JSON.stringify(step5.mountReceipt)){
  throw new Error('fresh Step 5 mount receipt does not match checked-in canonical receipt');
}

run(process.execPath,[
  resolve('scripts/prepare-step6-release-gate.mjs'),
  '--step5',step5Path,
  '--lock',lockPath,
  '--mount',mountReceiptPath,
  '--artifact',mountedPlacePath,
  '--source-commit',sourceCommit,
  '--out',releaseGatePath
],'Step 6 native release-gate preparation');

const [gate,artifactBytes]=await Promise.all([
  readFile(releaseGatePath,'utf8').then(JSON.parse),
  readFile(mountedPlacePath)
]);
if(gate?.status!=='private-release-gate-open') throw new Error('Step 6 release gate did not open');
if(gate?.sourceCommit!==sourceCommit) throw new Error('Step 6 release gate source-commit binding drift');
if(gate?.artifact?.sha256!==sha256(artifactBytes) || gate?.artifact?.bytes!==artifactBytes.length){
  throw new Error('Step 6 release gate artifact binding drift');
}
if(gate?.gates?.nativeArtifactWorldVerified!==true || gate?.gates?.nativeArtifactRuntimeVerified!==true){
  throw new Error('Step 6 native artifact verification is incomplete');
}
if(gate?.authority?.privatePublicationAllowed!==true ||
   gate?.authority?.publicAccessChangeAllowed!==false ||
   gate?.authority?.productionActivationAllowed!==false){
  throw new Error('Step 6 release authority boundary drift');
}

const result={
  schemaVersion:1,
  status:'step9-release-candidate-prepared',
  sourceCommit,
  artifact:{
    path:mountedPlacePath,
    sha256:sha256(artifactBytes),
    bytes:artifactBytes.length
  },
  releaseGate:{
    path:releaseGatePath,
    version:gate.version,
    nativeArtifactWorldVerified:true,
    nativeArtifactRuntimeVerified:true
  },
  world:{
    baselineModelSha256:lock.baseline.modelSha256,
    mountedSubtreeSha256:mountReceipt.baseline.mountedSubtreeSha256,
    subtreeInstanceCount:mountReceipt.baseline.subtreeInstanceCount
  },
  authority:{
    privatePublicationAllowed:true,
    publicAccessChangeAllowed:false,
    productionActivationAllowed:false
  }
};
await writeFile(resolve(outDir,'step9-release-candidate.json'),JSON.stringify(result,null,2)+'\n');
process.stdout.write(JSON.stringify(result,null,2)+'\n');
