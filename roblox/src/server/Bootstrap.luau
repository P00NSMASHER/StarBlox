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
local AuthoritativeActionService = require(script.Parent.AuthoritativeActionService)

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
	local action = AuthoritativeActionService.new(dependencies.ActionAdapters, dependencies.TelemetrySink)

	local function playerAdded(player: Player)
		local profile = profiles:Load(player)
		if profile == nil then
			if player.Parent == Players then
				player:Kick("StarBlox profile session unavailable. Please rejoin.")
			end
			return
		end
		replicas:Attach(player, profile.Data)
	end

	local function playerRemoving(player: Player)
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
		Action = action,
	})
end

return Bootstrap
