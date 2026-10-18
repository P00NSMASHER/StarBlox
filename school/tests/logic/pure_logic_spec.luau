local SchoolClock = require("../../src/ReplicatedStorage/HighSchool/SchoolClock")
local SchoolAudioTheme = require("../../src/ReplicatedStorage/HighSchool/SchoolAudioTheme")
local SchoolVisualTheme = require("../../src/ReplicatedStorage/HighSchool/SchoolVisualTheme")
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

-- Every audible feedback cue has a concise non-audio equivalent.
assertEqual(SchoolAudioTheme.CUE_CAPTIONS_REQUIRED, true, "cue captions contract")

local expectedCueCaptions = {
    periodBell = "School bell rings.",
    classComplete = "Class activity complete.",
    activityComplete = "Activity complete.",
    waypointConfirm = "Destination confirmed.",
}

local expectedCueCaptionDurations = {
    periodBell = 3,
    classComplete = 2.5,
    activityComplete = 2.5,
    waypointConfirm = 2,
}

for cueId, expectedCaption in pairs(expectedCueCaptions) do
    local cue = SchoolAudioTheme.getCue(cueId)
    assert(cue ~= nil, "missing cue: " .. cueId)
    assertEqual(cue.looped, false, cueId .. " must remain a one-shot feedback cue")
    assertEqual(cue.caption, expectedCaption, cueId .. " caption")
    assertEqual(
        SchoolAudioTheme.getCueCaption(cueId),
        expectedCaption,
        cueId .. " caption lookup"
    )
    local expectedCaptionDuration = expectedCueCaptionDurations[cueId]
    assertEqual(
        cue.captionHoldSeconds,
        expectedCaptionDuration,
        cueId .. " caption duration"
    )
    assertEqual(
        SchoolAudioTheme.getCueCaptionDuration(cueId),
        expectedCaptionDuration,
        cueId .. " caption duration lookup"
    )
    assert(
        expectedCaptionDuration >= cue.maxDurationSeconds,
        cueId .. " caption must outlast its paired sound"
    )
    assert(
        expectedCaptionDuration >= 1.5 and expectedCaptionDuration <= 4,
        cueId .. " caption duration outside readable phone range"
    )
    assert(#expectedCaption <= 40, cueId .. " caption must remain concise")
end

assertEqual(
    SchoolAudioTheme.getCueCaption("missingCue"),
    nil,
    "unknown cue caption fallback"
)

assertEqual(
    SchoolAudioTheme.getCueCaptionDuration("missingCue"),
    nil,
    "unknown cue caption duration fallback"
)

-- The two-cue accessibility budget must keep the most important school
-- feedback when all four cues contend at once.
local expectedCuePriorities = {
    periodBell = 4,
    classComplete = 3,
    activityComplete = 2,
    waypointConfirm = 1,
}
local seenCuePriorities = {}
local overloadedCueIds = {}

for cueId, expectedPriority in pairs(expectedCuePriorities) do
    local cue = SchoolAudioTheme.getCue(cueId)
    assert(cue ~= nil, "missing prioritized cue: " .. cueId)
    assertEqual(cue.priority, expectedPriority, cueId .. " priority")
    assertEqual(
        SchoolAudioTheme.getCuePriority(cueId),
        expectedPriority,
        cueId .. " priority lookup"
    )
    assert(
        seenCuePriorities[expectedPriority] == nil,
        "duplicate cue priority: " .. tostring(expectedPriority)
    )
    seenCuePriorities[expectedPriority] = cueId
    table.insert(overloadedCueIds, cueId)
end

table.sort(overloadedCueIds, function(leftId, rightId)
    local leftPriority = SchoolAudioTheme.getCuePriority(leftId)
    local rightPriority = SchoolAudioTheme.getCuePriority(rightId)
    if leftPriority == rightPriority then
        return leftId < rightId
    end
    return leftPriority > rightPriority
end)

assertEqual(
    #overloadedCueIds,
    4,
    "all feedback cues participate in overload arbitration"
)
assertEqual(overloadedCueIds[1], "periodBell", "first admitted overload cue")
assertEqual(overloadedCueIds[2], "classComplete", "second admitted overload cue")
assertEqual(
    SchoolAudioTheme.getCuePriority("missingCue"),
    nil,
    "unknown cue priority fallback"
)

-- Every canonical destination resolves one bounded, unique ambience identity.
local expectedAmbienceTokens = {
    lobby = "ambience_campus_hub",
    math = "ambience_math_focus",
    ela = "ambience_language_arts_focus",
    science = "ambience_science_lab",
    cafeteria = "ambience_cafeteria_hum",
    gym = "ambience_gym_activity",
}
local expectedAmbienceMinDistances = {
    lobby = 16,
    math = 10,
    ela = 10,
    science = 10,
    cafeteria = 14,
    gym = 12,
}
local seenAmbienceTokens = {}

assertEqual(
    SchoolAudioTheme.AMBIENCE_ROLLOFF_MODE,
    "InverseTapered",
    "shared ambience rolloff mode"
)

for locationId, expectedToken in pairs(expectedAmbienceTokens) do
    local ambience = SchoolAudioTheme.getLocationAmbience(locationId)
    assert(ambience ~= nil, "missing ambience lookup: " .. locationId)
    assertEqual(ambience.looped, true, locationId .. " ambience must continue until transition")
    assertEqual(ambience.token, expectedToken, locationId .. " ambience token")
    assert(
        ambience.targetVolume > 0 and ambience.targetVolume <= 0.5,
        locationId .. " ambience volume outside safe range"
    )
    assertEqual(
        ambience.minDistance,
        expectedAmbienceMinDistances[locationId],
        locationId .. " ambience minimum distance"
    )
    assert(
        ambience.maxDistance >= 24 and ambience.maxDistance <= 64,
        locationId .. " ambience distance outside bounded range"
    )
    assert(
        ambience.minDistance >= 8 and ambience.minDistance <= 20,
        locationId .. " ambience minimum distance outside room-scale range"
    )
    assert(
        ambience.minDistance < ambience.maxDistance,
        locationId .. " ambience inner radius must be below its outer radius"
    )
    assert(
        seenAmbienceTokens[ambience.token] == nil,
        "duplicate ambience token: " .. ambience.token
    )
    seenAmbienceTokens[ambience.token] = true
end

assertEqual(
    SchoolAudioTheme.getLocationAmbience("missingLocation"),
    nil,
    "unknown ambience fallback"
)

-- Doorway hysteresis must remain short enough to feel responsive while
-- preventing repeated ambience switches near adjacent room boundaries.
local ambiencePolicy = SchoolAudioTheme.MIX_POLICY
assertEqual(ambiencePolicy.ambienceEnterHoldSeconds, 0.35, "ambience entry hold")
assertEqual(ambiencePolicy.ambienceExitPaddingStuds, 4, "ambience exit padding")
assert(
    ambiencePolicy.ambienceEnterHoldSeconds >= 0.25
        and ambiencePolicy.ambienceEnterHoldSeconds <= 1,
    "ambience entry hold outside responsive hysteresis range"
)
assert(
    ambiencePolicy.ambienceExitPaddingStuds >= 2
        and ambiencePolicy.ambienceExitPaddingStuds <= 8,
    "ambience exit padding outside bounded spatial range"
)
assert(
    ambiencePolicy.crossfadeSeconds >= ambiencePolicy.ambienceEnterHoldSeconds,
    "ambience crossfade must cover the stabilized transition"
)

-- Shared sound policy must stay immutable after lookup so one client cannot
-- silently alter cue priority, looping, or volume for later consumers.
local function assertFrozenMutationRejected(label, mutate)
    local succeeded = pcall(mutate)
    assertEqual(succeeded, false, label .. " must reject mutation")
end

assertFrozenMutationRejected("audio theme root", function()
    SchoolAudioTheme.ORIGINAL_ONLY = false
end)
assertFrozenMutationRejected("ambience rolloff mode", function()
    SchoolAudioTheme.AMBIENCE_ROLLOFF_MODE = "Linear"
end)
assertFrozenMutationRejected("mix policy", function()
    SchoolAudioTheme.MIX_POLICY.maxConcurrentCues = 99
end)
assertFrozenMutationRejected("ambience transition policy", function()
    SchoolAudioTheme.MIX_POLICY.ambienceExitPaddingStuds = 0
end)
assertFrozenMutationRejected("ambience registry", function()
    SchoolAudioTheme.LOCATION_AMBIENCE.gym = {}
end)
assertFrozenMutationRejected("ambience entry", function()
    SchoolAudioTheme.getLocationAmbience("gym").targetVolume = 1
end)
assertFrozenMutationRejected("cue registry", function()
    SchoolAudioTheme.CUES.periodBell = {}
end)
assertFrozenMutationRejected("cue entry", function()
    SchoolAudioTheme.getCue("periodBell").looped = true
end)

assertEqual(SchoolAudioTheme.ORIGINAL_ONLY, true, "audio theme root remains unchanged")
assertEqual(
    SchoolAudioTheme.AMBIENCE_ROLLOFF_MODE,
    "InverseTapered",
    "ambience rolloff mode remains unchanged"
)
assertEqual(SchoolAudioTheme.MIX_POLICY.maxConcurrentCues, 2, "mix policy remains unchanged")
assertEqual(
    SchoolAudioTheme.MIX_POLICY.ambienceEnterHoldSeconds,
    0.35,
    "ambience entry hold remains unchanged"
)
assertEqual(
    SchoolAudioTheme.MIX_POLICY.ambienceExitPaddingStuds,
    4,
    "ambience exit padding remains unchanged"
)
assertEqual(SchoolAudioTheme.getLocationAmbience("gym").targetVolume, 0.14, "ambience remains unchanged")
assertEqual(SchoolAudioTheme.getCue("periodBell").looped, false, "cue remains unchanged")

-- Shared wayfinding policy must stay immutable so one consumer cannot silently
-- relabel destinations or weaken palette contrast for later consumers.
assertEqual(
    SchoolVisualTheme.WAYFINDING_ACCENT_MIN_CONTRAST,
    3,
    "wayfinding accent contrast floor"
)
assertEqual(SchoolVisualTheme.getLocationCode("math"), "MTH", "math wayfinding code")
assertEqual(SchoolVisualTheme.getLocationType("science"), "LAB CLASSROOM", "science room type")
assertEqual(SchoolVisualTheme.getLocationCode("missingLocation"), "LOC", "unknown code fallback")
assertEqual(
    SchoolVisualTheme.getLocationType("missingLocation"),
    "DESTINATION",
    "unknown room type fallback"
)
assertEqual(
    SchoolVisualTheme.getLocationAccent("missingLocation"),
    SchoolVisualTheme.getLocationAccent("lobby"),
    "unknown accent fallback"
)

local expectedWayfinding = {
    lobby = { code = "LBY", roomType = "COMMONS" },
    math = { code = "MTH", roomType = "CLASSROOM" },
    ela = { code = "ELA", roomType = "CLASSROOM" },
    science = { code = "SCI", roomType = "LAB CLASSROOM" },
    cafeteria = { code = "CAF", roomType = "DINING" },
    gym = { code = "GYM", roomType = "ATHLETICS" },
}
local seenRuntimeCodes = {}
local seenRuntimeAccents = {}

for locationId, expected in pairs(expectedWayfinding) do
    local code = SchoolVisualTheme.getLocationCode(locationId)
    local roomType = SchoolVisualTheme.getLocationType(locationId)
    local accent = SchoolVisualTheme.getLocationAccent(locationId)

    assertEqual(code, expected.code, locationId .. " runtime wayfinding code")
    assertEqual(roomType, expected.roomType, locationId .. " runtime room type")
    assert(
        code:match("^[A-Z][A-Z][A-Z]$") ~= nil,
        locationId .. " runtime code must remain compact uppercase copy"
    )
    assert(
        #roomType <= 14,
        locationId .. " runtime room type must fit the phone sign line"
    )
    assert(
        accent.R >= 0 and accent.R <= 1
            and accent.G >= 0 and accent.G <= 1
            and accent.B >= 0 and accent.B <= 1,
        locationId .. " runtime accent channels must remain normalized"
    )

    local accentKey = string.format("%.6f:%.6f:%.6f", accent.R, accent.G, accent.B)
    assert(seenRuntimeCodes[code] == nil, "duplicate runtime code: " .. code)
    assert(seenRuntimeAccents[accentKey] == nil, "duplicate runtime accent: " .. accentKey)
    seenRuntimeCodes[code] = true
    seenRuntimeAccents[accentKey] = true
end

assertFrozenMutationRejected("visual theme root", function()
    SchoolVisualTheme.WAYFINDING_ACCENT_MIN_CONTRAST = 0
end)
assertFrozenMutationRejected("wayfinding code registry", function()
    SchoolVisualTheme.LOCATION_CODES.math = "BAD"
end)
assertFrozenMutationRejected("room type registry", function()
    SchoolVisualTheme.LOCATION_TYPES.science = "ROOM"
end)
assertFrozenMutationRejected("accent registry", function()
    SchoolVisualTheme.LOCATION_ACCENTS.gym = SchoolVisualTheme.LOCATION_ACCENTS.lobby
end)

assertEqual(
    SchoolVisualTheme.WAYFINDING_ACCENT_MIN_CONTRAST,
    3,
    "visual contrast floor remains unchanged"
)
assertEqual(SchoolVisualTheme.getLocationCode("math"), "MTH", "visual code remains unchanged")
assertEqual(
    SchoolVisualTheme.getLocationType("science"),
    "LAB CLASSROOM",
    "visual room type remains unchanged"
)

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

-- Exactly-once progression reducer behavior.
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

local duplicateState, duplicateApplied = ProgressionReducer.applyCompletion(stateA, completionA)
assertEqual(duplicateApplied, false, "duplicate completion must not apply")
assertEqual(duplicateState.points, 10, "duplicate must not add points")

local completionB = {
    completionId = "completion-b",
    playerId = 123,
    classId = "math",
    score = 1,
    completedAt = 1001,
}

local stateB, appliedB = ProgressionReducer.applyCompletion(duplicateState, completionB)
assertEqual(appliedB, true, "second unique completion applies")
assertEqual(stateB.points, 20, "two unique completions total points")

local publicProgression = ProgressionReducer.toPublicSnapshot(stateB)
assertEqual(publicProgression.points, 20, "public points")
assertEqual(publicProgression.completedCount, 2, "public completed count")
assert(publicProgression.completed == nil, "public snapshot must not expose completion ledger")

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
