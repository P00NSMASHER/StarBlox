import re
#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
reducer = (ROOT / "src/ServerScriptService/HighSchool/ProgressionReducer.lua").read_text(encoding="utf-8")
store = (ROOT / "src/ServerScriptService/HighSchool/ProgressionStore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ProgressionService.server.lua").read_text(encoding="utf-8")
completion_gate = (ROOT / "src/ServerScriptService/HighSchool/CompletionGate.lua").read_text(encoding="utf-8")
courier = (ROOT / "src/ServerScriptService/HighSchool/CampusCourierActivity.lua").read_text(encoding="utf-8")

assert 'ProgressionReducer.VERSION = 2' in reducer
assert 'local function assertStoredVersionSupported(state)' in reducer
assert 'error("UNSUPPORTED_PROGRESSION_VERSION", 3)' in reducer
assert 'version > ProgressionReducer.VERSION' in reducer
assert 'ProgressionReducer.POINTS_PER_COMPLETION = 10' in reducer
assert 'ProgressionReducer.ACTIVITY_POINTS = 5' in reducer
assert 'ProgressionReducer.LEGACY_COMPLETION_ID_MAX_LENGTH = 128' in reducer
assert 'local CLASS_IDS = table.freeze({ "math", "ela", "science" })' in reducer
assert 'local POINTS_BY_COMPLETION_CLASS = table.freeze({' in reducer
assert '[CampusCourierActivity.COMPLETION_CLASS_ID] = ProgressionReducer.ACTIVITY_POINTS' in reducer
assert 'score ~= 1' in reducer, "only resolved, full-credit class completions may earn points"
assert 'local function normalizeCompletionRecord(record, expectedPlayerId, attachOwner, requireCanonicalTypes)' in reducer
assert 'type(record.score) ~= "number" or type(record.completedAt) ~= "number"' in reducer
assert 'normalizeCompletionRecord(record, expectedPlayerId, true, false)' in reducer, (
    "stored migration may retain legacy numeric strings"
)
assert 'normalizeCompletionRecord(completion, completion.playerId, true, true)' in reducer, (
    "new reward events must use canonical numeric field types"
)
assert 'completedAt < 1' in reducer
assert 'completedAt % 1 ~= 0' in reducer
assert 'points = pointsFromCompleted(completed)' in reducer, (
    "durable points must be reconstructed from validated completion receipts"
)
assert 'tonumber(state.points)' not in reducer, "persisted aggregate points must not be trusted"

assert 'then require(script.Parent.CompletionGate)' in reducer
assert 'else require("./CompletionGate")' in reducer
assert 'then require(script.Parent.CampusCourierActivity)' in reducer
assert 'else require("./CampusCourierActivity")' in reducer
assert 'completion.completionId' in reducer
assert 'function ProgressionReducer.normalize(state, expectedPlayerId)' in reducer
version_gate_pos = reducer.index('assertStoredVersionSupported(state)')
completion_copy_pos = reducer.index('local completed = copyCompleted(state.completed, expectedPlayerId)')
assert version_gate_pos < completion_copy_pos, (
    "stored schema version must be validated before receipt migration"
)
assert 'ownerPlayerId = ownerPlayerId' in reducer, "stored receipts must retain their DataStore owner"
assert 'function isStoredCompletionIdValid(completionId, expectedPlayerId, classId)' in reducer
assert 'if not completionId:match("^player:") then' in reducer, (
    "opaque legacy receipts must remain readable during migration"
)
assert (
    'return completionId:find(":", 1, true) == nil\n'
    '            and isLegacyCompletionIdValid(completionId)'
) in reducer, "legacy migration must require namespace and bounded-format checks"
assert 'local function isLegacyCompletionIdValid(completionId)' in reducer
assert '#completionId <= ProgressionReducer.LEGACY_COMPLETION_ID_MAX_LENGTH' in reducer
assert 'completionId:match("^[%w_%-]+$") ~= nil' in reducer
assert 'and isLegacyCompletionIdValid(completionId)' in reducer, (
    "unknown, malformed, or overlong receipts must not migrate as class rewards"
)
assert 'CompletionGate.isCompletionIdFor(completionId, expectedPlayerId, classId)' in reducer
binding_pos = reducer.index('if not CompletionGate.isCompletionIdFor(')
dedupe_pos = reducer.index('if state.completed[completion.completionId] then')
validation_pos = reducer.index(
    'local record = normalizeCompletionRecord(completion, completion.playerId, true, true)'
)
write_pos = reducer.index('state.completed[completion.completionId] = record')
reward_pos = reducer.index('state.points += POINTS_BY_COMPLETION_CLASS[record.classId]')
assert binding_pos < dedupe_pos < validation_pos < write_pos < reward_pos, (
    "receipt binding, dedupe, and record validation must precede reward mutation"
)
assert 'function CompletionGate.isCompletionIdFor(completionId, playerId, classId)' in completion_gate
assert 'CompletionGate.getCompletionId(playerId, occurrenceId) == completionId' in completion_gate
assert 'return state, false, "DUPLICATE_COMPLETION"' in reducer
assert 'return state, false, "INVALID_COMPLETION"' in reducer

assert 'reportCard = table.freeze(publicReportCard)' in reducer
assert 'if subject then' in reducer, "activity completions must not index missing report-card subjects"
assert 'activityCompletedCount = activityCompletedCount' in reducer
for field in ("completedCount", "points", "bestScore", "lastCompletedAt"):
    assert f"{field} =" in reducer, f"report card missing {field}"
assert 'completed = normalized.completed' not in reducer, "public snapshot must not expose receipt IDs"

assert 'dataStore:UpdateAsync' in store, "atomic UpdateAsync persistence required"
assert 'dataStore:GetAsync' in store, "save/rejoin load path required"
load_start = store.index('function ProgressionStore.load(playerId)')
load_pcall = store.index('local ok, state = pcall(function()', load_start)
load_get = store.index('local data = dataStore:GetAsync(keyForPlayer(playerId))', load_pcall)
load_normalize = store.index('return ProgressionReducer.normalize(data, playerId)', load_get)
load_end = store.index('function ProgressionStore.applyCompletion', load_normalize)
assert load_start < load_pcall < load_get < load_normalize < load_end, (
    "load-time schema validation must remain inside the protected failure path"
)
assert 'SetAsync' not in store, "SetAsync would allow stale-snapshot overwrite"
assert 'ProgressionReducer.applyCompletion(currentState, completion)' in store
assert 'ProgressionReducer.normalize(data, playerId)' in store
assert 'ProgressionReducer.normalize(updatedState, completion.playerId)' in store

assert 'classCompleted.Event:Connect' in service
assert 'task.spawn(persistCompletion, completion)' in service, "completion persistence must not be single-shot"
assert 'RETRY_DELAYS_SECONDS' in service
assert 'RETRY_CYCLE_DELAY_SECONDS = 30' in service
assert 'task.delay(RETRY_CYCLE_DELAY_SECONDS' in service, "exhausted retry cycles must schedule recovery"
assert 'pendingByCompletionId' in service
assert 'game:BindToClose' in service, "pending completions need shutdown flush"
assert 'Players.PlayerAdded:Connect' in service
assert 'task.spawn(loadIntoCache, player.UserId)' in service
assert 'local cacheRevisionByPlayerId = {}' in service
assert 'local revisionBeforeLoad = cacheRevisionByPlayerId[playerId] or 0' in service
load_start = service.index('local revisionBeforeLoad = cacheRevisionByPlayerId[playerId] or 0')
store_load = service.index('local state, err = ProgressionStore.load(playerId)')
revision_check = service.index(
    'if (cacheRevisionByPlayerId[playerId] or 0) ~= revisionBeforeLoad then'
)
cache_write = service.index('cacheByPlayerId[playerId] = state')
assert load_start < store_load < revision_check < cache_write, (
    "an older load must not overwrite a newer persisted completion in the cache"
)
assert 'local function cachePersistedState(playerId, state)' in service
assert 'Players:GetPlayerByUserId(playerId)' in service
assert service.count('cachePersistedState(completion.playerId, state)') == 2, (
    "normal persistence and shutdown flush must advance the cache revision"
)
player_removing = service.index('Players.PlayerRemoving:Connect')
removal_revision = service.index(
    'cacheRevisionByPlayerId[player.UserId] = (cacheRevisionByPlayerId[player.UserId] or 0) + 1'
)
removal_clear = service.index('cacheByPlayerId[player.UserId] = nil')
assert player_removing < removal_revision < removal_clear, (
    "player removal must invalidate in-flight loads before clearing cached progression"
)
assert 'getProgression.Name = "GetProgression"' in service
assert 'RemoteEvent' not in service, "client progression mutation channel is forbidden"
assert 'OnServerEvent' not in service, "client progression mutation handler is forbidden"
assert 'ProgressionReducer.toPublicSnapshot(state, player.UserId)' in service


assert 'CampusCourierActivity.REWARD_POINTS = 5' in courier
assert 'CampusCourierActivity.MAX_OBJECTIVE_LENGTH = 80' in courier
assert 'CampusCourierActivity.MIN_ROUTE_STOPS = 3' in courier
assert 'CampusCourierActivity.MAX_ROUTE_STOPS = 6' in courier
assert 'CampusCourierActivity.COMPLETION_CLASS_ID = "activity:campus_courier"' in courier
assert 'function CampusCourierActivity.getDailyInstanceId(playerId, scheduleNamespace, dayIndex)' in courier
assert 'function CampusCourierActivity.isCompletionIdFor(completionId, playerId)' in courier
assert 'function CampusCourierActivity.buildCompletion(activity, completedAt)' in courier
assert 'type(completedAt) == "number"' in courier
assert 'completedAt >= 1' in courier
assert 'completedAt % 1 == 0' in courier
assert 'completedAt = tonumber(completedAt) or 0' not in courier
assert 'completedAt = completedAt' in courier
assert 'local function getCompletedStops(activity)' in courier
assert 'local function getRemainingStops(activity)' in courier
assert 'return math.max(#ROUTE - getCompletedStops(activity), 0)' in courier
assert 'local function formatProgress(activity)' in courier
assert courier.count('locationId = "lobby"') == 2
assert courier.count('progressLabel = formatProgress(activity)') == 2
assert courier.count('remainingStops = getRemainingStops(activity)') == 2
assert courier.count('nextActionLabel = nextStop and nextStop.actionLabel or nil') == 2
for action_label in ("PICK UP", "DELIVER", "DROP OFF", "RETURN"):
    assert courier.count(f'actionLabel = "{action_label}"') == 1
courier_action_labels = re.findall(r'actionLabel\s*=\s*"([^"]+)"', courier)
assert len(courier_action_labels) == 4
assert len(set(courier_action_labels)) == 4
assert all(
    len(label) <= 10 and re.fullmatch(r"[A-Z ]+", label)
    for label in courier_action_labels
)
courier_objectives = re.findall(r'objective\s*=\s*"([^"]+)"', courier)
assert len(courier_objectives) == 4
assert all(objective.strip() and len(objective) <= 80 for objective in courier_objectives)
assert 'type(stop.objective) == "string" and stop.objective:match("%S")' in courier
assert '#stop.objective <= CampusCourierActivity.MAX_OBJECTIVE_LENGTH' in courier
assert '#ROUTE >= CampusCourierActivity.MIN_ROUTE_STOPS' in courier
assert '#ROUTE <= CampusCourierActivity.MAX_ROUTE_STOPS' in courier
assert 'ROUTE[1].locationId == "lobby" and ROUTE[#ROUTE].locationId == "lobby"' in courier
assert 'ROUTE[index - 1].locationId ~= stop.locationId' in courier
assert 'route interior stops must be unique' in courier
assert '"Route complete (" .. formatProgress(activity) .. " complete)!' in courier
cache_pos = courier.index('local cached = activity.receipts[checkInId]')
closed_pos = courier.index('if activity.closed or activity.resolved then')
assert cache_pos < closed_pos, "resolved retries must return the cached completion receipt"
assert 'RemoteEvent' not in courier
assert 'OnServerEvent' not in courier
assert 'DataStore' not in courier

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in reducer
    assert forbidden not in store
    assert forbidden not in service

print("canonical progression static guard: PASS")
