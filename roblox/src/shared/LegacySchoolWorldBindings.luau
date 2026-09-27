--!strict

-- Generated from pinned-source classroom-door and school food-area geometry.
-- Room letters are generated routing labels; the source does not provide room-number signage.
local LegacySchoolWorldBindings = table.freeze({
	SchemaVersion = 1,
	Revision = "legacy-real-school-bindings-v2",
	WorldRootName = "BrookhavenWorldRuntime",
	ImmutableWitnessName = "BrookhavenWorldBaseline",
	RuntimeProjectionRequired = true,
	RuntimeAnchorFolderName = "StarBloxSchoolAnchors",
	BaselineMutationAllowed = false,
	AllowFallbackSource = false,
	FallbackCampusEnabled = false,
	RequireVerifiedPhysicalClassrooms = true,
	SchoolBuildingId = "legacy-brookhaven-school",
	SelectionBasis = "pinned-legacy-school-classroom-doors-and-food-v1",
	Entrance = table.freeze({SourcePartName = "LBH_11970", HeightOffset = 2, WorldOffset = Vector3.new(1.7882, -8.0999, -0.8958), Label = "School Arrival • Room A", PhysicalRoomId = "legacy-classroom-a", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true}),
	Cafeteria = table.freeze({SourcePartName = "LBH_09733", HeightOffset = 2, WorldOffset = Vector3.new(4.4351, -16.2111, -0.0138), Label = "School Lunch Area", PhysicalRoomId = "legacy-school-lunch-area", SourceWorldPath = "Workspace/Model/SchoolFakeFood/FakeFood/Coke", PhysicalClassroomVerified = false}),
	Library = table.freeze({SourcePartName = "LBH_11970", HeightOffset = 2, WorldOffset = Vector3.new(1.7882, -8.0999, -0.8958), Label = "Make-Up Classroom • Room A", PhysicalRoomId = "legacy-classroom-a", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true}),
	Classes = table.freeze({
		["reading"] = table.freeze({SourcePartName = "LBH_11970", HeightOffset = 2, WorldOffset = Vector3.new(1.7882, -8.0999, -0.8958), Label = "Reading", PhysicalRoomId = "legacy-classroom-a", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "A"}),
		["math"] = table.freeze({SourcePartName = "LBH_12380", HeightOffset = 2, WorldOffset = Vector3.new(1.0314, -8.0999, 1.7135), Label = "Math", PhysicalRoomId = "legacy-classroom-b", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "B"}),
		["word-skills"] = table.freeze({SourcePartName = "LBH_11807", HeightOffset = 2, WorldOffset = Vector3.new(-0.7746, -8.0999, -1.8439), Label = "Word Skills", PhysicalRoomId = "legacy-classroom-c", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "C"}),
		["teacher-choice"] = table.freeze({SourcePartName = "LBH_14137", HeightOffset = 2, WorldOffset = Vector3.new(-1.7545, -8.0999, 0.9601), Label = "Teacher's Choice", PhysicalRoomId = "legacy-classroom-d", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "D"}),
		["star-lab"] = table.freeze({SourcePartName = "LBH_11970", HeightOffset = 2, WorldOffset = Vector3.new(1.7882, -8.0999, -0.8958), Label = "STAR Lab", PhysicalRoomId = "legacy-classroom-a", SourceWorldPath = "Workspace/Model/SchoolDoorClassroom/Door", PhysicalClassroomVerified = true, Room = "A"}),
	}),
})

return LegacySchoolWorldBindings
