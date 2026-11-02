--!strict

local SchoolDayStateMachine = require(script.Parent.Parent.src.shared.SchoolDayStateMachine)
local SchoolDayCoordinator = require(script.Parent.Parent.src.server.SchoolDayCoordinator)

return function()
	local function newCoordinator()
		local machine = SchoolDayStateMachine.new({
			{id = "ARRIVAL", durationSeconds = 10},
			{id = "CLASS", durationSeconds = 20},
			{id = "DISMISSAL", durationSeconds = 10},
		})
		return SchoolDayCoordinator.new(machine, 1000, 5)
	end

	describe("SchoolDayCoordinator", function()
		it("increments sequence only for observable transitions", function()
			local coordinator = newCoordinator()
			expect(coordinator:step(1001).envelope.sequence).to.equal(1)
			expect(coordinator:step(1010).envelope.sequence).to.equal(2)
			expect(coordinator:step(1011).envelope.sequence).to.equal(2)
		end)

		it("clamps backward server time", function()
			local coordinator = newCoordinator()
			local later = coordinator:step(1020).envelope
			local backward = coordinator:step(1010).envelope
			expect(backward.serverTime).to.equal(later.serverTime)
			expect(backward.sequence).to.equal(later.sequence)
		end)

		it("exposes a bounded intermission then starts the next day", function()
			local coordinator = newCoordinator()
			local intermission = coordinator:step(1041).envelope
			expect(intermission.inIntermission).to.equal(true)
			expect(intermission.snapshot.state).to.equal("COMPLETE")
			local nextDay = coordinator:step(1045).envelope
			expect(nextDay.dayNumber).to.equal(2)
			expect(nextDay.transitionReason).to.equal("DAY_STARTED")
			expect(nextDay.snapshot.periodId).to.equal("ARRIVAL")
		end)

		it("reports skipped periods and whole days after delayed ticks", function()
			local coordinator = newCoordinator()
			coordinator:step(1001)
			local periodJump = coordinator:step(1035).envelope
			expect(#periodJump.skippedPeriodIds).to.equal(1)
			expect(periodJump.skippedPeriodIds[1]).to.equal("CLASS")
			local dayJump = coordinator:step(1140).envelope
			expect(dayJump.transitionReason).to.equal("DAY_STARTED")
			expect(dayJump.skippedDayCount).to.equal(2)
		end)
	end)
end
