--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local QuestionPolicyShadow = require(ReplicatedStorage.StarBlox.QuestionPolicyShadow)

local IntelligenceShadowService = {}
IntelligenceShadowService.__index = IntelligenceShadowService

local function validateCandidate(candidate)
	assert(type(candidate.questionId) == "string" and candidate.questionId ~= "", "candidate.questionId is required")
	assert(type(candidate.version) == "number" and candidate.version >= 1, "candidate.version is required")
	assert(type(candidate.contentHash) == "string" and candidate.contentHash ~= "", "candidate.contentHash is required")
	assert(type(candidate.difficulty) == "number", "candidate.difficulty is required")
	assert(type(candidate.role) == "string", "candidate.role is required")
end

function IntelligenceShadowService.new(telemetrySink)
	local self = setmetatable({}, IntelligenceShadowService)
	self._telemetrySink = telemetrySink
	return self
end

function IntelligenceShadowService:Evaluate(args: {[string]: any})
	assert(type(args) == "table", "args are required")
	assert(type(args.controlQuestionId) == "string", "controlQuestionId is required")
	assert(type(args.candidates) == "table" and #args.candidates > 0, "candidates are required")
	for _, candidate in args.candidates do
		validateCandidate(candidate)
	end

	local ranking = QuestionPolicyShadow.rank(args.candidates, {
		memoryByConcept = args.memoryByConcept or {},
		theta = args.theta or 0,
		nowMs = args.nowMs,
		desiredRetention = args.desiredRetention or 0.90,
		introduceNewConcepts = args.introduceNewConcepts == true,
		recentQuestionIds = args.recentQuestionIds or {},
		recentConceptIds = args.recentConceptIds or {},
		recentWrongStreak = args.recentWrongStreak or 0,
		context = args.context or {},
		weights = args.weights,
	})

	local shadow = ranking[1]
	local comparison = {
		mode = "shadow",
		policyVersion = QuestionPolicyShadow.VERSION,
		controlQuestionId = args.controlQuestionId,
		shadowQuestionId = shadow and shadow.questionId or nil,
		shadowQuestionVersion = shadow and shadow.version or nil,
		shadowQuestionHash = shadow and shadow.contentHash or nil,
		match = shadow ~= nil and shadow.questionId == args.controlQuestionId,
		shadowScore = shadow and shadow.score or nil,
		shadowSignals = shadow and shadow.signals or nil,
		candidateCount = #ranking,
	}

	if self._telemetrySink ~= nil then
		self._telemetrySink(comparison)
	end

	-- Shadow mode is deliberately non-authoritative. The live selector remains
	-- the control path until a separate Step 18 rollout decision explicitly
	-- permits experimental use at the callsite.
	return {
		selectedQuestionId = args.controlQuestionId,
		authoritative = "control",
		shadow = comparison,
		ranking = ranking,
	}
end

return IntelligenceShadowService
