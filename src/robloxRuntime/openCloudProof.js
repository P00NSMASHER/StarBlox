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

async function jsonRequest(fetchImpl,url,{method='GET',apiKey,body}={}){
  let response;
  for(let attempt=0;attempt<4;attempt+=1){
    response=await fetchImpl(url,{
      method,
      headers:{
        'x-api-key':apiKey,
        ...(body === undefined ? {} : {'content-type':'application/json'})
      },
      ...(body === undefined ? {} : {body:JSON.stringify(body)})
    });
    if(response.status !== 429 || attempt === 3) break;
    const retrySeconds=Number(response.headers?.get?.('retry-after'));
    const waitMs=Number.isFinite(retrySeconds) && retrySeconds > 0
      ? Math.min(retrySeconds * 1000,30_000)
      : Math.min(5_000 * (2 ** attempt),30_000);
    await delay(waitMs);
  }
  const text=await response.text();
  let payload={};
  try{
    payload=text ? JSON.parse(text) : {};
  }catch{
    throw new Error('Roblox Open Cloud returned non-JSON HTTP ' + response.status);
  }
  if(!response.ok){
    const detail=payload?.message || payload?.error?.message || payload?.error || text;
    throw new Error('Roblox Open Cloud HTTP ' + response.status + ': ' + String(detail || 'request failed'));
  }
  return payload;
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
  timeoutMs=90_000
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
      body:{script,timeout:'30s'}
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
