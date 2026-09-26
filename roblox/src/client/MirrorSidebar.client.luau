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

local shopRemotes = ReplicatedStorage:WaitForChild("StarBloxShop")
local visitHome = shopRemotes:WaitForChild("VisitHome") :: RemoteFunction
local returnWorld = shopRemotes:WaitForChild("ReturnWorld") :: RemoteFunction

local shopGui = playerGui:WaitForChild("StarBloxShopUI", 10)
local openStore = if shopGui then shopGui:FindFirstChild("OpenStore") else nil

local UI = {
	white = Color3.fromRGB(245, 245, 245),
	tile = Color3.fromRGB(222, 222, 222),
	tileDark = Color3.fromRGB(194, 194, 194),
	border = Color3.fromRGB(115, 115, 115),
	text = Color3.fromRGB(42, 42, 42),
	muted = Color3.fromRGB(90, 90, 90),
	red = Color3.fromRGB(210, 49, 49),
	green = Color3.fromRGB(68, 173, 92),
	blue = Color3.fromRGB(80, 154, 221),
	coin = Color3.fromRGB(228, 183, 50),
}

local function round(guiObject: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = guiObject
end

local function stroke(guiObject: GuiObject, color: Color3?, thickness: number?)
	local line = Instance.new("UIStroke")
	line.Color = color or UI.border
	line.Thickness = thickness or 1
	line.Transparency = 0.15
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

-- Brookhaven keeps its navigation as separate light square buttons down the right edge.
local rail = Instance.new("Frame")
rail.Name = "Sidebar"
rail.AnchorPoint = Vector2.new(1, 0.5)
rail.Position = UDim2.new(1, -8, 0.5, 14)
rail.Size = UDim2.fromOffset(54, 326)
rail.BackgroundTransparency = 1
rail.Parent = gui

local railScroll = Instance.new("ScrollingFrame")
railScroll.Name = "Actions"
railScroll.Size = UDim2.fromScale(1, 1)
railScroll.BackgroundTransparency = 1
railScroll.BorderSizePixel = 0
railScroll.ScrollBarThickness = 0
railScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
railScroll.CanvasSize = UDim2.fromOffset(0, 0)
railScroll.Parent = rail

local railList = Instance.new("UIListLayout")
railList.Padding = UDim.new(0, 4)
railList.HorizontalAlignment = Enum.HorizontalAlignment.Center
railList.SortOrder = Enum.SortOrder.LayoutOrder
railList.Parent = railScroll

local function railButton(symbol: string, name: string, order: number): TextButton
	local b = Instance.new("TextButton")
	b.Name = name .. "Button"
	b.LayoutOrder = order
	b.Size = UDim2.fromOffset(50, 50)
	b.BackgroundColor3 = UI.white
	b.BackgroundTransparency = 0.05
	b.Text = symbol
	b.TextColor3 = UI.text
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.AutoButtonColor = true
	b.Selectable = true
	b.Parent = railScroll
	round(b, 8)
	stroke(b)
	constrain(b, 18, 30)
	return b
end

local avatarBtn = railButton("☺", "Avatar", 1)
local inventoryBtn = railButton("▣", "Inventory", 2)
local emotesBtn = railButton("✦", "Emotes", 3)
local vehicleBtn = railButton("▰", "Vehicles", 4)
local housesBtn = railButton("⌂", "Houses", 5)
local bioBtn = railButton("ID", "Bio", 6)
local jobsBtn = railButton("JOB", "Jobs", 7)
local mapBtn = railButton("◇", "Map", 8)
local shopBtn = railButton("$", "Shop", 9)

-- The selection window sits immediately left of the rail, like Brookhaven vehicle/house menus.
local panel = Instance.new("Frame")
panel.Name = "MirrorPanel"
panel.AnchorPoint = Vector2.new(1, 0.5)
panel.Position = UDim2.new(1, -70, 0.5, 4)
panel.Size = UDim2.fromOffset(356, 326)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 0.06
panel.Visible = false
panel.ZIndex = 70
panel.Parent = gui
round(panel, 5)
stroke(panel)

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MinSize = Vector2.new(330, 300)
panelConstraint.MaxSize = Vector2.new(390, 340)
panelConstraint.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(10, 8)
title.Size = UDim2.new(1, -70, 0, 28)
title.Text = ""
title.TextColor3 = UI.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 71
title.Parent = panel
constrain(title, 14, 18)

local balance = Instance.new("TextLabel")
balance.BackgroundTransparency = 1
balance.Position = UDim2.fromOffset(10, 36)
balance.Size = UDim2.new(1, -20, 0, 20)
balance.Text = "0 coins"
balance.TextColor3 = UI.muted
balance.Font = Enum.Font.GothamMedium
balance.TextScaled = true
balance.TextXAlignment = Enum.TextXAlignment.Left
balance.ZIndex = 71
balance.Parent = panel
constrain(balance, 10, 13)

local close = Instance.new("TextButton")
close.Name = "Close"
close.AnchorPoint = Vector2.new(1, 0)
close.Position = UDim2.new(1, -6, 0, 6)
close.Size = UDim2.fromOffset(50, 50)
close.BackgroundColor3 = UI.red
close.Text = "X"
close.TextColor3 = Color3.new(1, 1, 1)
close.Font = Enum.Font.GothamBold
close.TextScaled = true
close.ZIndex = 73
close.Parent = panel
close.Selectable = true
round(close, 4)
stroke(close, Color3.fromRGB(135, 30, 30), 1)
constrain(close, 20, 28)

local scroller = Instance.new("ScrollingFrame")
scroller.Name = "Grid"
scroller.Position = UDim2.fromOffset(8, 62)
scroller.Size = UDim2.new(1, -16, 1, -70)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0, 0)
scroller.ScrollBarThickness = 5
scroller.ScrollBarImageColor3 = UI.border
scroller.ZIndex = 71
scroller.Parent = panel

local grid = Instance.new("UIGridLayout")
grid.CellPadding = UDim2.fromOffset(5, 5)
grid.CellSize = UDim2.fromOffset(78, 78)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.HorizontalAlignment = Enum.HorizontalAlignment.Left
grid.Parent = scroller

local mirrorState = nil
local roleplayState = nil
local busy = false

local function clearGrid()
	for _, child in scroller:GetChildren() do
		if child:IsA("GuiObject") and not child:IsA("UIGridLayout") then
			child:Destroy()
		end
	end
end

local function setHeader(nextTitle: string)
	title.Text = nextTitle
	balance.Text = string.format("%d coins", tonumber(player:GetAttribute("StarBloxCoins")) or 0)
	panel.Visible = true
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
	frame.Size = UDim2.fromOffset(78, 78)
	frame.BackgroundColor3 = UI.tile
	frame.ZIndex = 72
	frame.Parent = scroller
	round(frame, 4)
	stroke(frame)

	local icon = Instance.new("TextLabel")
	icon.BackgroundTransparency = 1
	icon.Position = UDim2.fromOffset(3, 2)
	icon.Size = UDim2.new(1, -6, 0, 33)
	icon.Text = symbol
	icon.TextColor3 = UI.text
	icon.Font = Enum.Font.GothamBold
	icon.TextScaled = true
	icon.ZIndex = 73
	icon.Parent = frame
	constrain(icon, 15, 24)

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = UDim2.fromOffset(4, 35)
	label.Size = UDim2.new(1, -8, 0, 19)
	label.Text = name
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextWrapped = true
	label.ZIndex = 73
	label.Parent = frame
	constrain(label, 8, 11)

	local detailLabel = Instance.new("TextLabel")
	detailLabel.BackgroundTransparency = 1
	detailLabel.Position = UDim2.fromOffset(3, 55)
	detailLabel.Size = UDim2.new(1, -6, 0, 18)
	detailLabel.Text = detail
	detailLabel.TextColor3 = UI.muted
	detailLabel.Font = Enum.Font.GothamMedium
	detailLabel.TextScaled = true
	detailLabel.ZIndex = 73
	detailLabel.Parent = frame
	constrain(detailLabel, 7, 9)

	if stateText ~= "" then
		local badge = Instance.new("TextLabel")
		badge.AnchorPoint = Vector2.new(1, 0)
		badge.Position = UDim2.new(1, -2, 0, 2)
		badge.Size = UDim2.fromOffset(25, 14)
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
		balance.Text = string.format("%d coins", tonumber(result.coins) or 0)
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
	if busy then return end
	busy = true
	local ok, result = pcall(function()
		return remote:InvokeServer(id)
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true then
		fetchMirrorState()
		rerender()
	elseif ok and type(result) == "table" and result.code == "not_enough_coins" then
		balance.Text = "Answer questions to earn more coins"
		balance.TextColor3 = UI.red
		task.delay(1.2, function()
			balance.TextColor3 = UI.muted
			if mirrorState then
				balance.Text = string.format("%d coins", tonumber(mirrorState.coins) or 0)
			end
		end)
	end
end

local showVehicles
local showInventory
local showJobs
local showBio
local showEmotes
local showAvatar
local showMap

showVehicles = function()
	if not fetchMirrorState() then return end
	clearGrid()
	setHeader("Vehicles")
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
					pcall(function() spawnVehicle:InvokeServer(id) end)
					panel.Visible = false
				else
					purchase(purchaseVehicle, id, showVehicles)
				end
			end
		)
		order += 1
	end
	tile("×","Despawn","current","",UI.red,order,function()
		pcall(function() despawnVehicle:InvokeServer() end)
		panel.Visible = false
	end)
end

showInventory = function()
	if not fetchMirrorState() then return end
	clearGrid()
	setHeader("Items")
	local order = 1
	for _, item in mirrorState.inventory or {} do
		local id = tostring(item.Id)
		local owned = mirrorState.ownedTools and mirrorState.ownedTools[id] == true
		tile(
			"▣",
			tostring(item.Name),
			owned and "equip" or (tostring(item.Price) .. "¢"),
			owned and "✓" or "$",
			owned and UI.green or UI.blue,
			order,
			function()
				if owned then
					pcall(function() equipTool:InvokeServer(id) end)
					panel.Visible = false
				else
					purchase(purchaseTool, id, showInventory)
				end
			end
		)
		order += 1
	end
end

showJobs = function()
	if not fetchRoleplayState() then return end
	clearGrid()
	setHeader("Jobs")
	local order = 1
	for _, job in roleplayState.jobs or {} do
		local selected = tostring(job) == tostring(roleplayState.job)
		tile(
			"JOB",
			tostring(job),
			selected and "current" or "choose",
			selected and "✓" or "",
			UI.green,
			order,
			selected and nil or function()
				pcall(function() setJob:InvokeServer(job) end)
				fetchRoleplayState()
				showJobs()
			end
		)
		order += 1
	end
end

showEmotes = function()
	clearGrid()
	setHeader("Emotes")
	local order = 1
	for _, emoteName in {"wave","point","cheer","laugh","dance","dance2","dance3"} do
		local label = string.upper(string.sub(emoteName,1,1)) .. string.sub(emoteName,2)
		tile("✦",label,"play","",UI.green,order,function()
			local character = player.Character
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if humanoid then pcall(function() humanoid:PlayEmote(emoteName) end) end
			panel.Visible = false
		end)
		order += 1
	end
end

showAvatar = function()
	clearGrid()
	setHeader("Avatar")
	tile("☺","Roblox Avatar","reset","",UI.blue,1,function()
		pcall(function() resetAvatar:InvokeServer() end)
		panel.Visible = false
	end)
end

showMap = function()
	clearGrid()
	setHeader("Map")
	tile("◇","Town","travel","",UI.blue,1,function()
		pcall(function() returnWorld:InvokeServer() end)
		panel.Visible = false
	end)
	tile("⌂","My Home","travel","",UI.blue,2,function()
		pcall(function() visitHome:InvokeServer() end)
		panel.Visible = false
	end)
end

local bioPanel = Instance.new("Frame")
bioPanel.Name = "BioEditor"
bioPanel.Size = UDim2.new(1, -16, 0, 170)
bioPanel.BackgroundTransparency = 1
bioPanel.Visible = false
bioPanel.ZIndex = 80
bioPanel.Parent = panel

local function showBio()
	if not fetchRoleplayState() then return end
	clearGrid()
	setHeader("Bio")
	bioPanel.Visible = true
	bioPanel.Position = UDim2.fromOffset(8, 70)

	local nameBox = Instance.new("TextBox")
	nameBox.Position = UDim2.fromOffset(0, 0)
	nameBox.Size = UDim2.new(1, -16, 0, 44)
	nameBox.BackgroundColor3 = UI.white
	nameBox.Text = tostring(roleplayState.displayName or "")
	nameBox.PlaceholderText = "Roleplay name"
	nameBox.TextColor3 = UI.text
	nameBox.Font = Enum.Font.GothamMedium
	nameBox.TextScaled = true
	nameBox.ClearTextOnFocus = false
	nameBox.Parent = bioPanel
	round(nameBox,4)
	stroke(nameBox)
	constrain(nameBox,12,15)

	local ageBox = nameBox:Clone()
	ageBox.Position = UDim2.fromOffset(0, 50)
	ageBox.Text = tostring(roleplayState.age or "")
	ageBox.PlaceholderText = "Age"
	ageBox.Parent = bioPanel

	local save = Instance.new("TextButton")
	save.Position = UDim2.fromOffset(0,100)
	save.Size = UDim2.new(1,-16,0,44)
	save.BackgroundColor3 = UI.green
	save.Text = "SAVE"
	save.TextColor3 = Color3.new(1,1,1)
	save.Font = Enum.Font.GothamBold
	save.TextScaled = true
	save.Parent = bioPanel
	round(save,4)
	constrain(save,12,16)
	save.Activated:Connect(function()
		pcall(function() saveBio:InvokeServer(nameBox.Text, ageBox.Text) end)
		panel.Visible = false
	end)
end

local function hideBio()
	for _, child in bioPanel:GetChildren() do
		if child:IsA("GuiObject") then child:Destroy() end
	end
	bioPanel.Visible = false
end

local function wrap(action: () -> ())
	return function()
		hideBio()
		action()
	end
end

avatarBtn.Activated:Connect(wrap(showAvatar))
inventoryBtn.Activated:Connect(wrap(showInventory))
emotesBtn.Activated:Connect(wrap(showEmotes))
vehicleBtn.Activated:Connect(wrap(showVehicles))
bioBtn.Activated:Connect(wrap(showBio))
jobsBtn.Activated:Connect(wrap(showJobs))
mapBtn.Activated:Connect(wrap(showMap))

housesBtn.Activated:Connect(function()
	hideBio()
	panel.Visible = false
	if openStore and openStore:IsA("BindableEvent") then openStore:Fire() end
end)

shopBtn.Activated:Connect(function()
	hideBio()
	panel.Visible = false
	if openStore and openStore:IsA("BindableEvent") then openStore:Fire() end
end)

close.Activated:Connect(function()
	hideBio()
	panel.Visible = false
end)

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible then
		balance.Text = string.format("%d coins", tonumber(player:GetAttribute("StarBloxCoins")) or 0)
	end
end)
