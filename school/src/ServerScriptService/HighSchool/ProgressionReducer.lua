local CompletionGate = if script
    then require(script.Parent.CompletionGate)
    else require("./CompletionGate")
local CampusCourierActivity = if script
    then require(script.Parent.CampusCourierActivity)
    else require("./CampusCourierActivity")

local ProgressionReducer = {}

ProgressionReducer.VERSION = 2
ProgressionReducer.POINTS_PER_COMPLETION = 10
ProgressionReducer.ACTIVITY_POINTS = 5

local function assertStoredVersionSupported(state)
    if type(state) ~= "table" or state.version == nil then
        return
    end

    local version = state.version
    if type(version) ~= "number"
        or version < 1
        or version % 1 ~= 0
        or version > ProgressionReducer.VERSION
    then
        error("UNSUPPORTED_PROGRESSION_VERSION", 3)
    end
end

local CLASS_IDS = table.freeze({ "math", "ela", "science" })
local POINTS_BY_COMPLETION_CLASS = table.freeze({
    math = ProgressionReducer.POINTS_PER_COMPLETION,
    ela = ProgressionReducer.POINTS_PER_COMPLETION,
    science = ProgressionReducer.POINTS_PER_COMPLETION,
    [CampusCourierActivity.COMPLETION_CLASS_ID] = ProgressionReducer.ACTIVITY_POINTS,
})

local function normalizeCompletionRecord(record, expectedPlayerId, attachOwner, requireCanonicalTypes)
    if type(record) ~= "table" or not POINTS_BY_COMPLETION_CLASS[record.classId] then
        return nil
    end

    if requireCanonicalTypes
        and (type(record.score) ~= "number" or type(record.completedAt) ~= "number")
    then
        return nil
    end

    local score = tonumber(record.score)
    local completedAt = tonumber(record.completedAt)
    local ownerPlayerId = record.ownerPlayerId
    if score ~= 1
        or completedAt == nil
        or completedAt < 1
        or completedAt % 1 ~= 0
        or (ownerPlayerId ~= nil and (
            type(ownerPlayerId) ~= "number"
            or ownerPlayerId < 1
            or ownerPlayerId % 1 ~= 0
            or ownerPlayerId ~= expectedPlayerId
        ))
    then
        return nil
    end

    if attachOwner and ownerPlayerId == nil then
        if type(expectedPlayerId) ~= "number"
            or expectedPlayerId < 1
            or expectedPlayerId % 1 ~= 0
        then
            return nil
        end
        ownerPlayerId = expectedPlayerId
    end

    return {
        classId = record.classId,
        score = score,
        completedAt = completedAt,
        ownerPlayerId = ownerPlayerId,
    }
end

local function isStoredCompletionIdValid(completionId, expectedPlayerId, classId)
    if type(completionId) ~= "string" or completionId == "" then
        return false
    end

    if classId == CampusCourierActivity.COMPLETION_CLASS_ID then
        return CampusCourierActivity.isCompletionIdFor(completionId, expectedPlayerId)
    end

    -- Pre-v2 class receipts used opaque IDs. Preserve truly opaque values during
    -- migration, but never reinterpret another namespaced reward as a class receipt.
    if not completionId:match("^player:") then
        return completionId:find(":", 1, true) == nil
    end

    return CompletionGate.isCompletionIdFor(completionId, expectedPlayerId, classId)
end

local function copyCompleted(source, expectedPlayerId)
    local copy = {}
    if type(source) == "table" then
        for completionId, record in pairs(source) do
            local normalizedRecord = normalizeCompletionRecord(record, expectedPlayerId, true, false)
            if normalizedRecord
                and isStoredCompletionIdValid(
                    completionId,
                    expectedPlayerId,
                    normalizedRecord.classId
                )
            then
                copy[completionId] = normalizedRecord
            end
        end
    end
    return copy
end

local function pointsFromCompleted(completed)
    local points = 0
    for _, record in pairs(completed) do
        points += POINTS_BY_COMPLETION_CLASS[record.classId]
    end
    return points
end

function ProgressionReducer.normalize(state, expectedPlayerId)
    assertStoredVersionSupported(state)
    state = state or {}
    local completed = copyCompleted(state.completed, expectedPlayerId)
    return {
        version = ProgressionReducer.VERSION,
        points = pointsFromCompleted(completed),
        completed = completed,
    }
end

function ProgressionReducer.applyCompletion(currentState, completion)
    assert(type(completion) == "table", "completion required")
    assert(type(completion.completionId) == "string" and completion.completionId ~= "", "completionId required")
    assert(type(completion.playerId) == "number", "playerId required")

    local state = ProgressionReducer.normalize(currentState, completion.playerId)

    if completion.classId == CampusCourierActivity.COMPLETION_CLASS_ID then
        if not CampusCourierActivity.isCompletionIdFor(
            completion.completionId,
            completion.playerId
        ) then
            return state, false, "INVALID_COMPLETION"
        end
    elseif not CompletionGate.isCompletionIdFor(
        completion.completionId,
        completion.playerId,
        completion.classId
    ) then
        return state, false, "INVALID_COMPLETION"
    end

    if state.completed[completion.completionId] then
        return state, false, "DUPLICATE_COMPLETION"
    end

    local record = normalizeCompletionRecord(completion, completion.playerId, true, true)
    if not record then
        return state, false, "INVALID_COMPLETION"
    end

    state.completed[completion.completionId] = record
    state.points += POINTS_BY_COMPLETION_CLASS[record.classId]

    return state, true, nil
end

function ProgressionReducer.toPublicSnapshot(state, playerId)
    local normalized = ProgressionReducer.normalize(state, playerId)
    local reportCard = {}
    for _, classId in ipairs(CLASS_IDS) do
        reportCard[classId] = {
            completedCount = 0,
            points = 0,
            bestScore = 0,
            lastCompletedAt = 0,
        }
    end

    local completedCount = 0
    local activityCompletedCount = 0
    for _, record in pairs(normalized.completed) do
        local subject = reportCard[record.classId]
        if subject then
            completedCount += 1
            subject.completedCount += 1
            subject.points += POINTS_BY_COMPLETION_CLASS[record.classId]
            subject.bestScore = math.max(subject.bestScore, record.score)
            subject.lastCompletedAt = math.max(subject.lastCompletedAt, record.completedAt)
        else
            activityCompletedCount += 1
        end
    end

    local publicReportCard = {}
    for _, classId in ipairs(CLASS_IDS) do
        publicReportCard[classId] = table.freeze(reportCard[classId])
    end

    return table.freeze({
        version = normalized.version,
        points = normalized.points,
        completedCount = completedCount,
        activityCompletedCount = activityCompletedCount,
        reportCard = table.freeze(publicReportCard),
    })
end

return table.freeze(ProgressionReducer)
