--!strict

local NpcDialogueCatalog = require(script.Parent.Parent.src.shared.NpcDialogueCatalog)

local function validConfig()
	return {
		STUDENT_A_GREET = {
			role = "STUDENT",
			lines = {
				DEFAULT = "Hey! Hope your day is going well.",
				FRIENDLY = "Hey again! Good to see you.",
			},
			companionLines = {
				DEFAULT = "Your companion looks ready for school too.",
				TRUSTED = "You two make a pretty great team.",
			},
		},
		TEACHER_A_HELP = {
			role = "TEACHER",
			lines = {
				DEFAULT = "Start with what you already know, then take one step at a time.",
			},
		},
	}
end

return function()
	describe("NpcDialogueCatalog", function()
		it("resolves relationship variants deterministically with default fallback", function()
			local catalog = NpcDialogueCatalog.new(validConfig())
			local friendly = catalog:resolve("STUDENT_A_GREET", {relationshipTier="FRIENDLY", companionPresent=false})
			expect(friendly.text).to.equal("Hey again! Good to see you.")
			expect(friendly.variant).to.equal("FRIENDLY")
			local known = catalog:resolve("STUDENT_A_GREET", {relationshipTier="KNOWN", companionPresent=false})
			expect(known.text).to.equal("Hey! Hope your day is going well.")
			expect(known.variant).to.equal("DEFAULT")
		end)

		it("prefers companion variants without accepting user-entered text", function()
			local catalog = NpcDialogueCatalog.new(validConfig())
			local trusted = catalog:resolve("STUDENT_A_GREET", {relationshipTier="TRUSTED", companionPresent=true})
			expect(trusted.text).to.equal("You two make a pretty great team.")
			expect(trusted.variant).to.equal("COMPANION_TRUSTED")
			local known = catalog:resolve("STUDENT_A_GREET", {relationshipTier="KNOWN", companionPresent=true})
			expect(known.text).to.equal("Your companion looks ready for school too.")
			expect(known.variant).to.equal("COMPANION_DEFAULT")
		end)

		it("fails closed for unknown hooks and invalid context", function()
			local catalog = NpcDialogueCatalog.new(validConfig())
			local missing = catalog:resolve("MISSING", {relationshipTier="NEW", companionPresent=false})
			expect(missing.found).to.equal(false)
			expect(missing.reason).to.equal("UNKNOWN_HOOK")
			local invalid = catalog:resolve("STUDENT_A_GREET", {relationshipTier="BESTIE", companionPresent=false} :: any)
			expect(invalid.found).to.equal(false)
			expect(invalid.reason).to.equal("INVALID_CONTEXT")
		end)

		it("deep-copies authored dialogue so callers cannot mutate active lines", function()
			local config = validConfig()
			local catalog = NpcDialogueCatalog.new(config)
			config.STUDENT_A_GREET.lines.DEFAULT = "Changed after construction"
			local result = catalog:resolve("STUDENT_A_GREET", {relationshipTier="NEW", companionPresent=false})
			expect(result.text).to.equal("Hey! Hope your day is going well.")
		end)

		it("rejects unsupported fields, multiline text, and interpolation tokens", function()
			local unsupported = validConfig() :: any
			unsupported.STUDENT_A_GREET.debugMetadata = "unexpected"
			expect(function() NpcDialogueCatalog.new(unsupported) end).to.throw()

			local multiline = validConfig()
			multiline.STUDENT_A_GREET.lines.DEFAULT = "Hello\nthere"
			expect(function() NpcDialogueCatalog.new(multiline) end).to.throw()

			local interpolated = validConfig()
			interpolated.STUDENT_A_GREET.lines.DEFAULT = "Hello %s"
			expect(function() NpcDialogueCatalog.new(interpolated) end).to.throw()
		end)
	end)
end
