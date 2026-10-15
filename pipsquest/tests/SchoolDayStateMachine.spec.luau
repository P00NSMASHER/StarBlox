--!strict

local SchoolDayStateMachine = require(script.Parent.Parent.src.shared.SchoolDayStateMachine)

return function()
	local schedule = {
		{id = "ARRIVAL", durationSeconds = 30},
		{id = "HOMEROOM", durationSeconds = 60},
		{id = "CLASS_1", durationSeconds = 120},
		{id = "PASSING_1", durationSeconds = 20},
		{id = "CLASS_2", durationSeconds = 120},
		{id = "LUNCH", durationSeconds = 90},
		{id = "DISMISSAL", durationSeconds = 30},
	}

	describe("SchoolDayStateMachine", function()
		it("uses exact half-open period boundaries", function()
			local machine = SchoolDayStateMachine.new(schedule)
			expect(machine:snapshotAt(0).periodId).to.equal("ARRIVAL")
			expect(machine:snapshotAt(29.999).periodId).to.equal("ARRIVAL")
			expect(machine:snapshotAt(30).periodId).to.equal("HOMEROOM")
			expect(machine:snapshotAt(90).periodId).to.equal("CLASS_1")
		end)

		it("clamps backward clock observations", function()
			local machine = SchoolDayStateMachine.new(schedule)
			local previous = machine:snapshotAt(100)
			local result = machine:advance(previous, 80)
			expect(result.snapshot.elapsedSeconds).to.equal(100)
			expect(result.transitioned).to.equal(false)
		end)

		it("reports every period skipped during lag catch-up", function()
			local machine = SchoolDayStateMachine.new(schedule)
			local previous = machine:snapshotAt(10)
			local result = machine:advance(previous, 215)
			expect(result.snapshot.periodId).to.equal("PASSING_1")
			expect(result.transitioned).to.equal(true)
			expect(#result.skippedPeriodIds).to.equal(2)
			expect(result.skippedPeriodIds[1]).to.equal("HOMEROOM")
			expect(result.skippedPeriodIds[2]).to.equal("CLASS_1")
		end)

		it("completes deterministically at and beyond the final boundary", function()
			local machine = SchoolDayStateMachine.new(schedule)
			local duration = machine:getDayDurationSeconds()
			expect(machine:snapshotAt(duration).state).to.equal("COMPLETE")
			expect(machine:snapshotAt(duration + 500).elapsedSeconds).to.equal(duration)
			expect(machine:snapshotAt(duration + 500).dayProgress).to.equal(1)
		end)

		it("rejects invalid schedules", function()
			expect(function()
				SchoolDayStateMachine.new({})
			end).to.throw()
			expect(function()
				SchoolDayStateMachine.new({
					{id = "CLASS", durationSeconds = 60},
					{id = "CLASS", durationSeconds = 60},
				})
			end).to.throw()
		end)
	end)
end
