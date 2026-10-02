--!strict

local NpcSocialPolicy = require(script.Parent.Parent.src.shared.NpcSocialPolicy)

return function()
	local policy = NpcSocialPolicy.new({
		STUDENT_A = {
			schedule = {
				CLASS_1 = {intent="LEARN", anchorId="ROOM_101"},
				LUNCH = {intent="SOCIALIZE", anchorId="CAFETERIA"},
			},
			interactions = {
				GREET = {dialogueHookId="STUDENT_A_GREET", radiusStuds=12, relationshipDelta=1},
				COMPANION_INTRO = {dialogueHookId="STUDENT_A_COMPANION", radiusStuds=10, relationshipDelta=1, requiresCompanion=true},
			},
		},
	})

	describe("NpcSocialPolicy", function()
		it("resolves symbolic schedule intent and anchor", function()
			local result = policy:resolveSchedule("STUDENT_A", "CLASS_1")
			expect(result.intent).to.equal("LEARN")
			expect(result.anchorId).to.equal("ROOM_101")
		end)

		it("falls back to IDLE for unknown periods", function()
			local result = policy:resolveSchedule("STUDENT_A", "ASSEMBLY")
			expect(result.intent).to.equal("IDLE")
			expect(result.anchorId).to.equal(nil)
		end)

		it("denies unknown NPCs and interactions with zero delta", function()
			local missing = policy:evaluateInteraction({npcId="MISSING", kind="GREET", distanceStuds=1, cooldownReady=true, companionPresent=false})
			expect(missing.allowed).to.equal(false)
			expect(missing.relationshipDelta).to.equal(0)
			local unknown = policy:evaluateInteraction({npcId="STUDENT_A", kind="DANCE", distanceStuds=1, cooldownReady=true, companionPresent=false})
			expect(unknown.reason).to.equal("UNKNOWN_INTERACTION")
			expect(unknown.relationshipDelta).to.equal(0)
		end)

		it("enforces proximity and cooldown deterministically", function()
			local far = policy:evaluateInteraction({npcId="STUDENT_A", kind="GREET", distanceStuds=12.01, cooldownReady=true, companionPresent=false})
			expect(far.reason).to.equal("OUT_OF_RANGE")
			local cooling = policy:evaluateInteraction({npcId="STUDENT_A", kind="GREET", distanceStuds=12, cooldownReady=false, companionPresent=false})
			expect(cooling.reason).to.equal("COOLDOWN")
		end)

		it("gates companion hooks without free-form dialogue", function()
			local blocked = policy:evaluateInteraction({npcId="STUDENT_A", kind="COMPANION_INTRO", distanceStuds=5, cooldownReady=true, companionPresent=false})
			expect(blocked.reason).to.equal("COMPANION_REQUIRED")
			local allowed = policy:evaluateInteraction({npcId="STUDENT_A", kind="COMPANION_INTRO", distanceStuds=5, cooldownReady=true, companionPresent=true})
			expect(allowed.allowed).to.equal(true)
			expect(allowed.dialogueHookId).to.equal("STUDENT_A_COMPANION")
			expect(allowed.relationshipDelta).to.equal(1)
		end)
	end)
end
