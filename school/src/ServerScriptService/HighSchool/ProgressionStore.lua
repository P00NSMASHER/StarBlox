local DataStoreService = game:GetService("DataStoreService")
local ProgressionReducer = require(script.Parent:WaitForChild("ProgressionReducer"))

local ProgressionStore = {}

local dataStore = DataStoreService:GetDataStore("HighSchoolProgressionV1")

local function keyForPlayer(playerId)
    return "player:" .. tostring(playerId)
end

function ProgressionStore.load(playerId)
    local ok, data = pcall(function()
        return dataStore:GetAsync(keyForPlayer(playerId))
    end)

    if not ok then
        return nil, "LOAD_FAILED"
    end

    return ProgressionReducer.normalize(data)
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

    return ProgressionReducer.normalize(updatedState), applied
end

return table.freeze(ProgressionStore)
