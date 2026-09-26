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
panelConstraint.MaxSize = Vector2.new(520, 458)
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

local richFrame = Instance.new("Frame")
richFrame.Name = "RichQuestionVisual"
richFrame.Position = UDim2.fromOffset(16, 108)
richFrame.Size = UDim2.new(1, -32, 0, 82)
richFrame.BackgroundColor3 = Color3.fromRGB(235, 235, 235)
richFrame.BackgroundTransparency = 0.08
richFrame.Visible = false
richFrame.ZIndex = 41
richFrame.Parent = panel
round(richFrame, 5)
stroke(richFrame, 0.4)

local function richText(
	parent: Instance,
	textValue: string,
	position: UDim2,
	size: UDim2,
	bold: boolean?
): TextLabel
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = position
	label.Size = size
	label.Text = textValue
	label.TextColor3 = COLORS.text
	label.TextScaled = true
	label.TextWrapped = true
	label.Font = if bold == true then Enum.Font.GothamBold else Enum.Font.GothamMedium
	label.ZIndex = 43
	label.Parent = parent
	constrain(label, 8, 13)
	return label
end

local function clearRichVisual()
	for _, child in richFrame:GetChildren() do
		if not child:IsA("UICorner") and not child:IsA("UIStroke") then
			child:Destroy()
		end
	end
	richFrame.Visible = false
end

local function renderBarChart(content): boolean
	local bars = content.bars
	if type(bars) ~= "table" or #bars < 2 then
		return false
	end
	local maxValue = 1
	for _, row in bars do
		maxValue = math.max(maxValue, tonumber(row.value) or 0)
	end
	local width = 1 / #bars
	for index, row in bars do
		local holder = Instance.new("Frame")
		holder.BackgroundTransparency = 1
		holder.Position = UDim2.new((index - 1) * width, 3, 0, 4)
		holder.Size = UDim2.new(width, -6, 1, -8)
		holder.ZIndex = 42
		holder.Parent = richFrame

		local value = math.max(0, tonumber(row.value) or 0)
		local barHeight = 42 * math.clamp(value / maxValue, 0.08, 1)
		local bar = Instance.new("Frame")
		bar.AnchorPoint = Vector2.new(0.5, 1)
		bar.Position = UDim2.new(0.5, 0, 0, 53)
		bar.Size = UDim2.new(0.55, 0, 0, barHeight)
		bar.BackgroundColor3 = COLORS.cyan
		bar.ZIndex = 43
		bar.Parent = holder
		round(bar, 2)

		richText(holder, tostring(value), UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0, 18), true)
		richText(holder, tostring(row.label or ""), UDim2.new(0, 0, 1, -20), UDim2.new(1, 0, 0, 18), false)
	end
	return true
end

local function renderClock(content): boolean
	local hour = math.clamp(math.floor(tonumber(content.hour) or 12), 1, 12)
	local minute = math.clamp(math.floor(tonumber(content.minute) or 0), 0, 59)
	local clock = Instance.new("Frame")
	clock.AnchorPoint = Vector2.new(0.5, 0.5)
	clock.Position = UDim2.fromScale(0.5, 0.5)
	clock.Size = UDim2.fromOffset(70, 70)
	clock.BackgroundColor3 = Color3.fromRGB(250, 250, 250)
	clock.ZIndex = 42
	clock.Parent = richFrame
	round(clock, 35)
	stroke(clock, 0.2)

	for number = 1, 12 do
		local angle = math.rad((number * 30) - 90)
		local label = richText(
			clock,
			tostring(number),
			UDim2.fromOffset(30 + math.cos(angle) * 25, 28 + math.sin(angle) * 25),
			UDim2.fromOffset(12, 12),
			false
		)
		label.AnchorPoint = Vector2.new(0.5, 0.5)
	end

	local hourHand = Instance.new("Frame")
	hourHand.AnchorPoint = Vector2.new(0.5, 1)
	hourHand.Position = UDim2.fromScale(0.5, 0.5)
	hourHand.Size = UDim2.fromOffset(4, 21)
	hourHand.Rotation = (hour % 12) * 30 + minute * 0.5
	hourHand.BackgroundColor3 = COLORS.text
	hourHand.ZIndex = 44
	hourHand.Parent = clock
	round(hourHand, 2)

	local minuteHand = Instance.new("Frame")
	minuteHand.AnchorPoint = Vector2.new(0.5, 1)
	minuteHand.Position = UDim2.fromScale(0.5, 0.5)
	minuteHand.Size = UDim2.fromOffset(2, 29)
	minuteHand.Rotation = minute * 6
	minuteHand.BackgroundColor3 = COLORS.cyan
	minuteHand.ZIndex = 45
	minuteHand.Parent = clock
	return true
end

local function renderNumberLine(content): boolean
	local startValue = tonumber(content.start)
	local endValue = tonumber(content["end"])
	local step = tonumber(content.step)
	if startValue == nil or endValue == nil or step == nil or step <= 0 or endValue <= startValue then
		return false
	end

	local line = Instance.new("Frame")
	line.Position = UDim2.new(0, 24, 0.5, -1)
	line.Size = UDim2.new(1, -48, 0, 2)
	line.BackgroundColor3 = COLORS.text
	line.ZIndex = 42
	line.Parent = richFrame

	local count = math.clamp(math.floor((endValue - startValue) / step) + 1, 2, 8)
	for index = 1, count do
		local value = startValue + (index - 1) * step
		local fraction = (index - 1) / (count - 1)
		local tick = Instance.new("Frame")
		tick.AnchorPoint = Vector2.new(0.5, 0.5)
		tick.Position = UDim2.new(fraction, 24 * (1 - fraction) - 24 * fraction, 0.5, 0)
		tick.Size = UDim2.fromOffset(2, 14)
		tick.BackgroundColor3 = if value == tonumber(content.highlight) then COLORS.cyan else COLORS.text
		tick.ZIndex = 43
		tick.Parent = richFrame

		local label = richText(
			richFrame,
			tostring(value),
			UDim2.new(fraction, -14, 0.5, 10),
			UDim2.fromOffset(28, 18),
			value == tonumber(content.highlight)
		)
		label.AnchorPoint = Vector2.new(0.5, 0)
	end
	return true
end

local function renderPlaceValue(content): boolean
	local values = {
		{"Hundreds", tonumber(content.hundreds) or 0},
		{"Tens", tonumber(content.tens) or 0},
		{"Ones", tonumber(content.ones) or 0},
	}
	for index, row in values do
		local card = Instance.new("Frame")
		card.Position = UDim2.new((index - 1) / 3, 4, 0, 7)
		card.Size = UDim2.new(1 / 3, -8, 1, -14)
		card.BackgroundColor3 = Color3.fromRGB(250, 250, 250)
		card.ZIndex = 42
		card.Parent = richFrame
		round(card, 4)
		stroke(card, 0.5)
		richText(card, row[1], UDim2.fromOffset(4, 4), UDim2.new(1, -8, 0, 24), false)
		richText(card, tostring(row[2]), UDim2.fromOffset(4, 30), UDim2.new(1, -8, 1, -34), true)
	end
	return true
end

local function renderFraction(content): boolean
	local parts = math.clamp(math.floor(tonumber(content.parts) or 2), 2, 4)
	local shaded = math.clamp(math.floor(tonumber(content.shaded) or 0), 0, parts)
	for index = 1, parts do
		local cell = Instance.new("Frame")
		cell.Position = UDim2.new((index - 1) / parts, 5, 0, 12)
		cell.Size = UDim2.new(1 / parts, -10, 1, -24)
		cell.BackgroundColor3 = if index <= shaded then COLORS.cyan else Color3.fromRGB(250, 250, 250)
		cell.ZIndex = 42
		cell.Parent = richFrame
		round(cell, 3)
		stroke(cell, 0.3)
	end
	return true
end

local function renderRichContent(content: any): boolean
	clearRichVisual()
	if type(content) ~= "table" then
		return false
	end
	local kind = tostring(content.kind or "")
	local rendered = if kind == "bar-chart"
		then renderBarChart(content)
		elseif kind == "clock-face"
		then renderClock(content)
		elseif kind == "number-line"
		then renderNumberLine(content)
		elseif kind == "place-value"
		then renderPlaceValue(content)
		elseif kind == "shape-fraction"
		then renderFraction(content)
		else false
	richFrame.Visible = rendered
	return rendered
end

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
	hud.Text = string.format("%s  •  %s  •  %ds", clock.InGameStart, clock.DisplayName, clock.SecondsRemaining)
	hud.Visible = payload.dismissed ~= true
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
	local hasRich = renderRichContent(question.richContent)
	if hasRich then
		panel.Size = UDim2.new(0.84, 0, 0, 458)
		questionLabel.Size = UDim2.new(1, -72, 0, 90)
		feedback.Position = UDim2.fromOffset(16, 194)
		for index, button in buttons do
			button.Position = UDim2.fromOffset(16, 248 + ((index - 1) * 60))
		end
	else
		panel.Size = UDim2.new(0.84, 0, 0, 410)
		questionLabel.Size = UDim2.new(1, -72, 0, 134)
		feedback.Position = UDim2.fromOffset(16, 146)
		for index, button in buttons do
			button.Position = UDim2.fromOffset(16, 202 + ((index - 1) * 60))
		end
		local visualText = richSummary(question.richContent)
		if visualText ~= "" then
			promptText ..= "\n" .. visualText
		end
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
	clearRichVisual()
end)

stateEvent.OnClientEvent:Connect(renderState)
classOpened.OnClientEvent:Connect(renderQuestion)

RunService.Heartbeat:Connect(function()
	if state and state.clock then
		local elapsed = math.max(0, os.clock() - stateReceivedAt)
		local remaining = math.max(0, math.ceil(state.clock.SecondsRemaining - elapsed))
		hud.Text = string.format("%s  •  %s  •  %ds", state.clock.InGameStart, state.clock.DisplayName, remaining)
		hud.Visible = state.dismissed ~= true
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
			"→ %s%s • %d studs",
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
