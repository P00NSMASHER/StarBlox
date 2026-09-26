--!strict

local SpacedMastery = require(script.Parent.SpacedMastery)

local LearningPriority = {}

local function pilotState(profileData)
	local learning = profileData.Learning
	if type(learning) ~= "table" then return {} end
	return if type(learning.Pilot) == "table" then learning.Pilot else {}
end

function LearningPriority.IsUnlocked(profileData, config): boolean
	if type(config) ~= "table" or config.Enabled ~= true then return false end
	local pilot = pilotState(profileData)
	return (tonumber(pilot.QuestionsCompleted) or 0) >= (tonumber(config.UnlockMinQuestionsCompleted) or math.huge)
		and (tonumber(pilot.SessionsCompleted) or 0) >= (tonumber(config.UnlockMinCompletedSessions) or math.huge)
end

local function skillStats(profileData, skill: string)
	local learning = profileData.Learning
	if type(learning) ~= "table" or type(learning.SkillStats) ~= "table" then return {} end
	local raw = learning.SkillStats[skill]
	return if type(raw) == "table" then raw else {}
end

local function recentSkillSet(profileData, bank)
	local result = {}
	local learning = profileData.Learning
	local ids = if type(learning) == "table" and type(learning.RecentQuestionIds) == "table"
		then learning.RecentQuestionIds else {}
	local start = math.max(1, #ids - 5)
	for index = start, #ids do
		local q = bank.GetById(ids[index])
		if q ~= nil and type(q.Skill) == "string" then result[q.Skill] = true end
	end
	return result
end

function LearningPriority.SkillScore(
	profileData,
	skill: string,
	now: number,
	config,
	spacedConfig,
	currentMaterialSkills,
	recentSkills
): number
	local stats = skillStats(profileData, skill)
	local seen = math.max(0, tonumber(stats.Seen) or 0)
	local correct = math.max(0, tonumber(stats.Correct) or 0)
	local accuracy = if seen > 0 then math.clamp(correct / seen, 0, 1) else 0.5
	local weakness = 1 - accuracy
	local lastSeenAt = math.max(0, tonumber(stats.LastSeenAt) or 0)
	local horizon = math.max(3600, tonumber(config.RecencyHorizonSeconds) or 604800)
	local recency = if lastSeenAt <= 0 then 1 else math.clamp((now - lastSeenAt) / horizon, 0, 1)
	local wrongPressure = math.clamp((tonumber(stats.ConsecutiveWrong) or 0) / 3, 0, 1)
	local underTarget = math.max(1, tonumber(config.UnderexposureTarget) or 8)
	local underexposure = math.clamp(1 - (seen / underTarget), 0, 1)
	local due = SpacedMastery.DueScore(profileData, skill, now, spacedConfig)
	local current = if type(currentMaterialSkills) == "table" and currentMaterialSkills[skill] == true then 1 else 0
	local recentPenalty = if type(recentSkills) == "table" and recentSkills[skill] == true
		then tonumber(config.RecentSkillPenalty) or 0.18 else 0
	local score =
		weakness * (tonumber(config.WeaknessWeight) or 0.34)
		+ recency * (tonumber(config.RecencyWeight) or 0.22)
		+ math.max(wrongPressure, underexposure * 0.5) * (tonumber(config.WrongPressureWeight) or 0.16)
		+ due * (tonumber(config.DueWeight) or 0.20)
		+ current * (tonumber(config.CurrentMaterialWeight) or 0.08)
		- recentPenalty
	return score
end

function LearningPriority.RankQuestions(profileData, questions, bank, config, spacedConfig, now: number, currentMaterialSkills)
	local ranked = table.clone(questions)
	if not LearningPriority.IsUnlocked(profileData, config) then return ranked end
	local recentSkills = recentSkillSet(profileData, bank)
	table.sort(ranked, function(a, b)
		local aSkill = tostring(a.Skill or "unknown")
		local bSkill = tostring(b.Skill or "unknown")
		local aScore = LearningPriority.SkillScore(profileData, aSkill, now, config, spacedConfig, currentMaterialSkills, recentSkills)
		local bScore = LearningPriority.SkillScore(profileData, bSkill, now, config, spacedConfig, currentMaterialSkills, recentSkills)
		if math.abs(aScore - bScore) > 0.000001 then return aScore > bScore end
		return tostring(a.Id) < tostring(b.Id)
	end)
	return ranked
end

function LearningPriority.SelectForStation(profileData, bank, stationId: string, cursor: number, targetDifficulty: number?, automationConfig, now: number)
	local pool = bank.QuestionsByStation[stationId]
	if pool == nil or #pool == 0 then return nil end
	local materialCount = bank.MaterialCountByStation[stationId] or 0
	if cursor < materialCount or not LearningPriority.IsUnlocked(profileData, automationConfig.Step5Priority) then
		return bank.Select(stationId, cursor, targetDifficulty)
	end

	local currentMaterialSkills = {}
	for index = 1, materialCount do
		local q = pool[index]
		if q ~= nil and type(q.Skill) == "string" then currentMaterialSkills[q.Skill] = true end
	end

	local candidates = {}
	for index = materialCount + 1, #pool do
		local q = pool[index]
		if type(targetDifficulty) ~= "number" or q.Difficulty == targetDifficulty then
			table.insert(candidates, q)
		end
	end
	if #candidates == 0 then
		for index = materialCount + 1, #pool do table.insert(candidates, pool[index]) end
	end
	local ranked = LearningPriority.RankQuestions(
		profileData,
		candidates,
		bank,
		automationConfig.Step5Priority,
		automationConfig.Step6SpacedMastery,
		now,
		currentMaterialSkills
	)
	return ranked[1] or bank.Select(stationId, cursor, targetDifficulty)
end

return table.freeze(LearningPriority)
