import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const island=path.join(repo,'lantern-island');
const manifest=JSON.parse(fs.readFileSync(path.join(island,'release','tested-release-manifest.json'),'utf8'));
const artifactPath=path.join(island,manifest.artifact.path);
const apiKey=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'').trim();
const universeId=String(process.env.ROBLOX_UNIVERSE_ID||'').trim();
const placeId=String(process.env.ROBLOX_PLACE_ID||'').trim();

if(!apiKey) throw new Error('ROBLOX_OPEN_CLOUD_API_KEY is required');
if(universeId!==manifest.target.universeId) throw new Error('unexpected universe target');
if(placeId!==manifest.target.placeId) throw new Error('unexpected place target');
if(manifest.target.channel!=='private-staging') throw new Error('release manifest is not private-staging');

const bytes=fs.readFileSync(artifactPath);
if(bytes.length!==manifest.artifact.bytes) throw new Error('artifact byte count changed');
const {createHash}=await import('node:crypto');
const sha=createHash('sha256').update(bytes).digest('hex');
if(sha!==manifest.artifact.sha256) throw new Error('artifact hash changed');

const xml=bytes.toString('utf8');
if(!xml.includes('<roblox')) throw new Error('artifact is not Roblox XML');
for(const forbidden of ['EditableImage','EditableMesh','PartOperation','SurfaceAppearance','BaseWrap']){
  if(new RegExp('<Item\\s+class=["\\\']'+forbidden+'["\\\']','i').test(xml)){
    throw new Error('unsupported publish class: '+forbidden);
  }
}
for(const marker of ['LanternIslandServer','TargetPolicy','LanternIslandClient']){
  if(!xml.includes('<string name="Name">'+marker+'</string>')) throw new Error('missing release marker '+marker);
}
if(!xml.includes(manifest.sourceFingerprint)) throw new Error('tested BuildIdentity missing');

function delay(ms){return new Promise(r=>setTimeout(r,ms));}
async function parseJson(response,label){
  const text=await response.text();
  let payload;
  try{payload=text?JSON.parse(text):{};}catch{throw new Error(label+' returned non-JSON HTTP '+response.status);}
  if(!response.ok){
    const detail=payload?.message||payload?.error?.message||payload?.error||text;
    throw new Error(label+' HTTP '+response.status+': '+String(detail||'request failed'));
  }
  return payload;
}

const publishUrl='https://apis.roblox.com/universes/v1/'+universeId+'/places/'+placeId+'/versions?versionType=Published';
let publishResponse;
for(let attempt=0;attempt<5;attempt++){
  publishResponse=await fetch(publishUrl,{
    method:'POST',
    headers:{'x-api-key':apiKey,'content-type':'application/xml'},
    body:bytes
  });
  if(publishResponse.status!==429||attempt===4) break;
  const retrySeconds=Number(publishResponse.headers.get('retry-after')||0);
  await delay(Math.max(retrySeconds*1000,2000*(attempt+1)));
}
const published=await parseJson(publishResponse,'Roblox place publish');
const versionNumber=Number(published.versionNumber);
if(!Number.isInteger(versionNumber)||versionNumber<1) throw new Error('publish response missing versionNumber');

const verifyScript=`local RunService=game:GetService("RunService")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local ServerScriptService=game:GetService("ServerScriptService")
local StarterPlayer=game:GetService("StarterPlayer")
assert(game.GameId==${universeId},"unexpected universe "..tostring(game.GameId))
assert(game.PlaceId==${placeId},"unexpected place "..tostring(game.PlaceId))
assert(RunService:IsServer(),"verification is not server runtime")
assert(not RunService:IsStudio(),"verification unexpectedly in Studio")
local server=ServerScriptService:WaitForChild("LanternIslandServer",20)
local identity=server:WaitForChild("BuildIdentity",10)
assert(identity.Value==${JSON.stringify(manifest.sourceFingerprint)},"unexpected BuildIdentity "..tostring(identity.Value))
assert(server:FindFirstChild("TargetPolicy")~=nil,"TargetPolicy missing")
local remotes=ReplicatedStorage:WaitForChild("LanternIslandRemotes",25)
local deadline=os.clock()+25
while remotes:GetAttribute("RuntimeStatus")=="BOOTING" and os.clock()<deadline do task.wait(.1) end
assert(remotes:GetAttribute("RuntimeStatus")=="READY","runtime not READY: "..tostring(remotes:GetAttribute("RuntimeStatus")))
local world=workspace:WaitForChild("LanternIslandWorld",20)
assert(world:FindFirstChild("PipsPlaza")~=nil,"PipsPlaza missing")
assert(StarterPlayer:WaitForChild("StarterPlayerScripts"):FindFirstChild("LanternIslandClient")~=nil,"LanternIslandClient missing")
print("LANTERN_PRIVATE_STAGING_OK version="..tostring(game.PlaceVersion).." fingerprint="..identity.Value)
return tostring(game.PlaceVersion),identity.Value
`;

const taskCreate=await parseJson(await fetch(
  'https://apis.roblox.com/cloud/v2/universes/'+universeId+'/places/'+placeId+'/luau-execution-session-tasks',
  {
    method:'POST',
    headers:{'x-api-key':apiKey,'content-type':'application/json'},
    body:JSON.stringify({script:verifyScript,timeout:'30s'})
  }
),'Roblox verification create');

const taskPath=String(taskCreate.path||'');
if(!taskPath) throw new Error('verification task path missing');
const taskUrl='https://apis.roblox.com/cloud/v2/'+taskPath
  .replace(/^https:\/\/apis\.roblox\.com\/cloud\/v2\//,'')
  .replace(/^\/?cloud\/v2\//,'')
  .replace(/^\//,'');
const versionMatch=taskPath.match(/\/versions\/(\d+)\//);
if(!versionMatch) throw new Error('verification task path missing version');
const verifiedVersion=Number(versionMatch[1]);

let task=taskCreate;
const deadline=Date.now()+90000;
while(String(task.state||'')==='PROCESSING'){
  if(Date.now()>=deadline) throw new Error('verification task timed out');
  await delay(1000);
  task=await parseJson(await fetch(taskUrl,{headers:{'x-api-key':apiKey}}),'Roblox verification status');
}
const logs=await parseJson(await fetch(taskUrl+'/logs',{headers:{'x-api-key':apiKey}}),'Roblox verification logs');
if(task.error||/FAIL|ERROR|CANCEL/i.test(String(task.state||''))){
  throw new Error('published server verification failed: '+JSON.stringify({state:task.state,error:task.error,logs}).slice(0,8000));
}
if(verifiedVersion!==versionNumber){
  throw new Error('verification ran wrong version expected='+versionNumber+' actual='+verifiedVersion);
}
const sentinel='LANTERN_PRIVATE_STAGING_OK version='+versionNumber+' fingerprint='+manifest.sourceFingerprint;
if(!JSON.stringify(logs).includes(sentinel)){
  throw new Error('verification logs missing exact release sentinel');
}

const receipt={
  schemaVersion:1,
  status:'private-staging-published-and-server-verified',
  productionSourceCommit:manifest.productionSourceCommit,
  sourceFingerprint:manifest.sourceFingerprint,
  target:{universeId,placeId,channel:'private-staging'},
  artifact:{sha256:sha,bytes:bytes.length},
  publishedVersion:versionNumber,
  verifiedVersion,
  verificationTaskPath:taskPath,
  verificationState:String(task.state||'UNKNOWN'),
  authority:{
    visibilityChangeAttempted:false,
    publicAccessChangeAttempted:false,
    productionActivationAttempted:false
  },
  rollback:{
    previousVersionCandidate:Math.max(0,versionNumber-1),
    mechanism:'Roblox version history restore'
  },
  publishedAt:new Date().toISOString()
};
const out=path.join(island,'dist','private-staging-publish-receipt.json');
fs.writeFileSync(out,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
