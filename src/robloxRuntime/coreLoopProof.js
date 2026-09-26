import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_CORE_LOOP_PROOF_VERSION='starblox-core-loop-proof-v2';
export const STARBLOX_CORE_LOOP_RELEASE_ID='starblox-private-step9-canonical-step6-v4';

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
assert(config.PolishRevision == "phase6-content-fun-retention-v1", "Phase 6 revision missing")
assert(config.ChallengeName == "Neighborhood Challenge", "challenge identity mismatch")
assert(#config.Activities == 3, "core loop must contain exactly three activities")
assert(config.DailyRewardRunCap == 3, "unexpected reward run cap")
assert(config.QuestionRotation.AnswersServerOnly == true, "answers must remain server-only")
assert(config.QuestionRotation.NoLiveLlm == true, "normal quest flow must not depend on a live LLM")
for _, activity in config.Activities do
    assert(activity.Answer == nil, "correct answers must not be replicated in CoreLoopConfig")
    assert(activity.Choices == nil, "question choices must come from the rotating server bank")
    assert(activity.Source == "ABVM Grade 2 current source pack", "activity source mismatch")
end

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local bank = require(serverRoot:WaitForChild("CoreQuestionBank"))
assert(bank.Source.CertificationVersion == "phase6-abvm-question-source-v1", "question-bank certification mismatch")
assert(bank.Source.AnswersServerOnly == true, "server bank answer boundary mismatch")
assert(bank.Source.NoLiveLlm == true, "question bank live-model boundary mismatch")

local stationIds = {
    "word-portal-put-v1",
    "spelling-forge-fog-v1",
    "culture-lab-culture-v1",
}
for _, stationId in stationIds do
    assert(bank.CountForStation(stationId) == 3, "station must have exactly three certified questions: " .. stationId)
    local q1 = bank.Select(stationId, 1)
    local q2 = bank.Select(stationId, 2)
    local q3 = bank.Select(stationId, 3)
    local q4 = bank.Select(stationId, 4)
    assert(q1 ~= nil and q2 ~= nil and q3 ~= nil and q4 ~= nil, "question rotation returned nil")
    assert(q1.Id ~= q2.Id and q2.Id ~= q3.Id and q1.Id ~= q3.Id, "three-run rotation must not repeat")
    assert(q4.Id == q1.Id, "fourth run must deterministically cycle to first question")
end

local runtime = serverRoot:WaitForChild("Runtime")
assert(runtime:IsA("Script"), "production Runtime script missing")
assert((runtime :: any).Disabled == false, "production Runtime script disabled")

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

assert(Workspace:FindFirstChild("StarBloxCoreLoop") == nil, "legacy prototype world must remain retired")
local brookhaven = Workspace:FindFirstChild("BrookhavenWorldBaseline")
assert(brookhaven ~= nil and brookhaven:IsA("Model"), "verified Brookhaven world missing")
local anchors = Workspace:FindFirstChild("StarBloxActivityAnchors")
assert(anchors ~= nil and anchors:IsA("Folder"), "real-world activity anchors missing")
for _, anchorName in {"WordPortalAnchor","SpellingForgeAnchor","CultureLabAnchor"} do
    local anchor = anchors:FindFirstChild(anchorName)
    assert(anchor ~= nil and anchor:IsA("BasePart"), "activity anchor missing: " .. anchorName)
    assert(anchor.Transparency == 1 and anchor.CanCollide == false, "activity anchor must stay invisible/non-colliding")
    assert(not anchor:IsDescendantOf(brookhaven), "runtime anchor mutated locked Brookhaven baseline")
    local prompt = anchor:FindFirstChild("StartActivityPrompt")
    assert(prompt ~= nil and prompt:IsA("ProximityPrompt"), "activity prompt missing: " .. anchorName)
end
assert((core :: any)._spawnCFrame ~= nil, "real-world spawn binding missing")

for _, stationId in stationIds do
    local question = bank.Select(stationId, 1)
    assert(question ~= nil, "question missing for grade proof")
    assert(service.GradeAnswer(question.Id, question.Answer) == true, "correct answer rejected")
    local wrong = nil
    for _, choice in question.Choices do
        if string.lower(choice) ~= string.lower(question.Answer) then
            wrong = choice
            break
        end
    end
    assert(wrong ~= nil and service.GradeAnswer(question.Id, wrong) == false, "wrong answer accepted")
end

local profile = {
    Economy = {Coins = 0, XP = 0, Stars = 0, TransferWins = 0},
    Progress = {Districts = {}, MasteredSkills = {}},
    Inventory = {Cosmetics = {}, Equipped = {}},
}
local initial = service.BuildStatus(profile)
assert(initial.challenge.name == "Neighborhood Challenge", "challenge status missing")
assert(initial.challenge.completed == 0 and initial.challenge.goal == 3, "initial challenge progress mismatch")
assert(initial.challenge.tier == "Rookie", "initial mastery tier mismatch")
assert(type(initial.recommendedQuestionId) == "string", "recommended rotating question missing")

local day = "2026-09-25"
for runIndex = 1, 3 do
    for _, activityId in stationIds do
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
assert(service.BuildStatus(profile).challenge.tier == "Pathfinder", "three-loop mastery tier mismatch")

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

print("STARBLOX_CORE_LOOP_OK release=" .. tostring(manifest.releaseId) .. " version=" .. tostring(game.PlaceVersion) .. " loops=" .. tostring(profile.Progress.CoreLoop.LoopRuns) .. " phase6=true")
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
    String(releaseId) + ' version=' + String(task.versionNumber) + ' loops=3 phase6=true';
  if(!text.includes(sentinel)){
    throw new Error('Roblox logs are missing the Phase 6 core-loop proof sentinel');
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
      rotatingCertifiedQuestionBank:true,
      serverAuthoritativeAnswers:true,
      replicatedAnswersHidden:true,
      noLiveLlmQuestDependency:true,
      realWorldActivityAnchors:true,
      prototypeWorldAbsent:true,
      worldSpawnBound:true,
      repeatableRuns:true,
      neighborhoodChallengeProgression:true,
      masteryTierProgression:true,
      durableDistrictProgression:true,
      firstLoopCosmeticUnlock:true,
      dailyRewardCap:true,
      duplicateRewardGuard:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
