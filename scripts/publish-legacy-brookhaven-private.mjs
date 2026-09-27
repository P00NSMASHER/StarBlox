import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

import {
  assertPublishCompatibleXml,
  buildPrivatePublishReceipt,
  publishPlaceVersion
} from '../src/robloxRuntime/privatePublish.js';
import {
  LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION,
  verifyLegacyCandidateForPrivatePublish,
  verifyLegacyPublishedRelease
} from '../src/robloxRuntime/legacyBrookhavenPrivateRelease.js';

const EXPECTED_UNIVERSE_ID='6027194615';
const EXPECTED_PLACE_ID='17602626136';

const apiKey=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'');
const universeId=String(process.env.ROBLOX_UNIVERSE_ID||'');
const placeId=String(process.env.ROBLOX_PLACE_ID||'');
const sourceCommit=String(process.env.STARBLOX_SOURCE_COMMIT||'');
const candidatePath=process.env.STARBLOX_LEGACY_CANDIDATE_RECEIPT
  ? resolve(process.env.STARBLOX_LEGACY_CANDIDATE_RECEIPT)
  : null;
const artifactPath=process.env.STARBLOX_LEGACY_CANDIDATE_ARTIFACT
  ? resolve(process.env.STARBLOX_LEGACY_CANDIDATE_ARTIFACT)
  : null;
const receiptPath=process.env.STARBLOX_LEGACY_PUBLISH_RECEIPT
  ? resolve(process.env.STARBLOX_LEGACY_PUBLISH_RECEIPT)
  : null;

if(universeId!==EXPECTED_UNIVERSE_ID){
  throw new Error('ROBLOX_UNIVERSE_ID must target StarBlox universe '+EXPECTED_UNIVERSE_ID);
}
if(placeId!==EXPECTED_PLACE_ID){
  throw new Error('ROBLOX_PLACE_ID must target StarBlox place '+EXPECTED_PLACE_ID);
}
if(!candidatePath) throw new Error('STARBLOX_LEGACY_CANDIDATE_RECEIPT is required');
if(!artifactPath) throw new Error('STARBLOX_LEGACY_CANDIDATE_ARTIFACT is required');
if(!receiptPath) throw new Error('STARBLOX_LEGACY_PUBLISH_RECEIPT is required');

const [candidateBytes,artifactBytes]=await Promise.all([
  readFile(candidatePath),
  readFile(artifactPath)
]);
const candidate=JSON.parse(candidateBytes.toString('utf8'));
const binding=verifyLegacyCandidateForPrivatePublish({
  candidate,
  artifactBytes,
  sourceCommit
});
assertPublishCompatibleXml(artifactBytes.toString('utf8'));

const published=await publishPlaceVersion({
  apiKey,
  universeId,
  placeId,
  bytes:artifactBytes
});

const verified=await verifyLegacyPublishedRelease({
  apiKey,
  universeId,
  placeId,
  binding,
  versionNumber:published.versionNumber
});

const base=buildPrivatePublishReceipt({
  universeId,
  placeId,
  releaseId:binding.releaseId,
  sourceCommit:binding.sourceCommit,
  previousVersion:Math.max(0,published.versionNumber-1),
  publishedVersion:published.versionNumber,
  verifiedVersion:verified.versionNumber,
  artifactSha256:binding.artifactSha256,
  artifactBytes:binding.artifactBytes,
  skipped:false,
  verificationTaskPath:verified.taskPath,
  releaseGate:{
    version:LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION,
    artifactSha256:binding.artifactSha256,
    baselineModelSha256:binding.baselineModelSha256,
    mountedSubtreeSha256:binding.mountedSubtreeSha256
  }
});

const receipt={
  ...base,
  legacyBrookhaven:{
    sourceMode:'legacy-reference-safe-world',
    geometryCount:binding.geometryCount,
    subtreeInstanceCount:binding.subtreeInstanceCount,
    current2026CertificationSatisfied:false,
    exactCurrentParityClaimAllowed:false
  }
};

await mkdir(dirname(receiptPath),{recursive:true});
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
