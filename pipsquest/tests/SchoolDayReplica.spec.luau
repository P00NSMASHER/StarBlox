--!strict

local SchoolDayReplica = require(script.Parent.Parent.src.client.SchoolDayReplica)

local function envelope(sequence: number)
	return table.freeze({
		protocolVersion = 1,
		sequence = sequence,
	})
end

local function currentSequence(replica: any): number
	local current = replica:getCurrent()
	assert(current ~= nil)
	return current.sequence
end

return function()
	describe("SchoolDayReplica", function()
		it("bootstraps and refreshes from authoritative snapshots", function()
			local replica = SchoolDayReplica.new()
			expect(replica:applySnapshot(envelope(3)).status).to.equal("APPLIED")
			expect(replica:applySnapshot(envelope(3)).status).to.equal("APPLIED")
			expect(currentSequence(replica)).to.equal(3)
			expect(replica:needsRecovery()).to.equal(false)
		end)

		it("applies only contiguous live transitions", function()
			local replica = SchoolDayReplica.new()
			replica:applySnapshot(envelope(1))
			expect(replica:applyLive(envelope(2)).status).to.equal("APPLIED")
			expect(currentSequence(replica)).to.equal(2)
		end)

		it("ignores stale and duplicate live transitions", function()
			local replica = SchoolDayReplica.new()
			replica:applySnapshot(envelope(2))
			expect(replica:applyLive(envelope(2)).status).to.equal("IGNORED_STALE")
			expect(replica:applyLive(envelope(1)).status).to.equal("IGNORED_STALE")
			expect(currentSequence(replica)).to.equal(2)
		end)

		it("holds state and requests recovery when live delivery has a gap", function()
			local replica = SchoolDayReplica.new()
			replica:applySnapshot(envelope(1))
			local gap = replica:applyLive(envelope(3))
			expect(gap.status).to.equal("GAP")
			expect(gap.expectedSequence).to.equal(2)
			expect(currentSequence(replica)).to.equal(1)
			expect(replica:needsRecovery()).to.equal(true)
		end)

		it("applies a contiguous replay transaction", function()
			local replica = SchoolDayReplica.new()
			replica:applySnapshot(envelope(1))
			local applied = replica:applyReplay({
				gapDetected = false,
				events = {envelope(1), envelope(2), envelope(3)},
			})
			expect(applied.status).to.equal("APPLIED")
			expect(currentSequence(replica)).to.equal(3)
			expect(replica:needsRecovery()).to.equal(false)
		end)

		it("rejects non-contiguous replay without partial mutation", function()
			local replica = SchoolDayReplica.new()
			replica:applySnapshot(envelope(1))
			local rejected = replica:applyReplay({
				gapDetected = false,
				events = {envelope(2), envelope(4)},
			})
			expect(rejected.status).to.equal("SNAPSHOT_REQUIRED")
			expect(currentSequence(replica)).to.equal(1)
			expect(replica:needsRecovery()).to.equal(true)
		end)
	end)
end
