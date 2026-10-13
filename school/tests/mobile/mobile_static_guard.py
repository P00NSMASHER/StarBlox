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
assert 'CLASS_PERIODS = table.freeze({ math = true, ela = true, science = true })' in client
assert 'REPORT_CARD_CLASS_IDS = table.freeze({ "math", "ela", "science" })' in client
assert 'local highSchool\nlocal FoundationConfig\nlocal FoundationState\nlocal SchoolClock' in client
assert 'local highSchool = ReplicatedStorage:WaitForChild("HighSchool")' not in client
assert 'local function waitForHighSchool()' in client
assert 'highSchool = ReplicatedStorage:WaitForChild("HighSchool")' in client
assert 'FoundationConfig = require(waitForHighSchool():WaitForChild("FoundationConfig"))' in client
assert 'SchoolClock = require(waitForHighSchool():WaitForChild("SchoolClock"))' in client
assert 'local FoundationConfig = require' not in client
assert 'local SchoolClock = require' not in client
assert 'makeLabel("ClockLabel", 26, "School clock: loading…")' in client
assert 'makeLabel("NextLabel", 26, "Up next: loading…")' in client
assert 'if SchoolClock and snapshot.periodIndex and snapshot.secondsIntoPeriod then' in client
assert 'SchoolClock.getDisplay(snapshot)' in client
assert 'clockLabel.Text = "School time: " .. displayTime' in client
assert 'nextLabel.Text = "Up next: " .. (CLASS_NAMES[nextId] or nextId)' in client

assert 'panel.AnchorPoint = Vector2.new(0.5, 0)' in client
assert 'panel.Position = UDim2.new(0.5, 0, 0, 18)' in client
assert 'sizeConstraint.MaxSize = Vector2.new(380, 264)' in client
assert 'sizeConstraint.MinSize = Vector2.new(280, 244)' in client
assert 'secondaryRail.Name = "SecondaryActionRail"' in client
assert 'secondaryRail.Position = UDim2.new(1, -12, 0.5, 0)' in client
assert 'reportCardButton.Name = "ReportCardButton"' in client
assert 'reportCardButton.Size = UDim2.fromOffset(48, 44)' in client
assert 'reportCardButton.Text = "Grades"' in client
assert 'reportCardPanel.Name = "ReportCardPanel"' in client
assert 'reportCardPanel.Size = UDim2.fromOffset(236, 132)' in client
assert 'reportCardPanel.Visible = false' in client
assert 'local function setReportCardVisible(visible)' in client
assert 'reportCardPanel.Visible = visible' in client
assert 'reportCardButton.Activated:Connect' in client
assert 'setReportCardVisible(not reportCardPanel.Visible)' in client
assert 'setReportCardVisible(false)' in client
assert 'local canOpenReportCard = currentSessionId == nil' in client
assert 'reportCardButton.Active = canOpenReportCard' in client
assert 'reportCardButton.AutoButtonColor = canOpenReportCard' in client
assert 'reportCardButton.Text = "In Class"' in client
close_index = client.index('setReportCardVisible(false)')
show_index = client.index('questionFrame.Visible = true', close_index)
assert close_index < show_index, "Grades overlay must close before activity controls appear"
assert client.count('Color3.fromRGB(20, 38, 67)') >= 2, "compact menu needs accessible navy surfaces"
assert client.count('Color3.fromRGB(255, 255, 255)') >= 2, "compact menu needs high-contrast text"
assert '0, 44' in client, "touch targets must be at least 44px high"
assert 'button.Size = UDim2.new(1 / math.max(1, #choices), -6, 0, 44)' in client
assert 'questionFrame.Visible = false' in client
assert 'progressionLabel.Visible = false' in client
assert 'progressionLabel.Visible = true' in client
active_class_height = (26 * 3) + 32 + 46 + 68 + (6 * 5)
assert active_class_height <= 264, (
    "active class rows must fit the capped phone panel without reducing 44px targets"
)
assert 'finishSession("Back to free roam.", false)' in client
assert 'waitForProgressionAdvance' in client
assert 'local function updateReportCard(reportCard)' in client
assert 'updateReportCard(result.progression.reportCard)' in client
assert 'type(reportCard) == "table" and reportCard[classId] or nil' in client
assert 'tonumber(subject.completedCount)' in client
assert 'tonumber(subject.points)' in client
assert '"%s • %d complete • %d pts"' in client
assert 'updateReportCard(nil)' in client
assert 'completionId' not in client, "mobile report card must not expose private receipt IDs"
assert 'Progress is still saving.' in client
assert 'local function answerFailureMessage(response, invokeError)' in client
assert 'Could not submit answer. Check your connection and try again.' in client
assert 'Class ended. Back to free roam.' in client
assert 'local expectedLocationName = locationDisplayName(response.expectedLocationId)' in client
assert 'You left " .. expectedLocationName .. distanceHint(response) .. ". Back to free roam.' in client
assert 'Classroom directions changed. Go to " .. expectedLocationName' in client
assert 'That answer could not be sent. Try again.' in client
assert 'Too many attempts. Leave and attend class again.' in client
for reason in (
    "SESSION_NOT_ACTIVE",
    "UNKNOWN_SESSION",
    "SESSION_CLOSED",
    "CLASS_PERIOD_ENDED",
    "LEFT_CLASS_LOCATION",
    "CLASS_LOCATION_MISMATCH",
    "INVALID_SUBMISSION_ID",
    "INVALID_CHOICE",
    "TOO_MANY_SUBMISSIONS",
):
    assert f'reason == "{reason}"' in client, f"missing readable answer mapping: {reason}"
assert 'statusLabel.Text = answerFailureMessage(response, invokeError)' in client
assert 'finishSession(answerFailureMessage(response, invokeError), false)' in client
assert 'statusLabel.Text = response.reason' not in client, (
    "mobile HUD must not expose raw answer reason codes"
)
assert 'response.reason or "Answer rejected."' not in client

assert 'local classIsAvailable = CLASS_PERIODS[periodId] == true' in client
assert 'local canAttend = classIsAvailable and currentSessionId == nil and beginClass ~= nil' in client
assert 'attendButton.Active = canAttend' in client
assert 'attendButton.AutoButtonColor = canAttend' in client
assert 'if classIsAvailable and beginClass == nil then' in client
assert 'attendButton.Text = "Connecting…"' in client
assert 'attendButton.Text = "Attend " .. CLASS_NAMES[periodId]' in client
assert 'attendButton.Text = "Class Unavailable"' in client
assert 'locationDisplayName' in client
assert 'return CLASS_NAMES[locationId] .. " Classroom"' in client
assert 'local function distanceHint(result)' in client
assert 'type(result) == "table" and tonumber(result.distanceStuds) or nil' in client
assert 'if not distance or distance < 0 then' in client
assert 'math.clamp(math.ceil(distance), 0, 999)' in client
assert 'return string.format(" (%d studs away)",' in client
assert 'local function beginClassFailureMessage(result, invokeError)' in client
assert 'School services are loading. Try again.' in client
assert 'No class is open right now.' in client
assert 'Go to " .. expectedLocationName .. distanceHint(result) .. " to attend " .. className' in client
assert 'Classroom directions are updating. Go to " .. expectedLocationName' in client
assert 'Class is not ready yet. Try again.' in client
assert 'reason == "CLASS_ALREADY_COMPLETED"' in client
assert 'is already complete for this period. Check Grades for your saved result.' in client
assert 'statusLabel.Text = beginClassFailureMessage(result, invokeError)' in client
assert 'distanceStuds' in client, "PH04 authoritative distance cue must be consumed"
assert 'root.Position' not in client, "mobile HUD must not calculate attendance distance"
assert 'statusLabel.Text = (result and result.reason)' not in client, (
    "mobile HUD must not expose raw attendance reason codes"
)
assert 'CLASS_NAMES[periodId] .. " is open — go to " .. locationName' in client
assert 'currentSessionId and periodId ~= nil and periodId ~= currentClassId' in client
assert 'finishSession("Class period ended. Back to free roam.", false)' in client
assert 'currentClassId = activity.subject' in client
assert 'currentClassId = FoundationState and FoundationState.getSnapshot().periodId' not in client
assert 'if not CLASS_PERIODS[currentClassId] then' in client
assert 'finishSession("Class start could not be verified. Try again.", false)' in client
assert 'showActivity(activity)' in client

assert 'local answerPending = false' in client
assert 'local function setChoiceButtonsEnabled(enabled)' in client
assert 'if not currentSessionId or answerPending then' in client
assert 'answerPending = true' in client
assert 'setChoiceButtonsEnabled(false)' in client
assert 'statusLabel.Text = "Submitting answer…"' in client
assert client.count('answerPending = false') >= 4, (
    "answer controls must recover after retries, hints, and session cleanup"
)
assert client.count('setChoiceButtonsEnabled(true)') >= 3, (
    "answer choices must be restored after recoverable responses"
)
pending_index = client.index('answerPending = true')
invoke_index = client.index('safeInvoke(submitAnswer', pending_index)
assert pending_index < invoke_index, "choices must lock before the server request"

assert 'if not remote then return nil, "SERVER_UNAVAILABLE" end' in client
assert 'FoundationState and FoundationState.getSnapshot() or {}' in client
assert 'FoundationState = require(waitForHighSchool():WaitForChild("FoundationState"))' in client
gui_parent_index = client.index("gui.Parent = playerGui")
high_school_lookup_index = client.index('highSchool = ReplicatedStorage:WaitForChild("HighSchool")')
assert gui_parent_index < high_school_lookup_index, (
    "HUD must render before the HighSchool root replicates"
)
for dependency_require in (
    'FoundationConfig = require(waitForHighSchool():WaitForChild("FoundationConfig"))',
    'FoundationState = require(waitForHighSchool():WaitForChild("FoundationState"))',
    'SchoolClock = require(waitForHighSchool():WaitForChild("SchoolClock"))',
):
    assert gui_parent_index < client.index(dependency_require), (
        f"HUD must render before delayed dependency: {dependency_require}"
    )

assert 'WaitForChild("Mobile")' in bootstrap
assert 'WaitForChild("SchoolClient")' in bootstrap
assert 'clone.Parent = playerGui' in bootstrap

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in client
    assert forbidden not in bootstrap

print("canonical mobile static guard: PASS")
