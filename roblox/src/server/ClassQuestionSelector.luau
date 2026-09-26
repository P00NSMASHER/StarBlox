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

local function filteredForClass(classId: string, preferredSubject: string?)
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
	}
end

function ClassQuestionSelector.SelectBundle(
	classId: string,
	cursor: any,
	recentQuestionIds: any,
	preferredSubject: string?
)
	local classDef = SchoolConfig.Classes[classId]
	if classDef == nil then
		return {ok = false, code = "unknown_class"}
	end

	local candidates = filteredForClass(classId, preferredSubject)
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

		-- Prefer unseen questions while preserving material-before-fallback sequence.
		for delta = 0, scanLimit do
			local candidatePosition = position + delta
			local candidate = logicalCandidate(material, fallback, candidatePosition)
			if candidate ~= nil and selectedIds[candidate.Id] ~= true and recent[candidate.Id] ~= true then
				chosen = candidate
				chosenPosition = candidatePosition
				break
			end
		end

		-- If the recent-history window exhausts the eligible pool, repetition is allowed.
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
		bankSnapshotId = CoreQuestionBank.Source.BankSnapshotId or CoreQuestionBank.Source.PackSourceHash or "",
		bankSourceHash = CoreQuestionBank.Source.PackSourceHash or "",
		questionCount = #selected,
		questions = selected,
		nextCursor = position,
	}
end

function ClassQuestionSelector.GetServerQuestion(questionId: string)
	return CoreQuestionBank.GetById(questionId)
end

return ClassQuestionSelector
