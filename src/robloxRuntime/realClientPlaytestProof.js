import {
  runOpenCloudLuauTask
} from './privatePublish.js';

export const STARBLOX_REAL_CLIENT_PROOF_VERSION='starblox-real-client-playtest-v1';
export const STARBLOX_REAL_CLIENT_RELEASE_ID='starblox-private-step9-step5-v3';

export function buildRealClientPlaytestProbeScript({
  releaseId=STARBLOX_REAL_CLIENT_RELEASE_ID
}={}){
  const release=JSON.stringify(String(releaseId));
  return `local DataStoreService = game:GetService("DataStoreService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local manifest = require(ReplicatedStorage:WaitForChild("StarBlox"):WaitForChild("DeploymentManifest"))
assert(manifest.releaseId == ${release}, "unexpected release: " .. tostring(manifest.releaseId))
assert(manifest.productionActivationAllowed == false, "production activation must remain disabled")

local store = DataStoreService:GetDataStore("StarBloxPrivatePlaytestTelemetry_v1")
local ok, report = pcall(function()
    return store:GetAsync("latest")
end)
assert(ok, "failed to read private playtest telemetry")
assert(type(report) == "table", "no real-client playtest telemetry has been recorded yet")

assert(report.telemetryVersion == "starblox-private-playtest-v1", "telemetry version mismatch")
assert(report.releaseId == ${release}, "latest telemetry is not from the Step 9 release")
assert(report.placeVersion == game.PlaceVersion, "telemetry place version does not match current private place")
assert(type(report.sessionId) == "string" and report.sessionId ~= "", "session id missing")
assert(type(report.durationSeconds) == "number" and report.durationSeconds >= 1, "playtest duration missing")

local client = report.client
assert(type(client) == "table" and client.ready == true, "actual player LocalScript client did not report ready")
assert(client.touchEnabled == true, "Step 9 requires a real touch-device client")
assert(type(client.viewportX) == "number" and client.viewportX >= 300, "client viewport width is too small or missing")
assert(type(client.viewportY) == "number" and client.viewportY >= 300, "client viewport height is too small or missing")

local counts = report.counts
assert(type(counts) == "table", "client telemetry counts missing")
assert((counts.client_ready or 0) >= 1, "client-ready event missing")
assert((counts.onboarding_shown or 0) >= 1, "onboarding was not shown on the real client")
assert((counts.onboarding_dismissed or 0) >= 1, "onboarding was not dismissed on the real client")
assert((counts.activity_panel_opened or 0) >= 3, "all three activity panels were not opened")
assert((counts.wrong_feedback_seen or 0) >= 1, "wrong-answer feedback was not exercised")
assert((counts.success_feedback_seen or 0) >= 3, "success feedback was not seen for all three activities")

local server = report.server
assert(type(server) == "table", "authoritative server telemetry missing")
assert((server.station_opened or 0) >= 3, "all three stations were not opened authoritatively")
assert((server.answer_wrong or 0) >= 1, "authoritative wrong-answer path was not exercised")
assert((server.answer_correct or 0) >= 3, "all three activities were not completed correctly")
assert((server.loop_completed or 0) >= 1, "a full Brightside loop was not completed")

local activityIds = report.activityIds
assert(type(activityIds) == "table", "activity identity telemetry missing")
assert(activityIds["word-portal-put-v1"] == true, "Word Portal real-client evidence missing")
assert(activityIds["spelling-forge-fog-v1"] == true, "Spelling Forge real-client evidence missing")
assert(activityIds["culture-lab-culture-v1"] == true, "Culture Lab real-client evidence missing")

local privacy = report.privacy
assert(type(privacy) == "table", "privacy receipt missing")
assert(privacy.storesUsername == false, "telemetry must not store username")
assert(privacy.storesUserId == false, "telemetry must not store user id")
assert(privacy.storesRawAnswers == false, "telemetry must not store raw answers")
assert(privacy.storesChat == false, "telemetry must not store chat")

print(
    "STARBLOX_REAL_CLIENT_OK release=" .. tostring(report.releaseId) ..
    " version=" .. tostring(report.placeVersion) ..
    " touch=" .. tostring(client.touchEnabled) ..
    " viewport=" .. tostring(client.viewportX) .. "x" .. tostring(client.viewportY) ..
    " loops=" .. tostring(server.loop_completed)
)
return tostring(report.releaseId), tostring(report.placeVersion), tostring(report.sessionId)
`;
}

export async function runRealClientPlaytestProof({
  apiKey,
  universeId,
  placeId,
  releaseId=STARBLOX_REAL_CLIENT_RELEASE_ID,
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
    script:buildRealClientPlaytestProbeScript({releaseId})
  });

  const text=JSON.stringify(task.logs);
  const prefix='STARBLOX_REAL_CLIENT_OK release=' +
    String(releaseId) + ' version=' + String(task.versionNumber) + ' touch=true';
  if(!text.includes(prefix)){
    throw new Error('Roblox logs are missing the real-client playtest proof sentinel');
  }

  return Object.freeze({
    schemaVersion:1,
    proofVersion:STARBLOX_REAL_CLIENT_PROOF_VERSION,
    status:'verified',
    releaseId:String(releaseId),
    versionNumber:task.versionNumber,
    taskPath:task.path,
    terminalState:task.state,
    evidence:Object.freeze({
      actualLocalScriptClient:true,
      realTouchDevice:true,
      viewportReported:true,
      onboardingShownAndDismissed:true,
      allThreePanelsOpened:true,
      wrongAnswerFeedback:true,
      threeCorrectCompletions:true,
      fullLoopCompleted:true,
      serverAndClientEvidenceCorrelated:true,
      privacyReceiptVerified:true
    }),
    publicAccessChangeAttempted:false,
    liveActivationAllowed:false,
    productionActivationAllowed:false
  });
}
