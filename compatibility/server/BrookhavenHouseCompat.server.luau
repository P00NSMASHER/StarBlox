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


-- ---------------------------------------------------------------------------
-- StarBlox learning economy + functional avatar editor/shop compatibility.
-- This is deliberately layered onto the untouched Brookhaven world/UI.
-- ---------------------------------------------------------------------------

local EconomyDataStoreService = game:GetService("DataStoreService")
local economyStore = EconomyDataStoreService:GetDataStore("StarBloxLearningEconomy_v1")

local economyRoot = ReplicatedStorage:FindFirstChild("StarBloxLearningEconomy")
if economyRoot then
	economyRoot:Destroy()
end
economyRoot = Instance.new("Folder")
economyRoot.Name = "StarBloxLearningEconomy"
economyRoot.Parent = ReplicatedStorage

local function makeRemoteFunction(name)
	local remote = Instance.new("RemoteFunction")
	remote.Name = name
	remote.Parent = economyRoot
	return remote
end

local getEconomyState = makeRemoteFunction("GetState")
local purchasePack = makeRemoteFunction("PurchasePack")
local avatarAction = makeRemoteFunction("AvatarAction")
local getPracticeQuestion = makeRemoteFunction("GetPracticeQuestion")
local submitPracticeAnswer = makeRemoteFunction("SubmitPracticeAnswer")

local economyChanged = Instance.new("RemoteEvent")
economyChanged.Name = "StateChanged"
economyChanged.Parent = economyRoot

local learningReward = ServerStorage:FindFirstChild("StarBloxLearningReward")
if learningReward then
	learningReward:Destroy()
end
learningReward = Instance.new("BindableEvent")
learningReward.Name = "StarBloxLearningReward"
learningReward.Parent = ServerStorage

local PACKS = {
	fashion = {
		Name = "Fashion Pack",
		Price = 60,
		Outfits = {"WorkerPink", "WorkerWhite", "BlackSuit", "Maid", "CowGirl"},
	},
	rescue = {
		Name = "Rescue & City Pack",
		Price = 70,
		Outfits = {"Chief", "FireRed", "FireYellow", "PoliceDarkBlue", "Ems", "FBI"},
	},
	roleplay = {
		Name = "Roleplay Pack",
		Price = 60,
		Outfits = {"CowBoy", "Criminal", "Criminal2", "Prisoner", "Homeless"},
	},
	holiday = {
		Name = "Holiday Pack",
		Price = 80,
		Outfits = {"SantaRed", "Elf", "SantaBlack"},
	},
	premium = {
		Name = "Premium House Pack",
		Price = 180,
		Outfits = {},
		Passes = {SilverPass = true},
	},
	music = {
		Name = "Music Pack",
		Price = 80,
		Outfits = {},
		Passes = {MusicPass = true},
	},
	fire = {
		Name = "House Effects Pack",
		Price = 100,
		Outfits = {},
		Passes = {FirePass = true},
	},
	horse = {
		Name = "Horse Style Pack",
		Price = 100,
		Outfits = {},
		Passes = {HorsePass = true},
	},
	vehicle = {
		Name = "Vehicle Upgrade",
		Price = 120,
		Outfits = {},
		Passes = {ColorSpeedPassLower = true},
		Numbers = {VehicleSpeed = 70, SpeedPassNoMotorVehicle = 35},
	},
	speed = {
		Name = "200 MPH Speed",
		Price = 160,
		Outfits = {},
		Passes = {SpeedPass200 = true},
		Numbers = {VehicleSpeed = 200},
	},
}

local FREE_OUTFITS = {
	PoliceLightBlue = true,
	DoctorBlue = true,
	Lifeguard = true,
	Dancer = true,
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
	Dancer = {Shirt = 229505432, Pants = 5846266654},
	Homeless = {Shirt = 229505432, Pants = 5846263819},
	BlackSuit = {Shirt = 5994831990, Pants = 5994836799},
	Maid = {Shirt = 229505432, Pants = 5996993717},
	CowBoy = {Shirt = 5996986757, Pants = 5996990103},
	CowGirl = {Shirt = 5997309428, Pants = 5997323809},
	SantaRed = {Shirt = 5994831185, Pants = 5994833583},
	Elf = {Shirt = 5994826937, Pants = 5994833063},
	SantaBlack = {Shirt = 5996808541, Pants = 5996809284},
}

local SKIN_TONES = {
	Color3.fromRGB(255, 219, 172),
	Color3.fromRGB(241, 194, 125),
	Color3.fromRGB(224, 172, 105),
	Color3.fromRGB(198, 134, 66),
	Color3.fromRGB(141, 85, 36),
	Color3.fromRGB(92, 51, 23),
	Color3.fromRGB(255, 204, 188),
	Color3.fromRGB(205, 133, 92),
}

local PRACTICE_QUESTIONS = {
	{id="ela-short-vowel-1", prompt="Which word has the short a sound?", choices={"cat","cake","rain"}, answer="cat", hint="Think about the sound in apple."},
	{id="ela-plural-1", prompt="Which plural is correct for box?", choices={"boxs","boxes","boxies"}, answer="boxes", hint="Words ending in x usually add -es."},
	{id="ela-sentence-1", prompt="Which is a complete sentence?", choices={"The dog ran.","Running fast.","In the yard."}, answer="The dog ran.", hint="A complete sentence tells who or what and what happened."},
	{id="math-add-1", prompt="What is 27 + 15?", choices={"32","42","52"}, answer="42", hint="Add the ones, then the tens."},
	{id="math-sub-1", prompt="What is 54 - 18?", choices={"36","44","46"}, answer="36", hint="Regroup one ten if you need to."},
	{id="math-place-1", prompt="In 347, what digit is in the tens place?", choices={"3","4","7"}, answer="4", hint="Hundreds, tens, ones."},
	{id="math-time-1", prompt="30 minutes after 2:15 is...", choices={"2:35","2:45","3:15"}, answer="2:45", hint="Add half an hour."},
	{id="math-fraction-1", prompt="One out of two equal parts is...", choices={"one half","one third","one fourth"}, answer="one half", hint="The bottom number tells the total equal parts."},
	{id="ela-meaning-1", prompt="If Mia was exhausted, she was...", choices={"very tired","very loud","very hungry"}, answer="very tired", hint="Use the meaning of the word in context."},
	{id="math-money-1", prompt="Two quarters are worth...", choices={"25 cents","50 cents","75 cents"}, answer="50 cents", hint="Each quarter is 25 cents."},
	{id="ela-verb-1", prompt="Which word is the action word: Birds sing loudly.", choices={"Birds","sing","loudly"}, answer="sing", hint="What are the birds doing?"},
	{id="math-pattern-1", prompt="What comes next: 5, 10, 15, 20, ...", choices={"21","25","30"}, answer="25", hint="The pattern adds the same amount each time."},
}

local economyStates = {}
local economyLoaded = {}

local function todayKey()
	return os.date("!%Y-%m-%d")
end

local function newEconomyState()
	return {
		Coins = 50,
		OwnedPacks = {},
		SelectedOutfit = nil,
		Scale = 1,
		SkinTone = nil,
		PracticeDay = todayKey(),
		CompletedPractice = {},
		CurrentPractice = nil,
	}
end

local function sanitizeEconomy(raw)
	local state = newEconomyState()
	if type(raw) ~= "table" then
		return state
	end
	state.Coins = math.clamp(math.floor(tonumber(raw.Coins) or state.Coins), 0, 1000000)
	if type(raw.OwnedPacks) == "table" then
		for id, owned in pairs(raw.OwnedPacks) do
			if PACKS[id] and owned == true then
				state.OwnedPacks[id] = true
			end
		end
	end
	if type(raw.SelectedOutfit) == "string" and OUTFITS[raw.SelectedOutfit] then
		state.SelectedOutfit = raw.SelectedOutfit
	end
	state.Scale = math.clamp(tonumber(raw.Scale) or 1, 0.75, 1.25)
	local tone = tonumber(raw.SkinTone)
	if tone and SKIN_TONES[tone] then
		state.SkinTone = tone
	end
	state.PracticeDay = type(raw.PracticeDay) == "string" and raw.PracticeDay or todayKey()
	if state.PracticeDay == todayKey() and type(raw.CompletedPractice) == "table" then
		for id, done in pairs(raw.CompletedPractice) do
			if done == true then
				state.CompletedPractice[id] = true
			end
		end
	else
		state.PracticeDay = todayKey()
		state.CompletedPractice = {}
	end
	return state
end

local function stateKey(player)
	return "u_" .. tostring(player.UserId)
end

local function loadEconomy(player)
	if economyLoaded[player] then
		return economyStates[player]
	end
	local raw = nil
	pcall(function()
		raw = economyStore:GetAsync(stateKey(player))
	end)
	local state = sanitizeEconomy(raw)
	economyStates[player] = state
	economyLoaded[player] = true
	player:SetAttribute("StarCoins", state.Coins)
	return state
end

local function saveEconomy(player)
	local state = economyStates[player]
	if not state then return end
	local snapshot = {
		Coins = state.Coins,
		OwnedPacks = state.OwnedPacks,
		SelectedOutfit = state.SelectedOutfit,
		Scale = state.Scale,
		SkinTone = state.SkinTone,
		PracticeDay = state.PracticeDay,
		CompletedPractice = state.CompletedPractice,
	}
	pcall(function()
		economyStore:SetAsync(stateKey(player), snapshot)
	end)
end

local function ownedOutfits(state)
	local result = {}
	for name in pairs(FREE_OUTFITS) do
		result[name] = true
	end
	for packId, owned in pairs(state.OwnedPacks) do
		if owned and PACKS[packId] then
			for _, outfitName in ipairs(PACKS[packId].Outfits) do
				result[outfitName] = true
			end
		end
	end
	return result
end

local function applyLegacyPackFlags(player, state)
	local bag = ensureBag(player)
	for packId, owned in pairs(state.OwnedPacks) do
		local pack = PACKS[packId]
		if owned and pack then
			for name, value in pairs(pack.Passes or {}) do
				local flag = bag:FindFirstChild(name)
				if flag and flag:IsA("BoolValue") then flag.Value = value == true end
			end
			for name, value in pairs(pack.Numbers or {}) do
				local number = bag:FindFirstChild(name)
				if number and number:IsA("NumberValue") then number.Value = tonumber(value) or number.Value end
			end
		end
	end
end

local function publicEconomyState(player)
	local state = loadEconomy(player)
	local packs = {}
	for id, pack in pairs(PACKS) do
		table.insert(packs, {
			Id = id,
			Name = pack.Name,
			Price = pack.Price,
			Owned = state.OwnedPacks[id] == true,
			Outfits = pack.Outfits,
		})
	end
	table.sort(packs, function(a,b) return a.Price < b.Price end)
	return {
		ok = true,
		coins = state.Coins,
		packs = packs,
		ownedOutfits = ownedOutfits(state),
		selectedOutfit = state.SelectedOutfit,
		scale = state.Scale,
		skinTone = state.SkinTone,
		practiceRemaining = #PRACTICE_QUESTIONS,
	}
end

local function emitEconomy(player)
	local state = economyStates[player]
	if not state then return end
	player:SetAttribute("StarCoins", state.Coins)
	economyChanged:FireClient(player, publicEconomyState(player))
end

local function addCoins(player, amount, reason)
	local state = loadEconomy(player)
	local safeAmount = math.clamp(math.floor(tonumber(amount) or 0), 0, 500)
	if safeAmount <= 0 then return 0 end
	state.Coins = math.clamp(state.Coins + safeAmount, 0, 1000000)
	emitEconomy(player)
	return safeAmount
end

learningReward.Event:Connect(function(player, amount, reason)
	if typeof(player) ~= "Instance" or not player:IsA("Player") then return end
	addCoins(player, amount, reason)
end)

local function getHumanoid(player)
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	return humanoid
end

local function getAppliedDescription(player)
	local humanoid = getHumanoid(player)
	if not humanoid then return nil end
	local ok, description = pcall(function()
		return humanoid:GetAppliedDescription()
	end)
	if ok then return description end
	return nil
end

local function applyDescription(player, description)
	local humanoid = getHumanoid(player)
	if not humanoid or not description then
		if description then description:Destroy() end
		return false
	end
	local ok = pcall(function()
		humanoid:ApplyDescriptionReset(description)
	end)
	description:Destroy()
	return ok
end

local function applySavedAvatar(player)
	local state = loadEconomy(player)
	local description = nil
	local ok = pcall(function()
		description = Players:GetHumanoidDescriptionFromUserId(player.UserId)
	end)
	if not ok or not description then return end
	local outfitName = state.SelectedOutfit
	if outfitName and OUTFITS[outfitName] and ownedOutfits(state)[outfitName] then
		description.Shirt = OUTFITS[outfitName].Shirt
		description.Pants = OUTFITS[outfitName].Pants
	end
	local scale = math.clamp(state.Scale, 0.75, 1.25)
	description.HeightScale = scale
	description.WidthScale = math.clamp(0.9 + ((scale - 1) * 0.55), 0.8, 1.05)
	description.DepthScale = math.clamp(0.9 + ((scale - 1) * 0.55), 0.8, 1.05)
	description.HeadScale = math.clamp(1 - ((scale - 1) * 0.25), 0.9, 1.08)
	if state.SkinTone and SKIN_TONES[state.SkinTone] then
		local color = SKIN_TONES[state.SkinTone]
		description.HeadColor = color
		description.LeftArmColor = color
		description.RightArmColor = color
		description.LeftLegColor = color
		description.RightLegColor = color
		description.TorsoColor = color
	end
	applyDescription(player, description)
end

getEconomyState.OnServerInvoke = function(player)
	return publicEconomyState(player)
end

purchasePack.OnServerInvoke = function(player, packId)
	if type(packId) ~= "string" or not PACKS[packId] then
		return {ok=false, code="unknown_pack"}
	end
	local state = loadEconomy(player)
	if state.OwnedPacks[packId] then
		return publicEconomyState(player)
	end
	local price = PACKS[packId].Price
	if state.Coins < price then
		return {ok=false, code="not_enough_coins", coins=state.Coins, needed=price}
	end
	state.Coins -= price
	state.OwnedPacks[packId] = true
	applyLegacyPackFlags(player, state)
	emitEconomy(player)
	task.spawn(saveEconomy, player)
	local result = publicEconomyState(player)
	result.purchased = packId
	return result
end

avatarAction.OnServerInvoke = function(player, action, value)
	local state = loadEconomy(player)
	if action == "ApplyOutfit" then
		if type(value) ~= "string" or not OUTFITS[value] then
			return {ok=false, code="unknown_outfit"}
		end
		if not ownedOutfits(state)[value] then
			return {ok=false, code="locked", outfit=value}
		end
		local description = getAppliedDescription(player)
		if not description then return {ok=false, code="avatar_unavailable"} end
		description.Shirt = OUTFITS[value].Shirt
		description.Pants = OUTFITS[value].Pants
		if not applyDescription(player, description) then
			return {ok=false, code="avatar_apply_failed"}
		end
		state.SelectedOutfit = value
		task.spawn(saveEconomy, player)
		return {ok=true, outfit=value}
	elseif action == "Scale" then
		local delta = math.clamp(tonumber(value) or 0, -0.15, 0.15)
		state.Scale = math.clamp(state.Scale + delta, 0.75, 1.25)
		local description = getAppliedDescription(player)
		if not description then return {ok=false, code="avatar_unavailable"} end
		description.HeightScale = state.Scale
		description.WidthScale = math.clamp(0.9 + ((state.Scale - 1) * 0.55), 0.8, 1.05)
		description.DepthScale = math.clamp(0.9 + ((state.Scale - 1) * 0.55), 0.8, 1.05)
		description.HeadScale = math.clamp(1 - ((state.Scale - 1) * 0.25), 0.9, 1.08)
		if not applyDescription(player, description) then
			return {ok=false, code="avatar_apply_failed"}
		end
		task.spawn(saveEconomy, player)
		return {ok=true, scale=state.Scale}
	elseif action == "SkinTone" then
		local index = math.floor(tonumber(value) or 0)
		local color = SKIN_TONES[index]
		if not color then return {ok=false, code="invalid_skin_tone"} end
		local description = getAppliedDescription(player)
		if not description then return {ok=false, code="avatar_unavailable"} end
		description.HeadColor = color
		description.LeftArmColor = color
		description.RightArmColor = color
		description.LeftLegColor = color
		description.RightLegColor = color
		description.TorsoColor = color
		if not applyDescription(player, description) then
			return {ok=false, code="avatar_apply_failed"}
		end
		state.SkinTone = index
		task.spawn(saveEconomy, player)
		return {ok=true, skinTone=index}
	elseif action == "Reset" then
		local description = nil
		local ok = pcall(function()
			description = Players:GetHumanoidDescriptionFromUserId(player.UserId)
		end)
		if not ok or not description then return {ok=false, code="avatar_unavailable"} end
		if not applyDescription(player, description) then return {ok=false, code="avatar_apply_failed"} end
		state.SelectedOutfit = nil
		state.Scale = 1
		state.SkinTone = nil
		task.spawn(saveEconomy, player)
		return {ok=true, reset=true}
	end
	return {ok=false, code="unknown_action"}
end

local function ensurePracticeDay(state)
	if state.PracticeDay ~= todayKey() then
		state.PracticeDay = todayKey()
		state.CompletedPractice = {}
		state.CurrentPractice = nil
	end
end

getPracticeQuestion.OnServerInvoke = function(player)
	local state = loadEconomy(player)
	ensurePracticeDay(state)
	for _, question in ipairs(PRACTICE_QUESTIONS) do
		if state.CompletedPractice[question.id] ~= true then
			state.CurrentPractice = question.id
			return {
				ok=true,
				id=question.id,
				prompt=question.prompt,
				choices=question.choices,
				remaining=#PRACTICE_QUESTIONS,
			}
		end
	end
	state.CurrentPractice = nil
	return {ok=true, done=true, message="All practice rewards earned for today."}
end

submitPracticeAnswer.OnServerInvoke = function(player, questionId, choice)
	local state = loadEconomy(player)
	ensurePracticeDay(state)
	if type(questionId) ~= "string" or state.CurrentPractice ~= questionId then
		return {ok=false, code="stale_question"}
	end
	local found = nil
	for _, question in ipairs(PRACTICE_QUESTIONS) do
		if question.id == questionId then found = question break end
	end
	if not found or state.CompletedPractice[questionId] then
		return {ok=false, code="already_answered"}
	end
	local correct = tostring(choice) == found.answer
	local reward = correct and 10 or 3
	state.CompletedPractice[questionId] = true
	state.CurrentPractice = nil
	addCoins(player, reward, correct and "practice_correct" or "practice_attempt")
	task.spawn(saveEconomy, player)
	return {
		ok=true,
		correct=correct,
		reward=reward,
		coins=state.Coins,
		hint=correct and "Nice work!" or ("Answer: "..found.answer..". "..found.hint),
	}
end

local function setupEconomyPlayer(player)
	local state = loadEconomy(player)
	applyLegacyPackFlags(player, state)
	player.CharacterAdded:Connect(function()
		task.delay(1.25, function()
			if player.Parent then applySavedAvatar(player) end
		end)
	end)
	if player.Character then
		task.delay(1.25, function()
			if player.Parent then applySavedAvatar(player) end
		end)
	end
end

Players.PlayerAdded:Connect(setupEconomyPlayer)
Players.PlayerRemoving:Connect(function(player)
	saveEconomy(player)
	economyStates[player] = nil
	economyLoaded[player] = nil
end)
for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(setupEconomyPlayer, player)
end

game:BindToClose(function()
	for _, player in ipairs(Players:GetPlayers()) do
		saveEconomy(player)
	end
end)

print("STARBLOX_LEARNING_ECONOMY_READY packs=10 outfits=23 questions="..tostring(#PRACTICE_QUESTIONS))
