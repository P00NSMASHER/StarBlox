-- Nonvisual compatibility fallback for the legacy Brookhaven right-side rail.
-- Native Brookhaven callbacks get first chance; this acts only when a click leaves
-- the menu state unchanged.

local Players = game:GetService("Players")
local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local main = playerGui:WaitForChild("MainGUIHandler")
local noReset = playerGui:WaitForChild("NoResetGUIHandler")
local buttons = main:WaitForChild("MainButtons"):WaitForChild("Buttons")

local menuByName = {
	Car = main:WaitForChild("MainVehicleMenu"),
	Animation = main:WaitForChild("MainAnimationsMenu"),
	BackPack = noReset:WaitForChild("MainToolMenu"),
	Character = main:WaitForChild("MainAvatarMenu"),
	AvatarEditor = noReset:WaitForChild("MainEditor"),
}

local allMenus = {
	menuByName.Car,
	menuByName.Animation,
	menuByName.BackPack,
	menuByName.Character,
	menuByName.AvatarEditor,
	main:WaitForChild("MainHouseMenu"),
	main:WaitForChild("MainNoHouseMenu"),
	main:WaitForChild("MainMotelMenu"),
}

local function menuSignature()
	local parts = {}
	for index, menu in ipairs(allMenus) do
		parts[index] = menu.Visible and "1" or "0"
	end
	return table.concat(parts)
end

local function closeAll(except)
	for _, menu in ipairs(allMenus) do
		if menu ~= except then
			menu.Visible = false
		end
	end
end

local function fitScrollingFrames(root)
	for _, item in ipairs(root:GetDescendants()) do
		if item:IsA("ScrollingFrame") then
			local layout = item:FindFirstChildWhichIsA("UIGridLayout") or item:FindFirstChildWhichIsA("UIListLayout")
			if layout then
				item.CanvasSize = UDim2.new(0, 0, 0, layout.AbsoluteContentSize.Y)
			end
		end
	end
end

local function houseTarget()
	local bag = player:FindFirstChild("PlayersBag")
	local structure = bag and bag:FindFirstChild("PlayerHouseStructure")
	local value = structure and tostring(structure.Value) or "No House"
	if value == "House" then
		return main:WaitForChild("MainHouseMenu")
	elseif value == "Motel" then
		return main:WaitForChild("MainMotelMenu")
	end
	return main:WaitForChild("MainNoHouseMenu")
end

local function targetFor(buttonName)
	if buttonName == "House" then
		return houseTarget()
	end
	return menuByName[buttonName]
end

for _, button in ipairs(buttons:GetChildren()) do
	if button:IsA("ImageButton") then
		button.Activated:Connect(function()
			local target = targetFor(button.Name)
			if not target then
				return
			end
			local before = menuSignature()
			local targetWasVisible = target.Visible

			task.delay(0.08, function()
				-- If Brookhaven's native handler changed any relevant menu, leave it alone.
				if menuSignature() ~= before then
					return
				end

				local open = not targetWasVisible
				closeAll(target)
				target.Visible = open
				if open then
					fitScrollingFrames(target)
				end
			end)
		end)
	end
end

print("STARBLOX_BROOKHAVEN_COMPAT_CLIENT_READY")


-- ---------------------------------------------------------------------------
-- Functional Brookhaven avatar editor + Star Coin shop.
-- Reuses the source UI where possible and adds a compact learning-reward shop.
-- ---------------------------------------------------------------------------

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local economyRoot = ReplicatedStorage:WaitForChild("StarBloxLearningEconomy")
local economyGetState = economyRoot:WaitForChild("GetState")
local economyPurchasePack = economyRoot:WaitForChild("PurchasePack")
local economyAvatarAction = economyRoot:WaitForChild("AvatarAction")
local economyGetPractice = economyRoot:WaitForChild("GetPracticeQuestion")
local economySubmitPractice = economyRoot:WaitForChild("SubmitPracticeAnswer")
local economyChanged = economyRoot:WaitForChild("StateChanged")

local economyState = nil
local economyBusy = false

local function invoke(remote, ...)
	local ok, result = pcall(function()
		return remote:InvokeServer(...)
	end)
	if ok and type(result) == "table" then
		return result
	end
	return {ok=false, code="request_failed"}
end

local function refreshEconomy()
	local result = invoke(economyGetState)
	if result.ok == true then
		economyState = result
	end
	return result
end

-- Avatar editor bindings ------------------------------------------------------

local editor = noReset:FindFirstChild("MainEditor")
local editorStatus = nil
local skinPanel = nil
local accessoryPanel = nil
local editorCoinLabel = nil

local function showEditorStatus(textValue, good)
	if not editor or not editorStatus then return end
	editorStatus.Text = textValue
	editorStatus.TextColor3 = good and Color3.fromRGB(53, 168, 83) or Color3.fromRGB(70, 70, 70)
	editorStatus.Visible = true
	task.delay(1.6, function()
		if editorStatus and editorStatus.Text == textValue then
			editorStatus.Visible = false
		end
	end)
end

local function updateEditorCoins()
	if not editorCoinLabel then return end
	local coins = economyState and tonumber(economyState.coins) or tonumber(player:GetAttribute("StarCoins")) or 0
	editorCoinLabel.Text = "★ " .. tostring(coins) .. " Star Coins"
end

local function setEditorMode(mode)
	if not editor then return end
	local catalog = editor:FindFirstChild("Catalog")
	local container = catalog and catalog:FindFirstChild("Container")
	if not container then return end
	local outfit = container:FindFirstChild("OutfitFrame")
	local scaleFrame = container:FindFirstChild("ScaleFrame")
	if outfit and outfit:IsA("GuiObject") then outfit.Visible = mode == "outfit" end
	if scaleFrame and scaleFrame:IsA("GuiObject") then scaleFrame.Visible = mode == "scale" end
	if skinPanel then skinPanel.Visible = mode == "skin" end
	if accessoryPanel then accessoryPanel.Visible = mode == "accessory" end
end

local function runAvatarAction(action, value)
	if economyBusy then return nil end
	economyBusy = true
	local result = invoke(economyAvatarAction, action, value)
	economyBusy = false
	if result.ok == true then
		refreshEconomy()
		updateEditorCoins()
	end
	return result
end

local function buildSkinPanel(container)
	if skinPanel then return skinPanel end
	local panel = Instance.new("Frame")
	panel.Name = "StarBloxSkinTonePanel"
	panel.AnchorPoint = Vector2.new(0.5,0.5)
	panel.Position = UDim2.fromScale(0.5,0.62)
	panel.Size = UDim2.fromOffset(360,150)
	panel.BackgroundColor3 = Color3.fromRGB(255,255,255)
	panel.BackgroundTransparency = 0.08
	panel.Visible = false
	panel.ZIndex = 30
	panel.Parent = container

	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0,14)
	corner.Parent = panel

	local title = Instance.new("TextLabel")
	title.Size = UDim2.new(1,-20,0,34)
	title.Position = UDim2.fromOffset(10,6)
	title.BackgroundTransparency = 1
	title.Text = "Skin Tone"
	title.TextColor3 = Color3.fromRGB(30,30,30)
	title.Font = Enum.Font.GothamBold
	title.TextScaled = true
	title.ZIndex = 31
	title.Parent = panel

	local tones = {
		Color3.fromRGB(255,219,172),
		Color3.fromRGB(241,194,125),
		Color3.fromRGB(224,172,105),
		Color3.fromRGB(198,134,66),
		Color3.fromRGB(141,85,36),
		Color3.fromRGB(92,51,23),
		Color3.fromRGB(255,204,188),
		Color3.fromRGB(205,133,92),
	}
	for index,color in ipairs(tones) do
		local button = Instance.new("TextButton")
		button.Name = "Tone"..index
		button.Size = UDim2.fromOffset(68,68)
		button.Position = UDim2.fromOffset(12 + ((index-1)%4)*86, 48 + math.floor((index-1)/4)*76)
		button.BackgroundColor3 = color
		button.Text = ""
		button.ZIndex = 32
		button.Parent = panel
		local c = Instance.new("UICorner")
		c.CornerRadius = UDim.new(0,12)
		c.Parent = button
		button.Activated:Connect(function()
			local result = runAvatarAction("SkinTone", index)
			showEditorStatus(result and result.ok and "Skin tone updated" or "Couldn't change skin tone", result and result.ok)
		end)
	end
	skinPanel = panel
	return panel
end

local function buildAccessoryPanel(container)
	if accessoryPanel then return accessoryPanel end
	local panel = Instance.new("Frame")
	panel.Name = "StarBloxAccessoryPanel"
	panel.AnchorPoint = Vector2.new(0.5,0.5)
	panel.Position = UDim2.fromScale(0.5,0.62)
	panel.Size = UDim2.fromOffset(390,190)
	panel.BackgroundColor3 = Color3.fromRGB(255,255,255)
	panel.BackgroundTransparency = 0.08
	panel.Visible = false
	panel.ZIndex = 30
	panel.Parent = container
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0,14)
	corner.Parent = panel

	local title = Instance.new("TextLabel")
	title.Position = UDim2.fromOffset(12,8)
	title.Size = UDim2.new(1,-24,0,34)
	title.BackgroundTransparency = 1
	title.Text = "Accessories — tap to remove / restore"
	title.TextColor3 = Color3.fromRGB(30,30,30)
	title.Font = Enum.Font.GothamBold
	title.TextScaled = true
	title.ZIndex = 31
	title.Parent = panel

	local items = {
		{"Hair","Hair"},
		{"Hats","Hat"},
		{"Face","Face"},
		{"Back","Back"},
		{"Waist","Waist"},
	}
	for index,row in ipairs(items) do
		local button = Instance.new("TextButton")
		button.Name = row[1]
		button.Size = UDim2.fromOffset(68,92)
		button.Position = UDim2.fromOffset(10 + ((index-1)*76), 54)
		button.BackgroundColor3 = Color3.fromRGB(238,244,252)
		button.Text = row[2]
		button.TextColor3 = Color3.fromRGB(30,35,45)
		button.Font = Enum.Font.GothamBold
		button.TextScaled = true
		button.TextWrapped = true
		button.ZIndex = 32
		button.Parent = panel
		local bc = Instance.new("UICorner")
		bc.CornerRadius = UDim.new(0,12)
		bc.Parent = button
		button.Activated:Connect(function()
			local result = runAvatarAction("ToggleAccessory", row[1])
			if result and result.ok then
				local stateText = result.hidden and "removed" or "restored"
				showEditorStatus(row[2].." "..stateText, true)
			else
				showEditorStatus("Couldn't change "..row[2], false)
			end
		end)
	end
	accessoryPanel = panel
	return panel
end

if editor then
	editorStatus = Instance.new("TextLabel")
	editorStatus.Name = "StarBloxEditorStatus"
	editorStatus.AnchorPoint = Vector2.new(0.5,1)
	editorStatus.Position = UDim2.new(0.5,0,1,-8)
	editorStatus.Size = UDim2.fromOffset(330,30)
	editorStatus.BackgroundColor3 = Color3.fromRGB(255,255,255)
	editorStatus.BackgroundTransparency = 0.12
	editorStatus.Text = ""
	editorStatus.TextScaled = true
	editorStatus.Font = Enum.Font.GothamBold
	editorStatus.Visible = false
	editorStatus.ZIndex = 50
	editorStatus.Parent = editor
	local sc = Instance.new("UICorner")
	sc.CornerRadius = UDim.new(0,10)
	sc.Parent = editorStatus

	editorCoinLabel = Instance.new("TextLabel")
	editorCoinLabel.Name = "StarCoinBalance"
	editorCoinLabel.Position = UDim2.fromOffset(8,8)
	editorCoinLabel.Size = UDim2.fromOffset(180,28)
	editorCoinLabel.BackgroundColor3 = Color3.fromRGB(255,255,255)
	editorCoinLabel.BackgroundTransparency = 0.14
	editorCoinLabel.TextColor3 = Color3.fromRGB(35,35,35)
	editorCoinLabel.Font = Enum.Font.GothamBold
	editorCoinLabel.TextScaled = true
	editorCoinLabel.ZIndex = 45
	editorCoinLabel.Parent = editor
	local ec = Instance.new("UICorner")
	ec.CornerRadius = UDim.new(0,9)
	ec.Parent = editorCoinLabel

	local catalog = editor:FindFirstChild("Catalog")
	local container = catalog and catalog:FindFirstChild("Container")
	local header = catalog and catalog:FindFirstChild("Header")
	local categoryTabs = header and header:FindFirstChild("CategoryTabs")
	local subTabs = header and header:FindFirstChild("SubCategoryTabs")
	if container then
		buildSkinPanel(container)
		buildAccessoryPanel(container)
	end

	if container then
		local scaleFrame = container:FindFirstChild("ScaleFrame")
		local scaleButtons = scaleFrame and scaleFrame:FindFirstChild("Buttons")
		if scaleButtons then
			local bigger = scaleButtons:FindFirstChild("Bigger")
			local smaller = scaleButtons:FindFirstChild("Smaller")
			if bigger and bigger:IsA("GuiButton") then
				bigger.Activated:Connect(function()
					local result = runAvatarAction("Scale", 0.05)
					if result and result.ok then
						local number = scaleButtons:FindFirstChild("Number")
						local label = number and number:FindFirstChild("Number")
						if label and label:IsA("TextLabel") then label.Text = string.format("%.2f", result.scale or 1) end
						showEditorStatus("Avatar size increased", true)
					else
						showEditorStatus("Couldn't change avatar size", false)
					end
				end)
			end
			if smaller and smaller:IsA("GuiButton") then
				smaller.Activated:Connect(function()
					local result = runAvatarAction("Scale", -0.05)
					if result and result.ok then
						local number = scaleButtons:FindFirstChild("Number")
						local label = number and number:FindFirstChild("Number")
						if label and label:IsA("TextLabel") then label.Text = string.format("%.2f", result.scale or 1) end
						showEditorStatus("Avatar size decreased", true)
					else
						showEditorStatus("Couldn't change avatar size", false)
					end
				end)
			end
			local number = scaleButtons:FindFirstChild("Number")
			if number and number:IsA("GuiButton") then
				number.Activated:Connect(function()
					local result = runAvatarAction("SetScale", 1)
					if result and result.ok then
						local label = number:FindFirstChild("Number")
						if label and label:IsA("TextLabel") then label.Text = "1" end
						showEditorStatus("Avatar size reset", true)
					else
						showEditorStatus("Couldn't reset avatar size", false)
					end
				end)
			end
		end

		local outfitFrame = container:FindFirstChild("OutfitFrame")
		if outfitFrame then
			for _, button in ipairs(outfitFrame:GetChildren()) do
				if button:IsA("GuiButton") then
					button.Activated:Connect(function()
						refreshEconomy()
						local owned = economyState and economyState.ownedOutfits and economyState.ownedOutfits[button.Name] == true
						if not owned then
							showEditorStatus("Locked — unlock this outfit in the Star Shop", false)
							return
						end
						local result = runAvatarAction("ApplyOutfit", button.Name)
						showEditorStatus(result and result.ok and (button.Name.." equipped") or "Couldn't equip outfit", result and result.ok)
					end)
				end
			end
		end
	end

	if categoryTabs then
		local clothes = categoryTabs:FindFirstChild("Clothes")
		local body = categoryTabs:FindFirstChild("Body")
		local accessories = categoryTabs:FindFirstChild("Accessories")
		local reset = categoryTabs:FindFirstChild("RevertOriginalCharacter")
		local close = categoryTabs:FindFirstChild("Close")
		if clothes and clothes:IsA("GuiButton") then clothes.Activated:Connect(function() setEditorMode("outfit") end) end
		if body and body:IsA("GuiButton") then body.Activated:Connect(function() setEditorMode("scale") end) end
		if accessories and accessories:IsA("GuiButton") then
			accessories.Activated:Connect(function()
				setEditorMode("accessory")
				showEditorStatus("Tap an accessory to remove or restore it", true)
			end)
		end
		if reset and reset:IsA("GuiButton") then
			reset.Activated:Connect(function()
				local result = runAvatarAction("Reset")
				showEditorStatus(result and result.ok and "Original avatar restored" or "Couldn't restore avatar", result and result.ok)
			end)
		end
		if close and close:IsA("GuiButton") then close.Activated:Connect(function() editor.Visible = false end) end
	end

	if subTabs then
		local bodyTabs = subTabs:FindFirstChild("Body")
		local clothesTabs = subTabs:FindFirstChild("Clothes")
		if bodyTabs then
			local scale = bodyTabs:FindFirstChild("Scale")
			local skin = bodyTabs:FindFirstChild("SkinTone")
			local faces = bodyTabs:FindFirstChild("Faces")
			local removeCharacter = bodyTabs:FindFirstChild("RemoveCharacter")
			if scale and scale:IsA("GuiButton") then scale.Activated:Connect(function() setEditorMode("scale") end) end
			if skin and skin:IsA("GuiButton") then skin.Activated:Connect(function() setEditorMode("skin") end) end
			if faces and faces:IsA("GuiButton") then
				faces.Activated:Connect(function()
					local result = runAvatarAction("ResetFace")
					showEditorStatus(result and result.ok and "Original face restored" or "Couldn't restore face", result and result.ok)
				end)
			end
			if removeCharacter and removeCharacter:IsA("GuiButton") then
				removeCharacter.Activated:Connect(function()
					local result = runAvatarAction("Reset")
					showEditorStatus(result and result.ok and "Original avatar restored" or "Couldn't restore avatar", result and result.ok)
				end)
			end
		end
		if clothesTabs then
			for _, button in ipairs(clothesTabs:GetChildren()) do
				if button:IsA("GuiButton") then button.Activated:Connect(function() setEditorMode("outfit") end) end
			end
		end
		local accessoryTabs = subTabs:FindFirstChild("Accessories")
		if accessoryTabs then
			for _, button in ipairs(accessoryTabs:GetChildren()) do
				if button:IsA("GuiButton") then
					button.Activated:Connect(function()
						setEditorMode("accessory")
						local result = runAvatarAction("ToggleAccessory", button.Name)
						if result and result.ok then
							showEditorStatus(button.Name .. (result.hidden and " removed" or " restored"), true)
						else
							showEditorStatus("Couldn't change "..button.Name, false)
						end
					end)
				end
			end
		end
	end
end

-- Star Coin shop --------------------------------------------------------------

local shop = main:FindFirstChild("Shop")
local starShopPanel = nil
local shopBalance = nil
local shopGrid = nil
local practicePanel = nil
local currentPractice = nil

local function styleButton(button, bg)
	button.BackgroundColor3 = bg or Color3.fromRGB(245,248,252)
	button.TextColor3 = Color3.fromRGB(30,35,45)
	button.Font = Enum.Font.GothamBold
	button.TextScaled = true
	button.AutoButtonColor = true
	local c = Instance.new("UICorner")
	c.CornerRadius = UDim.new(0,12)
	c.Parent = button
end

local function hideLegacyShopPages()
	if not shop then return end
	for _, name in ipairs({"MainButtons","CatagoryMusic","CatagoryPremium","CatagoryVehicleUpgrade","CatagoryVehicleSpeed","CatagoryFire","CatagoryHorse"}) do
		local node = shop:FindFirstChild(name)
		if node and node:IsA("GuiObject") then node.Visible = false end
	end
end

local renderShop
local loadPractice

local function buildStarShop()
	if not shop or starShopPanel then return end
	local panel = Instance.new("Frame")
	panel.Name = "StarCoinShop"
	panel.AnchorPoint = Vector2.new(0.5,0.5)
	panel.Position = UDim2.fromScale(0.5,0.52)
	panel.Size = UDim2.new(0.74,0,0.78,0)
	panel.BackgroundColor3 = Color3.fromRGB(252,253,255)
	panel.BackgroundTransparency = 0.04
	panel.Visible = false
	panel.ZIndex = 200
	panel.Parent = shop
	starShopPanel = panel
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0,18)
	corner.Parent = panel
	local stroke = Instance.new("UIStroke")
	stroke.Color = Color3.fromRGB(205,215,230)
	stroke.Thickness = 2
	stroke.Parent = panel

	local title = Instance.new("TextLabel")
	title.Position = UDim2.fromOffset(18,10)
	title.Size = UDim2.new(0.52,0,0,42)
	title.BackgroundTransparency = 1
	title.Text = "STAR SHOP"
	title.TextColor3 = Color3.fromRGB(25,30,40)
	title.Font = Enum.Font.GothamBlack
	title.TextScaled = true
	title.TextXAlignment = Enum.TextXAlignment.Left
	title.ZIndex = 201
	title.Parent = panel

	local subtitle = Instance.new("TextLabel")
	subtitle.Position = UDim2.fromOffset(18,52)
	subtitle.Size = UDim2.new(0.62,0,0,30)
	subtitle.BackgroundTransparency = 1
	subtitle.Text = "Answer school questions → earn Star Coins → unlock avatar styles"
	subtitle.TextColor3 = Color3.fromRGB(90,100,115)
	subtitle.Font = Enum.Font.GothamMedium
	subtitle.TextScaled = true
	subtitle.TextXAlignment = Enum.TextXAlignment.Left
	subtitle.ZIndex = 201
	subtitle.Parent = panel

	shopBalance = Instance.new("TextLabel")
	shopBalance.AnchorPoint = Vector2.new(1,0)
	shopBalance.Position = UDim2.new(1,-76,0,14)
	shopBalance.Size = UDim2.fromOffset(190,36)
	shopBalance.BackgroundColor3 = Color3.fromRGB(255,239,143)
	shopBalance.TextColor3 = Color3.fromRGB(65,55,10)
	shopBalance.Font = Enum.Font.GothamBold
	shopBalance.TextScaled = true
	shopBalance.ZIndex = 202
	shopBalance.Parent = panel
	local bc = Instance.new("UICorner")
	bc.CornerRadius = UDim.new(0,12)
	bc.Parent = shopBalance

	local close = Instance.new("TextButton")
	close.AnchorPoint = Vector2.new(1,0)
	close.Position = UDim2.new(1,-14,0,14)
	close.Size = UDim2.fromOffset(48,36)
	close.Text = "X"
	close.BackgroundColor3 = Color3.fromRGB(230,74,74)
	close.TextColor3 = Color3.new(1,1,1)
	close.Font = Enum.Font.GothamBlack
	close.TextScaled = true
	close.ZIndex = 203
	close.Parent = panel
	local cc = Instance.new("UICorner")
	cc.CornerRadius = UDim.new(0,12)
	cc.Parent = close
	close.Activated:Connect(function() panel.Visible = false end)

	local practice = Instance.new("TextButton")
	practice.Position = UDim2.fromOffset(18,88)
	practice.Size = UDim2.fromOffset(230,42)
	practice.Text = "STUDY FOR COINS  +★"
	practice.ZIndex = 202
	practice.Parent = panel
	styleButton(practice, Color3.fromRGB(192,238,211))
	practice.Activated:Connect(function()
		loadPractice()
	end)

	local gridFrame = Instance.new("ScrollingFrame")
	gridFrame.Name = "Packs"
	gridFrame.Position = UDim2.fromOffset(18,142)
	gridFrame.Size = UDim2.new(1,-36,1,-160)
	gridFrame.BackgroundTransparency = 1
	gridFrame.BorderSizePixel = 0
	gridFrame.ScrollBarThickness = 4
	gridFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	gridFrame.CanvasSize = UDim2.fromOffset(0,0)
	gridFrame.ZIndex = 201
	gridFrame.Parent = panel
	shopGrid = gridFrame

	local layout = Instance.new("UIGridLayout")
	layout.CellPadding = UDim2.fromOffset(10,10)
	layout.CellSize = UDim2.new(0.48,-5,0,108)
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Parent = gridFrame

	practicePanel = Instance.new("Frame")
	practicePanel.Name = "Practice"
	practicePanel.AnchorPoint = Vector2.new(0.5,0.5)
	practicePanel.Position = UDim2.fromScale(0.5,0.56)
	practicePanel.Size = UDim2.new(0.78,0,0.66,0)
	practicePanel.BackgroundColor3 = Color3.fromRGB(255,255,255)
	practicePanel.Visible = false
	practicePanel.ZIndex = 220
	practicePanel.Parent = panel
	local pc = Instance.new("UICorner")
	pc.CornerRadius = UDim.new(0,16)
	pc.Parent = practicePanel
end

local function updateShopBalance()
	if not shopBalance then return end
	local coins = economyState and tonumber(economyState.coins) or tonumber(player:GetAttribute("StarCoins")) or 0
	shopBalance.Text = "★ "..tostring(coins).." Star Coins"
end

renderShop = function()
	buildStarShop()
	refreshEconomy()
	updateShopBalance()
	updateEditorCoins()
	if not shopGrid or not economyState then return end
	for _, child in ipairs(shopGrid:GetChildren()) do
		if child:IsA("GuiObject") and not child:IsA("UIGridLayout") then child:Destroy() end
	end
	for order, pack in ipairs(economyState.packs or {}) do
		local owned = pack.Owned == true
		local card = Instance.new("TextButton")
		card.Name = tostring(pack.Id)
		card.LayoutOrder = order
		card.Text = tostring(pack.Name).."
"..(owned and "OWNED ✓" or ("★ "..tostring(pack.Price))).."
"..tostring(pack.Description or (tostring(#(pack.Outfits or {})).." outfits"))
		card.ZIndex = 202
		card.Parent = shopGrid
		styleButton(card, owned and Color3.fromRGB(208,242,216) or Color3.fromRGB(238,244,252))
		card.Active = not owned
		card.Activated:Connect(function()
			if owned or economyBusy then return end
			economyBusy = true
			local result = invoke(economyPurchasePack, tostring(pack.Id))
			economyBusy = false
			if result.ok == true then
				economyState = result
				renderShop()
				if editorStatus then showEditorStatus(tostring(pack.Name).." unlocked!", true) end
			elseif result.code == "not_enough_coins" then
				shopBalance.Text = "Need more coins — answer questions!"
			end
		end)
	end
end

loadPractice = function()
	buildStarShop()
	if not practicePanel then return end
	for _, child in ipairs(practicePanel:GetChildren()) do
		if not child:IsA("UICorner") then child:Destroy() end
	end
	local q = invoke(economyGetPractice)
	currentPractice = q
	practicePanel.Visible = true
	if q.done == true then
		local done = Instance.new("TextLabel")
		done.Size = UDim2.new(1,-28,1,-28)
		done.Position = UDim2.fromOffset(14,14)
		done.BackgroundTransparency = 1
		done.Text = "Great work!
You earned all of today's practice rewards."
		done.TextColor3 = Color3.fromRGB(35,45,60)
		done.Font = Enum.Font.GothamBold
		done.TextScaled = true
		done.TextWrapped = true
		done.ZIndex = 221
		done.Parent = practicePanel
		return
	end
	if q.ok ~= true then return end

	local prompt = Instance.new("TextLabel")
	prompt.Position = UDim2.fromOffset(16,14)
	prompt.Size = UDim2.new(1,-32,0,92)
	prompt.BackgroundTransparency = 1
	prompt.Text = tostring(q.prompt)
	prompt.TextColor3 = Color3.fromRGB(30,35,45)
	prompt.Font = Enum.Font.GothamBold
	prompt.TextScaled = true
	prompt.TextWrapped = true
	prompt.ZIndex = 221
	prompt.Parent = practicePanel

	for index, choice in ipairs(q.choices or {}) do
		local answer = Instance.new("TextButton")
		answer.Position = UDim2.new(0,16,0,110 + ((index-1)*58))
		answer.Size = UDim2.new(1,-32,0,48)
		answer.Text = tostring(choice)
		answer.ZIndex = 222
		answer.Parent = practicePanel
		styleButton(answer, Color3.fromRGB(238,244,252))
		answer.Activated:Connect(function()
			if not currentPractice or economyBusy then return end
			economyBusy = true
			local result = invoke(economySubmitPractice, currentPractice.id, tostring(choice))
			economyBusy = false
			if result.ok then
				refreshEconomy()
				updateShopBalance()
				updateEditorCoins()
				prompt.Text = (result.correct and "Correct! " or "Good try! ").."+"..tostring(result.reward).." Star Coins
"..tostring(result.hint or "")
				for _, child in ipairs(practicePanel:GetChildren()) do
					if child:IsA("TextButton") then child.Visible = false end
				end
				task.delay(1.35, function()
					if practicePanel and practicePanel.Parent then loadPractice() end
				end)
			end
		end)
	end

	local close = Instance.new("TextButton")
	close.AnchorPoint = Vector2.new(1,1)
	close.Position = UDim2.new(1,-12,1,-12)
	close.Size = UDim2.fromOffset(90,34)
	close.Text = "CLOSE"
	close.ZIndex = 223
	close.Parent = practicePanel
	styleButton(close, Color3.fromRGB(240,220,220))
	close.Activated:Connect(function() practicePanel.Visible = false end)
end

if shop then
	buildStarShop()
	local openButton = shop:FindFirstChild("OpenButton")
	openButton = openButton and openButton:FindFirstChild("MainOpen")
	openButton = openButton and openButton:FindFirstChild("Open")
	if openButton and openButton:IsA("GuiButton") then
		openButton.Activated:Connect(function()
			task.defer(function()
				hideLegacyShopPages()
				renderShop()
				if starShopPanel then starShopPanel.Visible = true end
			end)
		end)
	end

	local legacyMain = shop:FindFirstChild("MainButtons")
	if legacyMain and legacyMain:IsA("GuiObject") then
		legacyMain:GetPropertyChangedSignal("Visible"):Connect(function()
			if legacyMain.Visible then
				task.defer(function()
					hideLegacyShopPages()
					renderShop()
					if starShopPanel then starShopPanel.Visible = true end
				end)
			end
		end)
	end
end

economyChanged.OnClientEvent:Connect(function(state)
	if type(state) == "table" and state.ok == true then
		economyState = state
		updateShopBalance()
		updateEditorCoins()
		if starShopPanel and starShopPanel.Visible then renderShop() end
	end
end)

refreshEconomy()
updateEditorCoins()

print("STARBLOX_AVATAR_SHOP_CLIENT_READY")
