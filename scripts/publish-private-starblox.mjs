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

async function emit(receipt){
  const json=JSON.stringify(receipt,null,2) + '\n';
  if(receiptPath){
    await mkdir(dirname(receiptPath),{recursive:true});
    await writeFile(receiptPath,json);
  }
  process.stdout.write(json);
}

const before=await probeCurrentRelease({
  apiKey,
  universeId,
  placeId
});

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
const versionResult=spawnSync(rojo,['--version'],{
  cwd:process.cwd(),
  encoding:'utf8'
});
if(versionResult.status !== 0){
  throw new Error('Rojo version check failed: ' + (versionResult.stderr || versionResult.stdout || ''));
}
if(!String(versionResult.stdout || '').includes(EXPECTED_ROJO_VERSION)){
  throw new Error('expected Rojo ' + EXPECTED_ROJO_VERSION + ' but found ' + String(versionResult.stdout || '').trim());
}

const output=resolve('artifacts/StarBlox-private-step5.rbxlx');
await mkdir(dirname(output),{recursive:true});
const build=spawnSync(rojo,[
  'build',
  resolve('roblox/default.project.json'),
  '--output',
  output
],{
  cwd:process.cwd(),
  encoding:'utf8'
});
if(build.status !== 0){
  throw new Error('Rojo build failed: ' + (build.stderr || build.stdout || ''));
}

try{
  const bytes=await readFile(output);
  const xml=bytes.toString('utf8');
  assertPublishCompatibleXml(xml);
  for(const requiredName of ['Matter','ProfileStore','ReplicaServer','ReplicaClient']){
    const marker='<string name="Name">' + requiredName + '</string>';
    if(!xml.includes(marker)){
      throw new Error(
        'refusing to publish: compiled place is missing required runtime dependency ' +
        requiredName
      );
    }
  }

  const artifactSha256=sha256Bytes(bytes);
  const artifactBytes=bytes.length;
  const published=await publishPlaceVersion({
    apiKey,
    universeId,
    placeId,
    bytes
  });

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
    await rm(output,{force:true});
  }
}
