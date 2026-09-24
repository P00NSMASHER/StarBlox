--!strict

local ProfileTemplate = {
	SchemaVersion = 1,

	Economy = {
		Coins = 0,
		XP = 0,
		Stars = 0,
		TransferWins = 0,
	},

	Progress = {
		Districts = {},
		MasteredSkills = {},
	},

	Learning = {
		Concepts = {},
		Ability = {
			Theta = 0,
			StandardError = 1,
			ResponseCount = 0,
		},
		RecentQuestionIds = {},
		RecentConceptIds = {},
		WrongStreak = 0,
	},

	Daily = {
		LastDailyId = "",
		Completed = {},
		Streak = 0,
	},

	Inventory = {
		Cosmetics = {},
		Equipped = {},
	},

	Settings = {
		MusicVolume = 0.6,
		DiagnosticsEnabled = false,
	},

	Rollout = {
		Assignments = {},
	},

	Social = {
		Home = {
			PlotId = "",
			Placements = {},
		},
		NpcAffinity = {},
		UnlockedSocialItems = {},
		Stats = {
			PhotosTaken = 0,
			CoopPhotos = 0,
			MinigameWins = 0,
		},
		CompletedSessionIds = {},
		AffinityEventIds = {},
	},

	AiNpc = {
		Memory = {},
	},

	LiveOps = {
		Counters = {},
		Missions = {},
		Seasons = {},
		Engagement = {
			LastVisitDate = "",
			Streak = 0,
			PlaySeconds = 0,
			Claimed = {},
		},
		Bundles = {
			Purchased = {},
		},
		ProcessedEventIds = {},
	},
}

return ProfileTemplate
