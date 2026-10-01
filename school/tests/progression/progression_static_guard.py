#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
reducer = (ROOT / "src/ServerScriptService/HighSchool/ProgressionReducer.lua").read_text(encoding="utf-8")
store = (ROOT / "src/ServerScriptService/HighSchool/ProgressionStore.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/ProgressionService.server.lua").read_text(encoding="utf-8")

assert 'completion.completionId' in reducer
dedupe_pos = reducer.index('if state.completed[completion.completionId] then')
write_pos = reducer.index('state.completed[completion.completionId] =')
assert dedupe_pos < write_pos, "completion must be deduplicated before mutation"

assert 'dataStore:UpdateAsync' in store, "atomic UpdateAsync persistence required"
assert 'dataStore:GetAsync' in store, "save/rejoin load path required"
assert 'SetAsync' not in store, "SetAsync would allow stale-snapshot overwrite"
assert 'ProgressionReducer.applyCompletion(currentState, completion)' in store

assert 'classCompleted.Event:Connect' in service
assert 'task.spawn(persistCompletion, completion)' in service, "completion persistence must not be single-shot"
assert 'RETRY_DELAYS_SECONDS' in service
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
