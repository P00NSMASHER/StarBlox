--!strict

local ReplicaStateService = {}
ReplicaStateService.__index = ReplicaStateService

local function copyArray(source)
	local out = {}
	for index, value in source or {} do
		out[index] = value
	end
	return out
end

local function publicProjection(profileData)
	return {
		SchemaVersion = profileData.SchemaVersion,
		Economy = {
			Coins = profileData.Economy.Coins,
			XP = profileData.Economy.XP,
			Stars = profileData.Economy.Stars,
			TransferWins = profileData.Economy.TransferWins,
		},
		Progress = {
			Districts = table.clone(profileData.Progress.Districts),
			MasteredSkills = copyArray(profileData.Progress.MasteredSkills),
		},
		Daily = {
			LastDailyId = profileData.Daily.LastDailyId,
			Streak = profileData.Daily.Streak,
		},
		Inventory = {
			Cosmetics = table.clone(profileData.Inventory.Cosmetics),
			Equipped = table.clone(profileData.Inventory.Equipped),
		},
		Rollout = {
			Assignments = table.clone(profileData.Rollout.Assignments),
		},
		LiveOps = profileData.LiveOps and {
			Counters = table.clone(profileData.LiveOps.Counters or {}),
			Missions = table.clone(profileData.LiveOps.Missions or {}),
			Seasons = table.clone(profileData.LiveOps.Seasons or {}),
			Engagement = table.clone(profileData.LiveOps.Engagement or {}),
			Bundles = table.clone(profileData.LiveOps.Bundles or {}),
		} or nil,
	}
end

function ReplicaStateService.new(replicaService)
	assert(replicaService ~= nil, "ReplicaService dependency is required")
	local self = setmetatable({}, ReplicaStateService)
	self._replicaService = replicaService
	self._classToken = replicaService.NewClassToken("StarBloxPlayerState")
	self._replicas = {}
	return self
end

function ReplicaStateService:Attach(player: Player, profileData: {[string]: any})
	self:Detach(player)

	local replica = self._replicaService.NewReplica({
		ClassToken = self._classToken,
		Tags = {
			PlayerUserId = player.UserId,
		},
		Data = publicProjection(profileData),
		Replication = player,
	})

	self._replicas[player] = replica
	return replica
end

function ReplicaStateService:Get(player: Player)
	return self._replicas[player]
end

function ReplicaStateService:SetPath(player: Player, path: {string | number}, value: any): boolean
	local replica = self._replicas[player]
	if replica == nil or not replica:IsActive() then
		return false
	end
	replica:SetValue(path, value)
	return true
end

function ReplicaStateService:Sync(player: Player, profileData: {[string]: any}): boolean
	local replica = self._replicas[player]
	if replica == nil or not replica:IsActive() then
		return false
	end

	local nextState = publicProjection(profileData)
	for key, value in nextState do
		replica:SetValue({key}, value)
	end
	return true
end

function ReplicaStateService:Detach(player: Player)
	local replica = self._replicas[player]
	if replica ~= nil then
		self._replicas[player] = nil
		if replica:IsActive() then
			replica:Destroy()
		end
	end
end

return ReplicaStateService
