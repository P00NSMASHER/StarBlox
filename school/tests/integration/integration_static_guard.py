#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
project = json.loads((ROOT / "default.project.json").read_text(encoding="utf-8"))
project_text = json.dumps(project).lower()

assert "highschool/" not in project_text, "canonical project must not map staging root"
for forbidden in ("pipsquest", "maze", "brookhaven", "bhw_", "rhs"):
    assert forbidden not in project_text, f"retired runtime mapped: {forbidden}"

server_root = ROOT / "src/ServerScriptService/HighSchool"
client_root = ROOT / "src/ReplicatedStorage/HighSchool"

clock_service = (server_root / "SchoolClockService.server.lua").read_text(encoding="utf-8")
class_service = (server_root / "ClassSessionService.server.lua").read_text(encoding="utf-8")
progression_service = (server_root / "ProgressionService.server.lua").read_text(encoding="utf-8")
bootstrap = (server_root / "ClientBootstrap.server.lua").read_text(encoding="utf-8")
client = (client_root / "Mobile/SchoolClient.client.lua").read_text(encoding="utf-8")

assert len(list((ROOT / "src").rglob("SchoolClockService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("ClassSessionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("ProgressionService.server.lua"))) == 1

assert 'FoundationState.getSnapshot()' in class_service
assert 'classCompleted:Fire' in class_service
assert 'classCompleted.Event:Connect' in progression_service
assert 'ProgressionStore.applyCompletion(completion)' in progression_service
assert 'GetProgression' in progression_service
assert 'WaitForChild("BeginClass")' in client
assert 'WaitForChild("SubmitAnswer")' in client
assert 'WaitForChild("LeaveClass")' in client
assert 'WaitForChild("GetProgression")' in client
assert 'WaitForChild("SchoolClient")' in bootstrap

assert 'UpdateAsync' not in client
assert 'DataStoreService' not in client
assert 'correctChoiceId' not in client
assert 'SetAsync' not in progression_service

for text in (clock_service, class_service, progression_service, bootstrap, client):
    for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

print("canonical integration static guard: PASS")
