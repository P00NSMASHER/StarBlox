--!strict

local SchoolDayReplica = require(script.Parent.Parent.src.client.SchoolDayReplica)
local SchoolDaySyncController = require(script.Parent.Parent.src.client.SchoolDaySyncController)

local function envelope(sequence: number)
	return table.freeze({protocolVersion = 1, sequence = sequence})
end

local function currentSequence(replica: any): number
	local current = replica:getCurrent()
	assert(current ~= nil)
	return current.sequence
end

return function()
	describe("SchoolDaySyncController", function()
		it("bootstraps from an authoritative snapshot", function()
			local replica = SchoolDayReplica.new()
			local controller = SchoolDaySyncController.new(replica, {
				getSnapshot = function() return envelope(2) end,
				getUpdates = function() error("unexpected replay") end,
			})
			expect(controller:bootstrap().status).to.equal("BOOTSTRAPPED")
			expect(currentSequence(replica)).to.equal(2)
		end)

		it("recovers a live gap through bounded replay", function()
			local replica = SchoolDayReplica.new()
			local replayCalls = 0
			local controller = SchoolDaySyncController.new(replica, {
				getSnapshot = function() return envelope(1) end,
				getUpdates = function(afterSequence)
					replayCalls += 1
					expect(afterSequence).to.equal(1)
					return {ok = true, replay = {gapDetected = false, events = {envelope(2), envelope(3)}}}
				end,
			})
			controller:bootstrap()
			expect(controller:handleLive(envelope(3)).status).to.equal("RECOVERED")
			expect(replayCalls).to.equal(1)
			expect(currentSequence(replica)).to.equal(3)
		end)

		it("falls back to a snapshot when replay reports eviction", function()
			local replica = SchoolDayReplica.new()
			local snapshotCalls = 0
			local controller = SchoolDaySyncController.new(replica, {
				getSnapshot = function()
					snapshotCalls += 1
					return envelope(if snapshotCalls == 1 then 1 else 5)
				end,
				getUpdates = function()
					return {ok = true, replay = {gapDetected = true, events = {}}}
				end,
			})
			controller:bootstrap()
			expect(controller:handleLive(envelope(5)).status).to.equal("RECOVERED")
			expect(snapshotCalls).to.equal(2)
			expect(currentSequence(replica)).to.equal(5)
		end)

		it("falls back to a snapshot after replay transport failure", function()
			local replica = SchoolDayReplica.new()
			local snapshotCalls = 0
			local controller = SchoolDaySyncController.new(replica, {
				getSnapshot = function()
					snapshotCalls += 1
					return envelope(if snapshotCalls == 1 then 1 else 4)
				end,
				getUpdates = function() error("offline") end,
			})
			controller:bootstrap()
			expect(controller:handleLive(envelope(4)).status).to.equal("RECOVERED")
			expect(currentSequence(replica)).to.equal(4)
		end)

		it("queues a gap without starting a second recovery", function()
			local replica = SchoolDayReplica.new()
			replica:applySnapshot(envelope(1))
			local replayCalls = 0
			local controller = SchoolDaySyncController.new(replica, {
				getSnapshot = function() return envelope(3) end,
				getUpdates = function()
					replayCalls += 1
					return {ok = true, replay = {gapDetected = false, events = {}}}
				end,
			})
			controller._recovering = true
			expect(controller:handleLive(envelope(3)).status).to.equal("RECOVERY_ALREADY_RUNNING")
			expect(replayCalls).to.equal(0)
			expect(controller._pending[3]).never.to.equal(nil)
		end)

		it("fails closed when both recovery transports are unavailable", function()
			local replica = SchoolDayReplica.new()
			local controller = SchoolDaySyncController.new(replica, {
				getSnapshot = function() error("snapshot offline") end,
				getUpdates = function() error("replay offline") end,
			})
			expect(controller:bootstrap().status).to.equal("RECOVERY_FAILED")
			expect(replica:getCurrent()).to.equal(nil)
		end)
	end)
end
