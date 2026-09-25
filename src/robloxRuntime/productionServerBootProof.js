import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_SERVER_BOOT_PROOF_VERSION='starblox-production-server-boot-v1';
export const STARBLOX_SERVER_BOOT_RELEASE_ID='starblox-private-step9-canonical-step6-v4';

export function buildProductionServerBootProbeScript({
  releaseId=STARBLOX_SERVER_BOOT_RELEASE_ID,
  expectedVersion=null
}={}){
  const release=JSON.stringify(String(releaseId));
  const version=expectedVersion == null ? null : Number(expectedVersion);
  if(version !== null && (!Number.isInteger(version) || version < 1)){
    throw new Error('expectedVersion must be a positive integer');
  }
  const versionCheck=version === null
    ? ''
    : 'assert(game.PlaceVersion == ' + version + ', "unexpected published version: " .. tostring(game.PlaceVersion))\n';
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("StarBlox")
local manifest = require(shared:WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")
${versionCheck}

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

-- Roblox materializes legacy surface joints when the serialized world is
-- loaded into a live server. The locked artifact contains 5,493 serialized
-- instances including the root; live runtime expansion deterministically
-- adds 23 joints: 3 Glue + 4 Snap + 16 Weld. Verify both layers separately
-- so engine-generated joints do not masquerade as world drift.
local classCounts = {}
for _, instance in brookhaven:GetDescendants() do
    classCounts[instance.ClassName] = (classCounts[instance.ClassName] or 0) + 1
end

local expectedSerializedClasses = {
    CornerWedgePart = 31,
    Decal = 494,
    Part = 4385,
    Seat = 271,
    SpecialMesh = 62,
    VehicleSeat = 2,
    WedgePart = 247,
}
for className, expectedCount in expectedSerializedClasses do
    assert(
        (classCounts[className] or 0) == expectedCount,
        "Brookhaven serialized class count mismatch for " ..
        className .. ": actual=" .. tostring(classCounts[className] or 0) ..
        " expected=" .. tostring(expectedCount)
    )
end

assert((classCounts.Glue or 0) == 3, "unexpected runtime Glue joint count")
assert((classCounts.Snap or 0) == 4, "unexpected runtime Snap joint count")
assert((classCounts.Weld or 0) == 16, "unexpected runtime Weld joint count")
for _, forbiddenClass in {"Script","LocalScript","ModuleScript","RemoteEvent","RemoteFunction"} do
    assert((classCounts[forbiddenClass] or 0) == 0, "Brookhaven baseline contains forbidden runtime class " .. forbiddenClass)
end

local generatedJointCount = (classCounts.Glue or 0) + (classCounts.Snap or 0) + (classCounts.Weld or 0)
local liveCount = #brookhaven:GetDescendants() + 1
local serializedEquivalentCount = liveCount - generatedJointCount
assert(
    serializedEquivalentCount == 5493,
    "Brookhaven serialized-equivalent count mismatch: actual=" ..
    tostring(serializedEquivalentCount) .. " expected=5493"
)
assert(liveCount == 5516, "Brookhaven live runtime count mismatch: actual=" .. tostring(liveCount) .. " expected=5516")

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
  expectedVersion=null,
  fetchImpl=globalThis.fetch,
  pollIntervalMs=1000,
  timeoutMs=90_000,
  createRetryAttempts=12,
  createRetryBaseMs=2000,
  createRetryMaxMs=60_000
}){
  const task=await runOpenCloudLuauTask({
    apiKey,
    universeId,
    placeId,
    fetchImpl,
    pollIntervalMs,
    timeoutMs,
    createRetryAttempts,
    createRetryBaseMs,
    createRetryMaxMs,
    script:buildProductionServerBootProbeScript({releaseId,expectedVersion})
  });

  if(expectedVersion != null && task.versionNumber !== Number(expectedVersion)){
    throw new Error(
      'production server boot ran unexpected version: expected ' +
      expectedVersion + ' got ' + task.versionNumber
    );
  }

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
