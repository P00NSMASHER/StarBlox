--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local roleplayRemotes = ReplicatedStorage:WaitForChild("StarBloxRoleplay")
local getState = roleplayRemotes:WaitForChild("GetState") :: RemoteFunction
local resetAvatar = roleplayRemotes:WaitForChild("ResetAvatar") :: RemoteFunction
local saveOutfit = roleplayRemotes:WaitForChild("SaveOutfit") :: RemoteFunction
local loadOutfit = roleplayRemotes:WaitForChild("LoadOutfit") :: RemoteFunction
local deleteOutfit = roleplayRemotes:WaitForChild("DeleteOutfit") :: RemoteFunction
local applyAvatarPreset = roleplayRemotes:WaitForChild("ApplyAvatarPreset") :: RemoteFunction

local COLORS = {
	white = Color3.fromRGB(239, 239, 239),
	tile = Color3.fromRGB(223, 223, 223),
	tileSelected = Color3.fromRGB(193, 193, 193),
	text = Color3.fromRGB(35, 35, 35),
	muted = Color3.fromRGB(82, 82, 82),
	border = Color3.fromRGB(104, 104, 104),
	red = Color3.fromRGB(207, 36, 36),
	green = Color3.fromRGB(70, 178, 88),
	blue = Color3.fromRGB(113, 196, 231),
	pink = Color3.fromRGB(236, 83, 158),
}

local function round(object: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = object
end

local function stroke(object: GuiObject, color: Color3?, thickness: number?, transparency: number?)
	local line = Instance.new("UIStroke")
	line.Color = color or COLORS.border
	line.Thickness = thickness or 1
	line.Transparency = transparency or 0.35
	line.Parent = object
end

local function constrain(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local size = Instance.new("UITextSizeConstraint")
	size.MinTextSize = minSize
	size.MaxTextSize = maxSize
	size.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenAvatarEditorUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 85
gui.Enabled = false
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local openAvatarEditor = Instance.new("BindableEvent")
openAvatarEditor.Name = "OpenAvatarEditor"
openAvatarEditor.Parent = gui

local closeAvatarEditor = Instance.new("BindableEvent")
closeAvatarEditor.Name = "CloseAvatarEditor"
closeAvatarEditor.Parent = gui

local root = Instance.new("Frame")
root.Name = "Editor"
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

-- Left side mirrors the recorded "My Outfits" column.
local outfitsPanel = Instance.new("Frame")
outfitsPanel.Name = "MyOutfits"
outfitsPanel.Position = UDim2.new(0, 83, 0.5, -103)
outfitsPanel.Size = UDim2.fromOffset(108, 210)
outfitsPanel.BackgroundColor3 = COLORS.white
outfitsPanel.BackgroundTransparency = 0.22
outfitsPanel.ZIndex = 86
outfitsPanel.Parent = root
round(outfitsPanel, 8)
stroke(outfitsPanel)

local outfitsTitle = Instance.new("TextLabel")
outfitsTitle.Name = "Title"
outfitsTitle.Size = UDim2.new(1, -10, 0, 27)
outfitsTitle.Position = UDim2.fromOffset(5, 4)
outfitsTitle.BackgroundTransparency = 1
outfitsTitle.Text = "My Outfits"
outfitsTitle.TextColor3 = COLORS.text
outfitsTitle.Font = Enum.Font.GothamMedium
outfitsTitle.TextScaled = true
outfitsTitle.ZIndex = 87
outfitsTitle.Parent = outfitsPanel
constrain(outfitsTitle, 10, 13)

local outfitSlotButtons: {TextButton} = {}
local outfitDeleteButtons: {TextButton} = {}
for slot = 1, 4 do
	local button = Instance.new("TextButton")
	button.Name = "Outfit" .. tostring(slot)
	button.Position = UDim2.fromOffset(9, 33 + ((slot - 1) * 35))
	button.Size = UDim2.fromOffset(90, 30)
	button.BackgroundColor3 = COLORS.tile
	button.BackgroundTransparency = 0.04
	button.Text = "Outfit " .. tostring(slot)
	button.TextColor3 = COLORS.text
	button.Font = Enum.Font.GothamMedium
	button.TextScaled = true
	button.ZIndex = 87
	button.Parent = outfitsPanel
	round(button, 7)
	stroke(button, COLORS.border, 1, 0.4)
	constrain(button, 10, 13)
	outfitSlotButtons[slot] = button

	local deleteButton = Instance.new("TextButton")
	deleteButton.Name = "Delete" .. tostring(slot)
	deleteButton.AnchorPoint = Vector2.new(1, 0)
	deleteButton.Position = UDim2.new(1, -3, 0, 34 + ((slot - 1) * 35))
	deleteButton.Size = UDim2.fromOffset(18, 18)
	deleteButton.BackgroundColor3 = COLORS.red
	deleteButton.BackgroundTransparency = 0.05
	deleteButton.Text = "×"
	deleteButton.TextColor3 = Color3.new(1, 1, 1)
	deleteButton.Font = Enum.Font.GothamBold
	deleteButton.TextScaled = true
	deleteButton.Visible = false
	deleteButton.ZIndex = 90
	deleteButton.Parent = outfitsPanel
	round(deleteButton, 9)
	constrain(deleteButton, 10, 13)
	outfitDeleteButtons[slot] = deleteButton
end

local resetButton = Instance.new("TextButton")
resetButton.Name = "Reset"
resetButton.Position = UDim2.fromOffset(9, 174)
resetButton.Size = UDim2.fromOffset(90, 28)
resetButton.BackgroundColor3 = COLORS.tile
resetButton.Text = "↶  Reset"
resetButton.TextColor3 = COLORS.text
resetButton.Font = Enum.Font.GothamMedium
resetButton.TextScaled = true
resetButton.ZIndex = 87
resetButton.Parent = outfitsPanel
round(resetButton, 7)
stroke(resetButton, COLORS.border, 1, 0.4)
constrain(resetButton, 10, 13)

-- Small utility row visible under My Outfits in the Brookhaven recording.
local utilityBar = Instance.new("Frame")
utilityBar.Name = "OutfitUtilities"
utilityBar.Position = UDim2.new(0, 194, 0.5, 68)
utilityBar.Size = UDim2.fromOffset(194, 42)
utilityBar.BackgroundTransparency = 1
utilityBar.ZIndex = 86
utilityBar.Parent = root

local function utilityButton(name: string, symbol: string, x: number): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.Position = UDim2.fromOffset(x, 0)
	button.Size = UDim2.fromOffset(36, 36)
	button.BackgroundColor3 = COLORS.white
	button.BackgroundTransparency = 0.16
	button.Text = symbol
	button.TextColor3 = COLORS.text
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.ZIndex = 87
	button.Parent = utilityBar
	round(button, 6)
	stroke(button, COLORS.border, 1, 0.4)
	constrain(button, 16, 22)
	return button
end

local saveCurrentButton = utilityButton("SaveCurrent", "▣", 0)
local undoButton = utilityButton("ResetCurrent", "↶", 40)
local reloadButton = utilityButton("Reload", "↻", 80)
local randomButton = utilityButton("NextLook", "♟", 120)
local profileButton = utilityButton("Profile", "◎", 160)

-- Right-side preset chooser.
local presetsPanel = Instance.new("Frame")
presetsPanel.Name = "PresetPanel"
presetsPanel.AnchorPoint = Vector2.new(1, 0)
presetsPanel.Position = UDim2.new(1, -88, 0, 72)
presetsPanel.Size = UDim2.fromOffset(362, 405)
presetsPanel.BackgroundTransparency = 1
presetsPanel.ZIndex = 86
presetsPanel.Parent = root

local tabs = Instance.new("Frame")
tabs.Name = "Tabs"
tabs.Size = UDim2.new(1, 0, 0, 45)
tabs.BackgroundTransparency = 1
tabs.ZIndex = 87
tabs.Parent = presetsPanel

local activeCategory = "all"
local tabButtons: {[string]: TextButton} = {}

local function makeTab(id: string, symbol: string, order: number)
	local button = Instance.new("TextButton")
	button.Name = "Tab_" .. id
	button.Position = UDim2.fromOffset((order - 1) * 61, 0)
	button.Size = UDim2.fromOffset(58, 42)
	button.BackgroundColor3 = COLORS.white
	button.BackgroundTransparency = 0.12
	button.Text = symbol
	button.TextColor3 = COLORS.text
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.ZIndex = 88
	button.Parent = tabs
	round(button, 7)
	stroke(button, COLORS.border, 1, 0.4)
	constrain(button, 17, 24)
	tabButtons[id] = button
	return button
end

makeTab("all", "♟♟", 1)
makeTab("classic", "▣", 2)
makeTab("body", "T", 3)
makeTab("style", "♨", 4)
makeTab("saved", "♙", 5)

local closeButton = Instance.new("TextButton")
closeButton.Name = "Close"
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, 0, 0, 0)
closeButton.Size = UDim2.fromOffset(56, 45)
closeButton.BackgroundColor3 = COLORS.red
closeButton.Text = "X"
closeButton.TextColor3 = Color3.new(1, 1, 1)
closeButton.Font = Enum.Font.GothamBold
closeButton.TextScaled = true
closeButton.ZIndex = 90
closeButton.Parent = presetsPanel
round(closeButton, 7)
stroke(closeButton, Color3.fromRGB(130, 25, 25), 1, 0.25)
constrain(closeButton, 24, 30)

local presetsScroll = Instance.new("ScrollingFrame")
presetsScroll.Name = "Looks"
presetsScroll.Position = UDim2.fromOffset(0, 49)
presetsScroll.Size = UDim2.new(1, 0, 1, -49)
presetsScroll.BackgroundTransparency = 1
presetsScroll.BorderSizePixel = 0
presetsScroll.ScrollBarThickness = 0
presetsScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
presetsScroll.CanvasSize = UDim2.fromOffset(0, 0)
presetsScroll.ZIndex = 87
presetsScroll.Parent = presetsPanel

local presetGrid = Instance.new("UIGridLayout")
presetGrid.CellPadding = UDim2.fromOffset(5, 5)
presetGrid.CellSize = UDim2.fromOffset(84, 84)
presetGrid.FillDirectionMaxCells = 4
presetGrid.SortOrder = Enum.SortOrder.LayoutOrder
presetGrid.Parent = presetsScroll

local status = Instance.new("TextLabel")
status.Name = "Status"
status.AnchorPoint = Vector2.new(0.5, 1)
status.Position = UDim2.new(0.5, 0, 1, -8)
status.Size = UDim2.fromOffset(260, 28)
status.BackgroundColor3 = COLORS.white
status.BackgroundTransparency = 0.2
status.Text = ""
status.TextColor3 = COLORS.text
status.Font = Enum.Font.GothamMedium
status.TextScaled = true
status.Visible = false
status.ZIndex = 100
status.Parent = root
round(status, 7)
constrain(status, 10, 13)

local state = nil
local currentPresetIndex = 1
local savedCameraType = nil
local savedCameraCFrame = nil
local savedFieldOfView = nil

local function showStatus(text: string, positive: boolean?)
	status.Text = text
	status.TextColor3 = if positive == true then COLORS.green else COLORS.text
	status.Visible = true
	task.delay(1.5, function()
		if status.Text == text then
			status.Visible = false
		end
	end)
end

local function setShellLabelsVisible(visible: boolean)
	local shellGui = playerGui:FindFirstChild("BrookhavenMirrorSidebar")
	local shellFrame = shellGui and shellGui:FindFirstChild("BrookhavenWorldShell")
	local labels = shellFrame and shellFrame:FindFirstChild("ActionLabels")
	if labels and labels:IsA("GuiObject") then
		labels.Visible = visible
	end
end

local function restoreCamera()
	local camera = Workspace.CurrentCamera
	if camera == nil then
		return
	end
	if savedCameraType ~= nil then
		camera.CameraType = savedCameraType
	end
	if savedCameraCFrame ~= nil then
		camera.CFrame = savedCameraCFrame
	end
	if savedFieldOfView ~= nil then
		camera.FieldOfView = savedFieldOfView
	end
	savedCameraType = nil
	savedCameraCFrame = nil
	savedFieldOfView = nil
end

local function frameAvatar()
	local camera = Workspace.CurrentCamera
	local character = player.Character
	local rootPart = character and character:FindFirstChild("HumanoidRootPart")
	if camera == nil or rootPart == nil or not rootPart:IsA("BasePart") then
		return
	end
	if savedCameraType == nil then
		savedCameraType = camera.CameraType
		savedCameraCFrame = camera.CFrame
		savedFieldOfView = camera.FieldOfView
	end

	local target = rootPart.Position + Vector3.new(0, 2.1, 0)
	local cameraPosition = rootPart.Position + (rootPart.CFrame.LookVector * 8) + Vector3.new(0, 2.2, 0)
	camera.CameraType = Enum.CameraType.Scriptable
	camera.FieldOfView = 48
	camera.CFrame = CFrame.lookAt(cameraPosition, target)
end

local function fetchState(): boolean
	local ok, result = pcall(function()
		return getState:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		state = result
		return true
	end
	return false
end

local function updateOutfitSlots()
	local slots = if type(state) == "table" then state.outfitSlots else nil
	for slot = 1, 4 do
		local occupied = type(slots) == "table" and slots[slot] == true
		local button = outfitSlotButtons[slot]
		button.Text = if occupied then ("Outfit " .. tostring(slot)) else ("+ Outfit " .. tostring(slot))
		button.BackgroundColor3 = if occupied then COLORS.tile else COLORS.white
		outfitDeleteButtons[slot].Visible = occupied
	end
end

local function categoryForPreset(presetId: string): string
	if presetId == "classic" or presetId == "blocky" or presetId == "original" then
		return "classic"
	elseif presetId == "compact" or presetId == "tall" or presetId == "petite" or presetId == "wide" or presetId == "slim" then
		return "body"
	else
		return "style"
	end
end

local function clearPresetGrid()
	for _, child in presetsScroll:GetChildren() do
		if child:IsA("GuiObject") and not child:IsA("UIGridLayout") then
			child:Destroy()
		end
	end
end

local function renderPresets()
	clearPresetGrid()
	for id, button in tabButtons do
		button.BackgroundColor3 = if id == activeCategory then COLORS.tileSelected else COLORS.white
	end

	local presets = if type(state) == "table" then state.avatarPresets else nil
	if type(presets) ~= "table" then
		return
	end
	local order = 1
	for _, preset in presets do
		local id = tostring(preset.Id or "")
		local category = categoryForPreset(id)
		if activeCategory == "all" or activeCategory == category then
			local card = Instance.new("TextButton")
			card.Name = "Preset_" .. id
			card.LayoutOrder = order
			card.Size = UDim2.fromOffset(84, 84)
			card.BackgroundColor3 = COLORS.white
			card.BackgroundTransparency = 0.14
			card.Text = ""
			card.ZIndex = 88
			card.Parent = presetsScroll
			round(card, 7)
			stroke(card, COLORS.border, 1, 0.45)

			local figure = Instance.new("TextLabel")
			figure.Name = "Figure"
			figure.Position = UDim2.fromOffset(5, 5)
			figure.Size = UDim2.new(1, -10, 0, 52)
			figure.BackgroundTransparency = 1
			figure.Text = if category == "classic" then "♟" elseif category == "body" then "♙" else "♟"
			figure.TextColor3 = COLORS.text
			figure.Font = Enum.Font.GothamBold
			figure.TextScaled = true
			figure.ZIndex = 89
			figure.Parent = card
			constrain(figure, 24, 38)

			local label = Instance.new("TextLabel")
			label.Name = "Label"
			label.Position = UDim2.fromOffset(4, 58)
			label.Size = UDim2.new(1, -8, 0, 20)
			label.BackgroundTransparency = 1
			label.Text = tostring(preset.Label or id)
			label.TextColor3 = COLORS.text
			label.Font = Enum.Font.GothamMedium
			label.TextScaled = true
			label.ZIndex = 89
			label.Parent = card
			constrain(label, 8, 10)

			local genderBadge = Instance.new("TextLabel")
			genderBadge.Name = "Badge"
			genderBadge.AnchorPoint = Vector2.new(1, 0)
			genderBadge.Position = UDim2.new(1, -3, 0, 3)
			genderBadge.Size = UDim2.fromOffset(16, 16)
			genderBadge.BackgroundTransparency = 1
			genderBadge.Text = if order % 2 == 0 then "♂" else "♀"
			genderBadge.TextColor3 = if order % 2 == 0 then COLORS.blue else COLORS.pink
			genderBadge.Font = Enum.Font.GothamBold
			genderBadge.TextScaled = true
			genderBadge.ZIndex = 90
			genderBadge.Parent = card

			card.Activated:Connect(function()
				local ok, result = pcall(function()
					return applyAvatarPreset:InvokeServer(id)
				end)
				if ok and type(result) == "table" and result.ok == true then
					showStatus("Look applied", true)
					task.delay(0.2, frameAvatar)
				else
					showStatus("Couldn't apply that look")
				end
			end)
			order += 1
		end
	end
end

local function setCategory(id: string)
	activeCategory = id
	renderPresets()
end

for id, button in tabButtons do
	button.Activated:Connect(function()
		if id == "saved" then
			activeCategory = "all"
			updateOutfitSlots()
			showStatus("Use My Outfits on the left")
			renderPresets()
		else
			setCategory(id)
		end
	end)
end

local function closeEditor()
	gui.Enabled = false
	restoreCamera()
	setShellLabelsVisible(true)
end

closeButton.Activated:Connect(closeEditor)
closeAvatarEditor.Event:Connect(closeEditor)

for slot = 1, 4 do
	outfitSlotButtons[slot].Activated:Connect(function()
		local occupied = type(state) == "table"
			and type(state.outfitSlots) == "table"
			and state.outfitSlots[slot] == true
		if occupied then
			local ok, result = pcall(function()
				return loadOutfit:InvokeServer(slot)
			end)
			if ok and type(result) == "table" and result.ok == true then
				showStatus("Outfit " .. tostring(slot) .. " loaded", true)
				task.delay(0.2, frameAvatar)
			else
				showStatus("Couldn't load that outfit")
			end
		else
			local ok, result = pcall(function()
				return saveOutfit:InvokeServer(slot)
			end)
			if ok and type(result) == "table" and result.ok == true then
				fetchState()
				updateOutfitSlots()
				showStatus("Outfit " .. tostring(slot) .. " saved", true)
			else
				showStatus("Couldn't save that outfit")
			end
		end
	end)

	outfitDeleteButtons[slot].Activated:Connect(function()
		local ok, result = pcall(function()
			return deleteOutfit:InvokeServer(slot)
		end)
		if ok and type(result) == "table" and result.ok == true then
			fetchState()
			updateOutfitSlots()
			showStatus("Outfit slot cleared")
		else
			showStatus("Couldn't clear that slot")
		end
	end)
end

resetButton.Activated:Connect(function()
	local ok, result = pcall(function()
		return resetAvatar:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		showStatus("Original avatar restored", true)
		task.delay(0.2, frameAvatar)
	else
		showStatus("Couldn't reset avatar")
	end
end)

saveCurrentButton.Activated:Connect(function()
	for slot = 1, 4 do
		local occupied = type(state) == "table"
			and type(state.outfitSlots) == "table"
			and state.outfitSlots[slot] == true
		if not occupied then
			local ok, result = pcall(function()
				return saveOutfit:InvokeServer(slot)
			end)
			if ok and type(result) == "table" and result.ok == true then
				fetchState()
				updateOutfitSlots()
				showStatus("Saved to Outfit " .. tostring(slot), true)
				return
			end
		end
	end
	showStatus("All outfit slots are full")
end)

undoButton.Activated:Connect(function()
	local ok, result = pcall(function()
		return resetAvatar:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		showStatus("Original avatar restored", true)
		task.delay(0.2, frameAvatar)
	else
		showStatus("Couldn't reset avatar")
	end
end)

reloadButton.Activated:Connect(function()
	fetchState()
	updateOutfitSlots()
	renderPresets()
	showStatus("Avatar menu refreshed", true)
end)

randomButton.Activated:Connect(function()
	local presets = if type(state) == "table" then state.avatarPresets else nil
	if type(presets) ~= "table" or #presets == 0 then
		return
	end
	currentPresetIndex += 1
	if currentPresetIndex > #presets then
		currentPresetIndex = 1
	end
	local preset = presets[currentPresetIndex]
	local ok, result = pcall(function()
		return applyAvatarPreset:InvokeServer(preset.Id)
	end)
	if ok and type(result) == "table" and result.ok == true then
		showStatus(tostring(preset.Label or "Look") .. " applied", true)
		task.delay(0.2, frameAvatar)
	end
end)

profileButton.Activated:Connect(function()
	showStatus("My Outfits saves your current Roblox look")
end)

openAvatarEditor.Event:Connect(function()
	if not fetchState() then
		return
	end
	local shellGui = playerGui:FindFirstChild("BrookhavenMirrorSidebar")
	if shellGui then
		local shellFrame = shellGui:FindFirstChild("BrookhavenWorldShell")
		if shellFrame then
			local contextPanel = shellFrame:FindFirstChild("BrookhavenContextPanel")
			if contextPanel and contextPanel:IsA("GuiObject") then
				contextPanel.Visible = false
			end
			local plotSelector = shellFrame:FindFirstChild("HousePlotSelector")
			if plotSelector and plotSelector:IsA("GuiObject") then
				plotSelector.Visible = false
			end
		end
	end
	gui.Enabled = true
	setShellLabelsVisible(false)
	updateOutfitSlots()
	renderPresets()
	task.defer(frameAvatar)
end)

player.CharacterAdded:Connect(function()
	if gui.Enabled then
		task.delay(0.5, frameAvatar)
	end
end)
