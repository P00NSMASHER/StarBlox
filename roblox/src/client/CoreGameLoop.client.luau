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
	navy = Color3.fromRGB(30, 36, 56),
	panel = Color3.fromRGB(42, 49, 74),
	panelSoft = Color3.fromRGB(55, 64, 94),
	text = Color3.fromRGB(248, 250, 255),
	muted = Color3.fromRGB(194, 202, 225),
	accent = Color3.fromRGB(109, 104, 255),
	success = Color3.fromRGB(66, 204, 156),
	warning = Color3.fromRGB(255, 184, 77),
	danger = Color3.fromRGB(255, 104, 116),
}

local function round(guiObject: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = guiObject
end

local function outline(guiObject: GuiObject, transparency: number?)
	local stroke = Instance.new("UIStroke")
	stroke.Thickness = 2
	stroke.Transparency = transparency or 0.35
	stroke.Color = Color3.fromRGB(255, 255, 255)
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
hud.Size = UDim2.fromOffset(286, 58)
hud.Position = UDim2.new(1, -12, 0, 12)
hud.BackgroundColor3 = COLORS.navy
hud.BackgroundTransparency = 0.16
hud.Parent = gui
round(hud, 14)
outline(hud, 0.68)

local hudSize = Instance.new("UISizeConstraint")
hudSize.MinSize = Vector2.new(260, 58)
hudSize.MaxSize = Vector2.new(300, 58)
hudSize.Parent = hud

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(12, 6)
title.Size = UDim2.fromOffset(72, 22)
title.Font = Enum.Font.GothamBold
title.Text = "StarBlox"
title.TextColor3 = COLORS.text
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = hud
constrainText(title, 13, 17)

local economy = Instance.new("TextLabel")
economy.Name = "Economy"
economy.BackgroundTransparency = 1
economy.Position = UDim2.fromOffset(78, 6)
economy.Size = UDim2.new(1, -90, 0, 22)
economy.Font = Enum.Font.GothamMedium
economy.TextColor3 = COLORS.text
economy.TextScaled = true
economy.TextXAlignment = Enum.TextXAlignment.Right
economy.Parent = hud
constrainText(economy, 12, 15)

local progress = Instance.new("TextLabel")
progress.Name = "Progress"
progress.BackgroundTransparency = 1
progress.Position = UDim2.fromOffset(12, 31)
progress.Size = UDim2.new(1, -24, 0, 19)
progress.Font = Enum.Font.GothamMedium
progress.TextColor3 = COLORS.muted
progress.TextScaled = true
progress.TextXAlignment = Enum.TextXAlignment.Left
progress.Parent = hud
constrainText(progress, 11, 14)

local nextHint = Instance.new("TextLabel")
nextHint.Name = "NextHint"
nextHint.AnchorPoint = Vector2.new(1, 0)
nextHint.BackgroundColor3 = COLORS.navy
nextHint.BackgroundTransparency = 0.16
nextHint.Position = UDim2.new(1, -12, 0, 76)
nextHint.Size = UDim2.fromOffset(220, 28)
nextHint.Font = Enum.Font.GothamBold
nextHint.TextColor3 = COLORS.warning
nextHint.TextScaled = true
nextHint.TextXAlignment = Enum.TextXAlignment.Center
nextHint.Text = "Loading your next station…"
nextHint.Parent = gui
round(nextHint, 12)
outline(nextHint, 0.72)
constrainText(nextHint, 10, 13)

local toast = Instance.new("TextLabel")
toast.Name = "Toast"
toast.AnchorPoint = Vector2.new(0.5, 0)
toast.Position = UDim2.new(0.5, 0, 0, 120)
toast.Size = UDim2.new(0.9, 0, 0, 50)
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
round(toast, 14)
outline(toast, 0.55)
constrainText(toast, 13, 18)

local toastSize = Instance.new("UISizeConstraint")
toastSize.MaxSize = Vector2.new(560, 50)
toastSize.MinSize = Vector2.new(280, 50)
toastSize.Parent = toast

local panel = Instance.new("Frame")
panel.Name = "ActivityPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.54)
panel.Size = UDim2.new(0.84, 0, 0, 322)
panel.BackgroundColor3 = COLORS.panel
panel.BackgroundTransparency = 0.04
panel.Visible = false
panel.ZIndex = 30
panel.Parent = gui
round(panel, 18)
outline(panel, 0.25)

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MaxSize = Vector2.new(520, 322)
panelConstraint.MinSize = Vector2.new(300, 300)
panelConstraint.Parent = panel

local closeButton = Instance.new("TextButton")
closeButton.Name = "CloseButton"
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, -10, 0, 10)
closeButton.Size = UDim2.fromOffset(44, 44)
closeButton.BackgroundColor3 = COLORS.panelSoft
closeButton.Text = "×"
closeButton.TextColor3 = COLORS.text
closeButton.TextScaled = true
closeButton.Font = Enum.Font.GothamBold
closeButton.AutoButtonColor = true
closeButton.ZIndex = 32
closeButton.Parent = panel
round(closeButton, 12)
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
	round(button, 12)
	outline(button, 0.65)
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
round(onboarding, 18)
outline(onboarding, 0.22)

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
round(onboardingButton, 12)
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
waypointLabel.BackgroundTransparency = 0.38
waypointLabel.TextColor3 = COLORS.text
waypointLabel.TextScaled = true
waypointLabel.Font = Enum.Font.GothamBold
waypointLabel.Parent = waypoint
round(waypointLabel, 8)
outline(waypointLabel, 0.86)
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

local function updateHud()
	economy.Text = string.format(
		"Coins %d   •   Stars %d",
		readNumber("StarBloxCoins"),
		readNumber("StarBloxStars")
	)
	local loops = readNumber("StarBloxLoopRuns")
	local runNumber = math.max(1, readNumber("StarBloxRunNumber"))
	local trail = player:GetAttribute("StarBloxSparkTrailUnlocked") == true and " • Spark Trail ✓" or ""
	progress.Text = string.format("Run %d • %d loops%s", runNumber, loops, trail)
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

local function applyStatus(status)
	if type(status) ~= "table" or status.ok ~= true then
		return false
	end

	local progressCount = tonumber(status.progress) or 0
	local activityCount = tonumber(status.activityCount) or 3
	local loops = tonumber(status.loopRuns) or 0
	updateWaypoint(status.recommendedActivityId, status.recommendedStationName)
	progress.Text = string.format(
		"Run %d • %d/%d • %d loops%s",
		tonumber(status.runNumber) or 1,
		progressCount,
		activityCount,
		loops,
		status.cosmeticUnlocked == true and " • Spark Trail ✓" or ""
	)

	if status.rewardCapReached == true then
		nextHint.Text = "✓ Daily rewards complete"
		nextHint.TextColor3 = COLORS.success
	elseif type(status.recommendedStationName) == "string" then
		nextHint.Text = "→ " .. status.recommendedStationName
		nextHint.TextColor3 = COLORS.warning
	else
		nextHint.Text = "✓ Run complete — new run ready"
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
	})
	activityTitle.Text = activity.title or activity.stationName or "StarBlox Activity"
	promptLabel.Text = activity.prompt or ""
	resultLabel.Text = "Choose the best answer."
	resultLabel.TextColor3 = COLORS.muted
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
			resultLabel.Text = response.message or "Station complete!"
			resultLabel.TextColor3 = COLORS.success
			showToast(response.message or "Station powered!", true)
			if type(response.status) == "table" then
				applyStatus(response.status)
			else
				refreshStatus(1)
			end
			task.delay(1.2, hidePanel)
		else
			sendPlaytestTelemetry("wrong_feedback_seen")
			resultLabel.Text = response.message or "Try another answer!"
			resultLabel.TextColor3 = COLORS.warning
			shakePanel()
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
