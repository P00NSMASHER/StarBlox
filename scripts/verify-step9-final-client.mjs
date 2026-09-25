import {
  STEP9_FINAL_RELEASE_ID,
  STEP9_FINAL_PLACE_VERSION,
  verifyStep9ClientReport
} from '../src/robloxRuntime/finalClientGate.js';

const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY || '').trim();
if(!key) throw new Error('ROBLOX_OPEN_CLOUD_API_KEY is required');

const url='https://apis.roblox.com/cloud/v2/universes/6027194615/data-stores/StarBloxPrivatePlaytestTelemetry_v1/entries/latest';
const response=await fetch(url,{headers:{'x-api-key':key}});
const text=await response.text();
if(!response.ok){
  throw new Error('Roblox Data Store read HTTP '+response.status+': '+text);
}

let row;
try{
  row=text ? JSON.parse(text) : {};
}catch{
  throw new Error('Roblox Data Store read returned invalid JSON');
}

const report=row?.value ?? row;
const receipt=verifyStep9ClientReport(report,{
  releaseId:STEP9_FINAL_RELEASE_ID,
  versionNumber:STEP9_FINAL_PLACE_VERSION
});
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
