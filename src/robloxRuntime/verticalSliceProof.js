import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_VERTICAL_SLICE_PROOF_VERSION='starblox-vertical-slice-proof-v1';
export const STARBLOX_VERTICAL_SLICE_RELEASE_ID='starblox-private-step6-v1';

export function buildVerticalSliceProbeScript({releaseId=STARBLOX_VERTICAL_SLICE_RELEASE_ID}={}){
  const release=JSON.stringify(String(releaseId));
  return `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local shared = ReplicatedStorage:WaitForChild("StarBlox")
local manifest = require(shared:WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")

local config = require(shared:WaitForChild("VerticalSliceConfig"))
assert(config.SliceId == "bright-side-word-portal-v1", "unexpected slice id")
assert(config.Quest.Id == "word-portal-put-v1", "unexpected quest id")
assert(config.Quest.Answer == nil, "correct answer must not be replicated to clients")
assert(#config.Quest.Choices == 3, "vertical-slice quest must expose exactly three choices")
assert(config.Reward.Coins == 10 and config.Reward.XP == 5 and config.Reward.Stars == 1, "unexpected reward")

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local runtime = serverRoot:WaitForChild("Runtime")
assert(runtime:IsA("Script"), "StarBlox Runtime server script missing")
assert((runtime :: any).Disabled == false, "StarBlox Runtime server script is disabled")

-- Open Cloud Luau Execution uses a custom script-execution server and does
-- not autorun normal Script instances. Instantiate the exact production
-- service module explicitly so the vertical slice is still exercised by
-- the real Roblox engine.
local serviceModule = serverRoot:WaitForChild("VerticalSliceService")
local service = require(serviceModule)
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
local proofService = service.new(proofProfiles, proofReplicas)

local world = Workspace:WaitForChild("StarBloxVerticalSlice", 5)
assert(world ~= nil, "vertical-slice world missing after explicit service start")
assert(world:GetAttribute("SliceId") == config.SliceId, "world slice id mismatch")

local spawn = world:FindFirstChild("StarBloxSpawn")
assert(spawn and spawn:IsA("SpawnLocation"), "StarBlox spawn missing")

local kiosk = world:FindFirstChild("QuestKiosk")
assert(kiosk and kiosk:IsA("BasePart"), "quest kiosk missing")
local prompt = kiosk:FindFirstChild("StartQuestPrompt")
assert(prompt and prompt:IsA("ProximityPrompt"), "quest prompt missing")
assert(prompt.ActionText == "Start Quest", "quest prompt action mismatch")
assert(prompt.ObjectText == "Word Portal", "quest prompt object mismatch")

local remotes = ReplicatedStorage:WaitForChild("StarBloxVerticalSlice", 10)
assert(remotes ~= nil, "vertical-slice remotes missing")
assert(remotes:GetAttribute("SliceId") == config.SliceId, "remote slice id mismatch")
assert(remotes:FindFirstChild("QuestOpened"):IsA("RemoteEvent"), "QuestOpened remote missing")
assert(remotes:FindFirstChild("SubmitAnswer"):IsA("RemoteFunction"), "SubmitAnswer remote missing")

assert(service.GradeAnswer("put") == true, "server grading rejected correct answer")
assert(service.GradeAnswer("blue") == false, "server grading accepted wrong answer")

proofService:Destroy()

print("STARBLOX_VERTICAL_SLICE_OK release=" .. tostring(manifest.releaseId) .. " version=" .. tostring(game.PlaceVersion) .. " slice=" .. tostring(config.SliceId))
return tostring(manifest.releaseId), tostring(game.PlaceVersion), tostring(config.SliceId)
`;
}

export async function runVerticalSliceProof({
  apiKey,
  universeId,
  placeId,
  releaseId=STARBLOX_VERTICAL_SLICE_RELEASE_ID,
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
    script:buildVerticalSliceProbeScript({releaseId})
  });
  const text=JSON.stringify(task.logs);
  const sentinel='STARBLOX_VERTICAL_SLICE_OK release=' +
    String(releaseId) + ' version=' + String(task.versionNumber) +
    ' slice=bright-side-word-portal-v1';
  if(!text.includes(sentinel)){
    throw new Error('Roblox logs are missing the vertical-slice proof sentinel');
  }

  return Object.freeze({
    schemaVersion:1,
    proofVersion:STARBLOX_VERTICAL_SLICE_PROOF_VERSION,
    status:'verified',
    releaseId:String(releaseId),
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state,
    evidence:Object.freeze({
      productionRuntimeScriptPresent:true,
      productionRuntimeScriptEnabled:true,
      engineServiceInstantiation:true,
      nativeWorld:true,
      spawn:true,
      questKiosk:true,
      proximityPrompt:true,
      serverAuthoritativeQuestion:true,
      replicatedAnswerHidden:true,
      rewardContract:true,
      questRemotes:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
