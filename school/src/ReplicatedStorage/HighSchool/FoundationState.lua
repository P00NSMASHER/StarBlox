local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local runtime = highSchool:WaitForChild("FoundationRuntime")

local FoundationState = {}

function FoundationState.getSnapshot()
    return table.freeze({
        version = runtime:GetAttribute("Version"),
        dayIndex = runtime:GetAttribute("DayIndex"),
        periodIndex = runtime:GetAttribute("PeriodIndex"),
        periodId = runtime:GetAttribute("PeriodId"),
        locationId = runtime:GetAttribute("LocationId"),
        secondsIntoPeriod = runtime:GetAttribute("SecondsIntoPeriod"),
        secondsRemaining = runtime:GetAttribute("SecondsRemaining"),
    })
end

return table.freeze(FoundationState)
