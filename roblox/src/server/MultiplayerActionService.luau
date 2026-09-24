--!strict

local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local TICK_RATE = 60
local FIXED_DT = 1 / TICK_RATE
local MAX_CATCHUP_TICKS = 4
local MAX_REWIND_TICKS = 60
local MAX_FUTURE_TICKS = 2
local MAX_SEQUENCE_GAP = 120
local MAX_COMMANDS_PER_SECOND = 180
local MAX_SNAPSHOTS = 120

local ACTION_MOVE = 0
local ACTION_INTERACT = 1
local ACTION_PRIMARY = 2
local ACTION_SECONDARY = 3
local ACTION_DASH = 4

local VALID_ACTIONS = {
	[ACTION_MOVE] = true,
	[ACTION_INTERACT] = true,
	[ACTION_PRIMARY] = true,
	[ACTION_SECONDARY] = true,
	[ACTION_DASH] = true,
}

export type Command = {
	Sequence: number,
	ClientTick: number,
	MoveX: number,
	MoveZ: number,
	Jump: boolean,
	AimX: number,
	AimY: number,
	AimZ: number,
	ActionCode: number,
	TargetUserId: number,
}

type PlayerSession = {
	LastAcceptedSequence: number,
	LastProcessedSequence: number,
	Pending: {Command},
	AcceptedTicks: {number},
	CommandHistory: {Command},
}

type SnapshotState = {
	Position: Vector3,
	Velocity: Vector3,
	Radius: number,
}

type Snapshot = {
	Tick: number,
	Players: {[number]: SnapshotState},
}

local MultiplayerActionService = {}
MultiplayerActionService.__index = MultiplayerActionService

local function finite(value: any): boolean
	return typeof(value) == "number" and value == value and value > -math.huge and value < math.huge
end

local function normalizeMove(x: number, z: number): (number, number)
	local magnitude = math.sqrt(x * x + z * z)
	if magnitude <= 1 or magnitude == 0 then
		return x, z
	end
	return x / magnitude, z / magnitude
end

local function normalizeAim(x: number, y: number, z: number): (number, number, number)
	local magnitude = math.sqrt(x * x + y * y + z * z)
	if magnitude < 1e-6 then
		return 0, 0, 0
	end
	return x / magnitude, y / magnitude, z / magnitude
end

local function cleanVector3(value: any): Vector3?
	if typeof(value) == "Vector3" then
		if finite(value.X) and finite(value.Y) and finite(value.Z) then
			return value
		end
	elseif typeof(value) == "table" then
		local x = value.X or value.x
		local y = value.Y or value.y
		local z = value.Z or value.z
		if finite(x) and finite(y) and finite(z) then
			return Vector3.new(x, y, z)
		end
	end
	return nil
end

local function commandKeysAreSafe(raw: {[any]: any}): boolean
	local allowed = {
		Sequence = true,
		ClientTick = true,
		MoveX = true,
		MoveZ = true,
		Jump = true,
		AimX = true,
		AimY = true,
		AimZ = true,
		ActionCode = true,
		TargetUserId = true,
	}

	for key in raw do
		if allowed[key] ~= true then
			return false
		end
	end
	return true
end

function MultiplayerActionService.new(adapters, telemetrySink)
	assert(adapters ~= nil, "MultiplayerAdapters are required")
	assert(adapters.Movement ~= nil, "MultiplayerAdapters.Movement is required")
	assert(typeof(adapters.Movement.ProcessInput) == "function", "Movement.ProcessInput is required")
	assert(typeof(adapters.Movement.GetState) == "function", "Movement.GetState is required")

	local self = setmetatable({}, MultiplayerActionService)
	self._adapters = adapters
	self._telemetrySink = telemetrySink
	self._serverTick = 0
	self._accumulator = 0
	self._sessions = {}
	self._snapshots = {}
	self._heartbeat = nil
	return self
end

function MultiplayerActionService:_emit(name: string, fields: {[string]: any})
	if self._telemetrySink == nil then
		return
	end
	local payload = table.clone(fields)
	payload.Event = name
	payload.ServerTick = self._serverTick
	pcall(self._telemetrySink, payload)
end

function MultiplayerActionService:PlayerAdded(player: Player)
	if self._sessions[player] ~= nil then
		return
	end

	self._sessions[player] = {
		LastAcceptedSequence = 0,
		LastProcessedSequence = 0,
		Pending = {},
		AcceptedTicks = {},
		CommandHistory = {},
	}

	if self._adapters.Movement.Attach ~= nil then
		self._adapters.Movement:Attach(player)
	end
end

function MultiplayerActionService:PlayerRemoving(player: Player)
	self._sessions[player] = nil
	if self._adapters.Movement.Detach ~= nil then
		self._adapters.Movement:Detach(player)
	end
end

function MultiplayerActionService:_sanitizeCommand(raw: any): (Command?, string?)
	if typeof(raw) ~= "table" or not commandKeysAreSafe(raw) then
		return nil, "invalid_fields"
	end

	if not finite(raw.Sequence) or raw.Sequence % 1 ~= 0 or raw.Sequence < 1 then
		return nil, "invalid_sequence"
	end
	if not finite(raw.ClientTick) or raw.ClientTick % 1 ~= 0 or raw.ClientTick < 0 then
		return nil, "invalid_client_tick"
	end
	if raw.ClientTick < math.max(0, self._serverTick - MAX_REWIND_TICKS) then
		return nil, "outside_rewind_window"
	end
	if raw.ClientTick > self._serverTick + MAX_FUTURE_TICKS then
		return nil, "future_tick"
	end

	if not finite(raw.MoveX) or not finite(raw.MoveZ) then
		return nil, "invalid_move"
	end
	if not finite(raw.AimX) or not finite(raw.AimY) or not finite(raw.AimZ) then
		return nil, "invalid_aim"
	end
	if typeof(raw.Jump) ~= "boolean" then
		return nil, "invalid_jump"
	end
	if not finite(raw.ActionCode) or raw.ActionCode % 1 ~= 0 or VALID_ACTIONS[raw.ActionCode] ~= true then
		return nil, "invalid_action"
	end
	if not finite(raw.TargetUserId) or raw.TargetUserId % 1 ~= 0 or raw.TargetUserId < 0 then
		return nil, "invalid_target"
	end

	local moveX, moveZ = normalizeMove(raw.MoveX, raw.MoveZ)
	local aimX, aimY, aimZ = normalizeAim(raw.AimX, raw.AimY, raw.AimZ)

	return {
		Sequence = raw.Sequence,
		ClientTick = raw.ClientTick,
		MoveX = moveX,
		MoveZ = moveZ,
		Jump = raw.Jump,
		AimX = aimX,
		AimY = aimY,
		AimZ = aimZ,
		ActionCode = raw.ActionCode,
		TargetUserId = raw.TargetUserId,
	}, nil
end

function MultiplayerActionService:SubmitInput(player: Player, raw: any): (boolean, string?)
	local session = self._sessions[player]
	if session == nil then
		return false, "no_session"
	end

	local command, errorCode = self:_sanitizeCommand(raw)
	if command == nil then
		self:_emit("MultiplayerInputRejected", {
			UserId = player.UserId,
			Reason = errorCode,
		})
		return false, errorCode
	end

	if command.Sequence <= session.LastAcceptedSequence then
		return false, "duplicate_or_out_of_order_sequence"
	end
	if command.Sequence - session.LastAcceptedSequence > MAX_SEQUENCE_GAP then
		return false, "sequence_gap_too_large"
	end

	local budgetStart = math.max(0, self._serverTick - TICK_RATE)
	local retainedTicks = {}
	for _, tick in session.AcceptedTicks do
		if tick >= budgetStart then
			table.insert(retainedTicks, tick)
		end
	end
	session.AcceptedTicks = retainedTicks
	if #retainedTicks >= MAX_COMMANDS_PER_SECOND then
		return false, "command_budget_exceeded"
	end

	session.LastAcceptedSequence = command.Sequence
	table.insert(session.AcceptedTicks, self._serverTick)
	table.insert(session.Pending, command)
	table.insert(session.CommandHistory, command)
	if #session.CommandHistory > MAX_COMMANDS_PER_SECOND * 2 then
		table.remove(session.CommandHistory, 1)
	end

	return true, nil
end

function MultiplayerActionService:_snapshotAtOrBefore(tick: number): Snapshot?
	local chosen = nil
	for _, snapshot in self._snapshots do
		if snapshot.Tick <= tick then
			chosen = snapshot
		else
			break
		end
	end
	return chosen
end

function MultiplayerActionService:_recordSnapshot()
	local players = {}
	for player in self._sessions do
		local raw = self._adapters.Movement:GetState(player)
		if raw ~= nil then
			local position = cleanVector3(raw.Position)
			local velocity = cleanVector3(raw.Velocity) or Vector3.zero
			if position ~= nil then
				players[player.UserId] = {
					Position = position,
					Velocity = velocity,
					Radius = finite(raw.Radius) and math.max(0.1, raw.Radius) or 2,
				}
			end
		end
	end

	table.insert(self._snapshots, {
		Tick = self._serverTick,
		Players = players,
	})
	while #self._snapshots > MAX_SNAPSHOTS do
		table.remove(self._snapshots, 1)
	end
end

function MultiplayerActionService:_commandAt(player: Player, tick: number, actionCode: number): Command?
	local session = self._sessions[player]
	if session == nil then
		return nil
	end

	local chosen = nil
	for _, command in session.CommandHistory do
		if command.ClientTick <= tick and command.ActionCode == actionCode then
			if chosen == nil
				or command.ClientTick > chosen.ClientTick
				or (command.ClientTick == chosen.ClientTick and command.Sequence > chosen.Sequence)
			then
				chosen = command
			end
		end
	end
	return chosen
end

function MultiplayerActionService:_validatePrimaryGeometry(player: Player, command: Command)
	local target = Players:GetPlayerByUserId(command.TargetUserId)
	if target == nil or target == player then
		return false, "invalid_target", nil
	end

	local rewindTick = math.clamp(
		command.ClientTick,
		math.max(0, self._serverTick - MAX_REWIND_TICKS),
		self._serverTick
	)
	local snapshot = self:_snapshotAtOrBefore(rewindTick)
	if snapshot == nil then
		return false, "no_rewind_snapshot", nil
	end

	local shooterState = snapshot.Players[player.UserId]
	local targetState = snapshot.Players[target.UserId]
	if shooterState == nil or targetState == nil then
		return false, "player_missing_from_snapshot", nil
	end

	local weapon = nil
	if self._adapters.Combat ~= nil and self._adapters.Combat.GetWeaponSpec ~= nil then
		weapon = self._adapters.Combat:GetWeaponSpec(player, ACTION_PRIMARY)
	end
	if weapon == nil or not finite(weapon.Range) then
		return false, "no_server_weapon_spec", nil
	end

	local maxRange = math.max(0.1, weapon.Range)
	local minAimDot = finite(weapon.MinAimDot) and math.clamp(weapon.MinAimDot, -1, 1) or 0.92
	local offset = targetState.Position - shooterState.Position
	local distance = offset.Magnitude
	if distance > maxRange + targetState.Radius then
		return false, "target_out_of_range", nil
	end

	local aim = Vector3.new(command.AimX, command.AimY, command.AimZ)
	if aim.Magnitude < 1e-6 then
		return false, "missing_aim", nil
	end
	local aimDot = aim.Unit:Dot(distance > 1e-6 and offset.Unit or aim.Unit)
	if aimDot < minAimDot then
		return false, "target_outside_aim_cone", nil
	end

	return true, nil, {
		Target = target,
		Weapon = weapon,
		RewindTick = rewindTick,
		Origin = shooterState.Position,
		Aim = aim.Unit,
		Distance = distance,
		Sequence = command.Sequence,
	}
end

function MultiplayerActionService:_resolvePrimary(player: Player, command: Command)
	local valid, reason, context = self:_validatePrimaryGeometry(player, command)
	if not valid or context == nil then
		self:_emit("MultiplayerPrimaryRejected", {
			UserId = player.UserId,
			Sequence = command.Sequence,
			Reason = reason,
		})
		return
	end

	if self._adapters.Combat == nil or self._adapters.Combat.ValidateLineOfSight == nil then
		return
	end

	local lineOfSight = self._adapters.Combat:ValidateLineOfSight(
		player,
		context.Target,
		context.Origin,
		context.Aim,
		context.Weapon.Range,
		context.RewindTick
	)
	if lineOfSight ~= true then
		self:_emit("MultiplayerPrimaryRejected", {
			UserId = player.UserId,
			Sequence = command.Sequence,
			Reason = "line_of_sight_rejected",
		})
		return
	end

	local damage = finite(context.Weapon.Damage) and math.max(0, context.Weapon.Damage) or 0
	if damage <= 0 or self._adapters.Combat.ApplyDamage == nil then
		return
	end

	self._adapters.Combat:ApplyDamage(player, context.Target, damage, {
		ServerTick = self._serverTick,
		RewindTick = context.RewindTick,
		Sequence = command.Sequence,
	})

	if self._adapters.Network ~= nil and self._adapters.Network.SendConfirmedAction ~= nil then
		self._adapters.Network:SendConfirmedAction(player, {
			Sequence = command.Sequence,
			ActionCode = ACTION_PRIMARY,
			TargetUserId = context.Target.UserId,
			OutcomeCode = 1,
		})
	end
end

function MultiplayerActionService:_processPlayer(player: Player, session: PlayerSession)
	table.sort(session.Pending, function(a, b)
		return a.Sequence < b.Sequence
	end)

	local remaining = {}
	for _, command in session.Pending do
		if command.Sequence <= session.LastProcessedSequence then
			continue
		end

		self._adapters.Movement:ProcessInput(player, command, FIXED_DT, self._serverTick)
		session.LastProcessedSequence = command.Sequence

		if command.ActionCode == ACTION_PRIMARY then
			self:_resolvePrimary(player, command)
		end
	end
	session.Pending = remaining
end

function MultiplayerActionService:_sendAuthoritativeStates()
	if self._adapters.Network == nil or self._adapters.Network.SendState == nil then
		return
	end

	for player, session in self._sessions do
		local raw = self._adapters.Movement:GetState(player)
		if raw == nil then
			continue
		end
		local position = cleanVector3(raw.Position)
		local velocity = cleanVector3(raw.Velocity) or Vector3.zero
		if position == nil then
			continue
		end

		self._adapters.Network:SendState(player, {
			ServerTick = self._serverTick,
			AckSequence = session.LastProcessedSequence,
			Position = position,
			Velocity = velocity,
		})
	end
end

function MultiplayerActionService:_stepFixed()
	self._serverTick += 1
	for player, session in self._sessions do
		if player.Parent == Players then
			self:_processPlayer(player, session)
		end
	end
	self:_recordSnapshot()
	self:_sendAuthoritativeStates()
end

function MultiplayerActionService:Step(deltaTime: number)
	self._accumulator += math.max(0, deltaTime)
	local ticks = 0
	while self._accumulator >= FIXED_DT and ticks < MAX_CATCHUP_TICKS do
		self._accumulator -= FIXED_DT
		ticks += 1
		self:_stepFixed()
	end
	if ticks == MAX_CATCHUP_TICKS and self._accumulator > FIXED_DT * MAX_CATCHUP_TICKS then
		self._accumulator = FIXED_DT * MAX_CATCHUP_TICKS
	end
end

function MultiplayerActionService:Start()
	if self._heartbeat ~= nil then
		return
	end
	self._heartbeat = RunService.Heartbeat:Connect(function(deltaTime)
		self:Step(deltaTime)
	end)
end

function MultiplayerActionService:Destroy()
	if self._heartbeat ~= nil then
		self._heartbeat:Disconnect()
		self._heartbeat = nil
	end
	for player in self._sessions do
		self:PlayerRemoving(player)
	end
end

function MultiplayerActionService:GetServerTick(): number
	return self._serverTick
end

return MultiplayerActionService
