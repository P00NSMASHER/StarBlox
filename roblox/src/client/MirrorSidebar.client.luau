--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextChatService = game:GetService("TextChatService")

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

local shopRemotes = ReplicatedStorage:WaitForChild("StarBloxShop")
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

local quickChatButton = makeTopButton(
	"QuickChatButton",
	"←     Quick Chat",
	UDim2.fromOffset(360, 17),
	UDim2.fromOffset(146, 29)
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
scroller.Position = UDim2.fromOffset(0, 54)
scroller.Size = UDim2.new(1, 0, 1, -58)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0, 0)
scroller.ScrollBarThickness = 0
scroller.ZIndex = 71
scroller.Parent = panel

local grid = Instance.new("UIGridLayout")
grid.CellPadding = UDim2.fromOffset(5, 5)
grid.CellSize = UDim2.fromOffset(76, 64)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.HorizontalAlignment = Enum.HorizontalAlignment.Right
grid.Parent = scroller

local mirrorState = nil
local roleplayState = nil
local busy = false

local function setActionLabelsVisible(visible: boolean)
	for _, item in actionLabels do
		item.Visible = visible
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
	panelTitle.Text = nextTitle
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
	statusText.Visible = false
	setActionLabelsVisible(true)
end

local showVehicles
local showTools
local showAnimations
local showAvatar
local showFamily
local showHomeCams
local showSettings

showVehicles = function()
	if not fetchMirrorState() then
		return
	end
	clearGrid()
	setHeader("Vehicle")
	local order = 1
	for _, vehicle in mirrorState.vehicles or {} do
		local id = tostring(vehicle.Id)
		local owned = mirrorState.ownedVehicles and mirrorState.ownedVehicles[id] == true
		tile(
			"▰",
			tostring(vehicle.Name),
			owned and "spawn" or (tostring(vehicle.Price) .. "¢"),
			owned and "✓" or "$",
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
	tile("×", "Despawn", "current", "", UI.red, order, function()
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
	local order = 1
	for _, item in mirrorState.inventory or {} do
		local id = tostring(item.Id)
		local owned = mirrorState.ownedTools and mirrorState.ownedTools[id] == true
		tile(
			"□",
			tostring(item.Name),
			owned and "equip" or (tostring(item.Price) .. "¢"),
			owned and "✓" or "$",
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

showAnimations = function()
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
	clearGrid()
	setHeader("Avatar Editor")
	tile("☺", "Reset Avatar", "Roblox look", "", UI.blue, 1, function()
		pcall(function()
			resetAvatar:InvokeServer()
		end)
		closePanel()
	end)

	if fetchRoleplayState() then
		tile("ID", "Roleplay ID", tostring(roleplayState.displayName or "Player"), "", UI.blue, 2, function()
			showFamily()
		end)
		tile("♟", "Current Job", tostring(roleplayState.job or "None"), "", UI.blue, 3, function()
			showFamily()
		end)
	end
end

showFamily = function()
	if not fetchRoleplayState() then
		return
	end
	clearGrid()
	setHeader("Family")
	local order = 1
	tile("ID", tostring(roleplayState.displayName or "Player"), tostring(roleplayState.age or ""), "✓", UI.green, order, nil)
	order += 1
	for _, job in roleplayState.jobs or {} do
		local selected = tostring(job) == tostring(roleplayState.job)
		tile(
			"♟",
			tostring(job),
			selected and "current" or "choose",
			selected and "✓" or "",
			UI.green,
			order,
			selected and nil or function()
				pcall(function()
					setJob:InvokeServer(job)
				end)
				fetchRoleplayState()
				showFamily()
			end
		)
		order += 1
	end
end

showHomeCams = function()
	clearGrid()
	setHeader("Home Cams")
	tile("⌂", "My Home", "visit", "", UI.blue, 1, function()
		pcall(function()
			visitHome:InvokeServer()
		end)
		closePanel()
	end)
	tile("↺", "Town", "return", "", UI.blue, 2, function()
		pcall(function()
			returnWorld:InvokeServer()
		end)
		closePanel()
	end)
end

showSettings = function()
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

local function sendQuickChat(message: string)
	local channels = TextChatService:FindFirstChild("TextChannels")
	local general = if channels then channels:FindFirstChild("RBXGeneral") else nil
	if general and general:IsA("TextChannel") then
		pcall(function()
			general:SendAsync(message)
		end)
	end
	closePanel()
end

local function showQuickChat()
	clearGrid()
	setHeader("Quick Chat")
	local phrases = {"Hi!", "Let's go!", "Nice!", "Follow me!", "Thanks!", "See you!"}
	for index, phrase in phrases do
		tile("…", phrase, "send", "", UI.blue, index, function()
			sendQuickChat(phrase)
		end)
	end
end

avatarBtn.Activated:Connect(showAvatar)
toolsBtn.Activated:Connect(showTools)
animationsBtn.Activated:Connect(showAnimations)
vehicleBtn.Activated:Connect(showVehicles)

houseBtn.Activated:Connect(function()
	closePanel()
	if openStore and openStore:IsA("BindableEvent") then
		openStore:Fire()
	end
end)

quickChatBolt.Activated:Connect(showQuickChat)
quickChatButton.Activated:Connect(showQuickChat)
familyButton.Activated:Connect(showFamily)
homeCamsButton.Activated:Connect(showHomeCams)
settingsButton.Activated:Connect(showSettings)
close.Activated:Connect(closePanel)

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible then
		statusText.Visible = false
	end
end)
