--!strict

local CampusTopologyAdapter = require(script.Parent.Parent.src.shared.CampusTopologyAdapter)

return function()
	local destinations = {
		nodes = {
			{id = "ENTRANCE"},
			{id = "CLASSROOM"},
			{id = "CAFETERIA"},
		},
	}
	local interactions = {
		Doors = {
			{Id = "door-class", PartName = "DOOR_CLASS"},
			{Id = "door-cafe", PartName = "DOOR_CAFE"},
		},
	}
	local definition = {
		revision = "school-topology-v1",
		verified = true,
		corridorNodeIds = {"HALL_B", "HALL_A"},
		links = {
			{id = "entrance-hall", from = "ENTRANCE", to = "HALL_A", cost = 1},
			{id = "hall-class", from = "HALL_A", to = "CLASSROOM", cost = 2, doorPartName = "DOOR_CLASS"},
			{id = "hall-cafe", from = "HALL_A", to = "CAFETERIA", cost = 3, doorPartName = "DOOR_CAFE"},
		},
	}

	describe("CampusTopologyAdapter", function()
		it("normalizes verified campus topology into route-planner inputs", function()
			local adapted = CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, definition)
			expect(#adapted.nodes).to.equal(5)
			expect(#adapted.edges).to.equal(3)
			expect(adapted.nodes[1].id).to.equal("CAFETERIA")
			expect(adapted.nodes[4].id).to.equal("HALL_A")
			expect(adapted.revision).to.equal("school-topology-v1")
		end)

		it("maps reviewed door interactions to blockable route edges", function()
			local adapted = CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, definition)
			local edgeIds = adapted.edgeIdsByInteractionId["door-class"]
			expect(#edgeIds).to.equal(1)
			expect(adapted.interactionIdByEdgeId[edgeIds[1]]).to.equal("door-class")
			local blocked = CampusTopologyAdapter.blockedEdgeIdsForInteractions(adapted, { ["door-class"] = true })
			expect(blocked[edgeIds[1]]).to.equal(true)
		end)

		it("sorts nodes, edges, and shared-door edge mappings deterministically", function()
			local sharedDoorDefinition = {
				revision = "school-topology-v1",
				verified = true,
				corridorNodeIds = {"HALL_B", "HALL_A"},
				links = {
					{id = "z-link", from = "HALL_A", to = "CLASSROOM", cost = 2, doorPartName = "DOOR_CLASS"},
					{id = "a-link", from = "HALL_B", to = "CLASSROOM", cost = 2, doorPartName = "DOOR_CLASS"},
				},
			}
			local adapted = CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, sharedDoorDefinition)
			expect(adapted.edges[1].id < adapted.edges[2].id).to.equal(true)
			expect(adapted.edgeIdsByInteractionId["door-class"][1] < adapted.edgeIdsByInteractionId["door-class"][2]).to.equal(true)
		end)

		it("fails closed for unverified topology and unknown door parts", function()
			local unverified = table.clone(definition)
			unverified.verified = false
			expect(function()
				CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, unverified)
			end).to.throw()

			local unknownDoor = table.clone(definition)
			unknownDoor.links = {
				{id = "bad", from = "ENTRANCE", to = "HALL_A", cost = 1, doorPartName = "UNREVIEWED_DOOR"},
			}
			expect(function()
				CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, unknownDoor)
			end).to.throw()
		end)

		it("rejects endpoint drift and corridor collisions", function()
			local missingEndpoint = table.clone(definition)
			missingEndpoint.links = {{id = "bad", from = "ENTRANCE", to = "MISSING", cost = 1}}
			expect(function()
				CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, missingEndpoint)
			end).to.throw()

			local collision = table.clone(definition)
			collision.corridorNodeIds = {"ENTRANCE"}
			expect(function()
				CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, collision)
			end).to.throw()
		end)

		it("rejects duplicate interaction identities and unknown blocked interactions", function()
			local duplicate = {
				Doors = {
					{Id = "door-one", PartName = "SAME_PART"},
					{Id = "door-two", PartName = "SAME_PART"},
				},
			}
			expect(function()
				CampusTopologyAdapter.fromVerifiedTopology(destinations, duplicate, definition)
			end).to.throw()

			local adapted = CampusTopologyAdapter.fromVerifiedTopology(destinations, interactions, definition)
			expect(function()
				CampusTopologyAdapter.blockedEdgeIdsForInteractions(adapted, {missing = true})
			end).to.throw()
		end)
	end)
end
