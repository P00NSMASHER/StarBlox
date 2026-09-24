--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Intelligence = require(ReplicatedStorage.StarBlox.PlayerIntelligence)
local Policy = require(ReplicatedStorage.StarBlox.QuestionPolicyShadow)

local passed = 0
local failed = 0

local function check(condition: boolean, message: string)
	if condition then
		passed += 1
	else
		failed += 1
		error(message)
	end
end

check(math.abs(Intelligence.authoredDifficultyToIrt(3) - 0) < 1e-9, "difficulty prior")
check(math.abs(Intelligence.probabilityCorrect(0, {difficulty = 0, discrimination = 1}) - 0.5) < 1e-9, "IRT midpoint")
check(math.abs(Intelligence.retrievabilityAt({
	exposures = 1,
	stability = 1,
	lastSeenAt = 0,
}, 86_400_000) - 0.9) < 1e-9, "FSRS 90% stability definition")

local ranking = Policy.rank({
	{
		questionId = "matched",
		version = 1,
		contentHash = "hash-1",
		difficulty = 3,
		role = "practice",
		skill = "math",
		conceptIds = {"math"},
	},
	{
		questionId = "hard",
		version = 1,
		contentHash = "hash-2",
		difficulty = 5,
		role = "transfer",
		skill = "math",
		conceptIds = {"math"},
	},
}, {
	memoryByConcept = {},
	theta = 0,
	nowMs = 0,
	introduceNewConcepts = true,
	recentQuestionIds = {},
	recentConceptIds = {},
	recentWrongStreak = 0,
	context = {skills = {"math"}},
})

check(#ranking == 2, "expected two candidates")
check(ranking[1].questionId == "matched", "ability-matched question should rank first")

return {
	passed = passed,
	failed = failed,
}
