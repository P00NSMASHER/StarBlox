--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
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
	scale.Scale = math.clamp(camera.ViewportSize.Y / 512, 0.72, 1.08)
end
updateScale()
Workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(updateScale)
if Workspace.CurrentCamera then
	Workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end

local button = Instance.new("TextButton")
button.Name = "Run"
button.AnchorPoint = Vector2.new(1, 1)
button.Position = UDim2.new(1, -282, 1, -62)
button.Size = UDim2.fromOffset(56, 56)
button.BackgroundColor3 = Color3.fromRGB(78, 78, 78)
button.BackgroundTransparency = 0.48
button.Text = "🏃"
button.TextColor3 = Color3.fromRGB(225, 225, 225)
button.TextTransparency = 0.25
button.Font = Enum.Font.GothamBold
button.TextScaled = true
button.AutoButtonColor = true
button.ZIndex = 35
button.Parent = root

local aspect = Instance.new("UIAspectRatioConstraint")
aspect.AspectRatio = 1
aspect.Parent = button

local corner = Instance.new("UICorner")
corner.CornerRadius = UDim.new(1, 0)
corner.Parent = button

local ring = Instance.new("UIStroke")
ring.Color = Color3.fromRGB(100, 100, 100)
ring.Thickness = 2
ring.Transparency = 0.35
ring.Parent = button

local textLimit = Instance.new("UITextSizeConstraint")
textLimit.MinTextSize = 20
textLimit.MaxTextSize = 30
textLimit.Parent = button

local busy = false

local function render()
	local running = player:GetAttribute("StarBloxRunning") == true
	local sprintSetting = player:GetAttribute("StarBloxSetting_SprintButton")
	button.Visible = UserInputService.TouchEnabled and sprintSetting ~= false
	button.BackgroundTransparency = if running then 0.24 else 0.48
	button.TextTransparency = if running then 0 else 0.25
	ring.Transparency = if running then 0.1 else 0.35
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
