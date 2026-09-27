--!strict

local SchoolWorldBindings = table.freeze({
	SchemaVersion = 2,
	Revision = "brookhaven-runtime-school-campus-v2",
	WorldRootName = "BrookhavenWorldRuntime",
	ImmutableWitnessName = "BrookhavenWorldBaseline",
	RuntimeProjectionRequired = true,
	RuntimeAnchorFolderName = "StarBloxSchoolAnchors",
	BaselineMutationAllowed = false,
	FallbackSourcePartName = "LBH_14370",
	FallbackCampusEnabled = true,

	-- Transform-only bindings into one coherent verified Brookhaven building
	-- cluster. Geometry is read from the mutable runtime projection while all
	-- school gameplay objects remain outside both Brookhaven world trees.
	Entrance = table.freeze({SourcePartName = "BHW_4876", HeightOffset = 3, FallbackOffset = Vector3.new(0, 0, 140), Label = "School Entrance"}),
	Cafeteria = table.freeze({SourcePartName = "BHW_3405", HeightOffset = 3, FallbackOffset = Vector3.new(-28, 0, 205), Label = "Cafeteria"}),
	Library = table.freeze({SourcePartName = "BHW_4820", HeightOffset = 3, FallbackOffset = Vector3.new(28, 0, 205), Label = "Library / Make-Up"}),

	Classes = table.freeze({
		["reading"] = table.freeze({SourcePartName = "BHW_3828", HeightOffset = 2, FallbackOffset = Vector3.new(-24, 0, 165), Label = "Reading", Room = "101"}),
		["math"] = table.freeze({SourcePartName = "BHW_4309", HeightOffset = 2, FallbackOffset = Vector3.new(0, 0, 165), Label = "Math", Room = "102"}),
		["word-skills"] = table.freeze({SourcePartName = "BHW_3830", HeightOffset = 2, FallbackOffset = Vector3.new(24, 0, 165), Label = "Word Skills", Room = "103"}),
		["teacher-choice"] = table.freeze({SourcePartName = "BHW_3041", HeightOffset = 2, FallbackOffset = Vector3.new(-14, 0, 188), Label = "Teacher's Choice", Room = "104"}),
		["star-lab"] = table.freeze({SourcePartName = "BHW_4667", HeightOffset = 2, FallbackOffset = Vector3.new(14, 0, 188), Label = "STAR Lab", Room = "105"}),
	}),
})

return SchoolWorldBindings
