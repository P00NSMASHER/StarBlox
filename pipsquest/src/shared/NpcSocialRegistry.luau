--!strict

export type Role = "STUDENT" | "TEACHER"
export type Intent = "IDLE" | "TRANSIT" | "LEARN" | "TEACH" | "SOCIALIZE"
export type ScheduleRule = { intent: Intent, anchorId: string? }
export type InteractionRule = {
	dialogueHookId: string,
	radiusStuds: number,
	relationshipDelta: number,
	requiresCompanion: boolean?,
}
export type NpcDefinition = {
	role: Role,
	schedule: {[string]: ScheduleRule},
	interactions: {[string]: InteractionRule},
}
export type Config = {
	anchors: {string},
	dialogueHooks: {string},
	npcs: {[string]: NpcDefinition},
}
export type PolicyRegistry = {[string]: {
	schedule: {[string]: ScheduleRule},
	interactions: {[string]: InteractionRule},
}}

local MAX_RADIUS = 20
local VALID_ROLES: {[string]: boolean} = {STUDENT=true, TEACHER=true}
local VALID_INTENTS: {[string]: boolean} = {IDLE=true, TRANSIT=true, LEARN=true, TEACH=true, SOCIALIZE=true}
local VALID_KINDS: {[string]: boolean} = {GREET=true, CHAT=true, ASK_HELP=true, COMPANION_INTRO=true}
local ALLOWED_NPC_KEYS: {[string]: boolean} = {role=true, schedule=true, interactions=true}
local ALLOWED_SCHEDULE_KEYS: {[string]: boolean} = {intent=true, anchorId=true}
local ALLOWED_INTERACTION_KEYS: {[string]: boolean} = {
	dialogueHookId=true, radiusStuds=true, relationshipDelta=true, requiresCompanion=true,
}

local NpcSocialRegistry = {}
local Registry = {}
Registry.__index = Registry

local function assertFinite(value: number, label: string)
	assert(value == value and value ~= math.huge and value ~= -math.huge, label .. " must be finite")
end

local function assertOnlyKeys(value: {[any]: any}, allowed: {[string]: boolean}, label: string)
	for key in pairs(value) do
		assert(type(key) == "string" and allowed[key] == true, label .. " contains unsupported field")
	end
end

local function copyStringSet(values: {string}, label: string): {[string]: boolean}
	local result: {[string]: boolean} = {}
	for _, value in ipairs(values) do
		assert(type(value) == "string" and value:match("%S") ~= nil, label .. " id must be non-empty")
		assert(result[value] ~= true, "duplicate " .. label .. " id: " .. value)
		result[value] = true
	end
	return table.freeze(result)
end

function NpcSocialRegistry.new(config: Config)
	local anchors = copyStringSet(config.anchors, "anchor")
	local dialogueHooks = copyStringSet(config.dialogueHooks, "dialogue hook")
	local roles: {[string]: Role} = {}
	local policyRegistry: PolicyRegistry = {}

	for npcId, npc in pairs(config.npcs) do
		assert(type(npcId) == "string" and npcId:match("%S") ~= nil, "npc id must be non-empty")
		assertOnlyKeys(npc :: any, ALLOWED_NPC_KEYS, "npc " .. npcId)
		assert(VALID_ROLES[npc.role] == true, "invalid npc role")
		roles[npcId] = npc.role

		local schedule: {[string]: ScheduleRule} = {}
		for periodId, rule in pairs(npc.schedule) do
			assert(type(periodId) == "string" and periodId:match("%S") ~= nil, "period id must be non-empty")
			assertOnlyKeys(rule :: any, ALLOWED_SCHEDULE_KEYS, "schedule rule")
			assert(VALID_INTENTS[rule.intent] == true, "invalid intent")
			if rule.intent ~= "IDLE" then
				assert(rule.anchorId ~= nil, "active intent requires anchor")
			end
			if rule.anchorId ~= nil then
				assert(anchors[rule.anchorId] == true, "unknown anchor id")
			end
			schedule[periodId] = table.freeze({intent=rule.intent, anchorId=rule.anchorId})
		end

		local interactions: {[string]: InteractionRule} = {}
		for kind, rule in pairs(npc.interactions) do
			assertOnlyKeys(rule :: any, ALLOWED_INTERACTION_KEYS, "interaction rule")
			assert(VALID_KINDS[kind] == true, "invalid interaction kind")
			assert(dialogueHooks[rule.dialogueHookId] == true, "unknown dialogue hook id")
			assertFinite(rule.radiusStuds, "radiusStuds")
			assert(rule.radiusStuds > 0 and rule.radiusStuds <= MAX_RADIUS, "radius must be within 20 studs")
			assert(rule.relationshipDelta == 0 or rule.relationshipDelta == 1, "relationship delta must be 0 or 1")
			interactions[kind] = table.freeze({
				dialogueHookId=rule.dialogueHookId,
				radiusStuds=rule.radiusStuds,
				relationshipDelta=rule.relationshipDelta,
				requiresCompanion=rule.requiresCompanion == true,
			})
		end

		policyRegistry[npcId] = table.freeze({
			schedule=table.freeze(schedule),
			interactions=table.freeze(interactions),
		})
	end

	return setmetatable({
		_anchors=anchors,
		_dialogueHooks=dialogueHooks,
		_roles=table.freeze(roles),
		_policyRegistry=table.freeze(policyRegistry),
	}, Registry)
end

function Registry.getPolicyRegistry(self): PolicyRegistry
	return self._policyRegistry
end

function Registry.getRole(self, npcId: string): Role?
	return self._roles[npcId]
end

function Registry.hasAnchor(self, anchorId: string): boolean
	return self._anchors[anchorId] == true
end

function Registry.hasDialogueHook(self, dialogueHookId: string): boolean
	return self._dialogueHooks[dialogueHookId] == true
end

return table.freeze(NpcSocialRegistry)
