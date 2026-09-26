--!strict

-- Phase 6 certified rotating question bank.
-- Answers remain server-only because this module lives under ServerScriptService.
local CoreQuestionBank = {}

local SOURCE = table.freeze({
	CertificationVersion = "phase6-abvm-question-source-v1",
	UpstreamRepository = "P00NSMASHER/abvmschoolstarworld",
	UpstreamPath = "pages/data/study-pack.json",
	UpstreamBlobSha = "9db898dbdba7208778ec3f61d25a427bb3dd8b60",
	PackSourceHash = "teacher-pages-0ca987de6de2d3791e25",
	SourceCapturedAt = "2026-09-24T20:13:58.158Z",
	WeekLabel = "Week of September 21, 2026",
	AnswersServerOnly = true,
	NoLiveLlm = true,
})

local QUESTIONS_BY_STATION = table.freeze({
	["word-portal-put-v1"] = table.freeze({
		table.freeze({
			Id = "week-2026-09-22-reading-1",
			ContentHash = "sha256:5cd1ed38654009065d72ea480d29b68664816328f9db5ffc2dbc332fe3b079a0",
			Prompt = "Which story is on the current Reading Work page?",
			Choices = table.freeze({"Little Flap Learns to Fly", "The Very Hungry Caterpillar", "Charlotte's Web"}),
			Answer = "Little Flap Learns to Fly",
			Explanation = "The current Reading Work page lists “Little Flap Learns to Fly.”",
			Subject = "Reading / ELA",
			Skill = "current-story",
			Provenance = "direct-upstream-question",
			SourceQuestionId = "week-2026-09-22-reading-1",
		}),
		table.freeze({
			Id = "week-2026-09-22-reading-2",
			ContentHash = "sha256:ee905197415dd154080fe532fd8df0e593e15fa011662b4ca4f22eeff86e2557",
			Prompt = "Which word is a current sight word?",
			Choices = table.freeze({"she", "went", "tug"}),
			Answer = "she",
			Explanation = "“she” is on the current Reading Work sight-word list.",
			Subject = "Reading / ELA",
			Skill = "current-sight-words",
			Provenance = "direct-upstream-question",
			SourceQuestionId = "week-2026-09-22-reading-2",
		}),
		table.freeze({
			Id = "week-2026-09-22-reading-3",
			ContentHash = "sha256:fa5f378d836281d47d8946edc5d5b2df194bf36bb959e121ed2bbff19f0ccf97",
			Prompt = "Which word is on the current vocabulary list?",
			Choices = table.freeze({"rescue", "culture", "triangle"}),
			Answer = "rescue",
			Explanation = "“rescue” is on the current Reading Work vocabulary list.",
			Subject = "Reading / ELA",
			Skill = "current-vocabulary",
			Provenance = "direct-upstream-question",
			SourceQuestionId = "week-2026-09-22-reading-3",
		}),
	}),
	["spelling-forge-fog-v1"] = table.freeze({
		table.freeze({
			Id = "week-2026-09-22-phonics-1",
			ContentHash = "sha256:ea5b7e6fe6a11628cdc08052a9bb9bb0ae841007185e60fdb3243e6ff2af25b7",
			Prompt = "What phonics skill is being practiced this week?",
			Choices = table.freeze({"2-letter consonant blends", "silent e only", "vowel teams only"}),
			Answer = "2-letter consonant blends",
			Explanation = "The current Reading Work and Sept. 25 spelling-test focus is 2-letter consonant blends.",
			Subject = "Spelling / Handwriting",
			Skill = "two-letter-consonant-blends",
			Provenance = "direct-upstream-question",
			SourceQuestionId = "week-2026-09-22-phonics-1",
		}),
		table.freeze({
			Id = "phase6-sightword-here-v1",
			ContentHash = "sha256:f42e713106b4237fdecd9b0ccc7e78afc0c2a4b0799ffd9dcdd46f4fac174611",
			Prompt = "Which word is on the current sight-word list?",
			Choices = table.freeze({"here", "went", "tug"}),
			Answer = "here",
			Explanation = "“here” is one of the current Grade 2 sight words.",
			Subject = "Reading / ELA",
			Skill = "current-sight-words",
			Provenance = "derived-from-published-topic",
			SourceFact = "Sight words: she, boy, he, small, were, what, girl, here, by, want",
		}),
		table.freeze({
			Id = "phase6-wordstructure-cvc-v1",
			ContentHash = "sha256:2ebbf3b96d80be5ed873ead8a0327ebcbf9d8db3d34f30ae38db9aef68ac0908",
			Prompt = "What word structure is being practiced now?",
			Choices = table.freeze({"CVC words", "compound words", "contractions"}),
			Answer = "CVC words",
			Explanation = "The current Reading Work page lists CVC words for word structure.",
			Subject = "Reading / ELA",
			Skill = "cvc-word-structure",
			Provenance = "derived-from-published-topic",
			SourceFact = "Word structure: CVC words",
		}),
	}),
	["culture-lab-culture-v1"] = table.freeze({
		table.freeze({
			Id = "week-2026-09-22-religion-1",
			ContentHash = "sha256:b746c9a74222a72f340b1fcd8f4a23eb15c85bbb7e7b59e259a866a1a84d7e6f",
			Prompt = "Jesus died for our sins and is our Savior.",
			Choices = table.freeze({"True", "False", "Not sure"}),
			Answer = "True",
			Explanation = "The current Religion page says Jesus died for our sins and is our Savior.",
			Subject = "Religion",
			Skill = "jesus-savior",
			Provenance = "direct-upstream-question",
			SourceQuestionId = "week-2026-09-22-religion-1",
		}),
		table.freeze({
			Id = "week-2026-09-22-religion-2",
			ContentHash = "sha256:8fbc587632ec0583ccc476f202b94ca4e31989e4c23471e418605c6f5d21e0ee",
			Prompt = "What are friends of Jesus called?",
			Choices = table.freeze({"disciples", "captions", "blends"}),
			Answer = "disciples",
			Explanation = "The current Religion page says we are called to be disciples, friends of Jesus.",
			Subject = "Religion",
			Skill = "disciples",
			Provenance = "direct-upstream-question",
			SourceQuestionId = "week-2026-09-22-religion-2",
		}),
		table.freeze({
			Id = "phase6-trinity-v1",
			ContentHash = "sha256:c5a9e20bce61e5cca2b6f957e765a12adcd118ef225f551e117fff8c7c419eba",
			Prompt = "How many persons are in one God in the Trinity?",
			Choices = table.freeze({"3", "2", "5"}),
			Answer = "3",
			Explanation = "The Trinity is three persons in one God: Father, Son, and Holy Spirit.",
			Subject = "Religion",
			Skill = "trinity",
			Provenance = "derived-from-published-topic",
			SourceFact = "Trinity: 3 persons in one God (Father, Son, Holy Spirit)",
		}),
	}),
})

local BY_ID = {}
for _, pool in QUESTIONS_BY_STATION do
	for _, question in pool do
		BY_ID[question.Id] = question
	end
end

local function normalizedRunNumber(runNumber: any): number
	local parsed = tonumber(runNumber) or 1
	if parsed ~= parsed then
		return 1
	end
	return math.max(1, math.floor(parsed))
end

function CoreQuestionBank.Select(stationId: string, runNumber: any)
	local pool = QUESTIONS_BY_STATION[stationId]
	if pool == nil or #pool == 0 then
		return nil
	end
	local cleanRun = normalizedRunNumber(runNumber)
	local index = ((cleanRun - 1) % #pool) + 1
	return pool[index]
end

function CoreQuestionBank.GetById(questionId: string)
	return BY_ID[questionId]
end

function CoreQuestionBank.Grade(questionId: any, choice: any): boolean
	if type(questionId) ~= "string" or type(choice) ~= "string" then
		return false
	end
	local question = BY_ID[questionId]
	return question ~= nil and string.lower(choice) == string.lower(question.Answer)
end

function CoreQuestionBank.CountForStation(stationId: string): number
	local pool = QUESTIONS_BY_STATION[stationId]
	return if pool == nil then 0 else #pool
end

CoreQuestionBank.Source = SOURCE
CoreQuestionBank.QuestionsByStation = QUESTIONS_BY_STATION

return table.freeze(CoreQuestionBank)
