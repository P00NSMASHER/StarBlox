--!strict

local SchoolWorldBindings = table.freeze({
	SchemaVersion = 2,
	Revision = "brookhaven-runtime-school-campus-v2",
	WorldRootName = "BrookhavenWorldRuntime",
	ImmutableWitnessName = "BrookhavenWorldBaseline",
	RuntimeProjectionRequired = true,
	RuntimeAnchorFolderName = "StarBloxSchoolAnchors",
	BaselineMutationAllowed = false,
	SchoolBuildingId = "current-brookhaven-school",
	AllowFallbackSource = true,
	RequireVerifiedPhysicalClassrooms = true,
	FallbackSourcePartName = "LBH_14370",
	FallbackCampusEnabled = true,

	-- Transform-only bindings into one coherent verified Brookhaven building
	-- cluster. Geometry is read from the mutable runtime projection while all
	-- school gameplay objects remain outside both Brookhaven world trees.
	Entrance = table.freeze({SourcePartName = "BHW_4876", HeightOffset = 3, FallbackOffset = Vector3.new(0, 0, 140), Label = "School Entrance", PhysicalRoomId = "school-entrance", PhysicalClassroomVerified = true}),
	Cafeteria = table.freeze({SourcePartName = "BHW_3405", HeightOffset = 3, FallbackOffset = Vector3.new(-28, 0, 205), Label = "Cafeteria", PhysicalRoomId = "school-cafeteria", PhysicalClassroomVerified = true}),
	Library = table.freeze({SourcePartName = "BHW_4820", HeightOffset = 3, FallbackOffset = Vector3.new(28, 0, 205), Label = "Library / Make-Up", PhysicalRoomId = "school-library", PhysicalClassroomVerified = true}),

	Classes = table.freeze({
		["reading"] = table.freeze({SourcePartName = "BHW_3828", HeightOffset = 2, FallbackOffset = Vector3.new(-24, 0, 165), Label = "Reading", Room = "101", PhysicalRoomId = "current-classroom-101", PhysicalClassroomVerified = true}),
		["math"] = table.freeze({SourcePartName = "BHW_4309", HeightOffset = 2, FallbackOffset = Vector3.new(0, 0, 165), Label = "Math", Room = "102", PhysicalRoomId = "current-classroom-102", PhysicalClassroomVerified = true}),
		["word-skills"] = table.freeze({SourcePartName = "BHW_3830", HeightOffset = 2, FallbackOffset = Vector3.new(24, 0, 165), Label = "Word Skills", Room = "103", PhysicalRoomId = "current-classroom-103", PhysicalClassroomVerified = true}),
		["teacher-choice"] = table.freeze({SourcePartName = "BHW_3041", HeightOffset = 2, FallbackOffset = Vector3.new(-14, 0, 188), Label = "Teacher's Choice", Room = "104", PhysicalRoomId = "current-classroom-104", PhysicalClassroomVerified = true}),
		["star-lab"] = table.freeze({SourcePartName = "BHW_4667", HeightOffset = 2, FallbackOffset = Vector3.new(14, 0, 188), Label = "STAR Lab", Room = "105", PhysicalRoomId = "current-classroom-105", PhysicalClassroomVerified = true}),
	}),
})

return SchoolWorldBindings
