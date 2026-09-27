--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)
local MirrorConfig = require(ReplicatedStorage.StarBlox.BrookhavenMirrorConfig)

local function selectedBindings()
	if MirrorConfig.World.Mode == "legacy-reference-safe-world" then
		local legacyModule = ReplicatedStorage.StarBlox:FindFirstChild("LegacySchoolWorldBindings")
		assert(legacyModule ~= nil and legacyModule:IsA("ModuleScript"), "legacy school bindings are required")
		return require(legacyModule)
	end
	return require(ReplicatedStorage.StarBlox.SchoolWorldBindings)
end

local Bindings = selectedBindings()

local SchoolAttendanceService = {}
SchoolAttendanceService.__index = SchoolAttendanceService

local function resolvePart(worldRoot: Model, sourcePartName: string): (BasePart, boolean)
	local part = worldRoot:FindFirstChild(sourcePartName, true)
	if part ~= nil and part:IsA("BasePart") then
		return part :: BasePart, false
	end
	assert(Bindings.AllowFallbackSource == true, "verified school source part is missing: " .. sourcePartName)
	local fallback = worldRoot:FindFirstChild(Bindings.FallbackSourcePartName, true)
	assert(
		fallback ~= nil and fallback:IsA("BasePart"),
		"school source and fallback parts are missing: " .. sourcePartName
	)
	return fallback :: BasePart, true
end

local function anchorCFrame(source: BasePart, binding, fallbackOffset: Vector3?): CFrame
	local sourceHeight = if binding.AnchorFromSourceCenter == true then 0 else source.Size.Y / 2
	return CFrame.new(source.Position + Vector3.new(0, sourceHeight + binding.HeightOffset, 0) + (binding.WorldOffset or Vector3.zero) + (fallbackOffset or Vector3.zero))
end

local function runtimeAnchor(folder: Folder, worldRoot: Model, name: string, binding, size: Vector3): Part
	local source, usedFallback = resolvePart(worldRoot, binding.SourcePartName)
	local anchor = Instance.new("Part")
	anchor.Name = name
	anchor.Size = size
	anchor.CFrame = anchorCFrame(source, binding, if usedFallback then binding.FallbackOffset else nil)
	anchor.Transparency = 1
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanTouch = false
	anchor.CanQuery = false
	anchor.CastShadow = false
	anchor:SetAttribute("SourceWorldPart", binding.SourcePartName)
	anchor:SetAttribute("FallbackSourceUsed", usedFallback)
	anchor:SetAttribute("SchoolBuildingId", Bindings.SchoolBuildingId)
	anchor:SetAttribute("PhysicalRoomId", binding.PhysicalRoomId)
	anchor:SetAttribute("PhysicalClassroomVerified", binding.PhysicalClassroomVerified == true)
	anchor:SetAttribute("SourceWorldPath", binding.SourceWorldPath)
	anchor:SetAttribute("WorldBindingOnly", true)
	anchor.Parent = folder
	return anchor
end

function SchoolAttendanceService.BuildWorld()
	local worldRoot = Workspace:FindFirstChild(Bindings.WorldRootName)
	assert(
		worldRoot ~= nil and worldRoot:IsA("Model"),
		"Brookhaven runtime projection missing for school integration: " .. Bindings.WorldRootName
	)
	if Bindings.RuntimeProjectionRequired == true then
		assert(
			worldRoot:GetAttribute("StarBloxRuntimeProjection") == true,
			"school integration requires the verified Brookhaven runtime projection"
		)
		assert(
			worldRoot:GetAttribute("ImmutableWitnessName") == Bindings.ImmutableWitnessName,
			"school runtime projection is not bound to the expected immutable witness"
		)
	end
	assert(
		Workspace:FindFirstChild(Bindings.ImmutableWitnessName) == nil,
		"immutable Brookhaven witness must not be exposed in Workspace"
	)

	local previous = Workspace:FindFirstChild(Bindings.RuntimeAnchorFolderName)
	if previous then previous:Destroy() end

	local folder = Instance.new("Folder")
	folder.Name = Bindings.RuntimeAnchorFolderName
	folder:SetAttribute("BaselineMutationAllowed", false)
	folder:SetAttribute("WorldRootName", Bindings.WorldRootName)
	folder:SetAttribute("ImmutableWitnessName", Bindings.ImmutableWitnessName)
	folder:SetAttribute("RuntimeProjectionVerified", true)
	folder.Parent = Workspace

	local prompts = {}
	local anchors = {}

	for classId, binding in Bindings.Classes do
		local anchor = runtimeAnchor(folder, worldRoot, "SchoolClass_" .. classId, binding, Vector3.new(10, 1, 10))
		anchor:SetAttribute("ClassId", classId)
		anchor:SetAttribute("Room", binding.Room)

		local prompt = Instance.new("ProximityPrompt")
		prompt.Name = "JoinClassPrompt"
		prompt.ActionText = "Join Class"
		prompt.ObjectText = binding.Label .. " • Room " .. binding.Room
		prompt.HoldDuration = 0
		prompt.MaxActivationDistance = 16
		prompt.RequiresLineOfSight = false
		prompt.KeyboardKeyCode = Enum.KeyCode.E
		prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
		prompt.Parent = anchor

		prompts[classId] = prompt
		anchors[classId] = anchor
	end

	local specialAnchors = {
		Entrance = runtimeAnchor(folder, worldRoot, "SchoolEntrance", Bindings.Entrance, Vector3.new(12, 1, 12)),
		Cafeteria = runtimeAnchor(folder, worldRoot, "SchoolCafeteria", Bindings.Cafeteria, Vector3.new(12, 1, 12)),
		Library = runtimeAnchor(folder, worldRoot, "SchoolLibrary", Bindings.Library, Vector3.new(10, 1, 10)),
	}
	assert(Bindings.FallbackCampusEnabled ~= true, "generic school fallback campus is not permitted")

	local makeupPrompt = Instance.new("ProximityPrompt")
	makeupPrompt.Name = "MakeUpClassPrompt"
	makeupPrompt.ActionText = "Make Up Class"
	makeupPrompt.ObjectText = Bindings.Library.Label
	makeupPrompt.HoldDuration = 0
	makeupPrompt.MaxActivationDistance = 16
	makeupPrompt.RequiresLineOfSight = false
	makeupPrompt.KeyboardKeyCode = Enum.KeyCode.E
	makeupPrompt.GamepadKeyCode = Enum.KeyCode.ButtonX
	makeupPrompt.Parent = specialAnchors.Library

	local specialPrompts = {
		Makeup = makeupPrompt,
	}

	return folder, prompts, anchors, specialPrompts, specialAnchors
end

function SchoolAttendanceService.ValidateProximity(player: Player, anchor: BasePart, maxDistance: number?): boolean
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if root == nil or not root:IsA("BasePart") then
		return false
	end
	local limit = math.max(1, tonumber(maxDistance) or 20)
	return (root.Position - anchor.Position).Magnitude <= limit
end

function SchoolAttendanceService.ValidatePhysicalSchoolAnchor(anchor: BasePart?): boolean
	if anchor == nil or not anchor:IsA("BasePart") then
		return false
	end
	if anchor:GetAttribute("FallbackSourceUsed") == true then
		return false
	end
	if anchor:GetAttribute("PhysicalClassroomVerified") ~= true then
		return false
	end
	if anchor:GetAttribute("SchoolBuildingId") ~= Bindings.SchoolBuildingId then
		return false
	end
	local physicalRoomId = anchor:GetAttribute("PhysicalRoomId")
	return type(physicalRoomId) == "string" and physicalRoomId ~= ""
end

function SchoolAttendanceService.ValidateClassroomAnchor(anchor: BasePart?, classId: string): boolean
	return SchoolAttendanceService.ValidatePhysicalSchoolAnchor(anchor)
		and (anchor :: BasePart):GetAttribute("ClassId") == classId
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
		CurrentQuestionIndex = 1,
		Attendance = "MISSED",
		BankSnapshotId = "",
		BankSourceHash = "",
		QuestionSnapshots = {},
		Attempts = {},
		OpenedAtUnix = 0,
		CompletedAtUnix = 0,
		Makeup = false,
	}
	return true
end

return SchoolAttendanceService
