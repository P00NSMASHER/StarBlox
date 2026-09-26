--!strict

local BrookhavenMirrorConfig = table.freeze({
	SchemaVersion = 2,
	Revision = "recording-parity-shell-v1",
	World = table.freeze({
		Mode = "exact-frozen-brookhaven-world",
		BrookhavenBaselineLocked = true,
		RuntimeSystemsMayMutateBaseline = false,
		ImmutableWitnessRootName = "BrookhavenWorldBaseline",
		ImmutableWitnessLocation = "ServerStorage",
		RuntimeProjectionRootName = "BrookhavenWorldRuntime",
		RuntimeProjectionLocation = "Workspace",
		RuntimeSystemsMayMutateProjection = true,
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
	}),
	-- Persistent post-opening chrome follows the real Brookhaven recording.
	-- StarBlox-specific learning/economy surfaces are contextual rather than a world HUD.
	TopControls = table.freeze({
		table.freeze({Id = "quick-chat", Label = "Quick Chat", Order = 1}),
		table.freeze({Id = "home-cams", Label = "Home Cams", Order = 2}),
		table.freeze({Id = "clock", Label = "Clock", Order = 3}),
		table.freeze({Id = "family", Label = "Family", Order = 4}),
	}),
	Sidebar = table.freeze({
		table.freeze({Id = "avatar", Label = "Avatar Editor", Order = 1}),
		table.freeze({Id = "tools", Label = "Tools", Order = 2}),
		table.freeze({Id = "animations", Label = "Animations", Order = 3}),
		table.freeze({Id = "vehicles", Label = "Vehicle", Order = 4}),
		table.freeze({Id = "houses", Label = "House", Order = 5}),
	}),
	CatalogTargets = table.freeze({
		Houses = 83,
		Vehicles = 188,
		InventoryItems = 173,
	}),
})

return BrookhavenMirrorConfig
