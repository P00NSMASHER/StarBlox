local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local ProgressionReducer = require(script.Parent:WaitForChild("ProgressionReducer"))
local ProgressionStore = require(script.Parent:WaitForChild("ProgressionStore"))

local signals = ServerScriptService:WaitForChild("HighSchoolSignals")
local classCompleted = signals:WaitForChild("ClassCompleted")

local remotes = highSchool:FindFirstChild("ProgressionRemotes")
if remotes then
    remotes:Destroy()
end
remotes = Instance.new("Folder")
remotes.Name = "ProgressionRemotes"
remotes.Parent = highSchool

local getProgression = Instance.new("RemoteFunction")
getProgression.Name = "GetProgression"
getProgression.Parent = remotes

local cacheByPlayerId = {}
local pendingByCompletionId = {}
local RETRY_DELAYS_SECONDS = table.freeze({ 0, 1, 2, 4, 8 })
local RETRY_CYCLE_DELAY_SECONDS = 30

local function loadIntoCache(playerId)
    local state, err = ProgressionStore.load(playerId)
    if not state then
        return nil, err
    end

    cacheByPlayerId[playerId] = state
    return state
end

local function persistCompletion(completion)
    if pendingByCompletionId[completion.completionId] then
        return
    end

    pendingByCompletionId[completion.completionId] = completion

    for _, delaySeconds in ipairs(RETRY_DELAYS_SECONDS) do
        if delaySeconds > 0 then
            task.wait(delaySeconds)
        end

        local state = ProgressionStore.applyCompletion(completion)
        if state then
            cacheByPlayerId[completion.playerId] = state
            pendingByCompletionId[completion.completionId] = nil
            return
        end
    end

    warn("HighSchool progression persistence retry cycle exhausted for " .. completion.completionId)

    task.delay(RETRY_CYCLE_DELAY_SECONDS, function()
        if pendingByCompletionId[completion.completionId] ~= completion then
            return
        end

        pendingByCompletionId[completion.completionId] = nil
        persistCompletion(completion)
    end)
end

Players.PlayerAdded:Connect(function(player)
    task.spawn(loadIntoCache, player.UserId)
end)

Players.PlayerRemoving:Connect(function(player)
    cacheByPlayerId[player.UserId] = nil
end)

classCompleted.Event:Connect(function(completion)
    task.spawn(persistCompletion, completion)
end)

getProgression.OnServerInvoke = function(player)
    local state = cacheByPlayerId[player.UserId]
    if not state then
        state = loadIntoCache(player.UserId)
    end

    if not state then
        return table.freeze({
            ok = false,
            reason = "PROGRESSION_UNAVAILABLE",
        })
    end

    return table.freeze({
        ok = true,
        progression = ProgressionReducer.toPublicSnapshot(state),
    })
end

game:BindToClose(function()
    for completionId, completion in pairs(pendingByCompletionId) do
        local state = ProgressionStore.applyCompletion(completion)
        if state then
            cacheByPlayerId[completion.playerId] = state
            pendingByCompletionId[completionId] = nil
        end
    end
end)
