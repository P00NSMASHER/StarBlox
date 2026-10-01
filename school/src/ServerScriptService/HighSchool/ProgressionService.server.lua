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

local function loadIntoCache(playerId)
    local state, err = ProgressionStore.load(playerId)
    if not state then
        return nil, err
    end

    cacheByPlayerId[playerId] = state
    return state
end

Players.PlayerAdded:Connect(function(player)
    loadIntoCache(player.UserId)
end)

Players.PlayerRemoving:Connect(function(player)
    cacheByPlayerId[player.UserId] = nil
end)

classCompleted.Event:Connect(function(completion)
    local state = ProgressionStore.applyCompletion(completion)
    if state then
        cacheByPlayerId[completion.playerId] = state
    end
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
