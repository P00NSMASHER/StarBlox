--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxCoreLoop")
local activityOpened = remotes:WaitForChild("ActivityOpened") :: RemoteEvent
local submitAnswer = remotes:WaitForChild("SubmitAnswer") :: RemoteFunction
local requestStatus = remotes:WaitForChild("RequestStatus") :: RemoteFunction
local dismissOnboarding = remotes:WaitForChild("DismissOnboarding") :: RemoteEvent
local telemetryRemote = ReplicatedStorage:WaitForChild("StarBloxPrivatePlaytestTelemetry", 10)

local function sendPlaytestTelemetry(eventName: string, payload: any?)
	if telemetryRemote ~= nil and telemetryRemote:IsA("RemoteEvent") then
		telemetryRemote:FireServer(eventName, payload or {})
	end
end

local COLORS = {
	navy = Color3.fromRGB(245, 245, 245),
	panel = Color3.fromRGB(245, 245, 245),
	panelSoft = Color3.fromRGB(222, 222, 222),
	text = Color3.fromRGB(42, 42, 42),
	muted = Color3.fromRGB(90, 90, 90),
	accent = Color3.fromRGB(80, 154, 221),
	success = Color3.fromRGB(68, 173, 92),
	warning = Color3.fromRGB(205, 137, 35),
	danger = Color3.fromRGB(210, 49, 49),
}

local function round(guiObject: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = guiObject
end

local function outline(guiObject: GuiObject, transparency: number?)
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 1
	stroke.Transparency = transparency or 0.15
	stroke.Color = Color3.fromRGB(115, 115, 115)
	stroke.Parent = guiObject
end

local function constrainText(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local constraint = Instance.new("UITextSizeConstraint")
	constraint.MinTextSize = minSize
	constraint.MaxTextSize = maxSize
	constraint.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "StarBloxCoreLoopUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 20
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local hud = Instance.new("Frame")
hud.Name = "HUD"
hud.AnchorPoint = Vector2.new(1, 0)
hud.Size = UDim2.fromOffset(205, 46)
hud.Position = UDim2.new(1, -72, 0, 8)
hud.BackgroundColor3 = COLORS.navy
hud.BackgroundTransparency = 0.05
hud.Parent = gui
round(hud, 5)
outline(hud, 0.15)

local hudSize = Instance.new("UISizeConstraint")
hudSize.MinSize = Vector2.new(190, 46)
hudSize.MaxSize = Vector2.new(220, 46)
hudSize.Parent = hud

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(8, 4)
title.Size = UDim2.fromOffset(92, 20)
title.Font = Enum.Font.GothamBold
title.Text = "--:--"
title.TextColor3 = COLORS.text
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Center
title.Parent = hud
constrainText(title, 13, 17)

local economy = Instance.new("TextLabel")
economy.Name = "Economy"
economy.BackgroundTransparency = 1
economy.Position = UDim2.fromOffset(105, 4)
economy.Size = UDim2.new(1, -112, 0, 20)
economy.Font = Enum.Font.GothamBold
economy.TextColor3 = COLORS.text
economy.TextScaled = true
economy.TextXAlignment = Enum.TextXAlignment.Center
economy.Parent = hud
constrainText(economy, 12, 15)

local progress = Instance.new("TextLabel")
progress.Name = "Progress"
progress.BackgroundTransparency = 1
progress.Position = UDim2.fromOffset(8, 25)
progress.Size = UDim2.new(1, -16, 0, 15)
progress.Font = Enum.Font.GothamMedium
progress.TextColor3 = COLORS.muted
progress.TextScaled = true
progress.TextXAlignment = Enum.TextXAlignment.Center
progress.Parent = hud
constrainText(progress, 11, 14)

local nextHint = Instance.new("TextLabel")
nextHint.Name = "NextHint"
nextHint.AnchorPoint = Vector2.new(1, 0)
nextHint.BackgroundColor3 = COLORS.navy
nextHint.BackgroundTransparency = 0.16
nextHint.Position = UDim2.new(0.5, 76, 0, 8)
nextHint.Size = UDim2.fromOffset(150, 30)
nextHint.Font = Enum.Font.GothamBold
nextHint.TextColor3 = COLORS.warning
nextHint.TextScaled = true
nextHint.TextXAlignment = Enum.TextXAlignment.Center
nextHint.Text = "Loading your next station…"
nextHint.Parent = gui
round(nextHint, 5)
outline(nextHint, 0.15)
constrainText(nextHint, 10, 13)

local toast = Instance.new("TextLabel")
toast.Name = "Toast"
toast.AnchorPoint = Vector2.new(0.5, 0)
toast.Position = UDim2.new(0.5, 0, 0, 58)
toast.Size = UDim2.new(0.76, 0, 0, 42)
toast.BackgroundColor3 = COLORS.panel
toast.BackgroundTransparency = 1
toast.TextTransparency = 1
toast.TextColor3 = COLORS.text
toast.TextWrapped = true
toast.TextScaled = true
toast.Font = Enum.Font.GothamBold
toast.Visible = false
toast.ZIndex = 40
toast.Parent = gui
round(toast, 5)
outline(toast, 0.15)
constrainText(toast, 13, 18)

local toastSize = Instance.new("UISizeConstraint")
toastSize.MaxSize = Vector2.new(500, 42)
toastSize.MinSize = Vector2.new(260, 42)
toastSize.Parent = toast

local panel = Instance.new("Frame")
panel.Name = "ActivityPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.54)
panel.Size = UDim2.new(0.84, 0, 0, 322)
panel.BackgroundColor3 = COLORS.panel
panel.BackgroundTransparency = 0.03
panel.Visible = false
panel.ZIndex = 30
panel.Parent = gui
round(panel, 5)
outline(panel, 0.1)

local panelScale = Instance.new("UIScale")
panelScale.Scale = 1
panelScale.Parent = panel

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MaxSize = Vector2.new(520, 410)
panelConstraint.MinSize = Vector2.new(300, 300)
panelConstraint.Parent = panel

local closeButton = Instance.new("TextButton")
closeButton.Name = "CloseButton"
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, -10, 0, 10)
closeButton.Size = UDim2.fromOffset(44, 44)
closeButton.BackgroundColor3 = COLORS.danger
closeButton.Text = "×"
closeButton.TextColor3 = Color3.new(1, 1, 1)
closeButton.TextScaled = true
closeButton.Font = Enum.Font.GothamBold
closeButton.AutoButtonColor = true
closeButton.ZIndex = 32
closeButton.Parent = panel
round(closeButton, 4)
constrainText(closeButton, 20, 26)

local activityTitle = Instance.new("TextLabel")
activityTitle.Name = "ActivityTitle"
activityTitle.BackgroundTransparency = 1
activityTitle.Position = UDim2.fromOffset(16, 12)
activityTitle.Size = UDim2.new(1, -76, 0, 36)
activityTitle.TextColor3 = COLORS.text
activityTitle.Font = Enum.Font.GothamBold
activityTitle.TextScaled = true
activityTitle.TextWrapped = true
activityTitle.TextXAlignment = Enum.TextXAlignment.Left
activityTitle.ZIndex = 31
activityTitle.Parent = panel
constrainText(activityTitle, 15, 20)

local promptLabel = Instance.new("TextLabel")
promptLabel.Name = "Prompt"
promptLabel.BackgroundTransparency = 1
promptLabel.Position = UDim2.fromOffset(16, 54)
promptLabel.Size = UDim2.new(1, -32, 0, 64)
promptLabel.TextColor3 = COLORS.text
promptLabel.Font = Enum.Font.GothamMedium
promptLabel.TextScaled = true
promptLabel.TextWrapped = true
promptLabel.TextXAlignment = Enum.TextXAlignment.Left
promptLabel.ZIndex = 31
promptLabel.Parent = panel
constrainText(promptLabel, 13, 18)

local richFrame = Instance.new("Frame")
richFrame.Name = "RichQuestionVisual"
richFrame.Position = UDim2.fromOffset(16, 116)
richFrame.Size = UDim2.new(1, -32, 0, 82)
richFrame.BackgroundColor3 = Color3.fromRGB(235, 235, 235)
richFrame.BackgroundTransparency = 0.08
richFrame.Visible = false
richFrame.ZIndex = 31
richFrame.Parent = panel
round(richFrame, 4)
outline(richFrame, 0.35)

local function richText(parent: Instance, textValue: string, position: UDim2, size: UDim2, bold: boolean?): TextLabel
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = position
	label.Size = size
	label.Text = textValue
	label.TextColor3 = COLORS.text
	label.TextScaled = true
	label.TextWrapped = true
	label.Font = if bold == true then Enum.Font.GothamBold else Enum.Font.GothamMedium
	label.ZIndex = 33
	label.Parent = parent
	constrainText(label, 9, 14)
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

local function renderBarChart(content)
	local bars = content.bars
	if type(bars) ~= "table" or #bars < 2 then return false end
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
		holder.ZIndex = 32
		holder.Parent = richFrame

		local value = math.max(0, tonumber(row.value) or 0)
		local barHeight = 42 * math.clamp(value / maxValue, 0.08, 1)
		local bar = Instance.new("Frame")
		bar.AnchorPoint = Vector2.new(0.5, 1)
		bar.Position = UDim2.new(0.5, 0, 0, 53)
		bar.Size = UDim2.new(0.55, 0, 0, barHeight)
		bar.BackgroundColor3 = COLORS.accent
		bar.ZIndex = 33
		bar.Parent = holder
		round(bar, 2)

		richText(holder, tostring(value), UDim2.new(0, 0, 0, 0), UDim2.new(1, 0, 0, 18), true)
		richText(holder, tostring(row.label or ""), UDim2.new(0, 0, 1, -20), UDim2.new(1, 0, 0, 18), false)
	end
	return true
end

local function renderClock(content)
	local hour = math.clamp(math.floor(tonumber(content.hour) or 12), 1, 12)
	local minute = math.clamp(math.floor(tonumber(content.minute) or 0), 0, 59)
	local clock = Instance.new("Frame")
	clock.AnchorPoint = Vector2.new(0.5, 0.5)
	clock.Position = UDim2.fromScale(0.5, 0.5)
	clock.Size = UDim2.fromOffset(70, 70)
	clock.BackgroundColor3 = Color3.fromRGB(250, 250, 250)
	clock.ZIndex = 32
	clock.Parent = richFrame
	round(clock, 35)
	outline(clock, 0.1)

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
	hourHand.ZIndex = 34
	hourHand.Parent = clock
	round(hourHand, 2)

	local minuteHand = Instance.new("Frame")
	minuteHand.AnchorPoint = Vector2.new(0.5, 1)
	minuteHand.Position = UDim2.fromScale(0.5, 0.5)
	minuteHand.Size = UDim2.fromOffset(2, 29)
	minuteHand.Rotation = minute * 6
	minuteHand.BackgroundColor3 = COLORS.accent
	minuteHand.ZIndex = 35
	minuteHand.Parent = clock
	return true
end

local function renderNumberLine(content)
	local startValue = tonumber(content.start)
	local endValue = tonumber(content["end"])
	local step = tonumber(content.step)
	if startValue == nil or endValue == nil or step == nil or step <= 0 or endValue <= startValue then return false end
	local line = Instance.new("Frame")
	line.Position = UDim2.new(0, 24, 0.5, -1)
	line.Size = UDim2.new(1, -48, 0, 2)
	line.BackgroundColor3 = COLORS.text
	line.ZIndex = 32
	line.Parent = richFrame

	local count = math.clamp(math.floor((endValue - startValue) / step) + 1, 2, 8)
	for index = 1, count do
		local value = startValue + (index - 1) * step
		local fraction = if count == 1 then 0 else (index - 1) / (count - 1)
		local tick = Instance.new("Frame")
		tick.AnchorPoint = Vector2.new(0.5, 0.5)
		tick.Position = UDim2.new(fraction, 24 * (1 - fraction) - 24 * fraction, 0.5, 0)
		tick.Size = UDim2.fromOffset(2, 14)
		tick.BackgroundColor3 = if value == tonumber(content.highlight) then COLORS.accent else COLORS.text
		tick.ZIndex = 33
		tick.Parent = richFrame
		local label = richText(richFrame, tostring(value), UDim2.new(fraction, -14, 0.5, 10), UDim2.fromOffset(28, 18), value == tonumber(content.highlight))
		label.AnchorPoint = Vector2.new(0.5, 0)
	end
	return true
end

local function renderPlaceValue(content)
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
		card.ZIndex = 32
		card.Parent = richFrame
		round(card, 4)
		outline(card, 0.45)
		richText(card, row[1], UDim2.fromOffset(4, 4), UDim2.new(1, -8, 0, 24), false)
		richText(card, tostring(row[2]), UDim2.fromOffset(4, 30), UDim2.new(1, -8, 1, -34), true)
	end
	return true
end

local function renderFraction(content)
	local parts = math.clamp(math.floor(tonumber(content.parts) or 2), 2, 4)
	local shaded = math.clamp(math.floor(tonumber(content.shaded) or 0), 0, parts)
	for index = 1, parts do
		local cell = Instance.new("Frame")
		cell.Position = UDim2.new((index - 1) / parts, 5, 0, 12)
		cell.Size = UDim2.new(1 / parts, -10, 1, -24)
		cell.BackgroundColor3 = if index <= shaded then COLORS.accent else Color3.fromRGB(250, 250, 250)
		cell.ZIndex = 32
		cell.Parent = richFrame
		round(cell, 3)
		outline(cell, 0.25)
	end
	return true
end

local function renderRichContent(content: any): boolean
	clearRichVisual()
	if type(content) ~= "table" then return false end
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

local resultLabel = Instance.new("TextLabel")
resultLabel.Name = "Result"
resultLabel.BackgroundTransparency = 1
resultLabel.Position = UDim2.fromOffset(16, 286)
resultLabel.Size = UDim2.new(1, -32, 0, 26)
resultLabel.TextColor3 = COLORS.muted
resultLabel.Font = Enum.Font.GothamBold
resultLabel.TextScaled = true
resultLabel.TextWrapped = true
resultLabel.ZIndex = 31
resultLabel.Parent = panel
constrainText(resultLabel, 11, 15)

local buttons = {}
for index = 1, 3 do
	local button = Instance.new("TextButton")
	button.Name = "Choice" .. tostring(index)
	button.Position = UDim2.new(0, 16, 0, 130 + ((index - 1) * 52))
	button.Size = UDim2.new(1, -32, 0, 44)
	button.BackgroundColor3 = COLORS.panelSoft
	button.TextColor3 = COLORS.text
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.TextWrapped = true
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 31
	button.Parent = panel
	round(button, 4)
	outline(button, 0.15)
	constrainText(button, 13, 18)
	buttons[index] = button
end

local onboarding = Instance.new("Frame")
onboarding.Name = "Onboarding"
onboarding.AnchorPoint = Vector2.new(0.5, 0.5)
onboarding.Position = UDim2.fromScale(0.5, 0.5)
onboarding.Size = UDim2.new(0.78, 0, 0, 216)
onboarding.BackgroundColor3 = COLORS.navy
onboarding.BackgroundTransparency = 0.03
onboarding.Visible = false
onboarding.ZIndex = 50
onboarding.Parent = gui
round(onboarding, 5)
outline(onboarding, 0.1)

local onboardingConstraint = Instance.new("UISizeConstraint")
onboardingConstraint.MaxSize = Vector2.new(440, 216)
onboardingConstraint.MinSize = Vector2.new(300, 200)
onboardingConstraint.Parent = onboarding

local onboardingTitle = Instance.new("TextLabel")
onboardingTitle.BackgroundTransparency = 1
onboardingTitle.Position = UDim2.fromOffset(18, 12)
onboardingTitle.Size = UDim2.new(1, -36, 0, 32)
onboardingTitle.Font = Enum.Font.GothamBold
onboardingTitle.Text = "Ready to explore?"
onboardingTitle.TextColor3 = COLORS.text
onboardingTitle.TextScaled = true
onboardingTitle.TextWrapped = true
onboardingTitle.ZIndex = 51
onboardingTitle.Parent = onboarding
constrainText(onboardingTitle, 16, 21)

local onboardingBody = Instance.new("TextLabel")
onboardingBody.BackgroundTransparency = 1
onboardingBody.Position = UDim2.fromOffset(18, 48)
onboardingBody.Size = UDim2.new(1, -36, 0, 54)
onboardingBody.Font = Enum.Font.GothamMedium
onboardingBody.Text = "Find 3 activity spots and answer one question at each."
onboardingBody.TextColor3 = COLORS.text
onboardingBody.TextScaled = true
onboardingBody.TextWrapped = true
onboardingBody.ZIndex = 51
onboardingBody.Parent = onboarding
constrainText(onboardingBody, 13, 17)

local onboardingHint = Instance.new("TextLabel")
onboardingHint.BackgroundTransparency = 1
onboardingHint.Position = UDim2.fromOffset(18, 106)
onboardingHint.Size = UDim2.new(1, -36, 0, 34)
onboardingHint.Font = Enum.Font.GothamMedium
onboardingHint.Text = "Walk near a prompt and tap Start Activity."
onboardingHint.TextColor3 = COLORS.warning
onboardingHint.TextScaled = true
onboardingHint.TextWrapped = true
onboardingHint.ZIndex = 51
onboardingHint.Parent = onboarding
constrainText(onboardingHint, 11, 15)

local onboardingButton = Instance.new("TextButton")
onboardingButton.Name = "OnboardingContinue"
onboardingButton.AnchorPoint = Vector2.new(0.5, 1)
onboardingButton.Position = UDim2.new(0.5, 0, 1, -14)
onboardingButton.Size = UDim2.new(1, -36, 0, 44)
onboardingButton.BackgroundColor3 = COLORS.accent
onboardingButton.Text = "Explore"
onboardingButton.TextColor3 = COLORS.text
onboardingButton.Font = Enum.Font.GothamBold
onboardingButton.TextScaled = true
onboardingButton.AutoButtonColor = true
onboardingButton.Selectable = true
onboardingButton.ZIndex = 51
onboardingButton.Parent = onboarding
round(onboardingButton, 4)
constrainText(onboardingButton, 14, 18)

local waypoint = Instance.new("BillboardGui")
waypoint.Name = "NextActivityWaypoint"
waypoint.Size = UDim2.fromOffset(96, 24)
waypoint.StudsOffsetWorldSpace = Vector3.new(0, 2.5, 0)
waypoint.AlwaysOnTop = false
waypoint.MaxDistance = 220
waypoint.Enabled = false
waypoint.Parent = playerGui

local waypointLabel = Instance.new("TextLabel")
waypointLabel.Name = "Label"
waypointLabel.Size = UDim2.fromScale(1, 1)
waypointLabel.BackgroundColor3 = COLORS.navy
waypointLabel.BackgroundTransparency = 0.08
waypointLabel.TextColor3 = COLORS.text
waypointLabel.TextScaled = true
waypointLabel.Font = Enum.Font.GothamBold
waypointLabel.Parent = waypoint
round(waypointLabel, 4)
outline(waypointLabel, 0.35)
constrainText(waypointLabel, 9, 11)

local anchorFolder = workspace:WaitForChild("StarBloxActivityAnchors", 10)

local function updateWaypoint(activityId: any, stationName: any)
	waypoint.Enabled = false
	waypoint.Adornee = nil
	if anchorFolder == nil or type(activityId) ~= "string" then
		return
	end

	for _, candidate in anchorFolder:GetChildren() do
		if candidate:IsA("BasePart") and candidate:GetAttribute("ActivityId") == activityId then
			waypoint.Adornee = candidate
			waypointLabel.Text = "→ " .. tostring(stationName or "Next activity")
			waypoint.Enabled = true
			return
		end
	end
end

local currentActivity = nil
local submitting = false
local statusRequestInFlight = false
local onboardingDismissedLocally = false
local onboardingShownReported = false

local function readNumber(name: string): number
	return tonumber(player:GetAttribute(name)) or 0
end

local function showToast(message: string, positive: boolean?)
	toast.Text = message
	toast.BackgroundColor3 = if positive == true then COLORS.success else COLORS.panel
	toast.Visible = true
	toast.BackgroundTransparency = 1
	toast.TextTransparency = 1

	TweenService:Create(
		toast,
		TweenInfo.new(0.16, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{BackgroundTransparency = 0.08, TextTransparency = 0}
	):Play()

	task.delay(2.1, function()
		local tween = TweenService:Create(
			toast,
			TweenInfo.new(0.2, Enum.EasingStyle.Quad, Enum.EasingDirection.In),
			{BackgroundTransparency = 1, TextTransparency = 1}
		)
		tween:Play()
		tween.Completed:Once(function()
			toast.Visible = false
		end)
	end)
end

local function hidePanel()
	currentActivity = nil
	panel.Visible = false
end

local function showPanel()
	panel.Visible = true
	panel.Position = UDim2.fromScale(0.5, 0.54)
	TweenService:Create(
		panel,
		TweenInfo.new(0.18, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{Position = UDim2.fromScale(0.5, 0.5)}
	):Play()
end

local function successPulse()
	panelScale.Scale = 0.985
	local grow = TweenService:Create(
		panelScale,
		TweenInfo.new(0.12, Enum.EasingStyle.Back, Enum.EasingDirection.Out),
		{Scale = 1.025}
	)
	local settle = TweenService:Create(
		panelScale,
		TweenInfo.new(0.14, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{Scale = 1}
	)
	grow:Play()
	grow.Completed:Once(function()
		settle:Play()
	end)
end

local function shakePanel()
	local center = UDim2.fromScale(0.5, 0.5)
	local left = UDim2.new(0.5, -8, 0.5, 0)
	local right = UDim2.new(0.5, 8, 0.5, 0)
	local a = TweenService:Create(panel, TweenInfo.new(0.06), {Position = left})
	local b = TweenService:Create(panel, TweenInfo.new(0.06), {Position = right})
	local d = TweenService:Create(panel, TweenInfo.new(0.06), {Position = center})
	a:Play()
	a.Completed:Once(function()
		b:Play()
		b.Completed:Once(function()
			d:Play()
		end)
	end)
end

local function updateClock()
	local now = DateTime.now()
	local okTime, localTime = pcall(function()
		return now:FormatLocalTime("h:mm A", "en-us")
	end)
	local okDay, localDay = pcall(function()
		return now:FormatLocalTime("dddd", "en-us")
	end)
	title.Text = if okTime then localTime else "StarBlox"
	progress.Text = if okDay then localDay else ""
end

local function updateHud()
	economy.Text = string.format("%d Coins", readNumber("StarBloxCoins"))
	updateClock()
end

for _, attribute in {
	"StarBloxCoins",
	"StarBloxXP",
	"StarBloxStars",
	"StarBloxLoopRuns",
	"StarBloxRunNumber",
	"StarBloxSparkTrailUnlocked",
} do
	player:GetAttributeChangedSignal(attribute):Connect(updateHud)
end
updateHud()
task.spawn(function()
	while gui.Parent ~= nil do
		task.wait(30)
		updateClock()
	end
end)

local function applyStatus(status)
	if type(status) ~= "table" or status.ok ~= true then
		return false
	end

	local progressCount = tonumber(status.progress) or 0
	local activityCount = tonumber(status.activityCount) or 3
	updateWaypoint(status.recommendedActivityId, status.recommendedStationName)

	updateClock()

	if type(status.recommendedStationName) == "string" then
		nextHint.Text = "→ " .. status.recommendedStationName
		nextHint.TextColor3 = if status.rewardCapReached == true then COLORS.muted else COLORS.warning
	else
		nextHint.Text = "✓ Challenge complete"
		nextHint.TextColor3 = COLORS.success
	end

	if status.onboardingSeen ~= true and not onboardingDismissedLocally then
		onboarding.Visible = true
		if not onboardingShownReported then
			onboardingShownReported = true
			sendPlaytestTelemetry("onboarding_shown")
		end
	end

	return true
end

local function refreshStatus(attempt: number?)
	if statusRequestInFlight then
		return
	end
	statusRequestInFlight = true
	local tryNumber = attempt or 1

	local ok, status = pcall(function()
		return requestStatus:InvokeServer()
	end)
	statusRequestInFlight = false

	if ok and applyStatus(status) then
		return
	end

	nextHint.Text = "Reconnecting…"
	nextHint.TextColor3 = COLORS.warning
	if tryNumber < 3 then
		task.delay(0.45 * (2 ^ (tryNumber - 1)), function()
			refreshStatus(tryNumber + 1)
		end)
	else
		nextHint.Text = "Couldn’t refresh — try an activity prompt."
		nextHint.TextColor3 = COLORS.danger
		sendPlaytestTelemetry("retry_state_seen")
	end
end

local function showActivity(activity)
	currentActivity = activity
	sendPlaytestTelemetry("activity_panel_opened", {
		activityId = activity.id,
		questionId = activity.questionId,
	})
	activityTitle.Text = activity.title or activity.stationName or "StarBlox Activity"
	activityTitle.TextColor3 = if typeof(activity.accent) == "Color3" then activity.accent else COLORS.text
	promptLabel.Text = activity.prompt or ""
	local hasRich = renderRichContent(activity.richContent)
	panel.Size = UDim2.new(0.84, 0, 0, if hasRich then 410 else 322)
	for index, button in buttons do
		button.Position = UDim2.new(0, 16, 0, (if hasRich then 208 else 130) + ((index - 1) * 52))
	end
	resultLabel.Position = UDim2.fromOffset(16, if hasRich then 364 else 286)
	resultLabel.Text = if activity.scaffold == true
		then "Support step: solve this smaller question first."
		elseif activity.scaffoldReturn == true
		then "Use what you just practiced on the original question."
		else "Choose the best answer."
	resultLabel.TextColor3 = if activity.scaffold == true or activity.scaffoldReturn == true
		then COLORS.warning
		else COLORS.muted
	for index, button in buttons do
		button.Text = tostring(activity.choices[index] or "")
		button.Visible = activity.choices[index] ~= nil
		button.Active = true
		button.BackgroundColor3 = COLORS.panelSoft
	end
	showPanel()
end

local function friendlyFailure(response)
	if type(response) ~= "table" then
		return "That connection hiccupped. Try this station again."
	end
	if response.code == "rate_limited" then
		return "One tap at a time — try again."
	elseif response.code == "profile_unavailable" then
		return "Your progress is still loading. Try again in a moment."
	elseif response.code == "activity_not_open" then
		return "Walk back to the station and tap Start Activity."
	elseif response.code == "invalid_request" then
		return "This activity reset. Reopen the station to continue."
	end
	return "That connection hiccupped. Try this station again."
end

for index, button in buttons do
	button.Activated:Connect(function()
		if submitting or currentActivity == nil then
			return
		end
		submitting = true
		for _, other in buttons do
			other.Active = false
			other.BackgroundTransparency = 0.15
		end

		local ok, response = pcall(function()
			return submitAnswer:InvokeServer({
				activityId = currentActivity.id,
				choice = currentActivity.choices[index],
			})
		end)

		if not ok or type(response) ~= "table" or response.ok ~= true then
			resultLabel.Text = friendlyFailure(response)
			resultLabel.TextColor3 = COLORS.danger
			shakePanel()
		elseif response.correct == true then
			sendPlaytestTelemetry("success_feedback_seen")
			if response.scaffoldCleared == true and type(response.activity) == "table" then
				showToast(response.message or "Good work. Now try the original question.", true)
				showActivity(response.activity)
				resultLabel.Text = response.message or "Use that idea on the original question."
				resultLabel.TextColor3 = COLORS.success
				successPulse()
			else
				local scoreText = if type(response.rubricScore) == "number" and type(response.rubricMaxPoints) == "number"
					then string.format("  Reasoning: %d/%d.", response.rubricScore, response.rubricMaxPoints)
					else ""
				resultLabel.Text = (response.explanation or response.message or "Station complete!") .. scoreText
				resultLabel.TextColor3 = COLORS.success
				successPulse()

				local toastMessage = response.message or "Station powered!"
				if type(response.rewardSummary) == "string" and response.rewardSummary ~= "" then
					toastMessage = toastMessage .. "  " .. response.rewardSummary
				end
				if response.cosmeticUnlocked == true then
					toastMessage = "Spark Trail unlocked!  " .. toastMessage
				end
				showToast(toastMessage, true)

				if type(response.status) == "table" then
					applyStatus(response.status)
				else
					refreshStatus(1)
				end
				task.delay(1.6, hidePanel)
			end
		else
			sendPlaytestTelemetry("wrong_feedback_seen")
			local feedback = response.message or "Try another answer!"
			if type(response.rubricScore) == "number" and type(response.rubricMaxPoints) == "number" then
				feedback = feedback .. string.format("  Reasoning: %d/%d.", response.rubricScore, response.rubricMaxPoints)
			end
			if type(response.hint) == "string" and response.hint ~= "" then
				feedback = feedback .. "  Hint: " .. response.hint
			end
			if type(response.activity) == "table" then
				showToast(response.message or "Let’s break this into a smaller step.", false)
				showActivity(response.activity)
			else
				if type(response.scaffold) == "string" and response.scaffold ~= "" then
					feedback = response.scaffold
				end
				resultLabel.Text = feedback
				resultLabel.TextColor3 = COLORS.warning
				shakePanel()
			end
		end

		submitting = false
		for _, other in buttons do
			other.Active = true
			other.BackgroundTransparency = 0
		end
	end)
end

closeButton.Activated:Connect(hidePanel)

onboardingButton.Activated:Connect(function()
	onboardingDismissedLocally = true
	onboarding.Visible = false
	sendPlaytestTelemetry("onboarding_dismissed")
	dismissOnboarding:FireServer()
	showToast("Explore the neighborhood to find your first activity.", true)
end)

activityOpened.OnClientEvent:Connect(function(payload)
	if type(payload) ~= "table" then
		return
	end
	if payload.status == "ready" and type(payload.activity) == "table" then
		showActivity(payload.activity)
	else
		currentActivity = nil
		showPanel()
		activityTitle.Text = "StarBlox"
		promptLabel.Text = payload.message or "Try again in a moment."
		resultLabel.Text = "You can close this card and reopen the station."
		resultLabel.TextColor3 = COLORS.warning
		for _, button in buttons do
			button.Visible = false
		end
		task.delay(1.6, function()
			if currentActivity == nil then
				hidePanel()
			end
			for _, button in buttons do
				button.Visible = true
			end
		end)
	end
end)

task.defer(function()
	task.wait(0.2)
	local camera = workspace.CurrentCamera
	local viewport = if camera ~= nil then camera.ViewportSize else Vector2.zero
	sendPlaytestTelemetry("client_ready", {
		touchEnabled = UserInputService.TouchEnabled,
		keyboardEnabled = UserInputService.KeyboardEnabled,
		gamepadEnabled = UserInputService.GamepadEnabled,
		viewportX = viewport.X,
		viewportY = viewport.Y,
	})

	task.wait(0.25)
	refreshStatus(1)
end)
