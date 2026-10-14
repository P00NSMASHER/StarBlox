local SchoolClock = require("../../src/ReplicatedStorage/HighSchool/SchoolClock")
local ActivityCatalog = require("../../src/ServerScriptService/HighSchool/ActivityCatalog")
local ProgressionReducer = require("../../src/ServerScriptService/HighSchool/ProgressionReducer")
local EducationSession = require("../../src/ServerScriptService/HighSchool/EducationSession")
local CampusCourierActivity = require("../../src/ServerScriptService/HighSchool/CampusCourierActivity")

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


-- Server-owned campus courier objective, idempotency, and weighted progression reward.
local firstDayCourierId = CampusCourierActivity.getDailyInstanceId(123, "server-a", 1)
assertEqual(
    firstDayCourierId,
    "player:123:schedule:server-a:day:1:campus_courier",
    "daily courier id"
)
assertEqual(
    CampusCourierActivity.getDailyInstanceId(123, "server-a", 1),
    firstDayCourierId,
    "daily courier id must be deterministic within one server schedule"
)
assertEqual(
    CampusCourierActivity.getDailyInstanceId(123, "server-a", 2),
    "player:123:schedule:server-a:day:2:campus_courier",
    "next school day must allow a new courier receipt"
)
assertEqual(
    CampusCourierActivity.getDailyInstanceId(123, "server-b", 1),
    "player:123:schedule:server-b:day:1:campus_courier",
    "a new server schedule must allow a new courier receipt"
)
assertEqual(
    CampusCourierActivity.getDailyInstanceId(124, "server-a", 1),
    "player:124:schedule:server-a:day:1:campus_courier",
    "courier receipt must be player scoped"
)
assertEqual(CampusCourierActivity.getDailyInstanceId(0, "server-a", 1), nil, "invalid player id")
assertEqual(CampusCourierActivity.getDailyInstanceId(123, "", 1), nil, "blank schedule namespace")
assertEqual(CampusCourierActivity.getDailyInstanceId(123, "server:a", 1), nil, "unsafe schedule namespace")
assertEqual(CampusCourierActivity.getDailyInstanceId(123, "server-a", 0), nil, "invalid school day")
assertEqual(CampusCourierActivity.getDailyInstanceId(123, "server-a", 1.5), nil, "fractional school day")
assert(
    CampusCourierActivity.getDailyInstanceId(123, "server-a", 1)
        ~= CampusCourierActivity.getDailyInstanceId(123, "server-b", 1),
    "independent server schedules must not share completion receipts"
)
assertEqual(
    CampusCourierActivity.isCompletionIdFor(
        "activity:" .. firstDayCourierId,
        123
    ),
    true,
    "courier completion receipt binding"
)
assertEqual(
    CampusCourierActivity.isCompletionIdFor(
        "activity:" .. firstDayCourierId,
        124
    ),
    false,
    "courier completion receipt must reject another player"
)
assertEqual(
    CampusCourierActivity.isCompletionIdFor(
        "activity:player:123:schedule:server-a:day:01:campus_courier",
        123
    ),
    false,
    "courier completion receipt must be canonical"
)

local malformedCourierCreated = pcall(function()
    CampusCourierActivity.new("forged-instance", 123)
end)
assertEqual(malformedCourierCreated, false, "malformed courier instance must fail closed")

local crossPlayerCourierCreated = pcall(function()
    CampusCourierActivity.new(firstDayCourierId, 124)
end)
assertEqual(crossPlayerCourierCreated, false, "cross-player courier instance must fail closed")

local courier = CampusCourierActivity.new(firstDayCourierId, 123)
assert(CampusCourierActivity.isOwnedBy(courier, 123), "courier ownership missing")

local publicCourier = CampusCourierActivity.getPublicState(courier)
assertEqual(publicCourier.title, "Campus Courier", "courier title")
assertEqual(publicCourier.totalStops, 4, "courier stop count")
assertEqual(publicCourier.nextLocationId, "lobby", "courier first stop")
assertEqual(publicCourier.nextLocationName, "Main Lobby", "courier first stop name")
assertEqual(publicCourier.nextActionLabel, "PICK UP", "courier first action")
assertEqual(publicCourier.rewardPoints, 5, "courier advertised reward")
assertEqual(publicCourier.progressLabel, "0/4 stops", "courier initial progress")

local wrongCourierStop = CampusCourierActivity.checkIn(courier, "courier-wrong", "science")
assertEqual(wrongCourierStop.accepted, false, "wrong courier stop")
assertEqual(wrongCourierStop.reason, "WRONG_STOP", "wrong courier stop reason")
assertEqual(wrongCourierStop.nextLocationId, "lobby", "wrong stop preserves objective")
assertEqual(wrongCourierStop.nextLocationName, "Main Lobby", "wrong stop preserves destination name")
assertEqual(wrongCourierStop.nextActionLabel, "PICK UP", "wrong stop preserves action")
assertEqual(wrongCourierStop.progressLabel, "0/4 stops", "wrong stop progress")
assertEqual(
    wrongCourierStop.feedback,
    "Next stop (0/4 stops complete): Pick up the campus delivery list in the Main Lobby.",
    "wrong stop feedback includes progress and objective"
)

for index = 1, CampusCourierActivity.MAX_UNIQUE_CHECK_INS + 2 do
    local detour = CampusCourierActivity.checkIn(
        courier,
        "courier-detour-" .. tostring(index),
        "science"
    )
    assertEqual(detour.reason, "WRONG_STOP", "detour must preserve route")
end
assertEqual(courier.uniqueCheckInCount, 0, "wrong stops must not consume progress receipt budget")
assertEqual(
    CampusCourierActivity.getPublicState(courier).nextLocationId,
    "lobby",
    "detours must leave the courier playable"
)

local lobbyStop = CampusCourierActivity.checkIn(courier, "courier-lobby", "lobby")
assertEqual(lobbyStop.accepted, true, "courier lobby check-in")
assertEqual(lobbyStop.nextLocationId, "cafeteria", "courier cafeteria objective")
assertEqual(lobbyStop.nextLocationName, "Cafeteria", "courier cafeteria name")
assertEqual(lobbyStop.nextActionLabel, "DELIVER", "courier cafeteria action")
assertEqual(lobbyStop.progressLabel, "1/4 stops", "courier lobby progress")
assertEqual(
    lobbyStop.feedback,
    "Delivery confirmed (1/4 stops complete). Deliver the lunch-count note to the Cafeteria.",
    "courier lobby feedback"
)

local cafeteriaStop = CampusCourierActivity.checkIn(courier, "courier-cafeteria", "cafeteria")
assertEqual(cafeteriaStop.accepted, true, "courier cafeteria check-in")
assertEqual(cafeteriaStop.nextLocationId, "science", "courier science objective")
assertEqual(cafeteriaStop.nextLocationName, "Science Classroom", "courier science name")
assertEqual(cafeteriaStop.nextActionLabel, "DROP OFF", "courier science action")
assertEqual(cafeteriaStop.progressLabel, "2/4 stops", "courier cafeteria progress")

local scienceStop = CampusCourierActivity.checkIn(courier, "courier-science", "science")
assertEqual(scienceStop.accepted, true, "courier science check-in")
assertEqual(scienceStop.resolved, false, "science stop must preserve return leg")
assertEqual(scienceStop.rewardPoints, 0, "science stop must not reward early")
assertEqual(scienceStop.progressLabel, "3/4 stops", "courier science progress")
assertEqual(scienceStop.nextLocationId, "lobby", "courier return objective")
assertEqual(scienceStop.nextLocationName, "Main Lobby", "courier return destination")
assertEqual(scienceStop.nextActionLabel, "RETURN", "courier return action")
assertEqual(
    scienceStop.feedback,
    "Delivery confirmed (3/4 stops complete). Return the signed delivery sheet to the Main Lobby.",
    "courier science feedback"
)
assertEqual(CampusCourierActivity.isOwnedBy(courier, 123), true, "return leg remains active")

local returnLobbyStop = CampusCourierActivity.checkIn(courier, "courier-return-lobby", "lobby")
assertEqual(returnLobbyStop.accepted, true, "courier return check-in")
assertEqual(returnLobbyStop.resolved, true, "courier completion")
assertEqual(returnLobbyStop.rewardPoints, 5, "courier completion reward")
assertEqual(returnLobbyStop.progressLabel, "4/4 stops", "courier completion progress")
assertEqual(returnLobbyStop.nextLocationName, nil, "completed courier has no next destination")
assertEqual(returnLobbyStop.nextActionLabel, nil, "completed courier clears next action")
assertEqual(
    returnLobbyStop.feedback,
    "Route complete (4/4 stops complete)! You earned 5 school points.",
    "courier completion feedback"
)
assertEqual(CampusCourierActivity.isOwnedBy(courier, 123), false, "resolved courier ownership")

local returnLobbyReplay = CampusCourierActivity.checkIn(
    courier,
    "courier-return-lobby",
    "lobby"
)
assert(returnLobbyReplay == returnLobbyStop, "resolved courier retry must return cached receipt")

local courierCompletion = CampusCourierActivity.buildCompletion(courier, 1006)
assertEqual(
    courierCompletion.completionId,
    "activity:player:123:schedule:server-a:day:1:campus_courier",
    "courier completion receipt"
)
assertEqual(courierCompletion.classId, "activity:campus_courier", "courier completion class")

local forgedCourierState, forgedCourierApplied, forgedCourierReason =
    ProgressionReducer.applyCompletion(stateB, {
        completionId = "activity:player:124:schedule:server-a:day:1:campus_courier",
        playerId = 123,
        classId = "activity:campus_courier",
        score = 1,
        completedAt = 1006,
    })
assertEqual(forgedCourierApplied, false, "wrong-player courier receipt must fail closed")
assertEqual(forgedCourierReason, "INVALID_COMPLETION", "wrong-player courier receipt reason")
assertEqual(forgedCourierState.points, 20, "wrong-player courier receipt must not add points")

local courierState, courierApplied = ProgressionReducer.applyCompletion(stateB, courierCompletion)
assertEqual(courierApplied, true, "courier completion applies")
assertEqual(courierState.points, 25, "courier weighted points")

local duplicateCourierState, duplicateCourierApplied, duplicateCourierReason =
    ProgressionReducer.applyCompletion(courierState, courierCompletion)
assertEqual(duplicateCourierApplied, false, "duplicate courier completion")
assertEqual(duplicateCourierReason, "DUPLICATE_COMPLETION", "duplicate courier reason")
assertEqual(duplicateCourierState.points, 25, "duplicate courier points")

local publicCourierProgression = ProgressionReducer.toPublicSnapshot(courierState)
assertEqual(publicCourierProgression.completedCount, 2, "class completion count excludes activities")
assertEqual(publicCourierProgression.activityCompletedCount, 1, "activity completion count")
assertEqual(publicCourierProgression.reportCard.math.completedCount, 1, "courier must not alter math")
assertEqual(publicCourierProgression.reportCard.ela.completedCount, 1, "courier must not alter ELA")
assertEqual(publicCourierProgression.reportCard.science.completedCount, 0, "courier must not alter science")

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
