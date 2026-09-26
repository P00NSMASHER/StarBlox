--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local MovementService = {}
MovementService.__index = MovementService

local REMOTE_ROOT_NAME = "StarBloxMovement"
local NORMAL_WALK_SPEED = 16
local RUN_WALK_SPEED = 24

local function humanoidFor(player: Player): Humanoid?
	local character = player.Character
	local humanoid = character and character:FindFirstChildOfClass("Humanoid")
	if humanoid and humanoid:IsA("Humanoid") then
		return humanoid
	end
	return nil
end

function MovementService.new()
	local self = setmetatable({}, MovementService)
	self._running = {}
	self._characterConnections = {}

	local old = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if old then
		old:Destroy()
	end

	local root = Instance.new("Folder")
	root.Name = REMOTE_ROOT_NAME
	root:SetAttribute("NormalWalkSpeed", NORMAL_WALK_SPEED)
	root:SetAttribute("RunWalkSpeed", RUN_WALK_SPEED)
	root.Parent = ReplicatedStorage

	local toggleRun = Instance.new("RemoteFunction")
	toggleRun.Name = "ToggleRun"
	toggleRun.Parent = root

	local getState = Instance.new("RemoteFunction")
	getState.Name = "GetState"
	getState.Parent = root

	toggleRun.OnServerInvoke = function(player)
		return self:_toggleRun(player)
	end
	getState.OnServerInvoke = function(player)
		return {
			ok = true,
			running = self._running[player] == true,
			normalWalkSpeed = NORMAL_WALK_SPEED,
			runWalkSpeed = RUN_WALK_SPEED,
		}
	end

	return self
end

function MovementService:_apply(player: Player)
	local running = self._running[player] == true
	player:SetAttribute("StarBloxRunning", running)
	local humanoid = humanoidFor(player)
	if humanoid ~= nil then
		humanoid.WalkSpeed = if running then RUN_WALK_SPEED else NORMAL_WALK_SPEED
	end
end

function MovementService:_toggleRun(player: Player)
	self._running[player] = self._running[player] ~= true
	self:_apply(player)
	return {
		ok = true,
		running = self._running[player] == true,
		walkSpeed = if self._running[player] == true then RUN_WALK_SPEED else NORMAL_WALK_SPEED,
	}
end

function MovementService:PlayerReady(player: Player)
	self._running[player] = false
	player:SetAttribute("StarBloxRunning", false)

	local previous = self._characterConnections[player]
	if previous then
		previous:Disconnect()
	end
	self._characterConnections[player] = player.CharacterAdded:Connect(function()
		task.defer(function()
			self:_apply(player)
		end)
	end)

	if player.Character ~= nil then
		task.defer(function()
			self:_apply(player)
		end)
	end
end

function MovementService:PlayerRemoving(player: Player)
	local connection = self._characterConnections[player]
	if connection then
		connection:Disconnect()
		self._characterConnections[player] = nil
	end
	self._running[player] = nil
end

function MovementService:Destroy()
	for player, connection in self._characterConnections do
		connection:Disconnect()
		self._characterConnections[player] = nil
	end
	self._running = {}
	local root = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if root then
		root:Destroy()
	end
end

return MovementService
