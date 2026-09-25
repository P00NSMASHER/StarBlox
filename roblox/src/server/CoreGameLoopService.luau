--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.CoreLoopConfig)

local CoreGameLoopService = {}
CoreGameLoopService.__index = CoreGameLoopService

local WORLD_MODEL_NAME = "StarBloxCoreLoop"
local REMOTE_ROOT_NAME = "StarBloxCoreLoop"

local ANSWERS = table.freeze({
	["word-portal-put-v1"] = "put",
	["spelling-forge-fog-v1"] = "fog",
	["culture-lab-culture-v1"] = "culture",
})

local STATION_POSITIONS = table.freeze({
	["word-portal-put-v1"] = Vector3.new(0, 3, -24),
	["spelling-forge-fog-v1"] = Vector3.new(26, 3, 4),
	["culture-lab-culture-v1"] = Vector3.new(-26, 3, 4),
})

local STATION_PART_NAMES = table.freeze({
	["word-portal-put-v1"] = "WordPortalStation",
	["spelling-forge-fog-v1"] = "SpellingForgeStation",
	["culture-lab-culture-v1"] = "CultureLabStation",
})

local function activityById(activityId: string)
	for _, activity in Config.Activities do
		if activity.Id == activityId then
			return activity
		end
	end
	return nil
end

local function utcDayKey(): string
	return os.date("!%Y-%m-%d")
end

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

local function createStation(model: Model, activity)
	local position = STATION_POSITIONS[activity.Id]
	assert(position ~= nil, "missing station position: " .. activity.Id)

	local station = makePart(
		model,
		STATION_PART_NAMES[activity.Id],
		Vector3.new(10, 6, 10),
		position
	)
	station.Material = Enum.Material.SmoothPlastic
	station.Color = activity.Accent
	station:SetAttribute("ActivityId", activity.Id)
	station:SetAttribute("StationName", activity.StationName)
	station:SetAttribute("StationIndex", activity.Index)
	station:SetAttribute("Direction", activity.Direction)

	local highlight = Instance.new("Highlight")
	highlight.Name = "StationHighlight"
	highlight.FillColor = activity.Accent
	highlight.FillTransparency = 0.72
	highlight.OutlineColor = Color3.new(1, 1, 1)
	highlight.OutlineTransparency = 0.12
	highlight.Parent = station

	local light = Instance.new("PointLight")
	light.Name = "StationGlow"
	light.Color = activity.Accent
	light.Brightness = 1.6
	light.Range = 18
	light.Parent = station

	local prompt = Instance.new("ProximityPrompt")
	prompt.Name = "StartActivityPrompt"
	prompt.ActionText = "Start Activity"
	prompt.ObjectText = activity.StationName
	prompt.HoldDuration = 0
	prompt.MaxActivationDistance = 14
	prompt.RequiresLineOfSight = false
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
	prompt.Parent = station

	local billboard = Instance.new("BillboardGui")
	billboard.Name = "StationSign"
	billboard.Size = UDim2.fromOffset(300, 84)
	billboard.StudsOffset = Vector3.new(0, 5.5, 0)
	billboard.AlwaysOnTop = true
	billboard.Adornee = station
	billboard.Parent = station

	local label = Instance.new("TextLabel")
	label.Name = "Title"
	label.Size = UDim2.fromScale(1, 1)
	label.BackgroundTransparency = 0.15
	label.TextScaled = true
	label.TextWrapped = true
	label.Text = string.format("%d • %s\n%s", activity.Index, string.upper(activity.StationName), string.upper(activity.Direction))
	label.TextColor3 = Color3.new(1, 1, 1)
	label.Font = Enum.Font.GothamBold
	label.Parent = billboard

	return prompt
end

local function buildWorld()
	local existing = Workspace:FindFirstChild(WORLD_MODEL_NAME)
	if existing then
		existing:Destroy()
	end

	local model = Instance.new("Model")
	model.Name = WORLD_MODEL_NAME
	model:SetAttribute("LoopId", Config.LoopId)
	model:SetAttribute("DistrictName", Config.DistrictName)
	model:SetAttribute("PolishRevision", Config.PolishRevision)
	model.Parent = Workspace

	local plaza = makePart(model, "BrightsidePlaza", Vector3.new(110, 1, 110), Vector3.new(0, -0.5, 0))
	plaza.Material = Enum.Material.SmoothPlastic

	local spawn = Instance.new("SpawnLocation")
	spawn.Name = "StarBloxSpawn"
	spawn.Anchored = true
	spawn.Neutral = true
	spawn.Size = Vector3.new(8, 1, 8)
	spawn.Position = Vector3.new(0, 1, 28)
	spawn.Parent = model

	local guideTotem = makePart(model, "GuideTotem", Vector3.new(5, 7, 5), Vector3.new(0, 3.5, 15))
	guideTotem.Material = Enum.Material.SmoothPlastic
	guideTotem.Color = Color3.fromRGB(35, 42, 65)
	guideTotem.CanCollide = true

	local guideBillboard = Instance.new("BillboardGui")
	guideBillboard.Name = "GuideBillboard"
	guideBillboard.Size = UDim2.fromOffset(430, 130)
	guideBillboard.StudsOffset = Vector3.new(0, 5.5, 0)
	guideBillboard.AlwaysOnTop = true
	guideBillboard.Adornee = guideTotem
	guideBillboard.Parent = guideTotem

	local guideLabel = Instance.new("TextLabel")
	guideLabel.Name = "Directions"
	guideLabel.Size = UDim2.fromScale(1, 1)
	guideLabel.BackgroundTransparency = 0.12
	guideLabel.TextColor3 = Color3.new(1, 1, 1)
	guideLabel.Font = Enum.Font.GothamBold
	guideLabel.TextScaled = true
	guideLabel.TextWrapped = true
	guideLabel.Text = "BRIGHTSIDE PLAZA\n1 WORD PORTAL ↑   2 SPELLING FORGE →   3 CULTURE LAB ←"
	guideLabel.Parent = guideBillboard

	for _, pathSpec in {
		{name = "NorthPath", size = Vector3.new(10, 0.4, 48), position = Vector3.new(0, 0.2, 0)},
		{name = "EastPath", size = Vector3.new(48, 0.4, 10), position = Vector3.new(13, 0.2, 4)},
		{name = "WestPath", size = Vector3.new(48, 0.4, 10), position = Vector3.new(-13, 0.2, 4)},
	} do
		local path = makePart(model, pathSpec.name, pathSpec.size, pathSpec.position)
		path.Material = Enum.Material.SmoothPlastic
	end

	local prompts = {}
	for _, activity in Config.Activities do
		prompts[activity.Id] = createStation(model, activity)
	end

	return model, prompts
end

local function ensureCoreLoopState(profileData)
	profileData.Progress.CoreLoop = profileData.Progress.CoreLoop or {
		RunNumber = 1,
		LoopRuns = 0,
		CompletedByRun = {},
		RewardDay = "",
		RewardedRunsToday = 0,
		OnboardingSeen = false,
	}
	local state = profileData.Progress.CoreLoop
	state.RunNumber = math.max(1, tonumber(state.RunNumber) or 1)
	state.LoopRuns = math.max(0, tonumber(state.LoopRuns) or 0)
	state.CompletedByRun = type(state.CompletedByRun) == "table" and state.CompletedByRun or {}
	state.RewardDay = type(state.RewardDay) == "string" and state.RewardDay or ""
	state.RewardedRunsToday = math.max(0, tonumber(state.RewardedRunsToday) or 0)
	state.OnboardingSeen = state.OnboardingSeen == true
	return state
end

local function publicActivity(activity)
	return {
		id = activity.Id,
		stationName = activity.StationName,
		stationIndex = activity.Index,
		direction = activity.Direction,
		accent = activity.Accent,
		title = activity.Title,
		prompt = activity.Prompt,
		choices = table.clone(activity.Choices),
		subject = activity.Subject,
		skill = activity.Skill,
		source = activity.Source,
		reward = {
			coins = activity.Reward.Coins,
			xp = activity.Reward.XP,
			stars = activity.Reward.Stars,
		},
	}
end

function CoreGameLoopService.GradeAnswer(activityId: any, choice: any): boolean
	if type(activityId) ~= "string" or type(choice) ~= "string" then
		return false
	end
	local expected = ANSWERS[activityId]
	return expected ~= nil and string.lower(choice) == expected
end

function CoreGameLoopService.GetPublicActivity(activityId: string)
	local activity = activityById(activityId)
	if activity == nil then
		return nil
	end
	return publicActivity(activity)
end

function CoreGameLoopService.MarkOnboardingSeen(profileData): boolean
	local state = ensureCoreLoopState(profileData)
	if state.OnboardingSeen == true then
		return false
	end
	state.OnboardingSeen = true
	return true
end

function CoreGameLoopService.BuildStatus(profileData)
	local state = ensureCoreLoopState(profileData)
	local current = state.CompletedByRun[tostring(state.RunNumber)] or {}
	local completedIds = {}
	local recommendedActivityId = nil
	local recommendedStationName = nil

	for _, activity in Config.Activities do
		if current[activity.Id] == true then
			table.insert(completedIds, activity.Id)
		elseif recommendedActivityId == nil then
			recommendedActivityId = activity.Id
			recommendedStationName = activity.StationName
		end
	end

	return {
		ok = true,
		district = Config.DistrictName,
		runNumber = state.RunNumber,
		loopRuns = state.LoopRuns,
		progress = #completedIds,
		activityCount = #Config.Activities,
		completedActivityIds = completedIds,
		recommendedActivityId = recommendedActivityId,
		recommendedStationName = recommendedStationName,
		rewardedRunsToday = state.RewardedRunsToday,
		dailyRewardRunCap = Config.DailyRewardRunCap,
		rewardCapReached = state.RewardedRunsToday >= Config.DailyRewardRunCap,
		onboardingSeen = state.OnboardingSeen == true,
		cosmeticUnlocked = profileData.Inventory.Cosmetics[Config.FirstLoopCosmeticId] == true,
		economy = {
			Coins = profileData.Economy.Coins,
			XP = profileData.Economy.XP,
			Stars = profileData.Economy.Stars,
		},
	}
end

function CoreGameLoopService.ApplyCompletion(profileData, activityId: string, dayKey: string)
	local activity = activityById(activityId)
	if activity == nil then
		return {ok = false, code = "unknown_activity"}
	end
	if type(dayKey) ~= "string" or dayKey == "" then
		return {ok = false, code = "invalid_day"}
	end

	local state = ensureCoreLoopState(profileData)
	if state.RewardDay ~= dayKey then
		state.RewardDay = dayKey
		state.RewardedRunsToday = 0
	end

	local runKey = tostring(state.RunNumber)
	state.CompletedByRun[runKey] = state.CompletedByRun[runKey] or {}
	local completed = state.CompletedByRun[runKey]
	if completed[activityId] == true then
		return {
			ok = true,
			duplicate = true,
			loopCompleted = false,
			runNumber = state.RunNumber,
			loopRuns = state.LoopRuns,
			progress = 0,
		}
	end

	completed[activityId] = true
	local rewardEligible = state.RewardedRunsToday < Config.DailyRewardRunCap
	if rewardEligible then
		profileData.Economy.Coins += activity.Reward.Coins
		profileData.Economy.XP += activity.Reward.XP
		profileData.Economy.Stars += activity.Reward.Stars
	end

	local progress = 0
	for _, candidate in Config.Activities do
		if completed[candidate.Id] == true then
			progress += 1
		end
	end

	local loopCompleted = progress == #Config.Activities
	local cosmeticUnlocked = false
	if loopCompleted then
		if rewardEligible then
			profileData.Economy.Coins += Config.LoopReward.Coins
			profileData.Economy.XP += Config.LoopReward.XP
			profileData.Economy.Stars += Config.LoopReward.Stars
			state.RewardedRunsToday += 1
		end

		state.LoopRuns += 1
		profileData.Progress.Districts[Config.DistrictName] = state.LoopRuns
		if state.LoopRuns == 1 then
			profileData.Inventory.Cosmetics[Config.FirstLoopCosmeticId] = true
			cosmeticUnlocked = true
		end

		state.RunNumber += 1
		state.CompletedByRun[tostring(state.RunNumber)] = {}
	end

	return {
		ok = true,
		duplicate = false,
		loopCompleted = loopCompleted,
		rewardEligible = rewardEligible,
		cosmeticUnlocked = cosmeticUnlocked,
		runNumber = state.RunNumber,
		loopRuns = state.LoopRuns,
		progress = loopCompleted and 0 or progress,
		activityCount = #Config.Activities,
	}
end

function CoreGameLoopService.new(profiles, replicas)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, CoreGameLoopService)
	self._profiles = profiles
	self._replicas = replicas
	self._sessions = {}
	self._lastSubmitAt = {}
	self._connections = {}

	local oldRemotes = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if oldRemotes then
		oldRemotes:Destroy()
	end

	local remoteRoot = Instance.new("Folder")
	remoteRoot.Name = REMOTE_ROOT_NAME
	remoteRoot:SetAttribute("LoopId", Config.LoopId)
	remoteRoot.Parent = ReplicatedStorage

	local activityOpened = Instance.new("RemoteEvent")
	activityOpened.Name = "ActivityOpened"
	activityOpened.Parent = remoteRoot

	local submitAnswer = Instance.new("RemoteFunction")
	submitAnswer.Name = "SubmitAnswer"
	submitAnswer.Parent = remoteRoot

	local requestStatus = Instance.new("RemoteFunction")
	requestStatus.Name = "RequestStatus"
	requestStatus.Parent = remoteRoot

	local dismissOnboarding = Instance.new("RemoteEvent")
	dismissOnboarding.Name = "DismissOnboarding"
	dismissOnboarding.Parent = remoteRoot

	self._activityOpened = activityOpened
	self._submitAnswer = submitAnswer
	self._requestStatus = requestStatus
	self._dismissOnboarding = dismissOnboarding
	self._world, self._prompts = buildWorld()

	for activityId, prompt in self._prompts do
		table.insert(self._connections, prompt.Triggered:Connect(function(player: Player)
			if self._profiles:Get(player) == nil then
				self._activityOpened:FireClient(player, {
					status = "loading",
					message = "Your StarBlox profile is still loading. Try again in a moment.",
				})
				return
			end

			self._sessions[player] = {
				activityId = activityId,
				openedAt = os.clock(),
			}
			self._activityOpened:FireClient(player, {
				status = "ready",
				activity = publicActivity(activityById(activityId)),
			})
		end))
	end

	self._submitAnswer.OnServerInvoke = function(player: Player, request: any)
		return self:_submit(player, request)
	end

	self._requestStatus.OnServerInvoke = function(player: Player)
		return self:_status(player)
	end

	table.insert(self._connections, self._dismissOnboarding.OnServerEvent:Connect(function(player: Player)
		self._profiles:WithProfile(player, function(data)
			if CoreGameLoopService.MarkOnboardingSeen(data) then
				self._replicas:Sync(player, data)
			end
			player:SetAttribute("StarBloxOnboardingSeen", true)
		end)
	end))

	return self
end

function CoreGameLoopService:_status(player: Player)
	local result = nil
	self._profiles:WithProfile(player, function(data)
		result = CoreGameLoopService.BuildStatus(data)
	end)
	return result or {ok = false, code = "profile_unavailable"}
end

function CoreGameLoopService:PlayerReady(player: Player, data: {[string]: any})
	local state = ensureCoreLoopState(data)
	player:SetAttribute("StarBloxCoins", data.Economy.Coins)
	player:SetAttribute("StarBloxXP", data.Economy.XP)
	player:SetAttribute("StarBloxStars", data.Economy.Stars)
	player:SetAttribute("StarBloxLoopRuns", state.LoopRuns)
	player:SetAttribute("StarBloxRunNumber", state.RunNumber)
	player:SetAttribute("StarBloxOnboardingSeen", state.OnboardingSeen == true)
	player:SetAttribute(
		"StarBloxSparkTrailUnlocked",
		data.Inventory.Cosmetics[Config.FirstLoopCosmeticId] == true
	)
end

function CoreGameLoopService:_submit(player: Player, request: any)
	local now = os.clock()
	local previous = self._lastSubmitAt[player] or -math.huge
	if now - previous < 0.2 then
		return {ok = false, code = "rate_limited"}
	end
	self._lastSubmitAt[player] = now

	local session = self._sessions[player]
	if session == nil then
		return {ok = false, code = "activity_not_open"}
	end
	if type(request) ~= "table" or request.activityId ~= session.activityId then
		return {ok = false, code = "invalid_request"}
	end

	if not CoreGameLoopService.GradeAnswer(session.activityId, request.choice) then
		return {
			ok = true,
			correct = false,
			message = "Almost! Try another answer.",
		}
	end

	local completion = nil
	local latestEconomy = nil
	local statusSnapshot = nil
	local found = self._profiles:WithProfile(player, function(data)
		completion = CoreGameLoopService.ApplyCompletion(data, session.activityId, utcDayKey())
		if completion.ok ~= true then
			return
		end
		latestEconomy = {
			Coins = data.Economy.Coins,
			XP = data.Economy.XP,
			Stars = data.Economy.Stars,
		}
		statusSnapshot = CoreGameLoopService.BuildStatus(data)
		self._replicas:Sync(player, data)
	end)

	if not found or completion == nil or completion.ok ~= true or latestEconomy == nil then
		return {ok = false, code = "profile_unavailable"}
	end

	self._sessions[player] = nil
	player:SetAttribute("StarBloxCoins", latestEconomy.Coins)
	player:SetAttribute("StarBloxXP", latestEconomy.XP)
	player:SetAttribute("StarBloxStars", latestEconomy.Stars)
	player:SetAttribute("StarBloxLoopRuns", completion.loopRuns)
	player:SetAttribute("StarBloxRunNumber", completion.runNumber)
	if completion.cosmeticUnlocked then
		player:SetAttribute("StarBloxSparkTrailUnlocked", true)
	end

	return {
		ok = true,
		correct = true,
		message = completion.loopCompleted
			and "Brightside loop complete! New run unlocked."
			or "Station powered! Keep exploring Brightside.",
		completion = completion,
		status = statusSnapshot,
		economy = latestEconomy,
	}
end

function CoreGameLoopService:PlayerRemoving(player: Player)
	self._sessions[player] = nil
	self._lastSubmitAt[player] = nil
end

function CoreGameLoopService:Destroy()
	for _, connection in self._connections do
		connection:Disconnect()
	end
	self._connections = {}
	for player, _ in self._sessions do
		self._sessions[player] = nil
	end
	for player, _ in self._lastSubmitAt do
		self._lastSubmitAt[player] = nil
	end
end

return CoreGameLoopService
