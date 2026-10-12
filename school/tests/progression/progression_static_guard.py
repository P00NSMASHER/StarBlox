#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
reducer = (ROOT / "src/ServerScriptService/HighSchool/ProgressionReducer.lua").read_text(encoding="utf-8")
store = (ROOT / "src/ServerScriptService/HighSchool/ProgressionStore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ProgressionService.server.lua").read_text(encoding="utf-8")
courier = (ROOT / "src/ServerScriptService/HighSchool/CampusCourierActivity.lua").read_text(encoding="utf-8")

assert 'ProgressionReducer.VERSION = 2' in reducer
assert 'ProgressionReducer.POINTS_PER_COMPLETION = 10' in reducer
assert 'ProgressionReducer.ACTIVITY_POINTS = 5' in reducer
assert 'local CLASS_IDS = table.freeze({ "math", "ela", "science" })' in reducer
assert 'local POINTS_BY_COMPLETION_CLASS = table.freeze({' in reducer
assert '["activity:campus_courier"] = ProgressionReducer.ACTIVITY_POINTS' in reducer
assert 'score ~= 1' in reducer, "only resolved, full-credit class completions may earn points"
assert 'completedAt < 1' in reducer
assert 'completedAt % 1 ~= 0' in reducer
assert 'points = pointsFromCompleted(completed)' in reducer, (
    "durable points must be reconstructed from validated completion receipts"
)
assert 'tonumber(state.points)' not in reducer, "persisted aggregate points must not be trusted"

assert 'completion.completionId' in reducer
dedupe_pos = reducer.index('if state.completed[completion.completionId] then')
validation_pos = reducer.index('local record = normalizeCompletionRecord(completion)')
write_pos = reducer.index('state.completed[completion.completionId] = record')
reward_pos = reducer.index('state.points += POINTS_BY_COMPLETION_CLASS[record.classId]')
assert dedupe_pos < validation_pos < write_pos < reward_pos, (
    "completion must be deduplicated and validated before receipt/reward mutation"
)
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
assert 'SetAsync' not in store, "SetAsync would allow stale-snapshot overwrite"
assert 'ProgressionReducer.applyCompletion(currentState, completion)' in store

assert 'classCompleted.Event:Connect' in service
assert 'task.spawn(persistCompletion, completion)' in service, "completion persistence must not be single-shot"
assert 'RETRY_DELAYS_SECONDS' in service
assert 'RETRY_CYCLE_DELAY_SECONDS = 30' in service
assert 'task.delay(RETRY_CYCLE_DELAY_SECONDS' in service, "exhausted retry cycles must schedule recovery"
assert 'pendingByCompletionId' in service
assert 'game:BindToClose' in service, "pending completions need shutdown flush"
assert 'Players.PlayerAdded:Connect' in service
assert 'task.spawn(loadIntoCache, player.UserId)' in service
assert 'getProgression.Name = "GetProgression"' in service
assert 'RemoteEvent' not in service, "client progression mutation channel is forbidden"
assert 'OnServerEvent' not in service, "client progression mutation handler is forbidden"
assert 'ProgressionReducer.toPublicSnapshot(state)' in service

assert 'CampusCourierActivity.REWARD_POINTS = 5' in courier
assert 'CampusCourierActivity.COMPLETION_CLASS_ID = "activity:campus_courier"' in courier
assert 'function CampusCourierActivity.getDailyInstanceId(playerId, dayIndex)' in courier
assert '"player:%d:day:%d:%s"' in courier
assert 'local function formatProgress(activity)' in courier
assert courier.count('locationId = "lobby"') == 2, (
    "courier must begin and end at the Main Lobby"
)
assert 'objective = "Return the signed delivery sheet to the Main Lobby."' in courier
assert 'description = "Follow a short four-stop delivery loop around Pip High."' in courier
assert courier.count('progressLabel = formatProgress(activity)') == 2, (
    "public state and check-in responses must expose compact route progress"
)
assert courier.count('nextLocationName = nextStop and nextStop.locationName or nil') == 2, (
    "public state and every check-in response must expose the authoritative next destination name"
)
assert '"Next stop (" .. formatProgress(activity) .. " complete): "' in courier
assert '"Delivery confirmed (" .. formatProgress(activity) .. " complete). "' in courier
assert '"Route complete (" .. formatProgress(activity) .. " complete)!' in courier
cache_pos = courier.index('local cached = activity.receipts[checkInId]')
closed_pos = courier.index('if activity.closed or activity.resolved then')
assert cache_pos < closed_pos, "resolved retries must return the cached completion receipt"
expected_pos = courier.index('local expected = ROUTE[activity.stepIndex]')
wrong_stop_pos = courier.index('if locationId ~= expected.locationId then')
limit_pos = courier.index('if activity.uniqueCheckInCount >= CampusCourierActivity.MAX_UNIQUE_CHECK_INS then')
increment_pos = courier.index('activity.uniqueCheckInCount += 1')
assert expected_pos < wrong_stop_pos < limit_pos < increment_pos, (
    "off-route exploration must not consume the accepted progress receipt budget"
)
assert 'RemoteEvent' not in courier
assert 'OnServerEvent' not in courier
assert 'DataStore' not in courier

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in reducer
    assert forbidden not in store
    assert forbidden not in service

print("canonical progression static guard: PASS")
