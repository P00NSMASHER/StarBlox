import { spawnSync } from 'node:child_process';
import { mkdir,readFile,rm,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

import {
  STARBLOX_PRIVATE_RELEASE_ID,
  assertPublishCompatibleXml,
  buildPrivatePublishReceipt,
  probeCurrentRelease,
  publishPlaceVersion,
  sha256Bytes,
  verifyPublishedRelease
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

function runNode(args,label){
  const result=spawnSync(process.execPath,args,{cwd:process.cwd(),encoding:'utf8'});
  if(result.status !== 0){
    throw new Error(label + ': ' + (result.stderr || result.stdout || '').trim());
  }
}

async function emit(receipt){
  const json=JSON.stringify(receipt,null,2) + '\n';
  if(receiptPath){
    await mkdir(dirname(receiptPath),{recursive:true});
    await writeFile(receiptPath,json);
  }
  process.stdout.write(json);
}

const before=await probeCurrentRelease({apiKey,universeId,placeId});
if(before.releaseId === STARBLOX_PRIVATE_RELEASE_ID){
  await emit(buildPrivatePublishReceipt({
    universeId,
    placeId,
    releaseId:STARBLOX_PRIVATE_RELEASE_ID,
    sourceCommit,
    previousVersion:before.versionNumber,
    publishedVersion:before.versionNumber,
    verifiedVersion:before.versionNumber,
    artifactSha256:'',
    artifactBytes:0,
    skipped:true,
    verificationTaskPath:before.taskPath
  }));
  process.exit(0);
}

const rojo=process.platform === 'win32' ? 'rojo.exe' : 'rojo';
const versionResult=spawnSync(rojo,['--version'],{cwd:process.cwd(),encoding:'utf8'});
if(versionResult.status !== 0){
  throw new Error('Rojo version check failed: ' + (versionResult.stderr || versionResult.stdout || ''));
}
if(!String(versionResult.stdout || '').includes(EXPECTED_ROJO_VERSION)){
  throw new Error('expected Rojo ' + EXPECTED_ROJO_VERSION + ' but found ' + String(versionResult.stdout || '').trim());
}

const buildRoot=resolve('artifacts/step9-step5-publish');
const worldPath=resolve(buildRoot,'BrookhavenWorldBaseline.rbxmx');
const generationReceiptPath=resolve(buildRoot,'generation-receipt.json');
const lockPath=resolve(buildRoot,'step5-exactness-lock.json');
const mountReceiptPath=resolve(buildRoot,'step5-mount-preparation.json');
const mountedProject=resolve('roblox/.step9-step5-publish.project.json');
const mountedWorld=resolve('roblox/.step9-step5-generated/BrookhavenWorldBaseline.rbxmx');
const output=resolve(buildRoot,'StarBlox-private-step9-step5.rbxlx');

await rm(buildRoot,{recursive:true,force:true});
await rm(mountedProject,{force:true});
await rm(dirname(mountedWorld),{recursive:true,force:true});
await mkdir(buildRoot,{recursive:true});

try{
  runNode([
    resolve('scripts/generate-brookhaven-world.mjs'),
    '--out',worldPath,
    '--receipt',generationReceiptPath
  ],'Brookhaven Step 4 regeneration failed');

  const step5=JSON.parse(
    await readFile(resolve('docs/roblox-world/STEP_5_WORLD_EXACTNESS_AND_MOUNT.json'),'utf8')
  );
  if(step5.status !== 'verified-exact-world-with-starblox-mounted-beside-it'){
    throw new Error('checked-in Step 5 snapshot is not verified');
  }
  if(step5.exactnessLock?.status !== 'exactness-verified-and-baseline-locked'){
    throw new Error('checked-in Step 5 exactness lock is unavailable');
  }
  await writeFile(lockPath,JSON.stringify(step5.exactnessLock,null,2)+'\n');

  runNode([
    resolve('scripts/prepare-step5-world-mount.mjs'),
    '--baseline',worldPath,
    '--lock',lockPath,
    '--out-project',mountedProject,
    '--baseline-copy',mountedWorld,
    '--receipt',mountReceiptPath
  ],'canonical Step 5 mount preparation failed');

  const build=spawnSync(rojo,[
    'build',
    mountedProject,
    '--output',
    output
  ],{cwd:process.cwd(),encoding:'utf8'});
  if(build.status !== 0){
    throw new Error('Rojo canonical Step 5 build failed: ' + (build.stderr || build.stdout || ''));
  }

  const bytes=await readFile(output);
  const xml=bytes.toString('utf8');
  assertPublishCompatibleXml(xml);
  if(!xml.includes('<string name="Name">BrookhavenWorldBaseline</string>')){
    throw new Error('refusing to publish: canonical Step 5 Brookhaven mount is missing');
  }
  for(const requiredName of ['Matter','ProfileStore','ReplicaServer','ReplicaClient']){
    const marker='<string name="Name">' + requiredName + '</string>';
    if(!xml.includes(marker)){
      throw new Error('refusing to publish: compiled place is missing required runtime dependency ' + requiredName);
    }
  }

  const artifactSha256=sha256Bytes(bytes);
  const artifactBytes=bytes.length;
  const published=await publishPlaceVersion({apiKey,universeId,placeId,bytes});
  if(published.versionNumber <= before.versionNumber){
    throw new Error(
      'Roblox publish did not advance the place version: previous=' +
      before.versionNumber + ' published=' + published.versionNumber
    );
  }

  const verified=await verifyPublishedRelease({
    apiKey,
    universeId,
    placeId,
    releaseId:STARBLOX_PRIVATE_RELEASE_ID,
    versionNumber:published.versionNumber
  });

  await emit(buildPrivatePublishReceipt({
    universeId,
    placeId,
    releaseId:STARBLOX_PRIVATE_RELEASE_ID,
    sourceCommit,
    previousVersion:before.versionNumber,
    publishedVersion:published.versionNumber,
    verifiedVersion:verified.versionNumber,
    artifactSha256,
    artifactBytes,
    skipped:false,
    verificationTaskPath:verified.taskPath
  }));
}finally{
  if(process.env.STARBLOX_KEEP_PRIVATE_BUILD !== '1'){
    await rm(buildRoot,{recursive:true,force:true});
    await rm(mountedProject,{force:true});
    await rm(dirname(mountedWorld),{recursive:true,force:true});
  }
}
