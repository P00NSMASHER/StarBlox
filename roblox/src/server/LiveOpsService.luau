--!strict

local HttpService = game:GetService("HttpService")

local MAX_PROCESSED_EVENTS = 500

local LiveOpsService = {}
LiveOpsService.__index = LiveOpsService

local function ensureState(profileData)
	profileData.LiveOps = profileData.LiveOps or {
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
	}
	return profileData.LiveOps
end

local function hasEvent(processed, eventId)
	for _, value in processed do
		if value == eventId then
			return true
		end
	end
	return false
end

local function rememberEvent(processed, eventId)
	table.insert(processed, eventId)
	while #processed > MAX_PROCESSED_EVENTS do
		table.remove(processed, 1)
	end
end

local function applyReward(profileData, reward)
	local economy = profileData.Economy
	local inventory = profileData.Inventory

	if reward.type == "coins" then
		economy.Coins += math.max(0, reward.amount or 0)
	elseif reward.type == "xp" then
		economy.XP += math.max(0, reward.amount or 0)
	elseif reward.type == "stars" then
		economy.Stars += math.max(0, reward.amount or 0)
	elseif reward.type == "cosmetic" and reward.itemId then
		inventory.Cosmetics[reward.itemId] = true
	else
		return false
	end

	return true
end

function LiveOpsService.new(profiles, replicas, featurePackages)
	assert(profiles ~= nil, "profiles service is required")
	assert(replicas ~= nil, "replica service is required")

	local self = setmetatable({}, LiveOpsService)
	self._profiles = profiles
	self._replicas = replicas
	self._featurePackages = featurePackages
	return self
end

function LiveOpsService:RecordAuthoritativeEvent(player: Player, eventType: string, amount: number?, eventId: string?)
	local accepted = false
	local completed = {}

	self._profiles:WithProfile(player, function(profileData)
		local state = ensureState(profileData)
		local id = eventId or HttpService:GenerateGUID(false)
		if hasEvent(state.ProcessedEventIds, id) then
			return
		end

		rememberEvent(state.ProcessedEventIds, id)
		local delta = math.max(0, amount or 1)
		state.Counters[eventType] = (state.Counters[eventType] or 0) + delta
		if eventType == "play_seconds" then
			state.Engagement.PlaySeconds += delta
		end

		if self._featurePackages and self._featurePackages.RecordCounter then
			local ok, result = pcall(function()
				return self._featurePackages.RecordCounter(player, eventType, delta, id)
			end)
			if ok and type(result) == "table" and type(result.completedMissions) == "table" then
				completed = result.completedMissions
			end
		end

		accepted = true
		self._replicas:Sync(player, profileData)
	end)

	return accepted, completed
end

function LiveOpsService:Claim(player: Player, claimType: string, claimId: string)
	if not self._featurePackages or not self._featurePackages.Claim then
		return false, "LiveOps package adapter unavailable"
	end

	local outcome = nil
	local success = false
	self._profiles:WithProfile(player, function(profileData)
		local state = ensureState(profileData)
		local ok, result = pcall(function()
			return self._featurePackages.Claim(player, claimType, claimId, profileData)
		end)
		if not ok or type(result) ~= "table" or result.ok ~= true then
			outcome = result
			return
		end

		if type(result.receipts) == "table" then
			for _, receipt in result.receipts do
				applyReward(profileData, receipt)
			end
		end

		if type(result.liveOpsPatch) == "table" then
			for key, value in result.liveOpsPatch do
				state[key] = value
			end
		end

		self._replicas:Sync(player, profileData)
		outcome = result
		success = true
	end)

	return success, outcome
end

function LiveOpsService:ProcessMarketplaceReceipt(player: Player, receiptInfo)
	if not self._featurePackages or not self._featurePackages.ProcessMarketplaceReceipt then
		return false, "marketplace receipt adapter unavailable"
	end

	local accepted = false
	local outcome = nil
	self._profiles:WithProfile(player, function(profileData)
		local ok, result = pcall(function()
			return self._featurePackages.ProcessMarketplaceReceipt(player, receiptInfo, profileData)
		end)
		if not ok or type(result) ~= "table" or result.ok ~= true then
			outcome = result
			return
		end

		for _, receipt in result.receipts or {} do
			applyReward(profileData, receipt)
		end

		self._replicas:Sync(player, profileData)
		accepted = true
		outcome = result
	end)

	return accepted, outcome
end

return LiveOpsService
