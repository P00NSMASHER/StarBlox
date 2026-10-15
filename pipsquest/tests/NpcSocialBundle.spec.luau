--!strict

local NpcSocialBundle = require(script.Parent.Parent.src.shared.NpcSocialBundle)

local function validConfig()
	return {
		registry = {
			anchors = {"ROOM_101"},
			dialogueHooks = {"STUDENT_A_GREET", "TEACHER_A_HELP"},
			npcs = {
				STUDENT_A = {
					role = "STUDENT",
					schedule = {CLASS_1={intent="LEARN", anchorId="ROOM_101"}},
					interactions = {GREET={dialogueHookId="STUDENT_A_GREET", radiusStuds=12, relationshipDelta=1}},
				},
				TEACHER_A = {
					role = "TEACHER",
					schedule = {CLASS_1={intent="TEACH", anchorId="ROOM_101"}},
					interactions = {ASK_HELP={dialogueHookId="TEACHER_A_HELP", radiusStuds=10, relationshipDelta=0}},
				},
			},
		},
		dialogue = {
			STUDENT_A_GREET = {role="STUDENT", lines={DEFAULT="Hi there."}},
			TEACHER_A_HELP = {role="TEACHER", lines={DEFAULT="Start with what you know."}},
		},
	}
end

return function()
	describe("NpcSocialBundle", function()
		it("builds a cohesive validated stack that resolves an approved interaction", function()
			local bundle = NpcSocialBundle.new(validConfig())
			local outcome = bundle.resolver:resolve({
				npcId="STUDENT_A",
				kind="GREET",
				distanceStuds=5,
				cooldownReady=true,
				companionPresent=false,
			}, 0)
			expect(outcome.allowed).to.equal(true)
			expect(outcome.dialogueText).to.equal("Hi there.")
			expect(outcome.relationshipScore).to.equal(1)
		end)

		it("rejects a declared dialogue hook that is missing from the catalog", function()
			local config = validConfig() :: any
			config.dialogue.TEACHER_A_HELP = nil
			expect(function() NpcSocialBundle.new(config) end).to.throw()
		end)

		it("rejects catalog entries that were not explicitly declared", function()
			local config = validConfig() :: any
			config.dialogue.UNDECLARED = {role="STUDENT", lines={DEFAULT="No."}}
			expect(function() NpcSocialBundle.new(config) end).to.throw()
		end)

		it("rejects dialogue role mismatches before constructing the runtime-neutral stack", function()
			local config = validConfig() :: any
			config.dialogue.STUDENT_A_GREET.role = "TEACHER"
			expect(function() NpcSocialBundle.new(config) end).to.throw()
		end)

		it("rejects unsupported top-level fields instead of retaining player data", function()
			local config = validConfig() :: any
			config.playerUserId = 12345
			expect(function() NpcSocialBundle.new(config) end).to.throw()
		end)
	end)
end
