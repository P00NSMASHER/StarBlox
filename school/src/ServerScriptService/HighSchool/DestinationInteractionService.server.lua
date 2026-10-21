local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))
local FoundationState = require(highSchool:WaitForChild("FoundationState"))
local CampusCourierActivity = require(script.Parent:WaitForChild("CampusCourierActivity"))

local signals = ServerScriptService:WaitForChild("HighSchoolSignals")
local classCompleted = signals:WaitForChild("ClassCompleted")

local remotes = highSchool:FindFirstChild("DestinationRemotes")
if remotes then
    remotes:Destroy()
end
remotes = Instance.new("Folder")
remotes.Name = "DestinationRemotes"
remotes.Parent = highSchool

local destinationVisited = Instance.new("RemoteEvent")
destinationVisited.Name = "DestinationVisited"
destinationVisited.Parent = remotes

local getDestinationState = Instance.new("RemoteFunction")
getDestinationState.Name = "GetDestinationState"
getDestinationState.Parent = remotes

local runtime = highSchool:WaitForChild("FoundationRuntime")
local campus = Workspace:WaitForChild(FoundationConfig.CAMPUS_NAME)
local registry = campus:WaitForChild("Locations")
local activeCourierByUserId = {}
local completedCourierByUserId = {}
local discoveredCourierByUserId = {}
local lastCheckInByUserId = {}
local CHECK_IN_COOLDOWN_SECONDS = 0.75
local MAX_CHECK_IN_DISTANCE = 14

-- Foundation dayIndex restarts with each server process. Pair it with the server
-- schedule so a persisted route receipt cannot suppress a later server's route.
local scheduleNamespace = game.JobId
if scheduleNamespace == "" then
    scheduleNamespace = HttpService:GenerateGUID(false)
end

local function getCourierInstanceId(player)
    local foundation = FoundationState.getSnapshot()
    return CampusCourierActivity.getDailyInstanceId(
        player.UserId,
        scheduleNamespace,
        foundation and foundation.dayIndex
    )
end

local function getCurrentCourier(player, courierInstanceId)
    local courier = activeCourierByUserId[player.UserId]
    if courier and courier.activityInstanceId ~= courierInstanceId then
        CampusCourierActivity.close(courier)
        activeCourierByUserId[player.UserId] = nil
        return nil
    end

    return courier
end

local function routeExpiredPayload()
    return table.freeze({
        locationId = "lobby",
        locationName = "Main Lobby",
        message = "A new school day started. Visit the Main Lobby to begin today’s Campus Courier route.",
        activityId = CampusCourierActivity.ACTIVITY_ID,
        routeExpired = true,
        resolved = false,
    })
end

local function expireStaleCouriers()
    for userId, courier in pairs(activeCourierByUserId) do
        local player = Players:GetPlayerByUserId(userId)
        local courierInstanceId = player and getCourierInstanceId(player) or nil
        if courierInstanceId and courier.activityInstanceId ~= courierInstanceId then
            CampusCourierActivity.close(courier)
            activeCourierByUserId[userId] = nil
            destinationVisited:FireClient(player, routeExpiredPayload())
        end
    end
end

runtime:GetAttributeChangedSignal("DayIndex"):Connect(expireStaleCouriers)

local function courierStatePayload(courier)
    local state = CampusCourierActivity.getPublicState(courier)
    return table.freeze({
        activityId = state.id,
        resolved = state.resolved,
        completedStops = state.completedStops,
        remainingStops = state.remainingStops,
        totalStops = state.totalStops,
        progressLabel = state.progressLabel or string.format(
            "%d/%d stops",
            state.completedStops,
            state.totalStops
        ),
        nextLocationId = state.nextLocationId,
        nextLocationName = state.nextLocationName,
        nextActionLabel = state.nextActionLabel,
        objective = state.objective,
        availableRewardPoints = state.rewardPoints,
        rewardPoints = state.rewardPoints,
    })
end

local function courierStartCue()
    local firstStop = CampusCourierActivity.ROUTE[1]
    return table.freeze({
        activityId = CampusCourierActivity.ACTIVITY_ID,
        resolved = false,
        completedStops = 0,
        remainingStops = #CampusCourierActivity.ROUTE,
        totalStops = #CampusCourierActivity.ROUTE,
        progressLabel = string.format("0/%d stops", #CampusCourierActivity.ROUTE),
        nextLocationId = firstStop.locationId,
        nextLocationName = firstStop.locationName,
        nextActionLabel = firstStop.actionLabel,
        objective = firstStop.objective,
        availableRewardPoints = CampusCourierActivity.REWARD_POINTS,
        rewardPoints = 0,
    })
end

getDestinationState.OnServerInvoke = function(player)
    local courierInstanceId = getCourierInstanceId(player)
    if not courierInstanceId then
        return nil
    end

    local courier = getCurrentCourier(player, courierInstanceId)
    if not courier then
        if completedCourierByUserId[player.UserId] ~= courierInstanceId
            and discoveredCourierByUserId[player.UserId] == courierInstanceId
        then
            return courierStartCue()
        end
        return nil
    end

    return courierStatePayload(courier)
end

local function visitPayload(location, message, courierResponse)
    return table.freeze({
        locationId = location.id,
        locationName = location.name,
        message = message,
        activityId = courierResponse and CampusCourierActivity.ACTIVITY_ID or nil,
        resolved = courierResponse and courierResponse.resolved or false,
        completedStops = courierResponse and courierResponse.completedStops or nil,
        remainingStops = courierResponse and courierResponse.remainingStops or nil,
        totalStops = courierResponse and courierResponse.totalStops or nil,
        progressLabel = courierResponse and (
            courierResponse.progressLabel or string.format(
                "%d/%d stops",
                courierResponse.completedStops,
                courierResponse.totalStops
            )
        ) or nil,
        nextLocationId = courierResponse and courierResponse.nextLocationId or nil,
        nextLocationName = courierResponse and courierResponse.nextLocationName or nil,
        nextActionLabel = courierResponse and courierResponse.nextActionLabel or nil,
        objective = courierResponse and courierResponse.objective or nil,
        availableRewardPoints = courierResponse and CampusCourierActivity.REWARD_POINTS or 0,
        rewardPoints = courierResponse and courierResponse.rewardPoints or 0,
    })
end

local function applyCourierCheckIn(player, location)
    local courierInstanceId = getCourierInstanceId(player)
    if not courierInstanceId then
        return visitPayload(
            location,
            "Campus Courier is temporarily unavailable. Try again soon.",
            nil
        )
    end

    if completedCourierByUserId[player.UserId] == courierInstanceId then
        return visitPayload(
            location,
            "Campus Courier is complete. Keep exploring Pip High!",
            nil
        )
    end

    local courier = getCurrentCourier(player, courierInstanceId)

    local started = false
    if not courier and location.id == CampusCourierActivity.ROUTE[1].locationId then
        courier = CampusCourierActivity.new(
            courierInstanceId,
            player.UserId
        )
        activeCourierByUserId[player.UserId] = courier
        discoveredCourierByUserId[player.UserId] = nil
        started = true
    end

    if not courier then
        discoveredCourierByUserId[player.UserId] = courierInstanceId
        return visitPayload(
            location,
            "Checked in at " .. location.name .. ". Visit the Main Lobby to start Campus Courier!",
            courierStartCue()
        )
    end

    local response = CampusCourierActivity.checkIn(
        courier,
        HttpService:GenerateGUID(false),
        location.id
    )
    local message = response.feedback or ("Checked in at " .. location.name .. ".")
    if started and response.accepted then
        message = "Campus Courier started! " .. message
    end

    if response.accepted and response.resolved then
        local completion = CampusCourierActivity.buildCompletion(courier, os.time())
        completedCourierByUserId[player.UserId] = courier.activityInstanceId
        activeCourierByUserId[player.UserId] = nil
        discoveredCourierByUserId[player.UserId] = nil
        classCompleted:Fire(completion)
        CampusCourierActivity.close(courier)
    end

    return visitPayload(location, message, response)
end

local function checkIn(player, marker, location)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    if not root then
        return
    end

    if (root.Position - marker.Position).Magnitude > MAX_CHECK_IN_DISTANCE then
        return
    end

    local now = os.clock()
    local lastCheckIn = lastCheckInByUserId[player.UserId] or 0
    if now - lastCheckIn < CHECK_IN_COOLDOWN_SECONDS then
        return
    end
    lastCheckInByUserId[player.UserId] = now

    local payload = applyCourierCheckIn(player, location)
    destinationVisited:FireClient(player, payload)
end

for _, location in ipairs(FoundationConfig.LOCATIONS) do
    local marker = registry:WaitForChild(location.id)
    local existing = marker:FindFirstChild("DestinationPrompt")
    if existing then
        existing:Destroy()
    end

    local prompt = Instance.new("ProximityPrompt")
    prompt.Name = "DestinationPrompt"
    prompt.ActionText = "Check In"
    prompt.ObjectText = location.name
    prompt.HoldDuration = 0
    prompt.MaxActivationDistance = 12
    prompt.RequiresLineOfSight = false
    prompt.KeyboardKeyCode = Enum.KeyCode.E
    prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
    prompt.Parent = marker

    prompt.Triggered:Connect(function(player)
        checkIn(player, marker, location)
    end)
end

Players.PlayerRemoving:Connect(function(player)
    activeCourierByUserId[player.UserId] = nil
    discoveredCourierByUserId[player.UserId] = nil
    lastCheckInByUserId[player.UserId] = nil
end)
