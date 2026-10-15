#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
reducer = (ROOT / "src/ServerScriptService/HighSchool/ProgressionReducer.lua").read_text(encoding="utf-8")
store = (ROOT / "src/ServerScriptService/HighSchool/ProgressionStore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ProgressionService.server.lua").read_text(encoding="utf-8")
completion_gate = (ROOT / "src/ServerScriptService/HighSchool/CompletionGate.lua").read_text(encoding="utf-8")

assert 'ProgressionReducer.VERSION = 2' in reducer
assert 'ProgressionReducer.POINTS_PER_COMPLETION = 10' in reducer
assert 'local CLASS_IDS = table.freeze({ "math", "ela", "science" })' in reducer
assert 'local VALID_CLASS_IDS = table.freeze({' in reducer
assert 'score ~= 1' in reducer, "only resolved, full-credit class completions may earn points"
assert 'completedAt < 1' in reducer
assert 'completedAt % 1 ~= 0' in reducer
assert 'points = pointsFromCompleted(completed)' in reducer, (
    "durable points must be reconstructed from validated completion receipts"
)
assert 'tonumber(state.points)' not in reducer, "persisted aggregate points must not be trusted"

assert 'then require(script.Parent.CompletionGate)' in reducer
assert 'else require("./CompletionGate")' in reducer
assert 'completion.completionId' in reducer
assert 'function ProgressionReducer.normalize(state, expectedPlayerId)' in reducer
assert 'ownerPlayerId = ownerPlayerId' in reducer, "stored receipts must retain their DataStore owner"
assert 'function isStoredCompletionIdValid(completionId, expectedPlayerId, classId)' in reducer
assert 'if not completionId:match("^player:") then' in reducer, (
    "opaque legacy receipts must remain readable during migration"
)
assert (
    'return completionId:find(":", 1, true) == nil\n'
    '            and isLegacyCompletionIdValid(completionId)'
) in reducer, "legacy migration must require namespace and bounded-format checks"
assert 'LEGACY_COMPLETION_ID_MAX_LENGTH = 128' in reducer
assert 'local function isLegacyCompletionIdValid(completionId)' in reducer
assert '#completionId <= ProgressionReducer.LEGACY_COMPLETION_ID_MAX_LENGTH' in reducer
assert 'completionId:match("^[%w_%-]+$") ~= nil' in reducer
assert 'and isLegacyCompletionIdValid(completionId)' in reducer, (
    "unknown, malformed, or overlong receipts must not migrate as class rewards"
)
assert 'CompletionGate.isCompletionIdFor(completionId, expectedPlayerId, classId)' in reducer
binding_pos = reducer.index('if not CompletionGate.isCompletionIdFor(')
dedupe_pos = reducer.index('if state.completed[completion.completionId] then')
validation_pos = reducer.index('local record = normalizeCompletionRecord(completion, completion.playerId, true)')
write_pos = reducer.index('state.completed[completion.completionId] = record')
reward_pos = reducer.index('state.points += ProgressionReducer.POINTS_PER_COMPLETION')
assert binding_pos < dedupe_pos < validation_pos < write_pos < reward_pos, (
    "receipt binding, dedupe, and record validation must precede reward mutation"
)
assert 'function CompletionGate.isCompletionIdFor(completionId, playerId, classId)' in completion_gate
assert 'CompletionGate.getCompletionId(playerId, occurrenceId) == completionId' in completion_gate
assert 'return state, false, "DUPLICATE_COMPLETION"' in reducer
assert 'return state, false, "INVALID_COMPLETION"' in reducer

assert 'reportCard = table.freeze(publicReportCard)' in reducer
for field in ("completedCount", "points", "bestScore", "lastCompletedAt"):
    assert f"{field} =" in reducer, f"report card missing {field}"
assert 'completed = normalized.completed' not in reducer, "public snapshot must not expose receipt IDs"

assert 'dataStore:UpdateAsync' in store, "atomic UpdateAsync persistence required"
assert 'dataStore:GetAsync' in store, "save/rejoin load path required"
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

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in reducer
    assert forbidden not in store
    assert forbidden not in service

print("canonical progression static guard: PASS")
