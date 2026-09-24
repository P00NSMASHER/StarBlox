--!strict

local RunService = game:GetService("RunService")

local MAX_COMMANDS_PER_SECOND = 120
local MAX_MOVE_MAGNITUDE = 1.05
local MIN_DELTA = 1 / 500
local MAX_DELTA = 0.1
local MAX_CLOCK_SKEW = 0.35

local ActionAuthorityService = {}
ActionAuthorityService.__index = ActionAuthorityService

local function finite(value): boolean
	return type(value) == "number"
		and value == value
		and value ~= math.huge
		and value ~= -math.huge
end

local function sanitizeMovement(command, serverTime)
	if type(command) ~= "table" then
		return nil, "command must be a table"
	end
	if type(command.Sequence) ~= "number" or command.Sequence < 0 or command.Sequence % 1 ~= 0 then
		return nil, "invalid sequence"
	end
	for _, key in {"ClientTime", "DeltaTime", "MoveX", "MoveZ", "LookYaw"} do
		if not finite(command[key]) then
			return nil, "invalid " .. key
		end
	end
	if math.abs(command.ClientTime - serverTime) > MAX_CLOCK_SKEW then
		return nil, "client clock outside allowed skew"
	end
	if command.DeltaTime < MIN_DELTA or command.DeltaTime > MAX_DELTA then
		return nil, "delta outside allowed bounds"
	end
	if Vector2.new(command.MoveX, command.MoveZ).Magnitude > MAX_MOVE_MAGNITUDE then
		return nil, "movement magnitude exceeds allowed input"
	end
	return {
		Sequence = command.Sequence,
		ClientTime = command.ClientTime,
		DeltaTime = command.DeltaTime,
		MoveX = command.MoveX,
		MoveZ = command.MoveZ,
		Jump = command.Jump == true,
		LookYaw = command.LookYaw,
		ActionBits = if type(command.ActionBits) == "number" then math.max(0, math.floor(command.ActionBits)) else 0,
	}, nil
end

local function sanitizeShot(intent)
	if type(intent) ~= "table" then
		return nil, "shot intent must be a table"
	end
	if type(intent.Sequence) ~= "number" or intent.Sequence < 0 or intent.Sequence % 1 ~= 0 then
		return nil, "invalid shot sequence"
	end
	if not finite(intent.ClientShotTime) then
		return nil, "invalid shot time"
	end
	if typeof(intent.Origin) ~= "Vector3" or typeof(intent.Direction) ~= "Vector3" then
		return nil, "invalid shot vectors"
	end
	if intent.Direction.Magnitude <= 0.0001 then
		return nil, "shot direction must be non-zero"
	end
	if intent.TargetUserId ~= nil or intent.Damage ~= nil or intent.Hit ~= nil then
		return nil, "client-authored hit outcome is forbidden"
	end
	return {
		Sequence = intent.Sequence,
		ClientShotTime = intent.ClientShotTime,
		Origin = intent.Origin,
		Direction = intent.Direction.Unit,
		WeaponId = if type(intent.WeaponId) == "string" then intent.WeaponId else "",
	}, nil
end

function ActionAuthorityService.new(movementAdapter, actionResolver, replaySink)
	assert(movementAdapter ~= nil, "authoritative movement adapter is required")
	assert(movementAdapter.ProcessCommand ~= nil, "movement adapter ProcessCommand is required")
	assert(movementAdapter.GetSnapshot ~= nil, "movement adapter GetSnapshot is required")
	assert(actionResolver ~= nil, "server action resolver is required")
	assert(actionResolver.ResolveHitscan ~= nil, "action resolver ResolveHitscan is required")

	local self = setmetatable({}, ActionAuthorityService)
	self._movement = movementAdapter
	self._resolver = actionResolver
	self._replaySink = replaySink
	self._players = {}
	return self
end

function ActionAuthorityService:_state(player: Player)
	local state = self._players[player]
	if state == nil then
		state = {
			LastMovementSequence = -1,
			LastShotSequence = -1,
			RecentCommands = {},
			LastSnapshot = nil,
		}
		self._players[player] = state
	end
	return state
end

function ActionAuthorityService:SubmitMovement(player: Player, command)
	local state = self:_state(player)
	local serverTime = workspace:GetServerTimeNow()
	local clean, reason = sanitizeMovement(command, serverTime)
	if clean == nil then
		return false, reason
	end
	if clean.Sequence <= state.LastMovementSequence then
		return false, "stale movement sequence"
	end

	local recent = {}
	for _, at in state.RecentCommands do
		if serverTime - at <= 1 then
			table.insert(recent, at)
		end
	end
	if #recent >= MAX_COMMANDS_PER_SECOND then
		state.RecentCommands = recent
		return false, "movement command rate exceeded"
	end
	table.insert(recent, serverTime)
	state.RecentCommands = recent

	local ok, accepted = pcall(function()
		return self._movement.ProcessCommand(player, clean, serverTime)
	end)
	if not ok or accepted ~= true then
		return false, "movement adapter rejected command"
	end

	state.LastMovementSequence = clean.Sequence
	if self._replaySink and self._replaySink.RecordAcceptedAction then
		self._replaySink.RecordAcceptedAction(player, {
			Type = "movement",
			Sequence = clean.Sequence,
			ServerTime = serverTime,
			Command = clean,
		})
	end
	return true, clean.Sequence
end

function ActionAuthorityService:SubmitHitscan(player: Player, intent)
	local state = self:_state(player)
	local clean, reason = sanitizeShot(intent)
	if clean == nil then
		return false, reason
	end
	if clean.Sequence <= state.LastShotSequence then
		return false, "stale shot sequence"
	end

	local ok, result = pcall(function()
		return self._resolver.ResolveHitscan(player, clean)
	end)
	if not ok or type(result) ~= "table" or result.serverVerified ~= true then
		return false, "server hit resolver rejected intent"
	end

	state.LastShotSequence = clean.Sequence
	if self._replaySink and self._replaySink.RecordAcceptedAction then
		self._replaySink.RecordAcceptedAction(player, {
			Type = "hitscan",
			Sequence = clean.Sequence,
			ServerTime = workspace:GetServerTimeNow(),
			Intent = clean,
			Result = {
				HitUserId = result.hitUserId,
				HitPosition = result.hitPosition,
			},
		})
	end

	return true, result
end

function ActionAuthorityService:Snapshot(player: Player)
	local state = self:_state(player)
	local ok, snapshot = pcall(function()
		return self._movement.GetSnapshot(player)
	end)
	if not ok or type(snapshot) ~= "table" then
		return nil
	end
	state.LastSnapshot = snapshot
	return snapshot
end

function ActionAuthorityService:PlayerRemoving(player: Player)
	self._players[player] = nil
	if self._movement.RemovePlayer then
		pcall(function()
			self._movement.RemovePlayer(player)
		end)
	end
end

return ActionAuthorityService
