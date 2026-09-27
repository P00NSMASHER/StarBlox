--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)
local SchoolProgressService = require(script.Parent.SchoolProgressService)

local ReportCardService = {}

local function academicPeriods()
	local out = {}
	for _, period in Config.Periods do
		if period.Kind == "academic" then
			table.insert(out, period)
		end
	end
	return out
end

function ReportCardService.Build(profileData, schoolDayId: string, claimFullDay: boolean?)
	local school = profileData.School
	local day = school and school.CurrentDay
	if type(day) ~= "table" or day.DayId ~= schoolDayId then
		return {ok = false, code = "school_day_mismatch"}
	end

	local rows = {}
	local completed = 0
	local onTime = 0
	local tardy = 0
	local missed = 0
	local scoreTotal = 0

	for _, definition in academicPeriods() do
		local period = day.Periods[definition.Id]
		local attendance = period and period.Attendance or "MISSED"
		local status = period and period.Status or "missed"
		local score = period and (tonumber(period.Score) or 0) or 0
		local grade = period and period.Grade or ""

		if status == "completed" then
			completed += 1
			scoreTotal += score
		end

		if attendance == "ON_TIME" then
			onTime += 1
		elseif attendance == "TARDY" then
			tardy += 1
		else
			missed += 1
		end

		table.insert(rows, {
			periodId = definition.Id,
			classId = definition.ClassId,
			name = definition.DisplayName,
			status = status,
			attendance = attendance,
			score = score,
			grade = grade,
		})
	end

	local fullDay = completed == #rows
	local reward = nil
	if fullDay and claimFullDay == true then
		reward = SchoolProgressService.ApplyFullDay(profileData, schoolDayId)
	end
	local earnings = SchoolProgressService.GetDayEarnings(profileData, schoolDayId)

	return {
		ok = true,
		schoolDayId = schoolDayId,
		classes = rows,
		completed = completed,
		goal = #rows,
		fullDayComplete = fullDay,
		onTime = onTime,
		tardy = tardy,
		missed = missed,
		averageScore = if completed > 0 then math.floor(scoreTotal / completed + 0.5) else 0,
		earnings = earnings,
		reward = reward,
	}
end

return ReportCardService
