local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))
local FoundationState = require(highSchool:WaitForChild("FoundationState"))
local CompletionGate = require(script.Parent:WaitForChild("CompletionGate"))
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
local CLASS_LOCATIONS = table.freeze({ math = "math", ela = "ela", science = "science" })
local scheduleNamespace = game.JobId
if scheduleNamespace == "" then
    scheduleNamespace = HttpService:GenerateGUID(false)
end
local completedOccurrencesByUserId = {}
local sessionClassesByUserId = {}
local sessionLocationsByUserId = {}
local sessionOccurrencesByUserId = {}
local transitionReceiptsByUserId = {}

local function closeSessionForUser(userId, transitionReason)
    local sessionId = sessionsByUserId[userId]
    if not sessionId then
        return false
    end

    local classId = sessionClassesByUserId[userId]
    local expectedLocationId = sessionLocationsByUserId[userId]
    EducationCore.closeSession(sessionId)
    sessionsByUserId[userId] = nil
    sessionClassesByUserId[userId] = nil
    sessionLocationsByUserId[userId] = nil
    sessionOccurrencesByUserId[userId] = nil

    if transitionReason == "CLASS_PERIOD_ENDED" then
        transitionReceiptsByUserId[userId] = table.freeze({
            sessionId = sessionId,
            response = table.freeze({
                accepted = false,
                reason = transitionReason,
                classId = classId,
                expectedLocationId = expectedLocationId,
            }),
        })
    else
        transitionReceiptsByUserId[userId] = nil
    end
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
            closeSessionForUser(userId, "CLASS_PERIOD_ENDED")
        end
    end
end

local function registerPlayer(player)
    player.CharacterAdded:Connect(function()
        transitionReceiptsByUserId[player.UserId] = nil
        closeSessionForUser(player.UserId)
    end)
end

beginClass.OnServerInvoke = function(player)
    if sessionsByUserId[player.UserId] then
        return table.freeze({ ok = false, reason = "SESSION_ACTIVE" })
    end

    local foundation = FoundationState.getSnapshot()
    local expectedLocationId = CLASS_LOCATIONS[foundation.periodId]
    if not expectedLocationId then
        return table.freeze({ ok = false, reason = "NOT_CLASS_PERIOD" })
    end

    if foundation.locationId ~= expectedLocationId then
        return table.freeze({
            ok = false,
            reason = "CLASS_LOCATION_MISMATCH",
            classId = foundation.periodId,
            expectedLocationId = expectedLocationId,
            actualLocationId = foundation.locationId,
        })
    end

    if not isAtAuthoritativeLocation(player, expectedLocationId) then
        return table.freeze({
            ok = false,
            reason = "NOT_AT_CLASS_LOCATION",
            classId = foundation.periodId,
            expectedLocationId = expectedLocationId,
        })
    end

    local occurrenceId = CompletionGate.getOccurrenceId(
        scheduleNamespace,
        foundation.dayIndex,
        foundation.periodIndex,
        foundation.periodId
    )
    if not occurrenceId then
        return table.freeze({ ok = false, reason = "SESSION_START_FAILED" })
    end

    local completedOccurrences = completedOccurrencesByUserId[player.UserId]
    if not completedOccurrences then
        completedOccurrences = {}
        completedOccurrencesByUserId[player.UserId] = completedOccurrences
    end
    if CompletionGate.hasCompleted(completedOccurrences, occurrenceId) then
        return table.freeze({
            ok = false,
            reason = "CLASS_ALREADY_COMPLETED",
            classId = foundation.periodId,
            expectedLocationId = expectedLocationId,
        })
    end

    local sessionId, err = EducationCore.startSession(
        player.UserId,
        foundation.periodId,
        foundation.dayIndex
    )
    if not sessionId then
        return table.freeze({ ok = false, reason = err or "SESSION_START_FAILED" })
    end

    transitionReceiptsByUserId[player.UserId] = nil
    sessionsByUserId[player.UserId] = sessionId
    sessionClassesByUserId[player.UserId] = foundation.periodId
    sessionLocationsByUserId[player.UserId] = expectedLocationId
    sessionOccurrencesByUserId[player.UserId] = occurrenceId

    return table.freeze({
        ok = true,
        sessionId = sessionId,
        classId = foundation.periodId,
        locationId = expectedLocationId,
        activity = EducationCore.getPublicActivity(sessionId),
    })
end

submitAnswer.OnServerInvoke = function(player, sessionId, submissionId, choiceId)
    local activeSessionId = sessionsByUserId[player.UserId]
    if not activeSessionId or activeSessionId ~= sessionId then
        local transitionReceipt = transitionReceiptsByUserId[player.UserId]
        if transitionReceipt and transitionReceipt.sessionId == sessionId then
            return transitionReceipt.response
        end
        return table.freeze({ accepted = false, reason = "SESSION_NOT_ACTIVE" })
    end

    local foundation = FoundationState.getSnapshot()
    local activeClassId = sessionClassesByUserId[player.UserId]
    local expectedLocationId = sessionLocationsByUserId[player.UserId]
    if foundation.periodId ~= activeClassId then
        closeSessionForUser(player.UserId, "CLASS_PERIOD_ENDED")
        return table.freeze({
            accepted = false,
            reason = "CLASS_PERIOD_ENDED",
            classId = activeClassId,
            expectedLocationId = expectedLocationId,
        })
    end

    if foundation.locationId ~= expectedLocationId then
        closeSessionForUser(player.UserId)
        return table.freeze({
            accepted = false,
            reason = "CLASS_LOCATION_MISMATCH",
            classId = activeClassId,
            expectedLocationId = expectedLocationId,
            actualLocationId = foundation.locationId,
        })
    end

    if not isAtAuthoritativeLocation(player, expectedLocationId) then
        closeSessionForUser(player.UserId)
        return table.freeze({
            accepted = false,
            reason = "LEFT_CLASS_LOCATION",
            classId = activeClassId,
            expectedLocationId = expectedLocationId,
        })
    end

    if not EducationCore.isOwnedBy(sessionId, player.UserId) then
        closeSessionForUser(player.UserId)
        return table.freeze({ accepted = false, reason = "SESSION_NOT_ACTIVE" })
    end

    local response = EducationCore.submit(sessionId, submissionId, choiceId)

    if response.accepted and response.resolved then
        sessionsByUserId[player.UserId] = nil
        local completedClassId = sessionClassesByUserId[player.UserId]
        local completedOccurrenceId = sessionOccurrencesByUserId[player.UserId]
        sessionClassesByUserId[player.UserId] = nil
        sessionLocationsByUserId[player.UserId] = nil
        sessionOccurrencesByUserId[player.UserId] = nil

        local completedCompletionId = CompletionGate.getCompletionId(
            player.UserId,
            completedOccurrenceId
        )
        if not completedCompletionId then
            EducationCore.closeSession(sessionId)
            return table.freeze({ accepted = false, reason = "INVALID_CLASS_COMPLETION" })
        end

        local completedOccurrences = completedOccurrencesByUserId[player.UserId]
        if not CompletionGate.markCompleted(completedOccurrences, completedOccurrenceId) then
            EducationCore.closeSession(sessionId)
            return table.freeze({ accepted = false, reason = "DUPLICATE_CLASS_COMPLETION" })
        end

        classCompleted:Fire(table.freeze({
            completionId = completedCompletionId,
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
    local transitionReason = nil
    local activeClassId = sessionClassesByUserId[player.UserId]
    if activeClassId then
        local foundation = FoundationState.getSnapshot()
        if activeClassId ~= foundation.periodId then
            transitionReason = "CLASS_PERIOD_ENDED"
        end
    end

    local left = closeSessionForUser(player.UserId, transitionReason)
    return table.freeze({ ok = true, left = left })
end

foundationRuntime:GetAttributeChangedSignal("PeriodId"):Connect(closeSessionsOutsideActivePeriod)
Players.PlayerAdded:Connect(registerPlayer)

for _, player in ipairs(Players:GetPlayers()) do
    registerPlayer(player)
end

Players.PlayerRemoving:Connect(function(player)
    closeSessionForUser(player.UserId)
    transitionReceiptsByUserId[player.UserId] = nil
end)
