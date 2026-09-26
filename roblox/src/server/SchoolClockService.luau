--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local SchoolConfig = require(ReplicatedStorage.StarBlox.SchoolConfig)

local SchoolClockService = {}

local function normalizeUnixSeconds(value: any): number
	local parsed = tonumber(value)
	if parsed == nil or parsed ~= parsed then
		return os.time()
	end
	return math.max(0, math.floor(parsed))
end

local function periodForOffset(offsetSeconds: number)
	for index, period in SchoolConfig.Periods do
		if offsetSeconds >= period.StartOffsetSeconds and offsetSeconds < period.EndOffsetSeconds then
			return index, period
		end
	end

	error("SchoolConfig periods do not cover the configured cycle")
end

local function upcomingAcademic(periodIndex: number)
	for index = periodIndex + 1, #SchoolConfig.Periods do
		local candidate = SchoolConfig.Periods[index]
		if candidate.Kind == "academic" then
			return candidate
		end
		if candidate.Kind == "report" or candidate.Kind == "after-school" then
			break
		end
	end
	return nil
end

function SchoolClockService.Resolve(unixSeconds: any)
	local now = normalizeUnixSeconds(unixSeconds)
	local cycleSeconds = SchoolConfig.CycleSeconds
	local cycleIndex = math.floor(now / cycleSeconds)
	local offsetSeconds = now % cycleSeconds
	local periodIndex, period = periodForOffset(offsetSeconds)
	local nextPeriodIndex = if periodIndex < #SchoolConfig.Periods then periodIndex + 1 else 1
	local nextPeriod = SchoolConfig.Periods[nextPeriodIndex]
	local nextAcademic = upcomingAcademic(periodIndex)
	local nextTransitionUnix = now + (period.EndOffsetSeconds - offsetSeconds)

	return table.freeze({
		ServerUnix = now,
		SchoolDayId = string.format("school-%d", cycleIndex),
		CycleIndex = cycleIndex,
		CycleSeconds = cycleSeconds,
		CycleOffsetSeconds = offsetSeconds,
		PeriodIndex = periodIndex,
		PeriodId = period.Id,
		PeriodKind = period.Kind,
		ClassId = period.ClassId,
		DisplayName = period.DisplayName,
		InGameStart = period.InGameStart,
		InGameEnd = period.InGameEnd,
		PeriodStartedAtUnix = now - (offsetSeconds - period.StartOffsetSeconds),
		PeriodEndsAtUnix = nextTransitionUnix,
		SecondsRemaining = period.EndOffsetSeconds - offsetSeconds,
		SecondsSincePeriodStart = offsetSeconds - period.StartOffsetSeconds,
		NextPeriodId = nextPeriod.Id,
		NextClassId = nextPeriod.ClassId,
		UpcomingPeriodId = if nextAcademic ~= nil then nextAcademic.Id else nil,
		UpcomingClassId = if nextAcademic ~= nil then nextAcademic.ClassId else nil,
		UpcomingClassName = if nextAcademic ~= nil then nextAcademic.DisplayName else nil,
		SchoolActive = period.Kind ~= "after-school",
		AcademicPeriod = period.Kind == "academic",
	})
end

function SchoolClockService.Now()
	return SchoolClockService.Resolve(os.time())
end

function SchoolClockService.IsEnabled(): boolean
	return SchoolConfig.FeatureFlags.SchoolSystemEnabled == true
end

return SchoolClockService
