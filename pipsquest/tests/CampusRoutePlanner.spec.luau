--!strict

local CampusRoutePlanner = require(script.Parent.Parent.src.shared.CampusRoutePlanner)

return function()
	local nodes = {
		{id = "ENTRANCE"},
		{id = "HALL_A"},
		{id = "HALL_B"},
		{id = "CLASSROOM_101"},
		{id = "CAFETERIA"},
	}

	local edges = {
		{id = "ENTRANCE_A", from = "ENTRANCE", to = "HALL_A", cost = 1},
		{id = "A_CLASS", from = "HALL_A", to = "CLASSROOM_101", cost = 2},
		{id = "ENTRANCE_B", from = "ENTRANCE", to = "HALL_B", cost = 1},
		{id = "B_CLASS", from = "HALL_B", to = "CLASSROOM_101", cost = 2},
		{id = "A_CAFE", from = "HALL_A", to = "CAFETERIA", cost = 1},
		{id = "B_CAFE", from = "HALL_B", to = "CAFETERIA", cost = 2},
	}

	describe("CampusRoutePlanner", function()
		it("chooses the lowest-cost campus route", function()
			local planner = CampusRoutePlanner.new(nodes, edges)
			local route = planner:plan("ENTRANCE", "CAFETERIA")
			expect(route.reachable).to.equal(true)
			expect(route.totalCost).to.equal(2)
			expect(table.concat(route.nodeIds, ",")).to.equal("ENTRANCE,HALL_A,CAFETERIA")
		end)

		it("breaks equal-cost route ties deterministically", function()
			local planner = CampusRoutePlanner.new(nodes, edges)
			local route = planner:plan("ENTRANCE", "CLASSROOM_101")
			expect(route.totalCost).to.equal(3)
			expect(route.nodeIds[2]).to.equal("HALL_A")
			expect(route.edgeIds[2]).to.equal("A_CLASS")
		end)

		it("reroutes around temporarily blocked doors or corridors", function()
			local planner = CampusRoutePlanner.new(nodes, edges)
			local route = planner:plan("ENTRANCE", "CLASSROOM_101", {A_CLASS = true})
			expect(route.reachable).to.equal(true)
			expect(table.concat(route.nodeIds, ",")).to.equal("ENTRANCE,HALL_B,CLASSROOM_101")
			expect(route.totalCost).to.equal(3)
		end)

		it("reports unreachable destinations without inventing a fallback", function()
			local planner = CampusRoutePlanner.new(nodes, edges)
			local route = planner:plan("ENTRANCE", "CLASSROOM_101", {
				A_CLASS = true,
				B_CLASS = true,
			})
			expect(route.reachable).to.equal(false)
			expect(route.totalCost).to.equal(nil)
			expect(#route.nodeIds).to.equal(0)
		end)

		it("respects explicitly one-way world links", function()
			local planner = CampusRoutePlanner.new(
				{{id = "GYM"}, {id = "COURTYARD"}},
				{{id = "EXIT_GATE", from = "GYM", to = "COURTYARD", cost = 1, bidirectional = false}}
			)
			expect(planner:plan("GYM", "COURTYARD").reachable).to.equal(true)
			expect(planner:plan("COURTYARD", "GYM").reachable).to.equal(false)
		end)

		it("rejects malformed campus graphs and unknown blocked edges", function()
			expect(function()
				CampusRoutePlanner.new({{id = "A"}, {id = "A"}}, {})
			end).to.throw()
			expect(function()
				CampusRoutePlanner.new({{id = "A"}}, {{id = "BAD", from = "A", to = "B", cost = 1}})
			end).to.throw()
			local planner = CampusRoutePlanner.new({{id = "A"}, {id = "B"}}, {{id = "AB", from = "A", to = "B", cost = 1}})
			expect(function()
				planner:plan("A", "B", {MISSING = true})
			end).to.throw()
		end)
	end)
end
