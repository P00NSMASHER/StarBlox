--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxShop")
local getState = remotes:WaitForChild("GetState") :: RemoteFunction
local purchaseItem = remotes:WaitForChild("PurchaseItem") :: RemoteFunction
local purchaseHome = remotes:WaitForChild("PurchaseHomeTier") :: RemoteFunction
local visitHome = remotes:WaitForChild("VisitHome") :: RemoteFunction
local returnWorld = remotes:WaitForChild("ReturnWorld") :: RemoteFunction

local COLORS = {
	navy = Color3.fromRGB(30, 36, 56),
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
gui.Name = "StarBloxShopUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 25
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

local shopButton = Instance.new("TextButton")
shopButton.Name = "ShopButton"
shopButton.AnchorPoint = Vector2.new(1, 0)
shopButton.Position = UDim2.new(1, -12, 0, 110)
shopButton.Size = UDim2.fromOffset(78, 32)
shopButton.BackgroundColor3 = COLORS.accent
shopButton.Text = "Shop"
shopButton.TextColor3 = COLORS.text
shopButton.Font = Enum.Font.GothamBold
shopButton.TextScaled = true
shopButton.Parent = gui
shopButton.Selectable = true
round(shopButton, 10)
constrainText(shopButton, 12, 15)

local homeButton = Instance.new("TextButton")
homeButton.Name = "HomeButton"
homeButton.AnchorPoint = Vector2.new(1, 0)
homeButton.Position = UDim2.new(1, -98, 0, 110)
homeButton.Size = UDim2.fromOffset(78, 32)
homeButton.BackgroundColor3 = COLORS.navy
homeButton.Text = "Home"
homeButton.TextColor3 = COLORS.text
homeButton.Font = Enum.Font.GothamBold
homeButton.TextScaled = true
homeButton.Parent = gui
homeButton.Selectable = true
round(homeButton, 10)
constrainText(homeButton, 12, 15)

local panel = Instance.new("Frame")
panel.Name = "ShopPanel"
panel.AnchorPoint = Vector2.new(0.5, 0.5)
panel.Position = UDim2.fromScale(0.5, 0.52)
panel.Size = UDim2.new(0.88, 0, 0, 330)
panel.BackgroundColor3 = COLORS.panel
panel.Visible = false
panel.ZIndex = 60
panel.Parent = gui
round(panel, 16)

local panelConstraint = Instance.new("UISizeConstraint")
panelConstraint.MinSize = Vector2.new(330, 300)
panelConstraint.MaxSize = Vector2.new(620, 330)
panelConstraint.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundTransparency = 1
title.Position = UDim2.fromOffset(16, 10)
title.Size = UDim2.new(1, -80, 0, 28)
title.Text = "StarBlox Shop"
title.TextColor3 = COLORS.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 61
title.Parent = panel
constrainText(title, 15, 20)

local closeButton = Instance.new("TextButton")
closeButton.AnchorPoint = Vector2.new(1, 0)
closeButton.Position = UDim2.new(1, -10, 0, 8)
closeButton.Size = UDim2.fromOffset(44, 44)
closeButton.BackgroundColor3 = COLORS.row
closeButton.Text = "×"
closeButton.TextColor3 = COLORS.text
closeButton.Font = Enum.Font.GothamBold
closeButton.TextScaled = true
closeButton.ZIndex = 62
closeButton.Parent = panel
closeButton.Selectable = true
round(closeButton, 12)
constrainText(closeButton, 20, 26)

local subtitle = Instance.new("TextLabel")
subtitle.BackgroundTransparency = 1
subtitle.Position = UDim2.fromOffset(16, 40)
subtitle.Size = UDim2.new(1, -32, 0, 24)
subtitle.Text = "Correct answers earn coins."
subtitle.TextColor3 = COLORS.warning
subtitle.Font = Enum.Font.GothamMedium
subtitle.TextScaled = true
subtitle.TextXAlignment = Enum.TextXAlignment.Left
subtitle.ZIndex = 61
subtitle.Parent = panel
constrainText(subtitle, 11, 14)

local balance = Instance.new("TextLabel")
balance.BackgroundTransparency = 1
balance.Position = UDim2.fromOffset(16, 65)
balance.Size = UDim2.new(1, -32, 0, 24)
balance.Text = "Coins 0"
balance.TextColor3 = COLORS.text
balance.Font = Enum.Font.GothamBold
balance.TextScaled = true
balance.TextXAlignment = Enum.TextXAlignment.Left
balance.ZIndex = 61
balance.Parent = panel
constrainText(balance, 12, 15)

local scroller = Instance.new("ScrollingFrame")
scroller.Name = "Catalog"
scroller.Position = UDim2.fromOffset(12, 94)
scroller.Size = UDim2.new(1, -24, 1, -106)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0, 0)
scroller.ScrollBarThickness = 6
scroller.ZIndex = 61
scroller.Parent = panel

local list = Instance.new("UIListLayout")
list.Padding = UDim.new(0, 6)
list.SortOrder = Enum.SortOrder.LayoutOrder
list.Parent = scroller

local state = nil
local atHome = false
local busy = false

local function clearRows()
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
	label.ZIndex = 62
	label.Parent = scroller
	constrainText(label, 12, 15)
end

local function row(
	name: string,
	price: number,
	buttonText: string,
	enabled: boolean,
	order: number,
	callback: () -> ()
)
	local frame = Instance.new("Frame")
	frame.LayoutOrder = order
	frame.Size = UDim2.new(1, -4, 0, 50)
	frame.BackgroundColor3 = COLORS.row
	frame.ZIndex = 62
	frame.Parent = scroller
	round(frame, 10)

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = UDim2.fromOffset(12, 4)
	label.Size = UDim2.new(1, -126, 1, -8)
	label.Text = string.format("%s  •  %d coins", name, price)
	label.TextColor3 = COLORS.text
	label.Font = Enum.Font.GothamMedium
	label.TextScaled = true
	label.TextWrapped = true
	label.TextXAlignment = Enum.TextXAlignment.Left
	label.ZIndex = 63
	label.Parent = frame
	constrainText(label, 11, 14)

	local button = Instance.new("TextButton")
	button.AnchorPoint = Vector2.new(1, 0.5)
	button.Position = UDim2.new(1, -6, 0.5, 0)
	button.Size = UDim2.fromOffset(104, 40)
	button.BackgroundColor3 = if enabled then COLORS.accent else COLORS.navy
	button.Text = buttonText
	button.TextColor3 = if enabled then COLORS.text else COLORS.muted
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.Active = enabled
	button.AutoButtonColor = enabled
	button.Selectable = enabled
	button.ZIndex = 64
	button.Parent = frame
	round(button, 10)
	constrainText(button, 11, 14)

	if enabled then
		button.Activated:Connect(callback)
	end
end

local function fetchState()
	local ok, result = pcall(function()
		return getState:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		state = result
		balance.Text = string.format("Coins %d  •  Home Tier %d", tonumber(result.coins) or 0, tonumber(result.homeTier) or 1)
		return true
	end
	return false
end

local renderState

local function purchaseItemById(itemId: string)
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return purchaseItem:InvokeServer(itemId)
	end)
	busy = false
	if ok and type(result) == "table" then
		if result.ok == true then
			fetchState()
			renderState()
		elseif result.code == "not_enough_coins" then
			subtitle.Text = "Answer more questions to earn the coins you need."
			subtitle.TextColor3 = COLORS.danger
		end
	end
end

local function purchaseTier(tier: number)
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		return purchaseHome:InvokeServer(tier)
	end)
	busy = false
	if ok and type(result) == "table" then
		if result.ok == true then
			fetchState()
			renderState()
		elseif result.code == "not_enough_coins" then
			subtitle.Text = "Answer more questions to upgrade your home."
			subtitle.TextColor3 = COLORS.danger
		end
	end
end

renderState = function()
	if type(state) ~= "table" then
		return
	end
	clearRows()
	subtitle.Text = "Correct answers earn coins."
	subtitle.TextColor3 = COLORS.warning

	local order = 1
	section("Home upgrades", order)
	order += 1
	for _, home in state.homes or {} do
		local tier = tonumber(home.Tier) or 1
		local current = tonumber(state.homeTier) or 1
		local buttonText = "Buy"
		local enabled = tier == current + 1
		if tier == current then
			buttonText = "Current"
		elseif tier < current then
			buttonText = "Owned"
		elseif tier > current + 1 then
			buttonText = "Locked"
		end
		row(tostring(home.Name), tonumber(home.Price) or 0, buttonText, enabled, order, function()
			purchaseTier(tier)
		end)
		order += 1
	end

	section("Furniture & decor", order)
	order += 1
	for _, item in state.items or {} do
		local itemId = tostring(item.Id)
		local owned = state.ownedItems and state.ownedItems[itemId] == true
		row(
			tostring(item.Name),
			tonumber(item.Price) or 0,
			owned and "Owned" or "Buy",
			not owned,
			order,
			function()
				purchaseItemById(itemId)
			end
		)
		order += 1
	end
end

shopButton.Activated:Connect(function()
	if panel.Visible then
		panel.Visible = false
		return
	end
	if fetchState() then
		renderState()
		panel.Visible = true
	end
end)

closeButton.Activated:Connect(function()
	panel.Visible = false
end)

homeButton.Activated:Connect(function()
	if busy then
		return
	end
	busy = true
	local ok, result = pcall(function()
		if atHome then
			return returnWorld:InvokeServer()
		end
		return visitHome:InvokeServer()
	end)
	busy = false
	if ok and type(result) == "table" and result.ok == true then
		atHome = not atHome
		homeButton.Text = if atHome then "World" else "Home"
		panel.Visible = false
	end
end)

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible and fetchState() then
		renderState()
	end
end)
