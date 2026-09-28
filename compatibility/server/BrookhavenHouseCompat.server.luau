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
-- Native Brookhaven runtime restoration.
--
-- The pinned place still contains Brookhaven's original client controllers and UI,
-- but nearly all original server Script source is absent. These handlers restore
-- the server contract those native clients already call. No replacement shop or
-- avatar UI is created here.
-- ---------------------------------------------------------------------------

local MarketplaceService = game:GetService("MarketplaceService")
local ServerStorageService = game:GetService("ServerStorage")

local clothesRemote = remotes:WaitForChild("Clothes")
local updateAvatarRemote = remotes:WaitForChild("UpdateAvatar")
local resetAvatarRemote = remotes:WaitForChild("AvatarOriginalCharacterClient")
local passRemote = remotes:WaitForChild("Pass")
local carRemote = remotes:WaitForChild("Car")
local playersCarRemote = remotes:WaitForChild("PlayersCar")
local keyFabRemote = remotes:WaitForChild("KeyFab")
local toolsRemote = remotes:WaitForChild("Tools")
local clearToolsRemote = remotes:WaitForChild("ClearTools")
local noMotorRemote = remotes:WaitForChild("NoMotorVehicles")

local function getHumanoid(player)
	local character = player.Character
	return character and character:FindFirstChildOfClass("Humanoid") or nil
end

local function getDescription(player)
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

local function applyDescription(player, description)
	local humanoid = getHumanoid(player)
	if not humanoid or not description then
		if description then
			description:Destroy()
		end
		return false
	end
	local ok = pcall(function()
		humanoid:ApplyDescriptionReset(description)
	end)
	description:Destroy()
	return ok
end

local fallbackSkinTones = {
	Alder = Color3.fromRGB(180, 128, 255),
	Black = Color3.fromRGB(27, 42, 53),
	Brown = Color3.fromRGB(124, 92, 70),
	["Pastel light blue"] = Color3.fromRGB(128, 187, 219),
	Flint = Color3.fromRGB(105, 102, 92),
	["Deep orange"] = Color3.fromRGB(255, 176, 0),
	["Forest green"] = Color3.fromRGB(31, 128, 29),
	["Hot pink"] = Color3.fromRGB(255, 0, 191),
	["Institutional white"] = Color3.fromRGB(248, 248, 248),
	["Light orange"] = Color3.fromRGB(234, 184, 146),
	["Lime green"] = Color3.fromRGB(0, 255, 0),
	Magenta = Color3.fromRGB(170, 0, 170),
	["Medium stone grey"] = Color3.fromRGB(163, 162, 165),
	["Navy blue"] = Color3.fromRGB(0, 32, 96),
	["New Yeller"] = Color3.fromRGB(255, 255, 0),
	["Really black"] = Color3.fromRGB(17, 17, 17),
	["Really blue"] = Color3.fromRGB(0, 0, 255),
	["Really red"] = Color3.fromRGB(255, 0, 0),
	["Royal purple"] = Color3.fromRGB(98, 37, 209),
	Toothpaste = Color3.fromRGB(0, 255, 255),
}
local skinTones = fallbackSkinTones
pcall(function()
	local avatarScripts = ReplicatedStorage:WaitForChild("AvatarEditorScipts")
	local skinModule = avatarScripts:WaitForChild("Catalog"):WaitForChild("Appearance"):WaitForChild("SkinTone")
	local loaded = require(skinModule)
	if type(loaded) == "table" then
		skinTones = loaded
	end
end)

local function setBodyColor(description, color)
	description.HeadColor = color
	description.LeftArmColor = color
	description.RightArmColor = color
	description.LeftLegColor = color
	description.RightLegColor = color
	description.TorsoColor = color
end

local function applyNativeAvatarMutation(description, action, a, b)
	if not description then
		return {ok = false, code = "description_missing"}
	end
	if action == "outfit" then
		local shirt = tonumber(a)
		local pants = tonumber(b)
		if not shirt or not pants then
			return {ok = false, code = "invalid_outfit"}
		end
		description.Shirt = shirt
		description.Pants = pants
		return {ok = true, action = action, shirt = shirt, pants = pants}
	elseif action == "scale" then
		local scale = math.clamp(tonumber(a) or 1, 0.5, 1)
		description.HeightScale = scale
		description.WidthScale = math.clamp(0.85 + (scale - 0.5) * 0.3, 0.85, 1)
		description.DepthScale = math.clamp(0.85 + (scale - 0.5) * 0.3, 0.85, 1)
		description.HeadScale = math.clamp(0.9 + (scale - 0.5) * 0.2, 0.9, 1)
		return {ok = true, action = action, scale = scale}
	elseif action == "skintone" then
		local color = skinTones[tostring(a)]
		if typeof(color) ~= "Color3" then
			return {ok = false, code = "unknown_skin_tone"}
		end
		setBodyColor(description, color)
		return {ok = true, action = action, skinTone = tostring(a)}
	end
	return {ok = false, code = "unknown_avatar_action"}
end

local function enumAssetTypeValue(name)
	local item = nil
	pcall(function()
		item = Enum.AssetType[name]
	end)
	return item and item.Value or nil
end

local accessoryFieldByType = {}
for _, row in ipairs({
	{"Hat", "HatAccessory"},
	{"HairAccessory", "HairAccessory"},
	{"FaceAccessory", "FaceAccessory"},
	{"NeckAccessory", "NeckAccessory"},
	{"ShoulderAccessory", "ShouldersAccessory"},
	{"FrontAccessory", "FrontAccessory"},
	{"BackAccessory", "BackAccessory"},
	{"WaistAccessory", "WaistAccessory"},
}) do
	local value = enumAssetTypeValue(row[1])
	if value then
		accessoryFieldByType[value] = row[2]
	end
end

local singleFieldByType = {}
for _, row in ipairs({
	{"TShirt", "GraphicTShirt"},
	{"Shirt", "Shirt"},
	{"Pants", "Pants"},
	{"Face", "Face"},
	{"Head", "Head"},
	{"Torso", "Torso"},
	{"LeftArm", "LeftArm"},
	{"RightArm", "RightArm"},
	{"LeftLeg", "LeftLeg"},
	{"RightLeg", "RightLeg"},
}) do
	local value = enumAssetTypeValue(row[1])
	if value then
		singleFieldByType[value] = row[2]
	end
end

local function csvContains(text, id)
	local wanted = tostring(id)
	for token in string.gmatch(tostring(text or ""), "[^,%s]+") do
		if token == wanted then
			return true
		end
	end
	return false
end

local function toggleCsv(text, id)
	local wanted = tostring(id)
	local values = {}
	local present = false
	for token in string.gmatch(tostring(text or ""), "[^,%s]+") do
		if token == wanted then
			present = true
		else
			table.insert(values, token)
		end
	end
	if not present then
		table.insert(values, wanted)
	end
	return table.concat(values, ","), not present
end

local appearanceAssets = {}

local function seedAppearance(player)
	local state = {}
	local ok, info = pcall(function()
		return Players:GetCharacterAppearanceInfoAsync(player.UserId)
	end)
	if ok and type(info) == "table" then
		for _, asset in ipairs(info.assets or {}) do
			local id = tonumber(asset.id)
			if id then
				state[id] = asset
			end
		end
	end
	appearanceAssets[player] = state
	return state
end

local function pushAppearance(player)
	local state = appearanceAssets[player] or seedAppearance(player)
	local assets = {}
	for _, asset in pairs(state) do
		table.insert(assets, asset)
	end
	updateAvatarRemote:FireClient(player, {assets = assets})
end

local function toggleAvatarAsset(player, assetId)
	assetId = math.floor(tonumber(assetId) or 0)
	if assetId <= 0 then
		return {ok = false, code = "invalid_asset"}
	end
	local okInfo, info = pcall(function()
		return MarketplaceService:GetProductInfo(assetId, Enum.InfoType.Asset)
	end)
	if not okInfo or type(info) ~= "table" then
		return {ok = false, code = "asset_info_failed"}
	end
	local assetTypeId = tonumber(info.AssetTypeId)
	local description = getDescription(player)
	if not description then
		return {ok = false, code = "avatar_unavailable"}
	end

	local enabled = true
	local field = accessoryFieldByType[assetTypeId]
	if field then
		local current = ""
		pcall(function()
			current = description[field]
		end)
		local nextValue
		nextValue, enabled = toggleCsv(current, assetId)
		local okSet = pcall(function()
			description[field] = nextValue
		end)
		if not okSet then
			description:Destroy()
			return {ok = false, code = "asset_apply_failed"}
		end
	else
		field = singleFieldByType[assetTypeId]
		if not field then
			description:Destroy()
			return {ok = false, code = "unsupported_asset_type", assetTypeId = assetTypeId}
		end
		local current = 0
		pcall(function()
			current = tonumber(description[field]) or 0
		end)
		enabled = current ~= assetId
		local okSet = pcall(function()
			description[field] = enabled and assetId or 0
		end)
		if not okSet then
			description:Destroy()
			return {ok = false, code = "asset_apply_failed"}
		end
	end

	if not applyDescription(player, description) then
		return {ok = false, code = "avatar_apply_failed"}
	end
	local state = appearanceAssets[player] or seedAppearance(player)
	if enabled then
		state[assetId] = {id = assetId, name = tostring(info.Name or assetId)}
	else
		state[assetId] = nil
	end
	pushAppearance(player)
	return {ok = true, action = "wear", assetId = assetId, enabled = enabled}
end

clothesRemote.OnServerEvent:Connect(function(player, action, a, b)
	local description = getDescription(player)
	if not description then
		return
	end
	local result
	if action == "outfit" then
		result = applyNativeAvatarMutation(description, "outfit", a, b)
	elseif action == "CharacterSizeUp" or action == "CharacterSizeDown" then
		result = applyNativeAvatarMutation(description, "scale", a)
	else
		description:Destroy()
		return
	end
	if result.ok then
		applyDescription(player, description)
	else
		description:Destroy()
	end
end)

updateAvatarRemote.OnServerEvent:Connect(function(player, action, value)
	if action == "wear" or action == "wearPremium" then
		toggleAvatarAsset(player, value)
	elseif action == "skintone" then
		local description = getDescription(player)
		if not description then
			return
		end
		local result = applyNativeAvatarMutation(description, "skintone", value)
		if result.ok then
			applyDescription(player, description)
		else
			description:Destroy()
		end
	end
end)

resetAvatarRemote.OnServerEvent:Connect(function(player)
	local description = nil
	local ok = pcall(function()
		description = Players:GetHumanoidDescriptionFromUserId(player.UserId)
	end)
	if ok and description and applyDescription(player, description) then
		seedAppearance(player)
		pushAppearance(player)
	end
end)

local PASS_ACTIONS = {
	BoughtMusic = {flag = "MusicPass"},
	BoughtPremium = {flag = "SilverPass"},
	BoughtColorSpeedLower = {flag = "ColorSpeedPassLower", vehicleSpeed = 70, noMotorSpeed = 35},
	BoughtSpeed200 = {flag = "SpeedPass200", vehicleSpeed = 200, noMotorSpeed = 45},
	BoughtHorse = {flag = "HorsePass"},
	BoughtFire = {flag = "FirePass"},
}

local function applyPassActionToBag(bag, action)
	local def = PASS_ACTIONS[action]
	if not def then
		return {ok = false, code = "unknown_pass_action"}
	end
	ensureValue(bag, "BoolValue", def.flag, false).Value = true
	if def.vehicleSpeed then
		ensureValue(bag, "NumberValue", "VehicleSpeed", 55).Value = def.vehicleSpeed
	end
	if def.noMotorSpeed then
		ensureValue(bag, "NumberValue", "SpeedPassNoMotorVehicle", 25).Value = def.noMotorSpeed
	end
	return {ok = true, action = action, flag = def.flag}
end

passRemote.OnServerEvent:Connect(function(player, action)
	local bag = ensureBag(player)
	applyPassActionToBag(bag, tostring(action))
end)

local carBackup = ReplicatedStorage:WaitForChild("003_CarBackup")
local singleVehicles = ReplicatedStorage:FindFirstChild("SingleVehicles")
local liveVehicles = Workspace:FindFirstChild("Vehicles")
if not liveVehicles then
	liveVehicles = Instance.new("Folder")
	liveVehicles.Name = "Vehicles"
	liveVehicles.Parent = Workspace
end

local activeVehicleByPlayer = {}
local activeNoMotorByPlayer = {}
local vehicleSeatConnections = {}
local vehicleLockState = {}
local lastVehicleSpawn = {}

local function disconnectVehicle(model)
	local connections = vehicleSeatConnections[model]
	if connections then
		for _, connection in ipairs(connections) do
			connection:Disconnect()
		end
	end
	vehicleSeatConnections[model] = nil
	vehicleLockState[model] = nil
end

local function removeVehicleModel(model)
	if model then
		disconnectVehicle(model)
		if model.Parent then
			model:Destroy()
		end
	end
end

local function removePlayerVehicle(player)
	removeVehicleModel(activeVehicleByPlayer[player])
	activeVehicleByPlayer[player] = nil
	playersCarRemote:FireClient(player, "CloseCarGUI")
end

local function removeNoMotorVehicle(player)
	removeVehicleModel(activeNoMotorByPlayer[player])
	activeNoMotorByPlayer[player] = nil
end

local function vehicleSpawnCFrame(player)
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if not root or not root:IsA("BasePart") then
		return nil
	end
	local origin = root.CFrame * CFrame.new(0, 2.5, -18)
	local rayOrigin = origin.Position + Vector3.new(0, 20, 0)
	local params = RaycastParams.new()
	params.FilterType = Enum.RaycastFilterType.Exclude
	params.FilterDescendantsInstances = {character, liveVehicles}
	local hit = Workspace:Raycast(rayOrigin, Vector3.new(0, -80, 0), params)
	if hit then
		local y = hit.Position + Vector3.new(0, 2.8, 0)
		return CFrame.lookAt(y, y + root.CFrame.LookVector)
	end
	return origin
end

local function findVehicleTemplate(requestedName, noMotor)
	local storage = noMotor and singleVehicles or carBackup
	if storage then
		local template = storage:FindFirstChild(requestedName)
		if template and template:IsA("Model") then
			return template
		end
	end
	if noMotor then
		local fallback = carBackup:FindFirstChild(requestedName)
		if fallback and fallback:IsA("Model") then
			return fallback
		end
	end
	return nil
end

local function cloneVehicleTemplate(requestedName, noMotor)
	local template = findVehicleTemplate(requestedName, noMotor)
	if not template then
		return {ok = false, code = "vehicle_unavailable", vehicle = requestedName}
	end
	local clone = template:Clone()
	return {ok = true, vehicle = requestedName, model = clone}
end

local function primaryVehicleSeat(model)
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("VehicleSeat") then
			return item
		end
	end
	return nil
end

local function ejectLockedGuests(owner, model)
	if vehicleLockState[model] ~= true then
		return
	end
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("Seat") or item:IsA("VehicleSeat") then
			local occupant = item.Occupant
			if occupant then
				local seatedPlayer = Players:GetPlayerFromCharacter(occupant.Parent)
				if seatedPlayer ~= owner then
					occupant.Sit = false
				end
			end
		end
	end
end

local function bindVehicleSeats(player, model)
	local connections = {}
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("VehicleSeat") then
			table.insert(connections, item:GetPropertyChangedSignal("Occupant"):Connect(function()
				local occupant = item.Occupant
				if not occupant then
					playersCarRemote:FireClient(player, "CloseCarGUI")
					return
				end
				local seatedPlayer = Players:GetPlayerFromCharacter(occupant.Parent)
				if vehicleLockState[model] and seatedPlayer ~= player then
					occupant.Sit = false
					return
				end
				if seatedPlayer == player then
					playersCarRemote:FireClient(player, "OpenCarGUI")
				end
			end))
		end
	end
	vehicleSeatConnections[model] = connections
end

local function normalizeVehicle(player, model, requestedName, noMotor)
	model.Name = noMotor and (player.Name .. "NoMotorVehicle") or (player.Name .. "Car")
	model:SetAttribute("StarBloxVehicleOwnerUserId", player.UserId)
	model:SetAttribute("BrookhavenVehicleType", requestedName)
	model:SetAttribute("BrookhavenNativeRemoteSpawn", true)
	vehicleLockState[model] = false
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("ObjectValue") and (item.Name == "Player" or item.Name == "Owner") then
			pcall(function()
				item.Value = player
			end)
		elseif item:IsA("StringValue") and (item.Name == "PlayerName" or item.Name == "OwnerName") then
			item.Value = player.Name
		elseif item:IsA("BasePart") then
			pcall(function()
				item:SetNetworkOwner(player)
			end)
		end
	end
end

local function spawnVehicle(player, requestedName, noMotor)
	if type(requestedName) ~= "string" or requestedName == "" then
		return {ok = false, code = "invalid_vehicle"}
	end
	local now = os.clock()
	if lastVehicleSpawn[player] and now - lastVehicleSpawn[player] < 0.35 then
		return {ok = false, code = "rate_limited"}
	end
	lastVehicleSpawn[player] = now
	local spawnAt = vehicleSpawnCFrame(player)
	if not spawnAt then
		return {ok = false, code = "character_unavailable"}
	end
	local result = cloneVehicleTemplate(requestedName, noMotor)
	if not result.ok then
		return result
	end
	if noMotor then
		removeNoMotorVehicle(player)
	else
		removePlayerVehicle(player)
	end
	local clone = result.model
	normalizeVehicle(player, clone, requestedName, noMotor)
	clone.Parent = liveVehicles
	local ok, reason = pcall(function()
		clone:PivotTo(spawnAt)
	end)
	if not ok then
		removeVehicleModel(clone)
		return {ok = false, code = "spawn_failed", reason = tostring(reason)}
	end
	bindVehicleSeats(player, clone)
	if noMotor then
		activeNoMotorByPlayer[player] = clone
	else
		activeVehicleByPlayer[player] = clone
	end
	return {
		ok = true,
		vehicle = requestedName,
		modelName = clone.Name,
		hasVehicleSeat = primaryVehicleSeat(clone) ~= nil,
	}
end

local function ownedVehicle(player)
	local model = activeVehicleByPlayer[player]
	if model and model.Parent then
		return model
	end
	return nil
end

local function toggleLights(model)
	local target = nil
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("Light") then
			if target == nil then
				target = not item.Enabled
			end
			item.Enabled = target
		end
	end
end

local function setNamedSounds(model, needle, enabled)
	local lowerNeedle = string.lower(needle)
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("Sound") and string.find(string.lower(item.Name), lowerNeedle, 1, true) then
			if enabled then
				item:Play()
			else
				item:Stop()
			end
		end
	end
end

local function toggleNamedEffects(model, needle)
	local lowerNeedle = string.lower(needle)
	for _, item in ipairs(model:GetDescendants()) do
		local name = string.lower(item.Name)
		if string.find(name, lowerNeedle, 1, true) and (item:IsA("ParticleEmitter") or item:IsA("Fire") or item:IsA("Smoke") or item:IsA("Light")) then
			item.Enabled = not item.Enabled
		end
	end
end

local function flipVehicle(model)
	local pivot = model:GetPivot()
	local look = pivot.LookVector
	local flat = Vector3.new(look.X, 0, look.Z)
	if flat.Magnitude < 0.01 then
		flat = Vector3.new(0, 0, -1)
	else
		flat = flat.Unit
	end
	local position = pivot.Position + Vector3.new(0, 4, 0)
	model:PivotTo(CFrame.lookAt(position, position + flat))
end

local function pickVehicleColor(value)
	if typeof(value) == "Color3" then
		return value
	end
	if typeof(value) == "Instance" then
		local ok, color = pcall(function()
			return value.Color
		end)
		if ok and typeof(color) == "Color3" then
			return color
		end
	end
	return nil
end

local function colorVehicle(model, value)
	local color = pickVehicleColor(value)
	if not color then
		return false
	end
	local changed = false
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("BasePart") then
			local name = string.lower(item.Name)
			if string.find(name, "color", 1, true) or string.find(name, "body", 1, true) or string.find(name, "paint", 1, true) then
				item.Color = color
				changed = true
			end
		end
	end
	return changed
end

local function setVehicleSpeed(model, value)
	local speed = math.clamp(tonumber(value) or 55, 1, 200)
	local changed = false
	for _, item in ipairs(model:GetDescendants()) do
		if item:IsA("VehicleSeat") then
			pcall(function()
				item.MaxSpeed = speed
			end)
			changed = true
		end
	end
	return changed
end

carRemote.OnServerEvent:Connect(function(player, action, requestedName)
	if action == "PickingCar" then
		spawnVehicle(player, requestedName, false)
	elseif action == "NoMotorVehicleDeleteCar" then
		removePlayerVehicle(player)
	end
end)

noMotorRemote.OnServerEvent:Connect(function(player, action)
	if action == "Delete NoMotorVehicle" then
		removeNoMotorVehicle(player)
	elseif type(action) == "string" then
		spawnVehicle(player, action, true)
	end
end)

keyFabRemote.OnServerInvoke = function(player, action)
	if action ~= "LockUnlockVehicles" then
		return false
	end
	local model = ownedVehicle(player)
	if not model then
		return false
	end
	local locked = vehicleLockState[model] ~= true
	vehicleLockState[model] = locked
	model:SetAttribute("Locked", locked)
	ejectLockedGuests(player, model)
	return locked
end

playersCarRemote.OnServerEvent:Connect(function(player, action, value)
	local model = ownedVehicle(player)
	if not model then
		return
	end
	if action == "Horn" then
		setNamedSounds(model, "horn", true)
	elseif action == "HornStop" then
		setNamedSounds(model, "horn", false)
	elseif action == "Lights" then
		toggleLights(model)
	elseif action == "Hazards" then
		toggleNamedEffects(model, "hazard")
	elseif action == "SirenLights" then
		toggleNamedEffects(model, "siren")
	elseif action == "Siren" then
		setNamedSounds(model, "siren", true)
	elseif action == "Flip" then
		flipVehicle(model)
	elseif action == "PickingCarColor" then
		colorVehicle(model, value)
	elseif action == "RegPlayerGiveSpeed" or action == "PlayerGiveSpeedLower" or action == "200PlayerGiveSpeed" then
		setVehicleSpeed(model, value)
	elseif action == "Fire" then
		toggleNamedEffects(model, "fire")
	elseif action == "Smoke" then
		toggleNamedEffects(model, "smoke")
	end
end)

local function findToolTemplate(name)
	for _, item in ipairs(ReplicatedStorage:GetDescendants()) do
		if item:IsA("Tool") and item.Name == name then
			return item
		end
	end
	return nil
end

local function findOwnedTool(player, name)
	local backpack = player:FindFirstChildOfClass("Backpack")
	local character = player.Character
	local tool = backpack and backpack:FindFirstChild(name)
	if tool and tool:IsA("Tool") then
		return tool
	end
	tool = character and character:FindFirstChild(name)
	if tool and tool:IsA("Tool") then
		return tool
	end
	return nil
end

local function createFallbackTool(name)
	local tool = Instance.new("Tool")
	tool.Name = name
	tool.CanBeDropped = false
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = Vector3.new(0.5, 0.5, 1.5)
	handle.CanCollide = false
	handle.Parent = tool
	return tool
end

toolsRemote.OnServerInvoke = function(player, action, toolName)
	if action ~= "PickingTools" or type(toolName) ~= "string" then
		return true
	end
	local existing = findOwnedTool(player, toolName)
	if existing then
		existing:Destroy()
		clearToolsRemote:FireClient(player, "TurnOffGreenCheckMark", toolName)
		return true
	end
	local backpack = player:FindFirstChildOfClass("Backpack")
	if not backpack then
		return true
	end
	local template = findToolTemplate(toolName)
	local tool = template and template:Clone() or createFallbackTool(toolName)
	tool.Parent = backpack
	clearToolsRemote:FireClient(player, "TurnOnGreenCheckMark", toolName)
	return false
end

clearToolsRemote.OnServerEvent:Connect(function(player, action)
	if action ~= "ClearAllTools" then
		return
	end
	local backpack = player:FindFirstChildOfClass("Backpack")
	if backpack then
		for _, item in ipairs(backpack:GetChildren()) do
			if item:IsA("Tool") then
				item:Destroy()
			end
		end
	end
	local character = player.Character
	if character then
		for _, item in ipairs(character:GetChildren()) do
			if item:IsA("Tool") then
				item:Destroy()
			end
		end
	end
	clearToolsRemote:FireClient(player, "AllGreenChecksOff")
end)

local function setupNativePlayer(player)
	ensureBag(player)
	seedAppearance(player)
	player.CharacterAdded:Connect(function()
		task.delay(0.75, function()
			if player.Parent then
				pushAppearance(player)
			end
		end)
	end)
end

Players.PlayerAdded:Connect(setupNativePlayer)
Players.PlayerRemoving:Connect(function(player)
	removePlayerVehicle(player)
	removeNoMotorVehicle(player)
	appearanceAssets[player] = nil
	lastVehicleSpawn[player] = nil
end)
for _, player in ipairs(Players:GetPlayers()) do
	task.spawn(setupNativePlayer, player)
end

-- A server-only behavior probe used by CI/Open Cloud verification. It invokes the
-- same mutation helpers used by the native RemoteEvent handlers and returns their
-- action/result state, rather than proving only that strings or objects exist.
local runtimeTest = ServerStorageService:FindFirstChild("StarBloxNativeRuntimeTest")
if runtimeTest then
	runtimeTest:Destroy()
end
runtimeTest = Instance.new("BindableFunction")
runtimeTest.Name = "StarBloxNativeRuntimeTest"
runtimeTest.Parent = ServerStorageService
runtimeTest.OnInvoke = function(testName)
	if testName == "avatar" then
		local description = Instance.new("HumanoidDescription")
		local outfit = applyNativeAvatarMutation(description, "outfit", 123456, 654321)
		local scale = applyNativeAvatarMutation(description, "scale", 0.75)
		local skin = applyNativeAvatarMutation(description, "skintone", "Really red")
		local ok = outfit.ok and scale.ok and skin.ok and description.Shirt == 123456 and description.Pants == 654321 and math.abs(description.HeightScale - 0.75) < 0.001 and description.HeadColor == Color3.fromRGB(255, 0, 0)
		description:Destroy()
		return {ok = ok, outfit = outfit, scale = scale, skin = skin}
	elseif testName == "shop" then
		local bag = bagTemplate:Clone()
		local music = applyPassActionToBag(bag, "BoughtMusic")
		local speed = applyPassActionToBag(bag, "BoughtSpeed200")
		local ok = music.ok and speed.ok and bag.MusicPass.Value == true and bag.SpeedPass200.Value == true and bag.VehicleSpeed.Value == 200 and bag.SpeedPassNoMotorVehicle.Value == 45
		bag:Destroy()
		return {ok = ok, music = music, speed = speed}
	elseif testName == "vehicle" then
		local children = carBackup:GetChildren()
		table.sort(children, function(a, b)
			return a.Name < b.Name
		end)
		local template = children[1]
		if not template then
			return {ok = false, code = "no_vehicle_templates"}
		end
		local result = cloneVehicleTemplate(template.Name, false)
		if not result.ok then
			return result
		end
		local model = result.model
		model.Parent = hidden
		local seat = primaryVehicleSeat(model)
		local pivotOk = pcall(function()
			model:PivotTo(CFrame.new(0, -10000, 0))
		end)
		local descendantCount = #model:GetDescendants()
		local modelName = model.Name
		model:Destroy()
		return {
			ok = pivotOk and descendantCount > 0,
			vehicle = template.Name,
			modelName = modelName,
			hasVehicleSeat = seat ~= nil,
			descendants = descendantCount,
		}
	elseif testName == "contracts" then
		return {
			ok = clothesRemote:IsA("RemoteEvent") and updateAvatarRemote:IsA("RemoteEvent") and passRemote:IsA("RemoteEvent") and carRemote:IsA("RemoteEvent") and keyFabRemote:IsA("RemoteFunction") and toolsRemote:IsA("RemoteFunction"),
			clothes = clothesRemote.ClassName,
			updateAvatar = updateAvatarRemote.ClassName,
			pass = passRemote.ClassName,
			car = carRemote.ClassName,
			keyFab = keyFabRemote.ClassName,
			tools = toolsRemote.ClassName,
		}
	end
	return {ok = false, code = "unknown_test"}
end

print("STARBLOX_NATIVE_BROOKHAVEN_RUNTIME_READY avatar=1 shop=1 vehicles=1 tools=1")
