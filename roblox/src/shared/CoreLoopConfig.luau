--!strict

local CoreLoopConfig = table.freeze({
	SchemaVersion = 2,
	LoopId = "brightside-core-loop-v1",
	DistrictName = "Brightside Plaza",
	PolishRevision = "phase6-content-fun-retention-v1",
	ChallengeName = "Neighborhood Challenge",
	DailyRewardRunCap = 3,
	FirstLoopCosmeticId = "brightside-spark-trail",
	QuestionRotation = table.freeze({
		BankRevision = "phase6-abvm-question-source-v1",
		UpstreamPackSourceHash = "teacher-pages-0ca987de6de2d3791e25",
		QuestionsPerStation = 3,
		Strategy = "deterministic-by-run-number",
		AnswersServerOnly = true,
		NoLiveLlm = true,
	}),
	Onboarding = table.freeze({
		Title = "Welcome to Brightside!",
		Body = "Explore three activity spots in the neighborhood. Finish Word Portal, Spelling Forge, and Culture Lab to complete a Neighborhood Challenge.",
		Hint = "Walk up to an activity prompt, tap Start Activity, and keep going until all three are complete.",
	}),
	Activities = table.freeze({
		table.freeze({
			Id = "word-portal-put-v1",
			Index = 1,
			Direction = "North",
			Accent = Color3.fromRGB(109, 104, 255),
			StationName = "Word Portal",
			Title = "Power the Word Portal",
			Subject = "Reading / ELA",
			Source = "ABVM Grade 2 current source pack",
			Reward = table.freeze({Coins = 6, XP = 4, Stars = 0}),
		}),
		table.freeze({
			Id = "spelling-forge-fog-v1",
			Index = 2,
			Direction = "East",
			Accent = Color3.fromRGB(255, 146, 77),
			StationName = "Spelling Forge",
			Title = "Light the Spelling Forge",
			Subject = "Word Skills",
			Source = "ABVM Grade 2 current source pack",
			Reward = table.freeze({Coins = 6, XP = 4, Stars = 0}),
		}),
		table.freeze({
			Id = "culture-lab-culture-v1",
			Index = 3,
			Direction = "West",
			Accent = Color3.fromRGB(66, 204, 156),
			StationName = "Culture Lab",
			Title = "Tune the Culture Lab",
			Subject = "Religion / Community",
			Source = "ABVM Grade 2 current source pack",
			Reward = table.freeze({Coins = 6, XP = 4, Stars = 0}),
		}),
	}),
	LoopReward = table.freeze({
		Coins = 12,
		XP = 8,
		Stars = 1,
	}),
})

return CoreLoopConfig
