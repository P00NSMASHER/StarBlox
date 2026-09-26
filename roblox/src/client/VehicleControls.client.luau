--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxMirror")
local vehicleAction = remotes:WaitForChild("VehicleAction") :: RemoteFunction

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenVehicleControlsUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 35
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local bar = Instance.new("Frame")
bar.Name = "VehicleControls"
bar.AnchorPoint = Vector2.new(0.5, 1)
bar.Position = UDim2.new(0.5, 0, 1, -14)
bar.Size = UDim2.fromOffset(326, 50)
bar.BackgroundTransparency = 1
bar.Visible = false
bar.Parent = gui

local function round(object: GuiObject, radius: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0, radius)
	c.Parent = object
end

local function stroke(object: GuiObject)
	local s = Instance.new("UIStroke")
	s.Color = Color3.fromRGB(100, 100, 100)
	s.Transparency = 0.4
	s.Thickness = 1
	s.Parent = object
end

local function control(name: string, text: string, x: number, width: number): TextButton
	local b = Instance.new("TextButton")
	b.Name = name
	b.Position = UDim2.fromOffset(x, 0)
	b.Size = UDim2.fromOffset(width, 46)
	b.BackgroundColor3 = Color3.fromRGB(236, 236, 236)
	b.BackgroundTransparency = 0.14
	b.Text = text
	b.TextColor3 = Color3.fromRGB(40, 40, 40)
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.Parent = bar
	round(b, 8)
	stroke(b)
	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize = 10
	limit.MaxTextSize = 18
	limit.Parent = b
	return b
end

local speed = control("Speed", "0", 0, 64)
speed.AutoButtonColor = false
speed.Active = false

local lights = control("Headlights", "☀", 70, 56)
local lock = control("Lock", "🔓", 132, 56)
local flip = control("Flip", "↻", 194, 56)
local despawn = control("Despawn", "X", 256, 56)
despawn.BackgroundColor3 = Color3.fromRGB(205, 36, 36)
despawn.TextColor3 = Color3.new(1, 1, 1)

local currentSeat: VehicleSeat? = nil
local currentModel: Model? = nil
local busy = false

local function findVehicleModel(seat: Instance?): Model?
	local cursor = seat
	while cursor ~= nil and cursor ~= workspace do
		if cursor:IsA("Model")
			and cursor:GetAttribute("RuntimeOwned") == true
			and tonumber(cursor:GetAttribute("OwnerUserId")) == player.UserId
		then
			return cursor
		end
		cursor = cursor.Parent
	end
	return nil
end

local function refreshButtons()
	local model = currentModel
	if model == nil then
		return
	end
	lights.BackgroundColor3 = if model:GetAttribute("HeadlightsOn") == true
		then Color3.fromRGB(246, 222, 119)
		else Color3.fromRGB(236, 236, 236)
	lock.Text = if model:GetAttribute("Locked") == true then "🔒" else "🔓"
end

local function invoke(action: string)
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return vehicleAction:InvokeServer(action)
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true then
		refreshButtons()
	end
end

lights.Activated:Connect(function()
	invoke("headlights")
end)

lock.Activated:Connect(function()
	invoke("lock")
end)

flip.Activated:Connect(function()
	invoke("flip")
end)

despawn.Activated:Connect(function()
	invoke("despawn")
	bar.Visible = false
	currentSeat = nil
	currentModel = nil
end)

local function bindCharacter(character: Model)
	local humanoid = character:WaitForChild("Humanoid", 5)
	if humanoid == nil or not humanoid:IsA("Humanoid") then
		return
	end

	humanoid.Seated:Connect(function(active, seatPart)
		if not active or seatPart == nil or not seatPart:IsA("VehicleSeat") then
			currentSeat = nil
			currentModel = nil
			bar.Visible = false
			return
		end
		local model = findVehicleModel(seatPart)
		if model == nil then
			currentSeat = nil
			currentModel = nil
			bar.Visible = false
			return
		end
		currentSeat = seatPart
		currentModel = model
		refreshButtons()
		bar.Visible = true
	end)
end

if player.Character then
	task.spawn(bindCharacter, player.Character)
end
player.CharacterAdded:Connect(bindCharacter)

RunService.RenderStepped:Connect(function()
	if not bar.Visible then
		return
	end
	local seat = currentSeat
	local model = currentModel
	if seat == nil or model == nil or seat.Parent == nil or model.Parent == nil then
		bar.Visible = false
		currentSeat = nil
		currentModel = nil
		return
	end
	local studsPerSecond = Vector3.new(
		seat.AssemblyLinearVelocity.X,
		0,
		seat.AssemblyLinearVelocity.Z
	).Magnitude
	speed.Text = tostring(math.floor(studsPerSecond + 0.5))
	refreshButtons()
end)
