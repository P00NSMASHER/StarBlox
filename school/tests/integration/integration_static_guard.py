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
destination_service = (server_root / "DestinationInteractionService.server.lua").read_text(encoding="utf-8")
destination_feedback = (client_root / "Mobile/DestinationFeedback.client.lua").read_text(encoding="utf-8")

assert len(list((ROOT / "src").rglob("SchoolClockService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("ClassSessionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("ProgressionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("DestinationInteractionService.server.lua"))) == 1
assert len(list((ROOT / "src").rglob("DestinationFeedback.client.lua"))) == 1

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
assert 'WaitForChild("DestinationFeedback")' in bootstrap

assert 'for _, location in ipairs(FoundationConfig.LOCATIONS)' in destination_service
assert 'registry:WaitForChild(location.id)' in destination_service
assert 'prompt.ActionText = "Check In"' in destination_service
assert 'prompt.HoldDuration = 0' in destination_service
assert 'prompt.MaxActivationDistance = 12' in destination_service
distance_check = destination_service.index('(root.Position - marker.Position).Magnitude > MAX_CHECK_IN_DISTANCE')
fire_client = destination_service.index('destinationVisited:FireClient')
assert distance_check < fire_client, "server distance validation must precede destination feedback"
assert 'CHECK_IN_COOLDOWN_SECONDS = 0.75' in destination_service
assert 'OnServerEvent' not in destination_service
assert 'DataStoreService' not in destination_service

assert 'DestinationVisited")' in destination_feedback
assert 'destinationVisited.OnClientEvent:Connect' in destination_feedback
assert 'constraint.MinSize = Vector2.new(260, 64)' in destination_feedback
assert 'task.delay(2.5' in destination_feedback
for forbidden in ("InvokeServer", "FireServer", "DataStoreService", "SetAsync", "UpdateAsync"):
    assert forbidden not in destination_feedback, f"destination feedback contains forbidden authority: {forbidden}"

assert 'UpdateAsync' not in client
assert 'DataStoreService' not in client
assert 'correctChoiceId' not in client
assert 'SetAsync' not in progression_service

for text in (clock_service, class_service, progression_service, bootstrap, client, destination_service, destination_feedback):
    for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

print("canonical integration static guard: PASS")
