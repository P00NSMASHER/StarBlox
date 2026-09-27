--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)
local Bindings = require(ReplicatedStorage.StarBlox.SchoolWorldBindings)

local SchoolAttendanceService = {}
SchoolAttendanceService.__index = SchoolAttendanceService

local function resolvePart(worldRoot: Model, sourcePartName: string): (BasePart, boolean)
	local part = worldRoot:FindFirstChild(sourcePartName, true)
	if part ~= nil and part:IsA("BasePart") then
		return part :: BasePart, false
	end
	local fallback = worldRoot:FindFirstChild(Bindings.FallbackSourcePartName, true)
	assert(
		fallback ~= nil and fallback:IsA("BasePart"),
		"school source and fallback parts are missing: " .. sourcePartName
	)
	return fallback :: BasePart, true
end

local function anchorCFrame(source: BasePart, heightOffset: number, fallbackOffset: Vector3?): CFrame
	return CFrame.new(source.Position + Vector3.new(0, (source.Size.Y / 2) + heightOffset, 0) + (fallbackOffset or Vector3.zero))
end

local function runtimeAnchor(folder: Folder, worldRoot: Model, name: string, binding, size: Vector3): Part
	local source, usedFallback = resolvePart(worldRoot, binding.SourcePartName)
	local anchor = Instance.new("Part")
	anchor.Name = name
	anchor.Size = size
	anchor.CFrame = anchorCFrame(source, binding.HeightOffset, if usedFallback then binding.FallbackOffset else nil)
	anchor.Transparency = 1
	anchor.Anchored = true
	anchor.CanCollide = false
	anchor.CanTouch = false
	anchor.CanQuery = false
	anchor.CastShadow = false
	anchor:SetAttribute("SourceWorldPart", binding.SourcePartName)
	anchor:SetAttribute("FallbackSourceUsed", usedFallback)
	anchor:SetAttribute("WorldBindingOnly", true)
	anchor.Parent = folder
	return anchor
end

local function campusPart(parent: Instance, name: string, size: Vector3, cframe: CFrame, color: Color3, material: Enum.Material?): Part
	local object = Instance.new("Part")
	object.Name = name
	object.Size = size
	object.CFrame = cframe
	object.Color = color
	object.Material = material or Enum.Material.SmoothPlastic
	object.Anchored = true
	object.CanCollide = true
	object.CanTouch = true
	object.CanQuery = true
	object.Parent = parent
	return object
end

local function roomLabel(parent: BasePart, text: string)
	local surface = Instance.new("SurfaceGui")
	surface.Face = Enum.NormalId.Front
	surface.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	surface.PixelsPerStud = 28
	surface.Parent = parent
	local label = Instance.new("TextLabel")
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 1
	label.Text = text
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Font = Enum.Font.GothamBold
	label.TextScaled = true
	label.Parent = surface
end

local function buildFallbackCampus(folder: Folder, entrance: BasePart)
	local campus = Instance.new("Model")
	campus.Name = "StarBloxHighSchool"
	campus:SetAttribute("RuntimeOwned", true)
	campus:SetAttribute("BrookhavenWitnessMutated", false)
	campus.Parent = folder

	local origin = CFrame.new(entrance.Position - Vector3.new(0, 3, 0))
	local navy = Color3.fromRGB(31, 55, 87)
	local blue = Color3.fromRGB(74, 166, 224)
	local white = Color3.fromRGB(238, 244, 249)
	local glass = Color3.fromRGB(154, 220, 240)
	local floor = campusPart(campus, "CampusFloor", Vector3.new(76, 1, 88), origin * CFrame.new(0, -0.5, 33), Color3.fromRGB(205, 211, 217), Enum.Material.Concrete)
	floor:SetAttribute("SchoolCampusFloor", true)

	-- Main shell leaves a wide front entrance and a bright central hallway.
	campusPart(campus, "LeftWall", Vector3.new(1, 18, 88), origin * CFrame.new(-38, 9, 33), white, nil)
	campusPart(campus, "RightWall", Vector3.new(1, 18, 88), origin * CFrame.new(38, 9, 33), white, nil)
	campusPart(campus, "BackWall", Vector3.new(76, 18, 1), origin * CFrame.new(0, 9, 77), white, nil)
	campusPart(campus, "FrontLeft", Vector3.new(28, 18, 1), origin * CFrame.new(-24, 9, -11), white, nil)
	campusPart(campus, "FrontRight", Vector3.new(28, 18, 1), origin * CFrame.new(24, 9, -11), white, nil)
	local sign = campusPart(campus, "SchoolSign", Vector3.new(30, 5, 1), origin * CFrame.new(0, 14, -11.2), navy, nil)
	roomLabel(sign, "STARBLOX HIGH SCHOOL")

	for _, x in {-34, 34} do
		campusPart(campus, "FrontGlass", Vector3.new(7, 9, 0.5), origin * CFrame.new(x, 6, -11.4), glass, Enum.Material.Glass).Transparency = 0.18
	end
	for _, z in {11, 35, 59} do
		campusPart(campus, "HallStripe", Vector3.new(10, 0.08, 2), origin * CFrame.new(0, 0.06, z), blue, Enum.Material.Neon)
	end

	local roomSpecs = {
		{"READING • 101", -24, 14, Color3.fromRGB(93, 180, 115)},
		{"MATH • 102", 0, 14, Color3.fromRGB(76, 154, 224)},
		{"WORD SKILLS • 103", 24, 14, Color3.fromRGB(189, 102, 189)},
		{"TEACHER'S CHOICE • 104", -14, 38, Color3.fromRGB(235, 157, 67)},
		{"STAR LAB • 105", 14, 38, Color3.fromRGB(63, 196, 210)},
		{"CAFETERIA", -25, 65, Color3.fromRGB(220, 116, 86)},
		{"LIBRARY", 25, 65, Color3.fromRGB(117, 98, 201)},
	}
	for _, spec in roomSpecs do
		local roomFloor = campusPart(campus, "RoomZone", Vector3.new(20, 0.18, 17), origin * CFrame.new(spec[2], 0.12, spec[3]), spec[4], Enum.Material.SmoothPlastic)
		roomFloor.Transparency = 0.12
		local roomSign = campusPart(campus, "RoomSign", Vector3.new(17, 2.8, 0.45), origin * CFrame.new(spec[2], 7.5, spec[3] - 8), navy, nil)
		roomLabel(roomSign, spec[1])
		for desk = -1, 1 do
			campusPart(campus, "Desk", Vector3.new(3.8, 1.1, 2), origin * CFrame.new(spec[2] + desk * 5, 1.2, spec[3]), Color3.fromRGB(228, 190, 125), Enum.Material.Wood)
		end
	end

	campusPart(campus, "Roof", Vector3.new(76, 1, 88), origin * CFrame.new(0, 18.5, 33), navy, nil).Transparency = 0.08
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
	if specialAnchors.Entrance:GetAttribute("FallbackSourceUsed") == true and Bindings.FallbackCampusEnabled == true then
		buildFallbackCampus(folder, specialAnchors.Entrance)
	end

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
