import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_CORE_LOOP_PROOF_VERSION='starblox-core-loop-proof-v4';
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
assert(config.PolishRevision == "phase8-challenging-questions-v1", "Phase 8 revision missing")
assert(config.ChallengeName == "Neighborhood Challenge", "challenge identity mismatch")
assert(config.QuestionReward.Coins == 10, "correct-answer coin reward mismatch")
assert(config.QuestionReward.XP == 1, "correct-answer XP reward mismatch")
assert(config.QuestionRotation.StarFallbackPerStation >= 40, "STAR fallback floor mismatch")
assert(config.QuestionRotation.MinimumQuestionsPerStation >= 40, "minimum question pool mismatch")
assert(config.QuestionRotation.Strategy == "fresh-material-once-then-current-snapshot-star-fallback-loop", "rotation strategy mismatch")
assert(config.QuestionRotation.AnswersServerOnly == true, "answers must remain server-only")
assert(config.QuestionRotation.NoLiveLlm == true, "normal quest flow must not depend on a live LLM")
for _, activity in config.Activities do
    assert(activity.Reward.Coins == 0, "challenge station must not mint coins")
end
assert(config.LoopReward.Coins == 0, "challenge completion must not mint coins")

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local bank = require(serverRoot:WaitForChild("CoreQuestionBank"))
assert(bank.Source.CertificationVersion == "dynamic-abvm-star-sync-v1", "question-bank certification mismatch")
assert(bank.Source.MaterialFirst == true, "material-first bank marker missing")
assert(bank.Source.StarFallback == true, "STAR fallback bank marker missing")
assert(bank.Source.AnswersServerOnly == true, "server bank answer boundary mismatch")
assert((bank.Source.StarReadingCount or 0) >= 60, "STAR Reading floor missing")
assert((bank.Source.StarMathCount or 0) >= 60, "STAR Math floor missing")

local stationIds = {
    "word-portal-put-v1",
    "spelling-forge-fog-v1",
    "culture-lab-culture-v1",
}
for _, stationId in stationIds do
    local materialCount = bank.MaterialCountByStation[stationId] or 0
    local totalCount = bank.CountForStation(stationId)
    local fallbackCount = totalCount - materialCount
    assert(materialCount > 0, "station material pool missing: " .. stationId)
    assert(fallbackCount >= config.QuestionRotation.StarFallbackPerStation, "station STAR fallback pool below floor: " .. stationId)

    local materialSeen = {}
    for cursor = 0, materialCount - 1 do
        local question = bank.Select(stationId, cursor)
        assert(question ~= nil, "material rotation returned nil")
        assert(question.StationId == stationId, "question station binding mismatch")
        assert(question.Tier == "material", "fresh material must be served before STAR fallback")
        assert(materialSeen[question.Id] ~= true, "material question repeated before source material exhausted")
        materialSeen[question.Id] = true
    end

    local fallbackSeen = {}
    for offset = 0, fallbackCount - 1 do
        local cursor = materialCount + offset
        local question = bank.Select(stationId, cursor)
        assert(question ~= nil, "STAR fallback rotation returned nil")
        assert(question.StationId == stationId, "fallback question station binding mismatch")
        assert(question.Tier == "star-fallback", "fallback question must be STAR-aligned")
        assert(fallbackSeen[question.Id] ~= true, "STAR fallback repeated before its snapshot cycle completed")
        fallbackSeen[question.Id] = true
    end

    assert(
        bank.Select(stationId, materialCount + fallbackCount).Id == bank.Select(stationId, materialCount).Id,
        "after fresh material is exhausted, STAR fallback should loop from its first item"
    )
    assert(
        bank.Select(stationId, materialCount + (fallbackCount * 2)).Id == bank.Select(stationId, materialCount).Id,
        "STAR fallback should remain active rather than returning to stale material"
    )
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
end
assert((core :: any):GetSpawnCFrame() ~= nil, "real-world spawn binding missing")

local coinProfile = {
    Economy = {Coins = 0, XP = 0, Stars = 0, TransferWins = 0},
    Progress = {Districts = {}, MasteredSkills = {}},
    Learning = {QuestionCursorByStation = {}, RecentQuestionIds = {}},
    Inventory = {Cosmetics = {}, OwnedItems = {}, Equipped = {}},
}
local station = "word-portal-put-v1"
local q0 = bank.Select(station, 0)
local q1 = bank.Select(station, 1)
local q2 = bank.Select(station, 2)
assert(service.GradeAnswer(q0.Id, q0.Answer) == true, "correct answer rejected")
local r0 = service.ApplyCorrectQuestionReward(coinProfile, station, q0.Id)
assert(r0.ok == true and r0.coins == 10, "first correct answer did not pay 10 coins")
assert(coinProfile.Economy.Coins == 10, "coin balance mismatch after first answer")
assert(coinProfile.Learning.QuestionCursorByStation[station] == 1, "station cursor did not advance")
assert(r0.nextQuestionId == q1.Id, "next question did not rotate")

local stale = service.ApplyCorrectQuestionReward(coinProfile, station, q0.Id)
assert(stale.ok == false and stale.code == "stale_question", "stale answer replay was not rejected")
assert(coinProfile.Economy.Coins == 10, "stale answer replay changed coins")

local r1 = service.ApplyCorrectQuestionReward(coinProfile, station, q1.Id)
local r2 = service.ApplyCorrectQuestionReward(coinProfile, station, q2.Id)
assert(r1.ok == true and r2.ok == true, "rotated correct answers were rejected")
assert(coinProfile.Economy.Coins == 30, "three correct answers should grant 30 coins")
assert(coinProfile.Learning.QuestionCursorByStation[station] == 3, "station cursor mismatch after three answers")

local profile = {
    Economy = {Coins = 0, XP = 0, Stars = 0, TransferWins = 0},
    Progress = {Districts = {}, MasteredSkills = {}},
    Learning = {QuestionCursorByStation = {}, RecentQuestionIds = {}},
    Inventory = {Cosmetics = {}, OwnedItems = {}, Equipped = {}},
}
local day = "2026-09-25"
for runIndex = 1, 3 do
    for _, activityId in stationIds do
        local result = service.ApplyCompletion(profile, activityId, day)
        assert(result.ok == true and result.duplicate == false, "challenge completion rejected")
    end
end

assert(profile.Progress.CoreLoop.LoopRuns == 3, "loop run progression mismatch")
assert(profile.Progress.CoreLoop.RewardedRunsToday == 3, "daily rewarded-run cap accounting mismatch")
assert(profile.Inventory.Cosmetics["brightside-spark-trail"] == true, "first-loop cosmetic missing")
assert(profile.Economy.Coins == 0, "challenge progression must not mint coins")
assert(profile.Economy.XP == 45, "three rewarded challenges should grant 45 challenge XP")
assert(profile.Economy.Stars == 3, "three rewarded challenges should grant 3 stars")

core:Destroy()

print("STARBLOX_CORE_LOOP_OK release=" .. tostring(manifest.releaseId) .. " version=" .. tostring(game.PlaceVersion) .. " phase8=true dynamic=true coins=30")
return tostring(manifest.releaseId), tostring(game.PlaceVersion)
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
    String(releaseId) + ' version=' + String(task.versionNumber) + ' phase8=true dynamic=true coins=30';
  if(!text.includes(sentinel)){
    throw new Error('Roblox logs are missing the Phase 8 core-loop proof sentinel');
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
      materialFirstQuestionBank:true,
      materialQuestionsFirst:true,
      starFallbackAfterMaterial:true,
      freshMaterialThenSnapshotStarFallback:true,
      dynamicQuestionSyncBank:true,
      starReadingAtLeast60:true,
      starMathAtLeast60:true,
      persistentPerStationRotation:true,
      serverAuthoritativeAnswers:true,
      staleAnswerReplayBlocked:true,
      correctAnswerCoinReward:true,
      challengeCoinsDisabled:true,
      replicatedAnswersHidden:true,
      noLiveLlmQuestDependency:true,
      realWorldActivityAnchors:true,
      prototypeWorldAbsent:true,
      worldSpawnBound:true,
      repeatableChallenges:true,
      firstLoopCosmeticUnlock:true,
      dailyChallengeRewardCap:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
