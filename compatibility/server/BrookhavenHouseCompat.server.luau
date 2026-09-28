-- StarBlox Brookhaven compatibility layer.
-- Restores runtime state/house ownership that is absent from the pinned legacy place.
-- Deliberately does not alter town geometry or the existing Brookhaven UI.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local Workspace = game:GetService("Workspace")

local remotes = ReplicatedStorage:WaitForChild("RemoteEvents")
local playerHouseChoice = remotes:WaitForChild("PlayerHouseChoice")
local gettingHouse = remotes:WaitForChild("GettingHouse")
local playersHouse = remotes:WaitForChild("PlayersHouse")
local messages = remotes:FindFirstChild("Messages")

local startup = ReplicatedStorage:WaitForChild("PlayersStartup")
local bagTemplate = startup:WaitForChild("PlayersBag")
local lotsRoot = Workspace:WaitForChild("001_Lots")
local worldCommon = Workspace:WaitForChild("WorkspaceCom")
local mapCameras = worldCommon:WaitForChild("001_MapCameras")

local hidden = ServerStorage:FindFirstChild("StarBloxBrookhavenCompatibility")
if hidden then
	hidden:Destroy()
end
hidden = Instance.new("Folder")
hidden.Name = "StarBloxBrookhavenCompatibility"
hidden.Parent = ServerStorage

local templateFolder = Instance.new("Folder")
templateFolder.Name = "HouseTemplates"
templateFolder.Parent = hidden

local baselineFolder = Instance.new("Folder")
baselineFolder.Name = "LotBaselines"
baselineFolder.Parent = hidden

local recordsByNumber = {}
local recordsByLot = {}
local playerLot = {}
local pendingLot = {}
local touchDebounce = {}
local templates = {}
local PRELOADED_OCCUPIED = {}

local function ensureValue(parent, className, name, defaultValue)
	local current = parent:FindFirstChild(name)
	if current and current:IsA(className) then
		return current
	end
	if current then
		current:Destroy()
	end
	local value = Instance.new(className)
	value.Name = name
	value.Value = defaultValue
	value.Parent = parent
	return value
end

local function ensureBag(player)
	local bag = player:FindFirstChild("PlayersBag")
	if bag then
		return bag
	end
	bag = bagTemplate:Clone()
	bag.Name = "PlayersBag"
	bag.Parent = player
	ensureValue(bag, "BoolValue", "HouseOwn", false).Value = false
	ensureValue(bag, "NumberValue", "HouseNumber", 0).Value = 0
	ensureValue(bag, "StringValue", "PlayerHouseStructure", "No House").Value = "No House"
	ensureValue(bag, "BoolValue", "HouseBuilt", false).Value = false
	return bag
end

local function setBagHouse(player, structure, number, built)
	local bag = ensureBag(player)
	ensureValue(bag, "BoolValue", "HouseOwn", false).Value = structure ~= "No House"
	ensureValue(bag, "NumberValue", "HouseNumber", 0).Value = number or 0
	ensureValue(bag, "StringValue", "PlayerHouseStructure", "No House").Value = structure
	ensureValue(bag, "BoolValue", "HouseBuilt", false).Value = built == true
end

local function message(player, text)
	if messages and messages:IsA("RemoteEvent") then
		messages:FireClient(player, text)
	end
end

local function numberForCamera(camera)
	local value = camera:FindFirstChild("Number")
	if value and value:IsA("ValueBase") then
		local parsed = tonumber(value.Value)
		if parsed then
			return math.floor(parsed)
		end
	end
	local parsed = tonumber(string.match(camera.Name, "(%d+)$"))
	return parsed and math.floor(parsed) or nil
end

local cameraRows = {}
for _, camera in ipairs(mapCameras:GetChildren()) do
	if camera:IsA("BasePart") and string.match(camera.Name, "^House%d+$") then
		local number = numberForCamera(camera)
		if number then
			table.insert(cameraRows, {camera = camera, number = number})
		end
	end
end
table.sort(cameraRows, function(a, b)
	return a.number < b.number
end)

local usedCameraNumbers = {}
local function nearestUnusedCamera(part)
	local best, bestDistance
	for _, row in ipairs(cameraRows) do
		if not usedCameraNumbers[row.number] then
			local distance = (row.camera.Position - part.Position).Magnitude
			if bestDistance == nil or distance < bestDistance then
				best = row
				bestDistance = distance
			end
		end
	end
	return best
end

local function disableEmbeddedScripts(model)
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("Script") or item:IsA("LocalScript") then
			item.Disabled = true
		end
	end
end

local lotCandidates = {}
for _, lot in ipairs(lotsRoot:GetChildren()) do
	if lot.Name ~= "DontDelete" then
		local buy = lot:FindFirstChild("BuyHouse", true)
		if buy and buy:IsA("BasePart") then
			table.insert(lotCandidates, {lot = lot, buy = buy})
		end
	end
end

for fallbackIndex, candidate in ipairs(lotCandidates) do
	local lot = candidate.lot
	local buy = candidate.buy
	local nearest = nearestUnusedCamera(buy)
	local number = nearest and nearest.number or fallbackIndex
	if recordsByNumber[number] then
		for probe = 1, math.max(20, #lotCandidates) do
			if not recordsByNumber[probe] then
				number = probe
				break
			end
		end
	end
	if nearest then
		usedCameraNumbers[nearest.number] = true
	end

	local plot = buy:FindFirstChild("PlotOfLand")
	if not (plot and plot:IsA("StringValue")) then
		plot = Instance.new("StringValue")
		plot.Name = "PlotOfLand"
		plot.Value = number > 10 and "House" or "Motel"
		plot.Parent = buy
	end
	if plot.Value ~= "House" and plot.Value ~= "Motel" then
		plot.Value = number > 10 and "House" or "Motel"
	end

	local numberValue = buy:FindFirstChild("CompatibilityHouseNumber")
	if not (numberValue and numberValue:IsA("NumberValue")) then
		numberValue = Instance.new("NumberValue")
		numberValue.Name = "CompatibilityHouseNumber"
		numberValue.Parent = buy
	end
	numberValue.Value = number

	local baseline = lot:FindFirstChild("HousePickedByPlayer")
	local hasPreloadedHouse = baseline and baseline:IsA("Model") or false

	local camera = nearest and nearest.camera or mapCameras:FindFirstChild("House" .. tostring(number))
	local owned = camera and camera:FindFirstChild("HouseOwned")
	if camera and not (owned and owned:IsA("BoolValue")) then
		owned = Instance.new("BoolValue")
		owned.Name = "HouseOwned"
		owned.Parent = camera
	end
	if owned then
		-- Reconcile occupancy from the world snapshot instead of assuming every lot is vacant.
		owned.Value = hasPreloadedHouse
	end

	local baselineClone = nil
	local baselineRelative = nil
	if baseline and baseline:IsA("Model") then
		baselineRelative = buy.CFrame:ToObjectSpace(baseline:GetPivot())
		baselineClone = baseline:Clone()
		baselineClone.Name = "Baseline_" .. tostring(number)
		baselineClone.Parent = baselineFolder

		local templateClone = baseline:Clone()
		templateClone.Name = "Template_" .. tostring(#templates + 1)
		templateClone.Parent = templateFolder
		table.insert(templates, {
			model = templateClone,
			relative = baselineRelative,
			sourceNumber = number,
		})
	end

	local record = {
		number = number,
		lot = lot,
		buy = buy,
		plot = plot,
		numberValue = numberValue,
		camera = camera,
		ownedValue = owned,
		owner = hasPreloadedHouse and PRELOADED_OCCUPIED or nil,
		preloadedOccupied = hasPreloadedHouse,
		baseline = baselineClone,
		baselineRelative = baselineRelative,
		originalTransparency = buy.Transparency,
		originalCanCollide = buy.CanCollide,
		originalCanTouch = buy.CanTouch,
		locked = false,
		garageOpen = false,
		garageState = {},
	}
	recordsByNumber[number] = record
	recordsByLot[lot] = record
end

local function restoreBuyPart(record)
	record.buy.Transparency = record.originalTransparency
	record.buy.CanCollide = record.originalCanCollide
	record.buy.CanTouch = record.originalCanTouch
end

local function hideBuyPart(record)
	record.buy.Transparency = 1
	record.buy.CanCollide = false
	record.buy.CanTouch = false
end

local function restoreBaseline(record)
	local current = record.lot:FindFirstChild("HousePickedByPlayer")
	if current then
		current:Destroy()
	end
	if record.baseline and record.baselineRelative then
		local restored = record.baseline:Clone()
		restored.Name = "HousePickedByPlayer"
		disableEmbeddedScripts(restored)
		restored.Parent = record.lot
		restored:PivotTo(record.buy.CFrame * record.baselineRelative)
	end
end

local function chooseTemplate(houseName)
	if #templates == 0 then
		return nil
	end
	local index = tonumber(string.match(tostring(houseName or ""), "^(%d+)")) or 1
	index = ((index - 1) % #templates) + 1
	return templates[index]
end

local function buildHouse(record, houseName)
	local selected = chooseTemplate(houseName)
	if not selected then
		return false
	end
	local current = record.lot:FindFirstChild("HousePickedByPlayer")
	if current then
		current:Destroy()
	end
	local clone = selected.model:Clone()
	clone.Name = "HousePickedByPlayer"
	disableEmbeddedScripts(clone)
	clone:SetAttribute("StarBloxCompatibilityHouse", true)
	clone.Parent = record.lot
	clone:PivotTo(record.buy.CFrame * selected.relative)
	record.houseModel = clone
	return true
end

local function releasePlayerHouse(player, notifyClient)
	local record = playerLot[player]
	if not record then
		setBagHouse(player, "No House", 0, false)
		return
	end
	record.owner = nil
	record.locked = false
	record.garageOpen = false
	record.garageState = {}
	playerLot[player] = nil
	pendingLot[player] = nil
	if record.ownedValue then
		record.ownedValue.Value = false
	end
	restoreBuyPart(record)
	restoreBaseline(record)
	setBagHouse(player, "No House", 0, false)
	if notifyClient then
		gettingHouse:FireClient(player, "BuyHouseYesNoTurnOff")
	end
end

local function beginPurchase(player, record)
	if not player or not record then
		return
	end
	local now = os.clock()
	if touchDebounce[player] and now - touchDebounce[player] < 1 then
		return
	end
	touchDebounce[player] = now
	local bag = ensureBag(player)
	local structure = bag:FindFirstChild("PlayerHouseStructure")
	if playerLot[player] or (structure and structure.Value ~= "No House") then
		message(player, "You already have a home.")
		return
	end
	if record.owner and record.owner ~= player then
		message(player, record.preloadedOccupied and "This home is already occupied." or "This home is already owned.")
		return
	end
	pendingLot[player] = record
	gettingHouse:FireClient(player, "BuyHouseYesNo", record.numberValue, record.buy, record.plot)
end

for _, record in pairs(recordsByNumber) do
	record.buy.Touched:Connect(function(hit)
		local character = hit and hit.Parent
		if not character then
			return
		end
		local player = Players:GetPlayerFromCharacter(character)
		if player then
			beginPurchase(player, record)
		end
	end)
	for _, item in ipairs(record.buy:GetDescendants()) do
		if item:IsA("ClickDetector") then
			item.MouseClick:Connect(function(player)
				beginPurchase(player, record)
			end)
		elseif item:IsA("ProximityPrompt") then
			item.Triggered:Connect(function(player)
				beginPurchase(player, record)
			end)
		end
	end
end

gettingHouse.OnServerEvent:Connect(function(player, action, a, b, c)
	ensureBag(player)
	if action == "BuyingHouse" then
		local record = pendingLot[player]
		if not record then
			message(player, "Walk up to an available home first.")
			gettingHouse:FireClient(player, "BuyHouseYesNoTurnOff")
			return
		end
		if record.owner and record.owner ~= player then
			message(player, "That home was just claimed.")
			gettingHouse:FireClient(player, "BuyHouseYesNoTurnOff")
			pendingLot[player] = nil
			return
		end
		record.owner = player
		playerLot[player] = record
		pendingLot[player] = nil
		if record.ownedValue then
			record.ownedValue.Value = true
		end
		hideBuyPart(record)
		local structure = record.plot.Value == "Motel" and "Motel" or "House"
		setBagHouse(player, structure, record.number, structure == "Motel")
		gettingHouse:FireClient(player, "BuyHouseYesNoTurnOff")
		if structure == "Motel" then
			gettingHouse:FireClient(player, "HouseLoadedGiveMotelGui")
		end
		return
	end

	if action == "PickingCustomHouse" then
		local record = playerLot[player]
		if not record or record.owner ~= player then
			message(player, "Claim a home before choosing a style.")
			return
		end
		if record.plot.Value ~= "House" then
			return
		end
		if buildHouse(record, a) then
			setBagHouse(player, "House", record.number, true)
			gettingHouse:FireClient(player, "HouseLoadedGiveHouseGui")
		else
			message(player, "No compatible house template is available.")
		end
	end
end)

playerHouseChoice.OnServerEvent:Connect(function(player, action)
	if action == "PlayerSellHouse" then
		releasePlayerHouse(player, true)
	elseif action == "BuildAnotherHouse" then
		local record = playerLot[player]
		if record and record.owner == player then
			local bag = ensureBag(player)
			ensureValue(bag, "BoolValue", "HouseBuilt", false).Value = false
		end
	end
end)

local function currentHouse(record)
	if not record then
		return nil
	end
	local house = record.lot:FindFirstChild("HousePickedByPlayer")
	return house and house:IsA("Model") and house or nil
end

local function toggleLights(record)
	local house = currentHouse(record)
	if not house then
		return
	end
	local target = nil
	for _, item in ipairs(house:GetDescendants()) do
		if item:IsA("PointLight") or item:IsA("SpotLight") or item:IsA("SurfaceLight") then
			if target == nil then
				target = not item.Enabled
			end
			item.Enabled = target
		end
	end
end

local function toggleGarage(record)
	local house = currentHouse(record)
	if not house then
		return
	end
	record.garageOpen = not record.garageOpen
	for _, item in ipairs(house:GetDescendants()) do
		if item:IsA("BasePart") and item.Name == "GarageDoor" then
			if record.garageState[item] == nil then
				record.garageState[item] = {
					transparency = item.Transparency,
					canCollide = item.CanCollide,
				}
			end
			local saved = record.garageState[item]
			if record.garageOpen then
				item.Transparency = 1
				item.CanCollide = false
			else
				item.Transparency = saved.transparency
				item.CanCollide = saved.canCollide
			end
		end
	end
end

local function pickColor(value)
	if typeof(value) == "Color3" then
		return value
	end
	if typeof(value) == "Instance" then
		if value:IsA("Color3Value") then
			return value.Value
		end
		local ok, result = pcall(function()
			return value.Color
		end)
		if ok and typeof(result) == "Color3" then
			return result
		end
	end
	return nil
end

local function applyHouseColor(record, source)
	local color = pickColor(source)
	local house = currentHouse(record)
	if not color or not house then
		return
	end
	for _, item in ipairs(house:GetDescendants()) do
		if item:IsA("BasePart") and (item.Name == "Color" or (item.Parent and item.Parent.Name == "Color")) then
			item.Color = color
		end
	end
end

playersHouse.OnServerEvent:Connect(function(player, action, arg)
	local record = playerLot[player]
	if not record or record.owner ~= player then
		return
	end
	if action == "Lights" then
		toggleLights(record)
	elseif action == "GarageDoor" then
		toggleGarage(record)
	elseif action == "LockDoors" then
		record.locked = not record.locked
		local house = currentHouse(record)
		if house then
			house:SetAttribute("StarBloxHouseLocked", record.locked)
		end
		playersHouse:FireClient(player, record.locked and "LockDoorsTrue" or "LockDoorsFalse")
	elseif action == "PickingHouseColor" then
		applyHouseColor(record, arg)
	end
end)

Players.PlayerAdded:Connect(function(player)
	ensureBag(player)
end)

Players.PlayerRemoving:Connect(function(player)
	releasePlayerHouse(player, false)
	touchDebounce[player] = nil
	pendingLot[player] = nil
end)

for _, player in ipairs(Players:GetPlayers()) do
	ensureBag(player)
end

local preloadedOccupiedCount = 0
for _, record in pairs(recordsByNumber) do
	if record.preloadedOccupied then
		preloadedOccupiedCount += 1
	end
end

print(
	"STARBLOX_BROOKHAVEN_COMPAT_SERVER_READY lots=" .. tostring(#lotCandidates) ..
	" templates=" .. tostring(#templates) ..
	" preloadedOccupied=" .. tostring(preloadedOccupiedCount)
)


-- Learning economy + avatar bridge.
-- Star Coins are virtual-only, earned through server-authorized school rewards.
local DataStoreService = game:GetService("DataStoreService")
local economyStore = DataStoreService:GetDataStore("StarBloxLearningEconomy_v1")

local economyRemoteRoot = ReplicatedStorage:FindFirstChild("StarBloxLearningEconomy")
if economyRemoteRoot then
	economyRemoteRoot:Destroy()
end
economyRemoteRoot = Instance.new("Folder")
economyRemoteRoot.Name = "StarBloxLearningEconomy"
economyRemoteRoot.Parent = ReplicatedStorage

local economyGetState = Instance.new("RemoteFunction")
economyGetState.Name = "GetState"
economyGetState.Parent = economyRemoteRoot

local economyPurchase = Instance.new("RemoteFunction")
economyPurchase.Name = "Purchase"
economyPurchase.Parent = economyRemoteRoot

local avatarAction = Instance.new("RemoteFunction")
avatarAction.Name = "AvatarAction"
avatarAction.Parent = economyRemoteRoot

local economyChanged = Instance.new("RemoteEvent")
economyChanged.Name = "Changed"
economyChanged.Parent = economyRemoteRoot

local rewardRoot = ServerStorage:FindFirstChild("StarBloxLearningRewards")
if rewardRoot then
	rewardRoot:Destroy()
end
rewardRoot = Instance.new("Folder")
rewardRoot.Name = "StarBloxLearningRewards"
rewardRoot.Parent = ServerStorage

local awardCorrectAnswer = Instance.new("BindableEvent")
awardCorrectAnswer.Name = "AwardCorrectAnswer"
awardCorrectAnswer.Parent = rewardRoot

local awardClassComplete = Instance.new("BindableEvent")
awardClassComplete.Name = "AwardClassComplete"
awardClassComplete.Parent = rewardRoot

local awardCoins = Instance.new("BindableEvent")
awardCoins.Name = "AwardCoins"
awardCoins.Parent = rewardRoot

local SHOP_ITEMS = {
	Music = {Price = 60, BagFlag = "MusicPass", Label = "Music"},
	Horse = {Price = 80, BagFlag = "HorsePass", Label = "Horse Upgrade"},
	VehicleUpgrade = {Price = 100, BagFlag = "ColorSpeedPassLower", Label = "Vehicle Upgrade"},
	Fire = {Price = 120, BagFlag = "FirePass", Label = "On-Demand Fire"},
	Premium = {Price = 160, BagFlag = "SilverPass", Label = "Premium"},
	Speed200 = {Price = 220, BagFlag = "SpeedPass200", Label = "200 Speed"},
}

local OUTFITS = {
	PoliceLightBlue = {Shirt = 5104356969, Pants = 5104554099},
	Prisoner = {Shirt = 5104363121, Pants = 5104388889},
	DoctorBlue = {Shirt = 5104359800, Pants = 5104384847},
	Criminal = {Shirt = 5104357530, Pants = 5104383348},
	Chief = {Shirt = 5104355165, Pants = 5104381930},
	FireRed = {Shirt = 5103195987, Pants = 5104387877},
	FireYellow = {Shirt = 5104362567, Pants = 5104387571},
	PoliceDarkBlue = {Shirt = 5104364229, Pants = 5104389242},
	WorkerPink = {Shirt = 5104364739, Pants = 5104390116},
	Ems = {Shirt = 5104360914, Pants = 5104386076},
	FBI = {Shirt = 5104361445, Pants = 5104386472},
	WorkerWhite = {Shirt = 5104365947, Pants = 5104390116},
	Criminal2 = {Shirt = 5104359284, Pants = 5104384456},
	Lifeguard = {Shirt = 5644792928, Pants = 5644793548},
	Dancer = {Shirt = 229505432, Pants = 5846266654, Premium = true},
	Homeless = {Shirt = 229505432, Pants = 5846263819},
	BlackSuit = {Shirt = 5994831990, Pants = 5994836799, Premium = true},
	Maid = {Shirt = 229505432, Pants = 5996993717, Premium = true},
	CowBoy = {Shirt = 5996986757, Pants = 5996990103, Premium = true},
	CowGirl = {Shirt = 5997309428, Pants = 5997323809, Premium = true},
	SantaRed = {Shirt = 5994831185, Pants = 5994833583, Premium = true},
	Elf = {Shirt = 5994826937, Pants = 5994833063, Premium = true},
	SantaBlack = {Shirt = 5996808541, Pants = 5996809284, Premium = true},
}

local SKIN_TONES = {
	Color3.fromRGB(255, 224, 189),
	Color3.fromRGB(241, 194, 125),
	Color3.fromRGB(198, 134, 66),
	Color3.fromRGB(141, 85, 36),
	Color3.fromRGB(92, 51, 23),
}

local economyProfiles = {}

local function freshEconomyProfile()
	return {
		Coins = 100,
		Owned = {},
	}
end

local function normalizeEconomyProfile(raw)
	local profile = freshEconomyProfile()
	if type(raw) == "table" then
		local coins = tonumber(raw.Coins)
		if coins ~= nil then
			profile.Coins = math.max(0, math.floor(coins))
		end
		if type(raw.Owned) == "table" then
			for itemId, owned in pairs(raw.Owned) do
				if SHOP_ITEMS[itemId] and owned == true then
					profile.Owned[itemId] = true
				end
			end
		end
	end
	return profile
end

local function syncEconomyPasses(player, profile)
	local bag = ensureBag(player)
	for itemId, config in pairs(SHOP_ITEMS) do
		local value = ensureValue(bag, "BoolValue", config.BagFlag, false)
		value.Value = profile.Owned[itemId] == true
	end

	if profile.Owned.VehicleUpgrade == true then
		local vehicleSpeed = ensureValue(bag, "NumberValue", "VehicleSpeed", 25)
		vehicleSpeed.Value = math.max(vehicleSpeed.Value, 70)
	end
	if profile.Owned.Speed200 == true then
		local vehicleSpeed = ensureValue(bag, "NumberValue", "VehicleSpeed", 25)
		vehicleSpeed.Value = math.max(vehicleSpeed.Value, 200)
		local smallSpeed = ensureValue(bag, "NumberValue", "SpeedPassNoMotorVehicle", 25)
		smallSpeed.Value = math.max(smallSpeed.Value, 45)
	end
	player:SetAttribute("StarBloxCoins", profile.Coins)
end

local function loadEconomy(player)
	local current = economyProfiles[player]
	if current then
		return current
	end

	local loaded = nil
	local ok = pcall(function()
		loaded = economyStore:GetAsync("u:" .. tostring(player.UserId))
	end)
	local profile = normalizeEconomyProfile(ok and loaded or nil)
	economyProfiles[player] = profile
	syncEconomyPasses(player, profile)
	return profile
end

local function saveEconomy(player)
	local profile = economyProfiles[player]
	if not profile then
		return
	end
	local payload = {
		Coins = profile.Coins,
		Owned = profile.Owned,
	}
	pcall(function()
		economyStore:SetAsync("u:" .. tostring(player.UserId), payload)
	end)
end

local function publicEconomyState(player)
	local profile = loadEconomy(player)
	local items = {}
	for itemId, config in pairs(SHOP_ITEMS) do
		table.insert(items, {
			Id = itemId,
			Label = config.Label,
			Price = config.Price,
			Owned = profile.Owned[itemId] == true,
		})
	end
	table.sort(items, function(a, b)
		if a.Price ~= b.Price then
			return a.Price < b.Price
		end
		return a.Id < b.Id
	end)
	return {
		ok = true,
		coins = profile.Coins,
		correctAnswerReward = 10,
		classCompleteReward = 25,
		items = items,
	}
end

local function notifyEconomy(player)
	local state = publicEconomyState(player)
	player:SetAttribute("StarBloxCoins", state.coins)
	economyChanged:FireClient(player, state)
end

local function grantCoins(player, amount, reason)
	if not player or player.Parent ~= Players then
		return
	end
	local numeric = tonumber(amount)
	if numeric == nil then
		return
	end
	numeric = math.clamp(math.floor(numeric), 0, 500)
	if numeric <= 0 then
		return
	end
	local profile = loadEconomy(player)
	profile.Coins += numeric
	notifyEconomy(player)
	task.spawn(saveEconomy, player)
end

awardCorrectAnswer.Event:Connect(function(player)
	grantCoins(player, 10, "correct_answer")
end)

awardClassComplete.Event:Connect(function(player)
	grantCoins(player, 25, "class_complete")
end)

awardCoins.Event:Connect(function(player, amount, reason)
	grantCoins(player, amount, reason)
end)

economyGetState.OnServerInvoke = function(player)
	return publicEconomyState(player)
end

economyPurchase.OnServerInvoke = function(player, itemId)
	if type(itemId) ~= "string" then
		return {ok = false, code = "invalid_item"}
	end
	local config = SHOP_ITEMS[itemId]
	if not config then
		return {ok = false, code = "unknown_item"}
	end
	local profile = loadEconomy(player)
	if profile.Owned[itemId] == true then
		return {ok = true, alreadyOwned = true, state = publicEconomyState(player)}
	end
	if profile.Coins < config.Price then
		return {
			ok = false,
			code = "not_enough_coins",
			needed = config.Price - profile.Coins,
			state = publicEconomyState(player),
		}
	end

	profile.Coins -= config.Price
	profile.Owned[itemId] = true
	syncEconomyPasses(player, profile)
	task.spawn(saveEconomy, player)
	notifyEconomy(player)
	return {ok = true, purchased = itemId, state = publicEconomyState(player)}
end

local function getHumanoid(player)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid:IsA("Humanoid") then
		return humanoid
	end
	return nil
end

local function reapplyModelScale(player)
	local character = player.Character
	if not character then
		return
	end
	local scale = tonumber(player:GetAttribute("StarBloxAvatarScale")) or 1
	pcall(function()
		character:ScaleTo(scale)
	end)
end

local function applyDescription(player, description)
	local humanoid = getHumanoid(player)
	if not humanoid then
		description:Destroy()
		return {ok = false, code = "character_unavailable"}
	end
	local ok, reason = pcall(function()
		humanoid:ApplyDescriptionReset(description)
	end)
	description:Destroy()
	if not ok then
		return {ok = false, code = "avatar_apply_failed", reason = tostring(reason)}
	end
	task.defer(reapplyModelScale, player)
	return {ok = true}
end

local function currentDescription(player)
	local humanoid = getHumanoid(player)
	if not humanoid then
		return nil
	end
	local ok, description = pcall(function()
		return humanoid:GetAppliedDescription()
	end)
	if ok then
		return description
	end
	return nil
end

avatarAction.OnServerInvoke = function(player, action, payload)
	if action == "ApplyOutfit" then
		if type(payload) ~= "string" then
			return {ok = false, code = "invalid_outfit"}
		end
		local outfit = OUTFITS[payload]
		if not outfit then
			return {ok = false, code = "unknown_outfit"}
		end
		local profile = loadEconomy(player)
		if outfit.Premium == true and profile.Owned.Premium ~= true then
			return {ok = false, code = "premium_required"}
		end
		local description = currentDescription(player)
		if not description then
			return {ok = false, code = "avatar_unavailable"}
		end
		description.Shirt = outfit.Shirt
		description.Pants = outfit.Pants
		local result = applyDescription(player, description)
		result.outfit = payload
		return result
	elseif action == "SetScale" then
		local target = tonumber(payload)
		if target == nil then
			return {ok = false, code = "invalid_scale"}
		end
		target = math.clamp(target, 0.75, 1.25)
		target = math.floor((target * 20) + 0.5) / 20
		local character = player.Character
		if not character then
			return {ok = false, code = "character_unavailable"}
		end
		local ok, reason = pcall(function()
			character:ScaleTo(target)
		end)
		if not ok then
			return {ok = false, code = "scale_failed", reason = tostring(reason)}
		end
		player:SetAttribute("StarBloxAvatarScale", target)
		return {ok = true, scale = target}
	elseif action == "SetSkinTone" then
		local index = tonumber(payload)
		if index == nil then
			return {ok = false, code = "invalid_skin_tone"}
		end
		index = math.clamp(math.floor(index), 1, #SKIN_TONES)
		local color = SKIN_TONES[index]
		local description = currentDescription(player)
		if not description then
			return {ok = false, code = "avatar_unavailable"}
		end
		description.HeadColor = color
		description.LeftArmColor = color
		description.RightArmColor = color
		description.LeftLegColor = color
		description.RightLegColor = color
		description.TorsoColor = color
		local result = applyDescription(player, description)
		result.skinTone = index
		return result
	elseif action == "ResetFace" then
		local ok, original = pcall(function()
			return Players:GetHumanoidDescriptionFromUserId(player.UserId)
		end)
		if not ok or not original then
			return {ok = false, code = "avatar_unavailable"}
		end
		local description = currentDescription(player)
		if not description then
			original:Destroy()
			return {ok = false, code = "avatar_unavailable"}
		end
		description.Face = original.Face
		original:Destroy()
		return applyDescription(player, description)
	elseif action == "RevertOriginal" then
		local ok, description = pcall(function()
			return Players:GetHumanoidDescriptionFromUserId(player.UserId)
		end)
		if not ok or not description then
			return {ok = false, code = "avatar_unavailable"}
		end
		player:SetAttribute("StarBloxAvatarScale", 1)
		local result = applyDescription(player, description)
		task.defer(function()
			local character = player.Character
			if character then
				pcall(function()
					character:ScaleTo(1)
				end)
			end
		end)
		result.scale = 1
		return result
	end
	return {ok = false, code = "unknown_avatar_action"}
end

Players.PlayerAdded:Connect(function(player)
	task.spawn(loadEconomy, player)
end)

for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(loadEconomy, player)
end

Players.PlayerRemoving:Connect(function(player)
	saveEconomy(player)
	economyProfiles[player] = nil
end)

game:BindToClose(function()
	for player in pairs(economyProfiles) do
		saveEconomy(player)
	end
end)

print("STARBLOX_LEARNING_ECONOMY_READY starter=100 answerReward=10 classReward=25")
