-- StarBlox v41 compatibility layer.
-- Restores only the server state and house handlers missing from the pinned Brookhaven copy.
-- The original Brookhaven map and client GUI remain authoritative.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

local lots = workspace:WaitForChild("001_Lots")
local remotes = ReplicatedStorage:WaitForChild("RemoteEvents")
local startup = ReplicatedStorage:WaitForChild("PlayersStartup")
local bagTemplate = startup:WaitForChild("PlayersBag")

local gettingHouse = remotes:WaitForChild("GettingHouse")
local playerHouseChoice = remotes:WaitForChild("PlayerHouseChoice")
local playersHouse = remotes:WaitForChild("PlayersHouse")

local templateFolder = Instance.new("Folder")
templateFolder.Name = "__StarBloxBrookhavenHouseTemplates"
templateFolder.Parent = ServerStorage

local templates = {}

local function lotNumber(lot)
	local holder = lot and lot:FindFirstChild("Number")
	local value = holder and holder:FindFirstChild("Number")
	if value and value:IsA("NumberValue") then
		return math.floor(value.Value)
	end
	return nil
end

local function plotType(lot)
	local buy = lot and lot:FindFirstChild("BuyHouse")
	local value = buy and buy:FindFirstChild("PlotOfLand")
	if value and value:IsA("StringValue") then
		return value.Value
	end
	return nil
end

local function ownerValue(lot)
	local value = lot and lot:FindFirstChild("Owner")
	if value and value:IsA("StringValue") then
		return value
	end
	return nil
end

-- Preserve genuine house models that shipped in the source as runtime templates.
local occupied = {}
for _, lot in ipairs(lots:GetChildren()) do
	local picked = lot:FindFirstChild("HousePickedByPlayer")
	local model = picked and picked:FindFirstChild("HouseModel")
	if model and model:IsA("Model") then
		table.insert(occupied, { number = lotNumber(lot) or 999, model = model })
	end
end

table.sort(occupied, function(a, b)
	return a.number < b.number
end)

for index, row in ipairs(occupied) do
	local clone = row.model:Clone()
	clone.Name = string.format("Template_%02d", index)
	clone.Parent = templateFolder
	table.insert(templates, clone)
end
templateFolder:SetAttribute("TemplateCount", #templates)

local function ensureBag(player)
	local existing = player:FindFirstChild("PlayersBag")
	if existing then
		return existing
	end
	local bag = bagTemplate:Clone()
	bag.Name = "PlayersBag"
	bag.Parent = player
	return bag
end

local function resetBag(player)
	local bag = ensureBag(player)
	local houseOwn = bag:FindFirstChild("HouseOwn")
	local houseNumber = bag:FindFirstChild("HouseNumber")
	local structure = bag:FindFirstChild("PlayerHouseStructure")
	local built = bag:FindFirstChild("HouseBuilt")
	if houseOwn then houseOwn.Value = false end
	if houseNumber then houseNumber.Value = 0 end
	if structure then structure.Value = "No House" end
	if built then built.Value = false end
	return bag
end

local function findOwnedLot(player)
	for _, lot in ipairs(lots:GetChildren()) do
		local owner = ownerValue(lot)
		if owner and owner.Value == player.Name then
			return lot
		end
	end
	return nil
end

local function findAvailableLotByNumber(number)
	for _, lot in ipairs(lots:GetChildren()) do
		if lotNumber(lot) == number then
			local owner = ownerValue(lot)
			if owner and owner.Value == "Net" then
				return lot
			end
		end
	end
	return nil
end

local function setBuyPartAvailable(lot, available)
	local buy = lot and lot:FindFirstChild("BuyHouse")
	if not buy or not buy:IsA("BasePart") then return end
	buy.Transparency = available and 0 or 1
	buy.CanCollide = available
	local detector = buy:FindFirstChildOfClass("ClickDetector")
	if detector then
		detector.MaxActivationDistance = available and 32 or 0
	end
	for _, child in ipairs(buy:GetChildren()) do
		if child:IsA("SurfaceGui") then
			child.Enabled = available
		end
	end
end

local function releaseLot(player)
	local lot = findOwnedLot(player)
	if lot then
		local picked = lot:FindFirstChild("HousePickedByPlayer")
		if picked then picked:Destroy() end
		local owner = ownerValue(lot)
		if owner then owner.Value = "Net" end
		lot.Name = "For Sale"
		setBuyPartAvailable(lot, true)
	end
	resetBag(player)
end

local function updateHouseOwnership(model, player)
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("StringValue") and item.Name == "Owner" then
			item.Value = player.Name
		elseif item:IsA("ObjectValue") and item.Name == "OwnerOBJ" then
			item.Value = player
		end
	end
end

local function alignHouseToLot(model, lot)
	local target = lot:FindFirstChild("HouseSpawnPosition")
	if not target or not target:IsA("BasePart") then
		return false
	end
	local point = model:FindFirstChild("PointToSet", true)
	if point and point:IsA("BasePart") then
		local delta = target.CFrame * point.CFrame:Inverse()
		for _, item in ipairs(model:GetDescendants()) do
			if item:IsA("BasePart") then
				item.CFrame = delta * item.CFrame
			end
		end
		return true
	end
	local ok = pcall(function()
		model:PivotTo(target.CFrame)
	end)
	return ok
end

local function styleIndex(styleName)
	local number = tonumber(string.match(tostring(styleName), "^(%d%d%d)_House$"))
	if not number then return nil end
	return math.clamp(number, 1, 12)
end

local function buildHouse(player, styleName)
	local lot = findOwnedLot(player)
	if not lot or plotType(lot) ~= "House" then return false end
	if #templates == 0 then return false end
	local index = styleIndex(styleName)
	if not index then return false end

	gettingHouse:FireClient(player, "LoadingGui")

	local old = lot:FindFirstChild("HousePickedByPlayer")
	if old then old:Destroy() end

	local picked = Instance.new("Model")
	picked.Name = "HousePickedByPlayer"
	picked.Parent = lot

	-- The public source does not contain the original 12 server-side template models.
	-- Cycle the genuine captured Brookhaven house models rather than fabricating geometry.
	local source = templates[((index - 1) % #templates) + 1]
	local model = source:Clone()
	model.Name = "HouseModel"
	model.Parent = picked
	alignHouseToLot(model, lot)
	updateHouseOwnership(model, player)

	local bag = ensureBag(player)
	local built = bag:FindFirstChild("HouseBuilt")
	if built then built.Value = true end
	gettingHouse:FireClient(player, "HouseLoadedGiveHouseGui")
	gettingHouse:FireClient(player, "PermissionOwner")
	return true
end

local function claimLot(player, requestedNumber)
	local bag = ensureBag(player)
	local houseOwn = bag:FindFirstChild("HouseOwn")
	if houseOwn and houseOwn.Value then return nil end
	if findOwnedLot(player) then return nil end

	local lot = findAvailableLotByNumber(requestedNumber)
	if not lot then return nil end

	local owner = ownerValue(lot)
	local kind = plotType(lot)
	if not owner or not kind then return nil end

	owner.Value = player.Name
	lot.Name = player.Name .. "House"
	setBuyPartAvailable(lot, false)

	if houseOwn then houseOwn.Value = true end
	local numberValue = bag:FindFirstChild("HouseNumber")
	if numberValue then numberValue.Value = requestedNumber end
	local structure = bag:FindFirstChild("PlayerHouseStructure")
	if structure then structure.Value = kind end
	local built = bag:FindFirstChild("HouseBuilt")
	if built then built.Value = kind == "Motel" end

	if kind == "Motel" then
		gettingHouse:FireClient(player, "HouseLoadedGiveMotelGui")
		gettingHouse:FireClient(player, "PermissionOwnerMotel")
	end
	return lot
end

local function attachLot(lot)
	local buy = lot:FindFirstChild("BuyHouse")
	local detector = buy and buy:FindFirstChildOfClass("ClickDetector")
	if not detector then return end
	detector.MouseClick:Connect(function(player)
		local bag = ensureBag(player)
		local own = bag:FindFirstChild("HouseOwn")
		local owner = ownerValue(lot)
		local numberHolder = lot:FindFirstChild("Number")
		local numberValue = numberHolder and numberHolder:FindFirstChild("Number")
		local kindValue = buy:FindFirstChild("PlotOfLand")
		if own and own.Value then return end
		if not owner or owner.Value ~= "Net" then return end
		if not numberValue or not kindValue then return end
		gettingHouse:FireClient(player, "BuyHouseYesNo", numberValue, lot, kindValue)
	end)
end

for _, lot in ipairs(lots:GetChildren()) do
	attachLot(lot)
end

gettingHouse.OnServerEvent:Connect(function(player, action, a, b, c)
	ensureBag(player)
	if action == "BuyingHouse" then
		local number = nil
		if typeof(a) == "Instance" and a:IsA("NumberValue") then
			number = math.floor(a.Value)
		elseif type(a) == "number" then
			number = math.floor(a)
		end
		if number then
			claimLot(player, number)
		end
	elseif action == "PickingCustomHouse" then
		buildHouse(player, tostring(a))
	end
end)

playerHouseChoice.OnServerEvent:Connect(function(player, action)
	if action == "PlayerSellHouse" then
		releaseLot(player)
	elseif action == "BuildAnotherHouse" then
		local bag = ensureBag(player)
		local built = bag:FindFirstChild("HouseBuilt")
		if built then built.Value = false end
	end
end)

local houseLocked = {}

playersHouse.OnServerEvent:Connect(function(player, action, value)
	local lot = findOwnedLot(player)
	local picked = lot and lot:FindFirstChild("HousePickedByPlayer")
	local model = picked and picked:FindFirstChild("HouseModel")
	if not model then return end

	if action == "PickingHouseColor" and typeof(value) == "Color3" then
		for _, item in ipairs(model:GetDescendants()) do
			if item:IsA("BasePart") and item.Name == "Color" then
				item.Color = value
			end
		end
	elseif action == "Lights" then
		for _, item in ipairs(model:GetDescendants()) do
			if item:IsA("Light") then
				item.Enabled = not item.Enabled
			end
		end
	elseif action == "LockDoors" then
		local locked = not houseLocked[player.UserId]
		houseLocked[player.UserId] = locked
		for _, group in ipairs(model:GetDescendants()) do
			if group:IsA("Model") and group.Name == "001_HouseDoors" then
				for _, item in ipairs(group:GetDescendants()) do
					if item:IsA("BasePart") then item.CanCollide = locked end
				end
			end
		end
		playersHouse:FireClient(player, locked and "LockDoorsTrue" or "LockDoorsFalse")
	end
end)

Players.PlayerAdded:Connect(function(player)
	resetBag(player)
end)

for _, player in ipairs(Players:GetPlayers()) do
	resetBag(player)
end

Players.PlayerRemoving:Connect(function(player)
	releaseLot(player)
	houseLocked[player.UserId] = nil
end)

print("STARBLOX_BROOKHAVEN_COMPAT_READY templates=" .. tostring(#templates))
