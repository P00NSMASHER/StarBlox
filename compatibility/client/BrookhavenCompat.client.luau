-- Behavior-level compatibility fallback for the pinned legacy Brookhaven client.
-- Existing Brookhaven UI stays authoritative visually. Native callbacks get first chance;
-- these bindings act only when the corresponding native action produced no observable result.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")
local remotes = ReplicatedStorage:WaitForChild("RemoteEvents")
local nativeUiAction = remotes:FindFirstChild("StarBloxNativeUiAction")

local function resolveNativeUiAction()
	if nativeUiAction and nativeUiAction:IsA("RemoteFunction") then
		return nativeUiAction
	end
	for _ = 1, 20 do
		local candidate = remotes:FindFirstChild("StarBloxNativeUiAction")
		if candidate and candidate:IsA("RemoteFunction") then
			nativeUiAction = candidate
			return candidate
		end
		task.wait(0.05)
	end
	return nil
end

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

local function invokeNativeUi(kind, ...)
	local remote = resolveNativeUiAction()
	if not remote then
		warn("STARBLOX_NATIVE_UI_FALLBACK_FAILED", kind, "ui_remote_missing")
		return false, {ok = false, code = "ui_remote_missing"}
	end
	local args = table.pack(...)
	local ok, result = pcall(function()
		return remote:InvokeServer(kind, table.unpack(args, 1, args.n))
	end)
	if not ok or type(result) ~= "table" or result.ok ~= true then
		warn("STARBLOX_NATIVE_UI_FALLBACK_FAILED", kind, ok and result and result.code or tostring(result))
		return false, result
	end
	return true, result
end

-- Shop: preserve the original panels and buttons, but do not depend on PlayerHandler
-- reaching its final shop-binding section.
local shop = main:WaitForChild("Shop")
local shopMainButtons = shop:WaitForChild("MainButtons")
local shopPanels = {
	ColorSpeedLower = shop:WaitForChild("CatagoryVehicleUpgrade"),
	Speed200 = shop:WaitForChild("CatagoryVehicleSpeed"),
	Premium = shop:WaitForChild("CatagoryPremium"),
	Music = shop:WaitForChild("CatagoryMusic"),
	Horse = shop:WaitForChild("CatagoryHorse"),
	Fire = shop:WaitForChild("CatagoryFire"),
}
local shopPurchaseActions = {
	ColorSpeedLower = "BoughtColorSpeedLower",
	Speed200 = "BoughtSpeed200",
	Premium = "BoughtPremium",
	Music = "BoughtMusic",
	Horse = "BoughtHorse",
	Fire = "BoughtFire",
}

local function shopSignature()
	local parts = {shopMainButtons.Visible and "1" or "0"}
	for name, panel in pairs(shopPanels) do
		table.insert(parts, name .. ":" .. (panel.Visible and "1" or "0"))
	end
	table.sort(parts)
	return table.concat(parts, "|")
end

local function closeShopPanels()
	shopMainButtons.Visible = false
	for _, panel in pairs(shopPanels) do
		panel.Visible = false
	end
end

local shopOpen = shop:WaitForChild("OpenButton"):WaitForChild("MainOpen"):WaitForChild("Open")
shopOpen.Activated:Connect(function()
	local before = shopSignature()
	local wasOpen = shopMainButtons.Visible
	task.delay(0.08, function()
		if shopSignature() ~= before then
			return
		end
		for _, panel in pairs(shopPanels) do
			panel.Visible = false
		end
		shopMainButtons.Visible = not wasOpen
	end)
end)

local shopCategoryContainer = shopMainButtons:WaitForChild("MainOpen")
for categoryName, panel in pairs(shopPanels) do
	local categoryButton = shopCategoryContainer:FindFirstChild(categoryName)
	if categoryButton and categoryButton:IsA("GuiButton") then
		categoryButton.Activated:Connect(function()
			local before = shopSignature()
			local wasVisible = panel.Visible
			task.delay(0.08, function()
				if shopSignature() ~= before then
					return
				end
				for _, other in pairs(shopPanels) do
					other.Visible = false
				end
				panel.Visible = not wasVisible
			end)
		end)
	end
end

local purchaseButtonNames = {
	ColorSpeedLower = "VehicleUpgrade",
	Speed200 = "Speed",
	Premium = "Premium",
	Music = "Music",
	Horse = "Horse",
	Fire = "Fire",
}
for categoryName, panel in pairs(shopPanels) do
	local mainOpen = panel:FindFirstChild("MainOpen")
	local purchase = mainOpen and mainOpen:FindFirstChild(purchaseButtonNames[categoryName])
	if purchase and purchase:IsA("GuiButton") then
		purchase.Activated:Connect(function()
			task.delay(0.15, function()
				local ok = invokeNativeUi("shop_pass", shopPurchaseActions[categoryName])
				if ok then
					closeShopPanels()
				end
			end)
		end)
	end
end

-- Avatar editor: use the original editor, catalog data, and button artwork. The fallback
-- can both recover dead navigation and complete the actual avatar mutation server-side.
local editor = noReset:WaitForChild("MainEditor")
local catalogFrame = editor:WaitForChild("Catalog")
local header = catalogFrame:WaitForChild("Header")
local categoryTabs = header:WaitForChild("CategoryTabs")
local subCategoryTabs = header:WaitForChild("SubCategoryTabs")
local container = catalogFrame:WaitForChild("Container")
local scrolling = container:WaitForChild("ScrollingFrame")
local outfitFrame = container:WaitForChild("OutfitFrame")
local scaleFrame = container:WaitForChild("ScaleFrame")

local catalogData = nil
pcall(function()
	catalogData = require(ReplicatedStorage:WaitForChild("AvatarEditorScipts"):WaitForChild("Catalog"))
end)

local avatarController = playerGui:FindFirstChild("AvatarEditor")
if not avatarController then
	local scripts = player:FindFirstChild("PlayerScripts")
	avatarController = scripts and scripts:FindFirstChild("AvatarEditor")
end
local buttonModule = avatarController and avatarController:FindFirstChild("Button")
local buttonTemplate = buttonModule and buttonModule:FindFirstChild("ImageButton")

local currentCategory = "Body"
local currentSubcategory = "Scale"
local generatedButtons = {}
local compatibilityScale = 1

local function avatarNavSignature()
	local parts = {
		"scroll:" .. (scrolling.Visible and "1" or "0"),
		"outfit:" .. (outfitFrame.Visible and "1" or "0"),
		"scale:" .. (scaleFrame.Visible and "1" or "0"),
	}
	for _, frame in ipairs(subCategoryTabs:GetChildren()) do
		if frame:IsA("GuiObject") then
			table.insert(parts, frame.Name .. ":" .. (frame.Visible and "1" or "0"))
		end
	end
	table.sort(parts)
	return table.concat(parts, "|")
end

local function hideSubcategories(except)
	for _, frame in ipairs(subCategoryTabs:GetChildren()) do
		if frame:IsA("GuiObject") then
			frame.Visible = frame == except
		end
	end
end

local function clearGeneratedButtons()
	for button in pairs(generatedButtons) do
		if button and button.Parent then
			button:Destroy()
		end
	end
	table.clear(generatedButtons)
end

local function assetRows(category, subcategory)
	if type(catalogData) ~= "table" then
		return nil
	end
	if subcategory == "SkinTone" then
		local appearance = catalogData.Appearance
		return type(appearance) == "table" and appearance.SkinTone or nil
	end
	local categoryData = catalogData[category]
	if type(categoryData) ~= "table" then
		return nil
	end
	return categoryData[subcategory]
end

local function assetIdForButton(button)
	local direct = tonumber(button:GetAttribute("StarBloxAssetId"))
	if direct then
		return direct
	end
	local rows = assetRows(currentCategory, currentSubcategory)
	if type(rows) ~= "table" then
		return nil
	end
	for key, item in pairs(rows) do
		if type(item) == "table" and item.Name == button.Name then
			return tonumber(item.Id)
		elseif currentSubcategory == "SkinTone" and tostring(key) == button.Name then
			return tostring(key)
		end
	end
	return nil
end

local function setButtonVisual(button, item, skinColor)
	button.Name = item and tostring(item.Name) or tostring(skinColor)
	local icon = button:FindFirstChild("Icon")
	if icon and icon:IsA("ImageLabel") then
		if skinColor and typeof(skinColor) == "Color3" then
			icon.Image = "rbxasset://textures/whiteCircle.png"
			icon.ImageColor3 = skinColor
		elseif item and item.Id then
			icon.Image = "rbxthumb://type=Asset&id=" .. tostring(item.Id) .. "&w=150&h=150"
		end
	end
	local premium = button:FindFirstChild("PremiumMesh")
	if premium and premium:IsA("GuiObject") then
		premium.Visible = item and item.Premium == true or false
	end
	local empty = button:FindFirstChild("EmptyMesh")
	if empty and empty:IsA("GuiObject") then
		empty.Visible = item and item.Empty == true or false
	end
end

local function bindAssetButton(button)
	if not button:IsA("GuiButton") or button:GetAttribute("StarBloxCompatAssetBound") then
		return
	end
	button:SetAttribute("StarBloxCompatAssetBound", true)
	button.Activated:Connect(function()
		local categoryAtClick = currentCategory
		local subcategoryAtClick = currentSubcategory
		local value = assetIdForButton(button)
		if value == nil then
			return
		end
		task.delay(0.15, function()
			if subcategoryAtClick == "SkinTone" then
				invokeNativeUi("avatar_skintone", value)
			else
				invokeNativeUi("avatar_asset", categoryAtClick, subcategoryAtClick, value)
			end
		end)
	end)
end

local function bindCurrentAssetButtons()
	for _, child in ipairs(scrolling:GetChildren()) do
		if child:IsA("GuiButton") then
			bindAssetButton(child)
		end
	end
end

local function currentCatalogMatches(category, subcategory)
	local rows = assetRows(category, subcategory)
	if type(rows) ~= "table" then
		return false
	end
	local expected = {}
	if subcategory == "SkinTone" then
		for name in pairs(rows) do
			expected[tostring(name)] = true
		end
	else
		for _, item in ipairs(rows) do
			if type(item) == "table" and item.Name then
				expected[tostring(item.Name)] = true
			end
		end
	end
	local count = 0
	for _, child in ipairs(scrolling:GetChildren()) do
		if child:IsA("GuiButton") then
			count += 1
			if not expected[child.Name] then
				return false
			end
		end
	end
	return count > 0
end

scrolling.ChildAdded:Connect(function(child)
	if child:IsA("GuiButton") then
		task.defer(bindAssetButton, child)
	end
end)

local function populateCatalogFallback(category, subcategory)
	if not buttonTemplate or type(catalogData) ~= "table" then
		return false
	end
	clearGeneratedButtons()
	local rows = assetRows(category, subcategory)
	if type(rows) ~= "table" then
		return false
	end
	local created = 0
	if subcategory == "SkinTone" then
		for toneName, toneColor in pairs(rows) do
			if typeof(toneColor) == "Color3" then
				local button = buttonTemplate:Clone()
				button:SetAttribute("StarBloxCompatGenerated", true)
				setButtonVisual(button, nil, toneColor)
				button.Name = tostring(toneName)
				button.Parent = scrolling
				generatedButtons[button] = true
				bindAssetButton(button)
				created += 1
			end
		end
	else
		for _, item in ipairs(rows) do
			if type(item) == "table" and tonumber(item.Id) then
				local button = buttonTemplate:Clone()
				button:SetAttribute("StarBloxCompatGenerated", true)
				button:SetAttribute("StarBloxAssetId", tonumber(item.Id))
				setButtonVisual(button, item, nil)
				button.Parent = scrolling
				generatedButtons[button] = true
				bindAssetButton(button)
				created += 1
			end
		end
	end
	scrolling.Visible = true
	outfitFrame.Visible = false
	scaleFrame.Visible = false
	fitScrollingFrames(scrolling)
	return created > 0
end

for _, categoryButton in ipairs(categoryTabs:GetChildren()) do
	if categoryButton:IsA("GuiButton") then
		categoryButton.Activated:Connect(function()
			if categoryButton.Name == "Close" or categoryButton.Name == "RevertOriginalCharacter" then
				return
			end
			currentCategory = categoryButton.Name
			local before = avatarNavSignature()
			task.delay(0.08, function()
				local target = subCategoryTabs:FindFirstChild(currentCategory)
				if target and avatarNavSignature() == before then
					hideSubcategories(target)
				end
			end)
		end)
	end
end

for _, subFrame in ipairs(subCategoryTabs:GetChildren()) do
	if subFrame:IsA("GuiObject") then
		for _, subButton in ipairs(subFrame:GetChildren()) do
			if subButton:IsA("GuiButton") then
				subButton.Activated:Connect(function()
					currentCategory = subFrame.Name
					currentSubcategory = subButton.Name
					local before = avatarNavSignature()
					task.delay(0.1, function()
						if subButton.Name == "Scale" then
							if avatarNavSignature() == before then
								scrolling.Visible = false
								outfitFrame.Visible = false
								scaleFrame.Visible = true
							end
						elseif subButton.Name == "OutFit" then
							if avatarNavSignature() == before then
								scrolling.Visible = false
								scaleFrame.Visible = false
								outfitFrame.Visible = true
								fitScrollingFrames(outfitFrame)
							end
						else
							bindCurrentAssetButtons()
							if not currentCatalogMatches(currentCategory, currentSubcategory) then
								populateCatalogFallback(currentCategory, currentSubcategory)
							end
						end
					end)
				end)
			end
		end
	end
end

for _, outfit in ipairs(outfitFrame:GetChildren()) do
	if outfit:IsA("GuiButton") then
		outfit.Activated:Connect(function()
			local shirt = outfit:FindFirstChild("Shirt")
			local pants = outfit:FindFirstChild("Pants")
			if not (shirt and pants) then
				return
			end
			task.delay(0.15, function()
				invokeNativeUi("avatar_outfit", shirt.Value, pants.Value)
			end)
		end)
	end
end

local avatarSizeValue = avatarController and avatarController:FindFirstChild("CharacterSizeNumber")
local sizeButtons = scaleFrame:FindFirstChild("Buttons")
local numberHolder = sizeButtons and sizeButtons:FindFirstChild("Number")
local numberLabel = numberHolder and numberHolder:FindFirstChild("Number")
local function currentScale()
	if avatarSizeValue and avatarSizeValue:IsA("NumberValue") then
		return avatarSizeValue.Value
	end
	if numberLabel and tonumber(numberLabel.Text) then
		return tonumber(numberLabel.Text)
	end
	return compatibilityScale
end
local function setScaleUi(value)
	compatibilityScale = value
	if avatarSizeValue and avatarSizeValue:IsA("NumberValue") then
		avatarSizeValue.Value = value
	end
	if numberLabel and numberLabel:IsA("TextLabel") then
		numberLabel.Text = tostring(value)
	end
end
local function bindScale(button, delta)
	if not (button and button:IsA("GuiButton")) then return end
	button.Activated:Connect(function()
		task.delay(0.15, function()
			local value = math.clamp(currentScale() + delta, 0.5, 1)
			local ok = invokeNativeUi("avatar_scale", value)
			if ok then setScaleUi(value) end
		end)
	end)
end
if sizeButtons then
	bindScale(sizeButtons:FindFirstChild("Smaller"), -0.05)
	bindScale(sizeButtons:FindFirstChild("Bigger"), 0.05)
end

local revert = categoryTabs:FindFirstChild("RevertOriginalCharacter")
if revert and revert:IsA("GuiButton") then
	revert.Activated:Connect(function()
		task.delay(0.15, function()
			local ok = invokeNativeUi("avatar_reset")
			if ok then setScaleUi(1) end
		end)
	end)
end

print("STARBLOX_BROOKHAVEN_COMPAT_CLIENT_READY")
print("STARBLOX_NATIVE_SHOP_AVATAR_FALLBACK_READY")