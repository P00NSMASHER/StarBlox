#!/usr/bin/env python3
from pathlib import Path
import re

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
assert 'local GuiService = game:GetService("GuiService")' in client
assert 'local UserInputService = game:GetService("UserInputService")' in client
assert 'local function configureFocusableButton(button)' in client
assert 'focusStroke.Name = "FocusStroke"' in client
assert 'focusStroke.Color = Color3.fromRGB(255, 213, 74)' in client
assert 'local ACTION_ENABLED_BACKGROUND = Color3.fromRGB(255, 213, 74)' in client
assert 'local ACTION_ENABLED_TEXT = Color3.fromRGB(41, 35, 18)' in client
assert 'local ACTION_DISABLED_BACKGROUND = Color3.fromRGB(83, 86, 92)' in client
assert 'local ACTION_DISABLED_TEXT = Color3.fromRGB(222, 224, 228)' in client
assert 'local function setActionButtonVisualState(button, isEnabled)' in client
assert 'button.BackgroundColor3 = isEnabled and ACTION_ENABLED_BACKGROUND or ACTION_DISABLED_BACKGROUND' in client
assert 'button.TextColor3 = isEnabled and ACTION_ENABLED_TEXT or ACTION_DISABLED_TEXT' in client
assert 'button.SelectionGained:Connect' in client
assert 'button.SelectionLost:Connect' in client
assert 'local function usesSelectionNavigation()' in client
assert 'UserInputService:GetLastInputType()' in client
assert 'UserInputService.LastInputTypeChanged:Connect' in client
assert 'GuiService.SelectedObject = button' in client

for forbidden in ("correctChoiceId", "DataStoreService", "SetAsync", "UpdateAsync", "OnServerEvent"):
    assert forbidden not in client, f"client contains forbidden authority: {forbidden}"

assert 'ACTIVE_CLASS_ID = "math"' in client
assert 'panel.AnchorPoint = Vector2.new(0.5, 0)' in client
assert 'panel.Position = UDim2.new(0.5, 0, 0, 18)' in client
assert 'panel.Size = UDim2.new(0.86, 0, 0, COLLAPSED_PANEL_HEIGHT)' in client
assert 'sizeConstraint.MaxSize = Vector2.new(380, ACTIVE_PANEL_HEIGHT)' in client

def int_constant(name):
    match = re.search(rf"local {name} = (\d+)", client)
    assert match, f"missing numeric mobile layout constant: {name}"
    return int(match.group(1))

collapsed_panel_height = int_constant("COLLAPSED_PANEL_HEIGHT")
active_panel_height = int_constant("ACTIVE_PANEL_HEIGHT")
expanded_content_height = 26 + 26 + 32 + 46 + 68 + (4 * 6)

assert collapsed_panel_height == 210
assert active_panel_height > collapsed_panel_height
assert active_panel_height >= expanded_content_height, "active class HUD content exceeds its panel background"
assert active_panel_height <= 260, "active class HUD consumes too much of a 402px phone viewport"
assert 'local function setQuestionVisible(isVisible)' in client
assert 'isVisible and ACTIVE_PANEL_HEIGHT or COLLAPSED_PANEL_HEIGHT' in client
assert 'setQuestionVisible(false)' in client
assert 'setQuestionVisible(true)' in client
assert '0, 44' in client, "touch targets must be at least 44px high"
assert 'button.Size = UDim2.new(1 / math.max(1, #choices), -6, 0, 44)' in client
assert 'questionFrame.Visible = false' in client
assert 'finishSession("Back to free roam.", false)' in client
assert 'waitForProgressionAdvance' in client
assert 'Progress is still saving.' in client
assert 'response.reason == "SESSION_NOT_ACTIVE"' in client
assert 'response.reason == "CLASS_PERIOD_ENDED"' in client
assert 'response.reason == "LEFT_CLASS_LOCATION"' in client
assert 'local function updateActionAvailability(classIsAvailable)' in client
assert 'attendButton.Selectable = canAttend' in client
assert 'setActionButtonVisualState(attendButton, canAttend)' in client
assert 'attendButton.Text = canAttend and "Attend Math" or (canLeave and "Class In Progress" or "Class Unavailable")' in client
assert 'leaveButton.Active = canLeave' in client
assert 'leaveButton.Selectable = canLeave' in client
assert 'setActionButtonVisualState(leaveButton, canLeave)' in client
assert 'attendButton.Text = classIsAvailable and "Attend Math" or "Class Unavailable"' not in client
assert 'attendButton.NextSelectionLeft = leaveButton' in client
assert 'leaveButton.NextSelectionRight = attendButton' in client
assert 'button.NextSelectionLeft = choiceButtons[index - 1] or choiceButtons[#choiceButtons]' in client
assert 'button.NextSelectionRight = choiceButtons[index + 1] or choiceButtons[1]' in client
assert 'button.NextSelectionUp = leaveButton' in client
assert 'leaveButton.NextSelectionDown = firstChoice' in client
assert 'selectForNavigation(firstChoice)' in client
assert 'attendButton.Text = classIsAvailable and "Attend Math" or "Class Unavailable"' in client
assert 'locationDisplayName' in client
assert 'Math is open — go to Math Classroom.' in client
assert 'currentSessionId and periodId ~= nil and periodId ~= ACTIVE_CLASS_ID' in client
assert 'finishSession("Class period ended. Back to free roam.", false)' in client

assert 'WaitForChild("Mobile")' in bootstrap
assert 'WaitForChild("SchoolClient")' in bootstrap
assert 'clone.Parent = playerGui' in bootstrap

for forbidden in ("BrookhavenWorldRuntime", "BHW_", "PipsQuest", "MazeWorld"):
    assert forbidden not in client
    assert forbidden not in bootstrap

print("canonical mobile static guard: PASS")
