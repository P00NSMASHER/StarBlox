--!strict

-- Pure coordinator for a recurring school day. Roblox service wiring lives in
-- SchoolDayRuntime.server.luau so rollover and catch-up behavior can be tested
-- without clients, remotes, persistence, or wall-clock dependencies.

export type Snapshot = {
	state: "RUNNING" | "COMPLETE",
	elapsedSeconds: number,
	periodId: string?,
	periodIndex: number,
	periodElapsedSeconds: number,
	periodRemainingSeconds: number,
	dayDurationSeconds: number,
	dayProgress: number,
}

export type Machine = {
	getDayDurationSeconds: (self: Machine) -> number,
	snapshotAt: (self: Machine, elapsedSeconds: number) -> Snapshot,
	advance: (self: Machine, previous: Snapshot?, elapsedSeconds: number) -> {
		snapshot: Snapshot,
		transitioned: boolean,
		skippedPeriodIds: {string},
	},
}

export type Envelope = {
	protocolVersion: number,
	sequence: number,
	dayNumber: number,
	serverTime: number,
	dayStartedAtServerTime: number,
	nextTransitionServerTime: number,
	inIntermission: boolean,
	transitionReason: "INITIAL" | "PERIOD_CHANGED" | "DAY_STARTED" | "NONE",
	skippedDayCount: number,
	skippedPeriodIds: {string},
	snapshot: Snapshot,
}

export type StepResult = {
	changed: boolean,
	envelope: Envelope,
}

export type Coordinator = {
	_machine: Machine,
	_startServerTime: number,
	_lastServerTime: number,
	_intermissionSeconds: number,
	_cycleDurationSeconds: number,
	_dayNumber: number,
	_sequence: number,
	_snapshot: Snapshot,
	step: (self: Coordinator, serverTime: number) -> StepResult,
}

local SchoolDayCoordinator = {}
local CoordinatorMethods = {}
CoordinatorMethods.__index = CoordinatorMethods

local function assertFinite(value: number, label: string)
	assert(value == value and value ~= math.huge and value ~= -math.huge, label .. " must be finite")
end

local function copyStrings(values: {string}): {string}
	local result = table.create(#values)
	for index, value in ipairs(values) do
		result[index] = value
	end
	return table.freeze(result)
end

function SchoolDayCoordinator.new(machine: Machine, startServerTime: number, intermissionSeconds: number?): Coordinator
	assert(machine ~= nil, "machine is required")
	assertFinite(startServerTime, "startServerTime")
	local intermission = intermissionSeconds or 0
	assertFinite(intermission, "intermissionSeconds")
	assert(intermission >= 0, "intermissionSeconds must be non-negative")

	local dayDuration = machine:getDayDurationSeconds()
	assert(dayDuration > 0, "machine day duration must be positive")

	return setmetatable({
		_machine = machine,
		_startServerTime = startServerTime,
		_lastServerTime = startServerTime,
		_intermissionSeconds = intermission,
		_cycleDurationSeconds = dayDuration + intermission,
		_dayNumber = 1,
		_sequence = 1,
		_snapshot = machine:snapshotAt(0),
	}, CoordinatorMethods) :: any
end

function CoordinatorMethods.step(self: Coordinator, serverTime: number): StepResult
	assertFinite(serverTime, "serverTime")
	local effectiveTime = math.max(serverTime, self._lastServerTime, self._startServerTime)
	self._lastServerTime = effectiveTime

	local totalElapsed = effectiveTime - self._startServerTime
	local cycleIndex = math.floor(totalElapsed / self._cycleDurationSeconds)
	local dayNumber = cycleIndex + 1
	local dayElapsed = totalElapsed - cycleIndex * self._cycleDurationSeconds
	local dayDuration = self._machine:getDayDurationSeconds()
	local boundedDayElapsed = math.min(dayElapsed, dayDuration)

	local changed = false
	local reason: "INITIAL" | "PERIOD_CHANGED" | "DAY_STARTED" | "NONE" = "NONE"
	local skippedDayCount = 0
	local skippedPeriodIds = {}

	if dayNumber ~= self._dayNumber then
		skippedDayCount = math.max(0, dayNumber - self._dayNumber - 1)
		self._dayNumber = dayNumber
		self._snapshot = self._machine:snapshotAt(boundedDayElapsed)
		self._sequence += 1
		changed = true
		reason = "DAY_STARTED"
	else
		local advanceResult = self._machine:advance(self._snapshot, boundedDayElapsed)
		self._snapshot = advanceResult.snapshot
		if advanceResult.transitioned then
			self._sequence += 1
			changed = true
			reason = "PERIOD_CHANGED"
			skippedPeriodIds = advanceResult.skippedPeriodIds
		end
	end

	local dayStartedAt = self._startServerTime + cycleIndex * self._cycleDurationSeconds
	local inIntermission = dayElapsed >= dayDuration
	local nextTransitionAt
	if inIntermission then
		nextTransitionAt = dayStartedAt + self._cycleDurationSeconds
	else
		nextTransitionAt = effectiveTime + self._snapshot.periodRemainingSeconds
	end

	local envelope: Envelope = table.freeze({
		protocolVersion = 1,
		sequence = self._sequence,
		dayNumber = self._dayNumber,
		serverTime = effectiveTime,
		dayStartedAtServerTime = dayStartedAt,
		nextTransitionServerTime = nextTransitionAt,
		inIntermission = inIntermission,
		transitionReason = reason,
		skippedDayCount = skippedDayCount,
		skippedPeriodIds = copyStrings(skippedPeriodIds),
		snapshot = self._snapshot,
	})

	return table.freeze({
		changed = changed,
		envelope = envelope,
	}) :: StepResult
end

return table.freeze(SchoolDayCoordinator)
