--!strict

local LearningPriority = require(script.Parent.LearningPriority)
local SpacedMastery = require(script.Parent.SpacedMastery)

local PilotQuestionMixer = {}

local function sortedStationIds(bank)
	local ids = {}
	for stationId, _ in bank.QuestionsByStation do
		table.insert(ids, stationId)
	end
	table.sort(ids)
	return ids
end

local function currentMaterialPool(bank)
	local out = {}
	local stations = sortedStationIds(bank)
	local maxMaterial = 0
	for _, stationId in stations do
		maxMaterial = math.max(maxMaterial, bank.MaterialCountByStation[stationId] or 0)
	end
	for round = 1, maxMaterial do
		for _, stationId in stations do
			local pool = bank.QuestionsByStation[stationId]
			local materialCount = bank.MaterialCountByStation[stationId] or 0
			if pool ~= nil and round <= materialCount and pool[round] ~= nil then
				table.insert(out, pool[round])
			end
		end
	end
	return out
end

local function fallbackPools(bank)
	local reading = {}
	local mathQuestions = {}
	local all = {}
	for stationId, pool in bank.QuestionsByStation do
		local materialCount = bank.MaterialCountByStation[stationId] or 0
		for index = materialCount + 1, #pool do
			local question = pool[index]
			table.insert(all, question)
			if question.Subject == "Reading / ELA" then
				table.insert(reading, question)
			elseif question.Subject == "Math" then
				table.insert(mathQuestions, question)
			end
		end
	end
	return reading, mathQuestions, all
end

local function rotate(list, offset: number)
	if #list <= 1 then return table.clone(list) end
	local out = {}
	local cleanOffset = offset % #list
	for index = 1, #list do
		local sourceIndex = ((index - 1 + cleanOffset) % #list) + 1
		table.insert(out, list[sourceIndex])
	end
	return out
end

local function priorSkillSet(profileData)
	local result = {}
	local learning = profileData.Learning
	local stats = if type(learning) == "table" then learning.SkillStats else nil
	if type(stats) ~= "table" then return result end
	for skill, row in stats do
		if type(skill) == "string"
			and type(row) == "table"
			and (tonumber(row.Seen) or 0) > 0
		then
			result[skill] = true
		end
	end
	return result
end

local function priorPool(profileData, fallback)
	local skills = priorSkillSet(profileData)
	local out = {}
	for _, question in fallback do
		if skills[question.Skill] == true then
			table.insert(out, question)
		end
	end
	return out
end

local function materialSkillSet(bank)
	local result = {}
	for stationId, pool in bank.QuestionsByStation do
		local count = bank.MaterialCountByStation[stationId] or 0
		for index = 1, count do
			local question = pool[index]
			if question ~= nil and type(question.Skill) == "string" then
				result[question.Skill] = true
			end
		end
	end
	return result
end

local function duePool(profileData, pool, now: number, spacedConfig)
	local out = {}
	for _, question in pool do
		local skill = tostring(question.Skill or "unknown")
		if SpacedMastery.IsDue(profileData, skill, now, spacedConfig) then
			table.insert(out, question)
		end
	end
	return out
end

local function candidateAllowed(question, state, maxPerSkill: number, avoidConsecutive: boolean): boolean
	if state.seenIds[question.Id] == true then return false end
	local skill = tostring(question.Skill or "unknown")
	if (state.skillCounts[skill] or 0) >= maxPerSkill then return false end
	if avoidConsecutive and state.lastSkill == skill then return false end
	return true
end

local function choose(pool, state, maxPerSkill: number)
	for _, question in pool do
		if candidateAllowed(question, state, maxPerSkill, true) then
			return question
		end
	end
	for _, question in pool do
		if candidateAllowed(question, state, maxPerSkill, false) then
			return question
		end
	end
	return nil
end

local function addQuestion(queue, question, requestedBucket: string, sourceBucket: string, state, spacedRetrieval: boolean?)
	local skill = tostring(question.Skill or "unknown")
	state.seenIds[question.Id] = true
	state.skillCounts[skill] = (state.skillCounts[skill] or 0) + 1
	state.lastSkill = skill
	table.insert(queue, {
		QuestionId = question.Id,
		StationId = question.StationId,
		Bucket = requestedBucket,
		SourceBucket = sourceBucket,
		Skill = skill,
		Subject = question.Subject,
		Tier = question.Tier,
		SpacedRetrieval = spacedRetrieval == true,
	})
end

function PilotQuestionMixer.Build(profileData, bank, pilotConfig, sessionOrdinal: number?, automationConfig)
	assert(type(profileData) == "table", "profileData is required")
	assert(type(bank) == "table", "question bank is required")
	assert(type(pilotConfig) == "table", "pilot config is required")

	local ordinal = math.max(1, math.floor(tonumber(sessionOrdinal) or 1))
	local maxPerSkill = math.max(1, math.floor(tonumber(pilotConfig.MaxQuestionsPerSkill) or 3))
	local now = os.time()
	local current = rotate(currentMaterialPool(bank), (ordinal - 1) * 2)
	local starReading, starMath, fallback = fallbackPools(bank)
	starReading = rotate(starReading, (ordinal - 1) * 5)
	starMath = rotate(starMath, (ordinal - 1) * 7)
	fallback = rotate(fallback, (ordinal - 1) * 11)
	local prior = rotate(priorPool(profileData, fallback), ordinal - 1)
	local currentSkills = materialSkillSet(bank)
	local automation = if type(automationConfig) == "table" then automationConfig else {}
	local priorityConfig = automation.Step5Priority or {}
	local spacedConfig = automation.Step6SpacedMastery or {}
	if LearningPriority.IsUnlocked(profileData, priorityConfig) then
		starReading = LearningPriority.RankQuestions(profileData, starReading, bank, priorityConfig, spacedConfig, now, currentSkills)
		starMath = LearningPriority.RankQuestions(profileData, starMath, bank, priorityConfig, spacedConfig, now, currentSkills)
		fallback = LearningPriority.RankQuestions(profileData, fallback, bank, priorityConfig, spacedConfig, now, currentSkills)
		prior = LearningPriority.RankQuestions(profileData, prior, bank, priorityConfig, spacedConfig, now, currentSkills)
	end
	local due = duePool(profileData, prior, now, spacedConfig)

	local pattern = {
		"current","star-reading","current","star-math","spaced",
		"current","star-reading","star-math","spaced",
		"current","star-reading","star-math","spaced",
		"current","star-reading","star-math","spaced","current",
	}
	local expectedLength = math.max(1, math.floor(tonumber(pilotConfig.SessionLength) or 18))
	assert(#pattern == expectedLength, "pilot pattern must match configured session length")

	local state = {
		seenIds = {},
		skillCounts = {},
		lastSkill = nil,
	}
	local queue = {}

	for _, bucket in pattern do
		local selected = nil
		local sourceBucket = bucket
		local spacedRetrieval = false
		if bucket == "current" then
			selected = choose(current, state, maxPerSkill)
		elseif bucket == "star-reading" then
			selected = choose(starReading, state, maxPerSkill)
		elseif bucket == "star-math" then
			selected = choose(starMath, state, maxPerSkill)
		elseif bucket == "spaced" then
			selected = choose(due, state, maxPerSkill)
			if selected ~= nil then
				sourceBucket = "spaced-due"
				spacedRetrieval = true
			else
				selected = choose(prior, state, maxPerSkill)
				sourceBucket = "prior-skill"
			end
			if selected == nil then
				selected = choose(fallback, state, maxPerSkill)
				sourceBucket = "cumulative-bootstrap"
			end
		end
		if selected == nil then
			selected = choose(fallback, state, maxPerSkill)
			sourceBucket = sourceBucket .. "-fallback"
		end
		assert(selected ~= nil, "pilot queue could not satisfy the requested mix")
		addQuestion(queue, selected, bucket, sourceBucket, state, spacedRetrieval)
	end

	return queue
end

return table.freeze(PilotQuestionMixer)
