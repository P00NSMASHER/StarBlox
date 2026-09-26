--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local Workspace = game:GetService("Workspace")

local MirrorCatalog = require(ReplicatedStorage.StarBlox.MirrorCatalog)

local MirrorLifestyleService = {}
MirrorLifestyleService.__index = MirrorLifestyleService

local REMOTE_ROOT_NAME = "StarBloxMirror"
local VEHICLE_FOLDER_NAME = "StarBloxVehicles"

local VEHICLE_BY_ID = {}
for _, item in MirrorCatalog.Vehicles do
	VEHICLE_BY_ID[item.Id] = item
end

local TOOL_BY_ID = {}
for _, item in MirrorCatalog.Inventory do
	TOOL_BY_ID[item.Id] = item
end

local function ensureInventory(profileData)
	profileData.Inventory = profileData.Inventory or {}
	profileData.Inventory.OwnedVehicles =
		type(profileData.Inventory.OwnedVehicles) == "table"
		and profileData.Inventory.OwnedVehicles
		or {}
	profileData.Inventory.OwnedTools =
		type(profileData.Inventory.OwnedTools) == "table"
		and profileData.Inventory.OwnedTools
		or {["tool-phone"] = true}
	profileData.Inventory.OwnedTools["tool-phone"] = true
	return profileData.Inventory
end

local function newPart(parent: Instance, name: string, size: Vector3, cframe: CFrame, color: Color3): Part
	local p = Instance.new("Part")
	p.Name = name
	p.Size = size
	p.CFrame = cframe
	p.Color = color
	p.Material = Enum.Material.SmoothPlastic
	p.Anchored = false
	p.CanCollide = true
	p.Parent = parent
	return p
end

local function weld(primary: BasePart, other: BasePart)
	local w = Instance.new("WeldConstraint")
	w.Part0 = primary
	w.Part1 = other
	w.Parent = primary
end

local function vehicleColor(id: string): Color3
	local sum = 0
	for index = 1, #id do
		sum += string.byte(id, index)
	end
	local palette = {
		Color3.fromRGB(64, 115, 190),
		Color3.fromRGB(211, 67, 67),
		Color3.fromRGB(58, 58, 64),
		Color3.fromRGB(235, 235, 238),
		Color3.fromRGB(73, 156, 95),
		Color3.fromRGB(232, 171, 54),
		Color3.fromRGB(147, 86, 188),
	}
	return palette[(sum % #palette) + 1]
end

local function createVehicleModel(definition, spawnCFrame: CFrame): Model
	local model = Instance.new("Model")
	model.Name = definition.Name
	model:SetAttribute("VehicleId", definition.Id)
	model:SetAttribute("RuntimeOwned", true)
	model:SetAttribute("BaselineMutationAllowed", false)
	model:SetAttribute("MaxSpeed", definition.Speed)
	model:SetAttribute("HeadlightsOn", false)
	model:SetAttribute("Locked", false)

	local primary = Instance.new("VehicleSeat")
	primary.Name = "DriverSeat"
	primary.Size = Vector3.new(2, 1, 2)
	primary.CFrame = spawnCFrame
	primary.Color = Color3.fromRGB(45, 45, 52)
	primary.Material = Enum.Material.SmoothPlastic
	primary.Anchored = false
	primary.CanCollide = true
	primary.Parent = model

	local color = vehicleColor(definition.Id)
	local bodyLength = if definition.Kind == "van" then 9 elseif definition.Kind == "truck" then 8 else 7
	local bodyWidth = if definition.Kind == "bike" then 2.2 else 5
	local bodyHeight = if definition.Kind == "van" then 3.6 else 2.3

	local chassis = newPart(
		model,
		"Body",
		Vector3.new(bodyWidth, bodyHeight, bodyLength),
		spawnCFrame * CFrame.new(0, 1.3, 0),
		color
	)
	weld(primary, chassis)

	local lightSpacing = math.max(0.45, bodyWidth * 0.28)
	for _, side in {-1, 1} do
		local lamp = newPart(
			model,
			"Headlight",
			Vector3.new(0.45, 0.45, 0.2),
			spawnCFrame * CFrame.new(side * lightSpacing, 1.45, -(bodyLength / 2) - 0.12),
			Color3.fromRGB(244, 244, 225)
		)
		lamp.CanCollide = false
		lamp.Material = Enum.Material.Neon
		lamp.Transparency = 0.15
		weld(primary, lamp)

		local beam = Instance.new("SpotLight")
		beam.Name = "Beam"
		beam.Angle = 62
		beam.Brightness = 2.8
		beam.Range = 42
		beam.Face = Enum.NormalId.Front
		beam.Enabled = false
		beam.Parent = lamp
	end

	if definition.Kind ~= "bike" then
		local roof = newPart(
			model,
			"Roof",
			Vector3.new(bodyWidth - 0.7, 1.8, math.max(3, bodyLength - 3)),
			spawnCFrame * CFrame.new(0, 3, -0.3),
			Color3.fromRGB(40, 47, 57)
		)
		roof.Material = Enum.Material.Glass
		roof.Transparency = 0.25
		roof.CanCollide = false
		weld(primary, roof)
	end

	for _, wheelInfo in {
		{-bodyWidth / 2, -bodyLength / 3},
		{bodyWidth / 2, -bodyLength / 3},
		{-bodyWidth / 2, bodyLength / 3},
		{bodyWidth / 2, bodyLength / 3},
	} do
		local wheel = newPart(
			model,
			"Wheel",
			Vector3.new(1.2, 1.2, 0.7),
			spawnCFrame * CFrame.new(wheelInfo[1], 0, wheelInfo[2]) * CFrame.Angles(0, 0, math.rad(90)),
			Color3.fromRGB(28, 28, 30)
		)
		wheel.Shape = Enum.PartType.Cylinder
		wheel.CanCollide = false
		weld(primary, wheel)
	end

	for seatIndex = 2, math.min(definition.Seats, 6) do
		local row = math.floor((seatIndex - 2) / 2)
		local side = if ((seatIndex - 2) % 2) == 0 then -1 else 1
		local passenger = Instance.new("Seat")
		passenger.Name = "PassengerSeat" .. tostring(seatIndex)
		passenger.Size = Vector3.new(1.6, 0.8, 1.8)
		passenger.CFrame = spawnCFrame * CFrame.new(side * 1.2, 1.2, 1.8 + row * 1.8)
		passenger.Color = Color3.fromRGB(60, 60, 68)
		passenger.Anchored = false
		passenger.Parent = model
		weld(primary, passenger)
	end

	model.PrimaryPart = primary
	return model
end

local function toolHandle(tool: Tool, size: Vector3, color: Color3): Part
	local handle = Instance.new("Part")
	handle.Name = "Handle"
	handle.Size = size
	handle.Color = color
	handle.Material = Enum.Material.SmoothPlastic
	handle.CanCollide = false
	handle.Massless = true
	handle.Parent = tool
	return handle
end

local function createTool(definition): Tool
	local tool = Instance.new("Tool")
	tool.Name = definition.Name
	tool.ToolTip = definition.Name
	tool.CanBeDropped = false
	tool:SetAttribute("ItemId", definition.Id)
	tool:SetAttribute("RuntimeOwned", true)

	local handle
	if definition.Kind == "phone" then
		handle = toolHandle(tool, Vector3.new(0.6, 1.1, 0.12), Color3.fromRGB(35, 40, 50))
	elseif definition.Kind == "flashlight" then
		handle = toolHandle(tool, Vector3.new(0.45, 1.7, 0.45), Color3.fromRGB(55, 55, 60))
		local light = Instance.new("SpotLight")
		light.Angle = 55
		light.Brightness = 3
		light.Range = 32
		light.Parent = handle
	elseif definition.Kind == "laptop" then
		handle = toolHandle(tool, Vector3.new(2.2, 0.18, 1.5), Color3.fromRGB(85, 90, 105))
	elseif definition.Kind == "camera" then
		handle = toolHandle(tool, Vector3.new(1.3, 0.9, 0.7), Color3.fromRGB(40, 40, 44))
	elseif definition.Kind == "umbrella" then
		handle = toolHandle(tool, Vector3.new(0.25, 3.2, 0.25), Color3.fromRGB(80, 80, 86))
	elseif definition.Kind == "book" then
		handle = toolHandle(tool, Vector3.new(1.5, 0.25, 2), Color3.fromRGB(84, 127, 201))
	elseif definition.Kind == "clipboard" then
		handle = toolHandle(tool, Vector3.new(1.4, 0.18, 2), Color3.fromRGB(160, 113, 70))
	elseif definition.Kind == "guitar" then
		handle = toolHandle(tool, Vector3.new(1.3, 3.2, 0.45), Color3.fromRGB(155, 88, 49))
	elseif definition.Kind == "binoculars" then
		handle = toolHandle(tool, Vector3.new(1.5, 0.8, 0.65), Color3.fromRGB(35, 37, 42))
	elseif definition.Kind == "stroller" then
		handle = toolHandle(tool, Vector3.new(1.8, 2.4, 1.4), Color3.fromRGB(218, 126, 177))
	elseif definition.Kind == "extinguisher" then
		handle = toolHandle(tool, Vector3.new(0.8, 2, 0.8), Color3.fromRGB(210, 49, 49))
	elseif definition.Kind == "backpack" then
		handle = toolHandle(tool, Vector3.new(1.5, 1.8, 0.7), Color3.fromRGB(76, 112, 180))
	else
		handle = toolHandle(tool, Vector3.one, Color3.fromRGB(100, 100, 110))
	end
	return tool
end

function MirrorLifestyleService.new(profiles, replicas)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, MirrorLifestyleService)
	self._profiles = profiles
	self._replicas = replicas
	self._activeVehicles = {}
	self._lastActionAt = {}
	self._vehicleFolder = Instance.new("Folder")
	self._vehicleFolder.Name = VEHICLE_FOLDER_NAME
	self._vehicleFolder:SetAttribute("RuntimeOwned", true)
	self._vehicleFolder:SetAttribute("BaselineMutationAllowed", false)
	self._vehicleFolder.Parent = Workspace

	local old = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if old then
		old:Destroy()
	end

	local root = Instance.new("Folder")
	root.Name = REMOTE_ROOT_NAME
	root:SetAttribute("CatalogRevision", MirrorCatalog.Revision)
	root.Parent = ReplicatedStorage

	local getState = Instance.new("RemoteFunction")
	getState.Name = "GetState"
	getState.Parent = root
	local purchaseVehicle = Instance.new("RemoteFunction")
	purchaseVehicle.Name = "PurchaseVehicle"
	purchaseVehicle.Parent = root
	local spawnVehicle = Instance.new("RemoteFunction")
	spawnVehicle.Name = "SpawnVehicle"
	spawnVehicle.Parent = root
	local despawnVehicle = Instance.new("RemoteFunction")
	despawnVehicle.Name = "DespawnVehicle"
	despawnVehicle.Parent = root
	local purchaseTool = Instance.new("RemoteFunction")
	purchaseTool.Name = "PurchaseTool"
	purchaseTool.Parent = root
	local equipTool = Instance.new("RemoteFunction")
	equipTool.Name = "EquipTool"
	equipTool.Parent = root
	local vehicleAction = Instance.new("RemoteFunction")
	vehicleAction.Name = "VehicleAction"
	vehicleAction.Parent = root

	getState.OnServerInvoke = function(player)
		return self:_state(player)
	end
	purchaseVehicle.OnServerInvoke = function(player, id)
		return self:_purchaseVehicle(player, id)
	end
	spawnVehicle.OnServerInvoke = function(player, id)
		return self:_spawnVehicle(player, id)
	end
	despawnVehicle.OnServerInvoke = function(player)
		return self:_despawnVehicle(player)
	end
	purchaseTool.OnServerInvoke = function(player, id)
		return self:_purchaseTool(player, id)
	end
	equipTool.OnServerInvoke = function(player, id)
		return self:_equipTool(player, id)
	end
	vehicleAction.OnServerInvoke = function(player, action)
		return self:_vehicleAction(player, action)
	end

	self._heartbeat = RunService.Heartbeat:Connect(function(dt)
		self:_stepVehicles(dt)
	end)

	return self
end

function MirrorLifestyleService:_allow(player): boolean
	local now = os.clock()
	local previous = self._lastActionAt[player] or -math.huge
	if now - previous < 0.2 then
		return false
	end
	self._lastActionAt[player] = now
	return true
end

function MirrorLifestyleService:_state(player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		local inventory = ensureInventory(data)
		result = {
			ok = true,
			coins = data.Economy.Coins,
			vehicles = MirrorCatalog.Vehicles,
			inventory = MirrorCatalog.Inventory,
			ownedVehicles = table.clone(inventory.OwnedVehicles),
			ownedTools = table.clone(inventory.OwnedTools),
		}
	end)
	return result or {ok = false, code = "profile_unavailable"}
end

function MirrorLifestyleService:_purchase(player, definition, ownedTable)
	if definition == nil then
		return {ok = false, code = "unknown_item"}
	end
	local outcome = nil
	self._profiles:WithProfile(player, function(data)
		if ownedTable(data)[definition.Id] == true then
			outcome = {ok = true, duplicate = true, coins = data.Economy.Coins}
			return
		end
		if data.Economy.Coins < definition.Price then
			outcome = {ok = false, code = "not_enough_coins", needed = definition.Price, coins = data.Economy.Coins}
			return
		end
		data.Economy.Coins -= definition.Price
		ownedTable(data)[definition.Id] = true
		self._replicas:Sync(player, data)
		player:SetAttribute("StarBloxCoins", data.Economy.Coins)
		outcome = {ok = true, coins = data.Economy.Coins}
	end)
	return outcome or {ok = false, code = "profile_unavailable"}
end

function MirrorLifestyleService:_purchaseVehicle(player, id)
	if not self:_allow(player) or type(id) ~= "string" then
		return {ok = false, code = "invalid_request"}
	end
	return self:_purchase(player, VEHICLE_BY_ID[id], function(data)
		return ensureInventory(data).OwnedVehicles
	end)
end

function MirrorLifestyleService:_purchaseTool(player, id)
	if not self:_allow(player) or type(id) ~= "string" then
		return {ok = false, code = "invalid_request"}
	end
	return self:_purchase(player, TOOL_BY_ID[id], function(data)
		return ensureInventory(data).OwnedTools
	end)
end

function MirrorLifestyleService:_despawnVehicle(player)
	local model = self._activeVehicles[player]
	if model ~= nil then
		self._activeVehicles[player] = nil
		if model.Parent ~= nil then
			model:Destroy()
		end
	end
	return {ok = true}
end

function MirrorLifestyleService:_spawnVehicle(player, id)
	if not self:_allow(player) or type(id) ~= "string" then
		return {ok = false, code = "invalid_request"}
	end
	local definition = VEHICLE_BY_ID[id]
	if definition == nil then
		return {ok = false, code = "unknown_vehicle"}
	end

	local owned = false
	self._profiles:WithProfile(player, function(data)
		owned = ensureInventory(data).OwnedVehicles[id] == true
	end)
	if not owned then
		return {ok = false, code = "not_owned"}
	end

	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if root == nil or not root:IsA("BasePart") then
		return {ok = false, code = "character_unavailable"}
	end

	self:_despawnVehicle(player)
	local spawnCFrame = root.CFrame * CFrame.new(0, 0, -10)
	local model = createVehicleModel(definition, spawnCFrame)
	model:SetAttribute("OwnerUserId", player.UserId)
	model.Parent = self._vehicleFolder
	self._activeVehicles[player] = model

	local seat = model.PrimaryPart
	if seat ~= nil then
		pcall(function()
			seat:SetNetworkOwner(player)
		end)
	end

	return {ok = true, vehicleId = id}
end


function MirrorLifestyleService:_vehicleAction(player: Player, action: any)
	if not self:_allow(player) or type(action) ~= "string" then
		return {ok = false, code = "invalid_request"}
	end
	local model = self._activeVehicles[player]
	if model == nil or model.Parent == nil or model.PrimaryPart == nil then
		return {ok = false, code = "vehicle_unavailable"}
	end
	if model:GetAttribute("OwnerUserId") ~= player.UserId then
		return {ok = false, code = "not_vehicle_owner"}
	end

	if action == "headlights" then
		local enabled = model:GetAttribute("HeadlightsOn") ~= true
		model:SetAttribute("HeadlightsOn", enabled)
		for _, descendant in model:GetDescendants() do
			if descendant:IsA("SpotLight") and descendant.Name == "Beam" then
				descendant.Enabled = enabled
			end
		end
		return {ok = true, action = action, enabled = enabled}
	end

	if action == "lock" then
		local locked = model:GetAttribute("Locked") ~= true
		model:SetAttribute("Locked", locked)
		return {ok = true, action = action, enabled = locked}
	end

	if action == "flip" then
		local primary = model.PrimaryPart
		local position = primary.Position + Vector3.new(0, 3, 0)
		local look = primary.CFrame.LookVector
		local flatLook = Vector3.new(look.X, 0, look.Z)
		if flatLook.Magnitude < 0.01 then
			flatLook = Vector3.new(0, 0, -1)
		end
		local upright = CFrame.lookAt(position, position + flatLook.Unit)
		model:PivotTo(upright)
		primary.AssemblyLinearVelocity = Vector3.zero
		primary.AssemblyAngularVelocity = Vector3.zero
		return {ok = true, action = action}
	end

	if action == "despawn" then
		return self:_despawnVehicle(player)
	end

	return {ok = false, code = "unknown_vehicle_action"}
end

function MirrorLifestyleService:_equipTool(player, id)
	if not self:_allow(player) or type(id) ~= "string" then
		return {ok = false, code = "invalid_request"}
	end
	local definition = TOOL_BY_ID[id]
	if definition == nil then
		return {ok = false, code = "unknown_tool"}
	end

	local owned = false
	self._profiles:WithProfile(player, function(data)
		owned = ensureInventory(data).OwnedTools[id] == true
	end)
	if not owned then
		return {ok = false, code = "not_owned"}
	end

	local backpack = player:FindFirstChildOfClass("Backpack")
	if backpack == nil then
		return {ok = false, code = "backpack_unavailable"}
	end

	for _, child in backpack:GetChildren() do
		if child:IsA("Tool") and child:GetAttribute("ItemId") == id then
			child:Destroy()
		end
	end
	local character = player.Character
	if character ~= nil then
		for _, child in character:GetChildren() do
			if child:IsA("Tool") and child:GetAttribute("ItemId") == id then
				child:Destroy()
			end
		end
	end

	local tool = createTool(definition)
	tool.Parent = backpack
	return {ok = true, itemId = id}
end

function MirrorLifestyleService:_stepVehicles(_dt: number)
	for player, model in self._activeVehicles do
		if player.Parent ~= Players or model.Parent == nil or model.PrimaryPart == nil then
			self:_despawnVehicle(player)
			continue
		end
		local seat = model.PrimaryPart
		if not seat:IsA("VehicleSeat") then
			continue
		end

		local occupant = seat.Occupant
		if occupant == nil then
			seat.AssemblyLinearVelocity *= 0.94
			seat.AssemblyAngularVelocity *= 0.8
			continue
		end

		local character = occupant.Parent
		local seatedPlayer = if character then Players:GetPlayerFromCharacter(character) else nil
		if seatedPlayer ~= player then
			if model:GetAttribute("Locked") == true then
				occupant.Sit = false
			end
			continue
		end

		local maxSpeed = tonumber(model:GetAttribute("MaxSpeed")) or 45
		local throttle = math.clamp(seat.ThrottleFloat, -1, 1)
		local steer = math.clamp(seat.SteerFloat, -1, 1)
		local forward = seat.CFrame.LookVector
		local targetVelocity = forward * (throttle * maxSpeed)
		seat.AssemblyLinearVelocity = Vector3.new(targetVelocity.X, seat.AssemblyLinearVelocity.Y, targetVelocity.Z)
		seat.AssemblyAngularVelocity = Vector3.new(0, -steer * math.rad(75), 0)
	end
end

function MirrorLifestyleService:PlayerReady(player, profileData)
	local inventory = ensureInventory(profileData)
	inventory.OwnedTools["tool-phone"] = true
end

function MirrorLifestyleService:PlayerRemoving(player)
	self:_despawnVehicle(player)
	self._lastActionAt[player] = nil
end

function MirrorLifestyleService:Destroy()
	if self._heartbeat ~= nil then
		self._heartbeat:Disconnect()
		self._heartbeat = nil
	end
	for player in self._activeVehicles do
		self:_despawnVehicle(player)
	end
	if self._vehicleFolder ~= nil and self._vehicleFolder.Parent ~= nil then
		self._vehicleFolder:Destroy()
	end
end

return MirrorLifestyleService
