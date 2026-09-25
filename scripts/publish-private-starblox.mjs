import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

import {
  STARBLOX_PRIVATE_RELEASE_ID,
  assertPublishCompatibleXml,
  buildPrivatePublishReceipt,
  probeCurrentRelease,
  publishPlaceVersion,
  verifyPublishedRelease
} from '../src/robloxRuntime/privatePublish.js';
import { verifyStep6ReleaseGate } from '../src/robloxRuntime/releaseGate.js';

const EXPECTED_UNIVERSE_ID='6027194615';
const EXPECTED_PLACE_ID='17602626136';

const apiKey=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY || '');
const universeId=String(process.env.ROBLOX_UNIVERSE_ID || '');
const placeId=String(process.env.ROBLOX_PLACE_ID || '');
const sourceCommit=String(process.env.STARBLOX_SOURCE_COMMIT || '');
const gatePath=process.env.STARBLOX_RELEASE_GATE_RECEIPT
  ? resolve(process.env.STARBLOX_RELEASE_GATE_RECEIPT)
  : null;
const artifactPath=process.env.STARBLOX_RELEASE_ARTIFACT
  ? resolve(process.env.STARBLOX_RELEASE_ARTIFACT)
  : null;
const step5Path=resolve(
  process.env.STARBLOX_STEP5_SNAPSHOT ||
  'docs/roblox-world/STEP_5_WORLD_EXACTNESS_AND_MOUNT.json'
);
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
if(!gatePath) throw new Error('STARBLOX_RELEASE_GATE_RECEIPT is required');
if(!artifactPath) throw new Error('STARBLOX_RELEASE_ARTIFACT is required');

async function emit(receipt){
  const json=JSON.stringify(receipt,null,2) + '\n';
  if(receiptPath){
    await mkdir(dirname(receiptPath),{recursive:true});
    await writeFile(receiptPath,json);
  }
  process.stdout.write(json);
}

const [gateBytes,step5Bytes,artifactBytes]=await Promise.all([
  readFile(gatePath),
  readFile(step5Path),
  readFile(artifactPath)
]);
const gate=JSON.parse(gateBytes.toString('utf8'));
const binding=verifyStep6ReleaseGate({
  gate,
  step5SnapshotBytes:step5Bytes,
  artifactBytes,
  sourceCommit
});
assertPublishCompatibleXml(artifactBytes.toString('utf8'));

const before=await probeCurrentRelease({
  apiKey,
  universeId,
  placeId
});

const published=await publishPlaceVersion({
  apiKey,
  universeId,
  placeId,
  bytes:artifactBytes
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
  versionNumber:published.versionNumber,
  world:{
    subtreeInstanceCount:Number(gate.step5.subtreeInstanceCount),
    baselineModelSha256:binding.baselineModelSha256,
    mountedSubtreeSha256:binding.mountedSubtreeSha256
  }
});

await emit(buildPrivatePublishReceipt({
  universeId,
  placeId,
  releaseId:STARBLOX_PRIVATE_RELEASE_ID,
  sourceCommit,
  previousVersion:before.versionNumber,
  publishedVersion:published.versionNumber,
  verifiedVersion:verified.versionNumber,
  artifactSha256:binding.artifactSha256,
  artifactBytes:binding.artifactBytes,
  skipped:false,
  verificationTaskPath:verified.taskPath,
  releaseGate:{
    version:gate.version,
    artifactSha256:binding.artifactSha256,
    baselineModelSha256:binding.baselineModelSha256,
    mountedSubtreeSha256:binding.mountedSubtreeSha256
  }
}));
