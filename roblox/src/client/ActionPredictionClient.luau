--!strict

local MAX_PENDING = 180

local ActionPredictionClient = {}
ActionPredictionClient.__index = ActionPredictionClient

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

function ActionPredictionClient.new(predictionAdapter, networkAdapter)
	assert(predictionAdapter ~= nil, "predictionAdapter is required")
	assert(typeof(predictionAdapter.ApplyInput) == "function", "predictionAdapter.ApplyInput is required")
	assert(typeof(predictionAdapter.ReadAuthoritativeState) == "function", "predictionAdapter.ReadAuthoritativeState is required")
	assert(networkAdapter ~= nil, "networkAdapter is required")
	assert(typeof(networkAdapter.SendInput) == "function", "networkAdapter.SendInput is required")

	local self = setmetatable({}, ActionPredictionClient)
	self._prediction = predictionAdapter
	self._network = networkAdapter
	self._nextSequence = 1
	self._serverTick = 0
	self._pending = {}
	self._lastAck = 0
	return self
end

function ActionPredictionClient:BuildInput(raw: {[string]: any})
	assert(finite(raw.ClientTick), "ClientTick must be finite")
	assert(finite(raw.MoveX), "MoveX must be finite")
	assert(finite(raw.MoveZ), "MoveZ must be finite")
	assert(finite(raw.AimX), "AimX must be finite")
	assert(finite(raw.AimY), "AimY must be finite")
	assert(finite(raw.AimZ), "AimZ must be finite")
	assert(typeof(raw.Jump) == "boolean", "Jump must be boolean")
	assert(finite(raw.ActionCode), "ActionCode must be finite")
	assert(finite(raw.TargetUserId), "TargetUserId must be finite")

	local moveX, moveZ = normalizeMove(raw.MoveX, raw.MoveZ)
	local aimX, aimY, aimZ = normalizeAim(raw.AimX, raw.AimY, raw.AimZ)
	local command = {
		Sequence = self._nextSequence,
		ClientTick = math.max(0, math.floor(raw.ClientTick)),
		MoveX = moveX,
		MoveZ = moveZ,
		Jump = raw.Jump,
		AimX = aimX,
		AimY = aimY,
		AimZ = aimZ,
		ActionCode = math.floor(raw.ActionCode),
		TargetUserId = math.max(0, math.floor(raw.TargetUserId)),
	}
	self._nextSequence += 1
	return command
end

function ActionPredictionClient:SendInput(raw: {[string]: any})
	local command = self:BuildInput(raw)

	self._prediction:ApplyInput(command, false)
	table.insert(self._pending, command)
	while #self._pending > MAX_PENDING do
		table.remove(self._pending, 1)
	end

	self._network:SendInput(command)
	return command
end

function ActionPredictionClient:HandleAuthoritativeState(packet: {[string]: any})
	assert(finite(packet.ServerTick), "ServerTick must be finite")
	assert(finite(packet.AckSequence), "AckSequence must be finite")
	assert(packet.Position ~= nil, "authoritative Position is required")
	assert(packet.Velocity ~= nil, "authoritative Velocity is required")

	local ack = math.max(self._lastAck, math.floor(packet.AckSequence))
	self._lastAck = ack
	self._serverTick = math.max(self._serverTick, math.floor(packet.ServerTick))

	local remaining = {}
	for _, command in self._pending do
		if command.Sequence > ack then
			table.insert(remaining, command)
		end
	end
	self._pending = remaining

	self._prediction:ReadAuthoritativeState(packet)
	for _, command in remaining do
		self._prediction:ApplyInput(command, true)
	end

	return {
		ServerTick = self._serverTick,
		AckSequence = ack,
		ReplayedCommands = #remaining,
	}
end

function ActionPredictionClient:GetPendingCount(): number
	return #self._pending
end

function ActionPredictionClient:GetServerTick(): number
	return self._serverTick
end

return ActionPredictionClient
