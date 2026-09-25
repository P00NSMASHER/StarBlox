import { createHash } from 'node:crypto';

const LUAU_ROOT='https://apis.roblox.com/cloud/v2';
const PUBLISH_ROOT='https://apis.roblox.com/universes/v1';

export const STARBLOX_PRIVATE_RELEASE_ID='starblox-private-step6-v1';
export const STARBLOX_PRIVATE_PUBLISH_VERSION='starblox-private-publish-v1';

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
  timeoutMs=90_000
}){
  const key=requireApiKey(apiKey);
  const universe=requireId(universeId,'universeId');
  const place=requireId(placeId,'placeId');
  if(typeof script !== 'string' || !script.trim()) throw new Error('Luau script is required');
  if(typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  const createResponse=await fetchImpl(
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

  if(taskFailed(task)){
    const message=task?.error?.message || task?.error?.code || task?.state || 'unknown task failure';
    throw new Error('Roblox Luau execution task failed: ' + String(message));
  }

  const logsResponse=await fetchImpl(statusUrl + '/logs',{
    method:'GET',
    headers:{'x-api-key':key}
  });
  const logs=await parseResponse(logsResponse,'Roblox Luau execution logs');

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
  fetchImpl=globalThis.fetch
}){
  const key=requireApiKey(apiKey);
  const universe=requireId(universeId,'universeId');
  const place=requireId(placeId,'placeId');
  if(!(bytes instanceof Uint8Array) || bytes.byteLength === 0){
    throw new Error('publish bytes are required');
  }

  const response=await fetchImpl(
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
  const payload=await parseResponse(response,'Roblox place publish');
  const versionNumber=Number(payload?.versionNumber);
  if(!Number.isInteger(versionNumber) || versionNumber < 1){
    throw new Error('Roblox place publish response is missing versionNumber');
  }
  return {versionNumber};
}

function verifiedReleaseScript({releaseId,versionNumber}){
  const safeRelease=JSON.stringify(String(releaseId));
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local root = ReplicatedStorage:WaitForChild("StarBlox")
local module = root:WaitForChild("DeploymentManifest")
local manifest = require(module)
assert(type(manifest) == "table", "DeploymentManifest must return a table")
assert(manifest.releaseId == ${safeRelease}, "unexpected release id: " .. tostring(manifest.releaseId))
assert(manifest.releaseChannel == "private-staging", "unexpected release channel")
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")
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
    script:verifiedReleaseScript({releaseId,versionNumber})
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
  verifiedVersion,
  artifactSha256,
  artifactBytes,
  skipped=false,
  verificationTaskPath=null
}){
  return Object.freeze({
    schemaVersion:1,
    receiptVersion:STARBLOX_PRIVATE_PUBLISH_VERSION,
    status:skipped ? 'already-current' : 'published-and-verified',
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
      published:Number(publishedVersion),
      verified:Number(verifiedVersion)
    }),
    verificationTaskPath:verificationTaskPath ? String(verificationTaskPath) : null,
    authority:Object.freeze({
      experienceVisibilityChangeAttempted:false,
      publicAccessChangeAttempted:false,
      liveActivationAllowed:false,
      productionActivationAllowed:false
    }),
    rollback:Object.freeze({
      preservedPreviousVersion:Number(previousVersion),
      mechanism:'Roblox Creator Dashboard > Configure > Places > Version History > Restore',
      automaticRollbackAttempted:false,
      note:'Roblox retains saved place versions; restoring a prior version creates a new place version.'
    })
  });
}
