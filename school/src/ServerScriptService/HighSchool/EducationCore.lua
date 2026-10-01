local HttpService = game:GetService("HttpService")

local ActivityCatalog = require(script.Parent:WaitForChild("ActivityCatalog"))
local EducationSession = require(script.Parent:WaitForChild("EducationSession"))

local EducationCore = {}

local sessions = {}

function EducationCore.startSession(userId, classId)
    assert(type(userId) == "number", "userId required")
    assert(type(classId) == "string" and classId ~= "", "classId required")

    local activity = ActivityCatalog.getForClass(classId)
    if not activity then
        return nil, "NO_ACTIVITY"
    end

    local sessionId = string.format(
        "%d:%s:%s",
        userId,
        classId,
        HttpService:GenerateGUID(false)
    )

    sessions[sessionId] = EducationSession.new(
        sessionId,
        userId,
        classId,
        activity
    )

    return sessionId
end

function EducationCore.getPublicActivity(sessionId)
    return EducationSession.getPublicActivity(sessions[sessionId])
end

function EducationCore.submit(sessionId, submissionId, choiceId)
    return EducationSession.submit(sessions[sessionId], submissionId, choiceId)
end

function EducationCore.closeSession(sessionId)
    local session = sessions[sessionId]
    if not session then
        return false
    end

    EducationSession.close(session)
    sessions[sessionId] = nil
    return true
end

function EducationCore.isOwnedBy(sessionId, userId)
    return EducationSession.isOwnedBy(sessions[sessionId], userId)
end

return table.freeze(EducationCore)
