local SchoolClock = {}

local PERIODS = table.freeze({
    table.freeze({ id = "arrival", durationSeconds = 60, locationId = "lobby" }),
    table.freeze({ id = "math", durationSeconds = 180, locationId = "math" }),
    table.freeze({ id = "ela", durationSeconds = 180, locationId = "ela" }),
    table.freeze({ id = "science", durationSeconds = 180, locationId = "science" }),
    table.freeze({ id = "lunch", durationSeconds = 120, locationId = "cafeteria" }),
})

local dayLengthSeconds = 0
for _, period in ipairs(PERIODS) do
    assert(period.durationSeconds > 0, "period duration must be positive")
    dayLengthSeconds += period.durationSeconds
end

SchoolClock.PERIODS = PERIODS
SchoolClock.DAY_LENGTH_SECONDS = dayLengthSeconds

function SchoolClock.getState(elapsedSeconds)
    assert(type(elapsedSeconds) == "number" and elapsedSeconds >= 0, "elapsedSeconds must be non-negative")

    local dayIndex = math.floor(elapsedSeconds / dayLengthSeconds) + 1
    local daySecond = elapsedSeconds % dayLengthSeconds
    local cursor = 0

    for periodIndex, period in ipairs(PERIODS) do
        local nextCursor = cursor + period.durationSeconds
        if daySecond < nextCursor then
            return table.freeze({
                dayIndex = dayIndex,
                periodIndex = periodIndex,
                periodId = period.id,
                locationId = period.locationId,
                secondsIntoPeriod = daySecond - cursor,
                secondsRemaining = nextCursor - daySecond,
            })
        end
        cursor = nextCursor
    end

    error("school clock failed to resolve a period")
end

return table.freeze(SchoolClock)
