--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("StarBloxShop")
local getState = remotes:WaitForChild("GetState") :: RemoteFunction
local purchaseItem = remotes:WaitForChild("PurchaseItem") :: RemoteFunction
local purchaseHome = remotes:WaitForChild("PurchaseHomeTier") :: RemoteFunction
local purchaseHomeStyle = remotes:WaitForChild("PurchaseHomeStyle") :: RemoteFunction
local selectHomeStyle = remotes:WaitForChild("SelectHomeStyle") :: RemoteFunction
local setDoorsLocked = remotes:WaitForChild("SetDoorsLocked") :: RemoteFunction
local visitHome = remotes:WaitForChild("VisitHome") :: RemoteFunction
local returnWorld = remotes:WaitForChild("ReturnWorld") :: RemoteFunction

local UI = {
	white = Color3.fromRGB(245,245,245),
	tile = Color3.fromRGB(222,222,222),
	border = Color3.fromRGB(115,115,115),
	text = Color3.fromRGB(42,42,42),
	muted = Color3.fromRGB(90,90,90),
	red = Color3.fromRGB(210,49,49),
	green = Color3.fromRGB(68,173,92),
	blue = Color3.fromRGB(80,154,221),
}

local function round(guiObject: GuiObject, radius: number)
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0,radius)
	c.Parent = guiObject
end

local function stroke(guiObject: GuiObject, color: Color3?)
	local s = Instance.new("UIStroke")
	s.Color = color or UI.border
	s.Thickness = 1
	s.Transparency = 0.15
	s.Parent = guiObject
end

local function constrain(label: TextLabel | TextButton, minSize: number, maxSize: number)
	local c = Instance.new("UITextSizeConstraint")
	c.MinTextSize = minSize
	c.MaxTextSize = maxSize
	c.Parent = label
end

local gui = Instance.new("ScreenGui")
gui.Name = "StarBloxShopUI"
gui.ResetOnSpawn = false
gui.IgnoreGuiInset = false
gui.DisplayOrder = 26
pcall(function()
	gui.ScreenInsets = Enum.ScreenInsets.DeviceSafeInsets
end)
gui.Parent = playerGui

-- Kept only as compatibility hooks for older tests/callers; hidden from players.
local shopButton = Instance.new("TextButton")
shopButton.Name = "ShopButton"
shopButton.Size = UDim2.fromOffset(84, 44)
shopButton.Visible = false
shopButton.Parent = gui

local homeButton = Instance.new("TextButton")
homeButton.Name = "HomeButton"
homeButton.Size = UDim2.fromOffset(84, 44)
homeButton.Visible = false
homeButton.Parent = gui

local panel = Instance.new("Frame")
panel.Name = "ShopPanel"
panel.AnchorPoint = Vector2.new(1,0)
panel.Position = UDim2.new(1,-83,0,105)
panel.Size = UDim2.fromOffset(326,309)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 1
panel.Visible = false
panel.ZIndex = 60
panel.Parent = gui
round(panel,5)

local constraint = Instance.new("UISizeConstraint")
constraint.MinSize = Vector2.new(300,286)
constraint.MaxSize = Vector2.new(340,322)
constraint.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundColor3 = UI.white
title.BackgroundTransparency = 0.14
title.Position = UDim2.fromOffset(0,2)
title.Size = UDim2.fromOffset(198,42)
title.Text = "Houses"
title.TextColor3 = UI.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 61
title.Parent = panel
constrain(title,14,18)

local balance = Instance.new("TextLabel")
balance.BackgroundTransparency = 1
balance.Position = UDim2.fromOffset(0,47)
balance.Size = UDim2.fromOffset(198,20)
balance.Text = "0 coins"
balance.TextColor3 = UI.muted
balance.Font = Enum.Font.GothamMedium
balance.TextScaled = true
balance.TextXAlignment = Enum.TextXAlignment.Left
balance.Visible = false
balance.ZIndex = 61
balance.Parent = panel
constrain(balance,10,13)

local visit = Instance.new("TextButton")
visit.Name = "VisitHome"
visit.AnchorPoint = Vector2.new(1,0)
visit.Position = UDim2.new(1,-116,0,6)
visit.Size = UDim2.fromOffset(50, 50)
visit.BackgroundColor3 = UI.white
visit.Text = "⌂"
visit.TextColor3 = UI.text
visit.Font = Enum.Font.GothamBold
visit.TextScaled = true
visit.ZIndex = 63
visit.Parent = panel
visit.Visible = false
round(visit,4)
stroke(visit)
constrain(visit,20,28)

local world = Instance.new("TextButton")
world.Name = "ReturnWorld"
world.AnchorPoint = Vector2.new(1,0)
world.Position = UDim2.new(1,-62,0,6)
world.Size = UDim2.fromOffset(50, 50)
world.BackgroundColor3 = UI.white
world.Text = "↺"
world.TextColor3 = UI.text
world.Font = Enum.Font.GothamBold
world.TextScaled = true
world.ZIndex = 63
world.Parent = panel
world.Visible = false
round(world,4)
stroke(world)
constrain(world,20,28)

local closeButton = Instance.new("TextButton")
closeButton.Name = "CloseButton"
closeButton.AnchorPoint = Vector2.new(1,0)
closeButton.Position = UDim2.new(1,0,0,0)
closeButton.Size = UDim2.fromOffset(52,48)
closeButton.BackgroundColor3 = UI.red
closeButton.Text = "X"
closeButton.TextColor3 = Color3.new(1,1,1)
closeButton.Font = Enum.Font.GothamBold
closeButton.TextScaled = true
closeButton.ZIndex = 63
closeButton.Parent = panel
round(closeButton,4)
stroke(closeButton,Color3.fromRGB(135,30,30))
constrain(closeButton,20,28)

local scroller = Instance.new("ScrollingFrame")
scroller.Name = "Catalog"
scroller.Position = UDim2.fromOffset(0,54)
scroller.Size = UDim2.new(1,0,1,-58)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0,0)
scroller.ScrollBarThickness = 5
scroller.ScrollBarImageColor3 = UI.border
scroller.ZIndex = 61
scroller.Parent = panel

local grid = Instance.new("UIGridLayout")
grid.CellPadding = UDim2.fromOffset(5,5)
grid.CellSize = UDim2.fromOffset(76,64)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.Parent = scroller

local state = nil
local busy = false

local editPlacement = Instance.new("BindableEvent")
editPlacement.Name = "EditPlacement"
editPlacement.Parent = gui

local function clear()
	for _, child in scroller:GetChildren() do
		if child:IsA("GuiObject") and not child:IsA("UIGridLayout") then
			child:Destroy()
		end
	end
end

local function symbolFor(kind: string): string
	if kind == "bed" then return "▤" end
	if kind == "chair" then return "⌑" end
	if kind == "desk" then return "▭" end
	if kind == "lamp" then return "◉" end
	if kind == "poster" then return "▧" end
	if kind == "rug" then return "▬" end
	if kind == "books" then return "▥" end
	return "□"
end

local function tile(
	symbol: string,
	name: string,
	detail: string,
	badgeText: string,
	badgeColor: Color3,
	order: number,
	callback: (() -> ())?
)
	local frame = Instance.new("Frame")
	frame.LayoutOrder = order
	frame.Size = UDim2.fromOffset(76,64)
	frame.BackgroundColor3 = UI.tile
	frame.BackgroundTransparency = 0.12
	frame.ZIndex = 62
	frame.Parent = scroller
	round(frame,4)
	stroke(frame)

	local icon = Instance.new("TextLabel")
	icon.BackgroundTransparency = 1
	icon.Position = UDim2.fromOffset(3,2)
	icon.Size = UDim2.new(1,-6,0,30)
	icon.Text = symbol
	icon.TextColor3 = UI.text
	icon.Font = Enum.Font.GothamBold
	icon.TextScaled = true
	icon.ZIndex = 63
	icon.Parent = frame
	constrain(icon,15,24)

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = UDim2.fromOffset(4,30)
	label.Size = UDim2.new(1,-8,0,18)
	label.Text = name
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextWrapped = true
	label.ZIndex = 63
	label.Parent = frame
	constrain(label,8,11)

	local d = Instance.new("TextLabel")
	d.BackgroundTransparency = 1
	d.Position = UDim2.fromOffset(3,48)
	d.Size = UDim2.new(1,-6,0,13)
	d.Text = detail
	d.TextColor3 = UI.muted
	d.Font = Enum.Font.GothamMedium
	d.TextScaled = true
	d.ZIndex = 63
	d.Parent = frame
	constrain(d,7,9)

	if badgeText ~= "" then
		local badge = Instance.new("TextLabel")
		badge.AnchorPoint = Vector2.new(1,0)
		badge.Position = UDim2.new(1,-2,0,2)
		badge.Size = UDim2.fromOffset(25,14)
		badge.BackgroundColor3 = badgeColor
		badge.Text = badgeText
		badge.TextColor3 = Color3.new(1,1,1)
		badge.Font = Enum.Font.GothamBold
		badge.TextScaled = true
		badge.ZIndex = 65
		badge.Parent = frame
		round(badge,3)
		constrain(badge,6,9)
	end

	if callback then
		local hit = Instance.new("TextButton")
		hit.Size = UDim2.fromScale(1,1)
		hit.BackgroundTransparency = 1
		hit.Text = ""
		hit.ZIndex = 66
		hit.Parent = frame
		hit.Activated:Connect(callback)
	end
end

local function fetchState(): boolean
	local ok,result = pcall(function()
		return getState:InvokeServer()
	end)
	if ok and type(result)=="table" and result.ok==true then
		state=result
		balance.Text=string.format("%d coins • home %d",tonumber(result.coins) or 0,tonumber(result.homeTier) or 1)
		return true
	end
	return false
end

local render

local function purchaseItemById(itemId: string)
	if busy then return end
	busy=true
	local ok,result=pcall(function() return purchaseItem:InvokeServer(itemId) end)
	busy=false
	if ok and type(result)=="table" then
		if result.ok==true then
			fetchState()
			render()
		elseif result.code=="not_enough_coins" then
			balance.Text="answer questions for more coins"
			balance.TextColor3=UI.red
		end
	end
end

local function purchaseTier(tier: number)
	if busy then return end
	busy=true
	local ok,result=pcall(function() return purchaseHome:InvokeServer(tier) end)
	busy=false
	if ok and type(result)=="table" then
		if result.ok==true then
			fetchState()
			render()
		elseif result.code=="not_enough_coins" then
			balance.Text="answer questions for more coins"
			balance.TextColor3=UI.red
		end
	end
end


local function purchaseStyle(styleId: string)
	if busy then return end
	busy=true
	local ok,result=pcall(function()
		return purchaseHomeStyle:InvokeServer(styleId)
	end)
	busy=false
	if ok and type(result)=="table" then
		if result.ok==true then
			fetchState()
			render()
		elseif result.code=="not_enough_coins" then
			balance.Text="answer questions for more coins"
			balance.TextColor3=UI.red
		elseif result.code=="home_tier_required" then
			balance.Text="upgrade your home tier first"
			balance.TextColor3=UI.red
		elseif result.code=="house_swap_cooldown" then
			fetchState()
			render()
		end
	end
end

local function selectStyle(styleId: string)
	if busy then return end
	busy=true
	local ok,result=pcall(function()
		return selectHomeStyle:InvokeServer(styleId)
	end)
	busy=false
	if ok and type(result)=="table" then
		if result.ok==true then
			fetchState()
			render()
		elseif result.code=="house_swap_cooldown" then
			fetchState()
			render()
		end
	end
end

local function toggleDoors()
	if busy or type(state)~="table" then return end
	busy=true
	local nextLocked = state.doorsLocked ~= true
	local ok,result=pcall(function()
		return setDoorsLocked:InvokeServer(nextLocked)
	end)
	busy=false
	if ok and type(result)=="table" and result.ok==true then
		fetchState()
		render()
	end
end

render=function()
	if type(state)~="table" then return end
	clear()
	balance.TextColor3=UI.muted
	local order=1

	local locked = state.doorsLocked == true
	tile(
		locked and "L" or "U",
		"Lock Doors",
		locked and "locked • family access" or "unlocked",
		locked and "✓" or "",
		locked and UI.green or UI.blue,
		order,
		toggleDoors
	)
	order+=1

	local cooldown = math.max(0, math.floor(tonumber(state.houseSwapCooldownRemaining) or 0))
	if cooldown > 0 then
		local minutes = math.floor(cooldown / 60)
		local seconds = cooldown % 60
		tile(
			"⌛",
			"House Cooldown",
			string.format("%d:%02d", minutes, seconds),
			"",
			UI.red,
			order,
			nil
		)
		order+=1
	end

	for _,home in state.homes or {} do
		local tier=tonumber(home.Tier) or 1
		local current=tonumber(state.homeTier) or 1
		local owned=tier<=current
		local unlocked=tier==current+1
		local badge=owned and "✓" or (unlocked and "$" or "×")
		local color=owned and UI.green or (unlocked and UI.blue or UI.red)
		tile(
			"⌂",
			tostring(home.Name),
			owned and "owned" or (tostring(home.Price).."¢"),
			badge,
			color,
			order,
			unlocked and function() purchaseTier(tier) end or nil
		)
		order+=1
	end

	for _,style in state.styles or {} do
		local id=tostring(style.Id)
		local requiredTier=tonumber(style.RequiredTier) or 1
		local owned=state.ownedStyles and state.ownedStyles[id]==true
		local selected=tostring(state.selectedStyle or "")==id
		local tierReady=(tonumber(state.homeTier) or 1)>=requiredTier
		local detail
		local badge
		local color
		local callback=nil

		if selected then
			detail="current"
			badge="✓"
			color=UI.green
		elseif owned and tierReady then
			detail= cooldown > 0 and "cooldown" or "owned"
			badge= cooldown > 0 and "⌛" or "⌂"
			color= cooldown > 0 and UI.red or UI.green
			callback= cooldown > 0 and nil or function() selectStyle(id) end
		elseif not tierReady then
			detail="tier "..tostring(requiredTier)
			badge="×"
			color=UI.red
		else
			detail= cooldown > 0 and "cooldown" or (tostring(style.Price).."¢")
			badge= cooldown > 0 and "⌛" or "$"
			color= cooldown > 0 and UI.red or UI.blue
			callback= cooldown > 0 and nil or function() purchaseStyle(id) end
		end

		tile(
			"⌂",
			tostring(style.Name),
			detail,
			badge,
			color,
			order,
			callback
		)
		order+=1
	end

	for _,item in state.items or {} do
		local id=tostring(item.Id)
		local owned=state.ownedItems and state.ownedItems[id]==true
		tile(
			symbolFor(tostring(item.Kind)),
			tostring(item.Name),
			owned and "edit" or (tostring(item.Price).."¢"),
			owned and "✓" or "$",
			owned and UI.green or UI.blue,
			order,
			owned
				and function()
					editPlacement:Fire(id)
					panel.Visible = false
				end
				or function()
					purchaseItemById(id)
				end
		)
		order+=1
	end
end

local openStore=Instance.new("BindableEvent")
openStore.Name="OpenStore"
openStore.Parent=gui

local toggleHome=Instance.new("BindableEvent")
toggleHome.Name="ToggleHome"
toggleHome.Parent=gui

local function openPanel()
	if fetchState() then
		render()
		panel.Visible=true
	end
end

openStore.Event:Connect(openPanel)
shopButton.Activated:Connect(openPanel)

closeButton.Activated:Connect(function()
	panel.Visible=false
end)

visit.Activated:Connect(function()
	pcall(function() visitHome:InvokeServer() end)
	panel.Visible=false
end)

world.Activated:Connect(function()
	pcall(function() returnWorld:InvokeServer() end)
	panel.Visible=false
end)

homeButton.Activated:Connect(function()
	toggleHome:Fire()
end)

toggleHome.Event:Connect(function()
	pcall(function() visitHome:InvokeServer() end)
	panel.Visible=false
end)

player:GetAttributeChangedSignal("StarBloxCoins"):Connect(function()
	if panel.Visible and fetchState() then render() end
end)
