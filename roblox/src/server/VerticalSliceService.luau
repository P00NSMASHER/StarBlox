--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.VerticalSliceConfig)

local VerticalSliceService = {}
VerticalSliceService.__index = VerticalSliceService

local ANSWER = "put"
local REMOTE_ROOT_NAME = "StarBloxVerticalSlice"
local WORLD_MODEL_NAME = "StarBloxVerticalSlice"

local function makePart(parent: Instance, name: string, size: Vector3, position: Vector3): Part
	local part = Instance.new("Part")
	part.Name = name
	part.Anchored = true
	part.Size = size
	part.Position = position
	part.TopSurface = Enum.SurfaceType.Smooth
	part.BottomSurface = Enum.SurfaceType.Smooth
	part.Parent = parent
	return part
end

local function buildWorld(): ProximityPrompt
	local existing = Workspace:FindFirstChild(WORLD_MODEL_NAME)
	if existing then
		existing:Destroy()
	end

	local model = Instance.new("Model")
	model.Name = WORLD_MODEL_NAME
	model:SetAttribute("SliceId", Config.SliceId)
	model:SetAttribute("DistrictName", Config.DistrictName)
	model.Parent = Workspace

	local plaza = makePart(model, "BrightsidePlaza", Vector3.new(96, 1, 96), Vector3.new(0, -0.5, 0))
	plaza.Material = Enum.Material.SmoothPlastic

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "StarBloxSpawn"
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Size = Vector3.new(8, 1, 8)
	spawn.Position = Vector3.new(0, 1, 20)
	spawn.Parent = model

	local portal = makePart(model, "WordPortal", Vector3.new(12, 12, 2), Vector3.new(0, 6, -21))
	portal.Material = Enum.Material.Neon
	portal.CanCollide = false

	local kiosk = makePart(model, "QuestKiosk", Vector3.new(8, 6, 4), Vector3.new(0, 3, -14))
	kiosk.Material = Enum.Material.SmoothPlastic

	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "StartQuestPrompt"
	prompt.ActionText = "Start Quest"
	prompt.ObjectText = "Word Portal"
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 14
	prompt.RequiresLineOfSight = false
	prompt.Parent = kiosk

	local billboard = Instance.new("BillboardGui")
	billboard.Name = "QuestSign"
	billboard.Size = UDim2.fromOffset(320, 96)
	billboard.StudsOffset = Vector3.new(0, 5, 0)
	billboard.AlwaysOnTop = true
	billboard.Adornee = kiosk
	billboard.Parent = kiosk

	local label = Instance.new("TextLabel")
	label.Name = "Title"
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 0.15
	label.TextScaled = true
	label.TextWrapped = true
	label.Text = "STAR BLOX\nWORD PORTAL"
	label.Parent = billboard

	return prompt
end

local function publicQuestion()
	return {
		id = Config.Quest.Id,
		title = Config.Quest.Title,
		prompt = Config.Quest.Prompt,
		choices = table.clone(Config.Quest.Choices),
		subject = Config.Quest.Subject,
		skill = Config.Quest.Skill,
		source = Config.Quest.Source,
		reward = {
			coins = Config.Reward.Coins,
			xp = Config.Reward.XP,
			stars = Config.Reward.Stars,
		},
	}
end

function VerticalSliceService.GradeAnswer(choice: any): boolean
	return type(choice) == "string" and string.lower(choice) == ANSWER
end

function VerticalSliceService.new(profiles, replicas)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, VerticalSliceService)
	self._profiles = profiles
	self._replicas = replicas
	self._sessions = {}
	self._lastSubmitAt = {}

	local oldRemotes = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if oldRemotes then
		oldRemotes:Destroy()
	end

	local remoteRoot = Instance.new("Folder")
	remoteRoot.Name = REMOTE_ROOT_NAME
	remoteRoot:SetAttribute("SliceId", Config.SliceId)
	remoteRoot.Parent = ReplicatedStorage

	local questOpened = Instance.new("RemoteEvent")
	questOpened.Name = "QuestOpened"
	questOpened.Parent = remoteRoot

	local submitAnswer = Instance.new("RemoteFunction")
	submitAnswer.Name = "SubmitAnswer"
	submitAnswer.Parent = remoteRoot

	self._remoteRoot = remoteRoot
	self._questOpened = questOpened
	self._submitAnswer = submitAnswer
	self._prompt = buildWorld()

	self._promptConnection = self._prompt.Triggered:Connect(function(player: Player)
		if self._profiles:Get(player) == nil then
			self._questOpened:FireClient(player, {
				status = "loading",
				message = "Your StarBlox profile is still loading. Try again in a moment.",
			})
			return
		end
		self._sessions[player] = {
			questionId = Config.Quest.Id,
			openedAt = os.clock(),
			completed = false,
		}
		self._questOpened:FireClient(player, {
			status = "ready",
			question = publicQuestion(),
		})
	end)

	self._submitAnswer.OnServerInvoke = function(player: Player, request: any)
		return self:_submit(player, request)
	end

	return self
end

function VerticalSliceService:PlayerReady(player: Player, data: {[string]: any})
	player:SetAttribute("StarBloxCoins", data.Economy.Coins)
	player:SetAttribute("StarBloxXP", data.Economy.XP)
	player:SetAttribute("StarBloxStars", data.Economy.Stars)
end

function VerticalSliceService:_submit(player: Player, request: any)
	local now = os.clock()
	local previous = self._lastSubmitAt[player] or -math.huge
	if now - previous < 0.2 then
		return {ok = false, code = "rate_limited"}
	end
	self._lastSubmitAt[player] = now

	local session = self._sessions[player]
	if session == nil or session.completed == true then
		return {ok = false, code = "quest_not_open"}
	end
	if type(request) ~= "table" then
		return {ok = false, code = "invalid_request"}
	end
	if request.questionId ~= Config.Quest.Id then
		return {ok = false, code = "wrong_question"}
	end

	local choice = request.choice
	if not VerticalSliceService.GradeAnswer(choice) then
		return {
			ok = true,
			correct = false,
			rewarded = false,
			message = "Almost! Try another answer.",
		}
	end

	session.completed = true
	local rewarded = false
	local latestEconomy = nil

	local found = self._profiles:WithProfile(player, function(data)
		data.Progress.VerticalSlice = data.Progress.VerticalSlice or {
			Completed = false,
			RewardClaimed = false,
		}

		data.Progress.VerticalSlice.Completed = true
		if data.Progress.VerticalSlice.RewardClaimed ~= true then
			data.Progress.VerticalSlice.RewardClaimed = true
			data.Economy.Coins += Config.Reward.Coins
			data.Economy.XP += Config.Reward.XP
			data.Economy.Stars += Config.Reward.Stars
			rewarded = true
		end

		latestEconomy = {
			Coins = data.Economy.Coins,
			XP = data.Economy.XP,
			Stars = data.Economy.Stars,
		}
		self._replicas:Sync(player, data)
	end)

	if not found or latestEconomy == nil then
		session.completed = false
		return {ok = false, code = "profile_unavailable"}
	end

	player:SetAttribute("StarBloxCoins", latestEconomy.Coins)
	player:SetAttribute("StarBloxXP", latestEconomy.XP)
	player:SetAttribute("StarBloxStars", latestEconomy.Stars)

	return {
		ok = true,
		correct = true,
		rewarded = rewarded,
		message = rewarded and "Portal powered! Reward earned." or "Portal already powered. Nice work!",
		economy = latestEconomy,
	}
end

function VerticalSliceService:PlayerRemoving(player: Player)
	self._sessions[player] = nil
	self._lastSubmitAt[player] = nil
end

function VerticalSliceService:Destroy()
	if self._promptConnection then
		self._promptConnection:Disconnect()
		self._promptConnection = nil
	end
	for player, _ in self._sessions do
		self._sessions[player] = nil
	end
	for player, _ in self._lastSubmitAt do
		self._lastSubmitAt[player] = nil
	end
end

return VerticalSliceService
