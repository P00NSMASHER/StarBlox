--!strict

local HttpService = game:GetService("HttpService")

local SocialWorldService = {}
SocialWorldService.__index = SocialWorldService

local function ensureSocial(profileData)
	profileData.Social = profileData.Social or {
		Home = {
			PlotId = "",
			Placements = {},
		},
		NpcAffinity = {},
		UnlockedSocialItems = {},
		Stats = {
			PhotosTaken = 0,
			CoopPhotos = 0,
			MinigameWins = 0,
		},
		CompletedSessionIds = {},
	}
	return profileData.Social
end

function SocialWorldService.new(profiles, replicas, ecs, liveOps, adapters)
	assert(profiles ~= nil, "profiles service is required")
	assert(replicas ~= nil, "replica service is required")
	assert(ecs ~= nil, "ECS service is required")

	local self = setmetatable({}, SocialWorldService)
	self._profiles = profiles
	self._replicas = replicas
	self._ecs = ecs
	self._liveOps = liveOps
	self._adapters = adapters or {}
	self._activeMinigames = {}
	return self
end

function SocialWorldService:PlaceItem(player: Player, request)
	local accepted = false
	local outcome = "placement rejected"

	self._profiles:WithProfile(player, function(profileData)
		local social = ensureSocial(profileData)
		local validator = self._adapters.PlacementValidator
		local normalized = request

		if validator and validator.Validate then
			local ok, result = pcall(function()
				return validator.Validate(player, request, profileData)
			end)
			if not ok or type(result) ~= "table" or result.ok ~= true then
				outcome = if type(result) == "table" then result.reason else "placement validation failed"
				return
			end
			normalized = result.placement
		end

		if type(normalized) ~= "table" or type(normalized.itemId) ~= "string" then
			outcome = "invalid placement request"
			return
		end

		local placementId = normalized.placementId or HttpService:GenerateGUID(false)
		if social.Home.Placements[placementId] ~= nil then
			outcome = "duplicate placement"
			return
		end

		if social.Home.PlotId ~= "" and normalized.plotId ~= social.Home.PlotId then
			outcome = "plot mismatch"
			return
		end

		social.Home.PlotId = normalized.plotId or social.Home.PlotId
		social.Home.Placements[placementId] = {
			ItemId = normalized.itemId,
			Position = normalized.position,
			RotationY = normalized.rotationY or 0,
		}

		if self._adapters.SpawnPlacedItem then
			pcall(function()
				self._adapters.SpawnPlacedItem(player, placementId, social.Home.Placements[placementId])
			end)
		end

		self._replicas:Sync(player, profileData)
		accepted = true
		outcome = placementId
	end)

	return accepted, outcome
end

function SocialWorldService:RemoveItem(player: Player, placementId: string)
	local removed = false
	self._profiles:WithProfile(player, function(profileData)
		local social = ensureSocial(profileData)
		if social.Home.Placements[placementId] == nil then
			return
		end
		social.Home.Placements[placementId] = nil
		if self._adapters.RemovePlacedItem then
			pcall(function()
				self._adapters.RemovePlacedItem(player, placementId)
			end)
		end
		self._replicas:Sync(player, profileData)
		removed = true
	end)
	return removed
end

function SocialWorldService:AwardNpcAffinity(player: Player, npcId: string, amount: number, eventId: string?)
	local newValue = nil
	self._profiles:WithProfile(player, function(profileData)
		local social = ensureSocial(profileData)
		local delta = math.max(0, math.floor(amount))
		social.NpcAffinity[npcId] = (social.NpcAffinity[npcId] or 0) + delta
		newValue = social.NpcAffinity[npcId]

		if self._adapters.ResolveNpcUnlocks then
			local ok, unlocks = pcall(function()
				return self._adapters.ResolveNpcUnlocks(npcId, newValue)
			end)
			if ok and type(unlocks) == "table" then
				for _, itemId in unlocks do
					social.UnlockedSocialItems[itemId] = true
				end
			end
		end

		self._replicas:Sync(player, profileData)
	end)

	if newValue and self._liveOps then
		self._liveOps:RecordAuthoritativeEvent(
			player,
			"npc_friendship",
			amount,
			eventId or HttpService:GenerateGUID(false)
		)
	end

	return newValue
end

function SocialWorldService:StartMinigame(player: Player, gameId: string, npcId: string?)
	if self._activeMinigames[player] ~= nil then
		return false, "minigame already active"
	end

	local sessionId = HttpService:GenerateGUID(false)
	if self._adapters.ValidateMinigameStart then
		local ok, result = pcall(function()
			return self._adapters.ValidateMinigameStart(player, gameId, npcId)
		end)
		if not ok or result ~= true then
			return false, "minigame start rejected"
		end
	end

	self._activeMinigames[player] = {
		SessionId = sessionId,
		GameId = gameId,
		NpcId = npcId,
		StartedAt = os.clock(),
	}
	return true, sessionId
end

function SocialWorldService:FinishMinigame(player: Player, sessionId: string, serverResult)
	local active = self._activeMinigames[player]
	if active == nil or active.SessionId ~= sessionId then
		return false, "minigame session mismatch"
	end

	self._activeMinigames[player] = nil
	if type(serverResult) ~= "table" or type(serverResult.won) ~= "boolean" then
		return false, "server result required"
	end

	self._profiles:WithProfile(player, function(profileData)
		local social = ensureSocial(profileData)
		table.insert(social.CompletedSessionIds, sessionId)
		while #social.CompletedSessionIds > 200 do
			table.remove(social.CompletedSessionIds, 1)
		end
		if serverResult.won then
			social.Stats.MinigameWins += 1
		end
		self._replicas:Sync(player, profileData)
	end)

	if serverResult.won and self._liveOps then
		self._liveOps:RecordAuthoritativeEvent(
			player,
			"social_minigame_win",
			1,
			"minigame:" .. sessionId
		)
	end

	return true, serverResult
end

function SocialWorldService:RecordPhoto(player: Player, serverObservation)
	if type(serverObservation) ~= "table" then
		return false
	end

	local coopCount = math.max(0, math.floor(serverObservation.coopCount or 0))
	self._profiles:WithProfile(player, function(profileData)
		local social = ensureSocial(profileData)
		social.Stats.PhotosTaken += 1
		if coopCount > 0 then
			social.Stats.CoopPhotos += 1
		end
		self._replicas:Sync(player, profileData)
	end)

	if self._liveOps then
		self._liveOps:RecordAuthoritativeEvent(
			player,
			if coopCount > 0 then "coop_photo" else "photo",
			1,
			serverObservation.eventId or HttpService:GenerateGUID(false)
		)
	end

	return true
end

function SocialWorldService:PlayerRemoving(player: Player)
	self._activeMinigames[player] = nil
end

return SocialWorldService
