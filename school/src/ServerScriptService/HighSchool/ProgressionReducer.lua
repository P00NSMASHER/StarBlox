local ProgressionReducer = {}

ProgressionReducer.VERSION = 2
ProgressionReducer.POINTS_PER_COMPLETION = 10

local CLASS_IDS = table.freeze({ "math", "ela", "science" })
local VALID_CLASS_IDS = table.freeze({
    math = true,
    ela = true,
    science = true,
})

local function normalizeCompletionRecord(record)
    if type(record) ~= "table" or not VALID_CLASS_IDS[record.classId] then
        return nil
    end

    local score = tonumber(record.score)
    local completedAt = tonumber(record.completedAt)
    if score ~= 1
        or completedAt == nil
        or completedAt < 1
        or completedAt % 1 ~= 0
    then
        return nil
    end

    return {
        classId = record.classId,
        score = score,
        completedAt = completedAt,
    }
end

local function copyCompleted(source)
    local copy = {}
    if type(source) == "table" then
        for completionId, record in pairs(source) do
            local normalizedRecord = normalizeCompletionRecord(record)
            if type(completionId) == "string"
                and completionId ~= ""
                and normalizedRecord
            then
                copy[completionId] = normalizedRecord
            end
        end
    end
    return copy
end

local function pointsFromCompleted(completed)
    local points = 0
    for _ in pairs(completed) do
        points += ProgressionReducer.POINTS_PER_COMPLETION
    end
    return points
end

function ProgressionReducer.normalize(state)
    state = state or {}
    local completed = copyCompleted(state.completed)
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

    local state = ProgressionReducer.normalize(currentState)

    if state.completed[completion.completionId] then
        return state, false, "DUPLICATE_COMPLETION"
    end

    local record = normalizeCompletionRecord(completion)
    if not record then
        return state, false, "INVALID_COMPLETION"
    end

    state.completed[completion.completionId] = record
    state.points += ProgressionReducer.POINTS_PER_COMPLETION

    return state, true, nil
end

function ProgressionReducer.toPublicSnapshot(state)
    local normalized = ProgressionReducer.normalize(state)
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
    for _, record in pairs(normalized.completed) do
        local subject = reportCard[record.classId]
        completedCount += 1
        subject.completedCount += 1
        subject.points += ProgressionReducer.POINTS_PER_COMPLETION
        subject.bestScore = math.max(subject.bestScore, record.score)
        subject.lastCompletedAt = math.max(subject.lastCompletedAt, record.completedAt)
    end

    local publicReportCard = {}
    for _, classId in ipairs(CLASS_IDS) do
        publicReportCard[classId] = table.freeze(reportCard[classId])
    end

    return table.freeze({
        version = normalized.version,
        points = normalized.points,
        completedCount = completedCount,
        reportCard = table.freeze(publicReportCard),
    })
end

return table.freeze(ProgressionReducer)
