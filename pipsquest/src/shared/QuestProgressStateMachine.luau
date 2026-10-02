--!strict

-- Pure quest-progress state. It owns no rewards, persistence service, school-day
-- timing, attendance, grades, mastery, economy, or player data. Those systems
-- feed validated objective events into this module through thin adapters.

local SCHEMA_VERSION = 1

export type ObjectiveDefinition = {
	id: string,
	required: number,
}

export type Definition = {
	id: string,
	revision: number,
	objectives: {ObjectiveDefinition},
}

export type ProgressEvent = {
	eventId: string,
	objectiveId: string,
	delta: number,
}

export type PersistedState = {
	schemaVersion: number,
	questId: string,
	questRevision: number,
	status: "ACTIVE" | "COMPLETED",
	objectiveProgress: {[string]: number},
	receipts: {[string]: boolean},
}

export type RestoreResult = {
	accepted: boolean,
	state: PersistedState?,
	errorCode: string?,
}

export type ApplyResult = {
	accepted: boolean,
	changed: boolean,
	state: PersistedState?,
	errorCode: string?,
}

export type Machine = {
	_definition: Definition,
	_objectiveById: {[string]: ObjectiveDefinition},
	fresh: (self: Machine) -> PersistedState,
	restore: (self: Machine, saved: any) -> RestoreResult,
	apply: (self: Machine, state: PersistedState, event: ProgressEvent) -> ApplyResult,
}

local QuestProgressStateMachine = {}
local MachineMethods = {}
MachineMethods.__index = MachineMethods

local function isFinite(value: number): boolean
	return value == value and value ~= math.huge and value ~= -math.huge
end

local function assertNonEmptyString(value: any, label: string)
	assert(type(value) == "string" and value:match("%S") ~= nil, label .. " must be a non-empty string")
end

local function normalizeDefinition(definition: Definition): (Definition, {[string]: ObjectiveDefinition})
	assert(type(definition) == "table", "definition is required")
	assertNonEmptyString(definition.id, "definition.id")
	assert(type(definition.revision) == "number" and isFinite(definition.revision), "definition.revision must be finite")
	assert(definition.revision > 0 and definition.revision == math.floor(definition.revision), "definition.revision must be a positive integer")
	assert(type(definition.objectives) == "table" and #definition.objectives > 0, "definition requires objectives")

	local objectiveById: {[string]: ObjectiveDefinition} = {}
	local objectives = table.create(#definition.objectives)
	for index, objective in ipairs(definition.objectives) do
		assertNonEmptyString(objective.id, "objective.id")
		assert(objectiveById[objective.id] == nil, "duplicate objective id: " .. objective.id)
		assert(type(objective.required) == "number" and isFinite(objective.required), "objective.required must be finite")
		assert(objective.required > 0, "objective.required must be positive")
		local normalized = table.freeze({
			id = objective.id,
			required = objective.required,
		}) :: ObjectiveDefinition
		objectiveById[objective.id] = normalized
		objectives[index] = normalized
	end

	return table.freeze({
		id = definition.id,
		revision = definition.revision,
		objectives = table.freeze(objectives),
	}) :: Definition, table.freeze(objectiveById)
end

local function deriveStatus(definition: Definition, progress: {[string]: number}): "ACTIVE" | "COMPLETED"
	for _, objective in ipairs(definition.objectives) do
		if (progress[objective.id] or 0) < objective.required then
			return "ACTIVE"
		end
	end
	return "COMPLETED"
end

local function freezeState(definition: Definition, progress: {[string]: number}, receipts: {[string]: boolean}): PersistedState
	return table.freeze({
		schemaVersion = SCHEMA_VERSION,
		questId = definition.id,
		questRevision = definition.revision,
		status = deriveStatus(definition, progress),
		objectiveProgress = table.freeze(progress),
		receipts = table.freeze(receipts),
	}) :: PersistedState
end

local function rejected(errorCode: string): RestoreResult
	return table.freeze({
		accepted = false,
		state = nil,
		errorCode = errorCode,
	})
end

function QuestProgressStateMachine.new(definition: Definition): Machine
	local normalizedDefinition, objectiveById = normalizeDefinition(definition)
	return setmetatable({
		_definition = normalizedDefinition,
		_objectiveById = objectiveById,
	}, MachineMethods) :: any
end

function MachineMethods.fresh(self: Machine): PersistedState
	local progress: {[string]: number} = {}
	for _, objective in ipairs(self._definition.objectives) do
		progress[objective.id] = 0
	end
	return freezeState(self._definition, progress, {})
end

function MachineMethods.restore(self: Machine, saved: any): RestoreResult
	if type(saved) ~= "table" then
		return rejected("INVALID_SAVED_STATE")
	end
	if saved.schemaVersion ~= SCHEMA_VERSION then
		return rejected("SCHEMA_MISMATCH")
	end
	if saved.questId ~= self._definition.id then
		return rejected("QUEST_MISMATCH")
	end
	if saved.questRevision ~= self._definition.revision then
		return rejected("REVISION_MISMATCH")
	end

	local rawProgress = if type(saved.objectiveProgress) == "table" then saved.objectiveProgress else {}
	local progress: {[string]: number} = {}
	for _, objective in ipairs(self._definition.objectives) do
		local value = rawProgress[objective.id]
		if type(value) ~= "number" or not isFinite(value) then
			value = 0
		end
		progress[objective.id] = math.clamp(value, 0, objective.required)
	end

	local receipts: {[string]: boolean} = {}
	if type(saved.receipts) == "table" then
		for eventId, consumed in pairs(saved.receipts) do
			if type(eventId) == "string" and eventId:match("%S") ~= nil and consumed == true then
				receipts[eventId] = true
			end
		end
	end

	return table.freeze({
		accepted = true,
		state = freezeState(self._definition, progress, receipts),
		errorCode = nil,
	})
end

function MachineMethods.apply(self: Machine, state: PersistedState, event: ProgressEvent): ApplyResult
	local restored = self:restore(state)
	if not restored.accepted or restored.state == nil then
		return table.freeze({
			accepted = false,
			changed = false,
			state = nil,
			errorCode = restored.errorCode,
		})
	end

	assertNonEmptyString(event.eventId, "event.eventId")
	assertNonEmptyString(event.objectiveId, "event.objectiveId")
	assert(type(event.delta) == "number" and isFinite(event.delta) and event.delta > 0, "event.delta must be finite and positive")

	local current = restored.state
	if current.receipts[event.eventId] == true then
		return table.freeze({
			accepted = true,
			changed = false,
			state = current,
			errorCode = nil,
		})
	end

	local objective = self._objectiveById[event.objectiveId]
	if objective == nil then
		return table.freeze({
			accepted = false,
			changed = false,
			state = current,
			errorCode = "UNKNOWN_OBJECTIVE",
		})
	end

	local progress: {[string]: number} = {}
	for objectiveId, value in pairs(current.objectiveProgress) do
		progress[objectiveId] = value
	end
	progress[event.objectiveId] = math.min(objective.required, progress[event.objectiveId] + event.delta)

	local receipts: {[string]: boolean} = {}
	for eventId, consumed in pairs(current.receipts) do
		receipts[eventId] = consumed
	end
	receipts[event.eventId] = true

	return table.freeze({
		accepted = true,
		changed = true,
		state = freezeState(self._definition, progress, receipts),
		errorCode = nil,
	})
end

return table.freeze(QuestProgressStateMachine)
