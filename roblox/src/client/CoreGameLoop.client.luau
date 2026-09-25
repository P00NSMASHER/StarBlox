--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxCoreLoop")
local activityOpened = remotes:WaitForChild("ActivityOpened") :: RemoteEvent
local submitAnswer = remotes:WaitForChild("SubmitAnswer") :: RemoteFunction
local requestStatus = remotes:WaitForChild("RequestStatus") :: RemoteFunction
local dismissOnboarding = remotes:WaitForChild("DismissOnboarding") :: RemoteEvent

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
hud.Size = UDim2.new(1, -24, 0, 132)
hud.Position = UDim2.fromOffset(12, 12)
hud.BackgroundColor3 = COLORS.navy
hud.BackgroundTransparency = 0.06
hud.Parent = gui
round(hud, 18)
outline(hud, 0.45)

local hudSize = Instance.new("UISizeConstraint")
hudSize.MinSize = Vector2.new(300, 132)
hudSize.MaxSize = Vector2.new(430, 132)
hudSize.Parent = hud

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(14, 8)
title.Size = UDim2.new(1, -28, 0, 30)
title.Font = Enum.Font.GothamBold
title.Text = "StarBlox • Brightside Plaza"
title.TextColor3 = COLORS.text
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.Parent = hud
constrainText(title, 15, 22)

local economy = Instance.new("TextLabel")
economy.Name = "Economy"
economy.BackgroundTransparency = 1
economy.Position = UDim2.fromOffset(14, 42)
economy.Size = UDim2.new(1, -28, 0, 26)
economy.Font = Enum.Font.GothamMedium
economy.TextColor3 = COLORS.text
economy.TextScaled = true
economy.TextXAlignment = Enum.TextXAlignment.Left
economy.Parent = hud
constrainText(economy, 13, 18)

local progress = Instance.new("TextLabel")
progress.Name = "Progress"
progress.BackgroundTransparency = 1
progress.Position = UDim2.fromOffset(14, 70)
progress.Size = UDim2.new(1, -28, 0, 24)
progress.Font = Enum.Font.GothamMedium
progress.TextColor3 = COLORS.muted
progress.TextScaled = true
progress.TextXAlignment = Enum.TextXAlignment.Left
progress.Parent = hud
constrainText(progress, 12, 17)

local nextHint = Instance.new("TextLabel")
nextHint.Name = "NextHint"
nextHint.BackgroundTransparency = 1
nextHint.Position = UDim2.fromOffset(14, 98)
nextHint.Size = UDim2.new(1, -28, 0, 24)
nextHint.Font = Enum.Font.GothamBold
nextHint.TextColor3 = COLORS.warning
nextHint.TextScaled = true
nextHint.TextXAlignment = Enum.TextXAlignment.Left
nextHint.Text = "Loading your next station…"
nextHint.Parent = hud
constrainText(nextHint, 12, 17)

local toast = Instance.new("TextLabel")
toast.Name = "Toast"
toast.AnchorPoint = Vector2.new(0.5, 0)
toast.Position = UDim2.new(0.5, 0, 0, 154)
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
panel.Size = UDim2.new(0.92, 0, 0, 442)
panel.BackgroundColor3 = COLORS.panel
panel.BackgroundTransparency = 0.04
panel.Visible = false
panel.ZIndex = 30
panel.Parent = gui
round(panel, 20)
outline(panel, 0.25)

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MaxSize = Vector2.new(640, 500)
panelConstraint.MinSize = Vector2.new(300, 400)
panelConstraint.Parent = panel

local closeButton = Instance.new("TextButton")
closeButton.Name = "CloseButton"
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, -12, 0, 12)
closeButton.Size = UDim2.fromOffset(48, 48)
closeButton.BackgroundColor3 = COLORS.panelSoft
closeButton.Text = "×"
closeButton.TextColor3 = COLORS.text
closeButton.TextScaled = true
closeButton.Font = Enum.Font.GothamBold
closeButton.AutoButtonColor = true
closeButton.ZIndex = 32
closeButton.Parent = panel
round(closeButton, 14)
constrainText(closeButton, 22, 30)

local activityTitle = Instance.new("TextLabel")
activityTitle.Name = "ActivityTitle"
activityTitle.BackgroundTransparency = 1
activityTitle.Position = UDim2.fromOffset(22, 18)
activityTitle.Size = UDim2.new(1, -92, 0, 52)
activityTitle.TextColor3 = COLORS.text
activityTitle.Font = Enum.Font.GothamBold
activityTitle.TextScaled = true
activityTitle.TextWrapped = true
activityTitle.TextXAlignment = Enum.TextXAlignment.Left
activityTitle.ZIndex = 31
activityTitle.Parent = panel
constrainText(activityTitle, 16, 24)

local promptLabel = Instance.new("TextLabel")
promptLabel.Name = "Prompt"
promptLabel.BackgroundTransparency = 1
promptLabel.Position = UDim2.fromOffset(22, 82)
promptLabel.Size = UDim2.new(1, -44, 0, 104)
promptLabel.TextColor3 = COLORS.text
promptLabel.Font = Enum.Font.GothamMedium
promptLabel.TextScaled = true
promptLabel.TextWrapped = true
promptLabel.TextXAlignment = Enum.TextXAlignment.Left
promptLabel.ZIndex = 31
promptLabel.Parent = panel
constrainText(promptLabel, 15, 22)

local resultLabel = Instance.new("TextLabel")
resultLabel.Name = "Result"
resultLabel.BackgroundTransparency = 1
resultLabel.Position = UDim2.fromOffset(22, 366)
resultLabel.Size = UDim2.new(1, -44, 0, 52)
resultLabel.TextColor3 = COLORS.muted
resultLabel.Font = Enum.Font.GothamBold
resultLabel.TextScaled = true
resultLabel.TextWrapped = true
resultLabel.ZIndex = 31
resultLabel.Parent = panel
constrainText(resultLabel, 13, 19)

local buttons = {}
for index = 1, 3 do
	local button = Instance.new("TextButton")
	button.Name = "Choice" .. tostring(index)
	button.Position = UDim2.new(0, 22, 0, 198 + ((index - 1) * 56))
	button.Size = UDim2.new(1, -44, 0, 50)
	button.BackgroundColor3 = COLORS.panelSoft
	button.TextColor3 = COLORS.text
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.TextWrapped = true
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 31
	button.Parent = panel
	round(button, 14)
	outline(button, 0.65)
	constrainText(button, 14, 20)
	buttons[index] = button
end

local onboarding = Instance.new("Frame")
onboarding.Name = "Onboarding"
onboarding.AnchorPoint = Vector2.new(0.5, 0.5)
onboarding.Position = UDim2.fromScale(0.5, 0.52)
onboarding.Size = UDim2.new(0.9, 0, 0, 350)
onboarding.BackgroundColor3 = COLORS.navy
onboarding.BackgroundTransparency = 0.03
onboarding.Visible = false
onboarding.ZIndex = 50
onboarding.Parent = gui
round(onboarding, 22)
outline(onboarding, 0.22)

local onboardingConstraint = Instance.new("UISizeConstraint")
onboardingConstraint.MaxSize = Vector2.new(580, 390)
onboardingConstraint.MinSize = Vector2.new(300, 330)
onboardingConstraint.Parent = onboarding

local onboardingTitle = Instance.new("TextLabel")
onboardingTitle.BackgroundTransparency = 1
onboardingTitle.Position = UDim2.fromOffset(24, 24)
onboardingTitle.Size = UDim2.new(1, -48, 0, 50)
onboardingTitle.Font = Enum.Font.GothamBold
onboardingTitle.Text = "Welcome to Brightside!"
onboardingTitle.TextColor3 = COLORS.text
onboardingTitle.TextScaled = true
onboardingTitle.TextWrapped = true
onboardingTitle.ZIndex = 51
onboardingTitle.Parent = onboarding
constrainText(onboardingTitle, 18, 26)

local onboardingBody = Instance.new("TextLabel")
onboardingBody.BackgroundTransparency = 1
onboardingBody.Position = UDim2.fromOffset(24, 88)
onboardingBody.Size = UDim2.new(1, -48, 0, 116)
onboardingBody.Font = Enum.Font.GothamMedium
onboardingBody.Text = "Explore all three glowing stations. Finish Word Portal, Spelling Forge, and Culture Lab to complete a Brightside run."
onboardingBody.TextColor3 = COLORS.text
onboardingBody.TextScaled = true
onboardingBody.TextWrapped = true
onboardingBody.ZIndex = 51
onboardingBody.Parent = onboarding
constrainText(onboardingBody, 15, 21)

local onboardingHint = Instance.new("TextLabel")
onboardingHint.BackgroundTransparency = 1
onboardingHint.Position = UDim2.fromOffset(24, 210)
onboardingHint.Size = UDim2.new(1, -48, 0, 54)
onboardingHint.Font = Enum.Font.GothamMedium
onboardingHint.Text = "Follow the signs, walk up to a station, then tap Start Activity."
onboardingHint.TextColor3 = COLORS.warning
onboardingHint.TextScaled = true
onboardingHint.TextWrapped = true
onboardingHint.ZIndex = 51
onboardingHint.Parent = onboarding
constrainText(onboardingHint, 13, 18)

local onboardingButton = Instance.new("TextButton")
onboardingButton.Name = "OnboardingContinue"
onboardingButton.AnchorPoint = Vector2.new(0.5, 1)
onboardingButton.Position = UDim2.new(0.5, 0, 1, -22)
onboardingButton.Size = UDim2.new(1, -48, 0, 54)
onboardingButton.BackgroundColor3 = COLORS.accent
onboardingButton.Text = "Got it — show me the plaza"
onboardingButton.TextColor3 = COLORS.text
onboardingButton.Font = Enum.Font.GothamBold
onboardingButton.TextScaled = true
onboardingButton.AutoButtonColor = true
onboardingButton.Selectable = true
onboardingButton.ZIndex = 51
onboardingButton.Parent = onboarding
round(onboardingButton, 14)
constrainText(onboardingButton, 15, 20)

local currentActivity = nil
local submitting = false
local statusRequestInFlight = false
local onboardingDismissedLocally = false

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
		"Coins %d   •   XP %d   •   Stars %d",
		readNumber("StarBloxCoins"),
		readNumber("StarBloxXP"),
		readNumber("StarBloxStars")
	)
	local loops = readNumber("StarBloxLoopRuns")
	local runNumber = math.max(1, readNumber("StarBloxRunNumber"))
	local trail = player:GetAttribute("StarBloxSparkTrailUnlocked") == true and " • Spark Trail ✓" or ""
	progress.Text = string.format("Brightside loops %d • Run %d%s", loops, runNumber, trail)
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
	progress.Text = string.format(
		"Run %d • %d/%d stations • %d loops%s",
		tonumber(status.runNumber) or 1,
		progressCount,
		activityCount,
		loops,
		status.cosmeticUnlocked == true and " • Spark Trail ✓" or ""
	)

	if status.rewardCapReached == true then
		nextHint.Text = "Daily rewards complete — keep playing for practice!"
		nextHint.TextColor3 = COLORS.success
	elseif type(status.recommendedStationName) == "string" then
		nextHint.Text = "Next: " .. status.recommendedStationName .. " • follow the glowing signs"
		nextHint.TextColor3 = COLORS.warning
	else
		nextHint.Text = "Brightside run complete — new run ready!"
		nextHint.TextColor3 = COLORS.success
	end

	if status.onboardingSeen ~= true and not onboardingDismissedLocally then
		onboarding.Visible = true
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

	nextHint.Text = "Reconnecting to Brightside…"
	nextHint.TextColor3 = COLORS.warning
	if tryNumber < 3 then
		task.delay(0.45 * (2 ^ (tryNumber - 1)), function()
			refreshStatus(tryNumber + 1)
		end)
	else
		nextHint.Text = "Couldn’t refresh progress. You can still walk to a station and try again."
		nextHint.TextColor3 = COLORS.danger
	end
end

local function showActivity(activity)
	currentActivity = activity
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
	dismissOnboarding:FireServer()
	showToast("Follow the signs to your first station.", true)
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
	task.wait(0.45)
	refreshStatus(1)
end)
