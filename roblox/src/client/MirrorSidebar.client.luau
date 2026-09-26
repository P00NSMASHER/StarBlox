--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local mirrorRemotes = ReplicatedStorage:WaitForChild("StarBloxMirror")
local getState = mirrorRemotes:WaitForChild("GetState") :: RemoteFunction
local purchaseVehicle = mirrorRemotes:WaitForChild("PurchaseVehicle") :: RemoteFunction
local spawnVehicle = mirrorRemotes:WaitForChild("SpawnVehicle") :: RemoteFunction
local despawnVehicle = mirrorRemotes:WaitForChild("DespawnVehicle") :: RemoteFunction
local purchaseTool = mirrorRemotes:WaitForChild("PurchaseTool") :: RemoteFunction
local equipTool = mirrorRemotes:WaitForChild("EquipTool") :: RemoteFunction

local shopGui = playerGui:WaitForChild("StarBloxShopUI", 10)
local openStore = if shopGui then shopGui:FindFirstChild("OpenStore") else nil
local toggleHome = if shopGui then shopGui:FindFirstChild("ToggleHome") else nil

local COLORS = {
	rail = Color3.fromRGB(30, 36, 56),
	panel = Color3.fromRGB(42, 49, 74),
	row = Color3.fromRGB(55, 64, 94),
	text = Color3.fromRGB(248, 250, 255),
	muted = Color3.fromRGB(194, 202, 225),
	accent = Color3.fromRGB(109, 104, 255),
	success = Color3.fromRGB(66, 204, 156),
	warning = Color3.fromRGB(255, 184, 77),
	danger = Color3.fromRGB(255, 104, 116),
}

local function round(guiObject: GuiObject, radius: number)
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, radius)
	corner.Parent = guiObject
end

local function constrainText(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local constraint = Instance.new("UITextSizeConstraint")
	constraint.MinTextSize = minSize
	constraint.MaxTextSize = maxSize
	constraint.Parent = label
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

local rail = Instance.new("Frame")
rail.Name = "Sidebar"
rail.AnchorPoint = Vector2.new(1, 0.5)
rail.Position = UDim2.new(1, -8, 0.5, 18)
rail.Size = UDim2.fromOffset(54, 232)
rail.BackgroundColor3 = COLORS.rail
rail.BackgroundTransparency = 0.12
rail.Parent = gui
round(rail, 16)

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 4)
list.HorizontalAlignment = Enum.HorizontalAlignment.Center
list.VerticalAlignment = Enum.VerticalAlignment.Center
list.Parent = rail

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 6)
padding.PaddingBottom = UDim.new(0, 6)
padding.Parent = rail

local panel = Instance.new("Frame")
panel.Name = "MirrorPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.52)
panel.Size = UDim2.new(0.86, 0, 0, 330)
panel.BackgroundColor3 = COLORS.panel
panel.Visible = false
panel.ZIndex = 70
panel.Parent = gui
round(panel, 16)

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MinSize = Vector2.new(320, 300)
panelConstraint.MaxSize = Vector2.new(620, 330)
panelConstraint.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(16, 10)
title.Size = UDim2.new(1, -78, 0, 30)
title.Text = "StarBlox"
title.TextColor3 = COLORS.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 71
title.Parent = panel
constrainText(title, 15, 20)

local subtitle = Instance.new("TextLabel")
subtitle.BackgroundTransparency = 1
subtitle.Position = UDim2.fromOffset(16, 42)
subtitle.Size = UDim2.new(1, -32, 0, 24)
subtitle.Text = "Answer questions to earn coins."
subtitle.TextColor3 = COLORS.warning
subtitle.Font = Enum.Font.GothamMedium
subtitle.TextScaled = true
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.ZIndex = 71
subtitle.Parent = panel
constrainText(subtitle, 11, 14)

local close = Instance.new("TextButton")
close.AnchorPoint = Vector2.new(1, 0)
close.Position = UDim2.new(1, -10, 0, 8)
close.Size = UDim2.fromOffset(44, 44)
close.BackgroundColor3 = COLORS.row
close.Text = "×"
close.TextColor3 = COLORS.text
close.Font = Enum.Font.GothamBold
close.TextScaled = true
close.ZIndex = 72
close.Parent = panel
close.Selectable = true
round(close, 12)
constrainText(close, 20, 26)

local balance = Instance.new("TextLabel")
balance.BackgroundTransparency = 1
balance.Position = UDim2.fromOffset(16, 68)
balance.Size = UDim2.new(1, -32, 0, 22)
balance.Text = "Coins 0"
balance.TextColor3 = COLORS.text
balance.Font = Enum.Font.GothamBold
balance.TextScaled = true
balance.TextXAlignment = Enum.TextXAlignment.Left
balance.ZIndex = 71
balance.Parent = panel
constrainText(balance, 12, 15)

local scroller = Instance.new("ScrollingFrame")
scroller.Position = UDim2.fromOffset(12, 96)
scroller.Size = UDim2.new(1, -24, 1, -108)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0, 0)
scroller.ScrollBarThickness = 5
scroller.ZIndex = 71
scroller.Parent = panel

local contentList = Instance.new("UIListLayout")
contentList.Padding = UDim.new(0, 6)
contentList.SortOrder = Enum.SortOrder.LayoutOrder
contentList.Parent = scroller

local state = nil
local busy = false

local function button(label: string): TextButton
	local b = Instance.new("TextButton")
	b.Size = UDim2.fromOffset(44, 44)
	b.BackgroundColor3 = COLORS.row
	b.Text = label
	b.TextColor3 = COLORS.text
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.Selectable = true
	b.Parent = rail
	round(b, 12)
	constrainText(b, 9, 12)
	return b
end

local homeBtn = button("Home")
local vehicleBtn = button("Cars")
local inventoryBtn = button("Items")
local shopBtn = button("Shop")

local function clear()
	for _, child in scroller:GetChildren() do
		if child:IsA("Frame") or child:IsA("TextLabel") then
			child:Destroy()
		end
	end
end

local function section(text: string, order: number)
	local label = Instance.new("TextLabel")
	label.LayoutOrder = order
	label.Size = UDim2.new(1, -4, 0, 28)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = COLORS.warning
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.ZIndex = 72
	label.Parent = scroller
	constrainText(label, 12, 15)
end

local function row(
	name: string,
	detail: string,
	action: string,
	enabled: boolean,
	order: number,
	callback: () -> ()
)
	local frame = Instance.new("Frame")
	frame.LayoutOrder = order
	frame.Size = UDim2.new(1, -4, 0, 58)
	frame.BackgroundColor3 = COLORS.row
	frame.ZIndex = 72
	frame.Parent = scroller
	round(frame, 10)

	local nameLabel = Instance.new("TextLabel")
	nameLabel.BackgroundTransparency = 1
	nameLabel.Position = UDim2.fromOffset(12, 4)
	nameLabel.Size = UDim2.new(1, -126, 0, 25)
	nameLabel.Text = name
	nameLabel.TextColor3 = COLORS.text
	nameLabel.Font = Enum.Font.GothamBold
	nameLabel.TextScaled = true
	nameLabel.TextXAlignment = Enum.TextXAlignment.Left
	nameLabel.ZIndex = 73
	nameLabel.Parent = frame
	constrainText(nameLabel, 11, 14)

	local detailLabel = Instance.new("TextLabel")
	detailLabel.BackgroundTransparency = 1
	detailLabel.Position = UDim2.fromOffset(12, 29)
	detailLabel.Size = UDim2.new(1, -126, 0, 20)
	detailLabel.Text = detail
	detailLabel.TextColor3 = COLORS.muted
	detailLabel.Font = Enum.Font.GothamMedium
	detailLabel.TextScaled = true
	detailLabel.TextXAlignment = Enum.TextXAlignment.Left
	detailLabel.ZIndex = 73
	detailLabel.Parent = frame
	constrainText(detailLabel, 10, 12)

	local actionButton = Instance.new("TextButton")
	actionButton.AnchorPoint = Vector2.new(1, 0.5)
	actionButton.Position = UDim2.new(1, -6, 0.5, 0)
	actionButton.Size = UDim2.fromOffset(104, 44)
	actionButton.BackgroundColor3 = if enabled then COLORS.accent else COLORS.rail
	actionButton.Text = action
	actionButton.TextColor3 = if enabled then COLORS.text else COLORS.muted
	actionButton.Font = Enum.Font.GothamBold
	actionButton.TextScaled = true
	actionButton.Active = enabled
	actionButton.AutoButtonColor = enabled
	actionButton.Selectable = enabled
	actionButton.ZIndex = 74
	actionButton.Parent = frame
	round(actionButton, 10)
	constrainText(actionButton, 10, 13)

	if enabled then
		actionButton.Activated:Connect(callback)
	end
end

local function fetchState(): boolean
	local ok, result = pcall(function()
		return getState:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		state = result
		balance.Text = string.format("Coins %d", tonumber(result.coins) or 0)
		return true
	end
	return false
end

local function purchaseAndRefresh(remote: RemoteFunction, id: string, rerender: () -> ())
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return remote:InvokeServer(id)
	end)
	busy = false
	if ok and type(result) == "table" then
		if result.ok == true then
			fetchState()
			rerender()
		elseif result.code == "not_enough_coins" then
			subtitle.Text = "Answer more questions to earn the coins you need."
			subtitle.TextColor3 = COLORS.danger
		end
	end
end

local showVehicles
local showInventory

showVehicles = function()
	if not fetchState() then
		return
	end
	clear()
	panel.Visible = true
	title.Text = "Vehicles"
	subtitle.Text = "Buy with learning coins. Spawn owned vehicles anywhere."
	subtitle.TextColor3 = COLORS.warning
	local order = 1
	section("Garage", order)
	order += 1
	for _, vehicle in state.vehicles or {} do
		local id = tostring(vehicle.Id)
		local owned = state.ownedVehicles and state.ownedVehicles[id] == true
		local detail = string.format("%d coins • %d seats", tonumber(vehicle.Price) or 0, tonumber(vehicle.Seats) or 1)
		row(tostring(vehicle.Name), detail, owned and "Spawn" or "Buy", true, order, function()
			if owned then
				pcall(function()
					spawnVehicle:InvokeServer(id)
				end)
				panel.Visible = false
			else
				purchaseAndRefresh(purchaseVehicle, id, showVehicles)
			end
		end)
		order += 1
	end
	row("Current Vehicle", "Remove your spawned vehicle", "Despawn", true, order, function()
		pcall(function()
			despawnVehicle:InvokeServer()
		end)
		panel.Visible = false
	end)
end

showInventory = function()
	if not fetchState() then
		return
	end
	clear()
	panel.Visible = true
	title.Text = "Inventory"
	subtitle.Text = "Carry props and tools around town."
	subtitle.TextColor3 = COLORS.warning
	local order = 1
	section("Backpack", order)
	order += 1
	for _, item in state.inventory or {} do
		local id = tostring(item.Id)
		local owned = state.ownedTools and state.ownedTools[id] == true
		local detail = if tonumber(item.Price) == 0 then "Included" else tostring(item.Price) .. " coins"
		row(tostring(item.Name), detail, owned and "Equip" or "Buy", true, order, function()
			if owned then
				pcall(function()
					equipTool:InvokeServer(id)
				end)
				panel.Visible = false
			else
				purchaseAndRefresh(purchaseTool, id, showInventory)
			end
		end)
		order += 1
	end
end

homeBtn.Activated:Connect(function()
	if toggleHome and toggleHome:IsA("BindableEvent") then
		toggleHome:Fire()
	end
	panel.Visible = false
end)

vehicleBtn.Activated:Connect(showVehicles)
inventoryBtn.Activated:Connect(showInventory)

shopBtn.Activated:Connect(function()
	panel.Visible = false
	if openStore and openStore:IsA("BindableEvent") then
		openStore:Fire()
	end
end)

close.Activated:Connect(function()
	panel.Visible = false
end)

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible then
		balance.Text = string.format("Coins %d", tonumber(player:GetAttribute("StarBloxCoins")) or 0)
	end
end)
