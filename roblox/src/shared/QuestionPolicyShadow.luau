--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Intelligence = require(ReplicatedStorage.StarBlox.PlayerIntelligence)

local QuestionPolicyShadow = {}

QuestionPolicyShadow.VERSION = "question-policy-v1"

QuestionPolicyShadow.DEFAULT_WEIGHTS = {
	memory = 0.28,
	irt = 0.24,
	entropy = 0.18,
	novelty = 0.12,
	gameplay = 0.12,
	quality = 0.06,
}

local function clamp(value: number, minValue: number, maxValue: number): number
	return math.min(maxValue, math.max(minValue, value))
end

local function contains(list: {any}?, value: any): boolean
	if list == nil then
		return false
	end
	for _, item in list do
		if item == value then
			return true
		end
	end
	return false
end

local function normalizeWeights(raw: {[string]: number}?): {[string]: number}
	local values = {}
	local total = 0
	for key, defaultValue in QuestionPolicyShadow.DEFAULT_WEIGHTS do
		local value = if raw and raw[key] ~= nil then raw[key] else defaultValue
		value = math.max(0, value)
		values[key] = value
		total += value
	end
	if total <= 0 then
		return table.clone(QuestionPolicyShadow.DEFAULT_WEIGHTS)
	end
	for key, value in values do
		values[key] = value / total
	end
	return values
end

local function weightedGeometric(signals: {[string]: number}, weights: {[string]: number}): number
	local logScore = 0
	for key, weight in weights do
		local signal = clamp(signals[key] or 0, 0, 1)
		logScore += weight * math.log(math.max(0.03, signal))
	end
	return math.exp(logScore)
end

local function roleFit(role: string, context: {[string]: any}): number
	local hint = context.roleHint
	if hint ~= nil then
		if role == hint then
			return 1
		elseif hint == "challenge" then
			if role == "transfer" then return 0.98 end
			if role == "diagnose" then return 0.92 end
			if role == "review" then return 0.76 end
			return 0.68
		elseif hint == "recovery" then
			if role == "practice" then return 1 end
			if role == "review" then return 0.96 end
			if role == "diagnose" then return 0.82 end
			return 0.60
		end
		return 0.72
	end

	if context.boss then
		if role == "transfer" then return 1 end
		if role == "diagnose" then return 0.92 end
		if role == "review" then return 0.76 end
		return 0.68
	end

	if context.preferredRoles and #context.preferredRoles > 0 then
		return if contains(context.preferredRoles, role) then 1 else 0.70
	end
	return 1
end

local function passesHardContext(candidate: {[string]: any}, context: {[string]: any}): boolean
	local filters = {
		{"subjects", candidate.subject},
		{"districts", candidate.district},
		{"skills", candidate.skill},
		{"roles", candidate.role},
	}
	for _, pair in filters do
		local allowed = context[pair[1]]
		if allowed and #allowed > 0 and not contains(allowed, pair[2]) then
			return false
		end
	end

	if context.strictConcept and context.targetConceptIds and #context.targetConceptIds > 0 then
		local matched = false
		for _, conceptId in candidate.conceptIds or {} do
			if contains(context.targetConceptIds, conceptId) then
				matched = true
				break
			end
		end
		if not matched then
			return false
		end
	end

	return true
end

local function noveltyScore(questionId: string, conceptIds: {string}, state: {[string]: any}): number
	local exactQuestion = 1
	for index, recent in state.recentQuestionIds or {} do
		if recent == questionId then
			local values = {0.08, 0.18, 0.30, 0.45}
			exactQuestion = values[math.min(index, 4)] or 0.45
			break
		end
	end

	local concept = 1
	for _, conceptId in conceptIds do
		for index, recent in state.recentConceptIds or {} do
			if recent == conceptId then
				if index == 1 then concept = math.min(concept, 0.45)
				elseif index == 2 then concept = math.min(concept, 0.62)
				elseif index == 3 then concept = math.min(concept, 0.78)
				else concept = math.min(concept, 0.90) end
				break
			end
		end
	end
	return exactQuestion * concept
end

local function gameplayScore(candidate: {[string]: any}, context: {[string]: any}, probability: number): number
	local score = roleFit(candidate.role, context)

	if context.targetConceptIds and #context.targetConceptIds > 0 then
		local matched = false
		for _, conceptId in candidate.conceptIds or {} do
			if contains(context.targetConceptIds, conceptId) then
				matched = true
				break
			end
		end
		score *= if matched then 1 else 0.72
	end

	if context.boss then
		local bossFit = 1 - math.min(1, math.abs(probability - 0.58) / 0.42)
		score *= 0.72 + 0.28 * bossFit
	elseif context.recovery then
		local recoveryFit = 1 - math.min(1, math.abs(probability - 0.72) / 0.72)
		score *= 0.70 + 0.30 * recoveryFit
	end

	return clamp(score, 0, 1)
end

local function conceptSignals(candidate: {[string]: any}, state: {[string]: any})
	local memoryValues = {}
	local entropyValues = {}
	local retrievabilities = {}
	local nowMs = state.nowMs
	local introduceNew = state.introduceNewConcepts == true

	for _, conceptId in candidate.conceptIds or {candidate.skill} do
		local memory = state.memoryByConcept and state.memoryByConcept[conceptId] or nil
		if memory == nil or (memory.exposures or 0) <= 0 then
			table.insert(memoryValues, if introduceNew then 0.82 else 0.42)
			table.insert(entropyValues, 0.78)
			table.insert(retrievabilities, 0)
		else
			table.insert(memoryValues, Intelligence.memoryNeedScore(memory, nowMs, state.desiredRetention))
			table.insert(entropyValues, Intelligence.conceptInformationGain(memory, nowMs))
			table.insert(retrievabilities, Intelligence.retrievabilityAt(memory, nowMs))
		end
	end

	local memory = 0
	for _, value in memoryValues do memory = math.max(memory, value) end
	local entropy = 0
	local retrievability = 0
	for _, value in entropyValues do entropy += value end
	for _, value in retrievabilities do retrievability += value end
	if #entropyValues > 0 then entropy /= #entropyValues end
	if #retrievabilities > 0 then retrievability /= #retrievabilities end

	return memory, entropy, retrievability
end

function QuestionPolicyShadow.rank(candidates: {{[string]: any}}, state: {[string]: any})
	local weights = normalizeWeights(state.weights)
	local rows = {}
	local context = state.context or {}
	local theta = state.theta or 0

	for _, candidate in candidates do
		if passesHardContext(candidate, context) then
			local conceptIds = candidate.conceptIds or {candidate.skill}
			local memory, entropy, retrievability = conceptSignals(candidate, state)
			local item = {
				difficulty = candidate.irtDifficulty or Intelligence.authoredDifficultyToIrt(candidate.difficulty or 3),
				discrimination = candidate.irtDiscrimination or 1,
			}
			local probability = Intelligence.probabilityCorrect(theta, item)
			local irt = Intelligence.normalizedIrtSignal(theta, item)
			local novelty = noveltyScore(candidate.questionId, conceptIds, state)
			local gameplay = gameplayScore(candidate, context, probability)
			local quality = clamp(candidate.quality or 1, 0, 1)

			local signals = {
				memory = memory,
				irt = irt,
				entropy = entropy,
				novelty = novelty,
				gameplay = gameplay,
				quality = quality,
			}

			table.insert(rows, {
				questionId = candidate.questionId,
				version = candidate.version,
				contentHash = candidate.contentHash,
				role = candidate.role,
				conceptIds = conceptIds,
				probabilityCorrect = probability,
				retrievability = retrievability,
				signals = signals,
				score = weightedGeometric(signals, weights),
			})
		end
	end

	local recent = {}
	for _, questionId in state.recentQuestionIds or {} do recent[questionId] = true end
	local fresh = {}
	for _, row in rows do
		if not recent[row.questionId] then table.insert(fresh, row) end
	end
	if #fresh > 0 then rows = fresh end

	if (state.recentWrongStreak or 0) >= 2 and not context.boss and not context.disableRecoveryGuard then
		local recovery = {}
		for _, row in rows do
			if row.probabilityCorrect >= 0.55 and row.probabilityCorrect <= 0.92 and
				(row.role == "practice" or row.role == "review" or row.role == "diagnose") then
				table.insert(recovery, row)
			end
		end
		if #recovery > 0 then rows = recovery end
	end

	table.sort(rows, function(a, b)
		if a.score ~= b.score then return a.score > b.score end
		if a.signals.memory ~= b.signals.memory then return a.signals.memory > b.signals.memory end
		if a.signals.entropy ~= b.signals.entropy then return a.signals.entropy > b.signals.entropy end
		return a.questionId < b.questionId
	end)

	return rows
end

return QuestionPolicyShadow
