--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxVerticalSlice")
local questOpened = remotes:WaitForChild("QuestOpened") :: RemoteEvent
local submitAnswer = remotes:WaitForChild("SubmitAnswer") :: RemoteFunction

local gui = Instance.new("ScreenGui")
gui.Name = "StarBloxVerticalSliceUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.Parent = playerGui

local hud = Instance.new("Frame")
hud.Name = "HUD"
hud.Size = UDim2.fromOffset(300, 86)
hud.Position = UDim2.fromOffset(18, 18)
hud.BackgroundTransparency = 0.12
hud.Parent = gui

local title = Instance.new("TextLabel")
title.Name = "Title"
title.BackgroundTransparency = 1
title.Size = UDim2.new(1, -20, 0, 36)
title.Position = UDim2.fromOffset(10, 6)
title.Text = "StarBlox • Brightside Plaza"
title.TextScaled = true
title.TextWrapped = true
title.Parent = hud

local economy = Instance.new("TextLabel")
economy.Name = "Economy"
economy.BackgroundTransparency = 1
economy.Size = UDim2.new(1, -20, 0, 32)
economy.Position = UDim2.fromOffset(10, 46)
economy.TextScaled = true
economy.Parent = hud

local panel = Instance.new("Frame")
panel.Name = "QuestPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.5)
panel.Size = UDim2.new(0.9, 0, 0, 390)
panel.SizeConstraint = Enum.SizeConstraint.RelativeXX
panel.BackgroundTransparency = 0.05
panel.Visible = false
panel.Parent = gui

local sizeConstraint = Instance.new("UISizeConstraint")
sizeConstraint.MaxSize = Vector2.new(620, 520)
sizeConstraint.MinSize = Vector2.new(300, 360)
sizeConstraint.Parent = panel

local questTitle = Instance.new("TextLabel")
questTitle.Name = "QuestTitle"
questTitle.BackgroundTransparency = 1
questTitle.Position = UDim2.fromOffset(24, 18)
questTitle.Size = UDim2.new(1, -48, 0, 48)
questTitle.TextScaled = true
questTitle.TextWrapped = true
questTitle.Parent = panel

local promptLabel = Instance.new("TextLabel")
promptLabel.Name = "Prompt"
promptLabel.BackgroundTransparency = 1
promptLabel.Position = UDim2.fromOffset(24, 78)
promptLabel.Size = UDim2.new(1, -48, 0, 90)
promptLabel.TextScaled = true
promptLabel.TextWrapped = true
promptLabel.Parent = panel

local resultLabel = Instance.new("TextLabel")
resultLabel.Name = "Result"
resultLabel.BackgroundTransparency = 1
resultLabel.Position = UDim2.fromOffset(24, 318)
resultLabel.Size = UDim2.new(1, -48, 0, 52)
resultLabel.TextScaled = true
resultLabel.TextWrapped = true
resultLabel.Parent = panel

local buttons = {}
for index = 1, 3 do
	local button = Instance.new("TextButton")
	button.Name = "Choice" .. tostring(index)
	button.Position = UDim2.new(0, 24, 0, 174 + ((index - 1) * 46))
	button.Size = UDim2.new(1, -48, 0, 38)
	button.TextScaled = true
	button.Parent = panel
	buttons[index] = button
end

local currentQuestion = nil
local submitting = false

local function updateEconomy()
	economy.Text = string.format(
		"Coins %d   •   XP %d   •   Stars %d",
		tonumber(player:GetAttribute("StarBloxCoins")) or 0,
		tonumber(player:GetAttribute("StarBloxXP")) or 0,
		tonumber(player:GetAttribute("StarBloxStars")) or 0
	)
end

for _, attribute in {"StarBloxCoins", "StarBloxXP", "StarBloxStars"} do
	player:GetAttributeChangedSignal(attribute):Connect(updateEconomy)
end
updateEconomy()

local function showQuestion(question)
	currentQuestion = question
	questTitle.Text = question.title or "StarBlox Quest"
	promptLabel.Text = question.prompt or ""
	resultLabel.Text = "Choose the best answer."
	for index, button in buttons do
		button.Text = tostring(question.choices[index] or "")
		button.Visible = question.choices[index] ~= nil
		button.Active = true
	end
	panel.Visible = true
end

for index, button in buttons do
	button.Activated:Connect(function()
		if submitting or currentQuestion == nil then
			return
		end
		submitting = true
		for _, other in buttons do
			other.Active = false
		end

		local ok, response = pcall(function()
			return submitAnswer:InvokeServer({
				questionId = currentQuestion.id,
				choice = currentQuestion.choices[index],
			})
		end)

		if not ok or type(response) ~= "table" or response.ok ~= true then
			resultLabel.Text = "That connection hiccupped. Try the portal again."
		elseif response.correct == true then
			resultLabel.Text = response.message or "Quest complete!"
			task.delay(1.4, function()
				panel.Visible = false
				currentQuestion = nil
			end)
		else
			resultLabel.Text = response.message or "Try again!"
		end

		submitting = false
		for _, other in buttons do
			other.Active = true
		end
	end)
end

questOpened.OnClientEvent:Connect(function(payload)
	if type(payload) ~= "table" then
		return
	end
	if payload.status == "ready" and type(payload.question) == "table" then
		showQuestion(payload.question)
	else
		currentQuestion = nil
		panel.Visible = true
		questTitle.Text = "StarBlox"
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
