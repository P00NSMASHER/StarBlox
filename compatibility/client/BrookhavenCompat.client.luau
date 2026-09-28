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


-- Native Shop fallback.
-- PlayerHandler normally owns these exact Brookhaven controls. If that legacy
-- controller does not change Shop state, preserve the original UI and execute
-- the same category/pass actions using touch-friendly GuiButton.Activated.
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local passRemote = ReplicatedStorage:WaitForChild("RemoteEvents"):WaitForChild("Pass")
local shop = main:WaitForChild("Shop")
local shopMainButtons = shop:WaitForChild("MainButtons")
local shopMainOpen = shopMainButtons:WaitForChild("MainOpen")

local shopCategories = {
	shop:WaitForChild("CatagoryMusic"),
	shop:WaitForChild("CatagoryVehicleUpgrade"),
	shop:WaitForChild("CatagoryVehicleSpeed"),
	shop:WaitForChild("CatagoryPremium"),
	shop:WaitForChild("CatagoryHorse"),
	shop:WaitForChild("CatagoryFire"),
}

local shopCategoryByButton = {
	ColorSpeedLower = shop.CatagoryVehicleUpgrade,
	Speed200 = shop.CatagoryVehicleSpeed,
	Premium = shop.CatagoryPremium,
	Music = shop.CatagoryMusic,
	Horse = shop.CatagoryHorse,
	Fire = shop.CatagoryFire,
}

local function shopSignature()
	local parts = {shopMainButtons.Visible and "1" or "0"}
	for _, category in ipairs(shopCategories) do
		table.insert(parts, category.Visible and "1" or "0")
	end
	return table.concat(parts)
end

local function closeShopCategories(except)
	for _, category in ipairs(shopCategories) do
		if category ~= except then
			category.Visible = false
		end
	end
end

local shopOpenButton = shop:WaitForChild("OpenButton"):WaitForChild("MainOpen"):WaitForChild("Open")
shopOpenButton.Activated:Connect(function()
	local before = shopSignature()
	local wasVisible = shopMainButtons.Visible
	task.delay(0.08, function()
		if shopSignature() ~= before then
			return
		end
		closeShopCategories(nil)
		shopMainButtons.Visible = not wasVisible
		if shopMainButtons.Visible then
			closeAll(nil)
		end
	end)
end)

for buttonName, category in pairs(shopCategoryByButton) do
	local button = shopMainOpen:FindFirstChild(buttonName)
	if button and button:IsA("GuiButton") then
		button.Activated:Connect(function()
			local before = shopSignature()
			local wasVisible = category.Visible
			task.delay(0.08, function()
				if shopSignature() ~= before then
					return
				end
				closeShopCategories(category)
				category.Visible = not wasVisible
			end)
		end)
	end
end

local passButtons = {
	{button = shop.CatagoryMusic:WaitForChild("MainOpen"):WaitForChild("Music"), action = "BoughtMusic", flag = "MusicPass"},
	{button = shop.CatagoryPremium:WaitForChild("MainOpen"):WaitForChild("Premium"), action = "BoughtPremium", flag = "SilverPass"},
	{button = shop.CatagoryVehicleUpgrade:WaitForChild("MainOpen"):WaitForChild("VehicleUpgrade"), action = "BoughtColorSpeedLower", flag = "ColorSpeedPassLower"},
	{button = shop.CatagoryVehicleSpeed:WaitForChild("MainOpen"):WaitForChild("Speed"), action = "BoughtSpeed200", flag = "SpeedPass200"},
	{button = shop.CatagoryHorse:WaitForChild("MainOpen"):WaitForChild("Horse"), action = "BoughtHorse", flag = "HorsePass"},
	{button = shop.CatagoryFire:WaitForChild("MainOpen"):WaitForChild("Fire"), action = "BoughtFire", flag = "FirePass"},
}

local function hasPassFlag(flagName)
	local bag = player:FindFirstChild("PlayersBag")
	local flag = bag and bag:FindFirstChild(flagName)
	return flag and flag:IsA("BoolValue") and flag.Value == true
end

for _, row in ipairs(passButtons) do
	if row.button:IsA("GuiButton") then
		row.button.Activated:Connect(function()
			task.delay(0.12, function()
				-- If native PlayerHandler already completed the action, do not duplicate it.
				if not hasPassFlag(row.flag) then
					passRemote:FireServer(row.action)
				end
				shopMainButtons.Visible = false
				closeShopCategories(nil)
			end)
		end)
	end
end

local closeButton = shopMainOpen:FindFirstChild("ColorSpeedLower")
closeButton = closeButton and closeButton:FindFirstChild("Close")
if closeButton and closeButton:IsA("GuiButton") then
	closeButton.Activated:Connect(function()
		local before = shopSignature()
		task.delay(0.08, function()
			if shopSignature() == before then
				shopMainButtons.Visible = false
				closeShopCategories(nil)
			end
		end)
	end)
end

print("STARBLOX_BROOKHAVEN_NATIVE_SHOP_FALLBACK_READY")

print("STARBLOX_BROOKHAVEN_COMPAT_CLIENT_READY")

-- Native Brookhaven owns avatar editor, shop, tool, animation, and vehicle menus.
-- This script only preserves the right-rail menu fallback when the legacy PlayerHandler
-- fails to react; it must not hide, restyle, or replace any native menu content.
print("STARBLOX_BROOKHAVEN_NATIVE_UI_FALLBACK_READY")
