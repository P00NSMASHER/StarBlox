--!strict

local CoreLoopConfig = table.freeze({
	SchemaVersion = 1,
	LoopId = "brightside-core-loop-v1",
	DistrictName = "Brightside Plaza",
	DailyRewardRunCap = 3,
	FirstLoopCosmeticId = "brightside-spark-trail",
	Activities = table.freeze({
		table.freeze({
			Id = "word-portal-put-v1",
			StationName = "Word Portal",
			Title = "Power the Word Portal",
			Prompt = "Which word completes the sentence: Please ___ your book on the desk.",
			Choices = table.freeze({"put", "blue", "why"}),
			Subject = "Reading",
			Skill = "sight-word-put",
			Source = "ABVM Grade 2 current source pack",
			Reward = table.freeze({Coins = 6, XP = 4, Stars = 0}),
		}),
		table.freeze({
			Id = "spelling-forge-fog-v1",
			StationName = "Spelling Forge",
			Title = "Light the Spelling Forge",
			Prompt = "Which spelling word completes the sentence: The ___ made the road hard to see.",
			Choices = table.freeze({"fog", "job", "tug"}),
			Subject = "Reading",
			Skill = "spelling-fog",
			Source = "ABVM Grade 2 current source pack",
			Reward = table.freeze({Coins = 6, XP = 4, Stars = 0}),
		}),
		table.freeze({
			Id = "culture-lab-culture-v1",
			StationName = "Culture Lab",
			Title = "Tune the Culture Lab",
			Prompt = "Which word means traditions, foods, music, stories, and ways of life shared by a group?",
			Choices = table.freeze({"culture", "language", "fair"}),
			Subject = "Vocabulary",
			Skill = "vocabulary-culture",
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
