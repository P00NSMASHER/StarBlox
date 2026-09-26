--!strict

local BrookhavenMirrorConfig = table.freeze({
	SchemaVersion = 2,
	Revision = "post-opening-exact-live-brookhaven-v1",
	PostOpeningParity = table.freeze({
		Target = "exact-live-brookhaven",
		ReferenceCapturedAt = "2026-09-26",
		OpeningSequenceIsOnlyPlayerFacingException = true,
		AllowCustomStarBloxHud = false,
		AllowCustomStarBloxNavigation = false,
		AllowCustomStarBloxMenus = false,
		AllowApproximateIconography = false,
		AllowApproximateLayout = false,
		AllowApproximateInteractionBehavior = false,
		RequireCurrentLiveVersionEvidence = true,
	}),
	World = table.freeze({
		Mode = "exact-frozen-brookhaven-world",
		BrookhavenBaselineLocked = true,
		RuntimeSystemsMayMutateBaseline = false,
		CurrentLiveBrookhavenParityProven = false,
	}),
	Economy = table.freeze({
		CurrencyName = "Coins",
		CorrectAnswerCoins = 10,
		EconomyRevision = "long-horizon-v1",
		StarMansionCumulativeCoins = 37500,
		StarMansionCorrectAnswers = 3750,
		PremiumSportsCarCoins = 12000,
		PremiumSportsCarCorrectAnswers = 1200,
		PaidCurrencyRequiredForGameplayUnlocks = false,
		LearningCoinsRequiredForPurchases = true,
		PlayerFacingParityExceptionGranted = false,
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
