--!strict

local PlayerIntelligence = {}

local DAY_MS = 86_400_000
local DEFAULT_RETENTION = 0.90
local MAX_IRT_INFORMATION = 2.25

local function clamp(value: number, minValue: number, maxValue: number): number
	return math.min(maxValue, math.max(minValue, value))
end

local function log2(value: number): number
	return math.log(value) / math.log(2)
end

function PlayerIntelligence.retrievabilityAt(state: {[string]: any}?, nowMs: number): number
	if state == nil or (state.exposures or 0) <= 0 or (state.stability or 0) <= 0 then
		return 0
	end
	local lastSeenAt = state.lastSeenAt or 0
	local days = math.max(0, (nowMs - lastSeenAt) / DAY_MS)
	return clamp(1 / (1 + days / (9 * state.stability)), 0, 1)
end

function PlayerIntelligence.memoryNeedScore(
	state: {[string]: any}?,
	nowMs: number,
	desiredRetention: number?
): number
	if state == nil or (state.exposures or 0) <= 0 then
		return 1
	end

	local retention = clamp(desiredRetention or DEFAULT_RETENTION, 0.5, 0.99)
	local retrievability = PlayerIntelligence.retrievabilityAt(state, nowMs)
	local deficit = clamp((retention - retrievability) / retention, 0, 1)
	local lapsePressure = clamp((state.lapses or 0) * 0.03, 0, 0.18)
	local difficultyPressure = clamp(((state.fsrsDifficulty or 5) - 5) * 0.02, 0, 0.10)
	return clamp(deficit + lapsePressure + difficultyPressure, 0, 1)
end

function PlayerIntelligence.authoredDifficultyToIrt(difficulty: number): number
	return clamp(difficulty, 1, 5) - 3
end

function PlayerIntelligence.probabilityCorrect(theta: number, item: {[string]: any}): number
	local t = clamp(theta, -4, 4)
	local discrimination = clamp(item.discrimination or 1, 0.1, 3)
	local difficulty = clamp(item.difficulty or 0, -3, 3)
	local exponent = -discrimination * (t - difficulty)
	if exponent > 700 then
		return 0
	elseif exponent < -700 then
		return 1
	end
	return 1 / (1 + math.exp(exponent))
end

function PlayerIntelligence.fisherInformation(theta: number, item: {[string]: any}): number
	local p = PlayerIntelligence.probabilityCorrect(theta, item)
	local q = 1 - p
	if p < 0.0001 or q < 0.0001 then
		return 0
	end
	local discrimination = clamp(item.discrimination or 1, 0.1, 3)
	return discrimination * discrimination * p * q
end

function PlayerIntelligence.abilityFitScore(theta: number, item: {[string]: any}): number
	local p = PlayerIntelligence.probabilityCorrect(theta, item)
	return clamp(1 - math.abs(p - 0.5) * 2, 0, 1)
end

function PlayerIntelligence.normalizedIrtSignal(theta: number, item: {[string]: any}): number
	local fit = PlayerIntelligence.abilityFitScore(theta, item)
	local info = clamp(PlayerIntelligence.fisherInformation(theta, item) / MAX_IRT_INFORMATION, 0, 1)
	return clamp(0.68 * fit + 0.32 * info, 0, 1)
end

local function distributionEntropy(weights: {number}): number
	local total = 0
	for _, value in weights do
		total += math.max(0, value)
	end
	if total <= 0 then
		return 0
	end

	local entropy = 0
	for _, raw in weights do
		local p = math.max(0, raw) / total
		if p > 0 then
			entropy -= p * log2(p)
		end
	end
	return entropy
end

local function knowledgeHypotheses(state: {[string]: any}?, nowMs: number)
	if state == nil or (state.exposures or 0) <= 0 then
		return {
			{id = "remembered", weight = 0.15, pCorrect = 0.90},
			{id = "fragile", weight = 0.35, pCorrect = 0.58},
			{id = "not-retrievable", weight = 0.50, pCorrect = 0.22},
		}
	end

	local r = clamp(PlayerIntelligence.retrievabilityAt(state, nowMs), 0, 1)
	local remembered = r ^ 1.35
	local forgotten = (1 - r) ^ 1.35
	local fragile = math.max(0.06, 1 - math.abs(2 * r - 1))
	local total = remembered + fragile + forgotten

	return {
		{id = "remembered", weight = remembered / total, pCorrect = 0.90},
		{id = "fragile", weight = fragile / total, pCorrect = 0.58},
		{id = "not-retrievable", weight = forgotten / total, pCorrect = 0.22},
	}
end

function PlayerIntelligence.conceptInformationGain(state: {[string]: any}?, nowMs: number): number
	local hypotheses = knowledgeHypotheses(state, nowMs)
	local weights = {}
	local pCorrect = 0
	for index, hypothesis in hypotheses do
		weights[index] = hypothesis.weight
		pCorrect += hypothesis.weight * hypothesis.pCorrect
	end

	local priorEntropy = distributionEntropy(weights)

	local function posterior(outcomeCorrect: boolean): number
		local posteriorWeights = {}
		local total = 0
		for index, hypothesis in hypotheses do
			local likelihood = if outcomeCorrect then hypothesis.pCorrect else 1 - hypothesis.pCorrect
			local value = hypothesis.weight * likelihood
			posteriorWeights[index] = value
			total += value
		end
		if total <= 1e-12 then
			return 0
		end
		for index, value in posteriorWeights do
			posteriorWeights[index] = value / total
		end
		return distributionEntropy(posteriorWeights)
	end

	local expectedPosterior =
		pCorrect * posterior(true) +
		(1 - pCorrect) * posterior(false)
	local gain = math.max(0, priorEntropy - expectedPosterior)
	return clamp(gain / log2(3), 0, 1)
end

return PlayerIntelligence
