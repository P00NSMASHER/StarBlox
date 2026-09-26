--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)
if Config.FeatureFlags.SchoolSystemEnabled ~= true then
	return
end

local player = Players.LocalPlayer
local root = ReplicatedStorage:WaitForChild("StarBloxSchool")
local stateEvent = root:WaitForChild("SchoolState") :: RemoteEvent
local classOpened = root:WaitForChild("ClassOpened") :: RemoteEvent
local requestState = root:WaitForChild("RequestSchoolState") :: RemoteFunction
local submit = root:WaitForChild("SubmitClassAnswer") :: RemoteFunction

local gui = Instance.new("ScreenGui")
gui.Name = "StarBloxSchoolGui"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = player:WaitForChild("PlayerGui")

local hud = Instance.new("TextLabel")
hud.Name = "SchoolHud"
hud.Size = UDim2.fromOffset(310, 82)
hud.Position = UDim2.fromOffset(18, 18)
hud.BackgroundTransparency = 0.12
hud.TextWrapped = true
hud.TextScaled = true
hud.Parent = gui

local waypoint = Instance.new("TextLabel")
waypoint.Name = "SchoolWaypoint"
waypoint.Size = UDim2.fromOffset(310, 42)
waypoint.Position = UDim2.fromOffset(18, 106)
waypoint.BackgroundTransparency = 0.18
waypoint.TextScaled = true
waypoint.Visible = false
waypoint.Parent = gui

local panel = Instance.new("Frame")
panel.Name = "ClassroomPanel"
panel.Size = UDim2.fromScale(0.7, 0.58)
panel.Position = UDim2.fromScale(0.15, 0.22)
panel.Visible = false
panel.Parent = gui

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MinSize = Vector2.new(300, 360)
panelConstraint.MaxSize = Vector2.new(760, 620)
panelConstraint.Parent = panel

local questionLabel = Instance.new("TextLabel")
questionLabel.Name = "Question"
questionLabel.Size = UDim2.new(1, -24, 0.38, -12)
questionLabel.Position = UDim2.fromOffset(12, 12)
questionLabel.TextWrapped = true
questionLabel.TextScaled = true
questionLabel.Parent = panel

local feedback = Instance.new("TextLabel")
feedback.Name = "Feedback"
feedback.Size = UDim2.new(1, -24, 0.12, 0)
feedback.Position = UDim2.new(0, 12, 0.4, 0)
feedback.TextWrapped = true
feedback.TextScaled = true
feedback.Parent = panel

local buttons = {}
for index = 1, 3 do
	local button = Instance.new("TextButton")
	button.Name = "Choice" .. index
	button.Size = UDim2.new(1, -24, 0.13, 0)
	button.Position = UDim2.new(0, 12, 0.51 + (index - 1) * 0.145, 0)
	button.TextWrapped = true
	button.TextScaled = true
	button.Parent = panel
	buttons[index] = button
end

local report = Instance.new("TextLabel")
report.Name = "ReportCard"
report.Size = UDim2.fromScale(0.72, 0.72)
report.Position = UDim2.fromScale(0.14, 0.14)
report.TextWrapped = true
report.TextScaled = true
report.Visible = false
report.Parent = gui

local reportConstraint = Instance.new("UISizeConstraint")
reportConstraint.MinSize = Vector2.new(300, 360)
reportConstraint.MaxSize = Vector2.new(760, 680)
reportConstraint.Parent = report

local state = nil
local stateReceivedAt = 0
local session = nil
local submitting = false

local function setButtonsEnabled(enabled: boolean)
	for _, choiceButton in buttons do
		choiceButton.Active = enabled
		choiceButton.AutoButtonColor = enabled
	end
end

local function renderState(payload)
	state = payload
	stateReceivedAt = os.clock()
	local clock = payload.clock
	hud.Text = string.format("%s
%s • %ds", clock.InGameStart, clock.DisplayName, clock.SecondsRemaining)
	report.Visible = false

	if payload.report and payload.report.ok then
		local lines = {"TODAY'S REPORT"}
		for _, row in payload.report.classes do
			table.insert(lines, string.format(
				"%s  %s  %s",
				row.name,
				row.grade ~= "" and row.grade or "—",
				row.attendance
			))
		end
		table.insert(lines, string.format(
			"Completed %d/%d • Avg %d",
			payload.report.completed,
			payload.report.goal,
			payload.report.averageScore
		))
		if payload.dismissed then
			table.insert(lines, "School dismissed — free roam!")
			if payload.makeupAvailable then
				table.insert(lines, "Missed work available at the Library.")
			end
		end
		report.Text = table.concat(lines, "
")
		report.Visible = true
	end
end

local function renderQuestion(nextSession)
	session = nextSession
	panel.Visible = true
	report.Visible = false
	feedback.Text = ""
	submitting = false
	setButtonsEnabled(true)

	local question = nextSession.question
	if not question then
		panel.Visible = false
		return
	end

	local classLabel = tostring(nextSession.classId)
	if nextSession.makeup then
		classLabel ..= " • MAKE-UP"
	end
	questionLabel.Text = string.format(
		"%s • %d/%d
%s",
		classLabel,
		nextSession.questionIndex,
		nextSession.questionCount,
		question.prompt
	)

	for index, button in buttons do
		button.Text = question.choices[index] or ""
		button.Visible = question.choices[index] ~= nil
	end
end

for _, button in buttons do
	button.Activated:Connect(function()
		if submitting or not session or not session.question then return end
		local question = session.question
		submitting = true
		setButtonsEnabled(false)

		local result = submit:InvokeServer({
			sessionId = session.sessionId,
			questionId = question.id,
			contentHash = question.contentHash,
			choice = button.Text,
		})

		submitting = false
		setButtonsEnabled(true)

		if not result or result.ok ~= true then
			feedback.Text = if result and result.code == "rate_limited"
				then "One answer at a time."
				else "Try again in a moment."
			return
		end

		feedback.Text = result.explanation or ""
		if result.scaffold then
			feedback.Text = feedback.Text .. "
Hint: " .. tostring(result.scaffold)
		end

		if result.correct then
			if result.classComplete then
				feedback.Text = feedback.Text .. string.format(
					"
Class complete — %s (%d)",
					result.grade,
					result.score
				)
				task.delay(1.2, function()
					panel.Visible = false
				end)
			else
				session = result.session
				task.delay(0.55, function()
					renderQuestion(session)
				end)
			end
		end
	end)
end

stateEvent.OnClientEvent:Connect(renderState)
classOpened.OnClientEvent:Connect(renderQuestion)

RunService.Heartbeat:Connect(function()
	if state and state.clock then
		local elapsed = math.max(0, os.clock() - stateReceivedAt)
		local remaining = math.max(0, math.ceil(state.clock.SecondsRemaining - elapsed))
		hud.Text = string.format("%s
%s • %ds", state.clock.InGameStart, state.clock.DisplayName, remaining)
	end

	if not state or not state.targetAnchorName then
		waypoint.Visible = false
		return
	end

	local anchors = workspace:FindFirstChild("StarBloxSchoolAnchors")
	local target = anchors and anchors:FindFirstChild(state.targetAnchorName)
	local character = player.Character
	local rootPart = character and character:FindFirstChild("HumanoidRootPart")

	if target and target:IsA("BasePart") and rootPart and rootPart:IsA("BasePart") then
		local distance = (target.Position - rootPart.Position).Magnitude
		local targetName = state.targetDisplayName or state.clock.DisplayName
		local roomText = if state.targetRoom then " • Room " .. tostring(state.targetRoom) else ""
		waypoint.Text = string.format(
			"NEXT → %s%s • %d studs",
			targetName,
			roomText,
			math.floor(distance + 0.5)
		)
		waypoint.Visible = true
	else
		waypoint.Visible = false
	end
end)

local initial = requestState:InvokeServer()
if initial then renderState(initial) end
