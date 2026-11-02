local DataStoreService = game:GetService("DataStoreService")
local ProgressionReducer = require(script.Parent:WaitForChild("ProgressionReducer"))

local ProgressionStore = {}

local dataStore = DataStoreService:GetDataStore("HighSchoolProgressionV1")

local function keyForPlayer(playerId)
    return "player:" .. tostring(playerId)
end

function ProgressionStore.load(playerId)
    local ok, state = pcall(function()
        local data = dataStore:GetAsync(keyForPlayer(playerId))
        return ProgressionReducer.normalize(data, playerId)
    end)

    if not ok then
        return nil, "LOAD_FAILED"
    end

    return state
end

function ProgressionStore.applyCompletion(completion)
    local applied = false
    local updatedState

    local ok = pcall(function()
        updatedState = dataStore:UpdateAsync(keyForPlayer(completion.playerId), function(currentState)
            local nextState, didApply = ProgressionReducer.applyCompletion(currentState, completion)
            applied = didApply
            return nextState
        end)
    end)

    if not ok then
        return nil, false, "WRITE_FAILED"
    end

    return ProgressionReducer.normalize(updatedState, completion.playerId), applied
end

return table.freeze(ProgressionStore)
