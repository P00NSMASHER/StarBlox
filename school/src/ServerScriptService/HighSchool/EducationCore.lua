local HttpService = game:GetService("HttpService")

local ActivityCatalog = require(script.Parent:WaitForChild("ActivityCatalog"))

local EducationCore = {}

local sessions = {}
local MAX_UNIQUE_SUBMISSIONS_PER_SESSION = 12
local MAX_SUBMISSION_ID_LENGTH = 128
local MAX_CHOICE_ID_LENGTH = 64

local function cloneChoices(choices)
    local publicChoices = {}
    for _, choice in ipairs(choices) do
        table.insert(publicChoices, table.freeze({
            id = choice.id,
            text = choice.text,
        }))
    end
    return table.freeze(publicChoices)
end

local function toPublicActivity(activity)
    -- PUBLIC_ACTIVITY_BEGIN
    return table.freeze({
        id = activity.id,
        subject = activity.subject,
        skill = activity.skill,
        difficulty = activity.difficulty,
        prompt = activity.prompt,
        choices = cloneChoices(activity.choices),
        hint = activity.hint,
    })
    -- PUBLIC_ACTIVITY_END
end

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

    sessions[sessionId] = {
        id = sessionId,
        userId = userId,
        classId = classId,
        activity = activity,
        receipts = {},
        uniqueSubmissionCount = 0,
        closed = false,
        resolved = false,
    }

    return sessionId
end

function EducationCore.getPublicActivity(sessionId)
    local session = sessions[sessionId]
    if not session or session.closed or session.resolved then
        return nil
    end
    return toPublicActivity(session.activity)
end

function EducationCore.submit(sessionId, submissionId, choiceId)
    local session = sessions[sessionId]
    if not session then
        return table.freeze({ accepted = false, reason = "UNKNOWN_SESSION" })
    end

    -- CLOSED_CHECK_BEFORE_RECEIPT_CACHE
    if session.closed or session.resolved then
        return table.freeze({ accepted = false, reason = "SESSION_CLOSED" })
    end

    if type(submissionId) ~= "string"
        or submissionId == ""
        or #submissionId > MAX_SUBMISSION_ID_LENGTH
    then
        return table.freeze({ accepted = false, reason = "INVALID_SUBMISSION_ID" })
    end

    local cached = session.receipts[submissionId]
    if cached then
        return cached
    end

    if session.uniqueSubmissionCount >= MAX_UNIQUE_SUBMISSIONS_PER_SESSION then
        return table.freeze({ accepted = false, reason = "TOO_MANY_SUBMISSIONS" })
    end

    if type(choiceId) ~= "string"
        or choiceId == ""
        or #choiceId > MAX_CHOICE_ID_LENGTH
    then
        return table.freeze({ accepted = false, reason = "INVALID_CHOICE" })
    end

    local validChoice = false
    for _, choice in ipairs(session.activity.choices) do
        if choice.id == choiceId then
            validChoice = true
            break
        end
    end

    if not validChoice then
        return table.freeze({ accepted = false, reason = "INVALID_CHOICE" })
    end

    session.uniqueSubmissionCount += 1

    local isCorrect = choiceId == session.activity.correctChoiceId
    local response

    if isCorrect then
        session.resolved = true
        response = table.freeze({
            accepted = true,
            resolved = true,
            score = 1,
            explanation = session.activity.explanation,
        })
    else
        response = table.freeze({
            accepted = true,
            resolved = false,
            score = 0,
            hint = session.activity.hint,
        })
    end

    session.receipts[submissionId] = response
    return response
end

function EducationCore.closeSession(sessionId)
    local session = sessions[sessionId]
    if not session then
        return false
    end

    session.closed = true
    session.receipts = {}
    sessions[sessionId] = nil
    return true
end

function EducationCore.isOwnedBy(sessionId, userId)
    local session = sessions[sessionId]
    return session ~= nil
        and session.userId == userId
        and not session.closed
        and not session.resolved
end

return table.freeze(EducationCore)
