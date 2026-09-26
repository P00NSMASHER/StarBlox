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
gui.DisplayOrder = 29
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = player:WaitForChild("PlayerGui")

local COLORS = {
	white = Color3.fromRGB(240, 240, 240),
	panel = Color3.fromRGB(245, 245, 245),
	tile = Color3.fromRGB(222, 222, 222),
	text = Color3.fromRGB(42, 42, 42),
	muted = Color3.fromRGB(92, 92, 92),
	cyan = Color3.fromRGB(30, 203, 216),
	red = Color3.fromRGB(205, 36, 36),
	border = Color3.fromRGB(112, 112, 112),
}

local function round(object: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = object
end

local function stroke(object: GuiObject, transparency: number?)
	local line = Instance.new("UIStroke")
	line.Color = COLORS.border
	line.Thickness = 1
	line.Transparency = transparency or 0.4
	line.Parent = object
end

local function constrain(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize = minSize
	limit.MaxTextSize = maxSize
	limit.Parent = label
end

local hud = Instance.new("TextLabel")
hud.Name = "SchoolScheduleChip"
hud.AnchorPoint = Vector2.new(0.5, 0)
hud.Size = UDim2.fromOffset(286, 36)
hud.Position = UDim2.new(0.5, 0, 0, 10)
hud.BackgroundColor3 = COLORS.white
hud.BackgroundTransparency = 0.16
hud.TextColor3 = COLORS.text
hud.Font = Enum.Font.GothamMedium
hud.TextWrapped = false
hud.TextScaled = true
hud.Visible = false
hud.ZIndex = 30
hud.Parent = gui
round(hud, 8)
stroke(hud, 0.5)
constrain(hud, 10, 14)

local waypoint = Instance.new("TextLabel")
waypoint.Name = "SchoolWaypoint"
waypoint.AnchorPoint = Vector2.new(0.5, 0)
waypoint.Size = UDim2.fromOffset(286, 28)
waypoint.Position = UDim2.new(0.5, 0, 0, 50)
waypoint.BackgroundColor3 = COLORS.white
waypoint.BackgroundTransparency = 0.2
waypoint.TextColor3 = COLORS.cyan
waypoint.Font = Enum.Font.GothamBold
waypoint.TextScaled = true
waypoint.Visible = false
waypoint.ZIndex = 30
waypoint.Parent = gui
round(waypoint, 8)
stroke(waypoint, 0.55)
constrain(waypoint, 9, 12)

local panel = Instance.new("Frame")
panel.Name = "ClassroomPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Size = UDim2.new(0.84, 0, 0, 410)
panel.Position = UDim2.fromScale(0.5, 0.52)
panel.BackgroundColor3 = COLORS.panel
panel.BackgroundTransparency = 0.04
panel.Visible = false
panel.ZIndex = 40
panel.Parent = gui
round(panel, 7)
stroke(panel, 0.2)

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MinSize = Vector2.new(300, 360)
panelConstraint.MaxSize = Vector2.new(520, 410)
panelConstraint.Parent = panel

local closeButton = Instance.new("TextButton")
closeButton.Name = "Close"
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, -8, 0, 8)
closeButton.Size = UDim2.fromOffset(44, 44)
closeButton.BackgroundColor3 = COLORS.red
closeButton.Text = "X"
closeButton.TextColor3 = Color3.new(1, 1, 1)
closeButton.Font = Enum.Font.GothamBold
closeButton.TextScaled = true
closeButton.ZIndex = 43
closeButton.Parent = panel
round(closeButton, 6)
stroke(closeButton, 0.25)
constrain(closeButton, 20, 27)

local questionLabel = Instance.new("TextLabel")
questionLabel.Name = "Question"
questionLabel.Size = UDim2.new(1, -72, 0, 134)
questionLabel.Position = UDim2.fromOffset(16, 12)
questionLabel.BackgroundTransparency = 1
questionLabel.TextColor3 = COLORS.text
questionLabel.Font = Enum.Font.GothamMedium
questionLabel.TextWrapped = true
questionLabel.TextScaled = true
questionLabel.TextXAlignment = Enum.TextXAlignment.Left
questionLabel.ZIndex = 41
questionLabel.Parent = panel
constrain(questionLabel, 12, 18)

local feedback = Instance.new("TextLabel")
feedback.Name = "Feedback"
feedback.Size = UDim2.new(1, -32, 0, 50)
feedback.Position = UDim2.new(0, 16, 0, 146)
feedback.BackgroundTransparency = 1
feedback.TextColor3 = COLORS.muted
feedback.Font = Enum.Font.GothamMedium
feedback.TextWrapped = true
feedback.TextScaled = true
feedback.ZIndex = 41
feedback.Parent = panel
constrain(feedback, 10, 14)

local buttons = {}
for index = 1, 3 do
	local button = Instance.new("TextButton")
	button.Name = "Choice" .. index
	button.Size = UDim2.new(1, -32, 0, 54)
	button.Position = UDim2.fromOffset(16, 202 + ((index - 1) * 60))
	button.BackgroundColor3 = COLORS.tile
	button.TextColor3 = COLORS.text
	button.Font = Enum.Font.GothamBold
	button.TextWrapped = true
	button.TextScaled = true
	button.ZIndex = 41
	button.Parent = panel
	round(button, 6)
	stroke(button, 0.45)
	constrain(button, 11, 16)
	buttons[index] = button
end

local report = Instance.new("TextLabel")
report.Name = "ReportCard"
report.AnchorPoint = Vector2.new(0.5, 0.5)
report.Size = UDim2.new(0.72, 0, 0, 330)
report.Position = UDim2.fromScale(0.5, 0.52)
report.BackgroundColor3 = COLORS.panel
report.BackgroundTransparency = 0.04
report.TextColor3 = COLORS.text
report.Font = Enum.Font.GothamMedium
report.TextWrapped = true
report.TextScaled = true
report.Visible = false
report.ZIndex = 42
report.Parent = gui
round(report, 8)
stroke(report, 0.25)
constrain(report, 10, 17)

local reportConstraint = Instance.new("UISizeConstraint")
reportConstraint.MinSize = Vector2.new(300, 300)
reportConstraint.MaxSize = Vector2.new(520, 360)
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
	hud.Text = string.format("%s\n%s • %ds", clock.InGameStart, clock.DisplayName, clock.SecondsRemaining)
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
		local earned = payload.report.earnings
		if type(earned) == "table" then
			table.insert(lines, string.format(
				"+%d Coins • +%d XP • +%d Stars",
				tonumber(earned.Coins) or 0,
				tonumber(earned.XP) or 0,
				tonumber(earned.Stars) or 0
			))
		end
		if payload.dismissed then
			table.insert(lines, "School dismissed — free roam!")
			if payload.makeupAvailable then
				table.insert(lines, "Missed work available at the Library.")
			end
		end
		report.Text = table.concat(lines, "\n")
		report.Visible = true
	end
end

local function richSummary(content: any): string
	if type(content) ~= "table" then return "" end
	local kind = tostring(content.kind or "")
	if kind == "clock-face" then
		local hour = math.floor(tonumber(content.hour) or 12)
		local minute = math.floor(tonumber(content.minute) or 0)
		return string.format("Clock model: %d:%02d", hour, minute)
	elseif kind == "number-line" then
		local startValue = tonumber(content.start)
		local endValue = tonumber(content["end"])
		local step = tonumber(content.step)
		if startValue ~= nil and endValue ~= nil and step ~= nil and step > 0 then
			local values = {}
			local value = startValue
			while value <= endValue and #values < 10 do
				table.insert(values, tostring(value))
				value += step
			end
			return "Number line: " .. table.concat(values, "  •  ")
		end
	elseif kind == "shape-fraction" then
		return string.format(
			"Fraction model: %d of %d equal parts shaded",
			math.floor(tonumber(content.shaded) or 0),
			math.floor(tonumber(content.parts) or 0)
		)
	elseif kind == "place-value" then
		return string.format(
			"Place value: %s hundreds • %s tens • %s ones",
			tostring(content.hundreds or 0),
			tostring(content.tens or 0),
			tostring(content.ones or 0)
		)
	elseif kind == "bar-chart" and type(content.bars) == "table" then
		local parts = {}
		for _, row in content.bars do
			table.insert(parts, tostring(row.label or "?") .. ": " .. tostring(row.value or 0))
		end
		return "Bar chart: " .. table.concat(parts, "  •  ")
	end
	return ""
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
	local promptText = tostring(question.prompt or "")
	local visualText = richSummary(question.richContent)
	if visualText ~= "" then
		promptText ..= "\n" .. visualText
	end
	questionLabel.Text = string.format(
		"%s • %d/%d\n%s",
		classLabel,
		nextSession.questionIndex,
		nextSession.questionCount,
		promptText
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
		if result.partialCredit == true and result.correct ~= true then
			feedback.Text ..= "\nYou have part of the reasoning right."
		end
		if result.scaffold then
			feedback.Text = feedback.Text .. "\nHint: " .. tostring(result.scaffold)
		end

		if result.correct then
			if result.classComplete then
				feedback.Text = feedback.Text .. string.format(
					"\nClass complete — %s (%d)",
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

closeButton.Activated:Connect(function()
	panel.Visible = false
end)

stateEvent.OnClientEvent:Connect(renderState)
classOpened.OnClientEvent:Connect(renderQuestion)

RunService.Heartbeat:Connect(function()
	if state and state.clock then
		local elapsed = math.max(0, os.clock() - stateReceivedAt)
		local remaining = math.max(0, math.ceil(state.clock.SecondsRemaining - elapsed))
		hud.Text = string.format("%s\n%s • %ds", state.clock.InGameStart, state.clock.DisplayName, remaining)
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
