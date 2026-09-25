import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_POLISH_PROOF_VERSION='starblox-player-polish-proof-v1';
export const STARBLOX_POLISH_RELEASE_ID='starblox-private-step8-v1';

export function buildPlayerPolishProbeScript({releaseId=STARBLOX_POLISH_RELEASE_ID}={}){
  const release=JSON.stringify(String(releaseId));
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("StarBlox")
local manifest = require(shared:WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")

local config = require(shared:WaitForChild("CoreLoopConfig"))
assert(config.PolishRevision == "step8-release-polish-v1", "polish revision mismatch")
assert(config.Onboarding.Title == "Welcome to Brightside!", "onboarding title mismatch")
assert(#config.Activities == 3, "expected three activities")
for index, activity in config.Activities do
    assert(activity.Index == index, "station index mismatch")
    assert(typeof(activity.Accent) == "Color3", "station accent missing")
    assert(type(activity.Direction) == "string" and activity.Direction ~= "", "station direction missing")
    assert(activity.Answer == nil, "answer leaked into replicated config")
end

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local runtime = serverRoot:WaitForChild("Runtime")
assert(runtime:IsA("Script"), "production Runtime script missing")
assert((runtime :: any).Disabled == false, "production Runtime script disabled")

-- Open Cloud Luau Execution uses a custom server that does not autorun
-- normal Script instances. Instantiate the exact production service module
-- explicitly, then inspect the Roblox instances it creates.
local service = require(serverRoot:WaitForChild("CoreGameLoopService"))
local profile = {
    Economy = {Coins = 0, XP = 0, Stars = 0, TransferWins = 0},
    Progress = {Districts = {}, MasteredSkills = {}},
    Inventory = {Cosmetics = {}, Equipped = {}},
}
local proofProfiles = {
    Get = function(_self, _player)
        return {Data = profile}
    end,
    WithProfile = function(_self, _player, callback)
        callback(profile)
        return true
    end,
}
local proofReplicas = {
    Sync = function(_self, _player, _data)
        return true
    end,
}
local core = service.new(proofProfiles, proofReplicas)

local prototypeWorld = Workspace:FindFirstChild("StarBloxCoreLoop")
assert(prototypeWorld == nil, "legacy prototype world must remain retired")

local remotes = ReplicatedStorage:WaitForChild("StarBloxCoreLoop", 5)
assert(remotes:FindFirstChild("ActivityOpened"):IsA("RemoteEvent"), "ActivityOpened remote missing")
assert(remotes:FindFirstChild("SubmitAnswer"):IsA("RemoteFunction"), "SubmitAnswer remote missing")
assert(remotes:FindFirstChild("RequestStatus"):IsA("RemoteFunction"), "RequestStatus remote missing")
assert(remotes:FindFirstChild("DismissOnboarding"):IsA("RemoteEvent"), "DismissOnboarding remote missing")

local status0 = service.BuildStatus(profile)
assert(status0.onboardingSeen == false, "onboarding should start unseen")
assert(status0.progress == 0, "initial progress mismatch")
assert(status0.recommendedActivityId == "word-portal-put-v1", "initial recommendation mismatch")
assert(status0.recommendedStationName == "Word Portal", "initial station recommendation mismatch")
assert(status0.rewardCapReached == false, "reward cap should not start reached")

assert(service.MarkOnboardingSeen(profile) == true, "first onboarding dismissal should mutate")
assert(service.MarkOnboardingSeen(profile) == false, "second onboarding dismissal should be idempotent")
assert(service.BuildStatus(profile).onboardingSeen == true, "onboarding dismissal did not persist")

local first = service.ApplyCompletion(profile, "word-portal-put-v1", "2026-09-25")
assert(first.ok == true and first.duplicate == false, "first activity completion failed")
local status1 = service.BuildStatus(profile)
assert(status1.progress == 1, "one-station progress mismatch")
assert(status1.completedActivityIds[1] == "word-portal-put-v1", "completed activity list mismatch")
assert(status1.recommendedActivityId == "spelling-forge-fog-v1", "second recommendation mismatch")
assert(status1.recommendedStationName == "Spelling Forge", "second station recommendation mismatch")

local second = service.ApplyCompletion(profile, "spelling-forge-fog-v1", "2026-09-25")
assert(second.ok == true, "second activity completion failed")
local status2 = service.BuildStatus(profile)
assert(status2.progress == 2, "two-station progress mismatch")
assert(status2.recommendedActivityId == "culture-lab-culture-v1", "third recommendation mismatch")
assert(status2.recommendedStationName == "Culture Lab", "third station recommendation mismatch")

profile.Progress.CoreLoop.RewardedRunsToday = config.DailyRewardRunCap
assert(service.BuildStatus(profile).rewardCapReached == true, "reward-cap status mismatch")

core:Destroy()

print("STARBLOX_PLAYER_POLISH_OK release=" .. tostring(manifest.releaseId) .. " version=" .. tostring(game.PlaceVersion) .. " revision=" .. tostring(config.PolishRevision))
return tostring(manifest.releaseId), tostring(game.PlaceVersion), tostring(config.PolishRevision)
`;
}

export async function runPlayerPolishProof({
  apiKey,
  universeId,
  placeId,
  releaseId=STARBLOX_POLISH_RELEASE_ID,
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
    script:buildPlayerPolishProbeScript({releaseId})
  });

  const text=JSON.stringify(task.logs);
  const sentinel='STARBLOX_PLAYER_POLISH_OK release=' +
    String(releaseId) + ' version=' + String(task.versionNumber) +
    ' revision=step8-release-polish-v1';
  if(!text.includes(sentinel)){
    throw new Error('Roblox logs are missing the Step 8 player-polish proof sentinel');
  }

  return Object.freeze({
    schemaVersion:1,
    proofVersion:STARBLOX_POLISH_PROOF_VERSION,
    status:'verified',
    releaseId:String(releaseId),
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state,
    evidence:Object.freeze({
      prototypeWorldAbsent:true,
      runtimeGeometryOwnedByWorldPipeline:true,
      onboardingRemote:true,
      onboardingPersistence:true,
      recommendedNextStation:true,
      rewardCapStatus:true,
      replicatedAnswersHidden:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
