import { createHash } from 'node:crypto';

const LUAU_ROOT='https://apis.roblox.com/cloud/v2';
const PUBLISH_ROOT='https://apis.roblox.com/universes/v1';

export const STARBLOX_PRIVATE_RELEASE_ID='starblox-private-step9-canonical-step6-v4';
export const STARBLOX_PRIVATE_PUBLISH_VERSION='starblox-private-publish-v2';

const UNSUPPORTED_PUBLISH_CLASSES=Object.freeze([
  'EditableImage',
  'EditableMesh',
  'PartOperation',
  'SurfaceAppearance',
  'BaseWrap'
]);

function requireId(value,label){
  const text=String(value ?? '').trim();
  if(!/^\d+$/.test(text)) throw new Error(label + ' must be a numeric Roblox ID');
  return text;
}

function requireApiKey(value){
  if(typeof value !== 'string' || !value.trim()){
    throw new Error('ROBLOX_OPEN_CLOUD_API_KEY is required');
  }
  return value.trim();
}

function taskUrl(path){
  const clean=String(path || '')
    .replace(/^https:\/\/apis\.roblox\.com\/cloud\/v2\//,'')
    .replace(/^\/?cloud\/v2\//,'')
    .replace(/^\//,'');
  if(!clean) throw new Error('Roblox Luau execution task response is missing path');
  return LUAU_ROOT + '/' + clean;
}

function extractVersionFromTaskPath(path){
  const match=String(path || '').match(/\/versions\/(\d+)\//);
  if(!match) throw new Error('Roblox task path is missing a place version');
  return Number(match[1]);
}

async function parseResponse(response,label){
  const text=await response.text();
  let payload={};
  try{
    payload=text ? JSON.parse(text) : {};
  }catch{
    throw new Error(label + ' returned non-JSON HTTP ' + response.status);
  }
  if(!response.ok){
    const detail=payload?.message || payload?.error?.message || payload?.error || text;
    throw new Error(label + ' HTTP ' + response.status + ': ' + String(detail || 'request failed'));
  }
  return payload;
}

function delay(ms){
  return new Promise(resolve => setTimeout(resolve,ms));
}

function retryAfterMs(response,{attempt,baseMs,maxMs}){
  const raw=response?.headers?.get?.('retry-after');
  if(raw != null && String(raw).trim()){
    const seconds=Number(raw);
    if(Number.isFinite(seconds) && seconds >= 0){
      return Math.min(maxMs,Math.max(0,Math.round(seconds * 1000)));
    }
    const at=Date.parse(String(raw));
    if(Number.isFinite(at)){
      return Math.min(maxMs,Math.max(0,at-Date.now()));
    }
  }
  return Math.min(maxMs,Math.max(0,baseMs * (2 ** attempt)));
}

function taskFailed(task){
  if(task?.error) return true;
  return /FAIL|ERROR|CANCEL/i.test(String(task?.state || ''));
}

export function sha256Bytes(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

export function assertPublishCompatibleXml(xml){
  const text=String(xml || '');
  if(!text.includes('<roblox')){
    throw new Error('publish artifact is not a Roblox XML place');
  }
  const found=UNSUPPORTED_PUBLISH_CLASSES.filter(className =>
    new RegExp('<Item\\s+class=["\\\']' + className + '["\\\']','i').test(text)
  );
  if(found.length){
    throw new Error(
      'place publishing API does not safely support these classes: ' +
      found.join(', ')
    );
  }
  return true;
}

export async function runOpenCloudLuauTask({
  apiKey,
  universeId,
  placeId,
  script,
  fetchImpl=globalThis.fetch,
  pollIntervalMs=1000,
  timeoutMs=90_000,
  createRetryAttempts=8,
  createRetryBaseMs=2000,
  createRetryMaxMs=60_000
}){
  const key=requireApiKey(apiKey);
  const universe=requireId(universeId,'universeId');
  const place=requireId(placeId,'placeId');
  if(typeof script !== 'string' || !script.trim()) throw new Error('Luau script is required');
  if(typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  const maxCreateAttempts=Math.max(1,Math.min(12,Number(createRetryAttempts) || 8));
  let createResponse;
  for(let attempt=0;attempt<maxCreateAttempts;attempt+=1){
    createResponse=await fetchImpl(
      LUAU_ROOT + '/universes/' + universe + '/places/' + place + '/luau-execution-session-tasks',
      {
        method:'POST',
        headers:{
          'x-api-key':key,
          'content-type':'application/json'
        },
        body:JSON.stringify({script,timeout:'30s'})
      }
    );
    const retryableCreateStatus=
      createResponse.status === 429 ||
      (createResponse.status >= 500 && createResponse.status <= 599);
    if(!retryableCreateStatus || attempt === maxCreateAttempts-1) break;
    await delay(retryAfterMs(createResponse,{
      attempt,
      baseMs:Math.max(0,Number(createRetryBaseMs) || 0),
      maxMs:Math.max(0,Number(createRetryMaxMs) || 0)
    }));
  }
  const create=await parseResponse(createResponse,'Roblox Luau execution create');
  const statusUrl=taskUrl(create.path);
  const deadline=Date.now()+timeoutMs;
  let task=create;

  while(String(task?.state || '') === 'PROCESSING'){
    if(Date.now() >= deadline) throw new Error('Roblox Luau execution task timed out while polling');
    await delay(pollIntervalMs);
    const response=await fetchImpl(statusUrl,{
      method:'GET',
      headers:{'x-api-key':key}
    });
    task=await parseResponse(response,'Roblox Luau execution status');
  }

  const logsResponse=await fetchImpl(statusUrl + '/logs',{
    method:'GET',
    headers:{'x-api-key':key}
  });
  const logs=await parseResponse(logsResponse,'Roblox Luau execution logs');

  if(taskFailed(task)){
    const message=task?.error?.message || task?.error?.code || task?.state || 'unknown task failure';
    const diagnostic=JSON.stringify(logs).slice(0,8000);
    throw new Error(
      'Roblox Luau execution task failed: ' +
      String(message) +
      (diagnostic ? ' | logs=' + diagnostic : '')
    );
  }

  return {
    path:String(create.path || ''),
    versionNumber:extractVersionFromTaskPath(create.path),
    state:String(task?.state || 'UNKNOWN'),
    logs
  };
}

function releaseProbeScript(){
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local release = "none"
local root = ReplicatedStorage:FindFirstChild("StarBlox")
if root then
    local module = root:FindFirstChild("DeploymentManifest")
    if module and module:IsA("ModuleScript") then
        local ok, manifest = pcall(require, module)
        if ok and type(manifest) == "table" and manifest.releaseId ~= nil then
            release = tostring(manifest.releaseId)
        else
            release = "invalid"
        end
    end
end
print("STARBLOX_RELEASE_PROBE release=" .. release .. " version=" .. tostring(game.PlaceVersion))
return release, tostring(game.PlaceVersion)
`;
}

export async function probeCurrentRelease(options){
  const task=await runOpenCloudLuauTask({
    ...options,
    script:releaseProbeScript()
  });
  const text=JSON.stringify(task.logs);
  const parsed=text.match(
    /STARBLOX_RELEASE_PROBE release=([A-Za-z0-9._:-]+) version=(\d+)/
  );
  if(!parsed){
    throw new Error('current-release probe logs are missing the expected sentinel');
  }
  const loggedVersion=Number(parsed[2]);
  if(loggedVersion !== task.versionNumber){
    throw new Error(
      'current-release probe version mismatch: task=' +
      task.versionNumber + ' log=' + loggedVersion
    );
  }
  return {
    releaseId:parsed[1],
    versionNumber:task.versionNumber,
    taskPath:task.path
  };
}

export async function publishPlaceVersion({
  apiKey,
  universeId,
  placeId,
  bytes,
  fetchImpl=globalThis.fetch,
  retryAttempts=5,
  retryBaseMs=2000,
  retryMaxMs=30_000
}){
  const key=requireApiKey(apiKey);
  const universe=requireId(universeId,'universeId');
  const place=requireId(placeId,'placeId');
  if(!(bytes instanceof Uint8Array) || bytes.byteLength === 0){
    throw new Error('publish bytes are required');
  }

  const maxAttempts=Math.max(1,Math.min(8,Number(retryAttempts) || 5));
  let response;
  for(let attempt=0;attempt<maxAttempts;attempt+=1){
    response=await fetchImpl(
      PUBLISH_ROOT + '/' + universe + '/places/' + place + '/versions?versionType=Published',
      {
        method:'POST',
        headers:{
          'x-api-key':key,
          'content-type':'application/xml'
        },
        body:bytes
      }
    );
    if(response.status !== 429 || attempt === maxAttempts-1) break;
    await delay(retryAfterMs(response,{
      attempt,
      baseMs:Math.max(0,Number(retryBaseMs) || 0),
      maxMs:Math.max(0,Number(retryMaxMs) || 0)
    }));
  }
  const payload=await parseResponse(response,'Roblox place publish');
  const versionNumber=Number(payload?.versionNumber);
  if(!Number.isInteger(versionNumber) || versionNumber < 1){
    throw new Error('Roblox place publish response is missing versionNumber');
  }
  return {versionNumber};
}

function verifiedReleaseScript({releaseId,versionNumber,world=null}){
  const safeRelease=JSON.stringify(String(releaseId));
  const worldChecks=world ? `
local Workspace = game:GetService("Workspace")
local ServerStorage = game:GetService("ServerStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local StarterPlayer = game:GetService("StarterPlayer")
local baseline = ServerStorage:WaitForChild("BrookhavenWorldBaseline")
assert(baseline:IsA("Model"), "ServerStorage/BrookhavenWorldBaseline must be a Model")
local runtimeWorld = Workspace:WaitForChild("BrookhavenWorldRuntime")
assert(runtimeWorld:IsA("Model"), "Workspace/BrookhavenWorldRuntime must be a Model")
assert(runtimeWorld:GetAttribute("StarBloxRuntimeProjection") == true, "Brookhaven runtime projection marker missing")
assert(Workspace:FindFirstChild("BrookhavenWorldBaseline") == nil, "immutable Brookhaven witness leaked into Workspace")
assert(manifest.worldBaselineSha256 == ${JSON.stringify(String(world.baselineModelSha256 || ''))}, "unexpected world baseline SHA")
assert(manifest.worldMountedSubtreeSha256 == ${JSON.stringify(String(world.mountedSubtreeSha256 || ''))}, "unexpected mounted world subtree SHA")
assert(#baseline:GetDescendants() + 1 == ${Number(world.subtreeInstanceCount)}, "unexpected Brookhaven subtree instance count")
for _, instance in baseline:GetDescendants() do
    assert(not instance:IsA("Script"), "locked Brookhaven baseline contains Script")
    assert(not instance:IsA("LocalScript"), "locked Brookhaven baseline contains LocalScript")
    assert(not instance:IsA("ModuleScript"), "locked Brookhaven baseline contains ModuleScript")
    assert(not instance:IsA("RemoteEvent"), "locked Brookhaven baseline contains RemoteEvent")
    assert(not instance:IsA("RemoteFunction"), "locked Brookhaven baseline contains RemoteFunction")
end
assert(ReplicatedStorage:FindFirstChild("StarBlox") ~= nil, "ReplicatedStorage/StarBlox missing")
assert(ServerScriptService:FindFirstChild("StarBlox") ~= nil, "ServerScriptService/StarBlox missing")
assert(StarterPlayer:WaitForChild("StarterPlayerScripts"):FindFirstChild("StarBlox") ~= nil, "StarterPlayerScripts/StarBlox missing")
` : '';
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local root = ReplicatedStorage:WaitForChild("StarBlox")
local module = root:WaitForChild("DeploymentManifest")
local manifest = require(module)
assert(type(manifest) == "table", "DeploymentManifest must return a table")
assert(manifest.releaseId == ${safeRelease}, "unexpected release id: " .. tostring(manifest.releaseId))
assert(manifest.releaseChannel == "private-staging", "unexpected release channel")
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")
${worldChecks}
assert(game.PlaceVersion == ${Number(versionNumber)}, "unexpected place version: " .. tostring(game.PlaceVersion))
print("STARBLOX_PRIVATE_PUBLISH_OK release=" .. tostring(manifest.releaseId) .. " version=" .. tostring(game.PlaceVersion))
return tostring(manifest.releaseId), tostring(game.PlaceVersion)
`;
}

export async function verifyPublishedRelease({
  apiKey,
  universeId,
  placeId,
  releaseId,
  versionNumber,
  world=null,
  fetchImpl=globalThis.fetch,
  pollIntervalMs=1000,
  timeoutMs=90_000
}){
  const task=await runOpenCloudLuauTask({
    apiKey,
    universeId,
    placeId,
    fetchImpl,
    pollIntervalMs,
    timeoutMs,
    script:verifiedReleaseScript({releaseId,versionNumber,world})
  });
  if(task.versionNumber !== Number(versionNumber)){
    throw new Error(
      'verified Roblox task did not run the newly published version: expected ' +
      versionNumber + ' got ' + task.versionNumber
    );
  }
  const text=JSON.stringify(task.logs);
  const sentinel='STARBLOX_PRIVATE_PUBLISH_OK release=' +
    String(releaseId) + ' version=' + String(versionNumber);
  if(!text.includes(sentinel)){
    throw new Error('post-publish Roblox logs are missing the private-release sentinel');
  }
  return {
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state
  };
}

export function buildPrivatePublishReceipt({
  universeId,
  placeId,
  releaseId,
  sourceCommit,
  previousVersion,
  publishedVersion,
  verifiedVersion=null,
  artifactSha256,
  artifactBytes,
  skipped=false,
  verificationTaskPath=null,
  releaseGate=null
}){
  const published=Number(publishedVersion);
  const verified=verifiedVersion == null ? null : Number(verifiedVersion);
  const verificationComplete=Number.isInteger(verified) && verified === published;
  return Object.freeze({
    schemaVersion:1,
    receiptVersion:STARBLOX_PRIVATE_PUBLISH_VERSION,
    status:skipped
      ? 'already-current'
      : verificationComplete
        ? 'published-and-verified'
        : 'published-awaiting-runtime-verification',
    releaseId:String(releaseId),
    sourceCommit:String(sourceCommit || ''),
    target:Object.freeze({
      universeId:requireId(universeId,'universeId'),
      placeId:requireId(placeId,'placeId'),
      releaseChannel:'private-staging'
    }),
    artifact:skipped ? null : Object.freeze({
      format:'rbxlx',
      sha256:String(artifactSha256),
      bytes:Number(artifactBytes)
    }),
    versions:Object.freeze({
      previous:Number(previousVersion),
      published,
      verified
    }),
    verification:Object.freeze({
      status:verificationComplete ? 'verified' : 'pending-production-server-boot',
      taskPath:verificationTaskPath ? String(verificationTaskPath) : null
    }),
    verificationTaskPath:verificationTaskPath ? String(verificationTaskPath) : null,
    releaseGate:releaseGate ? Object.freeze({
      version:String(releaseGate.version || ''),
      artifactSha256:String(releaseGate.artifactSha256 || ''),
      baselineModelSha256:String(releaseGate.baselineModelSha256 || ''),
      mountedSubtreeSha256:String(releaseGate.mountedSubtreeSha256 || '')
    }) : null,
    authority:Object.freeze({
      experienceVisibilityChangeAttempted:false,
      publicAccessChangeAttempted:false,
      liveActivationAllowed:false,
      productionActivationAllowed:false
    }),
    rollback:Object.freeze({
      preservedPreviousVersion:Number(previousVersion),
      previousVersionBasis:'immediate predecessor of the version number returned by the serialized publish request',
      mechanism:'Roblox Creator Dashboard > Configure > Places > Version History > Restore',
      automaticRollbackAttempted:false,
      note:'Roblox retains saved place versions; restoring a prior version creates a new place version.'
    })
  });
}
