--!strict

-- Generated deterministically from the pinned licensed legacy Brookhaven source.
-- Roles require exact school fixtures; missing or drifted evidence fails generation.
local LegacySchoolWorldBindings = table.freeze({
	SchemaVersion = 2,
	Revision = "legacy-real-school-bindings-v2",
	WorldRootName = "BrookhavenWorldRuntime",
	ImmutableWitnessName = "BrookhavenWorldBaseline",
	RuntimeProjectionRequired = true,
	RuntimeAnchorFolderName = "StarBloxSchoolAnchors",
	BaselineMutationAllowed = false,
	AllowFallbackSource = false,
	FallbackCampusEnabled = false,
	RequireVerifiedPhysicalClassrooms = true,
	SchoolBuildingId = "legacy-brookhaven-school-complex",
	SelectionBasis = "pinned-legacy-school-fixture-evidence-v2",
	Entrance = table.freeze({SourcePartName = "LBH_08511", AnchorFromSourceCenter = true, HeightOffset = 0, WorldOffset = Vector3.new(-3.7101, 0, 5.9359), Label = "School Entrance", PhysicalRoomId = "legacy-school-entrance", SourceWorldPath = "Workspace/Model/SchoolMat", PhysicalClassroomVerified = true}),
	Cafeteria = table.freeze({SourcePartName = "LBH_11807", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-6.8413, 0, -1.482), Label = "Cafeteria", PhysicalRoomId = "legacy-school-cafeteria", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true}),
	Library = table.freeze({SourcePartName = "LBH_14137", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-2.5183, 0, -6.5313), Label = "Study Room / Make-Up", PhysicalRoomId = "legacy-school-study-room", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true}),
	Classes = table.freeze({
		["reading"] = table.freeze({SourcePartName = "LBH_11970", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-5.9533, 0, 3.6821), Label = "Reading", PhysicalRoomId = "legacy-classroom-01", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "101"}),
		["math"] = table.freeze({SourcePartName = "LBH_12380", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-4.926, 0, 4.9734), Label = "Math", PhysicalRoomId = "legacy-classroom-02", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "102"}),
		["word-skills"] = table.freeze({SourcePartName = "LBH_14137", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-2.5183, 0, -6.5313), Label = "Word Skills", PhysicalRoomId = "legacy-classroom-03", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "103"}),
		["teacher-choice"] = table.freeze({SourcePartName = "LBH_11970", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-5.9533, 0, 3.6821), Label = "Teacher's Choice", PhysicalRoomId = "legacy-classroom-01", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "101"}),
		["star-lab"] = table.freeze({SourcePartName = "LBH_12380", AnchorFromSourceCenter = true, HeightOffset = -3.5, WorldOffset = Vector3.new(-4.926, 0, 4.9734), Label = "STAR Lab", PhysicalRoomId = "legacy-classroom-02", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "102"}),
	}),
})

return LegacySchoolWorldBindings
