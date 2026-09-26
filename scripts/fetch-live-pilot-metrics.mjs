import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {fetchLivePilotMetrics} from '../src/robloxRuntime/pilotLiveMetrics.js';

const outIndex=process.argv.indexOf('--out');
const out=outIndex>=0?process.argv[outIndex+1]:null;
if(!out) throw new Error('Usage: node scripts/fetch-live-pilot-metrics.mjs --out <path>');
const snapshot=await fetchLivePilotMetrics({
  apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  universeId:process.env.ROBLOX_UNIVERSE_ID,
  placeId:process.env.ROBLOX_PLACE_ID
});
mkdirSync(dirname(out),{recursive:true});
writeFileSync(out,JSON.stringify(snapshot,null,2)+'\n');
process.stdout.write(JSON.stringify({
  status:'live-pilot-metrics-read',
  placeVersion:snapshot.placeVersion,
  metricsVersion:snapshot.metricsVersion,
  pilotItems:Object.keys(snapshot.itemMetrics||{}).length,
  pilotSessionsCompleted:Number(snapshot.retention?.pilotSessionsCompleted)||0
})+'\n');
