import {createHash} from 'node:crypto';
import {runOpenCloudLuauTask} from './privatePublish.js';

export const LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION=
  'starblox-legacy-brookhaven-private-release-v1';

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}
function fail(message){
  throw new Error('Legacy Brookhaven private release: '+message);
}
function requireSha(value,label){
  const text=String(value||'').toLowerCase();
  if(!/^[a-f0-9]{64}$/.test(text)) fail(label+' must be a SHA-256 digest');
  return text;
}
function requireCommit(value){
  const text=String(value||'').toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(text)) fail('source commit must be an exact 40-character Git SHA');
  return text;
}

export function verifyLegacyCandidateForPrivatePublish({
  candidate,
  artifactBytes,
  sourceCommit
}={}){
  if(candidate?.status!=='legacy-brookhaven-development-candidate-ready'){
    fail('verified legacy development candidate receipt is required');
  }
  const commit=requireCommit(sourceCommit);
  if(String(candidate.sourceCommit||'').toLowerCase()!==commit){
    fail('candidate source commit mismatch');
  }
  if(candidate?.authority?.privatePlaytestCandidate!==true ||
     candidate?.authority?.publicAccessChangeAllowed!==false ||
     candidate?.authority?.productionActivationAllowed!==false ||
     candidate?.authority?.exactCurrentParityClaimAllowed!==false){
    fail('candidate authority boundary is invalid');
  }
  if(candidate?.release?.releaseChannel!=='private-staging' ||
     candidate?.release?.productionActivationAllowed!==false){
    fail('candidate release channel is not private fail-closed staging');
  }
  if(!(artifactBytes instanceof Uint8Array) || artifactBytes.byteLength===0){
    fail('candidate artifact bytes are required');
  }
  const bytes=Buffer.from(artifactBytes);
  const artifactSha=sha256(bytes);
  if(requireSha(candidate?.artifact?.sha256,'candidate artifact SHA')!==artifactSha ||
     Number(candidate?.artifact?.bytes)!==bytes.length){
    fail('candidate artifact identity mismatch');
  }
  const xml=bytes.toString('utf8');
  for(const required of ['<roblox','BrookhavenWorldBaseline','StarBlox','DeploymentManifest']){
    if(!xml.includes(required)) fail('candidate artifact missing '+required);
  }
  if(Number(candidate?.world?.geometryCount)!==14459 ||
     Number(candidate?.world?.forbiddenGameplayClassCount)!==0 ||
     candidate?.world?.runtimeProjectionPresentInStaticArtifact!==false ||
     candidate?.world?.runtimeProjectionCreatedAtBoot!==true){
    fail('candidate world proof is incomplete');
  }
  const baselineModelSha256=requireSha(
    candidate?.world?.sanitizedBaselineSha256,
    'sanitized baseline SHA'
  );
  const mountedSubtreeSha256=requireSha(
    candidate?.world?.witnessSubtreeSha256,
    'witness subtree SHA'
  );
  const subtreeInstanceCount=Number(candidate?.world?.subtreeInstanceCount);
  if(!Number.isInteger(subtreeInstanceCount) || subtreeInstanceCount<=14459){
    fail('candidate witness subtree instance count is invalid');
  }
  if(candidate?.catalogs?.completion?.vehicleCatalogComplete!==true ||
     candidate?.catalogs?.completion?.inventoryCatalogComplete!==true ||
     candidate?.catalogs?.completion?.houseCatalogComplete!==true){
    fail('legacy source catalog completion proof is missing');
  }
  return Object.freeze({
    version:LEGACY_BROOKHAVEN_PRIVATE_RELEASE_VERSION,
    sourceCommit:commit,
    releaseId:String(candidate.release.releaseId),
    artifactSha256:artifactSha,
    artifactBytes:bytes.length,
    baselineModelSha256,
    mountedSubtreeSha256,
    subtreeInstanceCount,
    geometryCount:14459,
    seatCount:399,
    vehicleSeatCount:12,
    doors:Number(candidate?.bindings?.doors||0),
    garages:Number(candidate?.bindings?.garages||0),
    lights:Number(candidate?.bindings?.lights||0),
    plots:Number(candidate?.bindings?.plots||0),
    catalogVehicles:Number(candidate?.catalogs?.runtime?.vehicles||0),
    catalogInventory:Number(candidate?.catalogs?.runtime?.inventoryRuntimeEntries||0),
    catalogHouses:Number(candidate?.catalogs?.runtime?.houses||0)
  });
}

export function buildLegacyPublishedServerProbeScript({
  releaseId,
  versionNumber,
  geometryCount=14459,
  seatCount=399,
  vehicleSeatCount=12,
  doors,
  garages,
  lights,
  plots,
  catalogVehicles,
  catalogInventory,
  catalogHouses
}={}){
  const release=JSON.stringify(String(releaseId||''));
  const version=Number(versionNumber);
  if(!Number.isInteger(version)||version<1) fail('published version must be a positive integer');
  for(const [label,value] of Object.entries({
    geometryCount,seatCount,vehicleSeatCount,doors,garages,lights,plots,
    catalogVehicles,catalogInventory,catalogHouses
  })){
    if(!Number.isInteger(Number(value))||Number(value)<0) fail(label+' must be a nonnegative integer');
  }
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local ServerStorage = game:GetService("ServerStorage")
local Workspace = game:GetService("Workspace")

assert(game.PlaceVersion == ${version}, "unexpected published version: " .. tostring(game.PlaceVersion))

local shared = ReplicatedStorage:WaitForChild("StarBlox")
local manifest = require(shared:WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.releaseChannel == "private-staging", "unexpected release channel")
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")

local mirrorConfig = require(shared:WaitForChild("BrookhavenMirrorConfig"))
assert(mirrorConfig.World.Mode == "legacy-reference-safe-world", "legacy world mode missing")
assert(mirrorConfig.World.BrookhavenBaselineLocked == true, "baseline lock missing")

local legacyMirror = require(shared:WaitForChild("LegacyMirrorCatalog"))
local legacyStore = require(shared:WaitForChild("LegacyStoreCatalog"))
local legacyInteractions = require(shared:WaitForChild("LegacyWorldInteractionBindings"))
local legacyPlots = require(shared:WaitForChild("LegacyWorldPlotBindings"))
assert(#legacyMirror.Vehicles == ${Number(catalogVehicles)}, "legacy vehicle catalog count mismatch")
assert(#legacyMirror.Inventory == ${Number(catalogInventory)}, "legacy inventory catalog count mismatch")
assert(#legacyStore.Styles == ${Number(catalogHouses)}, "legacy house catalog count mismatch")
assert(#legacyInteractions.Doors == ${Number(doors)}, "legacy door binding count mismatch")
assert(#legacyInteractions.GarageDoors == ${Number(garages)}, "legacy garage binding count mismatch")
assert(#legacyInteractions.Lights == ${Number(lights)}, "legacy light binding count mismatch")
assert(#legacyPlots.Plots == ${Number(plots)}, "legacy plot binding count mismatch")

local witness = ServerStorage:FindFirstChild("BrookhavenWorldBaseline")
assert(witness and witness:IsA("Model"), "legacy Brookhaven witness missing")
assert(Workspace:FindFirstChild("BrookhavenWorldBaseline") == nil, "immutable witness leaked into Workspace")

local packages = ReplicatedStorage:FindFirstChild("Packages")
local serverPackages = ServerScriptService:FindFirstChild("ServerPackages")
assert(packages ~= nil, "shared Packages missing")
assert(serverPackages ~= nil, "ServerPackages missing")
local matterModule = packages:FindFirstChild("Matter")
local profileStoreModule = serverPackages:FindFirstChild("ProfileStore")
local replicaServerModule = ServerScriptService:FindFirstChild("ReplicaServer")
assert(matterModule ~= nil, "Matter missing")
assert(profileStoreModule ~= nil, "ProfileStore missing")
assert(replicaServerModule ~= nil, "ReplicaServer missing")

local okMatter, Matter = pcall(require, matterModule)
local okProfile, ProfileStore = pcall(require, profileStoreModule)
local okReplica, Replica = pcall(require, replicaServerModule)
assert(okMatter and Matter ~= nil, "Matter failed to require")
assert(okProfile and ProfileStore ~= nil, "ProfileStore failed to require")
assert(okReplica and Replica ~= nil, "ReplicaServer failed to require")

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local Bootstrap = require(serverRoot:WaitForChild("Bootstrap"))

-- Luau execution sessions do not automatically run place Scripts. Start the same
-- production bootstrap explicitly, matching the established StarBlox server-boot proof.
local okBootstrap, services = pcall(function()
    return Bootstrap.start({
        ProfileStore = ProfileStore,
        Replica = Replica,
        Matter = Matter,
    })
end)
assert(okBootstrap, "legacy Bootstrap.start failed: " .. tostring(services))
assert(type(services) == "table", "legacy Bootstrap did not return services")

local runtimeWorld = Workspace:FindFirstChild("BrookhavenWorldRuntime")
assert(runtimeWorld and runtimeWorld:IsA("Model"), "legacy runtime projection missing")
assert(runtimeWorld:GetAttribute("StarBloxRuntimeProjection") == true, "runtime projection marker missing")
assert(runtimeWorld:GetAttribute("ImmutableWitnessName") == "BrookhavenWorldBaseline", "runtime witness marker missing")

local geometry = 0
local seats = 0
local vehicleSeats = 0
for _, instance in runtimeWorld:GetDescendants() do
    if instance:IsA("BasePart") then
        geometry += 1
    end
    if instance:IsA("VehicleSeat") then
        vehicleSeats += 1
    elseif instance:IsA("Seat") then
        seats += 1
    end
    assert(not instance:IsA("Script"), "runtime world contains Script")
    assert(not instance:IsA("LocalScript"), "runtime world contains LocalScript")
    assert(not instance:IsA("ModuleScript"), "runtime world contains ModuleScript")
    assert(not instance:IsA("RemoteEvent"), "runtime world contains RemoteEvent")
    assert(not instance:IsA("RemoteFunction"), "runtime world contains RemoteFunction")
end
assert(geometry == ${Number(geometryCount)}, "legacy geometry count mismatch: " .. tostring(geometry))
assert(seats == ${Number(seatCount)}, "legacy seat count mismatch: " .. tostring(seats))
assert(vehicleSeats == ${Number(vehicleSeatCount)}, "legacy vehicle-seat count mismatch: " .. tostring(vehicleSeats))

assert(services.WorldProjection ~= nil, "WorldProjection service missing")
assert(services.WorldInteractions ~= nil, "WorldInteractions service missing")
assert(services.CoreLoop ~= nil, "CoreLoop service missing")
assert(services.HomeEconomy ~= nil, "HomeEconomy service missing")
assert(services.MirrorLifestyle ~= nil, "MirrorLifestyle service missing")

local mirrorRemotes = ReplicatedStorage:FindFirstChild("StarBloxMirror")
local shopRemotes = ReplicatedStorage:FindFirstChild("StarBloxShop")
assert(mirrorRemotes and mirrorRemotes:IsA("Folder"), "mirror remotes missing")
assert(shopRemotes and shopRemotes:IsA("Folder"), "shop remotes missing")
assert(shopRemotes:GetAttribute("HouseStyleCount") == ${Number(catalogHouses)}, "runtime house-style count mismatch")

-- Clean up the explicit proof bootstrap before the execution session exits.
pcall(function() services.Family:Destroy() end)
pcall(function() services.Roleplay:Destroy() end)
pcall(function() services.MirrorLifestyle:Destroy() end)
pcall(function() services.HomeEconomy:Destroy() end)
pcall(function() services.CoreLoop:Destroy() end)
pcall(function() services.PrivatePlaytestTelemetry:Destroy() end)
pcall(function() services.WorldInteractions:Destroy() end)
pcall(function() services.WorldProjection:Destroy() end)
pcall(function() services.Action:Stop() end)
pcall(function() services.Replicas:Shutdown() end)
pcall(function() services.Profiles:ReleaseAll() end)

print("STARBLOX_LEGACY_PRIVATE_BOOT_OK release=" .. tostring(manifest.releaseId) ..
    " version=" .. tostring(game.PlaceVersion) ..
    " geometry=" .. tostring(geometry))
return tostring(manifest.releaseId), tostring(game.PlaceVersion), tostring(geometry)
`;
}

export async function verifyLegacyPublishedRelease({
  apiKey,
  universeId,
  placeId,
  binding,
  versionNumber,
  fetchImpl=globalThis.fetch,
  pollIntervalMs=1000,
  timeoutMs=90_000
}={}){
  if(!binding || typeof binding!=='object') fail('legacy candidate binding is required');
  const script=buildLegacyPublishedServerProbeScript({
    releaseId:binding.releaseId,
    versionNumber,
    geometryCount:binding.geometryCount,
    seatCount:binding.seatCount,
    vehicleSeatCount:binding.vehicleSeatCount,
    doors:binding.doors,
    garages:binding.garages,
    lights:binding.lights,
    plots:binding.plots,
    catalogVehicles:binding.catalogVehicles,
    catalogInventory:binding.catalogInventory,
    catalogHouses:binding.catalogHouses
  });
  const task=await runOpenCloudLuauTask({
    apiKey,
    universeId,
    placeId,
    fetchImpl,
    pollIntervalMs,
    timeoutMs,
    createRetryAttempts:12,
    createRetryBaseMs:2000,
    createRetryMaxMs:60_000,
    script
  });
  if(task.versionNumber!==Number(versionNumber)){
    fail('verified Roblox task ran version '+task.versionNumber+' instead of '+versionNumber);
  }
  const logs=JSON.stringify(task.logs);
  const sentinel='STARBLOX_LEGACY_PRIVATE_BOOT_OK release='+
    String(binding.releaseId)+' version='+String(versionNumber)+
    ' geometry='+String(binding.geometryCount);
  if(!logs.includes(sentinel)){
    fail('Roblox logs are missing the legacy private boot sentinel');
  }
  return Object.freeze({
    status:'verified',
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state,
    geometryCount:binding.geometryCount,
    publicAccessChangeAttempted:false,
    productionActivationAllowed:false
  });
}
