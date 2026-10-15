--!strict

local NpcSocialRegistry = require(script.Parent.NpcSocialRegistry)
local NpcSocialPolicy = require(script.Parent.NpcSocialPolicy)
local NpcDialogueCatalog = require(script.Parent.NpcDialogueCatalog)
local NpcInteractionResolver = require(script.Parent.NpcInteractionResolver)

export type BundleConfig = {
	registry: any,
	dialogue: any,
}

local ALLOWED_BUNDLE_KEYS: {[string]: boolean} = {registry=true, dialogue=true}
local ALLOWED_REGISTRY_KEYS: {[string]: boolean} = {anchors=true, dialogueHooks=true, npcs=true}

local NpcSocialBundle = {}

local function assertOnlyKeys(value: {[any]: any}, allowed: {[string]: boolean}, label: string)
	for key in pairs(value) do
		assert(type(key) == "string" and allowed[key] == true, label .. " contains unsupported field")
	end
end

local function requireTable(value: any, label: string): {[any]: any}
	assert(type(value) == "table", label .. " must be a table")
	return value
end

local function buildDeclaredHooks(dialogueHooks: {any}): {[string]: boolean}
	local declared: {[string]: boolean} = {}
	for _, hookId in ipairs(dialogueHooks) do
		assert(type(hookId) == "string" and hookId:match("%S") ~= nil, "dialogue hook id must be non-empty")
		assert(declared[hookId] ~= true, "duplicate dialogue hook id: " .. hookId)
		declared[hookId] = true
	end
	return declared
end

local function validateCrossLinks(registryConfig: {[any]: any}, dialogueConfig: {[any]: any})
	assertOnlyKeys(registryConfig, ALLOWED_REGISTRY_KEYS, "registry config")
	local dialogueHooks = requireTable(registryConfig.dialogueHooks, "registry.dialogueHooks")
	local npcs = requireTable(registryConfig.npcs, "registry.npcs")
	local declared = buildDeclaredHooks(dialogueHooks :: {any})

	for hookId in pairs(declared) do
		assert(dialogueConfig[hookId] ~= nil, "declared dialogue hook missing catalog entry: " .. hookId)
	end
	for hookId in pairs(dialogueConfig) do
		assert(type(hookId) == "string" and declared[hookId] == true, "dialogue catalog hook must be declared: " .. tostring(hookId))
	end

	for npcId, npcValue in pairs(npcs) do
		assert(type(npcId) == "string" and npcId:match("%S") ~= nil, "npc id must be non-empty")
		local npc = requireTable(npcValue, "npc definition")
		local role = npc.role
		local interactions = requireTable(npc.interactions, "npc interactions")
		for kind, ruleValue in pairs(interactions) do
			assert(type(kind) == "string", "interaction kind must be a string")
			local rule = requireTable(ruleValue, "interaction rule")
			local hookId = rule.dialogueHookId
			assert(type(hookId) == "string" and declared[hookId] == true, "interaction references undeclared dialogue hook")
			local dialogueEntry = requireTable(dialogueConfig[hookId], "dialogue entry")
			assert(dialogueEntry.role == role, "dialogue role mismatch for npc " .. npcId .. " interaction " .. kind)
		end
	end
end

function NpcSocialBundle.new(config: BundleConfig)
	local rawConfig = requireTable(config, "npc social bundle config")
	assertOnlyKeys(rawConfig, ALLOWED_BUNDLE_KEYS, "npc social bundle config")
	local registryConfig = requireTable(rawConfig.registry, "registry config")
	local dialogueConfig = requireTable(rawConfig.dialogue, "dialogue config")

	validateCrossLinks(registryConfig, dialogueConfig)

	local registry = NpcSocialRegistry.new(registryConfig :: any)
	local policy = NpcSocialPolicy.new(registry:getPolicyRegistry())
	local dialogueCatalog = NpcDialogueCatalog.new(dialogueConfig :: any)
	local resolver = NpcInteractionResolver.new(registry, policy, dialogueCatalog)

	return table.freeze({
		registry=registry,
		policy=policy,
		dialogueCatalog=dialogueCatalog,
		resolver=resolver,
	})
end

return table.freeze(NpcSocialBundle)
