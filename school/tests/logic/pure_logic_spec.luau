local SchoolClock = require("../../src/ReplicatedStorage/HighSchool/SchoolClock")
local ProgressionReducer = require("../../src/ServerScriptService/HighSchool/ProgressionReducer")

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

local public = ProgressionReducer.toPublicSnapshot(stateB)
assertEqual(public.points, 20, "public points")
assertEqual(public.completedCount, 2, "public completed count")
assert(public.completed == nil, "public snapshot must not expose completion ledger")

print("pure Luau logic tests: PASS")
