--!strict

local VerticalSliceConfig = table.freeze({
	SchemaVersion = 1,
	SliceId = "bright-side-word-portal-v1",
	DistrictName = "Brightside Plaza",
	Quest = table.freeze({
		Id = "word-portal-put-v1",
		Title = "Power the Word Portal",
		Prompt = "Which word completes the sentence: Please ___ your book on the desk.",
		Choices = table.freeze({"put", "blue", "why"}),
		Subject = "Reading",
		Skill = "sight-word-put",
		Source = "ABVM Grade 2 current source pack",
	}),
	Reward = table.freeze({
		Coins = 10,
		XP = 5,
		Stars = 1,
	}),
})

return VerticalSliceConfig
