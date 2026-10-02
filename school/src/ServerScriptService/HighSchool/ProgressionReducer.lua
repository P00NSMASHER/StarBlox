local ProgressionReducer = {}

local function copyCompleted(source)
    local copy = {}
    if source then
        for completionId, record in pairs(source) do
            copy[completionId] = {
                classId = record.classId,
                score = record.score,
                completedAt = record.completedAt,
            }
        end
    end
    return copy
end

function ProgressionReducer.normalize(state)
    state = state or {}
    return {
        version = 1,
        points = tonumber(state.points) or 0,
        completed = copyCompleted(state.completed),
    }
end

function ProgressionReducer.applyCompletion(currentState, completion)
    assert(type(completion) == "table", "completion required")
    assert(type(completion.completionId) == "string" and completion.completionId ~= "", "completionId required")
    assert(type(completion.playerId) == "number", "playerId required")

    local state = ProgressionReducer.normalize(currentState)

    if state.completed[completion.completionId] then
        return state, false
    end

    local score = math.max(0, tonumber(completion.score) or 0)
    state.completed[completion.completionId] = {
        classId = tostring(completion.classId or ""),
        score = score,
        completedAt = tonumber(completion.completedAt) or 0,
    }
    state.points += score * 10

    return state, true
end

function ProgressionReducer.toPublicSnapshot(state)
    local normalized = ProgressionReducer.normalize(state)
    local completedCount = 0
    for _ in pairs(normalized.completed) do
        completedCount += 1
    end

    return table.freeze({
        version = normalized.version,
        points = normalized.points,
        completedCount = completedCount,
    })
end

return table.freeze(ProgressionReducer)
