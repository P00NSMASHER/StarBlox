--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxShop")

local getState = remotes:WaitForChild("GetState") :: RemoteFunction
local setPlacement = remotes:WaitForChild("SetPlacement") :: RemoteFunction
local setVisibility = remotes:WaitForChild("SetPlacementVisibility") :: RemoteFunction
local resetPlacement = remotes:WaitForChild("ResetPlacement") :: RemoteFunction
local visitHome = remotes:WaitForChild("VisitHome") :: RemoteFunction

local shopGui = playerGui:WaitForChild("StarBloxShopUI", 10)
if shopGui == nil then
	return
end
local editPlacement = shopGui:WaitForChild("EditPlacement", 10)
if editPlacement == nil or not editPlacement:IsA("BindableEvent") then
	return
end

local UI = {
	white = Color3.fromRGB(245, 245, 245),
	tile = Color3.fromRGB(222, 222, 222),
	border = Color3.fromRGB(115, 115, 115),
	text = Color3.fromRGB(42, 42, 42),
	muted = Color3.fromRGB(90, 90, 90),
	red = Color3.fromRGB(210, 49, 49),
	green = Color3.fromRGB(68, 173, 92),
	blue = Color3.fromRGB(80, 154, 221),
}

local function round(guiObject: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = guiObject
end

local function stroke(guiObject: GuiObject, color: Color3?)
	local line = Instance.new("UIStroke")
	line.Color = color or UI.border
	line.Thickness = 1
	line.Transparency = 0.15
	line.Parent = guiObject
end

local function constrain(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local c = Instance.new("UITextSizeConstraint")
	c.MinTextSize = minSize
	c.MaxTextSize = maxSize
	c.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "StarBloxHomeBuild"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 90
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local panel = Instance.new("Frame")
panel.Name = "BuildStrip"
panel.AnchorPoint = Vector2.new(0.5, 1)
panel.Position = UDim2.new(0.5, 0, 1, -12)
panel.Size = UDim2.fromOffset(390, 126)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 0.03
panel.Visible = false
panel.ZIndex = 100
panel.Parent = gui
round(panel, 6)
stroke(panel)

local constraint = Instance.new("UISizeConstraint")
constraint.MinSize = Vector2.new(330, 126)
constraint.MaxSize = Vector2.new(420, 126)
constraint.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(10, 7)
title.Size = UDim2.new(1, -20, 0, 22)
title.Text = "Edit furniture"
title.TextColor3 = UI.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 101
title.Parent = panel
constrain(title, 12, 16)

local status = Instance.new("TextLabel")
status.BackgroundTransparency = 1
status.Position = UDim2.fromOffset(10, 29)
status.Size = UDim2.new(1, -20, 0, 18)
status.Text = ""
status.TextColor3 = UI.muted
status.Font = Enum.Font.GothamMedium
status.TextScaled = true
status.TextXAlignment = Enum.TextXAlignment.Left
status.ZIndex = 101
status.Parent = panel
constrain(status, 9, 12)

local controls = Instance.new("Frame")
controls.BackgroundTransparency = 1
controls.Position = UDim2.fromOffset(8, 52)
controls.Size = UDim2.new(1, -16, 0, 66)
controls.ZIndex = 101
controls.Parent = panel

local list = Instance.new("UIListLayout")
list.FillDirection = Enum.FillDirection.Horizontal
list.HorizontalAlignment = Enum.HorizontalAlignment.Center
list.VerticalAlignment = Enum.VerticalAlignment.Center
list.Padding = UDim.new(0, 4)
list.Parent = controls

local function controlButton(name: string, label: string, background: Color3): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.Size = UDim2.fromOffset(44, 44)
	button.BackgroundColor3 = background
	button.Text = label
	button.TextColor3 = UI.text
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 102
	button.Parent = controls
	round(button, 5)
	stroke(button)
	constrain(button, 15, 22)
	return button
end

local left = controlButton("MoveLeft", "←", UI.tile)
local forward = controlButton("MoveForward", "↑", UI.tile)
local back = controlButton("MoveBack", "↓", UI.tile)
local right = controlButton("MoveRight", "→", UI.tile)
local rotate = controlButton("Rotate", "↻", UI.tile)
local visibility = controlButton("Visibility", "HIDE", UI.tile)
local reset = controlButton("Reset", "RST", UI.tile)
local done = controlButton("Done", "✓", UI.green)

local currentItemId: string? = nil
local currentItemName = ""
local currentPlacement = nil
local busy = false

local function updateStatus()
	if currentPlacement == nil then
		status.Text = ""
		return
	end
	status.Text = string.format(
		"X %.0f   Z %.0f   %d°   %s",
		tonumber(currentPlacement.X) or 0,
		tonumber(currentPlacement.Z) or 0,
		tonumber(currentPlacement.Yaw) or 0,
		currentPlacement.Visible == false and "hidden" or "shown"
	)
	visibility.Text = currentPlacement.Visible == false and "SHOW" or "HIDE"
end

local function findItemName(state, itemId: string): string
	for _, item in state.items or {} do
		if tostring(item.Id) == itemId then
			return tostring(item.Name)
		end
	end
	return itemId
end

local function fetchPlacement(itemId: string): boolean
	local ok, state = pcall(function()
		return getState:InvokeServer()
	end)
	if not ok or type(state) ~= "table" or state.ok ~= true then
		return false
	end
	local placement = state.placements and state.placements[itemId]
	if type(placement) ~= "table" then
		return false
	end
	currentPlacement = {
		X = tonumber(placement.X) or 0,
		Z = tonumber(placement.Z) or 0,
		Yaw = tonumber(placement.Yaw) or 0,
		Visible = placement.Visible ~= false,
	}
	currentItemName = findItemName(state, itemId)
	title.Text = "Edit " .. currentItemName
	updateStatus()
	return true
end

local function applyPlacement(deltaX: number, deltaZ: number, deltaYaw: number)
	if busy or currentItemId == nil or currentPlacement == nil then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return setPlacement:InvokeServer(currentItemId, {
			X = (tonumber(currentPlacement.X) or 0) + deltaX,
			Z = (tonumber(currentPlacement.Z) or 0) + deltaZ,
			Yaw = (tonumber(currentPlacement.Yaw) or 0) + deltaYaw,
		})
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true and type(result.placement) == "table" then
		currentPlacement = result.placement
		updateStatus()
	elseif ok and type(result) == "table" and result.code == "rate_limited" then
		status.Text = "One move at a time."
	else
		status.Text = "Couldn’t move that item."
	end
end

left.Activated:Connect(function()
	applyPlacement(-1, 0, 0)
end)
right.Activated:Connect(function()
	applyPlacement(1, 0, 0)
end)
forward.Activated:Connect(function()
	applyPlacement(0, -1, 0)
end)
back.Activated:Connect(function()
	applyPlacement(0, 1, 0)
end)
rotate.Activated:Connect(function()
	applyPlacement(0, 0, 15)
end)

visibility.Activated:Connect(function()
	if busy or currentItemId == nil or currentPlacement == nil then
		return
	end
	busy = true
	local nextVisible = currentPlacement.Visible == false
	local ok, result = pcall(function()
		return setVisibility:InvokeServer(currentItemId, nextVisible)
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true and type(result.placement) == "table" then
		currentPlacement = result.placement
		updateStatus()
	else
		status.Text = "Couldn’t change visibility."
	end
end)

reset.Activated:Connect(function()
	if busy or currentItemId == nil then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return resetPlacement:InvokeServer(currentItemId)
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true and type(result.placement) == "table" then
		currentPlacement = result.placement
		updateStatus()
	else
		status.Text = "Couldn’t reset that item."
	end
end)

done.Activated:Connect(function()
	panel.Visible = false
	currentItemId = nil
	currentPlacement = nil
	currentItemName = ""
end)

editPlacement.Event:Connect(function(itemId)
	if type(itemId) ~= "string" then
		return
	end
	pcall(function()
		visitHome:InvokeServer()
	end)
	currentItemId = itemId
	if fetchPlacement(itemId) then
		panel.Visible = true
	else
		currentItemId = nil
		panel.Visible = false
	end
end)
