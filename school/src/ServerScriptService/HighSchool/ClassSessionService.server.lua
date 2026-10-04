local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))
local FoundationState = require(highSchool:WaitForChild("FoundationState"))
local EducationCore = require(script.Parent:WaitForChild("EducationCore"))
local foundationRuntime = highSchool:WaitForChild("FoundationRuntime")

local remotes = highSchool:FindFirstChild("ClassRemotes")
if remotes then
    remotes:Destroy()
end
remotes = Instance.new("Folder")
remotes.Name = "ClassRemotes"
remotes.Parent = highSchool

local beginClass = Instance.new("RemoteFunction")
beginClass.Name = "BeginClass"
beginClass.Parent = remotes

local submitAnswer = Instance.new("RemoteFunction")
submitAnswer.Name = "SubmitAnswer"
submitAnswer.Parent = remotes

local leaveClass = Instance.new("RemoteFunction")
leaveClass.Name = "LeaveClass"
leaveClass.Parent = remotes

local signals = ServerScriptService:FindFirstChild("HighSchoolSignals")
if not signals then
    signals = Instance.new("Folder")
    signals.Name = "HighSchoolSignals"
    signals.Parent = ServerScriptService
end

local classCompleted = signals:FindFirstChild("ClassCompleted")
if not classCompleted then
    classCompleted = Instance.new("BindableEvent")
    classCompleted.Name = "ClassCompleted"
    classCompleted.Parent = signals
end

local sessionsByUserId = {}
local ATTENDANCE_RADIUS = 16
local CLASS_PERIODS = { math = true, ela = true, science = true }
local sessionClassesByUserId = {}

local function closeSessionForUser(userId)
    local sessionId = sessionsByUserId[userId]
    if not sessionId then
        return false
    end

    EducationCore.closeSession(sessionId)
    sessionsByUserId[userId] = nil
    sessionClassesByUserId[userId] = nil
    return true
end

local function getLocationMarker(locationId)
    local campus = Workspace:FindFirstChild(FoundationConfig.CAMPUS_NAME)
    local registry = campus and campus:FindFirstChild("Locations")
    return registry and registry:FindFirstChild(locationId)
end

local function isAtAuthoritativeLocation(player, locationId)
    local character = player.Character
    local root = character and character:FindFirstChild("HumanoidRootPart")
    local marker = getLocationMarker(locationId)

    if not root or not marker then
        return false
    end

    return (root.Position - marker.Position).Magnitude <= ATTENDANCE_RADIUS
end

local function closeSessionsOutsideActivePeriod()
    local foundation = FoundationState.getSnapshot()
    local userIds = {}
    for userId in pairs(sessionsByUserId) do
        table.insert(userIds, userId)
    end

    for _, userId in ipairs(userIds) do
        if sessionClassesByUserId[userId] ~= foundation.periodId then
            closeSessionForUser(userId)
        end
    end
end

local function registerPlayer(player)
    player.CharacterAdded:Connect(function()
        closeSessionForUser(player.UserId)
    end)
end

beginClass.OnServerInvoke = function(player)
    if sessionsByUserId[player.UserId] then
        return table.freeze({ ok = false, reason = "SESSION_ACTIVE" })
    end

    local foundation = FoundationState.getSnapshot()
    if not CLASS_PERIODS[foundation.periodId] then
        return table.freeze({ ok = false, reason = "NOT_CLASS_PERIOD" })
    end

    if not isAtAuthoritativeLocation(player, foundation.locationId) then
        return table.freeze({ ok = false, reason = "NOT_AT_CLASS_LOCATION" })
    end

    local sessionId, err = EducationCore.startSession(player.UserId, foundation.periodId)
    if not sessionId then
        return table.freeze({ ok = false, reason = err or "SESSION_START_FAILED" })
    end

    sessionsByUserId[player.UserId] = sessionId
    sessionClassesByUserId[player.UserId] = foundation.periodId

    return table.freeze({
        ok = true,
        sessionId = sessionId,
        activity = EducationCore.getPublicActivity(sessionId),
    })
end

submitAnswer.OnServerInvoke = function(player, sessionId, submissionId, choiceId)
    local activeSessionId = sessionsByUserId[player.UserId]
    if not activeSessionId or activeSessionId ~= sessionId then
        return table.freeze({ accepted = false, reason = "SESSION_NOT_ACTIVE" })
    end

    local foundation = FoundationState.getSnapshot()
    if foundation.periodId ~= sessionClassesByUserId[player.UserId] then
        closeSessionForUser(player.UserId)
        return table.freeze({ accepted = false, reason = "CLASS_PERIOD_ENDED" })
    end

    if not isAtAuthoritativeLocation(player, foundation.locationId) then
        closeSessionForUser(player.UserId)
        return table.freeze({ accepted = false, reason = "LEFT_CLASS_LOCATION" })
    end

    if not EducationCore.isOwnedBy(sessionId, player.UserId) then
        closeSessionForUser(player.UserId)
        return table.freeze({ accepted = false, reason = "SESSION_NOT_ACTIVE" })
    end

    local response = EducationCore.submit(sessionId, submissionId, choiceId)

    if response.accepted and response.resolved then
        sessionsByUserId[player.UserId] = nil
        local completedClassId = sessionClassesByUserId[player.UserId]
        sessionClassesByUserId[player.UserId] = nil
        classCompleted:Fire(table.freeze({
            completionId = sessionId,
            playerId = player.UserId,
            classId = completedClassId,
            score = response.score,
            completedAt = os.time(),
        }))
        EducationCore.closeSession(sessionId)
    end

    return response
end

leaveClass.OnServerInvoke = function(player)
    local left = closeSessionForUser(player.UserId)
    return table.freeze({ ok = true, left = left })
end

foundationRuntime:GetAttributeChangedSignal("PeriodId"):Connect(closeSessionsOutsideActivePeriod)
Players.PlayerAdded:Connect(registerPlayer)

for _, player in ipairs(Players:GetPlayers()) do
    registerPlayer(player)
end

Players.PlayerRemoving:Connect(function(player)
    closeSessionForUser(player.UserId)
end)
