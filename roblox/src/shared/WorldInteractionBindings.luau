--!strict

-- Explicit activation boundary for Brookhaven world interactions.
-- The source map already contains native Seat/VehicleSeat classes.
-- Doors, garage panels, and Neon fixtures remain inactive until an exact
-- reviewed entry is deliberately added here. Candidate geometry alone
-- never grants mutation authority.
local WorldInteractionBindings = table.freeze({
	SchemaVersion = 1,
	Revision = "candidate-review-boundary-v1",
	WorldRootName = "BrookhavenWorldBaseline",
	NativeSeats = table.freeze({
		UseSourceSeatClasses = true,
		ExpectedSeatCount = 271,
		ExpectedVehicleSeatCount = 2,
	}),
	Doors = table.freeze({}),
	GarageDoors = table.freeze({}),
	Lights = table.freeze({}),
	AutomaticCandidateActivationAllowed = false,
})

return WorldInteractionBindings
