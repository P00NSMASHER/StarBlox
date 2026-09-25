import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  runProductionServerBootProof
} from '../src/robloxRuntime/productionServerBootProof.js';

const EXPECTED_UNIVERSE_ID='6027194615';
const EXPECTED_PLACE_ID='17602626136';

const universeId=String(process.env.ROBLOX_UNIVERSE_ID || '');
const placeId=String(process.env.ROBLOX_PLACE_ID || '');
const publishReceiptPath=process.env.STARBLOX_PUBLISH_RECEIPT
  ? resolve(process.env.STARBLOX_PUBLISH_RECEIPT)
  : null;

if(universeId !== EXPECTED_UNIVERSE_ID){
  throw new Error('ROBLOX_UNIVERSE_ID must target StarBlox universe ' + EXPECTED_UNIVERSE_ID);
}
if(placeId !== EXPECTED_PLACE_ID){
  throw new Error('ROBLOX_PLACE_ID must target StarBlox place ' + EXPECTED_PLACE_ID);
}

let expectedVersion=null;
let releaseId;
if(publishReceiptPath){
  const publish=JSON.parse(await readFile(publishReceiptPath,'utf8'));
  if(publish?.status !== 'published-awaiting-runtime-verification'){
    throw new Error('publish receipt must be awaiting runtime verification');
  }
  expectedVersion=Number(publish?.versions?.published);
  releaseId=String(publish?.releaseId || '');
  if(!Number.isInteger(expectedVersion) || expectedVersion < 1){
    throw new Error('publish receipt is missing the exact published version');
  }
}

const proof=await runProductionServerBootProof({
  apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  universeId,
  placeId,
  ...(releaseId ? {releaseId} : {}),
  expectedVersion
});

process.stdout.write(JSON.stringify(proof,null,2) + '\n');
