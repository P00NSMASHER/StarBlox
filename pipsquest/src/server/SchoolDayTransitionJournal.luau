--!strict

-- Bounded, in-memory transition replay for clients that briefly miss a
-- SnapshotChanged event. It stores only immutable school-day envelopes and
-- owns no persistence, rewards, attendance, or player state.

export type Envelope = {
	sequence: number,
}

export type Replay = {
	events: {Envelope},
	gapDetected: boolean,
	oldestSequence: number?,
	latestSequence: number?,
}

export type Journal = {
	_capacity: number,
	_events: {Envelope},
	append: (self: Journal, envelope: Envelope) -> boolean,
	readAfter: (self: Journal, sequence: number) -> Replay,
	getLatest: (self: Journal) -> Envelope?,
}

local SchoolDayTransitionJournal = {}
local JournalMethods = {}
JournalMethods.__index = JournalMethods

local function assertSequence(sequence: number, label: string)
	assert(sequence == sequence and sequence ~= math.huge and sequence ~= -math.huge, label .. " must be finite")
	assert(sequence >= 0 and sequence == math.floor(sequence), label .. " must be a non-negative integer")
end

function SchoolDayTransitionJournal.new(capacity: number): Journal
	assertSequence(capacity, "capacity")
	assert(capacity > 0, "capacity must be positive")

	return setmetatable({
		_capacity = capacity,
		_events = {},
	}, JournalMethods) :: any
end


function JournalMethods.append(self: Journal, envelope: Envelope): boolean
	assert(envelope ~= nil, "envelope is required")
	assertSequence(envelope.sequence, "envelope.sequence")
	assert(envelope.sequence > 0, "envelope.sequence must be positive")

	local latest = self._events[#self._events]
	if latest ~= nil and envelope.sequence <= latest.sequence then
		return false
	end

	table.insert(self._events, envelope)
	if #self._events > self._capacity then
		table.remove(self._events, 1)
	end
	return true
end


function JournalMethods.readAfter(self: Journal, sequence: number): Replay
	assertSequence(sequence, "sequence")
	local oldest = self._events[1]
	local latest = self._events[#self._events]
	local events = {}

	for _, envelope in ipairs(self._events) do
		if envelope.sequence > sequence then
			table.insert(events, envelope)
		end
	end

	return table.freeze({
		events = table.freeze(events),
		gapDetected = oldest ~= nil and sequence < oldest.sequence - 1,
		oldestSequence = if oldest ~= nil then oldest.sequence else nil,
		latestSequence = if latest ~= nil then latest.sequence else nil,
	}) :: Replay
end


function JournalMethods.getLatest(self: Journal): Envelope?
	return self._events[#self._events]
end


return table.freeze(SchoolDayTransitionJournal)
