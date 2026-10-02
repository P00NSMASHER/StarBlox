--!strict

local QuestProgressStateMachine = require(script.Parent.Parent.src.shared.QuestProgressStateMachine)

return function()
	describe("QuestProgressStateMachine", function()
		it("deduplicates repeated event receipts", function()
			local machine = QuestProgressStateMachine.new({
				id = "school-day-starter",
				revision = 1,
				objectives = {{id = "attend-class", required = 2}},
			})
			local state = machine:fresh()
			state = machine:apply(state, {eventId = "evt-1", objectiveId = "attend-class", delta = 1}).state
			local duplicate = machine:apply(state, {eventId = "evt-1", objectiveId = "attend-class", delta = 1})
			expect(duplicate.accepted).to.equal(true)
			expect(duplicate.changed).to.equal(false)
			expect(duplicate.state.objectiveProgress["attend-class"]).to.equal(1)
		end)

		it("clamps objective progress to the target and derives completion", function()
			local machine = QuestProgressStateMachine.new({
				id = "school-day-starter",
				revision = 1,
				objectives = {{id = "attend-class", required = 2}},
			})
			local result = machine:apply(machine:fresh(), {eventId = "evt-1", objectiveId = "attend-class", delta = 9})
			expect(result.state.objectiveProgress["attend-class"]).to.equal(2)
			expect(result.state.status).to.equal("COMPLETED")
		end)

		it("requires every objective before completion", function()
			local machine = QuestProgressStateMachine.new({
				id = "school-day-starter",
				revision = 1,
				objectives = {
					{id = "attend-class", required = 1},
					{id = "complete-activity", required = 1},
				},
			})
			local result = machine:apply(machine:fresh(), {eventId = "evt-1", objectiveId = "attend-class", delta = 1})
			expect(result.state.status).to.equal("ACTIVE")
			expect(result.state.objectiveProgress["complete-activity"]).to.equal(0)
		end)

		it("rejects quest revision mismatches instead of silently merging", function()
			local machine = QuestProgressStateMachine.new({
				id = "school-day-starter",
				revision = 2,
				objectives = {{id = "attend-class", required = 1}},
			})
			local restored = machine:restore({
				schemaVersion = 1,
				questId = "school-day-starter",
				questRevision = 1,
				status = "COMPLETED",
				objectiveProgress = { ["attend-class"] = 1 },
				receipts = { ["evt-old"] = true },
			})
			expect(restored.accepted).to.equal(false)
			expect(restored.errorCode).to.equal("REVISION_MISMATCH")
		end)

		it("recomputes restored status from objective progress", function()
			local machine = QuestProgressStateMachine.new({
				id = "school-day-starter",
				revision = 1,
				objectives = {{id = "attend-class", required = 2}},
			})
			local restored = machine:restore({
				schemaVersion = 1,
				questId = "school-day-starter",
				questRevision = 1,
				status = "COMPLETED",
				objectiveProgress = { ["attend-class"] = 1 },
				receipts = {},
			})
			expect(restored.accepted).to.equal(true)
			expect(restored.state.status).to.equal("ACTIVE")
		end)
	end)
end
