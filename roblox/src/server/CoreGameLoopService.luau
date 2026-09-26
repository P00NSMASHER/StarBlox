--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.CoreLoopConfig)
local WorldBindings = require(ReplicatedStorage.StarBlox.WorldActivityBindings)
local CoreQuestionBank = require(script.Parent.CoreQuestionBank)

local CoreGameLoopService = {}
CoreGameLoopService.__index = CoreGameLoopService

local WORLD_MODEL_NAME = "StarBloxCoreLoop"
local REMOTE_ROOT_NAME = "StarBloxCoreLoop"

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

local function removePrototypeWorld()
	local existing = Workspace:FindFirstChild(WORLD_MODEL_NAME)
	if existing then
		existing:Destroy()
	end
end

local function resolveWorldPart(worldRoot: Model, sourcePartName: string, label: string): BasePart
	local instance = worldRoot:FindFirstChild(sourcePartName, true)
	assert(instance ~= nil and instance:IsA("BasePart"), label .. " source part missing: " .. sourcePartName)
	return instance :: BasePart
end

local function worldTopCFrame(sourcePart: BasePart, heightOffset: number): CFrame
	return CFrame.new(
		sourcePart.Position + Vector3.new(0, (sourcePart.Size.Y / 2) + heightOffset, 0)
	)
end

local function buildWorldBindings()
	local worldRoot = Workspace:FindFirstChild(WorldBindings.WorldRootName)
	assert(
		worldRoot ~= nil and worldRoot:IsA("Model"),
		"verified Brookhaven world root missing: " .. WorldBindings.WorldRootName
	)

	local previous = Workspace:FindFirstChild(WorldBindings.RuntimeAnchorFolderName)
	if previous then
		previous:Destroy()
	end

	local runtimeFolder = Instance.new("Folder")
	runtimeFolder.Name = WorldBindings.RuntimeAnchorFolderName
	runtimeFolder:SetAttribute("BindingSchemaVersion", WorldBindings.SchemaVersion)
	runtimeFolder:SetAttribute("WorldRootName", WorldBindings.WorldRootName)
	runtimeFolder:SetAttribute("BaselineMutationAllowed", false)
	runtimeFolder.Parent = Workspace

	local prompts = {}
	for _, activity in Config.Activities do
		local binding = WorldBindings.Activities[activity.Id]
		assert(binding ~= nil, "missing world binding for activity: " .. activity.Id)

		local sourcePart = resolveWorldPart(
			worldRoot,
			binding.SourcePartName,
			"activity " .. activity.Id
		)

		local anchor = Instance.new("Part")
		anchor.Name = binding.AnchorName
		anchor.Size = Vector3.new(4, 1, 4)
		anchor.CFrame = worldTopCFrame(sourcePart, binding.HeightOffset)
		anchor.Anchored = true
		anchor.Transparency = 1
		anchor.CanCollide = false
		anchor.CanTouch = false
		anchor.CanQuery = false
		anchor.CastShadow = false
		anchor:SetAttribute("ActivityId", activity.Id)
		anchor:SetAttribute("SourceWorldPart", binding.SourcePartName)
		anchor:SetAttribute("WorldBindingOnly", true)
		anchor.Parent = runtimeFolder

		local prompt = Instance.new("ProximityPrompt")
		prompt.Name = "StartActivityPrompt"
		prompt.ActionText = "Start Activity"
		prompt.ObjectText = activity.StationName
		prompt.HoldDuration = 0
		prompt.MaxActivationDistance = 16
		prompt.RequiresLineOfSight = false
		prompt.KeyboardKeyCode = Enum.KeyCode.E
		prompt.GamepadKeyCode = Enum.KeyCode.ButtonX
		prompt.Parent = anchor
		prompts[activity.Id] = prompt
	end

	local spawnSource = resolveWorldPart(
		worldRoot,
		WorldBindings.Spawn.SourcePartName,
		"player spawn"
	)
	local spawnCFrame = worldTopCFrame(spawnSource, WorldBindings.Spawn.HeightOffset)

	return runtimeFolder, prompts, spawnCFrame
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

local function ensureQuestionState(profileData)
	profileData.Learning = profileData.Learning or {}
	profileData.Learning.QuestionCursorByStation =
		type(profileData.Learning.QuestionCursorByStation) == "table"
		and profileData.Learning.QuestionCursorByStation
		or {}
	profileData.Learning.RecentQuestionIds =
		type(profileData.Learning.RecentQuestionIds) == "table"
		and profileData.Learning.RecentQuestionIds
		or {}
	return profileData.Learning.QuestionCursorByStation
end

local function questionCursor(profileData, activityId: string): number
	local cursors = ensureQuestionState(profileData)
	return math.max(0, math.floor(tonumber(cursors[activityId]) or 0))
end

local function publicActivity(activity, question)
	assert(question ~= nil, "question is required for public activity")
	return {
		id = activity.Id,
		stationName = activity.StationName,
		stationIndex = activity.Index,
		direction = activity.Direction,
		accent = activity.Accent,
		title = activity.Title,
		questionId = question.Id,
		questionContentHash = question.ContentHash,
		prompt = question.Prompt,
		choices = table.clone(question.Choices),
		subject = question.Subject,
		skill = question.Skill,
		source = activity.Source,
		sourceWeek = CoreQuestionBank.Source.WeekLabel,
		reward = {
			coins = Config.QuestionReward.Coins,
			xp = Config.QuestionReward.XP,
			stars = 0,
		},
	}
end

function CoreGameLoopService.GradeAnswer(questionId: any, choice: any): boolean
	return CoreQuestionBank.Grade(questionId, choice)
end

function CoreGameLoopService.ApplyCorrectQuestionReward(
	profileData,
	activityId: string,
	questionId: string
)
	local question = CoreQuestionBank.GetById(questionId)
	if question == nil or question.StationId ~= activityId then
		return {ok = false, code = "question_station_mismatch"}
	end

	local currentCursor = questionCursor(profileData, activityId)
	local expected = CoreQuestionBank.Select(activityId, currentCursor)
	if expected == nil or expected.Id ~= questionId then
		return {ok = false, code = "stale_question"}
	end

	local cursors = ensureQuestionState(profileData)
	cursors[activityId] = currentCursor + 1
	table.insert(profileData.Learning.RecentQuestionIds, questionId)
	while #profileData.Learning.RecentQuestionIds > 24 do
		table.remove(profileData.Learning.RecentQuestionIds, 1)
	end

	profileData.Economy.Coins += Config.QuestionReward.Coins
	profileData.Economy.XP += Config.QuestionReward.XP
	local nextQuestion = CoreQuestionBank.Select(activityId, currentCursor + 1)

	return {
		ok = true,
		coins = Config.QuestionReward.Coins,
		xp = Config.QuestionReward.XP,
		nextQuestionId = if nextQuestion ~= nil then nextQuestion.Id else nil,
	}
end

function CoreGameLoopService.GetPublicActivity(activityId: string, cursor: any?)
	local activity = activityById(activityId)
	if activity == nil then
		return nil
	end
	local question = CoreQuestionBank.Select(activityId, cursor or 0)
	if question == nil then
		return nil
	end
	return publicActivity(activity, question)
end

local function masteryTier(loopRuns: number): (string, number?)
	if loopRuns >= 10 then
		return "Brightside Pro", nil
	elseif loopRuns >= 5 then
		return "Trailblazer", 10
	elseif loopRuns >= 3 then
		return "Pathfinder", 5
	elseif loopRuns >= 1 then
		return "Explorer", 3
	end
	return "Rookie", 1
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

	local tier, nextMilestoneLoops = masteryTier(state.LoopRuns)
	local recommendedQuestion = if recommendedActivityId ~= nil
		then CoreQuestionBank.Select(recommendedActivityId, questionCursor(profileData, recommendedActivityId))
		else nil

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
		recommendedQuestionId = if recommendedQuestion ~= nil then recommendedQuestion.Id else nil,
		challenge = {
			name = Config.ChallengeName,
			completed = #completedIds,
			goal = #Config.Activities,
			tier = tier,
			nextMilestoneLoops = nextMilestoneLoops,
		},
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

function CoreGameLoopService.new(profiles, replicas, telemetry)
	assert(profiles ~= nil, "profiles dependency is required")
	assert(replicas ~= nil, "replicas dependency is required")

	local self = setmetatable({}, CoreGameLoopService)
	self._profiles = profiles
	self._replicas = replicas
	self._telemetry = telemetry
	self._sessions = {}
	self._lastSubmitAt = {}
	self._connections = {}
	self._playerSpawnConnections = {}

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
	removePrototypeWorld()
	self._anchorFolder, self._prompts, self._spawnCFrame = buildWorldBindings()

	for activityId, prompt in self._prompts do
		table.insert(self._connections, prompt.Triggered:Connect(function(player: Player)
			if self._profiles:Get(player) == nil then
				self._activityOpened:FireClient(player, {
					status = "loading",
					message = "Your StarBlox profile is still loading. Try again in a moment.",
				})
				return
			end

			local activity = activityById(activityId)
			local selectedQuestion = nil
			self._profiles:WithProfile(player, function(data)
				selectedQuestion = CoreQuestionBank.Select(
					activityId,
					questionCursor(data, activityId)
				)
			end)
			if activity == nil or selectedQuestion == nil then
				self._activityOpened:FireClient(player, {
					status = "unavailable",
					message = "This activity is refreshing. Try again in a moment.",
				})
				return
			end

			self._sessions[player] = {
				activityId = activityId,
				questionId = selectedQuestion.Id,
				openedAt = os.clock(),
			}
			if self._telemetry ~= nil then
				self._telemetry:RecordServerEvent(player, "station_opened", {
					activityId = activityId,
					questionId = selectedQuestion.Id,
				})
			end
			self._activityOpened:FireClient(player, {
				status = "ready",
				activity = publicActivity(activity, selectedQuestion),
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

function CoreGameLoopService:_placeCharacterAtWorldSpawn(character: Model)
	local root = character:WaitForChild("HumanoidRootPart", 5)
	if root ~= nil and root:IsA("BasePart") then
		character:PivotTo(self._spawnCFrame)
	end
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

	local previousSpawnConnection = self._playerSpawnConnections[player]
	if previousSpawnConnection then
		previousSpawnConnection:Disconnect()
	end
	self._playerSpawnConnections[player] = player.CharacterAdded:Connect(function(character: Model)
		task.defer(function()
			self:_placeCharacterAtWorldSpawn(character)
		end)
	end)

	if player.Character ~= nil then
		local character = player.Character
		task.defer(function()
			self:_placeCharacterAtWorldSpawn(character)
		end)
	end
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

	if not CoreGameLoopService.GradeAnswer(session.questionId, request.choice) then
		if self._telemetry ~= nil then
			self._telemetry:RecordServerEvent(player, "answer_wrong", {
				activityId = session.activityId,
				questionId = session.questionId,
			})
		end
		return {
			ok = true,
			correct = false,
			message = "Almost! Try another answer.",
		}
	end

	local completion = nil
	local questionReward = nil
	local latestEconomy = nil
	local statusSnapshot = nil
	local found = self._profiles:WithProfile(player, function(data)
		questionReward = CoreGameLoopService.ApplyCorrectQuestionReward(
			data,
			session.activityId,
			session.questionId
		)
		if questionReward.ok ~= true then
			return
		end

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

	if not found or questionReward == nil or questionReward.ok ~= true then
		return {ok = false, code = if questionReward ~= nil then questionReward.code else "profile_unavailable"}
	end
	if completion == nil or completion.ok ~= true or latestEconomy == nil then
		return {ok = false, code = "profile_unavailable"}
	end

	local answeredQuestion = CoreQuestionBank.GetById(session.questionId)
	local activity = activityById(session.activityId)

	if self._telemetry ~= nil then
		self._telemetry:RecordServerEvent(player, "answer_correct", {
			activityId = session.activityId,
			questionId = session.questionId,
		})
		if completion.loopCompleted == true then
			self._telemetry:RecordServerEvent(player, "loop_completed", {
				activityId = session.activityId,
				questionId = session.questionId,
			})
		end
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

	local stationName = if activity ~= nil then activity.StationName else "Activity"
	local explanation = if answeredQuestion ~= nil then answeredQuestion.Explanation else nil
	local rewardSummary = string.format(
		"+%d coins",
		questionReward.coins
	)
	if completion.rewardEligible == true and activity ~= nil then
		local challengeXp = activity.Reward.XP
		local challengeStars = activity.Reward.Stars
		if completion.loopCompleted == true then
			challengeXp += Config.LoopReward.XP
			challengeStars += Config.LoopReward.Stars
		end
		if challengeXp > 0 then
			rewardSummary = rewardSummary .. string.format(" • +%d XP", challengeXp)
		end
		if challengeStars > 0 then
			rewardSummary = rewardSummary .. string.format(" • +%d star", challengeStars)
		end
	end

	return {
		ok = true,
		correct = true,
		message = completion.loopCompleted
			and "Neighborhood Challenge complete! New run unlocked."
			or stationName .. " cleared! Keep exploring.",
		explanation = explanation,
		rewardSummary = rewardSummary,
		challengeComplete = completion.loopCompleted == true,
		cosmeticUnlocked = completion.cosmeticUnlocked == true,
		questionId = session.questionId,
		nextQuestionId = if nextQuestion ~= nil then nextQuestion.Id else nil,
		completion = completion,
		status = statusSnapshot,
		economy = latestEconomy,
	}
end

function CoreGameLoopService:GetSpawnCFrame(): CFrame
	return self._spawnCFrame
end

function CoreGameLoopService:PlayerRemoving(player: Player)
	self._sessions[player] = nil
	self._lastSubmitAt[player] = nil
	local spawnConnection = self._playerSpawnConnections[player]
	if spawnConnection then
		spawnConnection:Disconnect()
		self._playerSpawnConnections[player] = nil
	end
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
	for player, connection in self._playerSpawnConnections do
		connection:Disconnect()
		self._playerSpawnConnections[player] = nil
	end
	if self._anchorFolder ~= nil and self._anchorFolder.Parent ~= nil then
		self._anchorFolder:Destroy()
	end
end

return CoreGameLoopService
