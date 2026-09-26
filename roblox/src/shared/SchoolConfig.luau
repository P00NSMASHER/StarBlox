--!strict

-- School foundation milestones 1-6.
-- This module is intentionally inert until SchoolSystemEnabled is explicitly enabled.
local SchoolConfig = table.freeze({
	SchemaVersion = 2,

	FeatureFlags = table.freeze({
		SchoolSystemEnabled = false,
	}),

	CycleSeconds = 30 * 60,
	QuestionsPerAcademicPeriod = 4,

	Attendance = table.freeze({
		OnTimeGraceSeconds = 15,
		LateJoinAllowed = true,
		MakeupAllowedAfterSchool = true,
	}),

	World = table.freeze({
		WorldRootName = "BrookhavenWorldBaseline",
		RuntimeAnchorFolderName = "StarBloxSchoolAnchors",
		BaselineMutationAllowed = false,
	}),

	Scoring = table.freeze({
		FirstTryPoints = 25,
		RetryPoints = 20,
		UnfinishedPoints = 0,
		GradeA = 90,
		GradeB = 80,
		GradeC = 70,
	}),

	Rewards = table.freeze({
		QuestionCoins = 10,
		QuestionXP = 1,
		ClassCompletionXP = 3,
		FullDayXP = 6,
		FullDayStars = 1,
		MaxRewardedSchoolDaysPerUtcDay = 3,
	}),

	-- One authoritative 30-minute cycle. Offsets are seconds from cycle start.
	-- The later world/UI milestones will render bells, wayfinding, attendance, and report cards.
	Periods = table.freeze({
		table.freeze({
			Id = "arrival",
			Kind = "arrival",
			DisplayName = "Arrival / Homeroom",
			StartOffsetSeconds = 0,
			EndOffsetSeconds = 30,
			InGameStart = "08:50",
			InGameEnd = "09:00",
		}),
		table.freeze({
			Id = "period-1-reading",
			Kind = "academic",
			ClassId = "reading",
			DisplayName = "Reading",
			StartOffsetSeconds = 30,
			EndOffsetSeconds = 180,
			InGameStart = "09:00",
			InGameEnd = "09:50",
		}),
		table.freeze({
			Id = "passing-1",
			Kind = "passing",
			DisplayName = "Passing Period",
			StartOffsetSeconds = 180,
			EndOffsetSeconds = 210,
			InGameStart = "09:50",
			InGameEnd = "10:00",
		}),
		table.freeze({
			Id = "period-2-math",
			Kind = "academic",
			ClassId = "math",
			DisplayName = "Math",
			StartOffsetSeconds = 210,
			EndOffsetSeconds = 360,
			InGameStart = "10:00",
			InGameEnd = "10:50",
		}),
		table.freeze({
			Id = "passing-2",
			Kind = "passing",
			DisplayName = "Passing Period",
			StartOffsetSeconds = 360,
			EndOffsetSeconds = 390,
			InGameStart = "10:50",
			InGameEnd = "11:00",
		}),
		table.freeze({
			Id = "period-3-word-skills",
			Kind = "academic",
			ClassId = "word-skills",
			DisplayName = "Word Skills",
			StartOffsetSeconds = 390,
			EndOffsetSeconds = 540,
			InGameStart = "11:00",
			InGameEnd = "11:50",
		}),
		table.freeze({
			Id = "passing-3",
			Kind = "passing",
			DisplayName = "Passing Period",
			StartOffsetSeconds = 540,
			EndOffsetSeconds = 570,
			InGameStart = "11:50",
			InGameEnd = "12:00",
		}),
		table.freeze({
			Id = "period-4-lunch",
			Kind = "lunch",
			DisplayName = "Lunch",
			StartOffsetSeconds = 570,
			EndOffsetSeconds = 720,
			InGameStart = "12:00",
			InGameEnd = "12:50",
		}),
		table.freeze({
			Id = "passing-4",
			Kind = "passing",
			DisplayName = "Passing Period",
			StartOffsetSeconds = 720,
			EndOffsetSeconds = 750,
			InGameStart = "12:50",
			InGameEnd = "13:00",
		}),
		table.freeze({
			Id = "period-5-teacher-choice",
			Kind = "academic",
			ClassId = "teacher-choice",
			DisplayName = "Teacher's Choice",
			StartOffsetSeconds = 750,
			EndOffsetSeconds = 900,
			InGameStart = "13:00",
			InGameEnd = "13:50",
		}),
		table.freeze({
			Id = "passing-5",
			Kind = "passing",
			DisplayName = "Passing Period",
			StartOffsetSeconds = 900,
			EndOffsetSeconds = 930,
			InGameStart = "13:50",
			InGameEnd = "14:00",
		}),
		table.freeze({
			Id = "period-6-star-lab",
			Kind = "academic",
			ClassId = "star-lab",
			DisplayName = "STAR Lab",
			StartOffsetSeconds = 930,
			EndOffsetSeconds = 1080,
			InGameStart = "14:00",
			InGameEnd = "14:50",
		}),
		table.freeze({
			Id = "report-card",
			Kind = "report",
			DisplayName = "Report Card",
			StartOffsetSeconds = 1080,
			EndOffsetSeconds = 1110,
			InGameStart = "14:50",
			InGameEnd = "15:00",
		}),
		table.freeze({
			Id = "after-school",
			Kind = "after-school",
			DisplayName = "After School",
			StartOffsetSeconds = 1110,
			EndOffsetSeconds = 1800,
			InGameStart = "15:00",
			InGameEnd = "18:50",
		}),
	}),

	Classes = table.freeze({
		["reading"] = table.freeze({
			Id = "reading",
			DisplayName = "Reading",
			Subjects = table.freeze({"Reading / ELA"}),
			MaterialFirst = true,
			StarOnly = false,
		}),
		["math"] = table.freeze({
			Id = "math",
			DisplayName = "Math",
			Subjects = table.freeze({"Math"}),
			MaterialFirst = true,
			StarOnly = false,
		}),
		["word-skills"] = table.freeze({
			Id = "word-skills",
			DisplayName = "Word Skills",
			Subjects = table.freeze({"Reading / ELA"}),
			MaterialFirst = true,
			StarOnly = false,
			PreferredSkills = table.freeze({
				"sentence-types",
				"consonant-blends",
				"cvc-structure",
				"word-parts",
				"phonics",
				"spelling",
				"vocabulary",
			}),
		}),
		["teacher-choice"] = table.freeze({
			Id = "teacher-choice",
			DisplayName = "Teacher's Choice",
			Subjects = table.freeze({"Reading / ELA", "Math", "Religion"}),
			MaterialFirst = true,
			MaterialStrongPreference = true,
			StarOnly = false,
		}),
		["star-lab"] = table.freeze({
			Id = "star-lab",
			DisplayName = "STAR Lab",
			Subjects = table.freeze({"Reading / ELA", "Math"}),
			MaterialFirst = false,
			StarOnly = true,
		}),
	}),

	QuestionSelection = table.freeze({
		RecentQuestionWindow = 24,
		WeakSkillBoost = true,
		PinPromptAndAnswerServerSide = true,
		PinContentHash = true,
		PinBankSnapshotId = true,
		NoLiveLlm = true,
	}),
})

return SchoolConfig
