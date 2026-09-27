--!strict

local WorldActivityBindings = table.freeze({
	SchemaVersion = 2,
	WorldRootName = "BrookhavenWorldRuntime",
	RuntimeAnchorFolderName = "StarBloxActivityAnchors",

	-- These source parts are immutable BHW_* parts from the verified Brookhaven
	-- baseline. StarBlox reads their transforms only; gameplay instances remain
	-- outside BrookhavenWorldBaseline.
	--
	-- Brookhaven parity spawn: a collidable town-square plaza tile immediately
	-- beside the fountain. The runtime player spawn is projected onto the plaza
	-- tile and faces the fountain.
	Spawn = table.freeze({
		SourcePartName = "BHW_1202",
		FacingSourcePartName = "BHW_2442",
		HeightOffset = 3,
		-- The legacy Brookhaven place exposes town-center SpawnLocations in 3x3
		-- grids at 4-stud spacing. Keep StarBlox on the verified plaza tile,
		-- but mirror that spacing so players do not stack at one point.
		Pattern = "legacy-town-center-3x3-v1",
		Slots = table.freeze({
			table.freeze({X = -4, Z = -4}),
			table.freeze({X = 0, Z = -4}),
			table.freeze({X = 4, Z = -4}),
			table.freeze({X = -4, Z = 0}),
			table.freeze({X = 0, Z = 0}),
			table.freeze({X = 4, Z = 0}),
			table.freeze({X = -4, Z = 4}),
			table.freeze({X = 0, Z = 4}),
			table.freeze({X = 4, Z = 4}),
		}),
	}),

	Activities = table.freeze({
		["word-portal-put-v1"] = table.freeze({
			AnchorName = "WordPortalAnchor",
			SourcePartName = "BHW_4879",
			HeightOffset = 3,
		}),
		["spelling-forge-fog-v1"] = table.freeze({
			AnchorName = "SpellingForgeAnchor",
			SourcePartName = "BHW_4876",
			HeightOffset = 3,
		}),
		["culture-lab-culture-v1"] = table.freeze({
			AnchorName = "CultureLabAnchor",
			SourcePartName = "BHW_3405",
			HeightOffset = 3,
		}),
	}),
})

return WorldActivityBindings
