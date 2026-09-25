--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxCoreLoop")
local activityOpened = remotes:WaitForChild("ActivityOpened") :: RemoteEvent
local submitAnswer = remotes:WaitForChild("SubmitAnswer") :: RemoteFunction
local requestStatus = remotes:WaitForChild("RequestStatus") :: RemoteFunction

local gui = Instance.new("ScreenGui")
gui.Name = "StarBloxCoreLoopUI"
gui.ResetOnSpawn = false
gui.Parent = playerGui

local hud = Instance.new("Frame")
hud.Name = "HUD"
hud.Size = UDim2.fromOffset(350, 112)
hud.Position = UDim2.fromOffset(18, 18)
hud.BackgroundTransparency = 0.1
hud.Parent = gui

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(10, 6)
title.Size = UDim2.new(1, -20, 0, 30)
title.Text = "StarBlox • Brightside Plaza"
title.TextScaled = true
title.Parent = hud

local economy = Instance.new("TextLabel")
economy.BackgroundTransparency = 1
economy.Position = UDim2.fromOffset(10, 40)
economy.Size = UDim2.new(1, -20, 0, 28)
economy.TextScaled = true
economy.Parent = hud

local progress = Instance.new("TextLabel")
progress.BackgroundTransparency = 1
progress.Position = UDim2.fromOffset(10, 72)
progress.Size = UDim2.new(1, -20, 0, 28)
progress.TextScaled = true
progress.Parent = hud

local panel = Instance.new("Frame")
panel.Name = "ActivityPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.Size = UDim2.new(0.9, 0, 0, 420)
panel.BackgroundTransparency = 0.05
panel.Visible = false
panel.Parent = gui

local constraint = Instance.new("UISizeConstraint")
constraint.MaxSize = Vector2.new(640, 520)
constraint.MinSize = Vector2.new(300, 380)
constraint.Parent = panel

local activityTitle = Instance.new("TextLabel")
activityTitle.BackgroundTransparency = 1
activityTitle.Position = UDim2.fromOffset(24, 18)
activityTitle.Size = UDim2.new(1, -48, 0, 48)
activityTitle.TextScaled = true
activityTitle.TextWrapped = true
activityTitle.Parent = panel

local promptLabel = Instance.new("TextLabel")
promptLabel.BackgroundTransparency = 1
promptLabel.Position = UDim2.fromOffset(24, 78)
promptLabel.Size = UDim2.new(1, -48, 0, 104)
promptLabel.TextScaled = true
promptLabel.TextWrapped = true
promptLabel.Parent = panel

local resultLabel = Instance.new("TextLabel")
resultLabel.BackgroundTransparency = 1
resultLabel.Position = UDim2.fromOffset(24, 340)
resultLabel.Size = UDim2.new(1, -48, 0, 56)
resultLabel.TextScaled = true
resultLabel.TextWrapped = true
resultLabel.Parent = panel

local buttons = {}
for index = 1, 3 do
	local button = Instance.new("TextButton")
	button.Name = "Choice" .. tostring(index)
	button.Position = UDim2.new(0, 24, 0, 190 + ((index - 1) * 46))
	button.Size = UDim2.new(1, -48, 0, 38)
	button.TextScaled = true
	button.Parent = panel
	buttons[index] = button
end

local currentActivity = nil
local submitting = false

local function readNumber(name: string): number
	return tonumber(player:GetAttribute(name)) or 0
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

local function refreshStatus()
	local ok, status = pcall(function()
		return requestStatus:InvokeServer()
	end)
	if ok and type(status) == "table" and status.ok == true then
		progress.Text = string.format(
			"Run %d • %d/%d stations • %d loops%s",
			tonumber(status.runNumber) or 1,
			tonumber(status.progress) or 0,
			tonumber(status.activityCount) or 3,
			tonumber(status.loopRuns) or 0,
			status.cosmeticUnlocked == true and " • Spark Trail ✓" or ""
		)
	end
end

local function showActivity(activity)
	currentActivity = activity
	activityTitle.Text = activity.title or activity.stationName or "StarBlox Activity"
	promptLabel.Text = activity.prompt or ""
	resultLabel.Text = "Choose the best answer."
	for index, button in buttons do
		button.Text = tostring(activity.choices[index] or "")
		button.Visible = activity.choices[index] ~= nil
		button.Active = true
	end
	panel.Visible = true
end

for index, button in buttons do
	button.Activated:Connect(function()
		if submitting or currentActivity == nil then
			return
		end
		submitting = true
		for _, other in buttons do
			other.Active = false
		end

		local ok, response = pcall(function()
			return submitAnswer:InvokeServer({
				activityId = currentActivity.id,
				choice = currentActivity.choices[index],
			})
		end)

		if not ok or type(response) ~= "table" or response.ok ~= true then
			resultLabel.Text = "That connection hiccupped. Try this station again."
		elseif response.correct == true then
			resultLabel.Text = response.message or "Station complete!"
			refreshStatus()
			task.delay(1.3, function()
				panel.Visible = false
				currentActivity = nil
			end)
		else
			resultLabel.Text = response.message or "Try another answer!"
		end

		submitting = false
		for _, other in buttons do
			other.Active = true
		end
	end)
end

activityOpened.OnClientEvent:Connect(function(payload)
	if type(payload) ~= "table" then
		return
	end
	if payload.status == "ready" and type(payload.activity) == "table" then
		showActivity(payload.activity)
	else
		currentActivity = nil
		panel.Visible = true
		activityTitle.Text = "StarBlox"
		promptLabel.Text = payload.message or "Try again in a moment."
		resultLabel.Text = ""
		for _, button in buttons do
			button.Visible = false
		end
		task.delay(1.5, function()
			panel.Visible = false
			for _, button in buttons do
				button.Visible = true
			end
		end)
	end
end)

task.defer(refreshStatus)
