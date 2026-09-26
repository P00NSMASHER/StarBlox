--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)
local Bindings = require(ReplicatedStorage.StarBlox.SchoolWorldBindings)

local SchoolAttendanceService = {}
SchoolAttendanceService.__index = SchoolAttendanceService

local function resolvePart(worldRoot: Model, sourcePartName: string): BasePart
	local part = worldRoot:FindFirstChild(sourcePartName, true)
	assert(part ~= nil and part:IsA("BasePart"), "school source part missing: " .. sourcePartName)
	return part :: BasePart
end

local function anchorCFrame(source: BasePart, heightOffset: number): CFrame
	return CFrame.new(source.Position + Vector3.new(0, (source.Size.Y / 2) + heightOffset, 0))
end

function SchoolAttendanceService.BuildWorld()
	local worldRoot = Workspace:FindFirstChild(Bindings.WorldRootName)
	assert(worldRoot ~= nil and worldRoot:IsA("Model"), "verified Brookhaven world root missing")

	local previous = Workspace:FindFirstChild(Bindings.RuntimeAnchorFolderName)
	if previous then previous:Destroy() end

	local folder = Instance.new("Folder")
	folder.Name = Bindings.RuntimeAnchorFolderName
	folder:SetAttribute("BaselineMutationAllowed", false)
	folder.Parent = Workspace

	local prompts = {}
	local anchors = {}

	for classId, binding in Bindings.Classes do
		local source = resolvePart(worldRoot, binding.SourcePartName)

		local anchor = Instance.new("Part")
		anchor.Name = "SchoolClass_" .. classId
		anchor.Size = Vector3.new(10, 1, 10)
		anchor.CFrame = anchorCFrame(source, binding.HeightOffset)
		anchor.Transparency = 1
		anchor.Anchored = true
		anchor.CanCollide = false
		anchor.CanTouch = false
		anchor.CanQuery = false
		anchor:SetAttribute("ClassId", classId)
		anchor:SetAttribute("Room", binding.Room)
		anchor:SetAttribute("SourceWorldPart", binding.SourcePartName)
		anchor.Parent = folder

		local prompt = Instance.new("ProximityPrompt")
		prompt.Name = "JoinClassPrompt"
		prompt.ActionText = "Join Class"
		prompt.ObjectText = binding.Label .. " • Room " .. binding.Room
		prompt.MaxActivationDistance = 16
		prompt.RequiresLineOfSight = false
		prompt.Parent = anchor

		prompts[classId] = prompt
		anchors[classId] = anchor
	end

	return folder, prompts, anchors
end

function SchoolAttendanceService.Mark(profileData, schoolDayId: string, periodId: string, secondsSinceStart: number)
	local school = profileData.School
	if type(school) ~= "table" or school.CurrentDay.DayId ~= schoolDayId then
		return {ok = false, code = "school_day_mismatch"}
	end

	local period = school.CurrentDay.Periods[periodId]
	if type(period) ~= "table" then
		return {ok = false, code = "class_not_open"}
	end

	if period.Attendance ~= "UNSET" and period.Attendance ~= nil then
		return {ok = true, attendance = period.Attendance, duplicate = true}
	end

	local attendance = if secondsSinceStart <= Config.Attendance.OnTimeGraceSeconds then "ON_TIME" else "TARDY"
	period.Attendance = attendance
	if school.CurrentDay.AttendanceCounted ~= true then
		school.CurrentDay.AttendanceCounted = true
		school.Statistics.DaysAttended = (tonumber(school.Statistics.DaysAttended) or 0) + 1
	end
	if attendance == "ON_TIME" then
		school.Statistics.OnTimeClasses = (tonumber(school.Statistics.OnTimeClasses) or 0) + 1
	end

	return {ok = true, attendance = attendance, duplicate = false}
end

function SchoolAttendanceService.MarkMissed(profileData, schoolDayId: string, periodId: string, classId: string): boolean
	local school = profileData.School
	if type(school) ~= "table" or school.CurrentDay.DayId ~= schoolDayId then return false end

	local existing = school.CurrentDay.Periods[periodId]
	if existing ~= nil then
		if existing.Attendance == "UNSET" or existing.Attendance == nil then existing.Attendance = "MISSED" end
		return true
	end

	school.CurrentDay.Periods[periodId] = {
		PeriodId = periodId,
		ClassId = classId,
		Status = "missed",
		Score = 0,
		Grade = "",
		CompletedQuestionCount = 0,
		QuestionCount = Config.QuestionsPerAcademicPeriod,
		Attendance = "MISSED",
		BankSnapshotId = "",
		QuestionSnapshots = {},
		Attempts = {},
	}
	return true
end

return SchoolAttendanceService
