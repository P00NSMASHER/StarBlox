--!strict

export type Intent = "IDLE" | "TRANSIT" | "LEARN" | "TEACH" | "SOCIALIZE"
export type ScheduleRule = { intent: Intent, anchorId: string? }
export type InteractionRule = {
	dialogueHookId: string,
	radiusStuds: number,
	relationshipDelta: number,
	requiresCompanion: boolean?,
}
export type Npc = {
	schedule: {[string]: ScheduleRule},
	interactions: {[string]: InteractionRule},
}
export type Registry = {[string]: Npc}
export type Request = {
	npcId: string,
	kind: string,
	distanceStuds: number,
	cooldownReady: boolean,
	companionPresent: boolean,
}

local MAX_RADIUS = 20
local VALID_INTENTS: {[string]: boolean} = {
	IDLE=true, TRANSIT=true, LEARN=true, TEACH=true, SOCIALIZE=true,
}
local VALID_KINDS: {[string]: boolean} = {
	GREET=true, CHAT=true, ASK_HELP=true, COMPANION_INTRO=true,
}

local NpcSocialPolicy = {}
local Policy = {}
Policy.__index = Policy

local function deny(reason: string)
	return table.freeze({allowed=false, reason=reason, dialogueHookId=nil, relationshipDelta=0})
end

function NpcSocialPolicy.new(registry: Registry)
	local copy: Registry = {}
	for npcId, npc in pairs(registry) do
		assert(npcId:match("%S") ~= nil, "npc id must be non-empty")
		local schedule: {[string]: ScheduleRule} = {}
		for periodId, rule in pairs(npc.schedule) do
			assert(periodId:match("%S") ~= nil, "period id must be non-empty")
			assert(VALID_INTENTS[rule.intent] == true, "invalid intent")
			schedule[periodId] = table.freeze({intent=rule.intent, anchorId=rule.anchorId})
		end
		local interactions: {[string]: InteractionRule} = {}
		for kind, rule in pairs(npc.interactions) do
			assert(VALID_KINDS[kind] == true, "invalid interaction kind")
			assert(rule.radiusStuds > 0 and rule.radiusStuds <= MAX_RADIUS, "radius must be within 20 studs")
			assert(rule.relationshipDelta == 0 or rule.relationshipDelta == 1, "relationship delta must be 0 or 1")
			interactions[kind] = table.freeze({
				dialogueHookId=rule.dialogueHookId,
				radiusStuds=rule.radiusStuds,
				relationshipDelta=rule.relationshipDelta,
				requiresCompanion=rule.requiresCompanion == true,
			})
		end
		copy[npcId] = table.freeze({schedule=table.freeze(schedule), interactions=table.freeze(interactions)})
	end
	return setmetatable({_registry=table.freeze(copy)}, Policy)
end

function Policy.resolveSchedule(self, npcId: string, periodId: string)
	local npc = self._registry[npcId]
	local rule = if npc then npc.schedule[periodId] else nil
	if not rule then return table.freeze({intent="IDLE", anchorId=nil}) end
	return table.freeze({intent=rule.intent, anchorId=rule.anchorId})
end

function Policy.evaluateInteraction(self, request: Request)
	local npc = self._registry[request.npcId]
	if not npc then return deny("UNKNOWN_NPC") end
	if not VALID_KINDS[request.kind] then return deny("UNKNOWN_INTERACTION") end
	local rule = npc.interactions[request.kind]
	if not rule then return deny("UNSUPPORTED_INTERACTION") end
	if request.distanceStuds ~= request.distanceStuds or request.distanceStuds < 0 then return deny("INVALID_DISTANCE") end
	if request.distanceStuds > rule.radiusStuds then return deny("OUT_OF_RANGE") end
	if not request.cooldownReady then return deny("COOLDOWN") end
	if rule.requiresCompanion and not request.companionPresent then return deny("COMPANION_REQUIRED") end
	return table.freeze({allowed=true, reason="ALLOW", dialogueHookId=rule.dialogueHookId, relationshipDelta=rule.relationshipDelta})
end

return table.freeze(NpcSocialPolicy)
