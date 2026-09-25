import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_SERVER_BOOT_PROOF_VERSION='starblox-production-server-boot-v1';
export const STARBLOX_SERVER_BOOT_RELEASE_ID='starblox-private-step9-step5-v3';

export function buildProductionServerBootProbeScript({
  releaseId=STARBLOX_SERVER_BOOT_RELEASE_ID
}={}){
  const release=JSON.stringify(String(releaseId));
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("StarBlox")
local manifest = require(shared:WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")

local packages = ReplicatedStorage:FindFirstChild("Packages")
assert(packages ~= nil, "shared Wally Packages folder missing")
local matterModule = packages:FindFirstChild("Matter")
assert(matterModule ~= nil, "Matter package missing from published place")

local serverPackages = ServerScriptService:FindFirstChild("ServerPackages")
assert(serverPackages ~= nil, "server Wally Packages folder missing")
local profileStoreModule = serverPackages:FindFirstChild("ProfileStore")
assert(profileStoreModule ~= nil, "ProfileStore package missing from published place")

local replicaServerModule = ServerScriptService:FindFirstChild("ReplicaServer")
assert(replicaServerModule ~= nil, "ReplicaServer module missing from published place")
local replicaClientModule = ReplicatedStorage:FindFirstChild("ReplicaClient")
assert(replicaClientModule ~= nil, "ReplicaClient module missing from published place")

local okMatter, Matter = pcall(require, matterModule)
assert(okMatter and Matter ~= nil, "Matter package failed to require")
local okProfile, ProfileStore = pcall(require, profileStoreModule)
assert(okProfile and ProfileStore ~= nil, "ProfileStore package failed to require")
local okReplica, Replica = pcall(require, replicaServerModule)
assert(okReplica and Replica ~= nil, "ReplicaServer failed to require")

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local runtime = serverRoot:WaitForChild("Runtime")
assert(runtime:IsA("Script"), "production Runtime script missing")
assert((runtime :: any).Disabled == false, "production Runtime script disabled")

local Bootstrap = require(serverRoot:WaitForChild("Bootstrap"))
local okBootstrap, services = pcall(function()
    return Bootstrap.start({
        ProfileStore = ProfileStore,
        Replica = Replica,
        Matter = Matter,
    })
end)
assert(okBootstrap, "production Bootstrap.start failed: " .. tostring(services))
assert(type(services) == "table", "production Bootstrap did not return services")
assert(services.CoreLoop ~= nil, "CoreLoop service missing after bootstrap")
assert(services.PrivatePlaytestTelemetry ~= nil, "private playtest telemetry service missing after bootstrap")

local brookhaven = Workspace:FindFirstChild("BrookhavenWorldBaseline")
assert(brookhaven ~= nil and brookhaven:IsA("Model"), "verified Brookhaven world mount missing")
assert(#brookhaven:GetDescendants() >= 5493, "Brookhaven world mount is unexpectedly incomplete")

local world = Workspace:FindFirstChild("StarBloxCoreLoop")
assert(world ~= nil, "core-loop world was not created by production bootstrap")
local telemetryRemote = ReplicatedStorage:FindFirstChild("StarBloxPrivatePlaytestTelemetry")
assert(telemetryRemote and telemetryRemote:IsA("RemoteEvent"), "playtest telemetry remote missing after bootstrap")

services.CoreLoop:Destroy()
services.PrivatePlaytestTelemetry:Destroy()
services.Action:Stop()
services.Replicas:Shutdown()
services.Profiles:ReleaseAll()

print(
    "STARBLOX_PRODUCTION_SERVER_BOOT_OK release=" ..
    tostring(manifest.releaseId) ..
    " version=" .. tostring(game.PlaceVersion) ..
    " packages=true bootstrap=true"
)
return tostring(manifest.releaseId), tostring(game.PlaceVersion)
`;
}

export async function runProductionServerBootProof({
  apiKey,
  universeId,
  placeId,
  releaseId=STARBLOX_SERVER_BOOT_RELEASE_ID,
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
    script:buildProductionServerBootProbeScript({releaseId})
  });

  const text=JSON.stringify(task.logs);
  const sentinel='STARBLOX_PRODUCTION_SERVER_BOOT_OK release=' +
    String(releaseId) + ' version=' + String(task.versionNumber) +
    ' packages=true bootstrap=true';
  if(!text.includes(sentinel)){
    throw new Error('Roblox logs are missing the production server-boot proof sentinel');
  }

  return Object.freeze({
    schemaVersion:1,
    proofVersion:STARBLOX_SERVER_BOOT_PROOF_VERSION,
    status:'verified',
    releaseId:String(releaseId),
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state,
    evidence:Object.freeze({
      matterPresentAndRequired:true,
      profileStorePresentAndRequired:true,
      replicaServerPresentAndRequired:true,
      replicaClientPresent:true,
      productionRuntimeEnabled:true,
      productionBootstrapStarted:true,
      brookhavenWorldMounted:true,
      coreLoopCreated:true,
      playtestTelemetryCreated:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
