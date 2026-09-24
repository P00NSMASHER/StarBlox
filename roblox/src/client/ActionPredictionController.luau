--!strict

local ActionPredictionController = {}
ActionPredictionController.__index = ActionPredictionController

local MAX_PENDING = 180

function ActionPredictionController.new(adapters)
	assert(adapters ~= nil, "prediction adapters are required")
	assert(adapters.Predict ~= nil, "Predict adapter is required")
	assert(adapters.SendInput ~= nil, "SendInput adapter is required")
	assert(adapters.ApplyAuthoritative ~= nil, "ApplyAuthoritative adapter is required")

	local self = setmetatable({}, ActionPredictionController)
	self._adapters = adapters
	self._nextSeq = 0
	self._pending = {}
	return self
end

function ActionPredictionController:Submit(moveX: number, moveZ: number, jump: boolean, dt: number, clientTime: number)
	assert(type(moveX) == "number" and type(moveZ) == "number", "movement input must be numeric")
	assert(type(dt) == "number" and dt > 0, "dt must be positive")
	assert(type(clientTime) == "number", "clientTime must be numeric")

	local command = {
		Seq = self._nextSeq,
		ClientTime = clientTime,
		Dt = dt,
		MoveX = moveX,
		MoveZ = moveZ,
		Jump = jump == true,
	}
	self._nextSeq += 1

	table.insert(self._pending, command)
	while #self._pending > MAX_PENDING do
		table.remove(self._pending, 1)
	end

	-- Prediction is cosmetic responsiveness. The server independently processes
	-- the same bounded input and remains the source of truth.
	self._adapters.Predict(command, false)
	self._adapters.SendInput(command)
	return command
end

function ActionPredictionController:Reconcile(snapshot)
	assert(type(snapshot) == "table", "authoritative snapshot is required")
	assert(type(snapshot.AckSeq) == "number", "snapshot AckSeq is required")

	local replay = {}
	for _, command in self._pending do
		if command.Seq > snapshot.AckSeq then
			table.insert(replay, command)
		end
	end
	self._pending = replay

	self._adapters.ApplyAuthoritative(snapshot)
	for _, command in replay do
		self._adapters.Predict(command, true)
	end

	return {
		AckSeq = snapshot.AckSeq,
		Replayed = #replay,
	}
end

function ActionPredictionController:PendingCount(): number
	return #self._pending
end

return ActionPredictionController
