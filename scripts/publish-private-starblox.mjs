import { spawnSync } from 'node:child_process';
import { mkdir,readFile,rm,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

import {
  STARBLOX_PRIVATE_RELEASE_ID,
  assertPublishCompatibleXml,
  buildPrivatePublishReceipt,
  publishPlaceVersion,
  sha256Bytes
} from '../src/robloxRuntime/privatePublish.js';

const EXPECTED_UNIVERSE_ID='6027194615';
const EXPECTED_PLACE_ID='17602626136';
const EXPECTED_ROJO_VERSION='7.6.1';

const apiKey=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY || '');
const universeId=String(process.env.ROBLOX_UNIVERSE_ID || '');
const placeId=String(process.env.ROBLOX_PLACE_ID || '');
const sourceCommit=String(process.env.STARBLOX_SOURCE_COMMIT || '');
const receiptPath=process.env.STARBLOX_PUBLISH_RECEIPT
  ? resolve(process.env.STARBLOX_PUBLISH_RECEIPT)
  : null;

if(universeId !== EXPECTED_UNIVERSE_ID){
  throw new Error('ROBLOX_UNIVERSE_ID must target StarBlox universe ' + EXPECTED_UNIVERSE_ID);
}
if(placeId !== EXPECTED_PLACE_ID){
  throw new Error('ROBLOX_PLACE_ID must target StarBlox place ' + EXPECTED_PLACE_ID);
}
if(!/^[a-f0-9]{40}$/.test(sourceCommit)){
  throw new Error('STARBLOX_SOURCE_COMMIT must be the exact 40-character PR head SHA');
}

function run(command,args,label){
  const result=spawnSync(command,args,{cwd:process.cwd(),encoding:'utf8'});
  if(result.status !== 0){
    throw new Error(label + ' failed: ' + (result.stderr || result.stdout || ''));
  }
  return String(result.stdout || '').trim();
}

async function emit(receipt){
  const json=JSON.stringify(receipt,null,2) + '\n';
  if(receiptPath){
    await mkdir(dirname(receiptPath),{recursive:true});
    await writeFile(receiptPath,json);
  }
  process.stdout.write(json);
}

const rojo=process.platform === 'win32' ? 'rojo.exe' : 'rojo';
const version=run(rojo,['--version'],'Rojo version check');
if(!version.includes(EXPECTED_ROJO_VERSION)){
  throw new Error('expected Rojo ' + EXPECTED_ROJO_VERSION + ' but found ' + version);
}

const buildRoot=resolve('artifacts/step9-canonical-step5-v3');
const worldPath=resolve(buildRoot,'BrookhavenWorldBaseline.rbxmx');
const generationReceiptPath=resolve(buildRoot,'generation-receipt.json');
const exactnessLockPath=resolve(buildRoot,'step5-exactness-lock.json');
const mountReceiptPath=resolve(buildRoot,'step5-mount-preparation.json');
const mountedProjectPath=resolve('roblox/.step5-mounted.project.json');
const mountedBaselinePath=resolve('roblox/.step5-generated/BrookhavenWorldBaseline.rbxmx');
const output=resolve(buildRoot,'StarBlox-private-step9-canonical-step5-v3.rbxlx');

await rm(buildRoot,{recursive:true,force:true});
await rm(mountedProjectPath,{force:true});
await rm(resolve('roblox/.step5-generated'),{recursive:true,force:true});
await mkdir(buildRoot,{recursive:true});

run(process.execPath,[
  resolve('scripts/generate-brookhaven-world.mjs'),
  '--out',worldPath,
  '--receipt',generationReceiptPath
],'Brookhaven world generation');

const [worldBytes,step5Snapshot]=await Promise.all([
  readFile(worldPath),
  readFile(resolve('docs/roblox-world/STEP_5_WORLD_EXACTNESS_AND_MOUNT.json'),'utf8').then(JSON.parse)
]);
if(step5Snapshot?.status !== 'verified-exact-world-with-starblox-mounted-beside-it'){
  throw new Error('canonical Step 5 snapshot is not verified');
}
const lock=step5Snapshot.exactnessLock;
const worldSha=sha256Bytes(worldBytes);
if(
  lock?.status !== 'exactness-verified-and-baseline-locked' ||
  lock?.baseline?.modelSha256 !== worldSha ||
  Number(lock?.baseline?.bytes) !== worldBytes.length
){
  throw new Error('generated Brookhaven world does not match canonical Step 5 exactness lock');
}
await writeFile(exactnessLockPath,JSON.stringify(lock,null,2)+'\n');

run(process.execPath,[
  resolve('scripts/prepare-step5-world-mount.mjs'),
  '--baseline',worldPath,
  '--lock',exactnessLockPath,
  '--out-project',mountedProjectPath,
  '--baseline-copy',mountedBaselinePath,
  '--receipt',mountReceiptPath
],'canonical Step 5 mount preparation');

run(rojo,[
  'build',
  mountedProjectPath,
  '--output',
  output
],'Rojo canonical Step 5 mounted build');

try{
  const bytes=await readFile(output);
  const xml=bytes.toString('utf8');
  assertPublishCompatibleXml(xml);

  for(const requiredName of [
    'BrookhavenWorldBaseline',
    'Matter',
    'ProfileStore',
    'ReplicaServer',
    'ReplicaClient',
    'StarBlox'
  ]){
    const marker='<string name="Name">' + requiredName + '</string>';
    if(!xml.includes(marker)){
      throw new Error('refusing to publish: compiled place is missing required instance ' + requiredName);
    }
  }

  const copiedBaseline=await readFile(mountedBaselinePath);
  if(
    sha256Bytes(copiedBaseline) !== lock.baseline.modelSha256 ||
    copiedBaseline.length !== Number(lock.baseline.bytes)
  ){
    throw new Error('canonical Step 5 read-only Brookhaven baseline changed during publish build');
  }

  const artifactSha256=sha256Bytes(bytes);
  const artifactBytes=bytes.length;
  const published=await publishPlaceVersion({apiKey,universeId,placeId,bytes});
  const previousVersion=Math.max(0,published.versionNumber-1);

  await emit(buildPrivatePublishReceipt({
    universeId,
    placeId,
    releaseId:STARBLOX_PRIVATE_RELEASE_ID,
    sourceCommit,
    previousVersion,
    publishedVersion:published.versionNumber,
    verifiedVersion:null,
    artifactSha256,
    artifactBytes,
    skipped:false,
    verificationTaskPath:null
  }));
}finally{
  if(process.env.STARBLOX_KEEP_PRIVATE_BUILD !== '1'){
    await rm(buildRoot,{recursive:true,force:true});
    await rm(mountedProjectPath,{force:true});
    await rm(resolve('roblox/.step5-generated'),{recursive:true,force:true});
  }
}
