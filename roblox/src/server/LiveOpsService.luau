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
		EventStreams = {},
		ClaimReceipts = {},
		MarketplaceReceiptIds = {},
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

local function validSequence(value)
	return type(value) == "number"
		and value == value
		and value ~= math.huge
		and value ~= -math.huge
		and value >= 0
		and math.floor(value) == value
end

local function cleanReceiptId(value, maxLength: number): string?
	if type(value) ~= "string" then
		return nil
	end
	local clean = string.gsub(value, "^%s*(.-)%s*$", "%1")
	if clean == "" or #clean > maxLength then
		return nil
	end
	return clean
end

local function deepCopy(value)
	if type(value) ~= "table" then
		return value
	end
	local out = {}
	for key, child in value do
		out[deepCopy(key)] = deepCopy(child)
	end
	return out
end

local PATCH_FIELDS = {
	Counters = true,
	Missions = true,
	Seasons = true,
	Engagement = true,
	Bundles = true,
}

local function validatePatch(patch): (boolean, string?)
	if patch == nil then
		return true, nil
	end
	if type(patch) ~= "table" then
		return false, "liveOpsPatch must be a table"
	end
	for key in patch do
		if type(key) ~= "string" or PATCH_FIELDS[key] ~= true then
			return false, "liveOpsPatch attempted private or unknown state: " .. tostring(key)
		end
	end
	return true, nil
end

local function validateReward(reward): (boolean, string?)
	if type(reward) ~= "table" or type(reward.type) ~= "string" then
		return false, "invalid LiveOps reward receipt"
	end
	if reward.type == "coins" or reward.type == "xp" or reward.type == "stars" then
		if type(reward.amount) ~= "number" or reward.amount ~= reward.amount
			or reward.amount == math.huge or reward.amount == -math.huge or reward.amount < 0 then
			return false, "invalid numeric LiveOps reward"
		end
		return true, nil
	end
	if reward.type == "cosmetic" then
		if type(reward.itemId) ~= "string" or reward.itemId == "" then
			return false, "invalid cosmetic LiveOps reward"
		end
		return true, nil
	end
	return false, "unsupported LiveOps reward type: " .. tostring(reward.type)
end

local function validateRewards(receipts): (boolean, string?)
	if receipts == nil then
		return true, nil
	end
	if type(receipts) ~= "table" then
		return false, "LiveOps reward receipts must be a table"
	end
	for _, receipt in receipts do
		local ok, reason = validateReward(receipt)
		if not ok then
			return false, reason
		end
	end
	return true, nil
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

function LiveOpsService:RecordAuthoritativeEvent(
	player: Player,
	eventType: string,
	amount: number?,
	eventId: string?,
	streamId: string?,
	sequence: number?
)
	local accepted = false
	local completed = {}

	if type(streamId) ~= "string" or streamId == "" or not validSequence(sequence) then
		return false, {}
	end

	self._profiles:WithProfile(player, function(profileData)
		local state = ensureState(profileData)
		state.EventStreams = state.EventStreams or {}
		local lastSequence = state.EventStreams[streamId] or -1
		if sequence <= lastSequence then
			return
		end

		local id = eventId or HttpService:GenerateGUID(false)
		if hasEvent(state.ProcessedEventIds, id) then
			return
		end

		state.EventStreams[streamId] = sequence
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

	local cleanType = cleanReceiptId(claimType, 80)
	local cleanId = cleanReceiptId(claimId, 160)
	if cleanType == nil or cleanId == nil then
		return false, "invalid LiveOps claim identity"
	end
	local claimKey = cleanType .. ":" .. cleanId

	local outcome = nil
	local success = false
	self._profiles:WithProfile(player, function(profileData)
		local state = ensureState(profileData)
		state.ClaimReceipts = state.ClaimReceipts or {}
		if state.ClaimReceipts[claimKey] == true then
			outcome = {
				ok = true,
				duplicate = true,
				claimKey = claimKey,
			}
			success = true
			return
		end

		local ok, result = pcall(function()
			return self._featurePackages.Claim(
				player,
				cleanType,
				cleanId,
				deepCopy(profileData)
			)
		end)
		if not ok or type(result) ~= "table" or result.ok ~= true then
			outcome = result
			return
		end

		local rewardsOk, rewardReason = validateRewards(result.receipts)
		if not rewardsOk then
			outcome = {ok = false, reason = rewardReason}
			return
		end
		local patchOk, patchReason = validatePatch(result.liveOpsPatch)
		if not patchOk then
			outcome = {ok = false, reason = patchReason}
			return
		end

		for _, receipt in result.receipts or {} do
			applyReward(profileData, receipt)
		end

		if type(result.liveOpsPatch) == "table" then
			for key, value in result.liveOpsPatch do
				state[key] = deepCopy(value)
			end
		end

		state.ClaimReceipts[claimKey] = true
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
	if type(receiptInfo) ~= "table" then
		return false, "marketplace receipt must be a table"
	end

	local purchaseId = cleanReceiptId(receiptInfo.PurchaseId, 200)
	if purchaseId == nil then
		return false, "marketplace receipt PurchaseId is required"
	end

	local accepted = false
	local outcome = nil
	self._profiles:WithProfile(player, function(profileData)
		local state = ensureState(profileData)
		state.MarketplaceReceiptIds = state.MarketplaceReceiptIds or {}
		if state.MarketplaceReceiptIds[purchaseId] == true then
			accepted = true
			outcome = {
				ok = true,
				duplicate = true,
				purchaseId = purchaseId,
			}
			return
		end

		local ok, result = pcall(function()
			return self._featurePackages.ProcessMarketplaceReceipt(
				player,
				deepCopy(receiptInfo),
				deepCopy(profileData)
			)
		end)
		if not ok or type(result) ~= "table" or result.ok ~= true then
			outcome = result
			return
		end

		local rewardsOk, rewardReason = validateRewards(result.receipts)
		if not rewardsOk then
			outcome = {ok = false, reason = rewardReason}
			return
		end

		for _, receipt in result.receipts or {} do
			applyReward(profileData, receipt)
		end

		state.MarketplaceReceiptIds[purchaseId] = true
		self._replicas:Sync(player, profileData)
		accepted = true
		outcome = result
	end)

	return accepted, outcome
end

return LiveOpsService
