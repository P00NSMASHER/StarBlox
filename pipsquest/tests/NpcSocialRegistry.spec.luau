--!strict

local NpcSocialRegistry = require(script.Parent.Parent.src.shared.NpcSocialRegistry)

local function validConfig()
	return {
		anchors = {"ROOM_101", "CAFETERIA"},
		dialogueHooks = {"STUDENT_A_GREET", "TEACHER_A_HELP"},
		npcs = {
			STUDENT_A = {
				role = "STUDENT",
				schedule = {
					CLASS_1 = {intent="LEARN", anchorId="ROOM_101"},
					FREE = {intent="IDLE"},
				},
				interactions = {
					GREET = {dialogueHookId="STUDENT_A_GREET", radiusStuds=12, relationshipDelta=1},
				},
			},
			TEACHER_A = {
				role = "TEACHER",
				schedule = {
					CLASS_1 = {intent="TEACH", anchorId="ROOM_101"},
				},
				interactions = {
					ASK_HELP = {dialogueHookId="TEACHER_A_HELP", radiusStuds=10, relationshipDelta=0},
				},
			},
		},
	}
end

return function()
	describe("NpcSocialRegistry", function()
		it("builds a policy-compatible immutable roster", function()
			local config = validConfig()
			local registry = NpcSocialRegistry.new(config)
			config.npcs.STUDENT_A.schedule.CLASS_1.anchorId = "CAFETERIA"
			local policyRegistry = registry:getPolicyRegistry()
			expect(policyRegistry.STUDENT_A.schedule.CLASS_1.anchorId).to.equal("ROOM_101")
			expect(registry:getRole("STUDENT_A")).to.equal("STUDENT")
			expect(registry:hasAnchor("CAFETERIA")).to.equal(true)
		end)

		it("requires known anchors for active schedule intents", function()
			local missing = validConfig()
			missing.npcs.STUDENT_A.schedule.CLASS_1.anchorId = nil
			expect(function() NpcSocialRegistry.new(missing) end).to.throw()

			local unknown = validConfig()
			unknown.npcs.STUDENT_A.schedule.CLASS_1.anchorId = "GYM"
			expect(function() NpcSocialRegistry.new(unknown) end).to.throw()
		end)

		it("allows IDLE without a world anchor", function()
			local registry = NpcSocialRegistry.new(validConfig())
			local idle = registry:getPolicyRegistry().STUDENT_A.schedule.FREE
			expect(idle.intent).to.equal("IDLE")
			expect(idle.anchorId).to.equal(nil)
		end)

		it("requires predeclared dialogue hook ids", function()
			local config = validConfig()
			config.npcs.STUDENT_A.interactions.GREET.dialogueHookId = "FREE_FORM_TEXT"
			expect(function() NpcSocialRegistry.new(config) end).to.throw()
		end)

		it("rejects unsupported npc fields instead of retaining player data", function()
			local config = validConfig() :: any
			config.npcs.STUDENT_A.userId = 12345
			expect(function() NpcSocialRegistry.new(config) end).to.throw()
		end)
	end)
end
