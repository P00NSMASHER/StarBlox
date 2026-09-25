const API_ROOT='https://apis.roblox.com/cloud/v2';
export const STARBLOX_OPEN_CLOUD_PROOF_VERSION='starblox-open-cloud-headless-v1';

function requireId(value,label){
  const text=String(value ?? '').trim();
  if(!/^\d+$/.test(text)) throw new Error(label + ' must be a numeric Roblox ID');
  return text;
}

function taskUrl(path){
  const clean=String(path || '')
    .replace(/^https:\/\/apis\.roblox\.com\/cloud\/v2\//,'')
    .replace(/^\/?cloud\/v2\//,'')
    .replace(/^\//,'');
  if(!clean) throw new Error('Roblox Luau execution task response is missing path');
  return API_ROOT + '/' + clean;
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

async function jsonRequest(fetchImpl,url,{
  method='GET',
  apiKey,
  body,
  retry429=0,
  retryBaseMs=1000,
  retryMaxMs=30_000
}={}){
  let attempt=0;
  while(true){
    const response=await fetchImpl(url,{
      method,
      headers:{
        'x-api-key':apiKey,
        ...(body === undefined ? {} : {'content-type':'application/json'})
      },
      ...(body === undefined ? {} : {body:JSON.stringify(body)})
    });
    const text=await response.text();
    let payload={};
    try{
      payload=text ? JSON.parse(text) : {};
    }catch{
      throw new Error('Roblox Open Cloud returned non-JSON HTTP ' + response.status);
    }
    if(response.ok) return payload;

    if(response.status === 429 && attempt < retry429){
      const waitMs=retryAfterMs(response,{
        attempt,
        baseMs:retryBaseMs,
        maxMs:retryMaxMs
      });
      attempt+=1;
      await delay(waitMs);
      continue;
    }

    const detail=payload?.message || payload?.error?.message || payload?.error || text;
    throw new Error('Roblox Open Cloud HTTP ' + response.status + ': ' + String(detail || 'request failed'));
  }
}

export function buildStarBloxHeadlessProbeScript({universeId,placeId}){
  const universe=requireId(universeId,'universeId');
  const place=requireId(placeId,'placeId');
  return `local RunService = game:GetService("RunService")
assert(game.GameId == ${universe}, "unexpected universe: " .. tostring(game.GameId))
assert(game.PlaceId == ${place}, "unexpected place: " .. tostring(game.PlaceId))
assert(RunService:IsServer(), "Luau Execution did not start a server runtime")
assert(not RunService:IsStudio(), "headless Open Cloud proof unexpectedly reports Studio")
print("STARBLOX_OPEN_CLOUD_PROOF_OK universe=${universe} place=${place} server=true studio=false version=" .. tostring(game.PlaceVersion))
return tostring(game.GameId), tostring(game.PlaceId), tostring(game.PlaceVersion)
`;
}

function delay(ms){
  return new Promise(resolve => setTimeout(resolve,ms));
}

function taskFailed(task){
  if(task?.error) return true;
  return /FAIL|ERROR|CANCEL/i.test(String(task?.state || ''));
}

export async function runStarBloxOpenCloudProof({
  apiKey,
  universeId,
  placeId,
  fetchImpl=globalThis.fetch,
  pollIntervalMs=1000,
  timeoutMs=90_000,
  createRetryAttempts=4,
  createRetryBaseMs=2000,
  createRetryMaxMs=30_000
}){
  if(typeof apiKey !== 'string' || !apiKey.trim()){
    throw new Error('ROBLOX_OPEN_CLOUD_API_KEY is required');
  }
  if(typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  const universe=requireId(universeId,'universeId');
  const place=requireId(placeId,'placeId');
  const script=buildStarBloxHeadlessProbeScript({universeId:universe,placeId:place});

  const create=await jsonRequest(
    fetchImpl,
    API_ROOT + '/universes/' + universe + '/places/' + place + '/luau-execution-session-tasks',
    {
      method:'POST',
      apiKey,
      body:{script,timeout:'30s'},
      retry429:Math.max(0,Math.min(8,Number(createRetryAttempts) || 0)),
      retryBaseMs:Math.max(0,Number(createRetryBaseMs) || 0),
      retryMaxMs:Math.max(0,Number(createRetryMaxMs) || 0)
    }
  );

  const statusUrl=taskUrl(create.path);
  const deadline=Date.now()+timeoutMs;
  let task=create;

  while(String(task?.state || '') === 'PROCESSING'){
    if(Date.now() >= deadline) throw new Error('Roblox Luau execution task timed out while polling');
    await delay(pollIntervalMs);
    task=await jsonRequest(fetchImpl,statusUrl,{apiKey});
  }

  if(taskFailed(task)){
    const message=task?.error?.message || task?.error?.code || task?.state || 'unknown task failure';
    throw new Error('Roblox Luau execution task failed: ' + String(message));
  }

  const logs=await jsonRequest(fetchImpl,statusUrl + '/logs',{apiKey});
  const logText=JSON.stringify(logs);
  const sentinel='STARBLOX_OPEN_CLOUD_PROOF_OK universe=' + universe +
    ' place=' + place + ' server=true studio=false';

  if(!logText.includes(sentinel)){
    throw new Error('Roblox Luau execution logs are missing the StarBlox headless proof sentinel');
  }

  return Object.freeze({
    schemaVersion:1,
    proofVersion:STARBLOX_OPEN_CLOUD_PROOF_VERSION,
    status:'verified',
    universeId:universe,
    placeId:place,
    taskPath:String(create.path),
    terminalState:String(task?.state || 'UNKNOWN'),
    evidence:Object.freeze({
      headlessRobloxServer:true,
      serverRuntime:true,
      studioRuntime:false,
      exactTargetIds:true,
      logSentinelVerified:true
    }),
    publicationStarted:false,
    placeMutationPerformed:false,
    liveActivationAllowed:false
  });
}
