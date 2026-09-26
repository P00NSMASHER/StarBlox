--!strict

local SchoolWorldBindings = table.freeze({
	SchemaVersion = 1,
	WorldRootName = "BrookhavenWorldBaseline",
	RuntimeAnchorFolderName = "StarBloxSchoolAnchors",
	BaselineMutationAllowed = false,

	-- Transform-only bindings into one coherent verified Brookhaven building
	-- cluster. Runtime gameplay objects are always parented outside the locked
	-- BrookhavenWorldBaseline.
	Entrance = table.freeze({SourcePartName = "BHW_4876", HeightOffset = 3, Label = "School Entrance"}),
	Cafeteria = table.freeze({SourcePartName = "BHW_3405", HeightOffset = 3, Label = "Cafeteria"}),
	Library = table.freeze({SourcePartName = "BHW_4820", HeightOffset = 3, Label = "Library / Make-Up"}),

	Classes = table.freeze({
		["reading"] = table.freeze({SourcePartName = "BHW_3828", HeightOffset = 2, Label = "Reading", Room = "101"}),
		["math"] = table.freeze({SourcePartName = "BHW_4309", HeightOffset = 2, Label = "Math", Room = "102"}),
		["word-skills"] = table.freeze({SourcePartName = "BHW_3830", HeightOffset = 2, Label = "Word Skills", Room = "103"}),
		["teacher-choice"] = table.freeze({SourcePartName = "BHW_3041", HeightOffset = 2, Label = "Teacher's Choice", Room = "104"}),
		["star-lab"] = table.freeze({SourcePartName = "BHW_4667", HeightOffset = 2, Label = "STAR Lab", Room = "105"}),
	}),
})

return SchoolWorldBindings
