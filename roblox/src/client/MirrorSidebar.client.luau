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
	white = Color3.fromRGB(240, 240, 240),
	tile = Color3.fromRGB(224, 224, 224),
	tileSelected = Color3.fromRGB(201, 201, 201),
	border = Color3.fromRGB(116, 116, 116),
	text = Color3.fromRGB(40, 40, 40),
	muted = Color3.fromRGB(90, 90, 90),
	red = Color3.fromRGB(205, 36, 36),
	green = Color3.fromRGB(69, 176, 88),
	cyan = Color3.fromRGB(30, 203, 216),
	blue = Color3.fromRGB(132, 211, 238),
	dark = Color3.fromRGB(25, 30, 35),
}

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
	local referenceHeight = 512
	shellScale.Scale = math.clamp(viewport.Y / referenceHeight, 0.72, 1.08)
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

local function makeTopButton(name: string, text: string, position: UDim2, size: UDim2): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.Position = position
	button.Size = size
	button.BackgroundColor3 = UI.white
	button.BackgroundTransparency = 0.18
	button.Text = text
	button.TextColor3 = UI.text
	button.Font = Enum.Font.GothamMedium
	button.TextScaled = true
	button.AutoButtonColor = true
	button.Selectable = true
	button.ZIndex = 35
	button.Parent = shell
	round(button, 7)
	stroke(button, UI.border, 1, 0.4)
	constrain(button, 10, 15)
	return button
end

-- Brookhaven quick-chat affordance from the reference: a square lightning tile followed by a pill.
local quickChatBolt = makeTopButton("QuickChatBolt", "⚡", UDim2.fromOffset(304, 8), UDim2.fromOffset(48, 48))
quickChatBolt.BackgroundColor3 = UI.white
quickChatBolt.TextColor3 = Color3.fromRGB(236, 175, 35)
constrain(quickChatBolt, 22, 28)

local quickChatArrow = Instance.new("TextLabel")
quickChatArrow.Name = "QuickChatArrow"
quickChatArrow.Position = UDim2.fromOffset(365, 17)
quickChatArrow.Size = UDim2.fromOffset(38, 29)
quickChatArrow.BackgroundTransparency = 1
quickChatArrow.Text = "←"
quickChatArrow.TextColor3 = UI.cyan
quickChatArrow.Font = Enum.Font.GothamBold
quickChatArrow.TextScaled = true
quickChatArrow.ZIndex = 36
quickChatArrow.Parent = shell
constrain(quickChatArrow, 18, 24)

local quickChatButton = makeTopButton(
	"QuickChatButton",
	"Quick Chat",
	UDim2.fromOffset(414, 17),
	UDim2.fromOffset(108, 29)
)
quickChatButton.BackgroundTransparency = 0.12

local homeCamsButton = makeTopButton(
	"HomeCamsButton",
	"⌂  Home\nCams",
	UDim2.new(1, -340, 0, 8),
	UDim2.fromOffset(96, 44)
)
homeCamsButton.BackgroundColor3 = Color3.fromRGB(179, 220, 236)

local clockBox = Instance.new("Frame")
clockBox.Name = "Clock"
clockBox.Position = UDim2.new(1, -232, 0, 8)
clockBox.Size = UDim2.fromOffset(92, 44)
clockBox.BackgroundColor3 = Color3.fromRGB(179, 220, 236)
clockBox.BackgroundTransparency = 0.08
clockBox.ZIndex = 35
clockBox.Parent = shell
round(clockBox, 7)
stroke(clockBox, UI.border, 1, 0.5)

local clockTime = Instance.new("TextLabel")
clockTime.Name = "Time"
clockTime.Position = UDim2.fromOffset(4, 3)
clockTime.Size = UDim2.new(1, -8, 0, 22)
clockTime.BackgroundTransparency = 1
clockTime.Text = "--:-- --"
clockTime.TextColor3 = UI.text
clockTime.Font = Enum.Font.GothamMedium
clockTime.TextScaled = true
clockTime.ZIndex = 36
clockTime.Parent = clockBox
constrain(clockTime, 10, 14)

local clockDay = Instance.new("TextLabel")
clockDay.Name = "Day"
clockDay.Position = UDim2.fromOffset(4, 24)
clockDay.Size = UDim2.new(1, -8, 0, 16)
clockDay.BackgroundTransparency = 1
clockDay.Text = "Monday"
clockDay.TextColor3 = UI.text
clockDay.Font = Enum.Font.GothamMedium
clockDay.TextScaled = true
clockDay.ZIndex = 36
clockDay.Parent = clockBox
constrain(clockDay, 8, 11)

local familyButton = makeTopButton(
	"FamilyButton",
	"♟  Family",
	UDim2.new(1, -340, 0, 57),
	UDim2.fromOffset(132, 32)
)

-- The recording keeps a small shop/cart shortcut at the left edge during free play.
local shopShortcut = Instance.new("TextButton")
shopShortcut.Name = "ShopShortcut"
shopShortcut.Position = UDim2.new(0, 80, 0.5, -18)
shopShortcut.Size = UDim2.fromOffset(54, 36)
shopShortcut.BackgroundColor3 = UI.white
shopShortcut.BackgroundTransparency = 0.18
shopShortcut.Text = "🛒"
shopShortcut.TextColor3 = UI.text
shopShortcut.Font = Enum.Font.GothamBold
shopShortcut.TextScaled = true
shopShortcut.ZIndex = 35
shopShortcut.Parent = shell
round(shopShortcut, 7)
stroke(shopShortcut, UI.border, 1, 0.45)
constrain(shopShortcut, 16, 22)

local shopBadge = Instance.new("TextLabel")
shopBadge.Name = "Badge"
shopBadge.AnchorPoint = Vector2.new(1, 0)
shopBadge.Position = UDim2.new(1, -3, 0, 2)
shopBadge.Size = UDim2.fromOffset(15, 15)
shopBadge.BackgroundColor3 = UI.blue
shopBadge.Text = "★"
shopBadge.TextColor3 = Color3.new(1, 1, 1)
shopBadge.Font = Enum.Font.GothamBold
shopBadge.TextScaled = true
shopBadge.ZIndex = 36
shopBadge.Parent = shopShortcut
round(shopBadge, 8)
constrain(shopBadge, 7, 9)

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
rail.Position = UDim2.new(1, -10, 0, 72)
rail.Size = UDim2.fromOffset(64, 306)
rail.BackgroundTransparency = 1
rail.ZIndex = 40
rail.Parent = shell

local labelLayer = Instance.new("Frame")
labelLayer.Name = "ActionLabels"
labelLayer.Size = UDim2.fromScale(1, 1)
labelLayer.BackgroundTransparency = 1
labelLayer.ZIndex = 39
labelLayer.Parent = shell

local actionLabels: {GuiObject} = {}

local function actionButton(symbol: string, name: string, labelText: string, order: number): TextButton
	local y = (order - 1) * 61

	local label = Instance.new("TextLabel")
	label.Name = name .. "Label"
	label.AnchorPoint = Vector2.new(1, 0)
	label.Position = UDim2.new(1, -74, 0, 86 + y)
	label.Size = UDim2.fromOffset(132, 23)
	label.BackgroundColor3 = UI.white
	label.BackgroundTransparency = 0.19
	label.Text = labelText .. "      →"
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamMedium
	label.TextScaled = true
	label.TextXAlignment = Enum.TextXAlignment.Center
	label.ZIndex = 39
	label.Parent = labelLayer
	round(label, 9)
	constrain(label, 9, 12)
	table.insert(actionLabels, label)

	local arrow = Instance.new("TextLabel")
	arrow.Name = name .. "ArrowTint"
	arrow.AnchorPoint = Vector2.new(1, 0)
	arrow.Position = UDim2.new(1, -75, 0, 84 + y)
	arrow.Size = UDim2.fromOffset(25, 27)
	arrow.BackgroundTransparency = 1
	arrow.Text = "→"
	arrow.TextColor3 = UI.cyan
	arrow.Font = Enum.Font.GothamBold
	arrow.TextScaled = true
	arrow.ZIndex = 40
	arrow.Parent = labelLayer
	constrain(arrow, 17, 22)
	table.insert(actionLabels, arrow)

	local b = Instance.new("TextButton")
	b.Name = name .. "Button"
	b.Position = UDim2.fromOffset(4, y)
	b.Size = UDim2.fromOffset(58, 58)
	b.BackgroundColor3 = UI.white
	b.BackgroundTransparency = 0.14
	b.Text = symbol
	b.TextColor3 = UI.text
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.AutoButtonColor = true
	b.Selectable = true
	b.ZIndex = 41
	b.Parent = rail
	round(b, 8)
	stroke(b, UI.border, 1, 0.45)
	constrain(b, 20, 32)
	return b
end

local avatarBtn = actionButton("☺", "Avatar", "Avatar Editor", 1)
local toolsBtn = actionButton("♙", "Tools", "Tools", 2)
local animationsBtn = actionButton("♟", "Animations", "Animations", 3)
local vehicleBtn = actionButton("▰", "Vehicle", "Vehicle", 4)
local houseBtn = actionButton("⌂", "House", "House", 5)

local settingsButton = Instance.new("TextButton")
settingsButton.Name = "WorldSettingsButton"
settingsButton.AnchorPoint = Vector2.new(0, 1)
settingsButton.Position = UDim2.new(0, 92, 1, -12)
settingsButton.Size = UDim2.fromOffset(34, 34)
settingsButton.BackgroundTransparency = 1
settingsButton.Text = "⚙"
settingsButton.TextColor3 = UI.dark
settingsButton.Font = Enum.Font.GothamBold
settingsButton.TextScaled = true
settingsButton.ZIndex = 35
settingsButton.Parent = shell
settingsButton.Visible = false
settingsButton.Active = false
constrain(settingsButton, 20, 26)

-- Context menus float over the world instead of living inside a large StarBlox dashboard.
local panel = Instance.new("Frame")
panel.Name = "BrookhavenContextPanel"
panel.AnchorPoint = Vector2.new(1, 0)
panel.Position = UDim2.new(1, -83, 0, 105)
panel.Size = UDim2.fromOffset(326, 309)
panel.BackgroundTransparency = 1
panel.Visible = false
panel.ZIndex = 70
panel.Parent = shell

local panelTitle = Instance.new("TextLabel")
panelTitle.Name = "PanelTitle"
panelTitle.Position = UDim2.fromOffset(0, 2)
panelTitle.Size = UDim2.fromOffset(198, 42)
panelTitle.BackgroundColor3 = UI.white
panelTitle.BackgroundTransparency = 0.14
panelTitle.Text = ""
panelTitle.TextColor3 = UI.text
panelTitle.Font = Enum.Font.GothamBold
panelTitle.TextScaled = true
panelTitle.ZIndex = 71
panelTitle.Parent = panel
round(panelTitle, 6)
stroke(panelTitle, UI.border, 1, 0.5)
constrain(panelTitle, 12, 16)

local close = Instance.new("TextButton")
close.Name = "Close"
close.AnchorPoint = Vector2.new(1, 0)
close.Position = UDim2.new(1, 0, 0, 0)
close.Size = UDim2.fromOffset(52, 48)
close.BackgroundColor3 = UI.red
close.Text = "X"
close.TextColor3 = Color3.new(1, 1, 1)
close.Font = Enum.Font.GothamBold
close.TextScaled = true
close.ZIndex = 74
close.Parent = panel
round(close, 6)
stroke(close, Color3.fromRGB(130, 25, 25), 1, 0.35)
constrain(close, 22, 29)

local statusText = Instance.new("TextLabel")
statusText.Name = "Status"
statusText.AnchorPoint = Vector2.new(0, 1)
statusText.Position = UDim2.new(0, 0, 1, 0)
statusText.Size = UDim2.new(1, -58, 0, 24)
statusText.BackgroundColor3 = UI.white
statusText.BackgroundTransparency = 0.22
statusText.Text = ""
statusText.TextColor3 = UI.muted
statusText.Font = Enum.Font.GothamMedium
statusText.TextScaled = true
statusText.Visible = false
statusText.ZIndex = 72
statusText.Parent = panel
round(statusText, 6)
constrain(statusText, 9, 12)

local scroller = Instance.new("ScrollingFrame")
scroller.Name = "Grid"
scroller.Position = UDim2.fromOffset(50, 54)
scroller.Size = UDim2.new(1, -50, 1, -58)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0, 0)
scroller.ScrollBarThickness = 0
scroller.ZIndex = 71
scroller.Parent = panel

local categoryRail = Instance.new("Frame")
categoryRail.Name = "CategoryRail"
categoryRail.Position = UDim2.fromOffset(0, 54)
categoryRail.Size = UDim2.fromOffset(44, 245)
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
grid.CellSize = UDim2.fromOffset(62, 64)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.HorizontalAlignment = Enum.HorizontalAlignment.Right
grid.Parent = scroller

-- Brookhaven's House action first chooses a vacant lot with previous/next + GO.
local plotSelector = Instance.new("Frame")
plotSelector.Name = "HousePlotSelector"
plotSelector.AnchorPoint = Vector2.new(0.5, 0.5)
plotSelector.Position = UDim2.fromScale(0.5, 0.43)
plotSelector.Size = UDim2.fromOffset(520, 206)
plotSelector.BackgroundTransparency = 1
plotSelector.Visible = false
plotSelector.ZIndex = 68
plotSelector.Parent = shell

local plotModes = Instance.new("Frame")
plotModes.Name = "PlotModes"
plotModes.AnchorPoint = Vector2.new(0.5, 0)
plotModes.Position = UDim2.new(0.5, 0, 0, 0)
plotModes.Size = UDim2.fromOffset(510, 58)
plotModes.BackgroundTransparency = 1
plotModes.ZIndex = 69
plotModes.Parent = plotSelector

for index, text in {"✓  ⌂", "⌂  ⌂", "⌂  ☀"} do
	local mode = Instance.new("TextButton")
	mode.Name = "Mode" .. tostring(index)
	mode.Position = UDim2.fromOffset((index - 1) * 174, 0)
	mode.Size = UDim2.fromOffset(164, 54)
	mode.BackgroundColor3 = if index == 1 then Color3.fromRGB(191, 191, 191) else Color3.fromRGB(199, 184, 126)
	mode.BackgroundTransparency = 0.1
	mode.Text = text
	mode.TextColor3 = UI.text
	mode.Font = Enum.Font.GothamBold
	mode.TextScaled = true
	mode.AutoButtonColor = false
	mode.Active = false
	mode.ZIndex = 70
	mode.Parent = plotModes
	round(mode, 5)
	stroke(mode, UI.border, 1, 0.4)
	constrain(mode, 18, 26)
end

local plotCard = Instance.new("Frame")
plotCard.Name = "PlotCard"
plotCard.AnchorPoint = Vector2.new(0.5, 0)
plotCard.Position = UDim2.new(0.5, 0, 0, 88)
plotCard.Size = UDim2.fromOffset(220, 84)
plotCard.BackgroundColor3 = UI.white
plotCard.BackgroundTransparency = 0.2
plotCard.ZIndex = 69
plotCard.Parent = plotSelector
round(plotCard, 7)
stroke(plotCard, UI.border, 1, 0.4)

local plotTitle = Instance.new("TextLabel")
plotTitle.Name = "PlotTitle"
plotTitle.Position = UDim2.fromOffset(8, 8)
plotTitle.Size = UDim2.new(1, -16, 0, 30)
plotTitle.BackgroundTransparency = 1
plotTitle.Text = "House #1"
plotTitle.TextColor3 = UI.text
plotTitle.Font = Enum.Font.GothamBold
plotTitle.TextScaled = true
plotTitle.ZIndex = 70
plotTitle.Parent = plotCard
constrain(plotTitle, 14, 19)

local plotStatus = Instance.new("TextLabel")
plotStatus.Name = "PlotStatus"
plotStatus.Position = UDim2.fromOffset(8, 43)
plotStatus.Size = UDim2.new(1, -16, 0, 24)
plotStatus.BackgroundTransparency = 1
plotStatus.Text = "Vacant"
plotStatus.TextColor3 = UI.text
plotStatus.Font = Enum.Font.GothamMedium
plotStatus.TextScaled = true
plotStatus.ZIndex = 70
plotStatus.Parent = plotCard
constrain(plotStatus, 11, 15)

local function plotArrow(name: string, text: string, x: number): TextButton
	local button = Instance.new("TextButton")
	button.Name = name
	button.AnchorPoint = Vector2.new(0.5, 0)
	button.Position = UDim2.new(0.5, x, 0, 91)
	button.Size = UDim2.fromOffset(70, 70)
	button.BackgroundColor3 = UI.white
	button.BackgroundTransparency = 0.18
	button.Text = text
	button.TextColor3 = UI.white
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.ZIndex = 70
	button.Parent = plotSelector
	round(button, 35)
	stroke(button, UI.border, 2, 0.18)
	constrain(button, 32, 42)
	return button
end

local previousPlot = plotArrow("PreviousPlot", "←", -178)
local nextPlot = plotArrow("NextPlot", "→", 178)

local plotGo = Instance.new("TextButton")
plotGo.Name = "PlotGo"
plotGo.AnchorPoint = Vector2.new(0.5, 0)
plotGo.Position = UDim2.new(0.5, 0, 0, 174)
plotGo.Size = UDim2.fromOffset(118, 32)
plotGo.BackgroundTransparency = 1
plotGo.Text = "GO"
plotGo.TextColor3 = Color3.fromRGB(50, 214, 58)
plotGo.Font = Enum.Font.GothamBold
plotGo.TextScaled = true
plotGo.ZIndex = 70
plotGo.Parent = plotSelector
constrain(plotGo, 25, 32)

local mirrorState = nil
local roleplayState = nil
local busy = false
local activeToolCategory = "all"
local activeVehicleCategory = "all"
local activeQuickChatCategory = "phrases"
local quickChatState = nil
local actionHintsDismissed = false
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
		button.Size = UDim2.fromOffset(42, 42)
		button.BackgroundColor3 = if entry.Id == selectedId then UI.tileSelected else UI.white
		button.BackgroundTransparency = 0.12
		button.Text = entry.Symbol
		button.TextColor3 = UI.text
		button.Font = Enum.Font.GothamBold
		button.TextScaled = true
		button.ZIndex = 73
		button.Parent = categoryRail
		round(button, 6)
		stroke(button, UI.border, 1, 0.45)
		constrain(button, 15, 22)
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

local function setHeader(nextTitle: string)
	plotSelector.Visible = false
	panelTitle.Text = nextTitle
	panelTitle.Visible = true
	panel.Visible = true
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
	frame.BackgroundTransparency = 0.12
	frame.ZIndex = 72
	frame.Parent = scroller
	round(frame, 6)
	stroke(frame, UI.border, 1, 0.45)

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


local function iconTile(
	symbol: string,
	accessibleName: string,
	badgeText: string,
	badgeColor: Color3,
	order: number,
	callback: (() -> ())?
)
	local frame = Instance.new("Frame")
	frame.Name = accessibleName
	frame.LayoutOrder = order
	frame.Size = UDim2.fromOffset(62, 64)
	frame.BackgroundColor3 = UI.white
	frame.BackgroundTransparency = 0.12
	frame.ZIndex = 72
	frame.Parent = scroller
	round(frame, 6)
	stroke(frame, UI.border, 1, 0.45)

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
	else
		showStatus("That action could not be completed.")
	end
end

local function closePanel()
	panel.Visible = false
	plotSelector.Visible = false
	statusText.Visible = false
	clearCategories()
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

local function vehicleMatchesCategory(kind: string, category: string): boolean
	if category == "all" then return true end
	if category == "cars" then return kind == "car" end
	if category == "utility" then return kind == "truck" or kind == "van" or kind == "cart" end
	if category == "bikes" then return kind == "bike" end
	return false
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
		return
	end

	plotIndex = math.clamp(plotIndex, 1, #plots)
	local selected = plots[plotIndex]
	plotTitle.Text = string.format("House #%d", tonumber(selected.Index) or plotIndex)
	if selected.Mine == true then
		plotStatus.Text = "Your plot"
		plotStatus.TextColor3 = UI.green
		plotGo.Text = "GO"
		plotGo.Active = true
	elseif selected.Occupied == true then
		plotStatus.Text = "Occupied"
		plotStatus.TextColor3 = UI.red
		plotGo.Text = "FULL"
		plotGo.Active = false
	else
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
			plotGo.Text = "GO"
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

local function showPlotSelector()
	panel.Visible = false
	clearCategories()
	if not fetchPlots() then
		setActionLabelsVisible(true)
		return
	end
	plotSelector.Visible = true
	setActionLabelsVisible(false)
	renderPlotSelector()
end

showVehicles = function()
	if not fetchMirrorState() then
		return
	end
	clearGrid()
	setHeader("Vehicle")
	panelTitle.Visible = false
	setCategories({
		{Id = "all", Symbol = "★"},
		{Id = "cars", Symbol = "▰"},
		{Id = "utility", Symbol = "▱"},
		{Id = "bikes", Symbol = "○"},
	}, activeVehicleCategory, function(category)
		activeVehicleCategory = category
		showVehicles()
	end)

	local order = 1
	for _, vehicle in mirrorState.vehicles or {} do
		local kind = tostring(vehicle.Kind or "car")
		if vehicleMatchesCategory(kind, activeVehicleCategory) then
			local id = tostring(vehicle.Id)
			local owned = mirrorState.ownedVehicles and mirrorState.ownedVehicles[id] == true
			iconTile(
				symbolForVehicle(kind),
				tostring(vehicle.Name),
				owned and "" or "$",
				owned and UI.green or UI.blue,
				order,
				function()
					if owned then
						pcall(function()
							spawnVehicle:InvokeServer(id)
						end)
						closePanel()
					else
						purchase(purchaseVehicle, id, showVehicles)
					end
				end
			)
			order += 1
		end
	end
	iconTile("×", "Despawn", "", UI.red, order, function()
		pcall(function()
			despawnVehicle:InvokeServer()
		end)
		closePanel()
	end)
end

showTools = function()
	if not fetchMirrorState() then
		return
	end
	clearGrid()
	setHeader("Tools")
	panelTitle.Visible = false
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
				end
			)
			order += 1
		end
	end
end

showAnimations = function()
	clearCategories()
	clearGrid()
	setHeader("Animations")
	local order = 1
	for _, emoteName in {"wave", "point", "cheer", "laugh", "dance", "dance2", "dance3"} do
		local label = string.upper(string.sub(emoteName, 1, 1)) .. string.sub(emoteName, 2)
		tile("♟", label, "play", "", UI.green, order, function()
			local character = player.Character
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if humanoid then
				pcall(function()
					humanoid:PlayEmote(emoteName)
				end)
			end
			closePanel()
		end)
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
	setHeader("Settings")
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
	setHeader("Quick Chat")
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
	showAvatar()
end)
toolsBtn.Activated:Connect(function()
	dismissActionHints()
	showTools()
end)
animationsBtn.Activated:Connect(function()
	dismissActionHints()
	showAnimations()
end)
vehicleBtn.Activated:Connect(function()
	dismissActionHints()
	showVehicles()
end)

houseBtn.Activated:Connect(function()
	dismissActionHints()
	if plotSelector.Visible then
		closePanel()
	else
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
		closePanel()
		if openStore and openStore:IsA("BindableEvent") then
			openStore:Fire()
		end
		return
	end

	local ok, result = pcall(function()
		return selectPlot:InvokeServer(selected.Id)
	end)
	if ok and type(result) == "table" and result.ok == true then
		pcall(function()
			visitHome:InvokeServer()
		end)
		closePanel()
	else
		fetchPlots()
		renderPlotSelector()
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

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible then
		statusText.Visible = false
	end
end)
