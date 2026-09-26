import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_SERVER_BOOT_PROOF_VERSION='starblox-production-server-boot-v5';
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
local ServerStorage = game:GetService("ServerStorage")
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
local witness = ServerStorage:FindFirstChild("BrookhavenWorldBaseline")
assert(witness ~= nil and witness:IsA("Model"), "immutable Brookhaven witness missing from ServerStorage")
assert(Workspace:FindFirstChild("BrookhavenWorldBaseline") == nil, "immutable Brookhaven witness leaked into Workspace")
local coreConfig = require(shared:WaitForChild("CoreLoopConfig"))
local mirrorConfig = require(shared:WaitForChild("BrookhavenMirrorConfig"))
assert(mirrorConfig.World.Mode == "exact-frozen-brookhaven-world", "Brookhaven mirror world mode missing")
assert(mirrorConfig.World.BrookhavenBaselineLocked == true, "Brookhaven baseline lock missing")
assert(mirrorConfig.Economy.CorrectAnswerCoins == 10, "mirror learning-coin reward mismatch")
assert(mirrorConfig.Economy.PaidCurrencyRequiredForGameplayUnlocks == false, "paid gameplay unlock boundary drift")
assert(coreConfig.PolishRevision == "phase8-challenging-questions-v1", "Phase 8 config revision missing")
assert(coreConfig.QuestionRotation.AnswersServerOnly == true, "Phase 8 answer boundary missing")
assert(coreConfig.QuestionRotation.NoLiveLlm == true, "Phase 8 live-model boundary missing")
assert(coreConfig.QuestionRotation.Strategy == "fresh-material-once-then-current-snapshot-star-fallback-loop", "Phase 8 rotation strategy missing")
assert(coreConfig.QuestionRotation.StarFallbackPerStation >= 20, "Phase 8 STAR fallback floor missing")
assert(coreConfig.QuestionRotation.MinimumQuestionsPerStation >= 20, "Phase 8 minimum station pool missing")
assert(coreConfig.QuestionReward.Coins == 10, "Phase 8 correct-answer coin reward mismatch")

local questionBank = require(serverRoot:WaitForChild("CoreQuestionBank"))
assert(questionBank.Source.CertificationVersion == "dynamic-abvm-star-sync-v1", "Phase 8 question bank certification missing")
assert(questionBank.Source.MaterialFirst == true, "Phase 8 material-first marker missing")
assert(questionBank.Source.StarFallback == true, "Phase 8 STAR fallback marker missing")
assert((questionBank.Source.StarReadingCount or 0) >= 25, "Phase 8 STAR Reading floor missing")
assert((questionBank.Source.StarMathCount or 0) >= 25, "Phase 8 STAR Math floor missing")
for _, stationId in {"word-portal-put-v1","spelling-forge-fog-v1","culture-lab-culture-v1"} do
    local materialCount = questionBank.MaterialCountByStation[stationId] or 0
    local totalCount = questionBank.CountForStation(stationId)
    assert(materialCount > 0, "Phase 8 material pool missing: " .. stationId)
    assert(totalCount >= materialCount + coreConfig.QuestionRotation.StarFallbackPerStation, "Phase 8 station question count mismatch: " .. stationId)
end

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
assert(services.WorldProjection ~= nil, "WorldProjection service missing after bootstrap")
assert(services.CoreLoop ~= nil, "CoreLoop service missing after bootstrap")
assert(services.HomeEconomy ~= nil, "HomeEconomy service missing after bootstrap")
assert(services.MirrorLifestyle ~= nil, "MirrorLifestyle service missing after bootstrap")
assert(services.Roleplay ~= nil, "Roleplay service missing after bootstrap")
assert(services.Family ~= nil, "Family service missing after bootstrap")
assert(services.PrivatePlaytestTelemetry ~= nil, "private playtest telemetry service missing after bootstrap")
assert((services.PrivatePlaytestTelemetry :: any)._retentionStore ~= nil, "retention aggregate store missing after bootstrap")

local shopRemotes = ReplicatedStorage:FindFirstChild("StarBloxShop")
assert(shopRemotes ~= nil and shopRemotes:IsA("Folder"), "StarBlox shop remotes missing after bootstrap")
for _, remoteName in {
    "GetState",
    "PurchaseItem",
    "PurchaseHomeTier",
    "PurchaseHomeStyle",
    "SelectHomeStyle",
    "SetPlacement",
    "SetPlacementVisibility",
    "ResetPlacement",
    "GetPlots",
    "SelectPlot",
    "VisitHome",
    "ReturnWorld",
} do
    local remote = shopRemotes:FindFirstChild(remoteName)
    assert(remote ~= nil and remote:IsA("RemoteFunction"), "shop remote missing: " .. remoteName)
end
assert(shopRemotes:GetAttribute("HouseStyleCount") == 8, "house style catalog count mismatch")
assert(shopRemotes:GetAttribute("PlacementVersion") == 1, "home placement version missing")
assert(shopRemotes:GetAttribute("PlacementStep") == 1, "home placement step mismatch")
assert(shopRemotes:GetAttribute("RotationStep") == 15, "home placement rotation step mismatch")

local homeFolder = Workspace:FindFirstChild("StarBloxPlayerHomes")
assert(homeFolder ~= nil and homeFolder:IsA("Folder"), "player-home runtime folder missing after bootstrap")
assert(homeFolder:GetAttribute("RuntimeOwned") == true, "player-home folder must be runtime-owned")
assert(homeFolder:GetAttribute("BaselineMutationAllowed") == false, "player-home folder must not mutate baseline")

local mirrorRemotes = ReplicatedStorage:FindFirstChild("StarBloxMirror")
assert(mirrorRemotes ~= nil and mirrorRemotes:IsA("Folder"), "Brookhaven mirror remotes missing after bootstrap")
for _, remoteName in {"GetState","PurchaseVehicle","SpawnVehicle","DespawnVehicle","PurchaseTool","EquipTool","VehicleAction"} do
    local remote = mirrorRemotes:FindFirstChild(remoteName)
    assert(remote ~= nil and remote:IsA("RemoteFunction"), "mirror remote missing: " .. remoteName)
end

local vehicleFolder = Workspace:FindFirstChild("StarBloxVehicles")
assert(vehicleFolder ~= nil and vehicleFolder:IsA("Folder"), "vehicle runtime folder missing after bootstrap")
assert(vehicleFolder:GetAttribute("RuntimeOwned") == true, "vehicle folder must be runtime-owned")
assert(vehicleFolder:GetAttribute("BaselineMutationAllowed") == false, "vehicle folder must not mutate baseline")

local roleplayRemotes = ReplicatedStorage:FindFirstChild("StarBloxRoleplay")
assert(roleplayRemotes ~= nil and roleplayRemotes:IsA("Folder"), "roleplay remotes missing after bootstrap")
for _, remoteName in {"GetState","SetJob","SaveBio","ResetAvatar","SaveOutfit","LoadOutfit","DeleteOutfit","ApplyAvatarPreset"} do
    local remote = roleplayRemotes:FindFirstChild(remoteName)
    assert(remote ~= nil and remote:IsA("RemoteFunction"), "roleplay remote missing: " .. remoteName)
end

local brookhaven = Workspace:FindFirstChild("BrookhavenWorldRuntime")
assert(brookhaven ~= nil and brookhaven:IsA("Model"), "mutable Brookhaven runtime projection missing")
assert(brookhaven:GetAttribute("StarBloxRuntimeProjection") == true, "Brookhaven runtime projection marker missing")
assert(brookhaven:GetAttribute("ImmutableWitnessName") == "BrookhavenWorldBaseline", "Brookhaven runtime witness binding missing")

local familyRemotes = ReplicatedStorage:FindFirstChild("StarBloxFamily")
assert(familyRemotes ~= nil and familyRemotes:IsA("Folder"), "family remotes missing after bootstrap")
for _, remoteName in {"GetState","Invite","RespondInvite","Leave","RemoveMember"} do
    local remote = familyRemotes:FindFirstChild(remoteName)
    assert(remote ~= nil and remote:IsA("RemoteFunction"), "family remote missing: " .. remoteName)
end
local familyChanged = familyRemotes:FindFirstChild("StateChanged")
assert(familyChanged ~= nil and familyChanged:IsA("RemoteEvent"), "family state event missing")

local plotBindings = require(shared:WaitForChild("WorldPlotBindings"))
assert(#plotBindings.Plots == 8, "Brookhaven house plot binding count mismatch")
for _, plot in plotBindings.Plots do
    local part = brookhaven:FindFirstChild(plot.SourcePartName, true)
    assert(part ~= nil and part:IsA("BasePart"), "Brookhaven house plot source missing: " .. plot.SourcePartName)
end

-- Roblox materializes legacy surface joints when the serialized witness is
-- loaded. Verify the immutable ServerStorage witness and the mutable runtime
-- clone independently so interaction work can never masquerade as source drift.
local function classCountsFor(root)
    local counts = {}
    for _, instance in root:GetDescendants() do
        counts[instance.ClassName] = (counts[instance.ClassName] or 0) + 1
    end
    return counts
end
local classCounts = classCountsFor(witness)
local runtimeClassCounts = classCountsFor(brookhaven)

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
assert(liveCount == 5516, "Brookhaven immutable witness live count mismatch: actual=" .. tostring(liveCount) .. " expected=5516")
for className, expectedCount in expectedSerializedClasses do
    assert(
        (runtimeClassCounts[className] or 0) == expectedCount,
        "Brookhaven runtime projection class count mismatch for " ..
        className .. ": actual=" .. tostring(runtimeClassCounts[className] or 0) ..
        " expected=" .. tostring(expectedCount)
    )
end
assert((runtimeClassCounts.Glue or 0) == 3, "unexpected runtime-projection Glue joint count")
assert((runtimeClassCounts.Snap or 0) == 4, "unexpected runtime-projection Snap joint count")
assert((runtimeClassCounts.Weld or 0) == 16, "unexpected runtime-projection Weld joint count")
local runtimeLiveCount = #brookhaven:GetDescendants() + 1
assert(runtimeLiveCount == 5516, "Brookhaven runtime projection live count mismatch: actual=" .. tostring(runtimeLiveCount) .. " expected=5516")

local prototypeWorld = Workspace:FindFirstChild("StarBloxCoreLoop")
assert(prototypeWorld == nil, "legacy prototype world must not be generated by production bootstrap")

local anchors = Workspace:FindFirstChild("StarBloxActivityAnchors")
assert(anchors ~= nil and anchors:IsA("Folder"), "real-world activity anchor folder missing")
for _, anchorName in {"WordPortalAnchor","SpellingForgeAnchor","CultureLabAnchor"} do
    local anchor = anchors:FindFirstChild(anchorName)
    assert(anchor ~= nil and anchor:IsA("BasePart"), "real-world activity anchor missing: " .. anchorName)
    assert(anchor.Transparency == 1, "activity anchor must remain invisible")
    assert(anchor.CanCollide == false, "activity anchor must remain non-colliding")
    assert(not anchor:IsDescendantOf(witness), "activity anchor was parented into immutable Brookhaven witness")
    assert(type(anchor:GetAttribute("SourceWorldPart")) == "string", "activity anchor source binding missing")
    local prompt = anchor:FindFirstChild("StartActivityPrompt")
    assert(prompt ~= nil and prompt:IsA("ProximityPrompt"), "activity prompt missing: " .. anchorName)
end
assert((services.CoreLoop :: any)._spawnCFrame ~= nil, "real-world spawn binding missing")

local telemetryRemote = ReplicatedStorage:FindFirstChild("StarBloxPrivatePlaytestTelemetry")
assert(telemetryRemote and telemetryRemote:IsA("RemoteEvent"), "playtest telemetry remote missing after bootstrap")

services.Family:Destroy()
services.Roleplay:Destroy()
services.MirrorLifestyle:Destroy()
services.HomeEconomy:Destroy()
services.CoreLoop:Destroy()
services.PrivatePlaytestTelemetry:Destroy()
services.WorldProjection:Destroy()
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
      immutableBrookhavenWitnessVerified:true,
      brookhavenRuntimeProjectionCreated:true,
      coreLoopCreated:true,
      prototypeWorldAbsent:true,
      activityAnchorsCreated:true,
      worldSpawnBound:true,
      playtestTelemetryCreated:true,
      rotatingQuestionBankCreated:true,
      materialFirstQuestionBank:true,
      persistentPerStationRotation:true,
      freshMaterialThenSnapshotStarFallback:true,
      dynamicQuestionSyncBank:true,
      starReadingAtLeast25:true,
      starMathAtLeast25:true,
      correctAnswerCoinEconomy:true,
      phase6RetentionStoreCreated:true,
      homeEconomyCreated:true,
      shopRemotesCreated:true,
      playerHomeRuntimeFolderCreated:true,
      homePlacementRemotesCreated:true,
      homePlacementPolicyVerified:true,
      houseStyleCatalogCreated:true,
      houseStyleRemotesCreated:true,
      brookhavenMirrorConfigLoaded:true,
      mirrorLifestyleCreated:true,
      mirrorRemotesCreated:true,
      vehicleRuntimeFolderCreated:true,
      learningCoinPurchaseEconomy:true,
      roleplayServiceCreated:true,
      roleplayRemotesCreated:true,
      familyServiceCreated:true,
      familyRemotesCreated:true,
      brookhavenHousePlotsBound:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
