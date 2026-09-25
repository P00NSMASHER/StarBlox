import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_CORE_LOOP_PROOF_VERSION='starblox-core-loop-proof-v1';
export const STARBLOX_CORE_LOOP_RELEASE_ID='starblox-private-step7-v1';

export function buildCoreLoopProbeScript({releaseId=STARBLOX_CORE_LOOP_RELEASE_ID}={}){
  const release=JSON.stringify(String(releaseId));
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("StarBlox")
local manifest = require(shared:WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")

local config = require(shared:WaitForChild("CoreLoopConfig"))
assert(config.LoopId == "brightside-core-loop-v1", "unexpected core loop id")
assert(config.DistrictName == "Brightside Plaza", "unexpected district")
assert(#config.Activities == 3, "core loop must contain exactly three activities")
assert(config.DailyRewardRunCap == 3, "unexpected reward run cap")
for _, activity in config.Activities do
    assert(activity.Answer == nil, "correct answers must not be replicated in CoreLoopConfig")
    assert(activity.Source == "ABVM Grade 2 current source pack", "activity source mismatch")
    assert(#activity.Choices == 3, "each activity must expose exactly three choices")
end

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local runtime = serverRoot:WaitForChild("Runtime")
assert(runtime:IsA("Script"), "production Runtime script missing")
assert((runtime :: any).Disabled == false, "production Runtime script disabled")

-- Luau Execution runs a custom script-execution server, so normal Script
-- instances are present but not auto-started. Instantiate the exact
-- production CoreGameLoopService explicitly for engine verification.
local service = require(serverRoot:WaitForChild("CoreGameLoopService"))
local proofProfiles = {
    Get = function(_self, _player)
        return {}
    end,
    WithProfile = function(_self, _player, _callback)
        return false
    end,
}
local proofReplicas = {
    Sync = function(_self, _player, _data)
        return true
    end,
}
local core = service.new(proofProfiles, proofReplicas)

local world = Workspace:WaitForChild("StarBloxCoreLoop", 5)
assert(world ~= nil, "core-loop world missing")
assert(world:GetAttribute("LoopId") == config.LoopId, "world loop id mismatch")
local spawn = world:FindFirstChild("StarBloxSpawn")
assert(spawn and spawn:IsA("SpawnLocation"), "StarBlox spawn missing")

local stationNames = {
    ["word-portal-put-v1"] = "WordPortalStation",
    ["spelling-forge-fog-v1"] = "SpellingForgeStation",
    ["culture-lab-culture-v1"] = "CultureLabStation",
}
for _, activity in config.Activities do
    local station = world:FindFirstChild(stationNames[activity.Id])
    assert(station and station:IsA("BasePart"), "station missing: " .. activity.Id)
    assert(station:GetAttribute("ActivityId") == activity.Id, "station activity mismatch")
    local prompt = station:FindFirstChild("StartActivityPrompt")
    assert(prompt and prompt:IsA("ProximityPrompt"), "station prompt missing: " .. activity.Id)
    assert(prompt.ActionText == "Start Activity", "station action text mismatch")
end
assert(world:FindFirstChild("NorthPath") ~= nil, "north navigation path missing")
assert(world:FindFirstChild("EastPath") ~= nil, "east navigation path missing")
assert(world:FindFirstChild("WestPath") ~= nil, "west navigation path missing")

local remotes = ReplicatedStorage:WaitForChild("StarBloxCoreLoop", 5)
assert(remotes ~= nil, "core-loop remotes missing")
assert(remotes:GetAttribute("LoopId") == config.LoopId, "remote loop id mismatch")
assert(remotes:FindFirstChild("ActivityOpened"):IsA("RemoteEvent"), "ActivityOpened remote missing")
assert(remotes:FindFirstChild("SubmitAnswer"):IsA("RemoteFunction"), "SubmitAnswer remote missing")
assert(remotes:FindFirstChild("RequestStatus"):IsA("RemoteFunction"), "RequestStatus remote missing")

assert(service.GradeAnswer("word-portal-put-v1", "put") == true, "word portal correct answer rejected")
assert(service.GradeAnswer("word-portal-put-v1", "blue") == false, "word portal wrong answer accepted")
assert(service.GradeAnswer("spelling-forge-fog-v1", "fog") == true, "spelling forge correct answer rejected")
assert(service.GradeAnswer("culture-lab-culture-v1", "culture") == true, "culture lab correct answer rejected")

local profile = {
    Economy = {Coins = 0, XP = 0, Stars = 0, TransferWins = 0},
    Progress = {Districts = {}, MasteredSkills = {}},
    Inventory = {Cosmetics = {}, Equipped = {}},
}
local day = "2026-09-25"
local ids = {
    "word-portal-put-v1",
    "spelling-forge-fog-v1",
    "culture-lab-culture-v1",
}
for runIndex = 1, 3 do
    for _, activityId in ids do
        local result = service.ApplyCompletion(profile, activityId, day)
        assert(result.ok == true and result.duplicate == false, "activity completion rejected")
    end
end

assert(profile.Progress.CoreLoop.LoopRuns == 3, "loop run progression mismatch")
assert(profile.Progress.CoreLoop.RunNumber == 4, "next run number mismatch")
assert(profile.Progress.CoreLoop.RewardedRunsToday == 3, "daily rewarded-run cap accounting mismatch")
assert(profile.Progress.Districts["Brightside Plaza"] == 3, "district progression mismatch")
assert(profile.Inventory.Cosmetics["brightside-spark-trail"] == true, "first-loop cosmetic missing")
assert(profile.Economy.Coins == 90, "three rewarded loops should grant 90 coins")
assert(profile.Economy.XP == 60, "three rewarded loops should grant 60 XP")
assert(profile.Economy.Stars == 3, "three rewarded loops should grant 3 stars")

local beforeCoins = profile.Economy.Coins
local beforeXP = profile.Economy.XP
local beforeStars = profile.Economy.Stars
local fourth = service.ApplyCompletion(profile, "word-portal-put-v1", day)
assert(fourth.ok == true and fourth.rewardEligible == false, "fourth daily loop must remain playable without rewards")
assert(fourth.progress == 1 and fourth.loopRuns == 3, "repeatable fourth run did not advance")
assert(profile.Economy.Coins == beforeCoins and profile.Economy.XP == beforeXP and profile.Economy.Stars == beforeStars, "daily reward cap failed closed")

local duplicate = service.ApplyCompletion(profile, "word-portal-put-v1", day)
assert(duplicate.ok == true and duplicate.duplicate == true, "same-run duplicate completion was not detected")
assert(profile.Economy.Coins == beforeCoins, "duplicate activity changed economy")

core:Destroy()

print("STARBLOX_CORE_LOOP_OK release=" .. tostring(manifest.releaseId) .. " version=" .. tostring(game.PlaceVersion) .. " loops=" .. tostring(profile.Progress.CoreLoop.LoopRuns))
return tostring(manifest.releaseId), tostring(game.PlaceVersion), tostring(profile.Progress.CoreLoop.LoopRuns)
`;
}

export async function runCoreLoopProof({
  apiKey,
  universeId,
  placeId,
  releaseId=STARBLOX_CORE_LOOP_RELEASE_ID,
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
    script:buildCoreLoopProbeScript({releaseId})
  });
  const text=JSON.stringify(task.logs);
  const sentinel='STARBLOX_CORE_LOOP_OK release=' +
    String(releaseId) + ' version=' + String(task.versionNumber) + ' loops=3';
  if(!text.includes(sentinel)){
    throw new Error('Roblox logs are missing the core-loop proof sentinel');
  }

  return Object.freeze({
    schemaVersion:1,
    proofVersion:STARBLOX_CORE_LOOP_PROOF_VERSION,
    status:'verified',
    releaseId:String(releaseId),
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state,
    evidence:Object.freeze({
      productionRuntimeScriptPresent:true,
      productionRuntimeScriptEnabled:true,
      engineServiceInstantiation:true,
      threeActivityStations:true,
      navigationPaths:true,
      serverAuthoritativeAnswers:true,
      replicatedAnswersHidden:true,
      repeatableRuns:true,
      durableDistrictProgression:true,
      firstLoopCosmeticUnlock:true,
      dailyRewardCap:true,
      duplicateRewardGuard:true,
      coreLoopRemotes:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
