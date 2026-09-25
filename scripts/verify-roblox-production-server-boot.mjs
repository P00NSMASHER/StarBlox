import {
  runProductionServerBootProof
} from '../src/robloxRuntime/productionServerBootProof.js';

const EXPECTED_UNIVERSE_ID='6027194615';
const EXPECTED_PLACE_ID='17602626136';

const universeId=String(process.env.ROBLOX_UNIVERSE_ID || '');
const placeId=String(process.env.ROBLOX_PLACE_ID || '');

if(universeId !== EXPECTED_UNIVERSE_ID){
  throw new Error('ROBLOX_UNIVERSE_ID must target StarBlox universe ' + EXPECTED_UNIVERSE_ID);
}
if(placeId !== EXPECTED_PLACE_ID){
  throw new Error('ROBLOX_PLACE_ID must target StarBlox place ' + EXPECTED_PLACE_ID);
}

const proof=await runProductionServerBootProof({
  apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  universeId,
  placeId
});

process.stdout.write(JSON.stringify(proof,null,2) + '\n');
