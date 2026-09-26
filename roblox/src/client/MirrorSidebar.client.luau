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

local function constrainText(label: TextLabel | TextButton | TextBox, minSize: number, maxSize: number)
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
rail.Position = UDim2.new(1, -8, 0.5, 16)
rail.Size = UDim2.fromOffset(58, 328)
rail.BackgroundColor3 = COLORS.rail
rail.BackgroundTransparency = 0.1
rail.Parent = gui
round(rail, 16)

local railScroll = Instance.new("ScrollingFrame")
railScroll.Name = "Actions"
railScroll.Position = UDim2.fromOffset(4, 5)
railScroll.Size = UDim2.new(1, -8, 1, -10)
railScroll.BackgroundTransparency = 1
railScroll.BorderSizePixel = 0
railScroll.ScrollBarThickness = 3
railScroll.AutomaticCanvasSize = Enum.AutomaticSize.Y
railScroll.CanvasSize = UDim2.fromOffset(0, 0)
railScroll.Parent = rail

local railList = Instance.new("UIListLayout")
railList.Padding = UDim.new(0, 5)
railList.HorizontalAlignment = Enum.HorizontalAlignment.Center
railList.SortOrder = Enum.SortOrder.LayoutOrder
railList.Parent = railScroll

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

local mirrorState = nil
local roleplayState = nil
local busy = false

local function railButton(label: string, order: number): TextButton
	local b = Instance.new("TextButton")
	b.Name = label .. "Button"
	b.LayoutOrder = order
	b.Size = UDim2.fromOffset(44, 44)
	b.BackgroundColor3 = COLORS.row
	b.Text = label
	b.TextColor3 = COLORS.text
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.Selectable = true
	b.Parent = railScroll
	round(b, 12)
	constrainText(b, 8, 11)
	return b
end

local avatarBtn = railButton("Ava", 1)
local inventoryBtn = railButton("Items", 2)
local emotesBtn = railButton("Emote", 3)
local vehicleBtn = railButton("Cars", 4)
local housesBtn = railButton("House", 5)
local bioBtn = railButton("Bio", 6)
local jobsBtn = railButton("Jobs", 7)
local mapBtn = railButton("Map", 8)
local shopBtn = railButton("Shop", 9)

local function clear()
	for _, child in scroller:GetChildren() do
		if child:IsA("Frame") or child:IsA("TextLabel") or child:IsA("TextBox") or child:IsA("TextButton") then
			child:Destroy()
		end
	end
end

local function setHeader(nextTitle: string, nextSubtitle: string)
	title.Text = nextTitle
	subtitle.Text = nextSubtitle
	subtitle.TextColor3 = COLORS.warning
	balance.Text = string.format("Coins %d", tonumber(player:GetAttribute("StarBloxCoins")) or 0)
	panel.Visible = true
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

local function inputBox(placeholder: string, defaultText: string, order: number): TextBox
	local box = Instance.new("TextBox")
	box.LayoutOrder = order
	box.Size = UDim2.new(1, -4, 0, 46)
	box.BackgroundColor3 = COLORS.row
	box.Text = defaultText
	box.PlaceholderText = placeholder
	box.PlaceholderColor3 = COLORS.muted
	box.TextColor3 = COLORS.text
	box.Font = Enum.Font.GothamMedium
	box.TextScaled = true
	box.ClearTextOnFocus = false
	box.ZIndex = 73
	box.Parent = scroller
	round(box, 10)
	constrainText(box, 12, 15)
	return box
end

local function simpleAction(label: string, order: number, callback: () -> ())
	local b = Instance.new("TextButton")
	b.LayoutOrder = order
	b.Size = UDim2.new(1, -4, 0, 44)
	b.BackgroundColor3 = COLORS.accent
	b.Text = label
	b.TextColor3 = COLORS.text
	b.Font = Enum.Font.GothamBold
	b.TextScaled = true
	b.Selectable = true
	b.ZIndex = 73
	b.Parent = scroller
	round(b, 10)
	constrainText(b, 11, 14)
	b.Activated:Connect(callback)
end

local function fetchMirrorState(): boolean
	local ok, result = pcall(function()
		return mirrorGetState:InvokeServer()
	end)
	if ok and type(result) == "table" and result.ok == true then
		mirrorState = result
		balance.Text = string.format("Coins %d", tonumber(result.coins) or 0)
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
			fetchMirrorState()
			rerender()
		elseif result.code == "not_enough_coins" then
			subtitle.Text = "Answer more questions to earn the coins you need."
			subtitle.TextColor3 = COLORS.danger
		end
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
	if not fetchMirrorState() then
		return
	end
	clear()
	setHeader("Vehicles", "Buy with learning coins. Spawn owned vehicles anywhere.")
	local order = 1
	section("Garage", order)
	order += 1
	for _, vehicle in mirrorState.vehicles or {} do
		local id = tostring(vehicle.Id)
		local owned = mirrorState.ownedVehicles and mirrorState.ownedVehicles[id] == true
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
	if not fetchMirrorState() then
		return
	end
	clear()
	setHeader("Inventory", "Carry props and tools around town.")
	local order = 1
	section("Backpack", order)
	order += 1
	for _, item in mirrorState.inventory or {} do
		local id = tostring(item.Id)
		local owned = mirrorState.ownedTools and mirrorState.ownedTools[id] == true
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

showJobs = function()
	if not fetchRoleplayState() then
		return
	end
	clear()
	setHeader("Jobs", "Pick a role for your town story.")
	local order = 1
	section("Roleplay jobs", order)
	order += 1
	for _, job in roleplayState.jobs or {} do
		local selected = tostring(job) == tostring(roleplayState.job)
		row(tostring(job), selected and "Current job" or "Free roleplay job", selected and "Current" or "Choose", not selected, order, function()
			pcall(function()
				setJob:InvokeServer(job)
			end)
			fetchRoleplayState()
			showJobs()
		end)
		order += 1
	end
end

showBio = function()
	if not fetchRoleplayState() then
		return
	end
	clear()
	setHeader("Character Bio", "Set a filtered roleplay name and age.")
	local order = 1
	section("Profile", order)
	order += 1
	local nameBox = inputBox("Roleplay name", tostring(roleplayState.displayName or ""), order)
	order += 1
	local ageBox = inputBox("Age (1–120)", tostring(roleplayState.age or ""), order)
	order += 1
	simpleAction("Save Bio", order, function()
		local ok, result = pcall(function()
			return saveBio:InvokeServer(nameBox.Text, ageBox.Text)
		end)
		if ok and type(result) == "table" and result.ok == true then
			subtitle.Text = "Bio saved."
			subtitle.TextColor3 = COLORS.success
		else
			subtitle.Text = "Use a short name and an age from 1–120."
			subtitle.TextColor3 = COLORS.danger
		end
	end)
end

showEmotes = function()
	clear()
	setHeader("Emotes", "Quick Roblox roleplay emotes.")
	local order = 1
	section("Animations", order)
	order += 1
	for _, emoteName in {"wave", "point", "cheer", "laugh", "dance", "dance2", "dance3"} do
		local label = string.upper(string.sub(emoteName, 1, 1)) .. string.sub(emoteName, 2)
		simpleAction(label, order, function()
			local character = player.Character
			local humanoid = character and character:FindFirstChildOfClass("Humanoid")
			if humanoid ~= nil then
				pcall(function()
					humanoid:PlayEmote(emoteName)
				end)
			end
			panel.Visible = false
		end)
		order += 1
	end
end

showAvatar = function()
	clear()
	setHeader("Avatar", "Use your Roblox avatar in town.")
	local order = 1
	section("Appearance", order)
	order += 1
	simpleAction("Reset to Roblox Avatar", order, function()
		local ok, result = pcall(function()
			return resetAvatar:InvokeServer()
		end)
		if ok and type(result) == "table" and result.ok == true then
			subtitle.Text = "Avatar restored."
			subtitle.TextColor3 = COLORS.success
		else
			subtitle.Text = "Avatar could not be refreshed right now."
			subtitle.TextColor3 = COLORS.danger
		end
	end)
end

showMap = function()
	clear()
	setHeader("Map", "Fast travel between your town and your home.")
	local order = 1
	section("Destinations", order)
	order += 1
	simpleAction("Town", order, function()
		pcall(function()
			returnWorld:InvokeServer()
		end)
		panel.Visible = false
	end)
	order += 1
	simpleAction("My Home", order, function()
		pcall(function()
			visitHome:InvokeServer()
		end)
		panel.Visible = false
	end)
end

avatarBtn.Activated:Connect(showAvatar)
inventoryBtn.Activated:Connect(showInventory)
emotesBtn.Activated:Connect(showEmotes)
vehicleBtn.Activated:Connect(showVehicles)

housesBtn.Activated:Connect(function()
	panel.Visible = false
	if openStore and openStore:IsA("BindableEvent") then
		openStore:Fire()
	end
end)

bioBtn.Activated:Connect(showBio)
jobsBtn.Activated:Connect(showJobs)
mapBtn.Activated:Connect(showMap)

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
