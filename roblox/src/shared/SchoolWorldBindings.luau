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
	AllowFallbackSource = false,
	RequireVerifiedPhysicalClassrooms = true,
	FallbackSourcePartName = "LBH_14370",
	FallbackCampusEnabled = false,

	-- Transform-only bindings into one coherent verified Brookhaven building
	-- cluster. Geometry is read from the mutable runtime projection while all
	-- school gameplay objects remain outside both Brookhaven world trees.
	Entrance = table.freeze({SourcePartName = "BHW_4876", HeightOffset = 3, Label = "School Entrance", PhysicalRoomId = "unverified-current-school-entrance", PhysicalClassroomVerified = false}),
	Cafeteria = table.freeze({SourcePartName = "BHW_3405", HeightOffset = 3, Label = "Cafeteria", PhysicalRoomId = "unverified-current-school-cafeteria", PhysicalClassroomVerified = false}),
	Library = table.freeze({SourcePartName = "BHW_4820", HeightOffset = 3, Label = "Study Room / Make-Up", PhysicalRoomId = "unverified-current-school-study-room", PhysicalClassroomVerified = false}),

	Classes = table.freeze({
		["reading"] = table.freeze({SourcePartName = "BHW_3828", HeightOffset = 2, Label = "Reading", Room = "101", PhysicalRoomId = "unverified-current-classroom-101", PhysicalClassroomVerified = false}),
		["math"] = table.freeze({SourcePartName = "BHW_4309", HeightOffset = 2, Label = "Math", Room = "102", PhysicalRoomId = "unverified-current-classroom-102", PhysicalClassroomVerified = false}),
		["word-skills"] = table.freeze({SourcePartName = "BHW_3830", HeightOffset = 2, Label = "Word Skills", Room = "103", PhysicalRoomId = "unverified-current-classroom-103", PhysicalClassroomVerified = false}),
		["teacher-choice"] = table.freeze({SourcePartName = "BHW_3041", HeightOffset = 2, Label = "Teacher's Choice", Room = "101", PhysicalRoomId = "unverified-current-classroom-101", PhysicalClassroomVerified = false}),
		["star-lab"] = table.freeze({SourcePartName = "BHW_4667", HeightOffset = 2, Label = "STAR Lab", Room = "102", PhysicalRoomId = "unverified-current-classroom-102", PhysicalClassroomVerified = false}),
	}),
})

return SchoolWorldBindings
