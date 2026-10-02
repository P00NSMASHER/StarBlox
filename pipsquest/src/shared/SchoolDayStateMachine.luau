--!strict

-- Pure, server-safe school-day clock. The module owns no Roblox services and
-- performs no persistence or rewards, so a server coordinator can remain the
-- sole authority for when a day starts and which transitions are broadcast.

export type PeriodDefinition = {
	id: string,
	durationSeconds: number,
}

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

export type AdvanceResult = {
	snapshot: Snapshot,
	transitioned: boolean,
	skippedPeriodIds: {string},
}

export type Machine = {
	_periods: {PeriodDefinition},
	_starts: {number},
	_durationSeconds: number,
	getPeriodDefinitions: (self: Machine) -> {PeriodDefinition},
	getDayDurationSeconds: (self: Machine) -> number,
	snapshotAt: (self: Machine, elapsedSeconds: number) -> Snapshot,
	advance: (self: Machine, previous: Snapshot?, elapsedSeconds: number) -> AdvanceResult,
}

local SchoolDayStateMachine = {}
local Machine = {}
Machine.__index = Machine

local function assertFiniteNonNegative(value: number, label: string)
	assert(value == value and value ~= math.huge and value ~= -math.huge, label .. " must be finite")
	assert(value >= 0, label .. " must be non-negative")
end

local function cloneDefinitions(periods: {PeriodDefinition}): {PeriodDefinition}
	assert(#periods > 0, "school day requires at least one period")

	local seen = {}
	local result = table.create(#periods)
	for index, period in ipairs(periods) do
		assert(type(period.id) == "string" and period.id:match("%S") ~= nil, "period id must be non-empty")
		assert(not seen[period.id], "duplicate period id: " .. period.id)
		assertFiniteNonNegative(period.durationSeconds, "durationSeconds")
		assert(period.durationSeconds > 0, "period duration must be positive")
		seen[period.id] = true
		result[index] = table.freeze({
			id = period.id,
			durationSeconds = period.durationSeconds,
		})
	end
	return table.freeze(result)
end

local function freezeSnapshot(snapshot: Snapshot): Snapshot
	return table.freeze(snapshot) :: Snapshot
end

function SchoolDayStateMachine.new(periods: {PeriodDefinition}): Machine
	local definitions = cloneDefinitions(periods)
	local starts = table.create(#definitions)
	local total = 0
	for index, period in ipairs(definitions) do
		starts[index] = total
		total += period.durationSeconds
	end

	return setmetatable({
		_periods = definitions,
		_starts = table.freeze(starts),
		_durationSeconds = total,
	}, Machine) :: any
end

function Machine.getPeriodDefinitions(self: Machine): {PeriodDefinition}
	local result = table.create(#self._periods)
	for index, period in ipairs(self._periods) do
		result[index] = {
			id = period.id,
			durationSeconds = period.durationSeconds,
		}
	end
	return result
end

function Machine.getDayDurationSeconds(self: Machine): number
	return self._durationSeconds
end

function Machine.snapshotAt(self: Machine, elapsedSeconds: number): Snapshot
	assertFiniteNonNegative(elapsedSeconds, "elapsedSeconds")
	local boundedElapsed = math.min(elapsedSeconds, self._durationSeconds)

	for index, period in ipairs(self._periods) do
		local start = self._starts[index]
		local finish = start + period.durationSeconds
		if boundedElapsed < finish then
			local periodElapsed = boundedElapsed - start
			return freezeSnapshot({
				state = "RUNNING",
				elapsedSeconds = boundedElapsed,
				periodId = period.id,
				periodIndex = index,
				periodElapsedSeconds = periodElapsed,
				periodRemainingSeconds = period.durationSeconds - periodElapsed,
				dayDurationSeconds = self._durationSeconds,
				dayProgress = boundedElapsed / self._durationSeconds,
			})
		end
	end

	return freezeSnapshot({
		state = "COMPLETE",
		elapsedSeconds = self._durationSeconds,
		periodId = nil,
		periodIndex = #self._periods + 1,
		periodElapsedSeconds = 0,
		periodRemainingSeconds = 0,
		dayDurationSeconds = self._durationSeconds,
		dayProgress = 1,
	})
end

function Machine.advance(self: Machine, previous: Snapshot?, elapsedSeconds: number): AdvanceResult
	assertFiniteNonNegative(elapsedSeconds, "elapsedSeconds")
	local effectiveElapsed = elapsedSeconds
	if previous ~= nil then
		effectiveElapsed = math.max(effectiveElapsed, previous.elapsedSeconds)
	end

	local snapshot = self:snapshotAt(effectiveElapsed)
	local previousIndex = if previous ~= nil then previous.periodIndex else snapshot.periodIndex
	local transitioned = previous ~= nil and snapshot.periodIndex ~= previousIndex
	local skipped = {}
	if previous ~= nil and snapshot.periodIndex > previousIndex + 1 then
		local lastSkipped = math.min(snapshot.periodIndex - 1, #self._periods)
		for index = previousIndex + 1, lastSkipped do
			table.insert(skipped, self._periods[index].id)
		end
	end

	return table.freeze({
		snapshot = snapshot,
		transitioned = transitioned,
		skippedPeriodIds = table.freeze(skipped),
	}) :: AdvanceResult
end

return table.freeze(SchoolDayStateMachine)
