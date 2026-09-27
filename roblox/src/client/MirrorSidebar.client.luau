--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local mirrorRemotes = ReplicatedStorage:WaitForChild("StarBloxMirror")
local mirrorGetState = mirrorRemotes:WaitForChild("GetState") :: RemoteFunction
local purchaseVehicle = mirrorRemotes:WaitForChild("PurchaseVehicle") :: RemoteFunction
local spawnVehicle = mirrorRemotes:WaitForChild("SpawnVehicle") :: RemoteFunction
local despawnVehicle = mirrorRemotes:WaitForChild("DespawnVehicle") :: RemoteFunction
local purchaseTool = mirrorRemotes:WaitForChild("PurchaseTool") :: RemoteFunction
local equipTool = mirrorRemotes:WaitForChild("EquipTool") :: RemoteFunction
local clearTools = mirrorRemotes:WaitForChild("ClearTools") :: RemoteFunction

local roleplayRemotes = ReplicatedStorage:WaitForChild("StarBloxRoleplay")
local roleplayGetState = roleplayRemotes:WaitForChild("GetState") :: RemoteFunction
local setJob = roleplayRemotes:WaitForChild("SetJob") :: RemoteFunction
local saveBio = roleplayRemotes:WaitForChild("SaveBio") :: RemoteFunction
local resetAvatar = roleplayRemotes:WaitForChild("ResetAvatar") :: RemoteFunction

local familyRemotes = ReplicatedStorage:WaitForChild("StarBloxFamily")
local familyGetState = familyRemotes:WaitForChild("GetState") :: RemoteFunction
local familyInvite = familyRemotes:WaitForChild("Invite") :: RemoteFunction
local familyRespond = familyRemotes:WaitForChild("RespondInvite") :: RemoteFunction
local familyLeave = familyRemotes:WaitForChild("Leave") :: RemoteFunction
local familyRemoveMember = familyRemotes:WaitForChild("RemoveMember") :: RemoteFunction
local familyStateChanged = familyRemotes:WaitForChild("StateChanged") :: RemoteEvent

local quickChatRemotes = ReplicatedStorage:WaitForChild("StarBloxQuickChat")
local quickChatGetOptions = quickChatRemotes:WaitForChild("GetOptions") :: RemoteFunction
local quickChatSend = quickChatRemotes:WaitForChild("Send") :: RemoteFunction

local shopRemotes = ReplicatedStorage:WaitForChild("StarBloxShop")
local getPlots = shopRemotes:WaitForChild("GetPlots") :: RemoteFunction
local selectPlot = shopRemotes:WaitForChild("SelectPlot") :: RemoteFunction
local visitHome = shopRemotes:WaitForChild("VisitHome") :: RemoteFunction
local returnWorld = shopRemotes:WaitForChild("ReturnWorld") :: RemoteFunction

local shopGui = playerGui:WaitForChild("StarBloxShopUI", 10)
local openStore = if shopGui then shopGui:FindFirstChild("OpenStore") else nil

local UI = {
	white = Color3.fromRGB(248, 249, 250),
	tile = Color3.fromRGB(237, 240, 243),
	tileSelected = Color3.fromRGB(218, 235, 244),
	border = Color3.fromRGB(164, 174, 184),
	text = Color3.fromRGB(40, 40, 40),
	muted = Color3.fromRGB(90, 90, 90),
	red = Color3.fromRGB(205, 36, 36),
	green = Color3.fromRGB(69, 176, 88),
	cyan = Color3.fromRGB(30, 203, 216),
	blue = Color3.fromRGB(132, 211, 238),
	dark = Color3.fromRGB(25, 30, 35),
	glassTop = Color3.fromRGB(255, 255, 255),
	glassBottom = Color3.fromRGB(237, 241, 245),
	glassStroke = Color3.fromRGB(255, 255, 255),
	selected = Color3.fromRGB(210, 235, 248),
	icon = Color3.fromRGB(31, 38, 45),
} 

local ICONS: {[string]: string} = table.freeze({
	avatar = "rbxassetid://6022668898",
	tools = "rbxassetid://6023426938",
	animations = "rbxassetid://6034754445",
	vehicle = "rbxassetid://6034754441",
	house = "rbxassetid://3926305904",
	camera = "rbxassetid://6031572307",
	family = "rbxassetid://6035121916",
	quickChat = "rbxassetid://6034333271",
	shop = "rbxassetid://6031265976",
	settings = "rbxassetid://6031280882",
})

local function round(guiObject: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = guiObject
end

local function stroke(guiObject: GuiObject, color: Color3?, thickness: number?, transparency: number?)
	local line = Instance.new("UIStroke")
	line.Color = color or UI.border
	line.Thickness = thickness or 1
	line.Transparency = transparency or 0.25
	line.Parent = guiObject
end

local function glass(guiObject: GuiObject, radius: number)
	round(guiObject, radius)
	local line = Instance.new("UIStroke")
	line.Name = "GlassStroke"
	line.Color = UI.glassStroke
	line.Thickness = 1
	line.Transparency = 0.52
	line.Parent = guiObject

	local gradient = Instance.new("UIGradient")
	gradient.Name = "GlassGradient"
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, UI.glassTop),
		ColorSequenceKeypoint.new(1, UI.glassBottom),
	})
	gradient.Rotation = 90
	gradient.Parent = guiObject
end

local function iconLabel(parent: GuiObject, name: string, image: string, size: number): ImageLabel
	local icon = Instance.new("ImageLabel")
	icon.Name = name
	icon.AnchorPoint = Vector2.new(0.5, 0.5)
	icon.Position = UDim2.fromScale(0.5, 0.5)
	icon.Size = UDim2.fromOffset(size, size)
	icon.BackgroundTransparency = 1
	icon.Image = image
	icon.ImageColor3 = UI.icon
	icon.ScaleType = Enum.ScaleType.Fit
	icon.ZIndex = parent.ZIndex + 1
	icon.Parent = parent
	return icon
end

local function constrain(label: TextLabel | TextButton | TextBox, minSize: number, maxSize: number)
	local c = Instance.new("UITextSizeConstraint")
	c.MinTextSize = minSize
	c.MaxTextSize = maxSize
	c.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "BrookhavenMirrorSidebar"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 28
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

-- The custom StarBlox opening runs before this client shell. Once gameplay is visible,
-- the persistent chrome intentionally follows the Brookhaven reference recording.
local shell = Instance.new("Frame")
shell.Name = "BrookhavenWorldShell"
shell.Size = UDim2.fromScale(1, 1)
shell.BackgroundTransparency = 1
shell.Parent = gui

local shellScale = Instance.new("UIScale")
shellScale.Scale = 1
shellScale.Parent = shell

local function updateScale()
	local camera = workspace.CurrentCamera
	if camera == nil then
		return
	end
	local viewport = camera.ViewportSize
	if viewport.X >= viewport.Y then
		-- Keep landscape iPhone chrome at true safe-area anchors. Scaling the
		-- full root pulled right-anchored controls inward and made the HUD float
		-- near mid-screen in the v36 recording.
		shellScale.Scale = 1
	else
		shellScale.Scale = math.clamp(viewport.X / 960, 0.72, 1)
	end
end

updateScale()
if workspace.CurrentCamera then
	workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
end
workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(function()
	updateScale()
	if workspace.CurrentCamera then
		workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(updateScale)
	end
end)

local topCluster = Instance.new("Frame")
topCluster.Name = "TopUtilityCluster"
topCluster.AnchorPoint = Vector2.new(1, 0)
topCluster.Position = UDim2.new(1, -72, 0, 8)
topCluster.Size = UDim2.fromOffset(282, 38)
topCluster.BackgroundTransparency = 1
topCluster.ZIndex = 34
topCluster.Parent = shell

local function makeTopUtilityButton(
	name: string,
	iconAsset: string,
	labelText: string,
	position: UDim2,
	size: UDim2
): ImageButton
	local button = Instance.new("ImageButton")
	button.Name = name
	button.Position = position
	button.Size = size
	button.BackgroundColor3 = UI.white
	button.BackgroundTransparency = 0.16
	button.Image = ""
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 35
	button.Parent = shell
	glass(button, 10)

	local icon = Instance.new("ImageLabel")
	icon.Name = "Icon"
	icon.AnchorPoint = Vector2.new(0, 0.5)
	icon.Position = UDim2.new(0, 7, 0.5, 0)
	icon.Size = UDim2.fromOffset(18, 18)
	icon.BackgroundTransparency = 1
	icon.Image = iconAsset
	icon.ImageColor3 = UI.icon
	icon.ScaleType = Enum.ScaleType.Fit
	icon.ZIndex = 36
	icon.Parent = button

	local label = Instance.new("TextLabel")
	label.Name = "Label"
	label.Position = UDim2.new(0, 28, 0, 0)
	label.Size = UDim2.new(1, -32, 1, 0)
	label.BackgroundTransparency = 1
	label.Text = labelText
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamMedium
	label.TextSize = 12
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.ZIndex = 36
	label.Parent = button
	return button
end

local function makeSquareIconButton(
	name: string,
	iconAsset: string,
	position: UDim2,
	size: number,
	iconSize: number
): ImageButton
	local button = Instance.new("ImageButton")
	button.Name = name
	button.Position = position
	button.Size = UDim2.fromOffset(size, size)
	button.BackgroundColor3 = UI.white
	button.BackgroundTransparency = 0.16
	button.Image = ""
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 35
	button.Parent = shell
	glass(button, 11)
	iconLabel(button, "Icon", iconAsset, iconSize)
	return button
end

-- Persistent chrome now uses actual image assets rather than Unicode or code-drawn silhouettes.
local quickChatBolt = makeSquareIconButton(
	"QuickChatBolt",
	ICONS.quickChat,
	UDim2.fromOffset(304, 9),
	40,
	24
)

local quickChatArrow = Instance.new("TextLabel")
quickChatArrow.Name = "QuickChatArrow"
quickChatArrow.Position = UDim2.fromOffset(365, 17)
quickChatArrow.Size = UDim2.fromOffset(38, 29)
quickChatArrow.BackgroundTransparency = 1
quickChatArrow.Text = "←"
quickChatArrow.TextColor3 = UI.cyan
quickChatArrow.Font = Enum.Font.GothamBold
quickChatArrow.TextSize = 20
quickChatArrow.ZIndex = 36
quickChatArrow.Parent = shell
quickChatArrow.Visible = false

local quickChatButton = makeTopUtilityButton(
	"QuickChatButton",
	ICONS.quickChat,
	"Quick Chat",
	UDim2.fromOffset(414, 17),
	UDim2.fromOffset(108, 30)
)
quickChatButton.Visible = false

local homeCamsButton = makeTopUtilityButton(
	"HomeCamsButton",
	ICONS.camera,
	"Cams",
	UDim2.new(1, -284, 0, 8),
	UDim2.fromOffset(80, 38)
)
homeCamsButton.BackgroundColor3 = Color3.fromRGB(223, 241, 250)

local clockBox = Instance.new("Frame")
clockBox.Name = "Clock"
clockBox.Position = UDim2.new(1, -194, 0, 8)
clockBox.Size = UDim2.fromOffset(82, 38)
clockBox.BackgroundColor3 = Color3.fromRGB(223, 241, 250)
clockBox.BackgroundTransparency = 0.08
clockBox.ZIndex = 35
clockBox.Parent = shell
glass(clockBox, 10)

local clockTime = Instance.new("TextLabel")
clockTime.Name = "Time"
clockTime.Position = UDim2.fromOffset(5, 2)
clockTime.Size = UDim2.new(1, -10, 0, 20)
clockTime.BackgroundTransparency = 1
clockTime.Text = "--:-- --"
clockTime.TextColor3 = UI.text
clockTime.Font = Enum.Font.GothamMedium
clockTime.TextSize = 13
clockTime.ZIndex = 36
clockTime.Parent = clockBox

local clockDay = Instance.new("TextLabel")
clockDay.Name = "Day"
clockDay.Position = UDim2.fromOffset(5, 20)
clockDay.Size = UDim2.new(1, -10, 0, 14)
clockDay.BackgroundTransparency = 1
clockDay.Text = "Monday"
clockDay.TextColor3 = UI.muted
clockDay.Font = Enum.Font.GothamMedium
clockDay.TextSize = 10
clockDay.ZIndex = 36
clockDay.Parent = clockBox

local familyButton = makeTopUtilityButton(
	"FamilyButton",
	ICONS.family,
	"Family",
	UDim2.new(1, -284, 0, 50),
	UDim2.fromOffset(112, 30)
)

quickChatBolt.Parent = topCluster
quickChatBolt.Position = UDim2.fromOffset(0, 1)
quickChatBolt.Size = UDim2.fromOffset(36, 36)

homeCamsButton.Parent = topCluster
homeCamsButton.Position = UDim2.fromOffset(42, 1)
homeCamsButton.Size = UDim2.fromOffset(70, 36)

clockBox.Parent = topCluster
clockBox.Position = UDim2.fromOffset(202, 1)
clockBox.Size = UDim2.fromOffset(80, 36)

familyButton.Parent = topCluster
familyButton.Position = UDim2.fromOffset(118, 1)
familyButton.Size = UDim2.fromOffset(78, 36)

-- The small shop shortcut uses the same visual system and a real icon asset.
local shopShortcut = makeSquareIconButton(
	"ShopShortcut",
	ICONS.shop,
	UDim2.new(0, 80, 0.5, -18),
	38,
	22
)

local shopBadge = Instance.new("TextLabel")
shopBadge.Name = "Badge"
shopBadge.AnchorPoint = Vector2.new(1, 0)
shopBadge.Position = UDim2.new(1, 1, 0, -2)
shopBadge.Size = UDim2.fromOffset(14, 14)
shopBadge.BackgroundColor3 = UI.blue
shopBadge.Text = "★"
shopBadge.TextColor3 = Color3.new(1, 1, 1)
shopBadge.Font = Enum.Font.GothamBold
shopBadge.TextSize = 8
shopBadge.ZIndex = 37
shopBadge.Parent = shopShortcut
round(shopBadge, 7)

local function updateClock()
	local now = DateTime.now()
	local okTime, localTime = pcall(function()
		return now:FormatLocalTime("h:mm A", "en-us")
	end)
	local okDay, localDay = pcall(function()
		return now:FormatLocalTime("dddd", "en-us")
	end)
	clockTime.Text = if okTime then localTime else "--:-- --"
	clockDay.Text = if okDay then localDay else ""
end

updateClock()
task.spawn(function()
	while gui.Parent ~= nil do
		task.wait(30)
		updateClock()
	end
end)

-- Right-side action stack: exactly the five world actions visible in the reference recording.
local rail = Instance.new("Frame")
rail.Name = "RightActionRail"
rail.AnchorPoint = Vector2.new(1, 0)
rail.Position = UDim2.new(1, -12, 0, 86)
rail.Size = UDim2.fromOffset(48, 236)
rail.BackgroundTransparency = 1
rail.ZIndex = 40
rail.Parent = shell

local railLayout = Instance.new("UIListLayout")
railLayout.Padding = UDim.new(0, 4)
railLayout.HorizontalAlignment = Enum.HorizontalAlignment.Center
railLayout.SortOrder = Enum.SortOrder.LayoutOrder
railLayout.Parent = rail

local labelLayer = Instance.new("Frame")
labelLayer.Name = "ActionLabels"
labelLayer.Size = UDim2.fromScale(1, 1)
labelLayer.BackgroundTransparency = 1
labelLayer.ZIndex = 39
labelLayer.Parent = shell

local actionLabels: {GuiObject} = {}

-- Persistent rail controls use real image assets. The small primitive helper below
-- remains only for the house plot-selector artwork, not the world HUD.
local function iconPart(
	parent: GuiObject,
	name: string,
	position: UDim2,
	size: UDim2,
	rotation: number?,
	radius: number?
): Frame
	local part = Instance.new("Frame")
	part.Name = name
	part.Position = position
	part.Size = size
	part.Rotation = rotation or 0
	part.BackgroundColor3 = UI.dark
	part.BorderSizePixel = 0
	part.ZIndex = parent.ZIndex + 1
	part.Parent = parent
	round(part, radius or 2)
	return part
end

local function drawRailIcon(button: GuiObject, iconName: string)
	local asset = ICONS[iconName]
	assert(asset ~= nil, "Unknown action icon: " .. iconName)
	local icon = iconLabel(button, "Icon", asset, 24)
	icon.ImageColor3 = UI.icon
	if iconName == "house" then
		icon.ImageRectOffset = Vector2.new(964, 204)
		icon.ImageRectSize = Vector2.new(36, 36)
	end
end

local function drawMiniHouse(parent: GuiObject, prefix: string, x: number, y: number)
	local image = Instance.new("ImageLabel")
	image.Name = prefix .. "House"
	image.Position = UDim2.fromOffset(x, y)
	image.Size = UDim2.fromOffset(22, 22)
	image.BackgroundTransparency = 1
	image.Image = ICONS.house
	image.ImageRectOffset = Vector2.new(964, 204)
	image.ImageRectSize = Vector2.new(36, 36)
	image.ImageColor3 = UI.icon
	image.ScaleType = Enum.ScaleType.Fit
	image.ZIndex = parent.ZIndex + 1
	image.Parent = parent
	return image
end

local function drawPlotModeIcon(button: TextButton, modeIndex: number)
	local icon = Instance.new("Frame")
	icon.Name = "PlotModePictogram"
	icon.Size = UDim2.fromScale(1, 1)
	icon.BackgroundTransparency = 1
	icon.ZIndex = button.ZIndex + 1
	icon.Parent = button

	if modeIndex == 1 then
		drawMiniHouse(icon, "Owned", 31, 11)
		local check = Instance.new("TextLabel")
		check.Name = "Check"
		check.Position = UDim2.fromOffset(52, 7)
		check.Size = UDim2.fromOffset(18, 18)
		check.BackgroundTransparency = 1
		check.Text = "✓"
		check.TextColor3 = UI.green
		check.Font = Enum.Font.GothamBold
		check.TextSize = 14
		check.ZIndex = icon.ZIndex + 2
		check.Parent = icon
	elseif modeIndex == 2 then
		drawMiniHouse(icon, "First", 20, 11)
		drawMiniHouse(icon, "Second", 46, 11)
	else
		drawMiniHouse(icon, "Town", 31, 11)
	end
end

local function actionButton(iconName: string, name: string, _labelText: string, order: number): ImageButton
	local holder = Instance.new("Frame")
	holder.Name = name .. "Holder"
	holder.LayoutOrder = order
	holder.Size = UDim2.fromOffset(44, 44)
	holder.BackgroundTransparency = 1
	holder.Parent = rail

	local shadow = Instance.new("Frame")
	shadow.Name = "Shadow"
	shadow.Position = UDim2.fromOffset(1, 2)
	shadow.Size = UDim2.fromScale(1, 1)
	shadow.BackgroundColor3 = Color3.fromRGB(0, 0, 0)
	shadow.BackgroundTransparency = 0.90
	shadow.BorderSizePixel = 0
	shadow.ZIndex = 40
	shadow.Parent = holder
	round(shadow, 14)

	local button = Instance.new("ImageButton")
	button.Name = name .. "Button"
	button.Size = UDim2.fromScale(1, 1)
	button.BackgroundColor3 = UI.white
	button.BackgroundTransparency = 0.15
	button.Image = ""
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 41
	button.Parent = holder
	glass(button, 14)
	drawRailIcon(button, iconName)
	return button
end

local avatarBtn = actionButton("avatar", "Avatar", "Avatar Editor", 1)
local toolsBtn = actionButton("tools", "Tools", "Tools", 2)
local animationsBtn = actionButton("animations", "Animations", "Animations", 3)
local vehicleBtn = actionButton("vehicle", "Vehicle", "Vehicle", 4)
local houseBtn = actionButton("house", "House", "House", 5)

local railButtons = {avatarBtn, toolsBtn, animationsBtn, vehicleBtn, houseBtn}

local function setRailSelection(selected: ImageButton?)
	for _, button in railButtons do
		local active = button == selected
		button.BackgroundColor3 = if active then UI.selected else UI.white
		button.BackgroundTransparency = if active then 0.13 else 0.15
		local icon = button:FindFirstChild("Icon")
		if icon ~= nil and icon:IsA("ImageLabel") then
			icon.ImageColor3 = if active then Color3.fromRGB(20, 79, 107) else UI.icon
		end
		local line = button:FindFirstChild("GlassStroke")
		if line ~= nil and line:IsA("UIStroke") then
			line.Transparency = if active then 0.20 else 0.52
		end
	end
end

local settingsButton = Instance.new("ImageButton")
settingsButton.Name = "WorldSettingsButton"
settingsButton.AnchorPoint = Vector2.new(0, 1)
settingsButton.Position = UDim2.new(0, 92, 1, -12)
settingsButton.Size = UDim2.fromOffset(34, 34)
settingsButton.BackgroundColor3 = UI.white
settingsButton.BackgroundTransparency = 0.12
settingsButton.Image = ""
settingsButton.ZIndex = 35
settingsButton.Parent = shell
settingsButton.Visible = false
settingsButton.Active = false
glass(settingsButton, 10)
iconLabel(settingsButton, "Icon", ICONS.settings, 20)

-- Context menus use a single compact glass card next to the persistent action rail.
local panel = Instance.new("Frame")
panel.Name = "BrookhavenContextPanel"
panel.AnchorPoint = Vector2.new(1, 0)
panel.Position = UDim2.new(1, -70, 0, 96)
panel.Size = UDim2.fromOffset(288, 300)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 0.06
panel.Visible = false
panel.ZIndex = 70
panel.Parent = shell
glass(panel, 14)

local panelTitle = Instance.new("TextLabel")
panelTitle.Name = "PanelTitle"
panelTitle.Position = UDim2.fromOffset(12, 8)
panelTitle.Size = UDim2.new(1, -58, 0, 34)
panelTitle.BackgroundTransparency = 1
panelTitle.Text = ""
panelTitle.TextColor3 = UI.text
panelTitle.Font = Enum.Font.GothamBold
panelTitle.TextSize = 16
panelTitle.TextXAlignment = Enum.TextXAlignment.Left
panelTitle.ZIndex = 71
panelTitle.Parent = panel

local close = Instance.new("TextButton")
close.Name = "Close"
close.AnchorPoint = Vector2.new(1, 0)
close.Position = UDim2.new(1, -8, 0, 8)
close.Size = UDim2.fromOffset(30, 30)
close.BackgroundColor3 = UI.red
close.BackgroundTransparency = 0.02
close.Text = "×"
close.TextColor3 = Color3.new(1, 1, 1)
close.Font = Enum.Font.GothamBold
close.TextSize = 20
close.ZIndex = 74
close.Parent = panel
round(close, 10)
stroke(close, Color3.fromRGB(160, 35, 35), 1, 0.35)

local panelToolbar = Instance.new("Frame")
panelToolbar.Name = "PanelToolbar"
panelToolbar.Position = UDim2.fromOffset(12, 48)
panelToolbar.Size = UDim2.new(1, -24, 0, 38)
panelToolbar.BackgroundTransparency = 1
panelToolbar.Visible = false
panelToolbar.ZIndex = 73
panelToolbar.Parent = panel

local toolbarLayout = Instance.new("UIListLayout")
toolbarLayout.FillDirection = Enum.FillDirection.Horizontal
toolbarLayout.Padding = UDim.new(0, 5)
toolbarLayout.SortOrder = Enum.SortOrder.LayoutOrder
toolbarLayout.Parent = panelToolbar

local function clearToolbar()
	for _, child in panelToolbar:GetChildren() do
		if child:IsA("GuiObject") then
			child:Destroy()
		end
	end
	panelToolbar.Visible = false
end

local function toolbarButton(
	name: string,
	symbol: string,
	selected: boolean,
	order: number,
	callback: () -> ()
)
	local button = Instance.new("TextButton")
	button.Name = name
	button.LayoutOrder = order
	button.Size = UDim2.fromOffset(36, 36)
	button.BackgroundColor3 = if selected then UI.selected else UI.white
	button.BackgroundTransparency = if selected then 0.08 else 0.18
	button.Text = symbol
	button.TextColor3 = UI.text
	button.Font = Enum.Font.GothamBold
	button.TextSize = 16
	button.ZIndex = 74
	button.Parent = panelToolbar
	round(button, 10)
	stroke(button, UI.border, 1, 0.55)
	button.Activated:Connect(callback)
	return button
end

local statusText = Instance.new("TextLabel")
statusText.Name = "Status"
statusText.AnchorPoint = Vector2.new(0, 1)
statusText.Position = UDim2.new(0, 12, 1, -10)
statusText.Size = UDim2.new(1, -24, 0, 24)
statusText.BackgroundColor3 = UI.white
statusText.BackgroundTransparency = 0.10
statusText.Text = ""
statusText.TextColor3 = UI.muted
statusText.Font = Enum.Font.GothamMedium
statusText.TextSize = 10
statusText.Visible = false
statusText.ZIndex = 72
statusText.Parent = panel
round(statusText, 8)

local scroller = Instance.new("ScrollingFrame")
scroller.Name = "Grid"
scroller.Position = UDim2.fromOffset(56, 94)
scroller.Size = UDim2.new(1, -68, 1, -106)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0, 0)
scroller.ScrollBarThickness = 0
scroller.ZIndex = 71
scroller.Parent = panel

local categoryRail = Instance.new("Frame")
categoryRail.Name = "CategoryRail"
categoryRail.Position = UDim2.fromOffset(12, 94)
categoryRail.Size = UDim2.fromOffset(38, 194)
categoryRail.BackgroundTransparency = 1
categoryRail.Visible = false
categoryRail.ZIndex = 72
categoryRail.Parent = panel

local categoryList = Instance.new("UIListLayout")
categoryList.Padding = UDim.new(0, 4)
categoryList.HorizontalAlignment = Enum.HorizontalAlignment.Center
categoryList.SortOrder = Enum.SortOrder.LayoutOrder
categoryList.Parent = categoryRail

local grid = Instance.new("UIGridLayout")
grid.CellPadding = UDim2.fromOffset(5, 5)
grid.CellSize = UDim2.fromOffset(58, 58)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.HorizontalAlignment = Enum.HorizontalAlignment.Center
grid.Parent = scroller

-- Compact house/plot picker uses the same card language instead of covering the middle of the screen.
local plotSelector = Instance.new("Frame")
plotSelector.Name = "HousePlotSelector"
plotSelector.AnchorPoint = Vector2.new(1, 0)
plotSelector.Position = UDim2.new(1, -70, 0, 96)
plotSelector.Size = UDim2.fromOffset(300, 184)
plotSelector.BackgroundColor3 = UI.white
plotSelector.BackgroundTransparency = 0.06
plotSelector.Visible = false
plotSelector.ZIndex = 68
plotSelector.Parent = shell
glass(plotSelector, 14)

local plotModes = Instance.new("Frame")
plotModes.Name = "PlotModes"
plotModes.Position = UDim2.fromOffset(10, 10)
plotModes.Size = UDim2.fromOffset(280, 44)
plotModes.BackgroundTransparency = 1
plotModes.ZIndex = 69
plotModes.Parent = plotSelector

for index = 1, 3 do
	local mode = Instance.new("TextButton")
	mode.Name = "Mode" .. tostring(index)
	mode.Position = UDim2.fromOffset((index - 1) * 94, 0)
	mode.Size = UDim2.fromOffset(88, 44)
	mode.BackgroundColor3 = if index == 1 then UI.selected else UI.tile
	mode.BackgroundTransparency = if index == 1 then 0.08 else 0.18
	mode.Text = ""
	mode.AutoButtonColor = false
	mode.Active = false
	mode.ZIndex = 70
	mode.Parent = plotModes
	round(mode, 10)
	stroke(mode, UI.border, 1, 0.55)
	drawPlotModeIcon(mode, index)
end

local plotCard = Instance.new("Frame")
plotCard.Name = "PlotCard"
plotCard.AnchorPoint = Vector2.new(0.5, 0)
plotCard.Position = UDim2.new(0.5, 0, 0, 64)
plotCard.Size = UDim2.fromOffset(180, 56)
plotCard.BackgroundColor3 = UI.tile
plotCard.BackgroundTransparency = 0.10
plotCard.ZIndex = 69
plotCard.Parent = plotSelector
round(plotCard, 10)
stroke(plotCard, UI.border, 1, 0.55)

local plotTitle = Instance.new("TextLabel")
plotTitle.Name = "PlotTitle"
plotTitle.Position = UDim2.fromOffset(8, 4)
plotTitle.Size = UDim2.new(1, -16, 0, 25)
plotTitle.BackgroundTransparency = 1
plotTitle.Text = "House #1"
plotTitle.TextColor3 = UI.text
plotTitle.Font = Enum.Font.GothamBold
plotTitle.TextSize = 15
plotTitle.ZIndex = 70
plotTitle.Parent = plotCard

local plotStatus = Instance.new("TextLabel")
plotStatus.Name = "PlotStatus"
plotStatus.Position = UDim2.fromOffset(8, 30)
plotStatus.Size = UDim2.new(1, -16, 0, 18)
plotStatus.BackgroundTransparency = 1
plotStatus.Text = "Vacant"
plotStatus.TextColor3 = UI.muted
plotStatus.Font = Enum.Font.GothamMedium
plotStatus.TextSize = 11
plotStatus.ZIndex = 70
plotStatus.Parent = plotCard

local function plotArrow(name: string, text: string, x: number): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.AnchorPoint = Vector2.new(0.5, 0)
	button.Position = UDim2.new(0.5, x, 0, 72)
	button.Size = UDim2.fromOffset(40, 40)
	button.BackgroundColor3 = UI.white
	button.BackgroundTransparency = 0.14
	button.Text = text
	button.TextColor3 = UI.text
	button.Font = Enum.Font.GothamBold
	button.TextSize = 22
	button.ZIndex = 70
	button.Parent = plotSelector
	round(button, 12)
	stroke(button, UI.border, 1, 0.5)
	return button
end

local previousPlot = plotArrow("PreviousPlot", "←", -116)
local nextPlot = plotArrow("NextPlot", "→", 116)

local plotGo = Instance.new("TextButton")
plotGo.Name = "PlotGo"
plotGo.AnchorPoint = Vector2.new(0.5, 0)
plotGo.Position = UDim2.new(0.5, -63, 0, 132)
plotGo.Size = UDim2.fromOffset(120, 38)
plotGo.BackgroundColor3 = UI.green
plotGo.BackgroundTransparency = 0.02
plotGo.Text = "CLAIM"
plotGo.TextColor3 = Color3.new(1, 1, 1)
plotGo.Font = Enum.Font.GothamBold
plotGo.TextSize = 15
plotGo.ZIndex = 70
plotGo.Parent = plotSelector
round(plotGo, 10)
stroke(plotGo, Color3.fromRGB(37, 126, 56), 1, 0.25)

local plotCatalog = Instance.new("TextButton")
plotCatalog.Name = "HouseCatalog"
plotCatalog.AnchorPoint = Vector2.new(0.5, 0)
plotCatalog.Position = UDim2.new(0.5, 63, 0, 132)
plotCatalog.Size = UDim2.fromOffset(120, 38)
plotCatalog.BackgroundColor3 = Color3.fromRGB(74, 153, 224)
plotCatalog.BackgroundTransparency = 0.02
plotCatalog.Text = "CHANGE"
plotCatalog.TextColor3 = Color3.new(1, 1, 1)
plotCatalog.Font = Enum.Font.GothamBold
plotCatalog.TextSize = 13
plotCatalog.Visible = false
plotCatalog.ZIndex = 70
plotCatalog.Parent = plotSelector
round(plotCatalog, 10)
stroke(plotCatalog, Color3.fromRGB(41, 99, 153), 1, 0.25)

local function setSecondaryChromeVisible(visible: boolean)
	topCluster.Visible = visible
	shopShortcut.Visible = visible
	rail.Visible = visible
end

local mirrorState = nil
local roleplayState = nil
local busy = false
local activeToolCategory = "all"
local activeVehicleCategory = "street"
local activeToolOwnedOnly = false
local activeVehicleOwnedOnly = false
local activeQuickChatCategory = "phrases"
local quickChatState = nil
local actionHintsDismissed = true
local plotState = nil
local plotIndex = 1

local function setActionLabelsVisible(visible: boolean)
	local finalVisible = visible and not actionHintsDismissed
	for _, item in actionLabels do
		item.Visible = finalVisible
	end
end

local function dismissActionHints()
	if actionHintsDismissed then
		return
	end
	actionHintsDismissed = true
	for _, item in actionLabels do
		item.Visible = false
	end
	quickChatArrow.Visible = false
	quickChatButton.Visible = false
end

local function clearCategories()
	for _, child in categoryRail:GetChildren() do
		if child:IsA("GuiObject") then
			child:Destroy()
		end
	end
	categoryRail.Visible = false
end

local function setCategories(
	entries: {{Id: string, Symbol: string}},
	selectedId: string,
	onSelect: (string) -> ()
)
	clearCategories()
	categoryRail.Visible = true
	for order, entry in entries do
		local button = Instance.new("TextButton")
		button.Name = "Category_" .. entry.Id
		button.LayoutOrder = order
		button.Size = UDim2.fromOffset(36, 36)
		button.BackgroundColor3 = if entry.Id == selectedId then UI.tileSelected else UI.white
		button.BackgroundTransparency = 0.16
		button.Text = entry.Symbol
		button.TextColor3 = UI.text
		button.Font = Enum.Font.GothamBold
		button.TextSize = 17
		button.ZIndex = 73
		button.Parent = categoryRail
		round(button, 10)
		stroke(button, UI.border, 1, 0.55)
		button.Activated:Connect(function()
			onSelect(entry.Id)
		end)
	end
end

local function clearGrid()
	statusText.Visible = false
	for _, child in scroller:GetChildren() do
		if child:IsA("GuiObject") and not child:IsA("UIGridLayout") then
			child:Destroy()
		end
	end
end


local function configureTextPanel()
	panel.Position = UDim2.new(1, -70, 0, 96)
	panel.Size = UDim2.fromOffset(288, 300)
	panelTitle.Visible = true
	panelToolbar.Visible = false
	categoryRail.Position = UDim2.fromOffset(12, 50)
	categoryRail.Size = UDim2.fromOffset(38, 238)
	categoryList.Padding = UDim.new(0, 4)
	grid.CellPadding = UDim2.fromOffset(5, 5)
	grid.CellSize = UDim2.fromOffset(70, 62)
	scroller.Position = UDim2.fromOffset(56, 50)
	scroller.Size = UDim2.new(1, -68, 1, -62)
end

local function configureIconPanel(withCategoryRail: boolean)
	panel.Position = UDim2.new(1, -70, 0, 96)
	panel.Size = UDim2.fromOffset(288, 300)
	panelTitle.Visible = true
	panelToolbar.Position = UDim2.fromOffset(12, 48)
	panelToolbar.Size = UDim2.new(1, -58, 0, 38)
	panelToolbar.Visible = true
	categoryRail.Position = UDim2.fromOffset(12, 94)
	categoryRail.Size = UDim2.fromOffset(38, 194)
	categoryList.Padding = UDim.new(0, 4)
	grid.CellPadding = UDim2.fromOffset(5, 5)
	grid.CellSize = UDim2.fromOffset(58, 58)
	if withCategoryRail then
		scroller.Position = UDim2.fromOffset(56, 94)
		scroller.Size = UDim2.new(1, -68, 1, -106)
	else
		scroller.Position = UDim2.fromOffset(12, 94)
		scroller.Size = UDim2.new(1, -24, 1, -106)
	end
end

local function setHeader(nextTitle: string)
	plotSelector.Visible = false
	panelTitle.Text = nextTitle
	panelTitle.Visible = true
	panel.Visible = true
	setSecondaryChromeVisible(false)
	setActionLabelsVisible(false)
end

local function showStatus(message: string, positive: boolean?)
	statusText.Text = message
	statusText.TextColor3 = if positive == true then UI.green else UI.red
	statusText.Visible = true
end

local function tile(
	symbol: string,
	name: string,
	detail: string,
	stateText: string,
	stateColor: Color3,
	order: number,
	callback: (() -> ())?
)
	local frame = Instance.new("Frame")
	frame.LayoutOrder = order
	frame.Size = UDim2.fromOffset(76, 64)
	frame.BackgroundColor3 = UI.tile
	frame.BackgroundTransparency = 0.08
	frame.ZIndex = 72
	frame.Parent = scroller
	round(frame, 10)
	stroke(frame, UI.border, 1, 0.58)

	local icon = Instance.new("TextLabel")
	icon.BackgroundTransparency = 1
	icon.Position = UDim2.fromOffset(3, 1)
	icon.Size = UDim2.new(1, -6, 0, 31)
	icon.Text = symbol
	icon.TextColor3 = UI.text
	icon.Font = Enum.Font.GothamBold
	icon.TextScaled = true
	icon.ZIndex = 73
	icon.Parent = frame
	constrain(icon, 15, 24)

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = UDim2.fromOffset(4, 31)
	label.Size = UDim2.new(1, -8, 0, 17)
	label.Text = name
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamMedium
	label.TextScaled = true
	label.TextWrapped = true
	label.ZIndex = 73
	label.Parent = frame
	constrain(label, 7, 10)

	local detailLabel = Instance.new("TextLabel")
	detailLabel.BackgroundTransparency = 1
	detailLabel.Position = UDim2.fromOffset(4, 48)
	detailLabel.Size = UDim2.new(1, -8, 0, 13)
	detailLabel.Text = detail
	detailLabel.TextColor3 = UI.muted
	detailLabel.Font = Enum.Font.GothamMedium
	detailLabel.TextScaled = true
	detailLabel.ZIndex = 73
	detailLabel.Parent = frame
	constrain(detailLabel, 6, 8)

	if stateText ~= "" then
		local badge = Instance.new("TextLabel")
		badge.AnchorPoint = Vector2.new(1, 0)
		badge.Position = UDim2.new(1, -2, 0, 2)
		badge.Size = UDim2.fromOffset(21, 14)
		badge.BackgroundColor3 = stateColor
		badge.Text = stateText
		badge.TextColor3 = Color3.new(1, 1, 1)
		badge.Font = Enum.Font.GothamBold
		badge.TextScaled = true
		badge.ZIndex = 75
		badge.Parent = frame
		round(badge, 3)
		constrain(badge, 6, 9)
	end

	if callback then
		local hit = Instance.new("TextButton")
		hit.Size = UDim2.fromScale(1, 1)
		hit.BackgroundTransparency = 1
		hit.Text = ""
		hit.ZIndex = 76
		hit.Parent = frame
		hit.Activated:Connect(callback)
	end
end



local function previewPart(
	world: WorldModel,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	shape: Enum.PartType?
): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Size = size
	part.CFrame = cframe
	part.Color = color
	part.Material = Enum.Material.SmoothPlastic
	part.Anchored = true
	part.CanCollide = false
	part.CanTouch = false
	part.CanQuery = false
	if shape ~= nil then
		part.Shape = shape
	end
	part.Parent = world
	return part
end

local function viewportFor(frame: GuiObject): (ViewportFrame, WorldModel)
	local viewport = Instance.new("ViewportFrame")
	viewport.Name = "ObjectPreview"
	viewport.Position = UDim2.fromOffset(3, 3)
	viewport.Size = UDim2.new(1, -6, 1, -6)
	viewport.BackgroundTransparency = 1
	viewport.Ambient = Color3.fromRGB(205, 205, 205)
	viewport.LightColor = Color3.fromRGB(255, 255, 255)
	viewport.LightDirection = Vector3.new(-1, -1, -1)
	viewport.ZIndex = 73
	viewport.Parent = frame

	local world = Instance.new("WorldModel")
	world.Name = "PreviewWorld"
	world.Parent = viewport
	return viewport, world
end

local function finishPreview(viewport: ViewportFrame, target: Vector3, distance: number)
	local camera = Instance.new("Camera")
	camera.Name = "PreviewCamera"
	camera.FieldOfView = 34
	camera.CFrame = CFrame.lookAt(
		target + Vector3.new(distance * 0.75, distance * 0.5, distance),
		target
	)
	camera.Parent = viewport
	viewport.CurrentCamera = camera
end

local function renderVehiclePreview(frame: GuiObject, kind: string)
	local viewport, world = viewportFor(frame)
	local bodyColor = Color3.fromRGB(104, 160, 218)
	local trimColor = Color3.fromRGB(45, 51, 58)
	local wheelColor = Color3.fromRGB(40, 40, 40)

	if kind == "bike" then
		previewPart(world, "Frame", Vector3.new(0.28, 1.1, 2.2), CFrame.new(0, 0.85, 0), bodyColor)
		for _, z in {-0.82, 0.82} do
			previewPart(
				world,
				"Wheel",
				Vector3.new(0.28, 1.1, 1.1),
				CFrame.new(0, 0.35, z) * CFrame.Angles(0, 0, math.rad(90)),
				wheelColor,
				Enum.PartType.Cylinder
			)
		end
		finishPreview(viewport, Vector3.new(0, 0.7, 0), 4.8)
		return
	end

	local width = if kind == "truck" then 2.8 elseif kind == "van" then 2.7 elseif kind == "cart" then 2.5 else 2.6
	local length = if kind == "truck" then 4.8 elseif kind == "van" then 4.5 elseif kind == "cart" then 3.6 else 4.1
	local bodyHeight = if kind == "van" then 1.25 elseif kind == "cart" then 0.65 else 0.8

	previewPart(world, "Body", Vector3.new(width, bodyHeight, length), CFrame.new(0, 0.85, 0), bodyColor)
	if kind ~= "cart" then
		previewPart(
			world,
			"Cabin",
			Vector3.new(width * 0.78, if kind == "van" then 1.35 else 0.9, length * 0.48),
			CFrame.new(0, 1.55, -length * 0.08),
			Color3.fromRGB(190, 220, 235)
		)
	end
	for _, x in {-width * 0.42, width * 0.42} do
		for _, z in {-length * 0.33, length * 0.33} do
			previewPart(
				world,
				"Wheel",
				Vector3.new(0.38, 0.8, 0.8),
				CFrame.new(x, 0.42, z) * CFrame.Angles(0, 0, math.rad(90)),
				wheelColor,
				Enum.PartType.Cylinder
			)
		end
	end
	if kind == "truck" then
		previewPart(world, "Bed", Vector3.new(width * 0.88, 0.36, length * 0.34), CFrame.new(0, 1.15, length * 0.27), trimColor)
	end
	finishPreview(viewport, Vector3.new(0, 0.85, 0), 6.2)
end

local function renderToolPreview(frame: GuiObject, kind: string)
	local viewport, world = viewportFor(frame)
	local primary = Color3.fromRGB(100, 155, 214)
	local dark = Color3.fromRGB(50, 55, 62)
	local light = Color3.fromRGB(225, 225, 225)

	if kind == "phone" then
		previewPart(world, "Phone", Vector3.new(1.2, 2.1, 0.22), CFrame.new(), dark)
		previewPart(world, "Screen", Vector3.new(0.96, 1.65, 0.08), CFrame.new(0, 0.05, -0.15), primary)
	elseif kind == "flashlight" then
		previewPart(world, "Handle", Vector3.new(0.65, 1.9, 0.65), CFrame.new(), dark, Enum.PartType.Cylinder)
		previewPart(world, "Lamp", Vector3.new(1.1, 0.55, 1.1), CFrame.new(0, 1.05, 0), primary, Enum.PartType.Cylinder)
	elseif kind == "laptop" then
		previewPart(world, "Base", Vector3.new(2.3, 0.18, 1.5), CFrame.new(0, -0.5, 0.25), dark)
		previewPart(world, "Screen", Vector3.new(2.2, 1.55, 0.16), CFrame.new(0, 0.35, -0.48) * CFrame.Angles(math.rad(-12), 0, 0), primary)
	elseif kind == "camera" then
		previewPart(world, "Body", Vector3.new(2.0, 1.4, 0.8), CFrame.new(), dark)
		previewPart(world, "Lens", Vector3.new(0.9, 0.9, 0.5), CFrame.new(0, 0, -0.62) * CFrame.Angles(math.rad(90), 0, 0), primary, Enum.PartType.Cylinder)
	elseif kind == "umbrella" then
		previewPart(world, "Shaft", Vector3.new(0.18, 2.6, 0.18), CFrame.new(0, -0.25, 0), dark)
		previewPart(world, "Canopy", Vector3.new(2.7, 0.55, 2.7), CFrame.new(0, 1.1, 0), primary, Enum.PartType.Ball)
	elseif kind == "guitar" then
		previewPart(world, "Body", Vector3.new(1.6, 1.8, 0.5), CFrame.new(0, -0.45, 0), primary, Enum.PartType.Ball)
		previewPart(world, "Neck", Vector3.new(0.36, 2.0, 0.28), CFrame.new(0, 1.15, 0), dark)
	elseif kind == "binoculars" then
		for _, x in {-0.55, 0.55} do
			previewPart(world, "Lens", Vector3.new(0.72, 1.8, 0.72), CFrame.new(x, 0, 0) * CFrame.Angles(math.rad(90), 0, 0), dark, Enum.PartType.Cylinder)
		end
	elseif kind == "stroller" then
		previewPart(world, "Seat", Vector3.new(1.7, 1.0, 1.8), CFrame.new(0, 0.45, 0), primary)
		previewPart(world, "Handle", Vector3.new(1.5, 0.16, 0.16), CFrame.new(0, 1.55, 0.65), dark)
		for _, x in {-0.62, 0.62} do
			for _, z in {-0.55, 0.55} do
				previewPart(world, "Wheel", Vector3.new(0.28, 0.6, 0.6), CFrame.new(x, -0.35, z) * CFrame.Angles(0, 0, math.rad(90)), dark, Enum.PartType.Cylinder)
			end
		end
	elseif kind == "extinguisher" then
		previewPart(world, "Tank", Vector3.new(1.0, 2.2, 1.0), CFrame.new(), Color3.fromRGB(210, 55, 55), Enum.PartType.Cylinder)
		previewPart(world, "Handle", Vector3.new(0.8, 0.2, 0.25), CFrame.new(0, 1.2, 0), dark)
	elseif kind == "backpack" then
		previewPart(world, "Pack", Vector3.new(1.65, 2.0, 0.85), CFrame.new(), primary)
		previewPart(world, "Pocket", Vector3.new(1.25, 0.75, 0.25), CFrame.new(0, -0.42, -0.52), dark)
	else
		previewPart(world, "Item", Vector3.new(1.8, 2.1, 0.42), CFrame.new(), if kind == "book" then primary else light)
	end
	finishPreview(viewport, Vector3.new(0, 0.25, 0), 4.5)
end

local function iconTile(
	symbol: string,
	accessibleName: string,
	badgeText: string,
	badgeColor: Color3,
	order: number,
	callback: (() -> ())?,
	previewType: string?,
	previewKind: string?
)
	local frame = Instance.new("Frame")
	frame.Name = accessibleName
	frame.LayoutOrder = order
	frame.Size = UDim2.fromOffset(58, 58)
	frame.BackgroundColor3 = UI.white
	frame.BackgroundTransparency = 0.08
	frame.ZIndex = 72
	frame.Parent = scroller
	round(frame, 10)
	stroke(frame, UI.border, 1, 0.58)

	if previewType == "vehicle" then
		renderVehiclePreview(frame, tostring(previewKind or "car"))
	elseif previewType == "tool" then
		renderToolPreview(frame, tostring(previewKind or ""))
	elseif previewType == "animation" then
		local animationIcon = iconLabel(frame, "AnimationIcon", ICONS.animations, 27)
		animationIcon.ImageColor3 = UI.icon
	else
		local icon = Instance.new("TextLabel")
		icon.Name = "Icon"
		icon.Position = UDim2.fromOffset(5, 5)
		icon.Size = UDim2.new(1, -10, 1, -10)
		icon.BackgroundTransparency = 1
		icon.Text = symbol
		icon.TextColor3 = UI.text
		icon.Font = Enum.Font.GothamBold
		icon.TextScaled = true
		icon.ZIndex = 73
		icon.Parent = frame
		constrain(icon, 22, 38)
	end

	if badgeText ~= "" then
		local badge = Instance.new("TextLabel")
		badge.Name = "Badge"
		badge.AnchorPoint = Vector2.new(1, 0)
		badge.Position = UDim2.new(1, -2, 0, 2)
		badge.Size = UDim2.fromOffset(20, 15)
		badge.BackgroundColor3 = badgeColor
		badge.Text = badgeText
		badge.TextColor3 = Color3.new(1, 1, 1)
		badge.Font = Enum.Font.GothamBold
		badge.TextScaled = true
		badge.ZIndex = 75
		badge.Parent = frame
		round(badge, 4)
		constrain(badge, 6, 9)
	end

	if callback then
		local hit = Instance.new("TextButton")
		hit.Name = "Select"
		hit.Size = UDim2.fromScale(1, 1)
		hit.BackgroundTransparency = 1
		hit.Text = ""
		hit.ZIndex = 76
		hit.Parent = frame
		hit.Activated:Connect(callback)
	end
end

local function fetchMirrorState(): boolean
	local ok, result = pcall(function()
		return mirrorGetState:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		mirrorState = result
		return true
	end
	return false
end

local function fetchRoleplayState(): boolean
	local ok, result = pcall(function()
		return roleplayGetState:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		roleplayState = result
		return true
	end
	return false
end

local function purchase(remote: RemoteFunction, id: string, rerender: () -> ())
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return remote:InvokeServer(id)
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true then
		fetchMirrorState()
		rerender()
	elseif ok and type(result) == "table" and result.code == "not_enough_coins" then
		showStatus("Answer questions to earn more coins.")
	elseif ok and type(result) == "table" and result.code == "reference_only" then
		showStatus("Reference only • " .. tostring(result.requirement or "Unavailable"))
	else
		showStatus("That action could not be completed.")
	end
end

local function closePanel()
	panel.Visible = false
	plotSelector.Visible = false
	statusText.Visible = false
	clearCategories()
	clearToolbar()
	setRailSelection(nil)
	setSecondaryChromeVisible(true)
	setActionLabelsVisible(true)
end

local function symbolForTool(kind: string): string
	if kind == "phone" then return "▯" end
	if kind == "flashlight" then return "◉" end
	if kind == "laptop" then return "▰" end
	if kind == "camera" then return "◎" end
	if kind == "umbrella" then return "☂" end
	if kind == "book" then return "▥" end
	if kind == "clipboard" then return "▤" end
	if kind == "guitar" then return "♫" end
	if kind == "binoculars" then return "∞" end
	if kind == "stroller" then return "♙" end
	if kind == "extinguisher" then return "!" end
	if kind == "backpack" then return "▣" end
	return "□"
end

local function toolMatchesCategory(kind: string, category: string): boolean
	if category == "all" then return true end
	if category == "tech" then
		return kind == "phone" or kind == "flashlight" or kind == "laptop" or kind == "camera" or kind == "binoculars"
	end
	if category == "carry" then
		return kind == "umbrella" or kind == "stroller" or kind == "backpack"
	end
	if category == "roleplay" then
		return kind == "book" or kind == "clipboard" or kind == "extinguisher"
	end
	if category == "music" then
		return kind == "guitar"
	end
	return false
end

local function symbolForVehicle(kind: string): string
	if kind == "bike" then return "○" end
	if kind == "truck" then return "▱" end
	if kind == "van" then return "▰" end
	if kind == "cart" then return "▭" end
	return "▰"
end

local function vehicleMatchesCategory(catalogCategory: string, category: string): boolean
	return string.lower(catalogCategory) == string.lower(category)
end

local showVehicles
local showTools
local showAnimations
local showAvatar
local showFamily
local showHomeCams
local showSettings

local function renderPlotSelector()
	local plots = if type(plotState) == "table" then plotState.plots else nil
	if type(plots) ~= "table" or #plots == 0 then
		plotTitle.Text = "No plots"
		plotStatus.Text = "Unavailable"
		plotGo.Text = ""
		plotGo.Active = false
		plotCatalog.Visible = false
		return
	end

	plotIndex = math.clamp(plotIndex, 1, #plots)
	local selected = plots[plotIndex]
	plotTitle.Text = string.format("House #%d", tonumber(selected.Index) or plotIndex)
	if selected.Mine == true then
		plotStatus.Text = "Your plot"
		plotStatus.TextColor3 = UI.green
		plotGo.Text = "GO HOME"
		plotGo.Active = true
		plotCatalog.Visible = true
	elseif selected.Occupied == true then
		plotStatus.Text = "Occupied"
		plotStatus.TextColor3 = UI.red
		plotGo.Text = "FULL"
		plotGo.Active = false
		plotCatalog.Visible = false
	else
		plotCatalog.Visible = false
		local cooldown = math.max(0, math.floor(tonumber(plotState.houseSwapCooldownRemaining) or 0))
		if cooldown > 0 then
			local minutes = math.floor(cooldown / 60)
			local seconds = cooldown % 60
			plotStatus.Text = string.format("Wait %d:%02d", minutes, seconds)
			plotStatus.TextColor3 = UI.red
			plotGo.Text = "WAIT"
			plotGo.Active = false
		else
			plotStatus.Text = "Vacant"
			plotStatus.TextColor3 = UI.text
			plotGo.Text = "CLAIM"
			plotGo.Active = true
		end
	end
end

local function fetchPlots(): boolean
	local ok, result = pcall(function()
		return getPlots:InvokeServer()
	end)
	if not ok or type(result) ~= "table" or result.ok ~= true or type(result.plots) ~= "table" then
		return false
	end
	plotState = result
	plotIndex = 1
	for index, entry in result.plots do
		if entry.Mine == true then
			plotIndex = index
			break
		end
	end
	return true
end

local function stabilizeThirdPersonCamera()
	local camera = workspace.CurrentCamera
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if camera == nil or root == nil or not root:IsA("BasePart") or humanoid == nil then
		return
	end

	local target = root.Position + Vector3.new(0, 2, 0)
	local desired = target - (root.CFrame.LookVector * 11) + Vector3.new(0, 3.5, 0)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = {character}
	params.IgnoreWater = true
	local hit = workspace:Raycast(target, desired - target, params)
	if hit ~= nil then
		desired = hit.Position + ((target - hit.Position).Unit * 1.5)
	end

	camera.CameraType = Enum.CameraType.Scriptable
	camera.CFrame = CFrame.lookAt(desired, target)
	task.delay(0.18, function()
		local current = workspace.CurrentCamera
		if current ~= nil and humanoid.Parent ~= nil then
			current.CameraSubject = humanoid
			current.CameraType = Enum.CameraType.Custom
		end
	end)
end

local function travelHome(): boolean
	local ok, result = pcall(function()
		return visitHome:InvokeServer()
	end)
	local success = ok and type(result) == "table" and result.ok == true
	if success then
		task.defer(stabilizeThirdPersonCamera)
	end
	return success
end

local function showTravelFailure()
	plotStatus.Text = "Travel failed — try again"
	plotStatus.TextColor3 = UI.red
	plotGo.Text = "GO HOME"
	plotGo.Active = true
end

local function showPlotSelector()
	panel.Visible = false
	clearCategories()
	if not fetchPlots() then
		setRailSelection(nil)
		setSecondaryChromeVisible(true)
		setActionLabelsVisible(true)
		return
	end
	setSecondaryChromeVisible(false)
	plotSelector.Visible = true
	setActionLabelsVisible(false)
	renderPlotSelector()
end

showVehicles = function()
	if not fetchMirrorState() then
		return
	end
	clearGrid()
	clearToolbar()
	setHeader("Vehicle")
	configureIconPanel(true)
	toolbarButton("AllVehicles", "▣", not activeVehicleOwnedOnly, 1, function()
		activeVehicleOwnedOnly = false
		showVehicles()
	end)
	toolbarButton("OwnedVehicles", "✓", activeVehicleOwnedOnly, 2, function()
		activeVehicleOwnedOnly = true
		showVehicles()
	end)
	toolbarButton("DespawnVehicle", "×", false, 3, function()
		local ok, result = pcall(function()
			return despawnVehicle:InvokeServer()
		end)
		if ok and type(result) == "table" and result.ok == true then
			closePanel()
		else
			showStatus("Couldn't despawn vehicle")
		end
	end)
	setCategories({
		{Id = "small", Symbol = "○"},
		{Id = "street", Symbol = "▰"},
		{Id = "work", Symbol = "▱"},
		{Id = "event", Symbol = "★"},
		{Id = "boats", Symbol = "≈"},
		{Id = "flying", Symbol = "↑"},
	}, activeVehicleCategory, function(category)
		activeVehicleCategory = category
		showVehicles()
	end)

	local order = 1
	for _, vehicle in mirrorState.vehicles or {} do
		local kind = tostring(vehicle.Kind or "car")
		local catalogCategory = tostring(vehicle.Category or "")
		if vehicleMatchesCategory(catalogCategory, activeVehicleCategory) then
			local id = tostring(vehicle.Id)
			local owned = mirrorState.ownedVehicles and mirrorState.ownedVehicles[id] == true
			local runtimePlayable = vehicle.RuntimePlayable ~= false
			if activeVehicleOwnedOnly and not owned then
				continue
			end
			local badgeText = if not runtimePlayable then "R" elseif owned then "" else "$"
			local badgeColor = if not runtimePlayable then UI.muted elseif owned then UI.green else UI.blue
			iconTile(
				symbolForVehicle(kind),
				tostring(vehicle.Name),
				badgeText,
				badgeColor,
				order,
				function()
					if not runtimePlayable then
						showStatus("Reference only • " .. tostring(vehicle.Requirement or "Unavailable"))
					elseif owned then
						local ok, result = pcall(function()
							return spawnVehicle:InvokeServer(id)
						end)
						if ok and type(result) == "table" and result.ok == true then
							closePanel()
						else
							showStatus("Couldn't spawn vehicle")
						end
					else
						purchase(purchaseVehicle, id, showVehicles)
					end
				end,
				"vehicle",
				kind
			)
			order += 1
		end
	end
end

showTools = function()
	if not fetchMirrorState() then
		return
	end
	clearGrid()
	clearToolbar()
	setHeader("Tools")
	configureIconPanel(true)
	toolbarButton("AllTools", "▣", not activeToolOwnedOnly, 1, function()
		activeToolOwnedOnly = false
		showTools()
	end)
	toolbarButton("OwnedTools", "✓", activeToolOwnedOnly, 2, function()
		activeToolOwnedOnly = true
		showTools()
	end)
	toolbarButton("ClearTools", "×", false, 3, function()
		pcall(function()
			clearTools:InvokeServer()
		end)
		closePanel()
	end)
	setCategories({
		{Id = "all", Symbol = "★"},
		{Id = "tech", Symbol = "▯"},
		{Id = "carry", Symbol = "▣"},
		{Id = "roleplay", Symbol = "♙"},
		{Id = "music", Symbol = "♫"},
	}, activeToolCategory, function(category)
		activeToolCategory = category
		showTools()
	end)

	local order = 1
	for _, item in mirrorState.inventory or {} do
		local kind = tostring(item.Kind or "")
		if toolMatchesCategory(kind, activeToolCategory) then
			local id = tostring(item.Id)
			local owned = mirrorState.ownedTools and mirrorState.ownedTools[id] == true
			if activeToolOwnedOnly and not owned then
				continue
			end
			iconTile(
				symbolForTool(kind),
				tostring(item.Name),
				owned and "" or "$",
				owned and UI.green or UI.blue,
				order,
				function()
					if owned then
						pcall(function()
							equipTool:InvokeServer(id)
						end)
						closePanel()
					else
						purchase(purchaseTool, id, showTools)
					end
				end,
				"tool",
				kind
			)
			order += 1
		end
	end
end

showAnimations = function()
	clearCategories()
	clearGrid()
	clearToolbar()
	setHeader("Animations")
	configureIconPanel(false)
	local order = 1
	for _, emoteName in {"wave", "point", "cheer", "laugh", "dance", "dance2", "dance3"} do
		local label = string.upper(string.sub(emoteName, 1, 1)) .. string.sub(emoteName, 2)
		iconTile("", label, "", UI.green, order, function()
			local character = player.Character
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if humanoid then
				pcall(function()
					humanoid:PlayEmote(emoteName)
				end)
			end
			closePanel()
		end, "animation", emoteName)
		order += 1
	end
end

showAvatar = function()
	clearCategories()
	panel.Visible = false
	plotSelector.Visible = false
	setActionLabelsVisible(false)

	local editorGui = playerGui:FindFirstChild("BrookhavenAvatarEditorUI")
	if editorGui == nil then
		editorGui = playerGui:WaitForChild("BrookhavenAvatarEditorUI", 2)
	end
	local openEditor = editorGui and editorGui:FindFirstChild("OpenAvatarEditor")
	if openEditor and openEditor:IsA("BindableEvent") then
		openEditor:Fire()
	else
		-- Fail gracefully if the dedicated editor has not mounted yet.
		pcall(function()
			resetAvatar:InvokeServer()
		end)
		setActionLabelsVisible(true)
	end
end

showFamily = function()
	clearCategories()
	panel.Visible = false
	plotSelector.Visible = false
	dismissActionHints()

	local familyGui = playerGui:FindFirstChild("BrookhavenFamilyUI")
	if familyGui == nil then
		familyGui = playerGui:WaitForChild("BrookhavenFamilyUI", 2)
	end
	local openPanel = familyGui and familyGui:FindFirstChild("OpenFamilyPanel")
	if openPanel and openPanel:IsA("BindableEvent") then
		openPanel:Fire()
	else
	end
end

showHomeCams = function()
	clearCategories()
	panel.Visible = false
	plotSelector.Visible = false
	setActionLabelsVisible(false)

	local camsGui = playerGui:FindFirstChild("BrookhavenHomeCamsUI")
	if camsGui == nil then
		camsGui = playerGui:WaitForChild("BrookhavenHomeCamsUI", 2)
	end
	local openCams = camsGui and camsGui:FindFirstChild("OpenHomeCams")
	if openCams and openCams:IsA("BindableEvent") then
		openCams:Fire()
	else
		setActionLabelsVisible(true)
	end
end

showSettings = function()
	clearCategories()
	clearGrid()
	clearToolbar()
	setHeader("Settings")
	configureTextPanel()
	tile("☺", "Reset Avatar", "reset", "", UI.blue, 1, function()
		pcall(function()
			resetAvatar:InvokeServer()
		end)
		closePanel()
	end)
	tile("↺", "Return to Town", "travel", "", UI.blue, 2, function()
		pcall(function()
			returnWorld:InvokeServer()
		end)
		closePanel()
	end)
end

local function fetchQuickChatOptions(): boolean
	local ok, result = pcall(function()
		return quickChatGetOptions:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true and type(result.categories) == "table" then
		quickChatState = result
		return true
	end
	return false
end

local function sendQuickChat(value: string)
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return quickChatSend:InvokeServer(value)
	end)
	busy = false

	if ok and type(result) == "table" and result.ok == true then
		closePanel()
	elseif ok and type(result) == "table" and result.code == "quick_chat_cooldown" then
		showStatus(
			"Quick Chat: wait " .. tostring(tonumber(result.remainingSeconds) or 1) .. "s"
		)
	else
		showStatus("Quick Chat unavailable.")
	end
end

local function showQuickChat()
	if quickChatState == nil and not fetchQuickChatOptions() then
		return
	end
	clearGrid()
	clearToolbar()
	setHeader("Quick Chat")
	configureTextPanel()
	setCategories({
		{Id = "phrases", Symbol = "Aa"},
		{Id = "emojis", Symbol = "☺"},
	}, activeQuickChatCategory, function(category)
		activeQuickChatCategory = category
		showQuickChat()
	end)

	local categories = quickChatState.categories or {}
	local values = if activeQuickChatCategory == "emojis"
		then categories.Emojis
		else categories.Phrases
	if type(values) ~= "table" then
		return
	end

	for index, value in values do
		local text = tostring(value)
		local isEmoji = activeQuickChatCategory == "emojis"
		tile(
			isEmoji and text or "⚡",
			isEmoji and "Emoji" or text,
			"send",
			"",
			UI.blue,
			index,
			function()
				sendQuickChat(text)
			end
		)
	end
end

avatarBtn.Activated:Connect(function()
	dismissActionHints()
	setRailSelection(avatarBtn)
	showAvatar()
end)
toolsBtn.Activated:Connect(function()
	dismissActionHints()
	setRailSelection(toolsBtn)
	showTools()
end)
animationsBtn.Activated:Connect(function()
	dismissActionHints()
	setRailSelection(animationsBtn)
	showAnimations()
end)
vehicleBtn.Activated:Connect(function()
	dismissActionHints()
	setRailSelection(vehicleBtn)
	showVehicles()
end)

houseBtn.Activated:Connect(function()
	dismissActionHints()
	if plotSelector.Visible then
		closePanel()
	else
		setRailSelection(houseBtn)
		showPlotSelector()
	end
end)

previousPlot.Activated:Connect(function()
	if type(plotState) ~= "table" or type(plotState.plots) ~= "table" or #plotState.plots == 0 then
		return
	end
	plotIndex -= 1
	if plotIndex < 1 then
		plotIndex = #plotState.plots
	end
	renderPlotSelector()
end)

nextPlot.Activated:Connect(function()
	if type(plotState) ~= "table" or type(plotState.plots) ~= "table" or #plotState.plots == 0 then
		return
	end
	plotIndex += 1
	if plotIndex > #plotState.plots then
		plotIndex = 1
	end
	renderPlotSelector()
end)

plotGo.Activated:Connect(function()
	if not plotGo.Active or type(plotState) ~= "table" or type(plotState.plots) ~= "table" then
		return
	end
	local selected = plotState.plots[plotIndex]
	if type(selected) ~= "table" then
		return
	end

	if selected.Mine == true then
		if travelHome() then
			closePanel()
		else
			showTravelFailure()
		end
		return
	end

	local ok, result = pcall(function()
		return selectPlot:InvokeServer(selected.Id)
	end)
	if ok and type(result) == "table" and result.ok == true then
		fetchPlots()
		renderPlotSelector()
		if travelHome() then
			closePanel()
		else
			showTravelFailure()
		end
	else
		fetchPlots()
		renderPlotSelector()
	end
end)

plotCatalog.Activated:Connect(function()
	closePanel()
	if openStore and openStore:IsA("BindableEvent") then
		openStore:Fire()
	end
end)

quickChatBolt.Activated:Connect(showQuickChat)
quickChatButton.Activated:Connect(showQuickChat)
familyButton.Activated:Connect(showFamily)
homeCamsButton.Activated:Connect(showHomeCams)
shopShortcut.Activated:Connect(function()
	dismissActionHints()
	closePanel()
	if openStore and openStore:IsA("BindableEvent") then
		openStore:Fire()
	end
end)

close.Activated:Connect(closePanel)

task.delay(4, function()
	if gui.Parent ~= nil and panel.Visible ~= true and plotSelector.Visible ~= true then
		dismissActionHints()
	end
end)

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible then
		statusText.Visible = false
	end
end)
