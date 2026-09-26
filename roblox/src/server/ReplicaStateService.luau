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

local function publicSchoolPeriod(period)
	if type(period) ~= "table" then
		return nil
	end
	return {
		PeriodId = period.PeriodId,
		ClassId = period.ClassId,
		Status = period.Status,
		Score = period.Score,
		Grade = period.Grade,
		CompletedQuestionCount = period.CompletedQuestionCount,
		QuestionCount = period.QuestionCount,
		Attendance = period.Attendance,
		BankSnapshotId = period.BankSnapshotId,
	}
end

local function publicSchoolProjection(profileData)
	local school = profileData.School
	if type(school) ~= "table" then
		return nil
	end

	local currentDay = type(school.CurrentDay) == "table" and school.CurrentDay or {}
	local periods = {}
	for periodId, period in currentDay.Periods or {} do
		local public = publicSchoolPeriod(period)
		if public ~= nil then
			periods[periodId] = public
		end
	end

	local statistics = type(school.Statistics) == "table" and school.Statistics or {}
	return {
		CurrentDay = {
			DayId = currentDay.DayId or "",
			BankSnapshotId = currentDay.BankSnapshotId or "",
			Periods = periods,
		},
		Statistics = {
			DaysAttended = statistics.DaysAttended or 0,
			ClassesCompleted = statistics.ClassesCompleted or 0,
			OnTimeClasses = statistics.OnTimeClasses or 0,
			ByClass = table.clone(statistics.ByClass or {}),
		},
		RewardState = {
			UtcDay = school.RewardState and school.RewardState.UtcDay or "",
			RewardedSchoolDays = school.RewardState and school.RewardState.RewardedSchoolDays or 0,
		},
	}
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
			CoreLoop = profileData.Progress.CoreLoop and {
				RunNumber = profileData.Progress.CoreLoop.RunNumber,
				LoopRuns = profileData.Progress.CoreLoop.LoopRuns,
				RewardDay = profileData.Progress.CoreLoop.RewardDay,
				RewardedRunsToday = profileData.Progress.CoreLoop.RewardedRunsToday,
				OnboardingSeen = profileData.Progress.CoreLoop.OnboardingSeen == true,
			} or nil,
		},
		Daily = {
			LastDailyId = profileData.Daily.LastDailyId,
			Streak = profileData.Daily.Streak,
		},
		School = publicSchoolProjection(profileData),
		Inventory = {
			Cosmetics = table.clone(profileData.Inventory.Cosmetics),
			OwnedItems = table.clone(profileData.Inventory.OwnedItems or {}),
			OwnedVehicles = table.clone(profileData.Inventory.OwnedVehicles or {}),
			OwnedTools = table.clone(profileData.Inventory.OwnedTools or {}),
			Equipped = table.clone(profileData.Inventory.Equipped),
		},
		Rollout = {
			Assignments = table.clone(profileData.Rollout.Assignments),
		},
		Social = profileData.Social and {
			Home = table.clone(profileData.Social.Home or {}),
			NpcAffinity = table.clone(profileData.Social.NpcAffinity or {}),
			UnlockedSocialItems = table.clone(profileData.Social.UnlockedSocialItems or {}),
			Stats = table.clone(profileData.Social.Stats or {}),
		} or nil,
		LiveOps = profileData.LiveOps and {
			Counters = table.clone(profileData.LiveOps.Counters or {}),
			Missions = table.clone(profileData.LiveOps.Missions or {}),
			Seasons = table.clone(profileData.LiveOps.Seasons or {}),
			Engagement = table.clone(profileData.LiveOps.Engagement or {}),
			Bundles = table.clone(profileData.LiveOps.Bundles or {}),
		} or nil,
	}
end

function ReplicaStateService.new(replicaModule)
	assert(replicaModule ~= nil, "Replica dependency is required")
	assert(type(replicaModule.Token) == "function", "Replica.Token is required")
	assert(type(replicaModule.New) == "function", "Replica.New is required")
	assert(replicaModule.NewReadyPlayer ~= nil, "Replica.NewReadyPlayer is required")
	assert(replicaModule.ReadyPlayers ~= nil, "Replica.ReadyPlayers is required")

	local self = setmetatable({}, ReplicaStateService)
	self._replicaModule = replicaModule
	self._token = replicaModule.Token("StarBloxPlayerState")
	self._replicas = {}
	self._readyConnection = replicaModule.NewReadyPlayer:Connect(function(player)
		local replica = self._replicas[player]
		if replica ~= nil and replica:IsActive() then
			replica:Subscribe(player)
		end
	end)
	return self
end

function ReplicaStateService:Attach(player: Player, profileData: {[string]: any})
	self:Detach(player)

	local replica = self._replicaModule.New({
		Token = self._token,
		Tags = {
			PlayerUserId = player.UserId,
		},
		Data = publicProjection(profileData),
	})

	self._replicas[player] = replica

	-- Maintained Replica only allows selective Subscribe() after the client
	-- has requested initial data. NewReadyPlayer handles the normal race;
	-- this branch covers reconnect/order cases where readiness already exists.
	if self._replicaModule.ReadyPlayers[player] == true then
		replica:Subscribe(player)
	end

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
	replica:Set(path, value)
	return true
end

function ReplicaStateService:Sync(player: Player, profileData: {[string]: any}): boolean
	local replica = self._replicas[player]
	if replica == nil or not replica:IsActive() then
		return false
	end

	local nextState = publicProjection(profileData)
	for key, value in nextState do
		replica:Set({key}, value)
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

function ReplicaStateService:Shutdown()
	if self._readyConnection ~= nil then
		self._readyConnection:Disconnect()
		self._readyConnection = nil
	end
	for player, _ in self._replicas do
		self:Detach(player)
	end
end

return ReplicaStateService
