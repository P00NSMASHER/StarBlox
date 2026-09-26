--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local StoreCatalog = require(ReplicatedStorage.StarBlox.StoreCatalog)
local WorldPlotBindings = require(ReplicatedStorage.StarBlox.WorldPlotBindings)

local HomeEconomyService = {}
HomeEconomyService.__index = HomeEconomyService

local REMOTE_ROOT_NAME = "StarBloxShop"
local HOME_FOLDER_NAME = "StarBloxPlayerHomes"
local PLACEMENT_VERSION = 1
local PLACEMENT_STEP = 1
local ROTATION_STEP = 15
local HOUSE_SWAP_COOLDOWN_SECONDS = 600

local ITEM_BY_ID = {}
local ITEM_INDEX_BY_ID = {}
for index, item in StoreCatalog.Items do
	ITEM_BY_ID[item.Id] = item
	ITEM_INDEX_BY_ID[item.Id] = index
end

local HOME_BY_TIER = {}
for _, home in StoreCatalog.Homes do
	HOME_BY_TIER[home.Tier] = home
end

local STYLE_BY_ID = {}
for _, style in StoreCatalog.Styles do
	STYLE_BY_ID[style.Id] = style
end

local DEFAULT_PLACEMENTS = {
	["beds-1"] = {X = -4, Z = -3, Yaw = 0},
	["seating-1"] = {X = 3, Z = 2, Yaw = 180},
	["desks-1"] = {X = 4, Z = -3, Yaw = 180},
	["lighting-1"] = {X = 6, Z = 2, Yaw = 0},
	["wall-1"] = {X = 0, Z = -5, Yaw = 0},
	["rugs-1"] = {X = 0, Z = 1, Yaw = 0},
	["decor-1"] = {X = -5, Z = 2, Yaw = 0},
}

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
		PlacementVersion = PLACEMENT_VERSION,
		SelectedStyle = "home-starter",
		OwnedStyles = {["home-starter"] = true},
		Placements = {},
	}
	local home = profileData.Social.Home
	home.Tier = math.clamp(math.floor(tonumber(home.Tier) or 1), 1, 5)
	home.PlacementVersion = PLACEMENT_VERSION
	home.Placements = type(home.Placements) == "table" and home.Placements or {}
	home.OwnedStyles = type(home.OwnedStyles) == "table" and home.OwnedStyles or {}
	home.OwnedStyles["home-starter"] = true
	home.SelectedStyle = type(home.SelectedStyle) == "string" and home.SelectedStyle or "home-starter"
	local selected = STYLE_BY_ID[home.SelectedStyle]
	if selected == nil
		or home.OwnedStyles[home.SelectedStyle] ~= true
		or home.Tier < selected.RequiredTier then
		home.SelectedStyle = "home-starter"
	end
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


local function stylePalette(kind: string, tier: number)
	if kind == "modern" then
		return Color3.fromRGB(236, 239, 242), Color3.fromRGB(72, 79, 89), Color3.fromRGB(155, 207, 226)
	elseif kind == "suburban" then
		return Color3.fromRGB(224, 205, 178), Color3.fromRGB(112, 78, 57), Color3.fromRGB(180, 214, 226)
	elseif kind == "ranch" then
		return Color3.fromRGB(204, 183, 154), Color3.fromRGB(92, 69, 54), Color3.fromRGB(182, 212, 221)
	elseif kind == "townhouse" then
		return Color3.fromRGB(191, 112, 92), Color3.fromRGB(77, 63, 58), Color3.fromRGB(187, 215, 224)
	elseif kind == "lakehouse" then
		return Color3.fromRGB(191, 214, 207), Color3.fromRGB(72, 93, 88), Color3.fromRGB(172, 218, 234)
	elseif kind == "villa" then
		return Color3.fromRGB(239, 232, 216), Color3.fromRGB(190, 165, 123), Color3.fromRGB(173, 211, 227)
	elseif kind == "mansion" then
		return Color3.fromRGB(232, 226, 214), Color3.fromRGB(74, 71, 68), Color3.fromRGB(170, 207, 223)
	end
	return tierColor(tier), Color3.fromRGB(110, 110, 116), Color3.fromRGB(185, 214, 226)
end

local function windowPane(parent: Instance, cframe: CFrame, size: Vector3, glassColor: Color3)
	local pane = part(parent, "Window", size, cframe, glassColor, 0.32)
	pane.Material = Enum.Material.Glass
	pane.CanCollide = false
	return pane
end

local function porchColumn(parent: Instance, cframe: CFrame, height: number, color: Color3)
	return part(parent, "Column", Vector3.new(0.65, height, 0.65), cframe, color)
end

local function renderHouseShell(
	parent: Instance,
	base: CFrame,
	tier: number,
	style
)
	local width, depth, height = tierDimensions(tier)
	local wallColor, trimColor, glassColor = stylePalette(style.Kind, tier)
	local kind = style.Kind

	part(parent, "Floor", Vector3.new(width, 1, depth), base, Color3.fromRGB(226, 218, 204))
	part(parent, "BackWall", Vector3.new(width, height, 1), base * CFrame.new(0, height / 2, -(depth / 2)), wallColor)
	part(parent, "LeftWall", Vector3.new(1, height, depth), base * CFrame.new(-(width / 2), height / 2, 0), wallColor)
	part(parent, "RightWall", Vector3.new(1, height, depth), base * CFrame.new(width / 2, height / 2, 0), wallColor)

	-- Front facade intentionally leaves a centered doorway opening.
	local doorWidth = math.min(5, math.max(3.5, width * 0.18))
	local sideWidth = math.max(1, (width - doorWidth) / 2)
	part(
		parent,
		"FrontWallLeft",
		Vector3.new(sideWidth, height, 1),
		base * CFrame.new(-(doorWidth / 2 + sideWidth / 2), height / 2, depth / 2),
		wallColor
	)
	part(
		parent,
		"FrontWallRight",
		Vector3.new(sideWidth, height, 1),
		base * CFrame.new(doorWidth / 2 + sideWidth / 2, height / 2, depth / 2),
		wallColor
	)

	local doorHeight = math.min(7.2, math.max(6.2, height - 0.6))
	local frontDoor = part(
		parent,
		"FrontDoor",
		Vector3.new(math.max(2.8, doorWidth - 0.35), doorHeight, 0.35),
		base * CFrame.new(0, doorHeight / 2, (depth / 2) + 0.55),
		trimColor
	)
	frontDoor:SetAttribute("RuntimeOwned", true)
	frontDoor:SetAttribute("BaselineMutationAllowed", false)

	local roofHeight = height
	if kind == "townhouse" or kind == "mansion" then
		roofHeight = height + 3.2
		local upper = part(
			parent,
			"UpperFloor",
			Vector3.new(width * 0.82, 0.7, depth * 0.74),
			base * CFrame.new(0, height * 0.58, -0.3),
			trimColor
		)
		upper.CanCollide = true
	end

	local roofTransparency = if kind == "modern" then 0.08 else 0
	local roof = part(
		parent,
		"Roof",
		Vector3.new(width + 0.8, 0.65, depth + 0.8),
		base * CFrame.new(0, roofHeight, 0),
		trimColor,
		roofTransparency
	)
	roof.CanCollide = false

	if kind == "modern" or kind == "villa" then
		windowPane(
			parent,
			base * CFrame.new(-(width / 2) + 0.55, height * 0.58, 0),
			Vector3.new(0.22, height * 0.52, depth * 0.44),
			glassColor
		)
		windowPane(
			parent,
			base * CFrame.new((width / 2) - 0.55, height * 0.58, 0),
			Vector3.new(0.22, height * 0.52, depth * 0.44),
			glassColor
		)
	end

	if kind == "suburban" or kind == "ranch" or kind == "lakehouse" or kind == "mansion" then
		local deckDepth = if kind == "lakehouse" then 5 else 3
		part(
			parent,
			"FrontDeck",
			Vector3.new(width * 0.72, 0.35, deckDepth),
			base * CFrame.new(0, 0.7, (depth / 2) + (deckDepth / 2)),
			Color3.fromRGB(152, 111, 73)
		)
		for _, x in {-width * 0.28, width * 0.28} do
			porchColumn(
				parent,
				base * CFrame.new(x, math.min(height * 0.42, 4), (depth / 2) + deckDepth - 0.7),
				math.min(height * 0.72, 8),
				trimColor
			)
		end
	end

	if kind == "townhouse" then
		part(
			parent,
			"TownhouseBand",
			Vector3.new(width + 0.35, 0.55, depth + 0.35),
			base * CFrame.new(0, height * 0.55, 0),
			trimColor
		)
	end

	if kind == "villa" or kind == "mansion" then
		for _, x in {-width * 0.22, width * 0.22} do
			porchColumn(
				parent,
				base * CFrame.new(x, height * 0.34, (depth / 2) + 1),
				height * 0.68,
				trimColor
			)
		end
	end

	if kind == "modern" then
		local accent = part(
			parent,
			"ModernAccent",
			Vector3.new(width * 0.38, height * 0.78, 0.6),
			base * CFrame.new(width * 0.24, height * 0.48, (depth / 2) + 0.3),
			trimColor
		)
		accent.CanCollide = false
	end

	-- Windows are decoration only and do not alter the interior placement bounds.
	local windowY = math.min(height * 0.55, 5.2)
	for _, x in {-width * 0.28, width * 0.28} do
		windowPane(
			parent,
			base * CFrame.new(x, windowY, (depth / 2) + 0.51),
			Vector3.new(math.max(2.2, width * 0.16), math.min(3.6, height * 0.35), 0.16),
			glassColor
		)
	end

	return width, depth, height, frontDoor
end

local function finiteNumber(value: any): number?
	local parsed = tonumber(value)
	if parsed == nil or parsed ~= parsed or parsed == math.huge or parsed == -math.huge then
		return nil
	end
	if math.abs(parsed) > 100000 then
		return nil
	end
	return parsed
end

local function snap(value: number, step: number): number
	return math.floor((value / step) + 0.5) * step
end

local function normalizeYaw(value: any): number
	local parsed = finiteNumber(value) or 0
	local snapped = snap(parsed, ROTATION_STEP) % 360
	if snapped < 0 then
		snapped += 360
	end
	return snapped
end

local function itemHalfFootprint(kind: string): (number, number)
	if kind == "bed" then
		return 3.8, 2.3
	elseif kind == "desk" then
		return 2.8, 1.6
	elseif kind == "chair" then
		return 1.5, 1.5
	elseif kind == "lamp" then
		return 1.3, 1.3
	elseif kind == "rug" then
		return 3.2, 2.2
	elseif kind == "poster" then
		return 2.2, 0.7
	elseif kind == "books" then
		return 1.9, 1.5
	end
	return 1.5, 1.5
end

local function fallbackPlacement(index: number)
	local columns = 4
	local row = math.floor((index - 1) / columns)
	local column = (index - 1) % columns
	return {
		X = -6 + (column * 4),
		Z = -4 + (row * 4),
		Yaw = 0,
		Visible = true,
	}
end

local function defaultPlacement(itemId: string)
	local raw = DEFAULT_PLACEMENTS[itemId]
	if raw ~= nil then
		return {
			X = raw.X,
			Z = raw.Z,
			Yaw = raw.Yaw,
			Visible = true,
		}
	end
	return fallbackPlacement(ITEM_INDEX_BY_ID[itemId] or 1)
end

local function sanitizePlacement(item, tier: number, raw: any)
	local width, depth = tierDimensions(tier)
	local halfX, halfZ = itemHalfFootprint(item.Kind)
	local maxX = math.max(0, (width / 2) - halfX - 0.75)
	local maxZ = math.max(0, (depth / 2) - halfZ - 0.75)
	local fallback = defaultPlacement(item.Id)

	local x = finiteNumber(type(raw) == "table" and raw.X or nil) or fallback.X
	local z = finiteNumber(type(raw) == "table" and raw.Z or nil) or fallback.Z
	local yaw = normalizeYaw(type(raw) == "table" and raw.Yaw or fallback.Yaw)
	local visible = not (type(raw) == "table" and raw.Visible == false)

	return {
		X = math.clamp(snap(x, PLACEMENT_STEP), -maxX, maxX),
		Z = math.clamp(snap(z, PLACEMENT_STEP), -maxZ, maxZ),
		Yaw = yaw,
		Visible = visible,
	}
end

local function ensurePlacementDefaults(home, owned)
	for itemId in home.Placements do
		if owned[itemId] ~= true or ITEM_BY_ID[itemId] == nil then
			home.Placements[itemId] = nil
		end
	end

	for _, item in StoreCatalog.Items do
		if owned[item.Id] == true then
			home.Placements[item.Id] = sanitizePlacement(
				item,
				home.Tier,
				home.Placements[item.Id]
			)
		end
	end
end

local function publicPlacements(home)
	local output = {}
	for itemId, placement in home.Placements do
		output[itemId] = {
			X = placement.X,
			Z = placement.Z,
			Yaw = placement.Yaw,
			Visible = placement.Visible ~= false,
		}
	end
	return output
end

local function addBed(parent: Instance, base: CFrame)
	part(parent, "BedFrame", Vector3.new(7, 1, 4), base * CFrame.new(0, 0.5, 0), Color3.fromRGB(128, 92, 68))
	part(parent, "Mattress", Vector3.new(6.6, 0.8, 3.7), base * CFrame.new(0, 1.35, 0), Color3.fromRGB(226, 232, 255))
	part(parent, "Pillow", Vector3.new(1.8, 0.45, 3), base * CFrame.new(-2.1, 1.95, 0), Color3.fromRGB(255, 255, 255))
end

local function addDesk(parent: Instance, base: CFrame)
	part(parent, "DeskTop", Vector3.new(5, 0.5, 2.4), base * CFrame.new(0, 2.8, 0), Color3.fromRGB(165, 118, 75))
	for _, x in {-1.9, 1.9} do
		for _, z in {-0.8, 0.8} do
			part(parent, "DeskLeg", Vector3.new(0.35, 2.6, 0.35), base * CFrame.new(x, 1.3, z), Color3.fromRGB(116, 82, 54))
		end
	end
end

local function addChair(parent: Instance, base: CFrame)
	part(parent, "ChairSeat", Vector3.new(2.2, 0.4, 2.2), base * CFrame.new(0, 1.5, 0), Color3.fromRGB(116, 166, 237))
	part(parent, "ChairBack", Vector3.new(2.2, 2.2, 0.4), base * CFrame.new(0, 2.5, 0.9), Color3.fromRGB(116, 166, 237))
end

local function addLamp(parent: Instance, base: CFrame)
	part(parent, "LampBase", Vector3.new(1.4, 0.3, 1.4), base * CFrame.new(0, 0.15, 0), Color3.fromRGB(87, 95, 120))
	part(parent, "LampStem", Vector3.new(0.3, 3.4, 0.3), base * CFrame.new(0, 1.95, 0), Color3.fromRGB(87, 95, 120))
	local shade = part(parent, "LampShade", Vector3.new(2.2, 1.4, 2.2), base * CFrame.new(0, 4.05, 0), Color3.fromRGB(255, 222, 120))
	shade.CanCollide = false
end

local function addRug(parent: Instance, base: CFrame)
	local rug = part(parent, "StarterMat", Vector3.new(6, 0.15, 4), base * CFrame.new(0, 0.08, 0), Color3.fromRGB(112, 104, 230))
	rug.CanCollide = false
end

local function addPoster(parent: Instance, base: CFrame)
	local poster = part(parent, "SchoolStarPoster", Vector3.new(4, 3, 0.18), base * CFrame.new(0, 2.3, 0), Color3.fromRGB(255, 211, 73))
	poster.CanCollide = false
end

local function addBooks(parent: Instance, base: CFrame)
	part(parent, "BookCrate", Vector3.new(3.2, 1.6, 2.4), base * CFrame.new(0, 0.8, 0), Color3.fromRGB(140, 94, 62))
	for index, color in {
		Color3.fromRGB(238, 92, 92),
		Color3.fromRGB(89, 158, 236),
		Color3.fromRGB(91, 191, 121),
	} do
		local book = part(
			parent,
			"Book" .. tostring(index),
			Vector3.new(0.45, 1.5, 1.8),
			base * CFrame.new(-0.7 + ((index - 1) * 0.7), 1.9, 0),
			color
		)
		book.CanCollide = false
	end
end

local function renderOwnedItem(parent: Instance, item, base: CFrame, placement)
	local model = Instance.new("Model")
	model.Name = item.Id
	model:SetAttribute("ItemId", item.Id)
	model:SetAttribute("PlacementX", placement.X)
	model:SetAttribute("PlacementZ", placement.Z)
	model:SetAttribute("PlacementYaw", placement.Yaw)
	model:SetAttribute("RuntimeOwned", true)
	model:SetAttribute("BaselineMutationAllowed", false)
	model.Parent = parent

	local itemBase =
		base
		* CFrame.new(placement.X, 0.5, placement.Z)
		* CFrame.Angles(0, math.rad(placement.Yaw), 0)

	if item.Kind == "bed" then
		addBed(model, itemBase)
	elseif item.Kind == "desk" then
		addDesk(model, itemBase)
	elseif item.Kind == "chair" then
		addChair(model, itemBase)
	elseif item.Kind == "lamp" then
		addLamp(model, itemBase)
	elseif item.Kind == "rug" then
		addRug(model, itemBase)
	elseif item.Kind == "poster" then
		addPoster(model, itemBase)
	elseif item.Kind == "books" then
		addBooks(model, itemBase)
	end
end

function HomeEconomyService.new(profiles, replicas, spawnCFrame: CFrame, familyService)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")
	assert(familyService ~= nil, "familyService dependency is required")

	local self = setmetatable({}, HomeEconomyService)
	self._profiles = profiles
	self._replicas = replicas
	self._family = familyService
	self._spawnCFrame = spawnCFrame
	self._slots = {}
	self._usedPlots = {}
	self._lastPurchaseAt = {}
	self._lastPlacementAt = {}
	self._lastHouseSwapAt = {}
	self._doorLocked = {}
	self._doorStates = {}

	local worldRoot = Workspace:FindFirstChild(WorldPlotBindings.WorldRootName)
	assert(
		worldRoot ~= nil and worldRoot:IsA("Model"),
		"verified Brookhaven world root missing for house plots: " .. WorldPlotBindings.WorldRootName
	)
	self._worldRoot = worldRoot

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
	remoteRoot:SetAttribute("HouseStyleCount", #StoreCatalog.Styles)
	remoteRoot:SetAttribute("PlacementVersion", PLACEMENT_VERSION)
	remoteRoot:SetAttribute("PlacementStep", PLACEMENT_STEP)
	remoteRoot:SetAttribute("RotationStep", ROTATION_STEP)
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

	local purchaseHomeStyle = Instance.new("RemoteFunction")
	purchaseHomeStyle.Name = "PurchaseHomeStyle"
	purchaseHomeStyle.Parent = remoteRoot

	local selectHomeStyle = Instance.new("RemoteFunction")
	selectHomeStyle.Name = "SelectHomeStyle"
	selectHomeStyle.Parent = remoteRoot

	local setDoorsLocked = Instance.new("RemoteFunction")
	setDoorsLocked.Name = "SetDoorsLocked"
	setDoorsLocked.Parent = remoteRoot

	local setPlacement = Instance.new("RemoteFunction")
	setPlacement.Name = "SetPlacement"
	setPlacement.Parent = remoteRoot

	local setPlacementVisibility = Instance.new("RemoteFunction")
	setPlacementVisibility.Name = "SetPlacementVisibility"
	setPlacementVisibility.Parent = remoteRoot

	local resetPlacement = Instance.new("RemoteFunction")
	resetPlacement.Name = "ResetPlacement"
	resetPlacement.Parent = remoteRoot

	local getPlots = Instance.new("RemoteFunction")
	getPlots.Name = "GetPlots"
	getPlots.Parent = remoteRoot

	local selectPlot = Instance.new("RemoteFunction")
	selectPlot.Name = "SelectPlot"
	selectPlot.Parent = remoteRoot

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
	purchaseHomeStyle.OnServerInvoke = function(player: Player, styleId: any)
		return self:_purchaseHomeStyle(player, styleId)
	end
	selectHomeStyle.OnServerInvoke = function(player: Player, styleId: any)
		return self:_selectHomeStyle(player, styleId)
	end
	setDoorsLocked.OnServerInvoke = function(player: Player, locked: any)
		return self:_setDoorsLocked(player, locked)
	end
	setPlacement.OnServerInvoke = function(player: Player, itemId: any, payload: any)
		return self:_setPlacement(player, itemId, payload)
	end
	setPlacementVisibility.OnServerInvoke = function(player: Player, itemId: any, visible: any)
		return self:_setPlacementVisibility(player, itemId, visible)
	end
	resetPlacement.OnServerInvoke = function(player: Player, itemId: any)
		return self:_resetPlacement(player, itemId)
	end
	getPlots.OnServerInvoke = function(player: Player)
		return self:_plotState(player)
	end
	selectPlot.OnServerInvoke = function(player: Player, plotId: any)
		return self:_selectPlot(player, plotId)
	end
	visitHome.OnServerInvoke = function(player: Player)
		return self:_visitHome(player)
	end
	returnWorld.OnServerInvoke = function(player: Player)
		return self:_returnWorld(player)
	end

	return self
end

function HomeEconomyService:_reservePlot(player: Player, home, requestedPlotId: string?): number
	local current = self._slots[player]
	if current ~= nil and self._usedPlots[current] == player then
		return current
	end

	local requestedIndex = nil
	if type(requestedPlotId) == "string" and requestedPlotId ~= "" then
		for index, binding in WorldPlotBindings.Plots do
			if binding.Id == requestedPlotId then
				requestedIndex = index
				break
			end
		end
	end

	if requestedIndex ~= nil then
		local occupant = self._usedPlots[requestedIndex]
		if occupant == nil or occupant == player then
			self._slots[player] = requestedIndex
			self._usedPlots[requestedIndex] = player
			home.PlotId = WorldPlotBindings.Plots[requestedIndex].Id
			player:SetAttribute("StarBloxHomePlotId", home.PlotId)
			return requestedIndex
		end
	end

	for index, binding in WorldPlotBindings.Plots do
		if self._usedPlots[index] == nil then
			self._slots[player] = index
			self._usedPlots[index] = player
			home.PlotId = binding.Id
			player:SetAttribute("StarBloxHomePlotId", home.PlotId)
			return index
		end
	end

	error("no Brookhaven house plot available for player")
end

function HomeEconomyService:_homeCFrame(player: Player): (CFrame, any)
	local slot = self._slots[player]
	assert(slot ~= nil, "Brookhaven house plot not reserved for player")

	local binding = WorldPlotBindings.Plots[slot]
	local source = self._worldRoot:FindFirstChild(binding.SourcePartName, true)
	assert(
		source ~= nil and source:IsA("BasePart"),
		"Brookhaven house plot source missing: " .. binding.SourcePartName
	)
	local base = source.CFrame * CFrame.new(
		0,
		(source.Size.Y / 2) + binding.HeightOffset,
		0
	)
	return base, binding
end


function HomeEconomyService:_houseSwapRemaining(player: Player): number
	local previous = self._lastHouseSwapAt[player]
	if previous == nil then
		return 0
	end
	return math.max(0, HOUSE_SWAP_COOLDOWN_SECONDS - (os.clock() - previous))
end

function HomeEconomyService:_markHouseSwap(player: Player)
	self._lastHouseSwapAt[player] = os.clock()
end

function HomeEconomyService:_canUseHomeDoor(owner: Player, visitor: Player): boolean
	if self._doorLocked[owner] ~= true then
		return true
	end
	return self._family:CanAccessHome(owner, visitor)
end

function HomeEconomyService:_bindHomeDoor(owner: Player, door: BasePart)
	local previous = self._doorStates[owner]
	if previous ~= nil then
		if previous.connection ~= nil then
			previous.connection:Disconnect()
		end
		if previous.tween ~= nil then
			pcall(function()
				previous.tween:Cancel()
			end)
		end
		self._doorStates[owner] = nil
	end

	local detector = Instance.new("ClickDetector")
	detector.Name = "StarBloxHomeDoorClick"
	detector.MaxActivationDistance = 12
	detector.Parent = door

	local state = {
		door = door,
		closedCFrame = door.CFrame,
		closedCanCollide = door.CanCollide,
		detector = detector,
		connection = nil,
		tween = nil,
		active = false,
		token = 0,
	}
	self._doorStates[owner] = state

	door:SetAttribute("OwnerUserId", owner.UserId)
	door:SetAttribute("DoorsLocked", self._doorLocked[owner] == true)
	door:SetAttribute("DoorState", "closed")

	state.connection = detector.MouseClick:Connect(function(visitor)
		if state.active or door.Parent == nil then
			return
		end
		if not self:_canUseHomeDoor(owner, visitor) then
			return
		end

		local character = visitor.Character
		local root = character and character:FindFirstChild("HumanoidRootPart")
		if root == nil or not root:IsA("BasePart") then
			return
		end

		state.active = true
		state.token += 1
		local token = state.token
		detector.MaxActivationDistance = 0

		local localPosition = state.closedCFrame:PointToObjectSpace(root.Position)
		local direction = if localPosition.Z >= 0 then -1 else 1
		local hinge = state.closedCFrame * CFrame.new(-(door.Size.X / 2), 0, 0)
		local relative = hinge:ToObjectSpace(state.closedCFrame)
		local openCFrame = hinge * CFrame.Angles(0, math.rad(88 * direction), 0) * relative

		door.CanCollide = false
		door:SetAttribute("DoorState", "opening")
		local opening = TweenService:Create(
			door,
			TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
			{CFrame = openCFrame}
		)
		state.tween = opening
		opening:Play()
		opening.Completed:Once(function()
			if state.token == token and door.Parent ~= nil then
				door:SetAttribute("DoorState", "open")
			end
		end)

		task.delay(1.35, function()
			if state.token ~= token or door.Parent == nil then
				return
			end
			door:SetAttribute("DoorState", "closing")
			local closing = TweenService:Create(
				door,
				TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut),
				{CFrame = state.closedCFrame}
			)
			state.tween = closing
			closing:Play()
			closing.Completed:Once(function()
				if state.token ~= token or door.Parent == nil then
					return
				end
				door.CFrame = state.closedCFrame
				door.CanCollide = state.closedCanCollide
				door:SetAttribute("DoorState", "closed")
				detector.MaxActivationDistance = 12
				state.tween = nil
				state.active = false
			end)
		end)
	end)
end

function HomeEconomyService:_destroyHome(player: Player)
	local doorState = self._doorStates[player]
	if doorState ~= nil then
		doorState.token += 1
		if doorState.connection ~= nil then
			doorState.connection:Disconnect()
		end
		if doorState.tween ~= nil then
			pcall(function()
				doorState.tween:Cancel()
			end)
		end
		self._doorStates[player] = nil
	end

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
	ensurePlacementDefaults(homeState, owned)

	local tier = homeState.Tier
	local style = STYLE_BY_ID[homeState.SelectedStyle] or STYLE_BY_ID["home-starter"]
	local base, plotBinding = self:_homeCFrame(player)

	local model = Instance.new("Model")
	model.Name = "HomeSlot_" .. tostring(self._slots[player])
	model:SetAttribute("HomeTier", tier)
	model:SetAttribute("HomeStyleId", style.Id)
	model:SetAttribute("HomeStyleName", style.Name)
	model:SetAttribute("HomeStyleKind", style.Kind)
	model:SetAttribute("PlotId", plotBinding.Id)
	model:SetAttribute("SourceWorldPart", plotBinding.SourcePartName)
	model:SetAttribute("PlacementVersion", PLACEMENT_VERSION)
	model:SetAttribute("RuntimeOwned", true)
	model:SetAttribute("BaselineMutationAllowed", false)
	model.Parent = self._homeFolder

	local width, depth, height, frontDoor = renderHouseShell(model, base, tier, style)
	model:SetAttribute("OwnerUserId", player.UserId)
	model:SetAttribute("DoorsLocked", self._doorLocked[player] == true)
	self:_bindHomeDoor(player, frontDoor)

	local itemRoot = Instance.new("Folder")
	itemRoot.Name = "OwnedItems"
	itemRoot.Parent = model

	for _, item in StoreCatalog.Items do
		if owned[item.Id] == true then
			local placement = homeState.Placements[item.Id]
			if placement ~= nil and placement.Visible ~= false then
				renderOwnedItem(itemRoot, item, base, placement)
			end
		end
	end

	model.PrimaryPart = model:FindFirstChild("Floor") :: BasePart
	player:SetAttribute("StarBloxHomeTier", tier)
	local count = 0
	for _, item in StoreCatalog.Items do
		if owned[item.Id] == true then
			count += 1
		end
	end
	player:SetAttribute("StarBloxOwnedItemCount", count)
end

function HomeEconomyService:_plotState(player: Player)
	local plots = {}
	local selectedSlot = self._slots[player]
	for index, binding in WorldPlotBindings.Plots do
		local occupant = self._usedPlots[index]
		table.insert(plots, {
			Id = binding.Id,
			Index = index,
			Occupied = occupant ~= nil and occupant ~= player,
			Mine = selectedSlot == index and occupant == player,
		})
	end
	return {
		ok = true,
		plots = plots,
		selectedPlotId = if selectedSlot ~= nil then WorldPlotBindings.Plots[selectedSlot].Id else "",
		houseSwapCooldownSeconds = HOUSE_SWAP_COOLDOWN_SECONDS,
		houseSwapCooldownRemaining = math.ceil(self:_houseSwapRemaining(player)),
	}
end

function HomeEconomyService:_selectPlot(player: Player, plotId: any)
	if type(plotId) ~= "string" then
		return {ok = false, code = "invalid_plot"}
	end

	local targetIndex = nil
	for index, binding in WorldPlotBindings.Plots do
		if binding.Id == plotId then
			targetIndex = index
			break
		end
	end
	if targetIndex == nil then
		return {ok = false, code = "unknown_plot"}
	end

	local occupant = self._usedPlots[targetIndex]
	if occupant ~= nil and occupant ~= player then
		return {ok = false, code = "plot_occupied"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local home = ensureHome(data)
		local oldSlot = self._slots[player]
		if oldSlot ~= nil and oldSlot ~= targetIndex then
			local remaining = self:_houseSwapRemaining(player)
			if remaining > 0 then
				outcome = {
					ok = false,
					code = "house_swap_cooldown",
					remainingSeconds = math.ceil(remaining),
				}
				return
			end
			self:_destroyHome(player)
			if self._usedPlots[oldSlot] == player then
				self._usedPlots[oldSlot] = nil
			end
		end
		self._slots[player] = targetIndex
		self._usedPlots[targetIndex] = player
		home.PlotId = WorldPlotBindings.Plots[targetIndex].Id
		if oldSlot ~= nil and oldSlot ~= targetIndex then
			self._doorLocked[player] = false
			self:_markHouseSwap(player)
		end
		player:SetAttribute("StarBloxHomePlotId", home.PlotId)
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		outcome = {
			ok = true,
			plotId = home.PlotId,
			plotIndex = targetIndex,
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_state(player: Player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		local home = ensureHome(data)
		local owned = ensureInventory(data)
		ensurePlacementDefaults(home, owned)
		result = {
			ok = true,
			coins = data.Economy.Coins,
			homeTier = home.Tier,
			plotId = home.PlotId,
			selectedStyle = home.SelectedStyle,
			ownedStyles = table.clone(home.OwnedStyles),
			styles = StoreCatalog.Styles,
			placementVersion = PLACEMENT_VERSION,
			placementStep = PLACEMENT_STEP,
			rotationStep = ROTATION_STEP,
			doorsLocked = self._doorLocked[player] == true,
			houseSwapCooldownSeconds = HOUSE_SWAP_COOLDOWN_SECONDS,
			houseSwapCooldownRemaining = math.ceil(self:_houseSwapRemaining(player)),
			ownedItems = table.clone(owned),
			placements = publicPlacements(home),
			items = StoreCatalog.Items,
			homes = StoreCatalog.Homes,
		}
	end)
	return result or {ok = false, code = "profile_unavailable"}
end


function HomeEconomyService:_setDoorsLocked(player: Player, locked: any)
	if type(locked) ~= "boolean" then
		return {ok = false, code = "invalid_lock_state"}
	end
	self._doorLocked[player] = locked
	local slot = self._slots[player]
	if slot ~= nil then
		local model = self._homeFolder:FindFirstChild("HomeSlot_" .. tostring(slot))
		if model and model:IsA("Model") then
			model:SetAttribute("DoorsLocked", locked)
			local door = model:FindFirstChild("FrontDoor", true)
			if door and door:IsA("BasePart") then
				door:SetAttribute("DoorsLocked", locked)
			end
		end
	end
	return {ok = true, doorsLocked = locked}
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

function HomeEconomyService:_placementAllowed(player: Player): boolean
	local now = os.clock()
	local previous = self._lastPlacementAt[player] or -math.huge
	if now - previous < 0.05 then
		return false
	end
	self._lastPlacementAt[player] = now
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
		local home = ensureHome(data)
		ensurePlacementDefaults(home, owned)
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		player:SetAttribute("StarBloxCoins", data.Economy.Coins)
		outcome = {
			ok = true,
			itemId = itemId,
			coins = data.Economy.Coins,
			placement = publicPlacements(home)[itemId],
		}
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
		ensurePlacementDefaults(home, ensureInventory(data))
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		player:SetAttribute("StarBloxCoins", data.Economy.Coins)
		outcome = {ok = true, homeTier = tier, coins = data.Economy.Coins}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_purchaseHomeStyle(player: Player, styleId: any)
	if not self:_purchaseAllowed(player) then
		return {ok = false, code = "rate_limited"}
	end
	if type(styleId) ~= "string" then
		return {ok = false, code = "invalid_style"}
	end
	local style = STYLE_BY_ID[styleId]
	if style == nil then
		return {ok = false, code = "unknown_style"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local home = ensureHome(data)
		if home.SelectedStyle ~= styleId then
			local remaining = self:_houseSwapRemaining(player)
			if remaining > 0 then
				outcome = {
					ok = false,
					code = "house_swap_cooldown",
					remainingSeconds = math.ceil(remaining),
				}
				return
			end
		end
		if home.Tier < style.RequiredTier then
			outcome = {
				ok = false,
				code = "home_tier_required",
				requiredTier = style.RequiredTier,
				homeTier = home.Tier,
			}
			return
		end
		if home.OwnedStyles[styleId] == true then
			if home.SelectedStyle ~= styleId then
				home.SelectedStyle = styleId
				self._doorLocked[player] = false
				self:_markHouseSwap(player)
			end
			self._replicas:Sync(player, data)
			self:_rebuildHome(player, data)
			outcome = {
				ok = true,
				duplicate = true,
				selectedStyle = styleId,
				coins = data.Economy.Coins,
			}
			return
		end
		if data.Economy.Coins < style.Price then
			outcome = {
				ok = false,
				code = "not_enough_coins",
				needed = style.Price,
				coins = data.Economy.Coins,
			}
			return
		end

		data.Economy.Coins -= style.Price
		home.OwnedStyles[styleId] = true
		home.SelectedStyle = styleId
		self._doorLocked[player] = false
		self:_markHouseSwap(player)
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		player:SetAttribute("StarBloxCoins", data.Economy.Coins)
		player:SetAttribute("StarBloxHomeStyle", styleId)
		outcome = {
			ok = true,
			selectedStyle = styleId,
			coins = data.Economy.Coins,
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_selectHomeStyle(player: Player, styleId: any)
	if not self:_purchaseAllowed(player) then
		return {ok = false, code = "rate_limited"}
	end
	if type(styleId) ~= "string" then
		return {ok = false, code = "invalid_style"}
	end
	local style = STYLE_BY_ID[styleId]
	if style == nil then
		return {ok = false, code = "unknown_style"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local home = ensureHome(data)
		if home.OwnedStyles[styleId] ~= true then
			outcome = {ok = false, code = "not_owned"}
			return
		end
		if home.Tier < style.RequiredTier then
			outcome = {
				ok = false,
				code = "home_tier_required",
				requiredTier = style.RequiredTier,
				homeTier = home.Tier,
			}
			return
		end
		if home.SelectedStyle ~= styleId then
			local remaining = self:_houseSwapRemaining(player)
			if remaining > 0 then
				outcome = {
					ok = false,
					code = "house_swap_cooldown",
					remainingSeconds = math.ceil(remaining),
				}
				return
			end
			home.SelectedStyle = styleId
			self._doorLocked[player] = false
			self:_markHouseSwap(player)
		end
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		player:SetAttribute("StarBloxHomeStyle", styleId)
		outcome = {
			ok = true,
			selectedStyle = styleId,
			coins = data.Economy.Coins,
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_setPlacement(player: Player, itemId: any, payload: any)
	if not self:_placementAllowed(player) then
		return {ok = false, code = "rate_limited"}
	end
	if type(itemId) ~= "string" or type(payload) ~= "table" then
		return {ok = false, code = "invalid_placement"}
	end
	local item = ITEM_BY_ID[itemId]
	if item == nil then
		return {ok = false, code = "unknown_item"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local owned = ensureInventory(data)
		if owned[itemId] ~= true then
			outcome = {ok = false, code = "not_owned"}
			return
		end

		local home = ensureHome(data)
		ensurePlacementDefaults(home, owned)
		local current = home.Placements[itemId]
		local nextPlacement = sanitizePlacement(item, home.Tier, {
			X = payload.X ~= nil and payload.X or current.X,
			Z = payload.Z ~= nil and payload.Z or current.Z,
			Yaw = payload.Yaw ~= nil and payload.Yaw or current.Yaw,
			Visible = current.Visible ~= false,
		})
		home.Placements[itemId] = nextPlacement
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		outcome = {
			ok = true,
			itemId = itemId,
			placement = {
				X = nextPlacement.X,
				Z = nextPlacement.Z,
				Yaw = nextPlacement.Yaw,
				Visible = nextPlacement.Visible,
			},
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_setPlacementVisibility(player: Player, itemId: any, visible: any)
	if not self:_placementAllowed(player) then
		return {ok = false, code = "rate_limited"}
	end
	if type(itemId) ~= "string" or type(visible) ~= "boolean" then
		return {ok = false, code = "invalid_visibility"}
	end
	local item = ITEM_BY_ID[itemId]
	if item == nil then
		return {ok = false, code = "unknown_item"}
	end

	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		local owned = ensureInventory(data)
		if owned[itemId] ~= true then
			outcome = {ok = false, code = "not_owned"}
			return
		end
		local home = ensureHome(data)
		ensurePlacementDefaults(home, owned)
		local placement = sanitizePlacement(item, home.Tier, home.Placements[itemId])
		placement.Visible = visible
		home.Placements[itemId] = placement
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		outcome = {
			ok = true,
			itemId = itemId,
			placement = {
				X = placement.X,
				Z = placement.Z,
				Yaw = placement.Yaw,
				Visible = placement.Visible,
			},
		}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function HomeEconomyService:_resetPlacement(player: Player, itemId: any)
	if not self:_placementAllowed(player) then
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
		if owned[itemId] ~= true then
			outcome = {ok = false, code = "not_owned"}
			return
		end
		local home = ensureHome(data)
		local placement = sanitizePlacement(item, home.Tier, defaultPlacement(itemId))
		home.Placements[itemId] = placement
		self._replicas:Sync(player, data)
		self:_rebuildHome(player, data)
		outcome = {
			ok = true,
			itemId = itemId,
			placement = {
				X = placement.X,
				Z = placement.Z,
				Yaw = placement.Yaw,
				Visible = placement.Visible,
			},
		}
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
	self._doorLocked[player] = false
	local owned = ensureInventory(profileData)
	local home = ensureHome(profileData)
	ensurePlacementDefaults(home, owned)
	self:_reservePlot(player, home, home.PlotId)
	player:SetAttribute("StarBloxHomeStyle", home.SelectedStyle)
	self:_rebuildHome(player, profileData)
end

function HomeEconomyService:PlayerRemoving(player: Player)
	local slot = self._slots[player]
	self:_destroyHome(player)
	if slot ~= nil and self._usedPlots[slot] == player then
		self._usedPlots[slot] = nil
	end
	self._slots[player] = nil
	self._lastPurchaseAt[player] = nil
	self._lastPlacementAt[player] = nil
	self._lastHouseSwapAt[player] = nil
	self._doorLocked[player] = nil
	self._doorStates[player] = nil
end

function HomeEconomyService:Destroy()
	for player in self._slots do
		self:_destroyHome(player)
	end
	self._slots = {}
	self._usedPlots = {}
	if self._homeFolder ~= nil and self._homeFolder.Parent ~= nil then
		self._homeFolder:Destroy()
	end
end

return HomeEconomyService
