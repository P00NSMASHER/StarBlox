local EducationSession = {}

EducationSession.MAX_UNIQUE_SUBMISSIONS_PER_SESSION = 12
EducationSession.MAX_SUBMISSION_ID_LENGTH = 128
EducationSession.MAX_CHOICE_ID_LENGTH = 64

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

function EducationSession.new(sessionId, userId, classId, activity)
    assert(type(sessionId) == "string" and sessionId ~= "", "sessionId required")
    assert(type(userId) == "number", "userId required")
    assert(type(classId) == "string" and classId ~= "", "classId required")
    assert(type(activity) == "table", "activity required")

    return {
        id = sessionId,
        userId = userId,
        classId = classId,
        activity = activity,
        receipts = {},
        uniqueSubmissionCount = 0,
        closed = false,
        resolved = false,
    }
end

function EducationSession.getPublicActivity(session)
    if not session or session.closed or session.resolved then
        return nil
    end

    local activity = session.activity
    return table.freeze({
        id = activity.id,
        subject = activity.subject,
        skill = activity.skill,
        difficulty = activity.difficulty,
        prompt = activity.prompt,
        choices = cloneChoices(activity.choices),
        hint = activity.hint,
    })
end

function EducationSession.submit(session, submissionId, choiceId)
    if not session then
        return table.freeze({ accepted = false, reason = "UNKNOWN_SESSION" })
    end

    if session.closed or session.resolved then
        return table.freeze({ accepted = false, reason = "SESSION_CLOSED" })
    end

    if type(submissionId) ~= "string"
        or submissionId == ""
        or #submissionId > EducationSession.MAX_SUBMISSION_ID_LENGTH
    then
        return table.freeze({ accepted = false, reason = "INVALID_SUBMISSION_ID" })
    end

    local cached = session.receipts[submissionId]
    if cached then
        return cached
    end

    if session.uniqueSubmissionCount >= EducationSession.MAX_UNIQUE_SUBMISSIONS_PER_SESSION then
        return table.freeze({ accepted = false, reason = "TOO_MANY_SUBMISSIONS" })
    end

    if type(choiceId) ~= "string"
        or choiceId == ""
        or #choiceId > EducationSession.MAX_CHOICE_ID_LENGTH
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

function EducationSession.close(session)
    if not session or session.closed then
        return false
    end

    session.closed = true
    session.receipts = {}
    return true
end

function EducationSession.isOwnedBy(session, userId)
    return session ~= nil
        and session.userId == userId
        and not session.closed
        and not session.resolved
end

return table.freeze(EducationSession)
