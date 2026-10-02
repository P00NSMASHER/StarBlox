--!strict

-- Pure boundary from already-authoritative gameplay receipts to quest progress
-- events. It owns no rewards, persistence, attendance, grades, mastery, or
-- balancing. Callers supply explicit bindings instead of encoding product rules.

export type Binding = {
	objectiveId: string,
	source: string,
	signal: string,
	progressPerReceipt: number,
}

export type Receipt = {
	receiptId: string,
	source: string,
	signal: string,
}

export type ProgressEvent = {
	eventId: string,
	objectiveId: string,
	delta: number,
}

export type AdapterResult = {
	accepted: boolean,
	event: ProgressEvent?,
	errorCode: string?,
}

local QuestObjectiveEventAdapter = {}

local function isFinite(value: number): boolean
	return value == value and value ~= math.huge and value ~= -math.huge
end

local function isNonEmptyString(value: any): boolean
	return type(value) == "string" and value:match("%S") ~= nil
end

local function reject(errorCode: string): AdapterResult
	return table.freeze({
		accepted = false,
		event = nil,
		errorCode = errorCode,
	})
end

local function encodeSegment(value: string): string
	-- Length-prefixing prevents delimiter collisions in deterministic receipt IDs.
	return tostring(#value) .. ":" .. value
end

local function eventIdFor(binding: Binding, receipt: Receipt): string
	return table.concat({
		"qevt/v1",
		encodeSegment(receipt.source),
		encodeSegment(receipt.signal),
		encodeSegment(receipt.receiptId),
		encodeSegment(binding.objectiveId),
	}, "|")
end

function QuestObjectiveEventAdapter.toProgressEvent(binding: any, receipt: any): AdapterResult
	if type(binding) ~= "table"
		or not isNonEmptyString(binding.objectiveId)
		or not isNonEmptyString(binding.source)
		or not isNonEmptyString(binding.signal)
		or type(binding.progressPerReceipt) ~= "number"
		or not isFinite(binding.progressPerReceipt)
		or binding.progressPerReceipt <= 0 then
		return reject("INVALID_BINDING")
	end

	if type(receipt) ~= "table"
		or not isNonEmptyString(receipt.receiptId)
		or not isNonEmptyString(receipt.source)
		or not isNonEmptyString(receipt.signal) then
		return reject("INVALID_RECEIPT")
	end

	if receipt.source ~= binding.source then
		return reject("SOURCE_MISMATCH")
	end
	if receipt.signal ~= binding.signal then
		return reject("SIGNAL_MISMATCH")
	end

	local normalizedBinding = binding :: Binding
	local normalizedReceipt = receipt :: Receipt
	local event = table.freeze({
		eventId = eventIdFor(normalizedBinding, normalizedReceipt),
		objectiveId = normalizedBinding.objectiveId,
		delta = normalizedBinding.progressPerReceipt,
	}) :: ProgressEvent

	return table.freeze({
		accepted = true,
		event = event,
		errorCode = nil,
	})
end

return table.freeze(QuestObjectiveEventAdapter)
