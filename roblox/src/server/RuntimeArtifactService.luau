--!strict

local RuntimeArtifactService = {}
RuntimeArtifactService.__index = RuntimeArtifactService

local function questionKey(ref)
	return string.format("%s@%d#%s", ref.questionId, ref.version, ref.contentHash)
end

local function freezeCopy(value)
	if type(value) ~= "table" then
		return value
	end
	local out = {}
	for key, child in value do
		out[key] = freezeCopy(child)
	end
	return table.freeze(out)
end

function RuntimeArtifactService.new()
	local self = setmetatable({}, RuntimeArtifactService)
	self._bank = nil
	self._questions = {}
	self._daily = nil
	return self
end

function RuntimeArtifactService:LoadQuestionBank(payload: {[string]: any})
	assert(type(payload) == "table", "Question Bank payload is required")
	assert(type(payload.bankId) == "string" and payload.bankId ~= "", "bankId is required")
	assert(type(payload.version) == "string" and payload.version ~= "", "bank version is required")
	assert(type(payload.hash) == "string" and payload.hash ~= "", "bank hash is required")
	assert(type(payload.questions) == "table", "questions are required")

	local nextQuestions = {}
	for _, question in payload.questions do
		assert(type(question.questionId) == "string" and question.questionId ~= "", "questionId is required")
		assert(type(question.version) == "number" and question.version >= 1, "question version is required")
		assert(type(question.contentHash) == "string" and question.contentHash ~= "", "question hash is required")
		assert(type(question.choices) == "table" and #question.choices >= 2, "question choices are required")
		assert(type(question.answer) == "string", "question answer is required")
		assert(type(question.prompt) == "string", "question prompt is required")

		local key = questionKey(question)
		assert(nextQuestions[key] == nil, "duplicate exact QuestionVersion: " .. key)
		nextQuestions[key] = freezeCopy(question)
	end

	self._questions = nextQuestions
	self._bank = table.freeze({
		bankId = payload.bankId,
		version = payload.version,
		hash = payload.hash,
		questionCount = #payload.questions,
	})
end

function RuntimeArtifactService:ActivateDaily(payload: {[string]: any})
	assert(self._bank ~= nil, "Question Bank must be loaded before Daily activation")
	assert(type(payload) == "table", "Daily payload is required")
	assert(payload.certified == true, "Daily must be certified offline before Roblox activation")
	assert(type(payload.dailyId) == "string" and payload.dailyId ~= "", "dailyId is required")
	assert(type(payload.releaseId) == "string" and payload.releaseId ~= "", "releaseId is required")
	assert(type(payload.bundleHash) == "string" and payload.bundleHash ~= "", "bundleHash is required")
	assert(type(payload.questionRefs) == "table", "Daily questionRefs are required")

	for _, ref in payload.questionRefs do
		local key = questionKey(ref)
		assert(self._questions[key] ~= nil, "Daily references unknown QuestionVersion: " .. key)
	end

	self._daily = freezeCopy(payload)
end

function RuntimeArtifactService:GetBankMetadata()
	return self._bank
end

function RuntimeArtifactService:GetActiveDaily()
	return self._daily
end

function RuntimeArtifactService:GetQuestion(ref: {[string]: any})
	return self._questions[questionKey(ref)]
end

function RuntimeArtifactService:GetDailyShadowCandidates()
	assert(self._daily ~= nil, "no active Daily")
	local candidates = {}
	for _, ref in self._daily.questionRefs do
		local question = self:GetQuestion(ref)
		if question ~= nil then
			table.insert(candidates, {
				questionId = question.questionId,
				version = question.version,
				contentHash = question.contentHash,
				subject = question.subject,
				district = question.district,
				skill = question.skill,
				role = question.role,
				conceptIds = question.conceptIds or {question.skill},
				difficulty = question.difficulty,
				irtDifficulty = question.irtDifficulty,
				irtDiscrimination = question.irtDiscrimination,
				quality = question.quality,
			})
		end
	end
	return candidates
end

return RuntimeArtifactService
