--!nonstrict
-- Transport and lifecycle only. Mission, art, lesson and save behavior belong to their lanes.
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local shared = ReplicatedStorage:WaitForChild("LanternIslandShared", 15)
assert(shared, "LanternIslandShared missing; build the isolated project")
local Protocol = require(shared:WaitForChild("Protocol", 15))

-- Owner explicitly authorized replacing the former StarBlox place with Lantern Island on 2026-09-28.
assert(not ReplicatedStorage:FindFirstChild(Protocol.REMOTE_FOLDER), "Duplicate Lantern Island server bootstrap")
local remotes = Instance.new("Folder")
remotes.Name = Protocol.REMOTE_FOLDER
remotes:SetAttribute("ProtocolVersion", Protocol.VERSION)
remotes:SetAttribute("RuntimeStatus", "BOOTING")
local actionRemote = Instance.new("RemoteEvent")
actionRemote.Name = Protocol.ACTION_REMOTE
actionRemote.Parent = remotes
local stateRemote = Instance.new("RemoteEvent")
stateRemote.Name = Protocol.STATE_REMOTE
stateRemote.Parent = remotes
remotes.Parent = ReplicatedStorage

local services = {}
local sessions = {}
local runtimeStatus = "BOOTING"
local missing = {}
local identity = script.Parent:FindFirstChild("BuildIdentity")
local buildId = identity and identity.Value or "source-development"
local context = {
    services = services, protocol = Protocol, isStudio = RunService:IsStudio(),
    buildId = buildId, dataStoreNamespace = "LanternIsland_v1",
    serverRoot = script.Parent,
}

local function safeText(value, maxLength)
    if type(value) ~= "string" then return nil end
    return string.sub(value, 1, maxLength)
end
local function copyFields(value, keys)
    local output = {}
    if type(value) ~= "table" then return output end
    for _, key in ipairs(keys) do
        local field = value[key]
        if type(field) == "string" then output[key] = safeText(field, 1500)
        elseif type(field) == "boolean" then output[key] = field
        elseif type(field) == "number" and field == field and math.abs(field) < 1000000000 then output[key] = field end
    end
    return output
end
local function publicState(player)
    local session = sessions[player]
    local state = { runtimeStatus = runtimeStatus, buildId = buildId, missing = table.clone(missing),
        profileStatus = session and session.profileStatus or "NOT_LOADED", mutationPending = session and session.busy or false }
    if not session or not session.loaded or runtimeStatus ~= "READY" then return state end
    local profile = services.ProfileService:publicState(player)
    state.profile = copyFields(profile, { "currency", "equippedItemId", "saveStatus" })
    state.profile.ownedItemIds = {}
    if type(profile) == "table" and type(profile.ownedItemIds) == "table" then
        for index, item in ipairs(profile.ownedItemIds) do
            if index > 100 then break end
            if type(item) == "string" then table.insert(state.profile.ownedItemIds, string.sub(item, 1, 64)) end
        end
    end
    local lesson = services.LessonService:publicState(player)
    state.lesson = copyFields(lesson, { "id", "version", "title", "sourceLabel", "reviewStatus" })
    local mission = services.MissionService:publicState(player)
    state.mission = copyFields(mission, { "missionId", "activityId", "contentVersion", "activityType",
        "title", "objective", "prompt", "passage", "status", "hint", "assistance", "completedCount" })
    -- Only declared public representations are replicated; expected answers never are.
    if type(mission) == "table" then
        state.mission.representation = copyFields(mission.representation, { "tensA", "onesA", "tensB", "onesB", "operation", "displayWord", "audioAssetId" })
        state.mission.options = {}
        if type(mission.options) == "table" then
            for index, option in ipairs(mission.options) do
                if index > 12 then break end
                table.insert(state.mission.options, copyFields(option, { "id", "label" }))
            end
        end
    end
    return state
end
local function reply(player, requestId, result)
    local session = sessions[player]
    if not session or player.Parent ~= Players then return end
    session.sequence += 1
    local ok, state = pcall(publicState, player)
    if not ok then
        state = { runtimeStatus = "STATE_UNAVAILABLE", buildId = buildId }
        result = { ok = false, code = "STATE_UNAVAILABLE" }
        warn("LANTERN_STATE_UNAVAILABLE")
    end
    stateRemote:FireClient(player, {
        requestId = requestId, ok = result.ok == true, code = result.code,
        sequence = session.sequence, state = state,
    })
end
context.publish = function(player)
    reply(player, nil, { ok = true, code = "STATE_CHANGED" })
end
local function loadProfile(player, session)
    if session.loading or session.loaded or runtimeStatus ~= "READY" then return end
    session.loading = true
    session.profileStatus = "LOADING"
    local ran, loaded, code = pcall(function() return services.ProfileService:load(player) end)
    session.loading = false
    -- A player can leave while load yields. Release acquired resources rather than orphaning a lease.
    if sessions[player] ~= session then
        if ran and loaded == true then pcall(function() services.ProfileService:release(player) end) end
        return
    end
    session.loaded = ran and loaded == true
    session.profileStatus = session.loaded and "LOADED" or "LOAD_FAILED"
    reply(player, nil, { ok = session.loaded, code = session.loaded and "PROFILE_READY" or "PROFILE_LOAD_FAILED" })
end
local function addPlayer(player)
    if sessions[player] then return end
    local session = { limiter = Protocol.newLimiter(os.clock), replay = Protocol.newReplayCache(64),
        sequence = 0, loaded = false, loading = false, busy = false, profileStatus = "NOT_LOADED" }
    sessions[player] = session
    task.spawn(loadProfile, player, session)
end
local function removePlayer(player)
    local session = sessions[player]
    sessions[player] = nil
    if not session then return end
    -- Producer services must serialize in-flight mutations/release and preserve failed-save status.
    if session.loaded then
        local ok = pcall(function() services.ProfileService:release(player) end)
        if not ok then warn("LANTERN_PROFILE_RELEASE_FAILED") end
    end
    if services.WorldBuilder and services.WorldBuilder.removePlayer then
        pcall(function() services.WorldBuilder:removePlayer(player) end)
    end
end
Players.PlayerAdded:Connect(addPlayer)
Players.PlayerRemoving:Connect(removePlayer)
for _, player in ipairs(Players:GetPlayers()) do addPlayer(player) end

actionRemote.OnServerEvent:Connect(function(player, raw)
    local session = sessions[player]
    if not session or not session.limiter.take() then return end
    local valid, code, request = Protocol.validate(raw)
    if not valid then
        -- Do not reflect arbitrary invalid user input to another client or to logs.
        return
    end
    if request.action == "GetState" then
        reply(player, request.requestId, { ok = true, code = "STATE" })
        return
    end
    if runtimeStatus ~= "READY" then reply(player, request.requestId, { ok = false, code = "RUNTIME_NOT_READY" }); return end
    if not session.loaded then reply(player, request.requestId, { ok = false, code = "PROFILE_NOT_READY" }); return end
    if session.busy then reply(player, request.requestId, { ok = false, code = "BUSY" }); return end
    local accepted, replayCode, previous = session.replay.begin(request)
    if not accepted then
        reply(player, request.requestId, previous or { ok = false, code = replayCode })
        return
    end
    session.busy = true
    local ran, result = pcall(function()
        if request.action == "EquipItem" then return services.RewardService:handle(player, request) end
        return services.MissionService:handle(player, request)
    end)
    if not ran or type(result) ~= "table" or type(result.ok) ~= "boolean"
        or type(result.code) ~= "string" or #result.code > 64
        or not string.match(result.code, "^[%w_.:%-]+$") then
        result = { ok = false, code = "ACTION_FAILED" }
        warn("LANTERN_ACTION_FAILED")
    end
    session.replay.finish(request.requestId, result)
    session.busy = false
    reply(player, request.requestId, result)
end)

local contracts = {
    { name = "ProfileService", methods = { "load", "publicState", "release" } },
    { name = "LessonService", methods = { "publicState" } },
    { name = "WorldBuilder", methods = { "build" } },
    { name = "RewardService", methods = { "handle" } },
    { name = "MissionService", methods = { "handle", "publicState" } },
}
for _, contract in ipairs(contracts) do
    local module = script.Parent:FindFirstChild(contract.name)
    if not module or not module:IsA("ModuleScript") then table.insert(missing, contract.name) end
end
if #missing > 0 then
    runtimeStatus = "DEPENDENCIES_MISSING"
else
    local ok = pcall(function()
        for _, contract in ipairs(contracts) do
            local definition = require(script.Parent[contract.name])
            assert(type(definition) == "table" and type(definition.new) == "function", contract.name .. ".new required")
            local service = definition.new(context)
            for _, method in ipairs(contract.methods) do
                assert(type(service[method]) == "function", contract.name .. ":" .. method .. " required")
            end
            services[contract.name] = service
        end
        services.WorldBuilder:build()
    end)
    runtimeStatus = ok and "READY" or "BOOT_FAILED"
    if not ok then warn("LANTERN_BOOT_FAILED: see the module contract; no playability certification") end
end
remotes:SetAttribute("RuntimeStatus", runtimeStatus)
for player, session in pairs(sessions) do task.spawn(loadProfile, player, session) end
print("LANTERN_RUNTIME_STATUS", runtimeStatus, buildId)

game:BindToClose(function()
    local pending = 0
    for player, session in pairs(sessions) do
        if session.loaded then
            pending += 1
            task.spawn(function()
                local ok = pcall(function() services.ProfileService:release(player) end)
                if not ok then warn("LANTERN_CLOSE_SAVE_FAILED") end
                pending -= 1
            end)
        end
    end
    local untilTime = os.clock() + 25
    while pending > 0 and os.clock() < untilTime do task.wait(0.1) end
    if pending > 0 then warn("LANTERN_CLOSE_SAVE_UNCONFIRMED") end
end)
