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
