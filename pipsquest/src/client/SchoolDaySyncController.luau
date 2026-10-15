--!strict

-- Presentation-neutral client synchronization. The controller serializes gap
-- recovery, prefers bounded replay, and falls back to an authoritative snapshot.

export type Replica = {
	applySnapshot: (self: Replica, envelope: any) -> any,
	applyLive: (self: Replica, envelope: any) -> any,
	applyReplay: (self: Replica, replay: any) -> any,
	getCurrent: (self: Replica) -> any,
	needsRecovery: (self: Replica) -> boolean,
}

export type Transport = {
	getSnapshot: () -> any,
	getUpdates: (afterSequence: number) -> any,
}

export type Controller = {
	_replica: Replica,
	_transport: Transport,
	_onApplied: (envelope: any) -> (),
	_recovering: boolean,
	_pending: {[number]: any},
	_notify: (self: Controller, applyResult: any) -> (),
	_queueGap: (self: Controller, envelope: any) -> (),
	_drainPending: (self: Controller) -> (),
	_recover: (self: Controller) -> any,
	bootstrap: (self: Controller) -> any,
	handleLive: (self: Controller, envelope: any) -> any,
	isRecovering: (self: Controller) -> boolean,
}

local SchoolDaySyncController = {}
local ControllerMethods = {}
ControllerMethods.__index = ControllerMethods

local function syncResult(status: string, changed: boolean, detail: any?): any
	return table.freeze({
		status = status,
		changed = changed,
		detail = detail,
	})
end

local function currentSequence(replica: Replica): number
	local current = replica:getCurrent()
	return if current ~= nil then current.sequence else 0
end

function SchoolDaySyncController.new(replica: Replica, transport: Transport, onApplied: ((any) -> ())?): Controller
	assert(replica ~= nil, "replica is required")
	assert(transport ~= nil, "transport is required")
	assert(type(transport.getSnapshot) == "function", "transport.getSnapshot is required")
	assert(type(transport.getUpdates) == "function", "transport.getUpdates is required")

	return setmetatable({
		_replica = replica,
		_transport = transport,
		_onApplied = onApplied or function() end,
		_recovering = false,
		_pending = {},
	}, ControllerMethods) :: any
end

function ControllerMethods._notify(self: Controller, applyResult: any)
	if applyResult.changed then
		self._onApplied(self._replica:getCurrent())
	end
end

function ControllerMethods._queueGap(self: Controller, envelope: any)
	if type(envelope) == "table" and type(envelope.sequence) == "number" then
		self._pending[envelope.sequence] = envelope
	end
end

function ControllerMethods._drainPending(self: Controller)
	local sequences = {}
	for sequence in pairs(self._pending) do
		table.insert(sequences, sequence)
	end
	table.sort(sequences)

	for _, sequence in ipairs(sequences) do
		local envelope = self._pending[sequence]
		local applied = self._replica:applyLive(envelope)
		if applied.status == "GAP" then
			break
		end
		self._pending[sequence] = nil
		self:_notify(applied)
	end
end

function ControllerMethods._recover(self: Controller): any
	if self._recovering then
		return syncResult("RECOVERY_ALREADY_RUNNING", false)
	end

	self._recovering = true
	local replayOk, replayResponse = pcall(self._transport.getUpdates, currentSequence(self._replica))
	if replayOk and type(replayResponse) == "table" and replayResponse.ok == true then
		local replayResult = self._replica:applyReplay(replayResponse.replay)
		self:_notify(replayResult)
		self:_drainPending()
	end

	if self._replica:needsRecovery() or self._replica:getCurrent() == nil then
		local snapshotOk, snapshot = pcall(self._transport.getSnapshot)
		if snapshotOk then
			local snapshotResult = self._replica:applySnapshot(snapshot)
			self:_notify(snapshotResult)
			self:_drainPending()
		end
	end

	local recovered = not self._replica:needsRecovery() and self._replica:getCurrent() ~= nil
	self._recovering = false
	return syncResult(if recovered then "RECOVERED" else "RECOVERY_FAILED", recovered)
end

function ControllerMethods.bootstrap(self: Controller): any
	if self._recovering then
		return syncResult("RECOVERY_ALREADY_RUNNING", false)
	end

	self._recovering = true
	local snapshotOk, snapshot = pcall(self._transport.getSnapshot)
	if snapshotOk then
		local snapshotResult = self._replica:applySnapshot(snapshot)
		self:_notify(snapshotResult)
		self:_drainPending()
	end
	self._recovering = false

	if not snapshotOk or self._replica:needsRecovery() or self._replica:getCurrent() == nil then
		return self:_recover()
	end
	return syncResult("BOOTSTRAPPED", true)
end

function ControllerMethods.handleLive(self: Controller, envelope: any): any
	local applied = self._replica:applyLive(envelope)
	self:_notify(applied)
	if applied.status ~= "GAP" then
		return applied
	end

	self:_queueGap(envelope)
	if self._recovering then
		return syncResult("RECOVERY_ALREADY_RUNNING", false, applied)
	end
	return self:_recover()
end

function ControllerMethods.isRecovering(self: Controller): boolean
	return self._recovering
end

return table.freeze(SchoolDaySyncController)
