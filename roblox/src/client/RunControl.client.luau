--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local MobileShell = require(script.Parent:WaitForChild("MobileShell"))
local UI = MobileShell.Theme
local movementRemotes = ReplicatedStorage:WaitForChild("StarBloxMovement")
local toggleRun = movementRemotes:WaitForChild("ToggleRun") :: RemoteFunction

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenRunControlUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 34
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui
MobileShell.RegisterPersistent("run", gui)

local root = Instance.new("Frame")
root.Name = "Root"
root.Size = UDim2.fromScale(1, 1)
root.BackgroundTransparency = 1
root.Parent = gui

local scale = Instance.new("UIScale")
scale.Scale = 1
scale.Parent = root

local function updateScale()
	local camera = Workspace.CurrentCamera
	if camera == nil then
		return
	end
	local viewport = camera.ViewportSize
	if viewport.X >= viewport.Y then
		scale.Scale = 1
	else
		scale.Scale = math.clamp(viewport.X / 960, 0.72, 1)
	end
end
updateScale()
Workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(updateScale)
if Workspace.CurrentCamera then
	Workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end

local button = Instance.new("ImageButton")
button.Name = "Run"
button.AnchorPoint = Vector2.new(1, 1)
button.Position = UDim2.new(1, -76, 1, -58)
button.Size = UDim2.fromOffset(52, 52)
button.BackgroundColor3 = UI.white
button.BackgroundTransparency = 0.28
button.Image = "rbxassetid://6034754445"
button.ImageColor3 = UI.icon
button.ImageTransparency = 0.18
button.ScaleType = Enum.ScaleType.Fit
button.AutoButtonColor = true
button.ZIndex = 35
button.Parent = root
MobileShell.Round(button, 26)
MobileShell.Stroke(button, UI.glassStroke, 1.5, 0.42)

local iconPadding = Instance.new("UIPadding")
iconPadding.PaddingTop = UDim.new(0, 12)
iconPadding.PaddingBottom = UDim.new(0, 12)
iconPadding.PaddingLeft = UDim.new(0, 12)
iconPadding.PaddingRight = UDim.new(0, 12)
iconPadding.Parent = button

local busy = false

local function render()
	local running = player:GetAttribute("StarBloxRunning") == true
	local sprintSetting = player:GetAttribute("StarBloxSetting_SprintButton")
	button.Visible = UserInputService.TouchEnabled and sprintSetting ~= false
	button.BackgroundTransparency = if running then 0.10 else 0.28
	button.ImageTransparency = if running then 0 else 0.18
	local ring = button:FindFirstChildOfClass("UIStroke")
	if ring ~= nil then
		ring.Transparency = if running then 0.18 else 0.42
	end
end

button.Activated:Connect(function()
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return toggleRun:InvokeServer()
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true then
		render()
	end
end)

player:GetAttributeChangedSignal("StarBloxRunning"):Connect(render)
player:GetAttributeChangedSignal("StarBloxSetting_SprintButton"):Connect(render)
render()
