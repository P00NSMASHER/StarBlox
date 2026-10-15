--!strict

-- Pure client-side sequence reconciler for authoritative school-day data.
-- Networking and presentation are intentionally separate so stale, duplicate,
-- and gapped delivery behavior can be tested without Roblox services or UI.

export type Envelope = {
	protocolVersion: number,
	sequence: number,
}

export type ApplyResult = {
	status: "APPLIED" | "IGNORED_STALE" | "GAP" | "SNAPSHOT_REQUIRED" | "INVALID" | "NO_CHANGE",
	changed: boolean,
	expectedSequence: number?,
	receivedSequence: number?,
}

export type Replica = {
	_current: Envelope?,
	_needsRecovery: boolean,
	applySnapshot: (self: Replica, envelope: any) -> ApplyResult,
	applyLive: (self: Replica, envelope: any) -> ApplyResult,
	applyReplay: (self: Replica, replay: any) -> ApplyResult,
	getCurrent: (self: Replica) -> Envelope?,
	needsRecovery: (self: Replica) -> boolean,
}

local SchoolDayReplica = {}
local ReplicaMethods = {}
ReplicaMethods.__index = ReplicaMethods

local function isPositiveInteger(value: any): boolean
	return type(value) == "number"
		and value == value
		and value ~= math.huge
		and value ~= -math.huge
		and value > 0
		and value == math.floor(value)
end

local function isValidEnvelope(envelope: any): boolean
	return type(envelope) == "table"
		and envelope.protocolVersion == 1
		and isPositiveInteger(envelope.sequence)
end

local function result(
	status: "APPLIED" | "IGNORED_STALE" | "GAP" | "SNAPSHOT_REQUIRED" | "INVALID" | "NO_CHANGE",
	changed: boolean,
	expectedSequence: number?,
	receivedSequence: number?
): ApplyResult
	return table.freeze({
		status = status,
		changed = changed,
		expectedSequence = expectedSequence,
		receivedSequence = receivedSequence,
	}) :: ApplyResult
end

function SchoolDayReplica.new(): Replica
	return setmetatable({
		_current = nil,
		_needsRecovery = false,
	}, ReplicaMethods) :: any
end

function ReplicaMethods.applySnapshot(self: Replica, envelope: any): ApplyResult
	if not isValidEnvelope(envelope) then
		return result("INVALID", false, nil, nil)
	end

	local current = self._current
	if current ~= nil and envelope.sequence < current.sequence then
		return result("IGNORED_STALE", false, current.sequence, envelope.sequence)
	end

	self._current = envelope
	self._needsRecovery = false
	return result("APPLIED", true, nil, envelope.sequence)
end

function ReplicaMethods.applyLive(self: Replica, envelope: any): ApplyResult
	if not isValidEnvelope(envelope) then
		return result("INVALID", false, nil, nil)
	end

	local current = self._current
	local expectedSequence = if current ~= nil then current.sequence + 1 else 1
	if current ~= nil and envelope.sequence <= current.sequence then
		return result("IGNORED_STALE", false, expectedSequence, envelope.sequence)
	end
	if envelope.sequence ~= expectedSequence then
		self._needsRecovery = true
		return result("GAP", false, expectedSequence, envelope.sequence)
	end

	self._current = envelope
	self._needsRecovery = false
	return result("APPLIED", true, expectedSequence, envelope.sequence)
end

function ReplicaMethods.applyReplay(self: Replica, replay: any): ApplyResult
	if type(replay) ~= "table" or type(replay.events) ~= "table" or type(replay.gapDetected) ~= "boolean" then
		return result("INVALID", false, nil, nil)
	end
	if replay.gapDetected then
		self._needsRecovery = true
		return result("SNAPSHOT_REQUIRED", false, nil, nil)
	end

	local current = self._current
	local cursor = if current ~= nil then current.sequence else 0
	local latestToApply = current

	for _, envelope in ipairs(replay.events) do
		if not isValidEnvelope(envelope) then
			self._needsRecovery = true
			return result("INVALID", false, cursor + 1, nil)
		end
		if envelope.sequence > cursor then
			if envelope.sequence ~= cursor + 1 then
				self._needsRecovery = true
				return result("SNAPSHOT_REQUIRED", false, cursor + 1, envelope.sequence)
			end
			cursor = envelope.sequence
			latestToApply = envelope
		end
	end

	if latestToApply == current then
		return result("NO_CHANGE", false, cursor + 1, nil)
	end

	self._current = latestToApply
	self._needsRecovery = false
	return result("APPLIED", true, nil, cursor)
end

function ReplicaMethods.getCurrent(self: Replica): Envelope?
	return self._current
end

function ReplicaMethods.needsRecovery(self: Replica): boolean
	return self._needsRecovery
end

return table.freeze(SchoolDayReplica)
