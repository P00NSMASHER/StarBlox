#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
reducer = (ROOT / "src/ServerScriptService/HighSchool/ProgressionReducer.lua").read_text(encoding="utf-8")
store = (ROOT / "src/ServerScriptService/HighSchool/ProgressionStore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ProgressionService.server.lua").read_text(encoding="utf-8")

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

assert 'completion.completionId' in reducer
dedupe_pos = reducer.index('if state.completed[completion.completionId] then')
validation_pos = reducer.index('local record = normalizeCompletionRecord(completion)')
write_pos = reducer.index('state.completed[completion.completionId] = record')
reward_pos = reducer.index('state.points += ProgressionReducer.POINTS_PER_COMPLETION')
assert dedupe_pos < validation_pos < write_pos < reward_pos, (
    "completion must be deduplicated and validated before receipt/reward mutation"
)
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

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in reducer
    assert forbidden not in store
    assert forbidden not in service

print("canonical progression static guard: PASS")
