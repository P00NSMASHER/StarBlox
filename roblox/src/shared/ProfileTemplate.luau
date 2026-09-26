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
		VerticalSlice = {
			Completed = false,
			RewardClaimed = false,
		},
		CoreLoop = {
			RunNumber = 1,
			LoopRuns = 0,
			CompletedByRun = {},
			RewardDay = "",
			RewardedRunsToday = 0,
			OnboardingSeen = false,
		},
	},

	Learning = {
		Concepts = {},
		Ability = {
			Theta = 0,
			StandardError = 1,
			ResponseCount = 0,
		},
		RecentQuestionIds = {},
		QuestionCursorByStation = {},
		QuestionBankSnapshotId = "",
		AdaptiveByStation = {},
		SkillStats = {},
		Experiments = {},
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
		OwnedItems = {},
		OwnedVehicles = {},
		OwnedTools = {["tool-phone"] = true},
		Equipped = {},
	},

	Settings = {
		MusicVolume = 0.6,
		DiagnosticsEnabled = false,
		Brookhaven = {
			SprintButton = true,
			HideUI = false,
			BabyCarSeat = "Off",
			MuteOtherMusic = false,
			HideHouseSigns = false,
			HidePropsTool = false,
		},
	},

	Rollout = {
		Assignments = {},
	},

	AiNpc = {
		Memories = {},
		ProcessedRequestIds = {},
		LastRequestSequence = -1,
	},

	Social = {
		Roleplay = {
			DisplayName = "",
			Age = "",
			Job = "Citizen",
			AvatarOutfits = {},
		},
		Home = {
			PlotId = "",
			Tier = 1,
			PlacementVersion = 1,
			SelectedStyle = "home-starter",
			OwnedStyles = {["home-starter"] = true},
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
		CompletedSessionReceipts = {},
		AffinityReceipts = {},
		PhotoReceipts = {},
		LiveOpsSequence = 0,
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
		EventStreams = {},
		ClaimReceipts = {},
		MarketplaceReceiptIds = {},
	},
}

return ProfileTemplate
