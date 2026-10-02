--!strict

local QuestObjectiveEventAdapter = require(script.Parent.Parent.src.shared.QuestObjectiveEventAdapter)

return function()
	describe("QuestObjectiveEventAdapter", function()
		local attendanceBinding = {
			objectiveId = "attend-class",
			source = "school-attendance",
			signal = "ON_TIME",
			progressPerReceipt = 1,
		}

		local attendanceReceipt = {
			receiptId = "school-day-7|period-math",
			source = "school-attendance",
			signal = "ON_TIME",
		}

		it("converts a matching receipt using only explicit binding values", function()
			local result = QuestObjectiveEventAdapter.toProgressEvent(attendanceBinding, attendanceReceipt)

			expect(result.accepted).to.equal(true)
			expect(result.event.objectiveId).to.equal("attend-class")
			expect(result.event.delta).to.equal(1)
		end)

		it("builds the same idempotency key for the same binding and receipt", function()
			local first = QuestObjectiveEventAdapter.toProgressEvent(attendanceBinding, attendanceReceipt)
			local second = QuestObjectiveEventAdapter.toProgressEvent(attendanceBinding, attendanceReceipt)

			expect(first.event.eventId).to.equal(second.event.eventId)
		end)

		it("keeps two objective bindings distinct for the same source receipt", function()
			local first = QuestObjectiveEventAdapter.toProgressEvent(attendanceBinding, attendanceReceipt)
			local second = QuestObjectiveEventAdapter.toProgressEvent({
				objectiveId = "perfect-attendance",
				source = "school-attendance",
				signal = "ON_TIME",
				progressPerReceipt = 1,
			}, attendanceReceipt)

			expect(first.event.eventId == second.event.eventId).to.equal(false)
		end)

		it("rejects source and signal mismatches instead of routing implicitly", function()
			local sourceMismatch = QuestObjectiveEventAdapter.toProgressEvent(attendanceBinding, {
				receiptId = "school-day-7|period-math",
				source = "school-progress",
				signal = "ON_TIME",
			})
			local signalMismatch = QuestObjectiveEventAdapter.toProgressEvent(attendanceBinding, {
				receiptId = "school-day-7|period-math",
				source = "school-attendance",
				signal = "TARDY",
			})

			expect(sourceMismatch.accepted).to.equal(false)
			expect(sourceMismatch.errorCode).to.equal("SOURCE_MISMATCH")
			expect(signalMismatch.accepted).to.equal(false)
			expect(signalMismatch.errorCode).to.equal("SIGNAL_MISMATCH")
		end)

		it("fails closed for an invalid progression binding", function()
			local result = QuestObjectiveEventAdapter.toProgressEvent({
				objectiveId = "attend-class",
				source = "school-attendance",
				signal = "ON_TIME",
				progressPerReceipt = 0,
			}, attendanceReceipt)

			expect(result.accepted).to.equal(false)
			expect(result.errorCode).to.equal("INVALID_BINDING")
		end)
	end)
end
