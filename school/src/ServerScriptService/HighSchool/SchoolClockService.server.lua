local ReplicatedStorage = game:GetService("ReplicatedStorage")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local SchoolClock = require(highSchool:WaitForChild("SchoolClock"))

local existing = highSchool:FindFirstChild("FoundationRuntime")
if existing then
    existing:Destroy()
end

local runtime = Instance.new("Folder")
runtime.Name = "FoundationRuntime"
runtime.Parent = highSchool

local startedAt = time()
local lastKey = nil

local function publish()
    local state = SchoolClock.getState(time() - startedAt)
    local key = string.format("%d:%d:%d", state.dayIndex, state.periodIndex, math.floor(state.secondsIntoPeriod))

    if key == lastKey then
        return
    end
    lastKey = key

    runtime:SetAttribute("Version", 1)
    runtime:SetAttribute("DayIndex", state.dayIndex)
    runtime:SetAttribute("PeriodIndex", state.periodIndex)
    runtime:SetAttribute("PeriodId", state.periodId)
    runtime:SetAttribute("LocationId", state.locationId)
    runtime:SetAttribute("SecondsIntoPeriod", state.secondsIntoPeriod)
    runtime:SetAttribute("SecondsRemaining", state.secondsRemaining)
end

publish()

while true do
    task.wait(1)
    publish()
end
