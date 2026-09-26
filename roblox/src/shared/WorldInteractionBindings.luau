--!strict

-- Explicit activation boundary for Brookhaven runtime interactions.
-- The immutable source witness remains in ServerStorage/BrookhavenWorldBaseline.
-- Only the mutable Workspace/BrookhavenWorldRuntime projection may receive
-- prompts or transient gameplay property changes.
local WorldInteractionBindings = table.freeze({
	SchemaVersion = 3,
	Revision = "reviewed-runtime-interactions-v2",
	WorldRootName = "BrookhavenWorldRuntime",
	ImmutableWitnessName = "BrookhavenWorldBaseline",

	NativeSeats = table.freeze({
		UseSourceSeatClasses = true,
		ExpectedSeatCount = 271,
		ExpectedVehicleSeatCount = 2,
	}),

	-- Reviewed activation only. This intentionally contains one proof door,
	-- not the broad geometry-derived candidate population.
	Doors = table.freeze({
		table.freeze({
			Id = "door-proof-1454",
			PartName = "BHW_1454",
			SourceEntryIndex = 1454,
			HelperPartName = "BHW_1461",
			HelperSourceEntryIndex = 1461,
			ReviewBasis = "strict-standard-door-plus-nearby-tiny-helper",
			MaxActivationDistance = 9,
			OpenSeconds = 1.35,
			HingeSide = -1,
			SwingDegrees = 88,
		}),
	}),

	-- Frameworks are runtime-ready, but remain empty until exact rendered
	-- evidence promotes a specific frozen-source entry into reviewed status.
	GarageDoors = table.freeze({}),
	Lights = table.freeze({}),

	CandidateSummary = table.freeze({
		DoorCandidates = 46,
		StrictDoorCandidates = 14,
		StrictDoorHelperEvidence = 1,
		GarageCandidates = 101,
		LightCandidates = 111,
	}),

	-- Broad candidate populations can never become active automatically.
	AutomaticCandidateActivationAllowed = false,
})

return WorldInteractionBindings
