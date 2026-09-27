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
local getHouseAccessState = remotes:WaitForChild("GetHouseAccessState") :: RemoteFunction
local setRoommate = remotes:WaitForChild("SetRoommate") :: RemoteFunction
local setHouseBan = remotes:WaitForChild("SetHouseBan") :: RemoteFunction
local visitHome = remotes:WaitForChild("VisitHome") :: RemoteFunction
local returnWorld = remotes:WaitForChild("ReturnWorld") :: RemoteFunction

local UI = {
	white = Color3.fromRGB(248,251,255),
	tile = Color3.fromRGB(235,243,251),
	border = Color3.fromRGB(107,137,164),
	text = Color3.fromRGB(28,45,62),
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
panel.AnchorPoint = Vector2.new(0.5,0.5)
panel.Position = UDim2.fromScale(0.5,0.52)
panel.Size = UDim2.fromOffset(720,390)
panel.BackgroundColor3 = UI.white
panel.BackgroundTransparency = 0.03
panel.Visible = false
panel.ZIndex = 60
panel.Parent = gui
round(panel,16)
stroke(panel, Color3.fromRGB(95,168,220))

local panelGradient = Instance.new("UIGradient")
panelGradient.Color = ColorSequence.new({
	ColorSequenceKeypoint.new(0, Color3.fromRGB(255,255,255)),
	ColorSequenceKeypoint.new(1, Color3.fromRGB(220,239,252)),
})
panelGradient.Rotation = 90
panelGradient.Parent = panel

local constraint = Instance.new("UISizeConstraint")
constraint.MinSize = Vector2.new(620,350)
constraint.MaxSize = Vector2.new(740,410)
constraint.Parent = panel

local title = Instance.new("TextLabel")
title.BackgroundColor3 = UI.white
title.BackgroundTransparency = 0.14
title.Position = UDim2.fromOffset(18,10)
title.Size = UDim2.fromOffset(260,34)
title.Text = "MY HOME"
title.TextColor3 = UI.text
title.Font = Enum.Font.GothamBold
title.TextScaled = true
title.TextXAlignment = Enum.TextXAlignment.Left
title.ZIndex = 61
title.Parent = panel
constrain(title,14,18)

local balance = Instance.new("TextLabel")
balance.BackgroundTransparency = 1
balance.Position = UDim2.fromOffset(18,43)
balance.Size = UDim2.fromOffset(260,22)
balance.Text = "0 coins"
balance.TextColor3 = UI.muted
balance.Font = Enum.Font.GothamMedium
balance.TextScaled = true
balance.TextXAlignment = Enum.TextXAlignment.Left
balance.Visible = true
balance.ZIndex = 61
balance.Parent = panel
constrain(balance,10,13)

local visit = Instance.new("TextButton")
visit.Name = "VisitHome"
visit.AnchorPoint = Vector2.new(1,0)
visit.Position = UDim2.new(1,-242,0,10)
visit.Size = UDim2.fromOffset(110,48)
visit.BackgroundColor3 = UI.green
visit.Text = "GO HOME"
visit.TextColor3 = Color3.new(1,1,1)
visit.Font = Enum.Font.GothamBold
visit.TextScaled = true
visit.ZIndex = 63
visit.Parent = panel
visit.Visible = true
round(visit,10)
stroke(visit)
constrain(visit,12,16)

local world = Instance.new("TextButton")
world.Name = "ReturnWorld"
world.AnchorPoint = Vector2.new(1,0)
world.Position = UDim2.new(1,-126,0,10)
world.Size = UDim2.fromOffset(104,48)
world.BackgroundColor3 = UI.blue
world.Text = "TOWN"
world.TextColor3 = Color3.new(1,1,1)
world.Font = Enum.Font.GothamBold
world.TextScaled = true
world.ZIndex = 63
world.Parent = panel
world.Visible = true
round(world,10)
stroke(world)
constrain(world,12,16)

local closeButton = Instance.new("TextButton")
closeButton.Name = "CloseButton"
closeButton.AnchorPoint = Vector2.new(1,0)
closeButton.Position = UDim2.new(1,-10,0,10)
closeButton.Size = UDim2.fromOffset(48,48)
closeButton.BackgroundColor3 = UI.red
closeButton.Text = "X"
closeButton.TextColor3 = Color3.new(1,1,1)
closeButton.Font = Enum.Font.GothamBold
closeButton.TextScaled = true
closeButton.ZIndex = 63
closeButton.Parent = panel
round(closeButton,10)
stroke(closeButton,Color3.fromRGB(135,30,30))
constrain(closeButton,20,28)

local scroller = Instance.new("ScrollingFrame")
scroller.Name = "Catalog"
scroller.Position = UDim2.fromOffset(18,76)
scroller.Size = UDim2.new(1,-36,1,-92)
scroller.BackgroundTransparency = 1
scroller.BorderSizePixel = 0
scroller.AutomaticCanvasSize = Enum.AutomaticSize.Y
scroller.CanvasSize = UDim2.fromOffset(0,0)
scroller.ScrollBarThickness = 5
scroller.ScrollBarImageColor3 = UI.border
scroller.ZIndex = 61
scroller.Parent = panel

local grid = Instance.new("UIGridLayout")
grid.CellPadding = UDim2.fromOffset(8,8)
grid.CellSize = UDim2.fromOffset(128,126)
grid.SortOrder = Enum.SortOrder.LayoutOrder
grid.Parent = scroller

local state = nil
local houseAccessState = nil
local accessMode = false
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

local function previewPart(parent: Instance, size: Vector3, at: CFrame, color: Color3): Part
	local object = Instance.new("Part")
	object.Size = size
	object.CFrame = at
	object.Color = color
	object.Material = Enum.Material.SmoothPlastic
	object.Anchored = true
	object.CanCollide = false
	object.CanQuery = false
	object.CanTouch = false
	object.Parent = parent
	return object
end

local function renderCatalogPreview(frame: GuiObject, previewKind: string)
	local viewport = Instance.new("ViewportFrame")
	viewport.Name = "CatalogPreview"
	viewport.Position = UDim2.fromOffset(8, 5)
	viewport.Size = UDim2.new(1, -16, 0, 60)
	viewport.BackgroundTransparency = 1
	viewport.Ambient = Color3.fromRGB(210, 220, 230)
	viewport.LightColor = Color3.fromRGB(255, 255, 255)
	viewport.LightDirection = Vector3.new(-1, -1, -1)
	viewport.ZIndex = 63
	viewport.Parent = frame

	local previewWorld = Instance.new("WorldModel")
	previewWorld.Parent = viewport
	local accent = Color3.fromRGB(71, 166, 222)
	local wall = Color3.fromRGB(242, 244, 247)
	local dark = Color3.fromRGB(47, 58, 72)
	local target = Vector3.new(0, 1, 0)
	local distance = 8

	if string.sub(previewKind, 1, 5) == "home:" then
		local style = string.sub(previewKind, 6)
		if style == "modern" or style == "villa" then
			accent = Color3.fromRGB(80, 190, 220)
		elseif style == "mansion" then
			accent = Color3.fromRGB(222, 188, 83)
		elseif style == "lakehouse" then
			accent = Color3.fromRGB(95, 160, 205)
		elseif style == "townhouse" then
			accent = Color3.fromRGB(190, 104, 87)
		end
		previewPart(previewWorld, Vector3.new(5.2, 2.5, 3.8), CFrame.new(0, 1.25, 0), wall)
		previewPart(previewWorld, Vector3.new(5.7, 0.48, 4.3), CFrame.new(0, 2.72, 0), accent)
		previewPart(previewWorld, Vector3.new(1.05, 1.8, 0.18), CFrame.new(0, 0.9, -2), dark)
		for _, x in {-1.65, 1.65} do
			previewPart(previewWorld, Vector3.new(1.15, 1.05, 0.14), CFrame.new(x, 1.45, -2.03), Color3.fromRGB(151, 215, 242))
		end
		target = Vector3.new(0, 1.2, 0)
		distance = 9.5
	else
		local kind = string.sub(previewKind, 6)
		if kind == "bed" then
			previewPart(previewWorld, Vector3.new(4.5, 0.45, 2.8), CFrame.new(0, 0.25, 0), accent)
			previewPart(previewWorld, Vector3.new(4.5, 0.8, 0.3), CFrame.new(0, 0.65, 1.25), dark)
		elseif kind == "chair" then
			previewPart(previewWorld, Vector3.new(2.2, 0.35, 2.2), CFrame.new(0, 1, 0), accent)
			previewPart(previewWorld, Vector3.new(2.2, 2.2, 0.3), CFrame.new(0, 2, 0.95), dark)
		elseif kind == "desk" then
			previewPart(previewWorld, Vector3.new(4.2, 0.35, 2.2), CFrame.new(0, 2, 0), accent)
			for _, x in {-1.65, 1.65} do previewPart(previewWorld, Vector3.new(0.3, 2, 0.3), CFrame.new(x, 1, 0), dark) end
		elseif kind == "lamp" then
			previewPart(previewWorld, Vector3.new(0.35, 3, 0.35), CFrame.new(0, 1.5, 0), dark)
			previewPart(previewWorld, Vector3.new(1.8, 1.1, 1.8), CFrame.new(0, 3.2, 0), Color3.fromRGB(255, 214, 92))
		else
			previewPart(previewWorld, Vector3.new(3.4, 2.2, 0.55), CFrame.new(0, 1.1, 0), accent)
		end
		target = Vector3.new(0, 1.2, 0)
		distance = 7
	end

	local camera = Instance.new("Camera")
	camera.FieldOfView = 34
	camera.CFrame = CFrame.lookAt(target + Vector3.new(distance * 0.72, distance * 0.5, distance), target)
	camera.Parent = viewport
	viewport.CurrentCamera = camera
end

local function tile(
	symbol: string,
	name: string,
	detail: string,
	badgeText: string,
	badgeColor: Color3,
	order: number,
	callback: (() -> ())?,
	previewKind: string?
)
	local frame = Instance.new("Frame")
	frame.LayoutOrder = order
	frame.Size = UDim2.fromOffset(128,126)
	frame.BackgroundColor3 = UI.tile
	frame.BackgroundTransparency = 0.02
	frame.ZIndex = 62
	frame.Parent = scroller
	round(frame,12)
	stroke(frame)

	local tileGradient = Instance.new("UIGradient")
	tileGradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, Color3.fromRGB(255,255,255)),
		ColorSequenceKeypoint.new(1, Color3.fromRGB(224,239,250)),
	})
	tileGradient.Rotation = 90
	tileGradient.Parent = frame

	if previewKind ~= nil then
		renderCatalogPreview(frame, previewKind)
	else
		local icon = Instance.new("TextLabel")
		icon.BackgroundTransparency = 1
		icon.Position = UDim2.fromOffset(8,6)
		icon.Size = UDim2.new(1,-16,0,58)
		icon.Text = symbol
		icon.TextColor3 = UI.text
		icon.Font = Enum.Font.GothamBold
		icon.TextScaled = true
		icon.ZIndex = 63
		icon.Parent = frame
		constrain(icon,26,42)
	end

	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Position = UDim2.fromOffset(8,66)
	label.Size = UDim2.new(1,-16,0,32)
	label.Text = name
	label.TextColor3 = UI.text
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.TextWrapped = true
	label.ZIndex = 63
	label.Parent = frame
	constrain(label,10,14)

	local d = Instance.new("TextLabel")
	d.BackgroundTransparency = 1
	d.Position = UDim2.fromOffset(8,100)
	d.Size = UDim2.new(1,-16,0,18)
	d.Text = detail
	d.TextColor3 = UI.muted
	d.Font = Enum.Font.GothamMedium
	d.TextScaled = true
	d.ZIndex = 63
	d.Parent = frame
	constrain(d,9,12)

	if badgeText ~= "" then
		local badge = Instance.new("TextLabel")
		badge.AnchorPoint = Vector2.new(1,0)
		badge.Position = UDim2.new(1,-2,0,2)
		badge.Size = UDim2.fromOffset(38,22)
		badge.BackgroundColor3 = badgeColor
		badge.Text = badgeText
		badge.TextColor3 = Color3.new(1,1,1)
		badge.Font = Enum.Font.GothamBold
		badge.TextScaled = true
		badge.ZIndex = 65
		badge.Parent = frame
		round(badge,7)
		constrain(badge,8,11)
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
local renderAccess

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

local function fetchAccessState(): boolean
	local ok,result=pcall(function()
		return getHouseAccessState:InvokeServer()
	end)
	if ok and type(result)=="table" and result.ok==true then
		houseAccessState=result
		return true
	end
	return false
end

local function setRoommateById(userId: any)
	if busy then return end
	busy=true
	local ok,result=pcall(function()
		return setRoommate:InvokeServer(userId)
	end)
	busy=false
	if ok and type(result)=="table" and result.ok==true then
		fetchAccessState()
		renderAccess()
	end
end

local function setBanById(userId: any, banned: boolean)
	if busy then return end
	busy=true
	local ok,result=pcall(function()
		return setHouseBan:InvokeServer(userId,banned)
	end)
	busy=false
	if ok and type(result)=="table" then
		fetchAccessState()
		renderAccess()
	end
end

renderAccess=function()
	if not fetchAccessState() then return end
	accessMode=true
	clear()
	title.Text="House Access"
	balance.Visible=false

	local order=1
	local locked=houseAccessState.doorsLocked==true
	tile(
		locked and "L" or "U",
		"Lock Doors",
		locked and "locked" or "unlocked",
		locked and "✓" or "",
		locked and UI.green or UI.blue,
		order,
		function()
			if busy then return end
			busy=true
			local ok,result=pcall(function()
				return setDoorsLocked:InvokeServer(not locked)
			end)
			busy=false
			if ok and type(result)=="table" and result.ok==true then
				fetchState()
				renderAccess()
			end
		end
	)
	order+=1

	if type(houseAccessState.roommate)=="table" then
		local roommate=houseAccessState.roommate
		tile(
			"R",
			tostring(roommate.DisplayName or roommate.Name or "Roommate"),
			"roommate • tap to remove",
			"✓",
			UI.green,
			order,
			function() setRoommateById(0) end
		)
		order+=1
	else
		tile("R","Roommate","none selected","",UI.blue,order,nil)
		order+=1
	end

	for _,candidate in houseAccessState.candidates or {} do
		local userId=tonumber(candidate.UserId)
		local display=tostring(candidate.DisplayName or candidate.Name or "Player")
		if candidate.IsRoommate~=true and candidate.IsBanned~=true then
			tile(
				"R",
				display,
				"make roommate",
				"",
				UI.blue,
				order,
				function() setRoommateById(userId) end
			)
			order+=1
		end
		tile(
			candidate.IsBanned==true and "✓" or "B",
			display,
			candidate.IsBanned==true and "banned • tap to unban" or "ban from house",
			candidate.IsBanned==true and "B" or "",
			candidate.IsBanned==true and UI.red or UI.blue,
			order,
			function() setBanById(userId,candidate.IsBanned~=true) end
		)
		order+=1
	end

	tile("←","Back","houses","",UI.blue,order,function()
		accessMode=false
		fetchState()
		render()
	end)
end


render=function()
	if type(state)~="table" then return end
	accessMode=false
	clear()
	title.Text="Houses"
	balance.Visible=true
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

	tile(
		"ID",
		"House Access",
		"roommate • ban",
		"",
		UI.blue,
		order,
		renderAccess
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
			unlocked and function() purchaseTier(tier) end or nil,
			"home:tier" .. tostring(tier)
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
			callback,
			"home:" .. tostring(style.Kind)
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
				end,
			"item:" .. tostring(item.Kind)
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
	accessMode=false
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
