#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
client = (ROOT / "src/ReplicatedStorage/HighSchool/Mobile/SchoolClient.client.lua").read_text(encoding="utf-8")
bootstrap = (ROOT / "src/ServerScriptService/HighSchool/ClientBootstrap.server.lua").read_text(encoding="utf-8")

assert 'WaitForChild("BeginClass")' in client
assert 'WaitForChild("SubmitAnswer")' in client
assert 'WaitForChild("LeaveClass")' in client
assert 'WaitForChild("GetProgression")' in client
assert 'FoundationConfig = require' in client
assert 'FoundationState.getSnapshot()' in client
assert 'InvokeServer' in client

for forbidden in ("correctChoiceId", "DataStoreService", "SetAsync", "UpdateAsync", "OnServerEvent"):
    assert forbidden not in client, f"client contains forbidden authority: {forbidden}"

assert 'ACTIVE_CLASS_ID' not in client, "retired single-class client contract returned"
assert 'CLASS_NAMES = { math = "Math", ela = "Language Arts", science = "Science"' in client
assert 'SchoolClock = require' in client
assert 'makeLabel("ClockLabel", 26, "School clock: loading…")' in client
assert 'makeLabel("NextLabel", 26, "Up next: loading…")' in client
assert 'SchoolClock.getDisplay(snapshot)' in client
assert 'clockLabel.Text = "School time: " .. displayTime' in client
assert 'nextLabel.Text = "Up next: " .. (CLASS_NAMES[nextId] or nextId)' in client

assert 'panel.AnchorPoint = Vector2.new(0.5, 0)' in client
assert 'panel.Position = UDim2.new(0.5, 0, 0, 18)' in client
assert 'sizeConstraint.MaxSize = Vector2.new(380, 264)' in client
assert 'sizeConstraint.MinSize = Vector2.new(280, 244)' in client
assert '0, 44' in client, "touch targets must be at least 44px high"
assert 'button.Size = UDim2.new(1 / math.max(1, #choices), -6, 0, 44)' in client
assert 'questionFrame.Visible = false' in client
assert 'finishSession("Back to free roam.", false)' in client
assert 'waitForProgressionAdvance' in client
assert 'Progress is still saving.' in client
assert 'response.reason == "SESSION_NOT_ACTIVE"' in client
assert 'response.reason == "CLASS_PERIOD_ENDED"' in client
assert 'response.reason == "LEFT_CLASS_LOCATION"' in client

class_gate = 'periodId == "math" or periodId == "ela" or periodId == "science"'
assert class_gate in client
assert 'attendButton.Active = classIsAvailable and currentSessionId == nil' in client
assert 'attendButton.Text = classIsAvailable and ("Attend " .. CLASS_NAMES[periodId]) or "Class Unavailable"' in client
assert 'locationDisplayName' in client
assert 'CLASS_NAMES[periodId] .. " is open — go to " .. locationName' in client
assert 'currentSessionId and periodId ~= nil and periodId ~= currentClassId' in client
assert 'finishSession("Class period ended. Back to free roam.", false)' in client

assert 'if not remote then return nil, "SERVER_UNAVAILABLE" end' in client
assert 'FoundationState and FoundationState.getSnapshot() or {}' in client
assert 'FoundationState = require(highSchool:WaitForChild("FoundationState"))' in client

assert 'WaitForChild("Mobile")' in bootstrap
assert 'WaitForChild("SchoolClient")' in bootstrap
assert 'clone.Parent = playerGui' in bootstrap

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in client
    assert forbidden not in bootstrap

print("canonical mobile static guard: PASS")
