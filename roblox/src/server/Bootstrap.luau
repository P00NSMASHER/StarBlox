--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileTemplate = require(ReplicatedStorage.StarBlox.ProfileTemplate)
local WorldProjectionService = require(script.Parent.WorldProjectionService)
local ProfileSessionService = require(script.Parent.ProfileSessionService)
local ReplicaStateService = require(script.Parent.ReplicaStateService)
local WorldEcsService = require(script.Parent.WorldEcsService)
local RuntimeArtifactService = require(script.Parent.RuntimeArtifactService)
local ReplayIngressService = require(script.Parent.ReplayIngressService)
local IntelligenceShadowService = require(script.Parent.IntelligenceShadowService)
local LiveOpsService = require(script.Parent.LiveOpsService)
local SocialWorldService = require(script.Parent.SocialWorldService)
local AiNpcService = require(script.Parent.AiNpcService)
local AuthoritativeActionService = require(script.Parent.AuthoritativeActionService)
local CoreGameLoopService = require(script.Parent.CoreGameLoopService)
local HomeEconomyService = require(script.Parent.HomeEconomyService)
local MirrorLifestyleService = require(script.Parent.MirrorLifestyleService)
local RoleplayService = require(script.Parent.RoleplayService)
local FamilyService = require(script.Parent.FamilyService)
local PrivatePlaytestTelemetryService = require(script.Parent.PrivatePlaytestTelemetryService)

local Bootstrap = {}

function Bootstrap.start(dependencies)
	assert(dependencies ~= nil, "dependencies are required")
	assert(dependencies.ProfileStore ~= nil, "ProfileStore dependency is required")
	assert(dependencies.Replica ~= nil, "Replica dependency is required")
	assert(dependencies.Matter ~= nil, "Matter dependency is required")

	local worldProjection = WorldProjectionService.new()
	local profiles = ProfileSessionService.new(dependencies.ProfileStore, ProfileTemplate)
	local replicas = ReplicaStateService.new(dependencies.Replica)
	local ecs = WorldEcsService.new(dependencies.Matter)
	local artifacts = RuntimeArtifactService.new()
	local replays = ReplayIngressService.new(dependencies.ReplayLimits)
	local shadow = IntelligenceShadowService.new(dependencies.TelemetrySink)
	local liveOps = LiveOpsService.new(profiles, replicas, dependencies.LiveOpsPackages)
	local social = SocialWorldService.new(profiles, replicas, ecs, liveOps, dependencies.SocialWorldAdapters)
	local aiNpc = AiNpcService.new(profiles, dependencies.AiNpcAdapters, dependencies.TelemetrySink)
	local action = AuthoritativeActionService.new(dependencies.ActionAdapters, dependencies.TelemetrySink)
	local privatePlaytestTelemetry = PrivatePlaytestTelemetryService.new()
	local coreLoop = CoreGameLoopService.new(profiles, replicas, privatePlaytestTelemetry)
	local homeEconomy = HomeEconomyService.new(profiles, replicas, coreLoop:GetSpawnCFrame())
	local mirrorLifestyle = MirrorLifestyleService.new(profiles, replicas)
	local roleplay = RoleplayService.new(profiles, replicas)
	local family = FamilyService.new()
	action:Start()

	local function playerAdded(player: Player)
		local profile = profiles:Load(player)
		if profile == nil then
			if player.Parent == Players then
				player:Kick("StarBlox profile session unavailable. Please rejoin.")
			end
			return
		end
		replicas:Attach(player, profile.Data)
		privatePlaytestTelemetry:PlayerReady(player)
		coreLoop:PlayerReady(player, profile.Data)
		homeEconomy:PlayerReady(player, profile.Data)
		mirrorLifestyle:PlayerReady(player, profile.Data)
		roleplay:PlayerReady(player, profile.Data)
		action:PlayerAdded(player)
	end

	local function playerRemoving(player: Player)
		family:PlayerRemoving(player)
		roleplay:PlayerRemoving(player)
		mirrorLifestyle:PlayerRemoving(player)
		homeEconomy:PlayerRemoving(player)
		coreLoop:PlayerRemoving(player)
		privatePlaytestTelemetry:PlayerRemoving(player)
		social:PlayerRemoving(player)
		aiNpc:PlayerRemoving(player)
		action:PlayerRemoving(player)
		replicas:Detach(player)
		profiles:Release(player)
	end

	for _, player in Players:GetPlayers() do
		task.spawn(playerAdded, player)
	end
	Players.PlayerAdded:Connect(playerAdded)
	Players.PlayerRemoving:Connect(playerRemoving)

	game:BindToClose(function()
		privatePlaytestTelemetry:FlushAll()
		family:Destroy()
		roleplay:Destroy()
		mirrorLifestyle:Destroy()
		homeEconomy:Destroy()
		coreLoop:Destroy()
		privatePlaytestTelemetry:Destroy()
		worldProjection:Destroy()
		action:Stop()
		replicas:Shutdown()
		profiles:ReleaseAll()
	end)

	return table.freeze({
		WorldProjection = worldProjection,
		Profiles = profiles,
		Replicas = replicas,
		Ecs = ecs,
		Artifacts = artifacts,
		Replays = replays,
		IntelligenceShadow = shadow,
		LiveOps = liveOps,
		SocialWorld = social,
		AiNpc = aiNpc,
		Action = action,
		CoreLoop = coreLoop,
		HomeEconomy = homeEconomy,
		MirrorLifestyle = mirrorLifestyle,
		Roleplay = roleplay,
		Family = family,
		PrivatePlaytestTelemetry = privatePlaytestTelemetry,
	})
end

return Bootstrap
