local SchoolClock = {}

local PERIODS = table.freeze({
    table.freeze({ id = "arrival", durationSeconds = 60, locationId = "lobby" }),
    table.freeze({ id = "math", durationSeconds = 180, locationId = "math" }),
    table.freeze({ id = "ela", durationSeconds = 180, locationId = "ela" }),
    table.freeze({ id = "science", durationSeconds = 180, locationId = "science" }),
    table.freeze({ id = "lunch", durationSeconds = 120, locationId = "cafeteria" }),
})

SchoolClock.START_MINUTE = 8 * 60
SchoolClock.SCHOOL_MINUTES_PER_SECOND = 1

local dayLengthSeconds = 0
for _, period in ipairs(PERIODS) do
    assert(period.durationSeconds > 0, "period duration must be positive")
    dayLengthSeconds += period.durationSeconds
end

SchoolClock.PERIODS = PERIODS
SchoolClock.DAY_LENGTH_SECONDS = dayLengthSeconds

function SchoolClock.getDisplay(state)
    local elapsed = 0
    for index = 1, (state.periodIndex or 1) - 1 do
        elapsed += PERIODS[index].durationSeconds
    end
    elapsed += state.secondsIntoPeriod or 0
    local minute = SchoolClock.START_MINUTE + math.floor(elapsed * SchoolClock.SCHOOL_MINUTES_PER_SECOND)
    local hour = math.floor(minute / 60) % 24
    local suffix = hour >= 12 and "PM" or "AM"
    local displayHour = hour % 12
    if displayHour == 0 then displayHour = 12 end
    local nextPeriod = PERIODS[(state.periodIndex or 1) % #PERIODS + 1]
    return string.format("%d:%02d %s", displayHour, minute % 60, suffix), nextPeriod.id
end

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
