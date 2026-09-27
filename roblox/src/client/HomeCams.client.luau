--!strict

local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenHomeCamsUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 84
gui.Enabled = false
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local openHomeCams = Instance.new("BindableEvent")
openHomeCams.Name = "OpenHomeCams"
openHomeCams.Parent = gui

local root = Instance.new("Frame")
root.Size = UDim2.fromScale(1, 1)
root.BackgroundTransparency = 1
root.Parent = gui

local controls = Instance.new("Frame")
controls.Name = "CameraControls"
controls.AnchorPoint = Vector2.new(0.5, 0)
controls.Position = UDim2.new(0.5, 0, 0, 12)
controls.Size = UDim2.fromOffset(276, 40)
controls.BackgroundColor3 = Color3.fromRGB(248, 249, 250)
controls.BackgroundTransparency = 0.04
controls.Parent = root

local function round(object: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = object
end

local function stroke(object: GuiObject)
	local s = Instance.new("UIStroke")
	s.Color = Color3.fromRGB(105, 105, 105)
	s.Transparency = 0.35
	s.Thickness = 1
	s.Parent = object
end

round(controls, 11)
stroke(controls)

local function button(name: string, text: string, x: number, width: number): TextButton
	local b = Instance.new("TextButton")
	b.Name = name
	b.Position = UDim2.fromOffset(x, 0)
	b.Size = UDim2.fromOffset(width, 36)
	b.BackgroundColor3 = Color3.fromRGB(248, 249, 250)
	b.BackgroundTransparency = 0.12
	b.Text = text
	b.TextColor3 = Color3.fromRGB(38, 38, 38)
	b.Font = Enum.Font.GothamBold
	b.TextSize = 17
	b.Parent = controls
	round(b, 9)
	stroke(b)
	local limit = Instance.new("UITextSizeConstraint")
	limit.MinTextSize = 12
	limit.MaxTextSize = 20
	limit.Parent = b
	return b
end

local previous = button("Previous", "←", 6, 34)
local cameraLabel = button("CameraLabel", "Cam 1/4", 46, 148)
cameraLabel.AutoButtonColor = false
cameraLabel.Active = false
local nextButton = button("Next", "→", 200, 34)
local close = button("Close", "×", 240, 30)
close.BackgroundColor3 = Color3.fromRGB(205, 36, 36)
close.TextColor3 = Color3.new(1, 1, 1)

local footer = Instance.new("TextLabel")
footer.Name = "Hint"
footer.AnchorPoint = Vector2.new(0.5, 1)
footer.Position = UDim2.new(0.5, 0, 1, -12)
footer.Size = UDim2.fromOffset(180, 24)
footer.BackgroundColor3 = Color3.fromRGB(235, 235, 235)
footer.BackgroundTransparency = 0.06
footer.Text = "Home Cams"
footer.TextColor3 = Color3.fromRGB(45, 45, 45)
footer.Font = Enum.Font.GothamMedium
footer.TextScaled = true
footer.Parent = root
round(footer, 7)
local footerLimit = Instance.new("UITextSizeConstraint")
footerLimit.MinTextSize = 10
footerLimit.MaxTextSize = 13
footerLimit.Parent = footer

local activePoints: {CFrame} = {}
local activeIndex = 1
local savedCameraType = nil
local savedFieldOfView = nil
local savedCameraSubject = nil

local function ownHome(): Model?
	local plotId = player:GetAttribute("StarBloxHomePlotId")
	local folder = Workspace:FindFirstChild("StarBloxPlayerHomes")
	if folder == nil then
		return nil
	end
	for _, child in folder:GetChildren() do
		if child:IsA("Model") and child:GetAttribute("PlotId") == plotId then
			return child
		end
	end
	return nil
end

local function cameraPointsFor(model: Model): {CFrame}
	local boxCFrame, size = model:GetBoundingBox()
	local center = boxCFrame.Position + Vector3.new(0, math.max(2.5, size.Y * 0.28), 0)
	local forward = boxCFrame.LookVector
	local right = boxCFrame.RightVector
	local frontDistance = math.max(14, (size.Z * 0.62) + 10)
	local sideDistance = math.max(14, (size.X * 0.62) + 10)
	local height = math.max(4, size.Y * 0.45)

	local frontPosition = boxCFrame.Position + (forward * frontDistance) + Vector3.new(0, height, 0)
	local rearPosition = boxCFrame.Position - (forward * frontDistance) + Vector3.new(0, height, 0)
	local sidePosition = boxCFrame.Position + (right * sideDistance) + Vector3.new(0, height, 0)
	local overviewPosition = boxCFrame.Position + Vector3.new(0, math.max(20, size.Y + 16), 0) - (forward * math.max(10, size.Z * 0.3))

	return {
		CFrame.lookAt(frontPosition, center),
		CFrame.lookAt(sidePosition, center),
		CFrame.lookAt(rearPosition, center),
		CFrame.lookAt(overviewPosition, center),
	}
end

local function applyCamera()
	local camera = Workspace.CurrentCamera
	if camera == nil or #activePoints == 0 then
		return
	end
	activeIndex = math.clamp(activeIndex, 1, #activePoints)
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = if activeIndex == #activePoints then 58 else 50
	camera.CFrame = activePoints[activeIndex]
	cameraLabel.Text = string.format("Home Cam %d/%d", activeIndex, #activePoints)
end

local function restoreCamera()
	local camera = Workspace.CurrentCamera
	if camera == nil then
		return
	end
	if savedCameraType ~= nil then
		-- A saved frame can be inside geometry after travel; the Roblox camera
		-- controller must reacquire the current character instead.
		local character = player.Character
		local humanoid = character and character:FindFirstChildOfClass("Humanoid")
		camera.CameraSubject = humanoid or savedCameraSubject or camera.CameraSubject
		camera.CameraType = if savedCameraType == Enum.CameraType.Scriptable
			then Enum.CameraType.Custom else savedCameraType
	end
	if savedFieldOfView ~= nil then
		camera.FieldOfView = savedFieldOfView
	end
	savedCameraType = nil
	savedCameraSubject = nil
	savedFieldOfView = nil
	activePoints = {}
	activeIndex = 1
end

local function setShellLabelsVisible(visible: boolean)
	local shellGui = playerGui:FindFirstChild("BrookhavenMirrorSidebar")
	local shell = shellGui and shellGui:FindFirstChild("BrookhavenWorldShell")
	local labels = shell and shell:FindFirstChild("ActionLabels")
	if labels and labels:IsA("GuiObject") then
		labels.Visible = visible
	end
end

local function setWorldHudVisible(visible: boolean)
	local shellGui = playerGui:FindFirstChild("BrookhavenMirrorSidebar")
	if shellGui ~= nil and shellGui:IsA("ScreenGui") then
		shellGui.Enabled = visible
	end
end

local function closeCams()
	gui.Enabled = false
	restoreCamera()
	setWorldHudVisible(true)
	setShellLabelsVisible(true)
end

previous.Activated:Connect(function()
	if #activePoints == 0 then
		return
	end
	activeIndex -= 1
	if activeIndex < 1 then
		activeIndex = #activePoints
	end
	applyCamera()
end)

nextButton.Activated:Connect(function()
	if #activePoints == 0 then
		return
	end
	activeIndex += 1
	if activeIndex > #activePoints then
		activeIndex = 1
	end
	applyCamera()
end)

close.Activated:Connect(closeCams)

openHomeCams.Event:Connect(function()
	local model = ownHome()
	if model == nil then
		footer.Text = "No home camera available"
		setWorldHudVisible(false)
		gui.Enabled = true
		task.delay(1.3, function()
			if gui.Enabled and #activePoints == 0 then
				gui.Enabled = false
				footer.Text = "Home Cams"
				setWorldHudVisible(true)
				setShellLabelsVisible(true)
			end
		end)
		return
	end

	local avatarEditor = playerGui:FindFirstChild("BrookhavenAvatarEditorUI")
	local closeEditor = avatarEditor and avatarEditor:FindFirstChild("CloseAvatarEditor")
	if closeEditor and closeEditor:IsA("BindableEvent") then
		closeEditor:Fire()
	end

	local camera = Workspace.CurrentCamera
	if camera == nil then
		return
	end
	savedCameraType = camera.CameraType
	savedCameraSubject = camera.CameraSubject
	savedFieldOfView = camera.FieldOfView
	activePoints = cameraPointsFor(model)
	activeIndex = 1
	footer.Text = "Home Cams"
	setWorldHudVisible(false)
	gui.Enabled = true
	setShellLabelsVisible(false)
	applyCamera()
end)

player.CharacterAdded:Connect(function()
	if gui.Enabled then
		closeCams()
	end
end)
