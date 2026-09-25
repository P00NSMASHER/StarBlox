--!strict

local WorldActivityBindings = table.freeze({
	SchemaVersion = 1,
	WorldRootName = "BrookhavenWorldBaseline",
	RuntimeAnchorFolderName = "StarBloxActivityAnchors",

	-- These source parts are immutable BHW_* parts from the verified Brookhaven
	-- baseline. StarBlox reads their transforms only; gameplay instances remain
	-- outside BrookhavenWorldBaseline.
	Spawn = table.freeze({
		SourcePartName = "BHW_3461",
		HeightOffset = 4,
	}),

	Activities = table.freeze({
		["word-portal-put-v1"] = table.freeze({
			AnchorName = "WordPortalAnchor",
			SourcePartName = "BHW_4879",
			HeightOffset = 3,
		}),
		["spelling-forge-fog-v1"] = table.freeze({
			AnchorName = "SpellingForgeAnchor",
			SourcePartName = "BHW_3191",
			HeightOffset = 3,
		}),
		["culture-lab-culture-v1"] = table.freeze({
			AnchorName = "CultureLabAnchor",
			SourcePartName = "BHW_4654",
			HeightOffset = 3,
		}),
	}),
})

return WorldActivityBindings
