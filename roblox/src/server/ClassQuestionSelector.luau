--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local SchoolConfig = require(ReplicatedStorage.StarBlox.SchoolConfig)
local CoreQuestionBank = require(script.Parent.CoreQuestionBank)

local ClassQuestionSelector = {}

local function contains(values, target): boolean
	for _, value in values or {} do
		if value == target then
			return true
		end
	end
	return false
end

local function recentSet(recentQuestionIds)
	local set = {}
	if type(recentQuestionIds) ~= "table" then
		return set
	end
	local first = math.max(1, #recentQuestionIds - SchoolConfig.QuestionSelection.RecentQuestionWindow + 1)
	for index = first, #recentQuestionIds do
		local questionId = recentQuestionIds[index]
		if type(questionId) == "string" then
			set[questionId] = true
		end
	end
	return set
end

local function allQuestions()
	local out = {}
	for _, pool in CoreQuestionBank.QuestionsByStation do
		for _, question in pool do
			table.insert(out, question)
		end
	end
	table.sort(out, function(left, right)
		return left.Id < right.Id
	end)
	return out
end

local function baseEligible(question, classDef): boolean
	if classDef.StarOnly == true and question.Tier ~= "star-fallback" then
		return false
	end
	return contains(classDef.Subjects, question.Subject)
end

local function preferredWordSkill(question, classDef): boolean
	if classDef.PreferredSkills == nil then
		return true
	end
	return contains(classDef.PreferredSkills, question.Skill)
end

local function weaknessScore(question, skillStats)
	local stats = type(skillStats) == "table"
		and skillStats[tostring(question.Skill or question.Domain or "unknown")]
		or nil
	if type(stats) ~= "table" then return 1 end
	local seen = math.max(0, tonumber(stats.Seen) or 0)
	local correct = math.max(0, tonumber(stats.Correct) or 0)
	local wrongStreak = math.max(0, tonumber(stats.ConsecutiveWrong) or 0)
	local accuracy = if seen > 0 then correct / seen else 0.5
	return (1 - accuracy) + math.min(1, wrongStreak * 0.2)
end

local function subjectWeakness(subject: string, skillStats)
	local seenTotal = 0
	local correctTotal = 0
	local wrongBoost = 0
	local visitedSkills = {}

	for _, question in allQuestions() do
		if question.Tier == "star-fallback" and question.Subject == subject then
			local skill = tostring(question.Skill or question.Domain or "unknown")
			if visitedSkills[skill] ~= true then
				visitedSkills[skill] = true
				local stats = type(skillStats) == "table" and skillStats[skill] or nil
				if type(stats) == "table" then
					local seen = math.max(0, tonumber(stats.Seen) or 0)
					seenTotal += seen
					correctTotal += math.max(0, tonumber(stats.Correct) or 0)
					wrongBoost += math.min(1, math.max(0, tonumber(stats.ConsecutiveWrong) or 0) * 0.2)
				end
			end
		end
	end

	if seenTotal <= 0 then
		return 0.5, 0
	end
	return (1 - (correctTotal / seenTotal)) + wrongBoost, seenTotal
end

local function filteredForClass(classId: string, preferredSubject: string?, skillStats: any?)
	local classDef = SchoolConfig.Classes[classId]
	if classDef == nil then
		return nil
	end

	local candidates = {}
	for _, question in allQuestions() do
		if baseEligible(question, classDef) then
			table.insert(candidates, question)
		end
	end

	if classId == "word-skills" then
		local preferred = {}
		for _, question in candidates do
			if preferredWordSkill(question, classDef) then
				table.insert(preferred, question)
			end
		end
		if #preferred >= SchoolConfig.QuestionsPerAcademicPeriod then
			candidates = preferred
		end
	end

	if classId == "star-lab" and preferredSubject ~= nil and contains(classDef.Subjects, preferredSubject) then
		local preferred = {}
		for _, question in candidates do
			if question.Subject == preferredSubject then
				table.insert(preferred, question)
			end
		end
		if #preferred >= SchoolConfig.QuestionsPerAcademicPeriod then
			candidates = preferred
		end
	end

	if classId == "star-lab" and SchoolConfig.QuestionSelection.WeakSkillBoost == true then
		table.sort(candidates, function(left, right)
			local leftScore = weaknessScore(left, skillStats)
			local rightScore = weaknessScore(right, skillStats)
			if leftScore == rightScore then return left.Id < right.Id end
			return leftScore > rightScore
		end)
	end

	return candidates
end

local function splitTiers(candidates, materialFirst: boolean)
	local material = {}
	local fallback = {}
	for _, question in candidates do
		if question.Tier == "material" then
			table.insert(material, question)
		else
			table.insert(fallback, question)
		end
	end

	if not materialFirst then
		return {}, fallback
	end
	return material, fallback
end

local function logicalCandidate(material, fallback, position: number)
	if position < #material then
		return material[position + 1]
	end
	if #fallback == 0 then
		if #material == 0 then
			return nil
		end
		return material[(position % #material) + 1]
	end
	local fallbackOffset = (position - #material) % #fallback
	return fallback[fallbackOffset + 1]
end

local function pinQuestion(question)
	return {
		Id = question.Id,
		ContentHash = question.ContentHash,
		Prompt = question.Prompt,
		Choices = table.clone(question.Choices),
		Answer = question.Answer,
		Explanation = question.Explanation,
		Subject = question.Subject,
		Skill = question.Skill,
		Tier = question.Tier,
		Domain = question.Domain,
		Difficulty = question.Difficulty,
		Provenance = question.Provenance,
		SourceFact = question.SourceFact,
		Standards = question.Standards,
		DOK = question.DOK,
		Hint = question.Hint,
		Scaffold = question.Scaffold,
		WrongFeedback = question.WrongFeedback,
		Misconceptions = question.Misconceptions,
	}
end

function ClassQuestionSelector.CurrentSnapshotId(): string
	return CoreQuestionBank.Source.BankSnapshotId or CoreQuestionBank.Source.PackSourceHash or ""
end

function ClassQuestionSelector.ChooseStarLabSubject(profileData, schoolDayId: string?): string
	local learning = profileData and profileData.Learning or {}
	local skillStats = learning.SkillStats or {}
	local readingScore, readingSeen = subjectWeakness("Reading / ELA", skillStats)
	local mathScore, mathSeen = subjectWeakness("Math", skillStats)

	if readingSeen == 0 and mathSeen == 0 then
		local cycle = tonumber(string.match(tostring(schoolDayId or ""), "(%d+)$")) or 0
		return if cycle % 2 == 0 then "Reading / ELA" else "Math"
	end
	if readingSeen == 0 then
		return if mathScore > 0.5 then "Math" else "Reading / ELA"
	end
	if mathSeen == 0 then
		return if readingScore > 0.5 then "Reading / ELA" else "Math"
	end
	return if readingScore >= mathScore then "Reading / ELA" else "Math"
end

function ClassQuestionSelector.SelectBundle(
	classId: string,
	cursor: any,
	recentQuestionIds: any,
	preferredSubject: string?,
	skillStats: any?
)
	local classDef = SchoolConfig.Classes[classId]
	if classDef == nil then
		return {ok = false, code = "unknown_class"}
	end

	local candidates = filteredForClass(classId, preferredSubject, skillStats)
	if candidates == nil or #candidates == 0 then
		return {ok = false, code = "no_questions"}
	end

	local material, fallback = splitTiers(candidates, classDef.MaterialFirst == true)
	if classDef.StarOnly == true then
		material = {}
	end

	local required = SchoolConfig.QuestionsPerAcademicPeriod
	if (#material + #fallback) < required then
		return {ok = false, code = "insufficient_questions"}
	end

	local recent = recentSet(recentQuestionIds)
	local selected = {}
	local selectedIds = {}
	local position = math.max(0, math.floor(tonumber(cursor) or 0))
	local scanLimit = math.max(required * 4, #material + #fallback + required)

	for _ = 1, required do
		local chosen = nil
		local chosenPosition = position

		for delta = 0, scanLimit do
			local candidatePosition = position + delta
			local candidate = logicalCandidate(material, fallback, candidatePosition)
			if candidate ~= nil and selectedIds[candidate.Id] ~= true and recent[candidate.Id] ~= true then
				chosen = candidate
				chosenPosition = candidatePosition
				break
			end
		end

		if chosen == nil then
			for delta = 0, scanLimit do
				local candidatePosition = position + delta
				local candidate = logicalCandidate(material, fallback, candidatePosition)
				if candidate ~= nil and selectedIds[candidate.Id] ~= true then
					chosen = candidate
					chosenPosition = candidatePosition
					break
				end
			end
		end

		if chosen == nil then
			return {ok = false, code = "selection_exhausted"}
		end

		selectedIds[chosen.Id] = true
		table.insert(selected, pinQuestion(chosen))
		position = chosenPosition + 1
	end

	return {
		ok = true,
		classId = classId,
		bankSnapshotId = ClassQuestionSelector.CurrentSnapshotId(),
		bankSourceHash = CoreQuestionBank.Source.PackSourceHash or "",
		questionCount = #selected,
		questions = selected,
		nextCursor = position,
		preferredSubject = preferredSubject,
	}
end

function ClassQuestionSelector.SelectBundleForProfile(
	classId: string,
	cursor: any,
	profileData,
	schoolDayId: string?
)
	local learning = profileData and profileData.Learning or {}
	local preferredSubject = nil
	local effectiveCursor = cursor
	if classId == "star-lab" then
		preferredSubject = ClassQuestionSelector.ChooseStarLabSubject(profileData, schoolDayId)
		-- Re-rank from the weakest current skills every STAR Lab session;
		-- recent-history suppression still prevents immediate repeats.
		effectiveCursor = 0
	end

	return ClassQuestionSelector.SelectBundle(
		classId,
		effectiveCursor,
		learning.RecentQuestionIds or {},
		preferredSubject,
		learning.SkillStats or {}
	)
end

function ClassQuestionSelector.GetServerQuestion(questionId: string)
	return CoreQuestionBank.GetById(questionId)
end

return ClassQuestionSelector
