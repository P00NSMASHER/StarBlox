--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local settingsRemotes = ReplicatedStorage:WaitForChild("StarBloxSettings")
local getSettings = settingsRemotes:WaitForChild("GetState") :: RemoteFunction
local setSetting = settingsRemotes:WaitForChild("SetSetting") :: RemoteFunction

local UI = {
	white = Color3.fromRGB(239, 239, 239),
	tile = Color3.fromRGB(215, 215, 215),
	text = Color3.fromRGB(38, 38, 38),
	muted = Color3.fromRGB(93, 93, 93),
	red = Color3.fromRGB(205, 36, 36),
	green = Color3.fromRGB(59, 179, 78),
	border = Color3.fromRGB(105, 105, 105),
}

local function round(object: GuiObject, radius: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = object
end

local function stroke(object: GuiObject, transparency: number?)
	local s = Instance.new("UIStroke")
	s.Color = UI.border
	s.Thickness = 1
	s.Transparency = transparency or 0.4
	s.Parent = object
end

local function constrain(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local c = Instance.new("UITextSizeConstraint")
	c.MinTextSize = minSize
	c.MaxTextSize = maxSize
	c.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenSettingsUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 120
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local gear = Instance.new("TextButton")
gear.Name = "SettingsGear"
gear.AnchorPoint = Vector2.new(0, 1)
gear.Position = UDim2.new(0, 92, 1, -12)
gear.Size = UDim2.fromOffset(42, 42)
gear.BackgroundTransparency = 1
gear.Text = "⚙"
gear.TextColor3 = UI.text
gear.Font = Enum.Font.GothamBold
gear.TextScaled = true
gear.ZIndex = 125
gear.Parent = gui
constrain(gear, 24, 31)

local panel = Instance.new("Frame")
panel.Name = "SettingsPanel"
panel.AnchorPoint = Vector2.new(0, 1)
panel.Position = UDim2.new(0, 82, 1, -60)
panel.Size = UDim2.fromOffset(316, 330)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 0.06
panel.Visible = false
panel.ZIndex = 121
panel.Parent = gui
round(panel, 9)
stroke(panel, 0.25)

local title = Instance.new("TextLabel")
title.Name = "Title"
title.Position = UDim2.fromOffset(8, 6)
title.Size = UDim2.new(1, -66, 0, 38)
title.BackgroundTransparency = 1
title.Text = "Settings"
title.TextColor3 = UI.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 122
title.Parent = panel
constrain(title, 18, 23)

local close = Instance.new("TextButton")
close.Name = "Close"
close.AnchorPoint = Vector2.new(1, 0)
close.Position = UDim2.new(1, -5, 0, 5)
close.Size = UDim2.fromOffset(48, 44)
close.BackgroundColor3 = UI.red
close.Text = "X"
close.TextColor3 = Color3.new(1, 1, 1)
close.Font = Enum.Font.GothamBold
close.TextScaled = true
close.ZIndex = 124
close.Parent = panel
round(close, 7)
stroke(close, 0.2)
constrain(close, 20, 27)

local list = Instance.new("ScrollingFrame")
list.Name = "Options"
list.Position = UDim2.fromOffset(8, 51)
list.Size = UDim2.new(1, -16, 1, -59)
list.BackgroundTransparency = 1
list.BorderSizePixel = 0
list.ScrollBarThickness = 3
list.AutomaticCanvasSize = Enum.AutomaticSize.Y
list.CanvasSize = UDim2.fromOffset(0, 0)
list.ZIndex = 122
list.Parent = panel

local layout = Instance.new("UIListLayout")
layout.Padding = UDim.new(0, 6)
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Parent = list

local settings = nil
local hiddenGuiStates: {[ScreenGui]: boolean} = {}
local applyingHide = false
local busy = false

local function row(
	name: string,
	labelText: string,
	valueText: string,
	order: number,
	callback: (() -> ())?
): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.LayoutOrder = order
	button.Size = UDim2.new(1, -4, 0, 46)
	button.BackgroundColor3 = UI.tile
	button.BackgroundTransparency = 0.08
	button.Text = ""
	button.AutoButtonColor = callback ~= nil
	button.Active = callback ~= nil
	button.ZIndex = 123
	button.Parent = list
	round(button, 7)
	stroke(button, 0.45)

	local label = Instance.new("TextLabel")
	label.Position = UDim2.fromOffset(10, 4)
	label.Size = UDim2.new(0.64, -10, 1, -8)
	label.BackgroundTransparency = 1
	label.Text = labelText
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamMedium
	label.TextScaled = true
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.ZIndex = 124
	label.Parent = button
	constrain(label, 11, 14)

	local value = Instance.new("TextLabel")
	value.AnchorPoint = Vector2.new(1, 0)
	value.Position = UDim2.new(1, -8, 0, 4)
	value.Size = UDim2.new(0.34, 0, 1, -8)
	value.BackgroundTransparency = 1
	value.Text = valueText
	value.TextColor3 = UI.muted
	value.Font = Enum.Font.GothamBold
	value.TextScaled = true
	value.TextXAlignment = Enum.TextXAlignment.Right
	value.ZIndex = 124
	value.Parent = button
	constrain(value, 10, 13)

	if callback then
		button.Activated:Connect(callback)
	end
	return button
end

local function fetchSettings(): boolean
	local ok, result = pcall(function()
		return getSettings:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true and type(result.settings) == "table" then
		settings = result.settings
		return true
	end
	return false
end

local function setKnownGuiHidden(hidden: boolean)
	if applyingHide then
		return
	end
	applyingHide = true

	if hidden then
		hiddenGuiStates = {}
		for _, child in playerGui:GetChildren() do
			if child:IsA("ScreenGui") and child ~= gui then
				hiddenGuiStates[child] = child.Enabled
				child.Enabled = false
			end
		end
	else
		for screen, wasEnabled in hiddenGuiStates do
			if screen.Parent == playerGui then
				screen.Enabled = wasEnabled
			end
		end
		hiddenGuiStates = {}
	end

	applyingHide = false
end

local function applyVisualSettings()
	if type(settings) ~= "table" then
		return
	end
	local hideUi = settings.HideUI == true
	setKnownGuiHidden(hideUi)

	local runGui = playerGui:FindFirstChild("BrookhavenRunControlUI")
	if runGui and runGui:IsA("ScreenGui") and not hideUi then
		runGui.Enabled = true
		local root = runGui:FindFirstChild("Root")
		local runButton = root and root:FindFirstChild("Run")
		if runButton and runButton:IsA("GuiObject") then
			runButton.Visible = UserInputService.TouchEnabled and settings.SprintButton == true
		end
	end
end

local render

local function saveSetting(key: string, value: any)
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return setSetting:InvokeServer(key, value)
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true then
		settings = result.settings
		applyVisualSettings()
		if panel.Visible then
			render()
		end
	end
end

render = function()
	for _, child in list:GetChildren() do
		if child:IsA("GuiObject") and not child:IsA("UIListLayout") then
			child:Destroy()
		end
	end
	if type(settings) ~= "table" then
		return
	end

	local order = 1
	if UserInputService.TouchEnabled then
		row(
			"SprintButtonSetting",
			"Sprint Button",
			settings.SprintButton == true and "ON" or "OFF",
			order,
			function()
				saveSetting("SprintButton", settings.SprintButton ~= true)
			end
		)
		order += 1
	end

	row(
		"HideUISetting",
		"Hide UI",
		settings.HideUI == true and "ON" or "OFF",
		order,
		function()
			saveSetting("HideUI", settings.HideUI ~= true)
		end
	)
	order += 1

	row(
		"BabyCarSeatSetting",
		"Baby Car Seat",
		tostring(settings.BabyCarSeat or "Off"),
		order,
		function()
			local current = tostring(settings.BabyCarSeat or "Off")
			local nextValue = if current == "Off" then "Blue" elseif current == "Blue" then "Pink" else "Off"
			saveSetting("BabyCarSeat", nextValue)
		end
	)
	order += 1

	row(
		"MuteOtherMusicSetting",
		"Mute Other Players' Music",
		settings.MuteOtherMusic == true and "ON" or "OFF",
		order,
		function()
			saveSetting("MuteOtherMusic", settings.MuteOtherMusic ~= true)
		end
	)
	order += 1

	row(
		"HideHouseSignsSetting",
		"Hide House Signs",
		settings.HideHouseSigns == true and "ON" or "OFF",
		order,
		function()
			saveSetting("HideHouseSigns", settings.HideHouseSigns ~= true)
		end
	)
	order += 1

	row(
		"HidePropsToolSetting",
		"Hide Props Tool",
		settings.HidePropsTool == true and "ON" or "OFF",
		order,
		function()
			saveSetting("HidePropsTool", settings.HidePropsTool ~= true)
		end
	)
end

gear.Activated:Connect(function()
	if settings == nil then
		fetchSettings()
	end
	applyVisualSettings()
	render()
	panel.Visible = not panel.Visible
end)

close.Activated:Connect(function()
	panel.Visible = false
end)

playerGui.ChildAdded:Connect(function(child)
	if type(settings) == "table"
		and settings.HideUI == true
		and child:IsA("ScreenGui")
		and child ~= gui
	then
		hiddenGuiStates[child] = child.Enabled
		child.Enabled = false
	end
end)

task.spawn(function()
	if fetchSettings() then
		applyVisualSettings()
	end
end)
