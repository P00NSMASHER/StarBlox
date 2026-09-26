--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local StoreCatalog = require(ReplicatedStorage.StarBlox.StoreCatalog)

local HomeEconomyService = {}
HomeEconomyService.__index = HomeEconomyService

local REMOTE_ROOT_NAME = "StarBloxShop"
local HOME_FOLDER_NAME = "StarBloxPlayerHomes"
local HOME_HEIGHT = 420
local HOME_SPACING = 56

local ITEM_BY_ID = {}
for _, item in StoreCatalog.Items do
	ITEM_BY_ID[item.Id] = item
end

local HOME_BY_TIER = {}
for _, home in StoreCatalog.Homes do
	HOME_BY_TIER[home.Tier] = home
end

local function ensureInventory(profileData)
	profileData.Inventory = profileData.Inventory or {}
	profileData.Inventory.OwnedItems =
		type(profileData.Inventory.OwnedItems) == "table"
		and profileData.Inventory.OwnedItems
		or {}
	return profileData.Inventory.OwnedItems
end

local function ensureHome(profileData)
	profileData.Social = profileData.Social or {}
	profileData.Social.Home = profileData.Social.Home or {
		PlotId = "",
		Tier = 1,
		Placements = {},
	}
	local home = profileData.Social.Home
	home.Tier = math.clamp(math.floor(tonumber(home.Tier) or 1), 1, 5)
	home.Placements = type(home.Placements) == "table" and home.Placements or {}
	return home
end

local function part(
	parent: Instance,
	name: string,
	size: Vector3,
	cframe: CFrame,
	color: Color3,
	transparency: number?
): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cframe
	p.Color = color
	p.Material = Enum.Material.SmoothPlastic
	p.Anchored = true
	p.CanCollide = true
	p.CanTouch = true
	p.CanQuery = true
	p.Transparency = transparency or 0
	p.Parent = parent
	return p
end

local function addBed(parent: Instance, base: CFrame)
	part(parent, "BedFrame", Vector3.new(7, 1, 4), base * CFrame.new(-4, 1, -3), Color3.fromRGB(128, 92, 68))
	part(parent, "Mattress", Vector3.new(6.6, 0.8, 3.7), base * CFrame.new(-4, 1.8, -3), Color3.fromRGB(226, 232, 255))
	part(parent, "Pillow", Vector3.new(1.8, 0.45, 3), base * CFrame.new(-6.1, 2.35, -3), Color3.fromRGB(255, 255, 255))
end

local function addDesk(parent: Instance, base: CFrame)
	part(parent, "DeskTop", Vector3.new(5, 0.5, 2.4), base * CFrame.new(4, 2.8, -3), Color3.fromRGB(165, 118, 75))
	for _, x in {-1.9, 1.9} do
		for _, z in {-0.8, 0.8} do
			part(parent, "DeskLeg", Vector3.new(0.35, 2.6, 0.35), base * CFrame.new(4 + x, 1.3, -3 + z), Color3.fromRGB(116, 82, 54))
		end
	end
end

local function addChair(parent: Instance, base: CFrame)
	part(parent, "ChairSeat", Vector3.new(2.2, 0.4, 2.2), base * CFrame.new(2.8, 1.5, 1.6), Color3.fromRGB(116, 166, 237))
	part(parent, "ChairBack", Vector3.new(2.2, 2.2, 0.4), base * CFrame.new(2.8, 2.5, 2.5), Color3.fromRGB(116, 166, 237))
end

local function addLamp(parent: Instance, base: CFrame)
	part(parent, "LampBase", Vector3.new(1.4, 0.3, 1.4), base * CFrame.new(5.8, 0.7, 2), Color3.fromRGB(87, 95, 120))
	part(parent, "LampStem", Vector3.new(0.3, 3.4, 0.3), base * CFrame.new(5.8, 2.5, 2), Color3.fromRGB(87, 95, 120))
	local shade = part(parent, "LampShade", Vector3.new(2.2, 1.4, 2.2), base * CFrame.new(5.8, 4.2, 2), Color3.fromRGB(255, 222, 120))
	shade.CanCollide = false
end

local function addRug(parent: Instance, base: CFrame)
	local rug = part(parent, "StarterMat", Vector3.new(6, 0.15, 4), base * CFrame.new(0, 0.58, 1), Color3.fromRGB(112, 104, 230))
	rug.CanCollide = false
end

local function addPoster(parent: Instance, base: CFrame, depth: number)
	local poster = part(parent, "SchoolStarPoster", Vector3.new(4, 3, 0.18), base * CFrame.new(0, 5, -(depth / 2) + 0.65), Color3.fromRGB(255, 211, 73))
	poster.CanCollide = false
end

local function addBooks(parent: Instance, base: CFrame)
	part(parent, "BookCrate", Vector3.new(3.2, 1.6, 2.4), base * CFrame.new(-5, 1.3, 2.2), Color3.fromRGB(140, 94, 62))
	for index, color in {
		Color3.fromRGB(238, 92, 92),
		Color3.fromRGB(89, 158, 236),
		Color3.fromRGB(91, 191, 121),
	} do
		local book = part(parent, "Book" .. tostring(index), Vector3.new(0.45, 1.5, 1.8), base * CFrame.new(-5.7 + ((index - 1) * 0.7), 2.45, 2.2), color)
		book.CanCollide = false
	end
end

local function renderOwnedItem(parent: Instance, item, base: CFrame, depth: number)
	if item.Kind == "bed" then
		addBed(parent, base)
	elseif item.Kind == "desk" then
		addDesk(parent, base)
	elseif item.Kind == "chair" then
		addChair(parent, base)
	elseif item.Kind == "lamp" then
		addLamp(parent, base)
	elseif item.Kind == "rug" then
		addRug(parent, base)
	elseif item.Kind == "poster" then
		addPoster(parent, base, depth)
	elseif item.Kind == "books" then
		addBooks(parent, base)
	end
end

local function tierDimensions(tier: number): (number, number, number)
	if tier >= 5 then
		return 40, 30, 16
	elseif tier == 4 then
		return 34, 26, 14
	elseif tier == 3 then
		return 29, 23, 13
	elseif tier == 2 then
		return 24, 20, 12
	end
	return 19, 17, 10
end

local function tierColor(tier: number): Color3
	local colors = {
		Color3.fromRGB(226, 232, 242),
		Color3.fromRGB(229, 219, 199),
		Color3.fromRGB(205, 223, 244),
		Color3.fromRGB(194, 216, 229),
		Color3.fromRGB(232, 216, 244),
	}
	return colors[tier] or colors[1]
end

function HomeEconomyService.new(profiles, replicas, spawnCFrame: CFrame)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, HomeEconomyService)
	self._profiles = profiles
	self._replicas = replicas
	self._spawnCFrame = spawnCFrame
	self._slots = {}
	self._nextSlot = 1
	self._lastPurchaseAt = {}

	local previous = Workspace:FindFirstChild(HOME_FOLDER_NAME)
	if previous then
		previous:Destroy()
	end

	local folder = Instance.new("Folder")
	folder.Name = HOME_FOLDER_NAME
	folder:SetAttribute("RuntimeOwned", true)
	folder:SetAttribute("BaselineMutationAllowed", false)
	folder.Parent = Workspace
	self._homeFolder = folder

	local oldRemotes = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if oldRemotes then
		oldRemotes:Destroy()
	end

	local remoteRoot = Instance.new("Folder")
	remoteRoot.Name = REMOTE_ROOT_NAME
	remoteRoot:SetAttribute("CatalogRevision", StoreCatalog.CatalogRevision)
	remoteRoot.Parent = ReplicatedStorage

	local getState = Instance.new("RemoteFunction")
	getState.Name = "GetState"
	getState.Parent = remoteRoot

	local purchaseItem = Instance.new("RemoteFunction")
	purchaseItem.Name = "PurchaseItem"
	purchaseItem.Parent = remoteRoot

	local purchaseHome = Instance.new("RemoteFunction")
	purchaseHome.Name = "PurchaseHomeTier"
	purchaseHome.Parent = remoteRoot

	local visitHome = Instance.new("RemoteFunction")
	visitHome.Name = "VisitHome"
	visitHome.Parent = remoteRoot

	local returnWorld = Instance.new("RemoteFunction")
	returnWorld.Name = "ReturnWorld"
	returnWorld.Parent = remoteRoot

	getState.OnServerInvoke = function(player: Player)
		return self:_state(player)
	end
	purchaseItem.OnServerInvoke = function(player: Player, itemId: any)
		return self:_purchaseItem(player, itemId)
	end
	purchaseHome.OnServerInvoke = function(player: Player, tier: any)
		return self:_purchaseHomeTier(player, tier)
	end
	visitHome.OnServerInvoke = function(player: Player)
		return self:_visitHome(player)
	end
	returnWorld.OnServerInvoke = function(player: Player)
		return self:_returnWorld(player)
	end

	return self
end

function HomeEconomyService:_homeCFrame(player: Player): CFrame
	local slot = self._slots[player]
	if slot == nil then
		slot = self._nextSlot
		self._nextSlot += 1
		self._slots[player] = slot
	end
	return self._spawnCFrame * CFrame.new((slot - 1) * HOME_SPACING, HOME_HEIGHT, 0)
end

function HomeEconomyService:_destroyHome(player: Player)
	local slot = self._slots[player]
	if slot == nil then
		return
	end
	local existing = self._homeFolder:FindFirstChild("HomeSlot_" .. tostring(slot))
	if existing then
		existing:Destroy()
	end
end

function HomeEconomyService:_rebuildHome(player: Player, profileData)
	self:_destroyHome(player)

	local homeState = ensureHome(profileData)
	local owned = ensureInventory(profileData)
	local tier = homeState.Tier
	local width, depth, height = tierDimensions(tier)
	local base = self:_homeCFrame(player)

	local model = Instance.new("Model")
	model.Name = "HomeSlot_" .. tostring(self._slots[player])
	model:SetAttribute("HomeTier", tier)
	model:SetAttribute("RuntimeOwned", true)
	model:SetAttribute("BaselineMutationAllowed", false)
	model.Parent = self._homeFolder

	local wallColor = tierColor(tier)
	part(model, "Floor", Vector3.new(width, 1, depth), base, Color3.fromRGB(226, 218, 204))
	part(model, "BackWall", Vector3.new(width, height, 1), base * CFrame.new(0, height / 2, -(depth / 2)), wallColor)
	part(model, "LeftWall", Vector3.new(1, height, depth), base * CFrame.new(-(width / 2), height / 2, 0), wallColor)
	part(model, "RightWall", Vector3.new(1, height, depth), base * CFrame.new(width / 2, height / 2, 0), wallColor)

	if tier >= 2 then
		local roof = part(model, "Roof", Vector3.new(width, 0.6, depth), base * CFrame.new(0, height, 0), wallColor, 0.22)
		roof.CanCollide = false
	end

	local itemRoot = Instance.new("Folder")
	itemRoot.Name = "OwnedItems"
	itemRoot.Parent = model
	for _, item in StoreCatalog.Items do
		if owned[item.Id] == true then
			renderOwnedItem(itemRoot, item, base, depth)
		end
	end

	model.PrimaryPart = model:FindFirstChild("Floor") :: BasePart
	player:SetAttribute("StarBloxHomeTier", tier)
	player:SetAttribute("StarBloxOwnedItemCount", 0)
	local count = 0
	for _, item in StoreCatalog.Items do
		if owned[item.Id] == true then
			count += 1
		end
	end
	player:SetAttribute("StarBloxOwnedItemCount", count)
end

function HomeEconomyService:_state(player: Player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		local home = ensureHome(data)
		local owned = ensureInventory(data)
		result = {
			ok = true,
			coins = data.Economy.Coins,
			homeTier = home.Tier,
			ownedItems = table.clone(owned),
			items = StoreCatalog.Items,
			homes = StoreCatalog.Homes,
		}
	end)
	return result or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_purchaseAllowed(player: Player): boolean
	local now = os.clock()
	local previous = self._lastPurchaseAt[player] or -math.huge
	if now - previous < 0.25 then
		return false
	end
	self._lastPurchaseAt[player] = now
	return true
end

function HomeEconomyService:_purchaseItem(player: Player, itemId: any)
	if not self:_purchaseAllowed(player) then
		return {ok = false, code = "rate_limited"}
	end
	if type(itemId) ~= "string" then
		return {ok = false, code = "invalid_item"}
	end
	local item = ITEM_BY_ID[itemId]
	if item == nil then
		return {ok = false, code = "unknown_item"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local owned = ensureInventory(data)
		if owned[itemId] == true then
			outcome = {ok = true, duplicate = true, itemId = itemId, coins = data.Economy.Coins}
			return
		end
		if data.Economy.Coins < item.Price then
			outcome = {ok = false, code = "not_enough_coins", needed = item.Price, coins = data.Economy.Coins}
			return
		end

		data.Economy.Coins -= item.Price
		owned[itemId] = true
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		player:SetAttribute("StarBloxCoins", data.Economy.Coins)
		outcome = {ok = true, itemId = itemId, coins = data.Economy.Coins}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_purchaseHomeTier(player: Player, tierValue: any)
	if not self:_purchaseAllowed(player) then
		return {ok = false, code = "rate_limited"}
	end
	local tier = tonumber(tierValue)
	if tier == nil or tier ~= math.floor(tier) then
		return {ok = false, code = "invalid_home_tier"}
	end
	local homeCatalog = HOME_BY_TIER[tier]
	if homeCatalog == nil then
		return {ok = false, code = "unknown_home_tier"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local home = ensureHome(data)
		if tier <= home.Tier then
			outcome = {ok = true, duplicate = true, homeTier = home.Tier, coins = data.Economy.Coins}
			return
		end
		if tier ~= home.Tier + 1 then
			outcome = {ok = false, code = "buy_previous_tier_first", homeTier = home.Tier}
			return
		end
		if data.Economy.Coins < homeCatalog.Price then
			outcome = {ok = false, code = "not_enough_coins", needed = homeCatalog.Price, coins = data.Economy.Coins}
			return
		end

		data.Economy.Coins -= homeCatalog.Price
		home.Tier = tier
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		player:SetAttribute("StarBloxCoins", data.Economy.Coins)
		outcome = {ok = true, homeTier = tier, coins = data.Economy.Coins}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_teleport(player: Player, target: CFrame): boolean
	local character = player.Character
	if character == nil then
		return false
	end
	local root = character:FindFirstChild("HumanoidRootPart")
	if root == nil or not root:IsA("BasePart") then
		return false
	end
	character:PivotTo(target)
	return true
end

function HomeEconomyService:_visitHome(player: Player)
	local base = self:_homeCFrame(player)
	return {ok = self:_teleport(player, base * CFrame.new(0, 3.5, 4))}
end

function HomeEconomyService:_returnWorld(player: Player)
	return {ok = self:_teleport(player, self._spawnCFrame)}
end

function HomeEconomyService:PlayerReady(player: Player, profileData)
	ensureInventory(profileData)
	ensureHome(profileData)
	self:_rebuildHome(player, profileData)
end

function HomeEconomyService:PlayerRemoving(player: Player)
	self:_destroyHome(player)
	self._slots[player] = nil
	self._lastPurchaseAt[player] = nil
end

function HomeEconomyService:Destroy()
	for player in self._slots do
		self:_destroyHome(player)
	end
	self._slots = {}
	if self._homeFolder ~= nil and self._homeFolder.Parent ~= nil then
		self._homeFolder:Destroy()
	end
end

return HomeEconomyService
