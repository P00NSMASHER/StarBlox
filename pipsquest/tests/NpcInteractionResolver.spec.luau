--!strict

local NpcDialogueCatalog = require(script.Parent.Parent.src.shared.NpcDialogueCatalog)
local NpcInteractionResolver = require(script.Parent.Parent.src.shared.NpcInteractionResolver)
local NpcSocialPolicy = require(script.Parent.Parent.src.shared.NpcSocialPolicy)
local NpcSocialRegistry = require(script.Parent.Parent.src.shared.NpcSocialRegistry)

local function registryConfig()
	return {
		anchors = {"ROOM_101"},
		dialogueHooks = {"STUDENT_A_GREET", "STUDENT_A_COMPANION", "TEACHER_A_HELP"},
		npcs = {
			STUDENT_A = {
				role = "STUDENT",
				schedule = {CLASS_1 = {intent="LEARN", anchorId="ROOM_101"}},
				interactions = {
					GREET = {dialogueHookId="STUDENT_A_GREET", radiusStuds=12, relationshipDelta=1},
					COMPANION_INTRO = {dialogueHookId="STUDENT_A_COMPANION", radiusStuds=10, relationshipDelta=1, requiresCompanion=true},
				},
			},
			TEACHER_A = {
				role = "TEACHER",
				schedule = {CLASS_1 = {intent="TEACH", anchorId="ROOM_101"}},
				interactions = {
					ASK_HELP = {dialogueHookId="TEACHER_A_HELP", radiusStuds=10, relationshipDelta=0},
				},
			},
		},
	}
end

local function dialogueConfig()
	return {
		STUDENT_A_GREET = {
			role = "STUDENT",
			lines = {DEFAULT="Hi there.", KNOWN="Good to see you again."},
		},
		STUDENT_A_COMPANION = {
			role = "STUDENT",
			lines = {DEFAULT="Your companion looks ready for school."},
			companionLines = {TRUSTED="You two make a great team."},
		},
		TEACHER_A_HELP = {
			role = "TEACHER",
			lines = {DEFAULT="Start with what you already know."},
		},
	}
end

local function buildResolver(dialogues: any?)
	local registry = NpcSocialRegistry.new(registryConfig())
	local policy = NpcSocialPolicy.new(registry:getPolicyRegistry())
	local catalog = NpcDialogueCatalog.new(dialogues or dialogueConfig())
	return NpcInteractionResolver.new(registry, policy, catalog)
end

return function()
	describe("NpcInteractionResolver", function()
		it("preserves relationship state when policy denies an interaction", function()
			local result = buildResolver():resolve({npcId="STUDENT_A", kind="GREET", distanceStuds=13, cooldownReady=true, companionPresent=false}, 2)
			expect(result.allowed).to.equal(false)
			expect(result.reason).to.equal("OUT_OF_RANGE")
			expect(result.dialogueText).to.equal(nil)
			expect(result.relationshipScore).to.equal(2)
			expect(result.relationshipTier).to.equal("KNOWN")
			expect(result.reputationContribution).to.equal(20)
		end)

		it("resolves dialogue from the pre-interaction tier before applying relationship gain", function()
			local result = buildResolver():resolve({npcId="STUDENT_A", kind="GREET", distanceStuds=5, cooldownReady=true, companionPresent=false}, 2)
			expect(result.allowed).to.equal(true)
			expect(result.dialogueText).to.equal("Good to see you again.")
			expect(result.dialogueVariant).to.equal("KNOWN")
			expect(result.relationshipScore).to.equal(3)
			expect(result.relationshipTier).to.equal("FRIENDLY")
			expect(result.reputationContribution).to.equal(30)
		end)

		it("passes only companion presence into deterministic companion dialogue selection", function()
			local result = buildResolver():resolve({npcId="STUDENT_A", kind="COMPANION_INTRO", distanceStuds=5, cooldownReady=true, companionPresent=true}, 7)
			expect(result.allowed).to.equal(true)
			expect(result.dialogueText).to.equal("You two make a great team.")
			expect(result.dialogueVariant).to.equal("COMPANION_TRUSTED")
			expect(result.relationshipScore).to.equal(8)
		end)

		it("fails closed without relationship gain when approved dialogue is unavailable", function()
			local config = dialogueConfig() :: any
			config.STUDENT_A_GREET = nil
			local result = buildResolver(config):resolve({npcId="STUDENT_A", kind="GREET", distanceStuds=5, cooldownReady=true, companionPresent=false}, 2)
			expect(result.allowed).to.equal(false)
			expect(result.reason).to.equal("DIALOGUE_UNAVAILABLE")
			expect(result.relationshipScore).to.equal(2)
			expect(result.relationshipChanged).to.equal(false)
		end)

		it("fails closed on dialogue role mismatch instead of showing the wrong persona", function()
			local config = dialogueConfig() :: any
			config.STUDENT_A_GREET.role = "TEACHER"
			local result = buildResolver(config):resolve({npcId="STUDENT_A", kind="GREET", distanceStuds=5, cooldownReady=true, companionPresent=false}, 2)
			expect(result.allowed).to.equal(false)
			expect(result.reason).to.equal("DIALOGUE_ROLE_MISMATCH")
			expect(result.dialogueText).to.equal(nil)
			expect(result.relationshipScore).to.equal(2)
		end)

		it("keeps maxed relationships bounded while returning normalized reputation contribution", function()
			local result = buildResolver():resolve({npcId="STUDENT_A", kind="GREET", distanceStuds=5, cooldownReady=true, companionPresent=false}, 10)
			expect(result.allowed).to.equal(true)
			expect(result.relationshipScore).to.equal(10)
			expect(result.relationshipChanged).to.equal(false)
			expect(result.reputationContribution).to.equal(100)
		end)
	end)
end
