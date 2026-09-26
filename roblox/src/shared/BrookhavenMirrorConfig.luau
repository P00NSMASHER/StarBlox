--!strict

local BrookhavenMirrorConfig = table.freeze({
	SchemaVersion = 1,
	Revision = "phase8-brookhaven-mirror-learning-economy-v1",
	World = table.freeze({
		Mode = "exact-frozen-brookhaven-world",
		BrookhavenBaselineLocked = true,
		RuntimeSystemsMayMutateBaseline = false,
	}),
	Economy = table.freeze({
		CurrencyName = "Coins",
		CorrectAnswerCoins = 10,
		PaidCurrencyRequiredForGameplayUnlocks = false,
		LearningCoinsRequiredForPurchases = true,
	}),
	Sidebar = table.freeze({
		table.freeze({Id = "avatar", Label = "Avatar", Order = 1}),
		table.freeze({Id = "inventory", Label = "Inventory", Order = 2}),
		table.freeze({Id = "animations", Label = "Emotes", Order = 3}),
		table.freeze({Id = "vehicles", Label = "Vehicles", Order = 4}),
		table.freeze({Id = "houses", Label = "Houses", Order = 5}),
		table.freeze({Id = "bio", Label = "Bio", Order = 6}),
		table.freeze({Id = "jobs", Label = "Jobs", Order = 7}),
		table.freeze({Id = "map", Label = "Map", Order = 8}),
		table.freeze({Id = "store", Label = "Shop", Order = 9}),
	}),
	CatalogTargets = table.freeze({
		Houses = 83,
		Vehicles = 188,
		InventoryItems = 173,
	}),
})

return BrookhavenMirrorConfig
