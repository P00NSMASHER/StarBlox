--!strict

export type PolicyOutcome = {
	allowed: boolean,
	relationshipDelta: number,
}
export type RelationshipTier = "NEW" | "KNOWN" | "FRIENDLY" | "TRUSTED"
export type Transition = {
	score: number,
	tier: RelationshipTier,
	changed: boolean,
}

local MAX_SCORE = 10
local NpcRelationshipModel = {}

local function assertFiniteInteger(value: number, label: string)
	assert(value == value and value ~= math.huge and value ~= -math.huge, label .. " must be finite")
	assert(value % 1 == 0, label .. " must be an integer")
end

local function assertScore(score: number)
	assertFiniteInteger(score, "relationship score")
	assert(score >= 0 and score <= MAX_SCORE, "relationship score out of range")
end

function NpcRelationshipModel.getTier(score: number): RelationshipTier
	assertScore(score)
	if score >= 7 then
		return "TRUSTED"
	elseif score >= 3 then
		return "FRIENDLY"
	elseif score >= 1 then
		return "KNOWN"
	end
	return "NEW"
end

function NpcRelationshipModel.apply(currentScore: number, outcome: PolicyOutcome): Transition
	assertScore(currentScore)
	assertFiniteInteger(outcome.relationshipDelta, "relationship delta")
	if not outcome.allowed then
		assert(outcome.relationshipDelta == 0, "denied outcome must carry zero relationship delta")
		return table.freeze({score=currentScore, tier=NpcRelationshipModel.getTier(currentScore), changed=false})
	end
	assert(outcome.relationshipDelta == 0 or outcome.relationshipDelta == 1, "allowed relationship delta must be 0 or 1")
	local nextScore = math.min(MAX_SCORE, currentScore + outcome.relationshipDelta)
	return table.freeze({score=nextScore, tier=NpcRelationshipModel.getTier(nextScore), changed=nextScore ~= currentScore})
end

function NpcRelationshipModel.projectReputation(scores: {[string]: number}): number
	local total = 0
	local count = 0
	for npcId, score in pairs(scores) do
		assert(type(npcId) == "string" and npcId:match("%S") ~= nil, "npc id must be non-empty")
		assertScore(score)
		total += score
		count += 1
	end
	if count == 0 then
		return 0
	end
	return math.floor((total * 100) / (count * MAX_SCORE))
end

return table.freeze(NpcRelationshipModel)
