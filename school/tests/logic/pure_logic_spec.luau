local SchoolClock = require("../../src/ReplicatedStorage/HighSchool/SchoolClock")
local ActivityCatalog = require("../../src/ServerScriptService/HighSchool/ActivityCatalog")
local ProgressionReducer = require("../../src/ServerScriptService/HighSchool/ProgressionReducer")
local EducationSession = require("../../src/ServerScriptService/HighSchool/EducationSession")

local function assertEqual(actual, expected, message)
    if actual ~= expected then
        error(string.format(
            "%s: expected %s, got %s",
            message,
            tostring(expected),
            tostring(actual)
        ))
    end
end

-- School clock boundaries and day rollover.
local arrivalStart = SchoolClock.getState(0)
assertEqual(arrivalStart.dayIndex, 1, "arrival day")
assertEqual(arrivalStart.periodId, "arrival", "arrival period")
assertEqual(arrivalStart.secondsIntoPeriod, 0, "arrival start second")

local arrivalEnd = SchoolClock.getState(59)
assertEqual(arrivalEnd.periodId, "arrival", "arrival last second")
assertEqual(arrivalEnd.secondsRemaining, 1, "arrival seconds remaining")

local mathStart = SchoolClock.getState(60)
assertEqual(mathStart.periodId, "math", "math boundary")
assertEqual(mathStart.locationId, "math", "math location")
assertEqual(mathStart.secondsIntoPeriod, 0, "math start second")

local elaStart = SchoolClock.getState(240)
assertEqual(elaStart.periodId, "ela", "ela boundary")

local secondDay = SchoolClock.getState(SchoolClock.DAY_LENGTH_SECONDS)
assertEqual(secondDay.dayIndex, 2, "day rollover")
assertEqual(secondDay.periodId, "arrival", "day rollover period")
assertEqual(secondDay.secondsIntoPeriod, 0, "day rollover second")

-- Exactly-once, validated progression and public report-card behavior.
local completionA = {
    completionId = "completion-a",
    playerId = 123,
    classId = "math",
    score = 1,
    completedAt = 1000,
}

local stateA, appliedA = ProgressionReducer.applyCompletion(nil, completionA)
assertEqual(appliedA, true, "first completion applies")
assertEqual(stateA.points, 10, "first completion points")
assert(stateA.completed["completion-a"] ~= nil, "first completion receipt missing")

local duplicateState, duplicateApplied, duplicateReason =
    ProgressionReducer.applyCompletion(stateA, completionA)
assertEqual(duplicateApplied, false, "duplicate completion must not apply")
assertEqual(duplicateReason, "DUPLICATE_COMPLETION", "duplicate completion reason")
assertEqual(duplicateState.points, 10, "duplicate must not add points")

local completionB = {
    completionId = "completion-b",
    playerId = 123,
    classId = "ela",
    score = 1,
    completedAt = 1001,
}

local stateB, appliedB = ProgressionReducer.applyCompletion(duplicateState, completionB)
assertEqual(appliedB, true, "second unique completion applies")
assertEqual(stateB.points, 20, "two unique completions total points")

local inflatedState, inflatedApplied, inflatedReason = ProgressionReducer.applyCompletion(stateB, {
    completionId = "inflated",
    playerId = 123,
    classId = "science",
    score = 100,
    completedAt = 1002,
})
assertEqual(inflatedApplied, false, "inflated score must fail closed")
assertEqual(inflatedReason, "INVALID_COMPLETION", "inflated score reason")
assertEqual(inflatedState.points, 20, "inflated score must not add points")
assert(inflatedState.completed.inflated == nil, "invalid receipt must not enter ledger")

local unknownState, unknownApplied = ProgressionReducer.applyCompletion(stateB, {
    completionId = "unknown-class",
    playerId = 123,
    classId = "gym",
    score = 1,
    completedAt = 1003,
})
assertEqual(unknownApplied, false, "unknown class must fail closed")
assertEqual(unknownState.points, 20, "unknown class must not add points")

local normalizedTampered = ProgressionReducer.normalize({
    version = 1,
    points = 9999,
    completed = {
        valid = { classId = "science", score = 1, completedAt = 1004 },
        invalid = { classId = "science", score = 9, completedAt = 1005 },
    },
})
assertEqual(normalizedTampered.points, 10, "points must derive from valid receipts")
assert(normalizedTampered.completed.valid ~= nil, "valid saved receipt missing")
assert(normalizedTampered.completed.invalid == nil, "invalid saved receipt must be removed")

local publicProgression = ProgressionReducer.toPublicSnapshot(stateB)
assertEqual(publicProgression.version, 2, "public progression version")
assertEqual(publicProgression.points, 20, "public points")
assertEqual(publicProgression.completedCount, 2, "public completed count")
assertEqual(publicProgression.reportCard.math.completedCount, 1, "math completed count")
assertEqual(publicProgression.reportCard.math.points, 10, "math points")
assertEqual(publicProgression.reportCard.ela.completedCount, 1, "ELA completed count")
assertEqual(publicProgression.reportCard.ela.points, 10, "ELA points")
assertEqual(publicProgression.reportCard.science.completedCount, 0, "science completed count")
assertEqual(publicProgression.reportCard.math.bestScore, 1, "math best score")
assertEqual(publicProgression.reportCard.ela.lastCompletedAt, 1001, "ELA last completion")
assert(publicProgression.completed == nil, "public snapshot must not expose completion ledger")

-- Deterministic multi-day class activity rotation.
for _, classId in ipairs({ "math", "ela", "science" }) do
    local firstDayActivity = ActivityCatalog.getForClass(classId, 1)
    local secondDayActivity = ActivityCatalog.getForClass(classId, 2)
    local thirdDayActivity = ActivityCatalog.getForClass(classId, 3)

    assert(firstDayActivity ~= nil, classId .. " day-one activity missing")
    assert(secondDayActivity ~= nil, classId .. " day-two activity missing")
    assertEqual(firstDayActivity.subject, classId, classId .. " day-one subject")
    assertEqual(secondDayActivity.subject, classId, classId .. " day-two subject")
    assert(firstDayActivity.id ~= secondDayActivity.id, classId .. " activities must rotate")
    assertEqual(thirdDayActivity.id, firstDayActivity.id, classId .. " rotation must repeat deterministically")
end
assertEqual(ActivityCatalog.getForClass("math", 0), nil, "invalid day must fail closed")
assertEqual(ActivityCatalog.getForClass("unknown", 1), nil, "unknown class must fail closed")

-- Education session authority, idempotency, closure, and bounded receipt behavior.
local activity = {
    id = "math-add",
    subject = "math",
    skill = "addition",
    difficulty = 1,
    prompt = "What is 1 + 1?",
    choices = {
        { id = "a", text = "1" },
        { id = "b", text = "2" },
    },
    correctChoiceId = "b",
    hint = "Count one more.",
    explanation = "One plus one equals two.",
}

local session = EducationSession.new("session-1", 123, "math", activity)
assert(EducationSession.isOwnedBy(session, 123), "session ownership missing")

local publicActivity = EducationSession.getPublicActivity(session)
assertEqual(publicActivity.prompt, activity.prompt, "public prompt")
assert(publicActivity.correctChoiceId == nil, "public activity leaked answer key")

local wrong = EducationSession.submit(session, "submission-1", "a")
assertEqual(wrong.accepted, true, "wrong answer accepted for feedback")
assertEqual(wrong.resolved, false, "wrong answer must not resolve")
assertEqual(wrong.hint, activity.hint, "wrong answer hint")
assertEqual(session.uniqueSubmissionCount, 1, "wrong answer count")

local wrongReplay = EducationSession.submit(session, "submission-1", "a")
assert(wrongReplay == wrong, "duplicate submission should return cached receipt")
assertEqual(session.uniqueSubmissionCount, 1, "duplicate must not grow receipt count")

local closedSession = EducationSession.new("session-2", 123, "math", activity)
local acceptedBeforeClose = EducationSession.submit(closedSession, "old-submission", "a")
assertEqual(acceptedBeforeClose.accepted, true, "pre-close submission")
assert(EducationSession.close(closedSession), "close should succeed")
local staleReplay = EducationSession.submit(closedSession, "old-submission", "a")
assertEqual(staleReplay.accepted, false, "stale replay after close")
assertEqual(staleReplay.reason, "SESSION_CLOSED", "stale replay reason")
assertEqual(EducationSession.isOwnedBy(closedSession, 123), false, "closed session ownership")

local cappedSession = EducationSession.new("session-3", 123, "math", activity)
for index = 1, EducationSession.MAX_UNIQUE_SUBMISSIONS_PER_SESSION do
    local response = EducationSession.submit(
        cappedSession,
        "wrong-" .. tostring(index),
        "a"
    )
    assertEqual(response.accepted, true, "bounded wrong submission")
end
local capped = EducationSession.submit(cappedSession, "wrong-overflow", "a")
assertEqual(capped.accepted, false, "submission cap must reject overflow")
assertEqual(capped.reason, "TOO_MANY_SUBMISSIONS", "submission cap reason")

local resolvedSession = EducationSession.new("session-4", 123, "math", activity)
local correct = EducationSession.submit(resolvedSession, "correct-1", "b")
assertEqual(correct.accepted, true, "correct answer accepted")
assertEqual(correct.resolved, true, "correct answer resolves")
assertEqual(correct.score, 1, "correct answer score")
assertEqual(EducationSession.isOwnedBy(resolvedSession, 123), false, "resolved session ownership")
local afterResolved = EducationSession.submit(resolvedSession, "correct-2", "b")
assertEqual(afterResolved.accepted, false, "resolved session must reject future submissions")
assertEqual(afterResolved.reason, "SESSION_CLOSED", "resolved rejection reason")

print("pure Luau logic tests: PASS")
