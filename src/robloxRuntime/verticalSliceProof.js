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

local world = Workspace:WaitForChild("StarBloxVerticalSlice", 10)
if world == nil then
    local LogService = game:GetService("LogService")
    local ok, history = pcall(function()
        return LogService:GetLogHistory()
    end)
    if ok and type(history) == "table" then
        local startIndex = math.max(1, #history - 40)
        for index = startIndex, #history do
            local row = history[index]
            print("STARBLOX_BOOT_LOG type=" .. tostring(row.messageType) .. " message=" .. tostring(row.message))
        end
    end
    local runtime = ServerScriptService:FindFirstChild("StarBlox") and ServerScriptService.StarBlox:FindFirstChild("Runtime")
    if runtime then
        print("STARBLOX_RUNTIME_DIAGNOSTIC class=" .. tostring(runtime.ClassName) .. " disabled=" .. tostring((runtime :: any).Disabled))
    else
        print("STARBLOX_RUNTIME_DIAGNOSTIC missing")
    end
    error("vertical-slice world missing")
end
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

local serviceModule = ServerScriptService:WaitForChild("StarBlox"):WaitForChild("VerticalSliceService")
local service = require(serviceModule)
assert(service.GradeAnswer("put") == true, "server grading rejected correct answer")
assert(service.GradeAnswer("blue") == false, "server grading accepted wrong answer")

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
