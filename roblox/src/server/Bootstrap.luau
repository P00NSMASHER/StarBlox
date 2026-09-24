--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ProfileTemplate = require(ReplicatedStorage.StarBlox.ProfileTemplate)
local ProfileSessionService = require(script.Parent.ProfileSessionService)
local ReplicaStateService = require(script.Parent.ReplicaStateService)
local WorldEcsService = require(script.Parent.WorldEcsService)
local RuntimeArtifactService = require(script.Parent.RuntimeArtifactService)
local ReplayIngressService = require(script.Parent.ReplayIngressService)
local IntelligenceShadowService = require(script.Parent.IntelligenceShadowService)
local LiveOpsService = require(script.Parent.LiveOpsService)
local SocialWorldService = require(script.Parent.SocialWorldService)
local AiNpcService = require(script.Parent.AiNpcService)
local MultiplayerActionService = require(script.Parent.MultiplayerActionService)

local Bootstrap = {}

function Bootstrap.start(dependencies)
	assert(dependencies ~= nil, "dependencies are required")
	assert(dependencies.ProfileStore ~= nil, "ProfileStore dependency is required")
	assert(dependencies.ReplicaService ~= nil, "ReplicaService dependency is required")
	assert(dependencies.Matter ~= nil, "Matter dependency is required")

	local profiles = ProfileSessionService.new(dependencies.ProfileStore, ProfileTemplate)
	local replicas = ReplicaStateService.new(dependencies.ReplicaService)
	local ecs = WorldEcsService.new(dependencies.Matter)
	local artifacts = RuntimeArtifactService.new()
	local replays = ReplayIngressService.new(dependencies.ReplayLimits)
	local shadow = IntelligenceShadowService.new(dependencies.TelemetrySink)
	local liveOps = LiveOpsService.new(profiles, replicas, dependencies.LiveOpsPackages)
	local social = SocialWorldService.new(profiles, replicas, ecs, liveOps, dependencies.SocialWorldAdapters)
	local aiNpc = AiNpcService.new(profiles, dependencies.AiNpcAdapters, dependencies.TelemetrySink)
	local multiplayer = nil
	if dependencies.MultiplayerAdapters ~= nil then
		multiplayer = MultiplayerActionService.new(dependencies.MultiplayerAdapters, dependencies.TelemetrySink)
		multiplayer:Start()
	end

	local function playerAdded(player: Player)
		local profile = profiles:Load(player)
		if profile == nil then
			if player.Parent == Players then
				player:Kick("StarBlox profile session unavailable. Please rejoin.")
			end
			return
		end
		replicas:Attach(player, profile.Data)
		if multiplayer ~= nil then
			multiplayer:PlayerAdded(player)
		end
	end

	local function playerRemoving(player: Player)
		if multiplayer ~= nil then
			multiplayer:PlayerRemoving(player)
		end
		social:PlayerRemoving(player)
		aiNpc:PlayerRemoving(player)
		replicas:Detach(player)
		profiles:Release(player)
	end

	for _, player in Players:GetPlayers() do
		task.spawn(playerAdded, player)
	end
	Players.PlayerAdded:Connect(playerAdded)
	Players.PlayerRemoving:Connect(playerRemoving)

	game:BindToClose(function()
		if multiplayer ~= nil then
			multiplayer:Destroy()
		end
		for _, player in Players:GetPlayers() do
			replicas:Detach(player)
		end
		profiles:ReleaseAll()
	end)

	return table.freeze({
		Profiles = profiles,
		Replicas = replicas,
		Ecs = ecs,
		Artifacts = artifacts,
		Replays = replays,
		IntelligenceShadow = shadow,
		LiveOps = liveOps,
		SocialWorld = social,
		AiNpc = aiNpc,
		Multiplayer = multiplayer,
	})
end

return Bootstrap
