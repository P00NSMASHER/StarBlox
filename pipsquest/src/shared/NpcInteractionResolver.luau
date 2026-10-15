--!strict

local NpcRelationshipModel = require(script.Parent.NpcRelationshipModel)

export type Role = "STUDENT" | "TEACHER"
export type RelationshipTier = "NEW" | "KNOWN" | "FRIENDLY" | "TRUSTED"
export type InteractionRequest = {
	npcId: string,
	kind: string,
	distanceStuds: number,
	cooldownReady: boolean,
	companionPresent: boolean,
}
export type PolicyOutcome = {
	allowed: boolean,
	reason: string,
	dialogueHookId: string?,
	relationshipDelta: number,
}
export type DialogueResolution = {
	found: boolean,
	reason: string,
	role: Role?,
	text: string?,
	variant: string?,
}
export type Outcome = {
	allowed: boolean,
	reason: string,
	dialogueText: string?,
	dialogueVariant: string?,
	dialogueRole: Role?,
	relationshipScore: number,
	relationshipTier: RelationshipTier,
	relationshipChanged: boolean,
	reputationContribution: number,
}

local NpcInteractionResolver = {}
local Resolver = {}
Resolver.__index = Resolver

local function stableOutcome(
	allowed: boolean,
	reason: string,
	score: number,
	tier: RelationshipTier,
	changed: boolean,
	dialogue: DialogueResolution?
): Outcome
	return table.freeze({
		allowed=allowed,
		reason=reason,
		dialogueText=if dialogue then dialogue.text else nil,
		dialogueVariant=if dialogue then dialogue.variant else nil,
		dialogueRole=if dialogue then dialogue.role else nil,
		relationshipScore=score,
		relationshipTier=tier,
		relationshipChanged=changed,
		reputationContribution=score * 10,
	})
end

function NpcInteractionResolver.new(registry: any, policy: any, dialogueCatalog: any)
	assert(type(registry) == "table" and type(registry.getRole) == "function", "registry must expose getRole")
	assert(type(policy) == "table" and type(policy.evaluateInteraction) == "function", "policy must expose evaluateInteraction")
	assert(type(dialogueCatalog) == "table" and type(dialogueCatalog.resolve) == "function", "dialogue catalog must expose resolve")
	return setmetatable({
		_registry=registry,
		_policy=policy,
		_dialogueCatalog=dialogueCatalog,
	}, Resolver)
end

function Resolver.resolve(self, request: InteractionRequest, currentRelationshipScore: number): Outcome
	local currentTier: RelationshipTier = NpcRelationshipModel.getTier(currentRelationshipScore)
	local policyOutcome: PolicyOutcome = self._policy:evaluateInteraction(request)

	if not policyOutcome.allowed then
		return stableOutcome(false, policyOutcome.reason, currentRelationshipScore, currentTier, false, nil)
	end

	local expectedRole: Role? = self._registry:getRole(request.npcId)
	if not expectedRole then
		return stableOutcome(false, "ROLE_UNAVAILABLE", currentRelationshipScore, currentTier, false, nil)
	end
	if not policyOutcome.dialogueHookId then
		return stableOutcome(false, "DIALOGUE_HOOK_UNAVAILABLE", currentRelationshipScore, currentTier, false, nil)
	end

	local dialogue: DialogueResolution = self._dialogueCatalog:resolve(policyOutcome.dialogueHookId, {
		relationshipTier=currentTier,
		companionPresent=request.companionPresent,
	})
	if not dialogue.found or dialogue.text == nil or dialogue.role == nil then
		return stableOutcome(false, "DIALOGUE_UNAVAILABLE", currentRelationshipScore, currentTier, false, nil)
	end
	if dialogue.role ~= expectedRole then
		return stableOutcome(false, "DIALOGUE_ROLE_MISMATCH", currentRelationshipScore, currentTier, false, nil)
	end

	local transition = NpcRelationshipModel.apply(currentRelationshipScore, policyOutcome)
	return stableOutcome(true, "ALLOW", transition.score, transition.tier, transition.changed, dialogue)
end

return table.freeze(NpcInteractionResolver)
