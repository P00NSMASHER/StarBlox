--!strict

-- Generated from privacy-safe schoolwork skill observations.
-- No raw images, worksheet text, student answers, grades, or teacher marks are stored here.
local SchoolworkSkillEvidence = {
	SchemaVersion = 1,
	Version = "schoolwork-skill-observations-v1",
	BatchId = "schoolwork-2026-09-26-001",
	CapturedDate = "2026-09-26",
	Skills = table.freeze({
		["cvc-structure"] = table.freeze({
			ObservationCount = 1,
			Attempted = 1,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 1,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["genre"] = table.freeze({
			ObservationCount = 1,
			Attempted = 1,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 1,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["inference"] = table.freeze({
			ObservationCount = 1,
			Attempted = 1,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 1,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["plural-nouns"] = table.freeze({
			ObservationCount = 1,
			Attempted = 1,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 1,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["religion-application"] = table.freeze({
			ObservationCount = 3,
			Attempted = 3,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 3,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["story-elements"] = table.freeze({
			ObservationCount = 2,
			Attempted = 2,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 2,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["vocabulary-in-context"] = table.freeze({
			ObservationCount = 1,
			Attempted = 1,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 1,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
		["vowel-patterns"] = table.freeze({
			ObservationCount = 2,
			Attempted = 2,
			LikelyCorrect = 0,
			LikelyIncorrect = 0,
			UnknownCorrectness = 2,
			MeanConfidence = 0.5,
			MaxConfidence = 0.5,
			Current = true,
		}),
	}),
}

function SchoolworkSkillEvidence.HasSkill(skill: string): boolean
	return SchoolworkSkillEvidence.Skills[skill] ~= nil
end

return table.freeze(SchoolworkSkillEvidence)
