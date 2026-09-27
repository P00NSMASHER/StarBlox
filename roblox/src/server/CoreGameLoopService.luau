--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local Config = require(ReplicatedStorage.StarBlox.CoreLoopConfig)
local SchoolConfig = require(ReplicatedStorage.StarBlox.SchoolConfig)
local BrookhavenMirrorConfig = require(ReplicatedStorage.StarBlox.BrookhavenMirrorConfig)
local DefaultWorldBindings = require(ReplicatedStorage.StarBlox.WorldActivityBindings)
local LegacyWorldBindings = require(ReplicatedStorage.StarBlox.LegacyWorldActivityBindings)
local WorldBindings = if BrookhavenMirrorConfig.World.Mode == "legacy-reference-safe-world"
	then LegacyWorldBindings
	else DefaultWorldBindings
local CoreQuestionBank = require(script.Parent.CoreQuestionBank)
local PilotQuestionMixer = require(script.Parent.PilotQuestionMixer)
local LearningPriority = require(script.Parent.LearningPriority)
local SpacedMastery = require(script.Parent.SpacedMastery)

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

local function applyTownCenterVisualPolish(worldRoot: Model, spawnSource: BasePart)
	local center = spawnSource.Position
	local recoloredGround = 0
	local hiddenHolidayMeshes = 0
	local softenedNeon = 0
	local softenedLights = 0

	-- v31 diagnostics identified the exact checkerboard grid in the published
	-- legacy staging place. It is LBH_14342..LBH_14376: thirty-five 15x7x15
	-- tiles alternating dark red/green at the spawn elevation. Targeting these
	-- exact generated IDs avoids another color-heuristic miss.
	for index = 14342, 14376 do
		local part = worldRoot:FindFirstChild(string.format("LBH_%05d", index), true)
		if part ~= nil and part:IsA("BasePart") then
			part.Color = Color3.fromRGB(194, 194, 190)
			part.Material = Enum.Material.Concrete
			part.Reflectance = 0
			recoloredGround += 1
		end
	end

	-- The giant saturated holiday cluster directly behind the town-center spawn
	-- was also isolated live on v31 as LBH_10677..LBH_10683. These meshes are
	-- presentation-only and dominate the skyline; hide the whole exact cluster.
	for index = 10677, 10683 do
		local part = worldRoot:FindFirstChild(string.format("LBH_%05d", index), true)
		if part ~= nil and part:IsA("BasePart") then
			part.Transparency = 1
			part.CanCollide = false
			part.CanTouch = false
			part.CanQuery = false
			part.CastShadow = false
			hiddenHolidayMeshes += 1
		end
	end

	for _, descendant in worldRoot:GetDescendants() do
		if descendant:IsA("BasePart") then
			local delta = descendant.Position - center
			local horizontalDistance = Vector3.new(delta.X, 0, delta.Z).Magnitude
			if horizontalDistance <= 38 and descendant.Material == Enum.Material.Neon then
				descendant.Material = Enum.Material.SmoothPlastic
				descendant.Reflectance = 0
				softenedNeon += 1
			end
		elseif descendant:IsA("PointLight") or descendant:IsA("SpotLight") or descendant:IsA("SurfaceLight") then
			local parentPart = descendant.Parent
			if parentPart ~= nil and parentPart:IsA("BasePart") then
				local delta = parentPart.Position - center
				local horizontalDistance = Vector3.new(delta.X, 0, delta.Z).Magnitude
				if horizontalDistance <= 42 then
					local light = descendant :: any
					light.Brightness = math.min(tonumber(light.Brightness) or 1, 0.7)
					light.Range = math.min(tonumber(light.Range) or 12, 12)
					softenedLights += 1
				end
			end
		end
	end

	worldRoot:SetAttribute("TownCenterVisualPolishApplied", true)
	worldRoot:SetAttribute("TownCenterGroundTilesRecolored", recoloredGround)
	worldRoot:SetAttribute("TownCenterHolidayMeshesHidden", hiddenHolidayMeshes)
	worldRoot:SetAttribute("TownCenterNeonPartsSoftened", softenedNeon)
	worldRoot:SetAttribute("TownCenterLightsSoftened", softenedLights)
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
		if binding == nil then
			continue
		end

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
		prompt.Enabled = BrookhavenMirrorConfig.LearningPresentation.LegacyWorldStationsEnabled == true
			and SchoolConfig.FeatureFlags.SchoolSystemEnabled ~= true
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
	local fountainSource = resolveWorldPart(
		worldRoot,
		WorldBindings.Spawn.FacingSourcePartName,
		"player spawn facing"
	)
	applyTownCenterVisualPolish(worldRoot, spawnSource)

	local spawnCFrame = worldTopCFrame(spawnSource, WorldBindings.Spawn.HeightOffset)
	local spawnPosition = spawnCFrame.Position
	local fountainLookAt = Vector3.new(
		fountainSource.Position.X,
		spawnPosition.Y,
		fountainSource.Position.Z
	)
	if (fountainLookAt - spawnPosition).Magnitude > 0.001 then
		spawnCFrame = CFrame.lookAt(spawnPosition, fountainLookAt)
	end

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
	local snapshotId = CoreQuestionBank.Source.BankSnapshotId or CoreQuestionBank.Source.PackSourceHash or ""
	if type(snapshotId) == "string"
		and snapshotId ~= ""
		and profileData.Learning.QuestionBankSnapshotId ~= snapshotId
	then
		profileData.Learning.QuestionCursorByStation = {}
		profileData.Learning.RecentQuestionIds = {}
		profileData.Learning.QuestionBankSnapshotId = snapshotId
	end
	profileData.Learning.QuestionCursorByStation =
		type(profileData.Learning.QuestionCursorByStation) == "table"
		and profileData.Learning.QuestionCursorByStation
		or {}
	profileData.Learning.RecentQuestionIds =
		type(profileData.Learning.RecentQuestionIds) == "table"
		and profileData.Learning.RecentQuestionIds
		or {}
	profileData.Learning.AdaptiveByStation =
		type(profileData.Learning.AdaptiveByStation) == "table"
		and profileData.Learning.AdaptiveByStation
		or {}
	profileData.Learning.SkillStats =
		type(profileData.Learning.SkillStats) == "table"
		and profileData.Learning.SkillStats
		or {}
	profileData.Learning.SpacedMasteryBySkill =
		type(profileData.Learning.SpacedMasteryBySkill) == "table"
		and profileData.Learning.SpacedMasteryBySkill
		or {}
	profileData.Learning.Automation =
		type(profileData.Learning.Automation) == "table"
		and profileData.Learning.Automation
		or {}
	profileData.Learning.Experiments =
		type(profileData.Learning.Experiments) == "table"
		and profileData.Learning.Experiments
		or {}
	profileData.Learning.WrongStreak = math.max(0, math.floor(tonumber(profileData.Learning.WrongStreak) or 0))
	return profileData.Learning.QuestionCursorByStation
end

local function ensurePilotState(profileData)
	ensureQuestionState(profileData)
	local pilot = profileData.Learning.Pilot
	if type(pilot) ~= "table" then
		pilot = {}
		profileData.Learning.Pilot = pilot
	end
	pilot.SessionsStarted = math.max(0, math.floor(tonumber(pilot.SessionsStarted) or 0))
	pilot.SessionsCompleted = math.max(0, math.floor(tonumber(pilot.SessionsCompleted) or 0))
	pilot.QuestionsCompleted = math.max(0, math.floor(tonumber(pilot.QuestionsCompleted) or 0))
	pilot.LastCompletedAt = math.max(0, math.floor(tonumber(pilot.LastCompletedAt) or 0))
	return pilot
end

local function ensureAutomationState(profileData)
	ensureQuestionState(profileData)
	local automation = profileData.Learning.Automation
	automation.PriorityUnlockedAt = math.max(0, math.floor(tonumber(automation.PriorityUnlockedAt) or 0))
	automation.SpacedMasteryUnlockedAt = math.max(0, math.floor(tonumber(automation.SpacedMasteryUnlockedAt) or 0))
	automation.LastPrioritySelectionAt = math.max(0, math.floor(tonumber(automation.LastPrioritySelectionAt) or 0))
	local now = os.time()
	if LearningPriority.IsUnlocked(profileData, Config.LearningAutomation.Step5Priority)
		and automation.PriorityUnlockedAt <= 0
	then
		automation.PriorityUnlockedAt = now
	end
	if SpacedMastery.IsUnlocked(profileData, Config.LearningAutomation.Step6SpacedMastery)
		and automation.SpacedMasteryUnlockedAt <= 0
	then
		automation.SpacedMasteryUnlockedAt = now
	end
	return automation
end

local function questionCursor(profileData, activityId: string): number
	local cursors = ensureQuestionState(profileData)
	return math.max(0, math.floor(tonumber(cursors[activityId]) or 0))
end

local function ensureAdaptiveState(profileData, activityId: string)
	ensureQuestionState(profileData)
	local all = profileData.Learning.AdaptiveByStation
	local raw = all[activityId]
	if type(raw) ~= "table" then
		raw = {}
		all[activityId] = raw
	end
	raw.Difficulty = math.clamp(
		math.floor(tonumber(raw.Difficulty) or Config.AdaptiveQuestioning.MinDifficulty),
		Config.AdaptiveQuestioning.MinDifficulty,
		Config.AdaptiveQuestioning.MaxDifficulty
	)
	raw.CorrectStreak = math.max(0, math.floor(tonumber(raw.CorrectStreak) or 0))
	raw.WrongStreak = math.max(0, math.floor(tonumber(raw.WrongStreak) or 0))
	return raw
end

local function targetDifficulty(profileData, activityId: string): number
	return ensureAdaptiveState(profileData, activityId).Difficulty
end

local function rubricScore(question, choice: any, correct: boolean): (number, number)
	local rubric = if question ~= nil and type(question.Rubric) == "table" then question.Rubric else nil
	local maxPoints = math.max(1, math.floor(tonumber(rubric and rubric.maxPoints) or 2))
	if correct then
		return maxPoints, maxPoints
	end
	local partial = if rubric ~= nil and type(rubric.partialCredit) == "table" then rubric.partialCredit else nil
	local points = if partial ~= nil then tonumber(partial[tostring(choice)]) or 0 else 0
	return math.clamp(math.floor(points), 0, maxPoints - 1), maxPoints
end

local function recordLearningAttempt(
	profileData,
	question,
	correct: boolean,
	rubricPoints: number?,
	rubricMaxPoints: number?,
	updateAdaptive: boolean?,
	misconception: string?,
	spacedRetrieval: boolean?,
	firstAttempt: boolean?
)
	if question == nil then
		return nil, nil
	end
	ensureQuestionState(profileData)
	local skillKey = tostring(question.Skill or question.Domain or "unknown")
	local stats = profileData.Learning.SkillStats[skillKey]
	if type(stats) ~= "table" then
		stats = {
			Seen = 0,
			Correct = 0,
			Wrong = 0,
			Partial = 0,
			RubricPoints = 0,
			RubricMaxPoints = 0,
			ConsecutiveCorrect = 0,
			ConsecutiveWrong = 0,
			LastSeenAt = 0,
			LastCorrectAt = 0,
			LastWrongAt = 0,
			MisconceptionCounts = {},
		}
		profileData.Learning.SkillStats[skillKey] = stats
	end
	stats.Seen = math.max(0, math.floor(tonumber(stats.Seen) or 0)) + 1
	stats.Correct = math.max(0, math.floor(tonumber(stats.Correct) or 0))
	stats.Wrong = math.max(0, math.floor(tonumber(stats.Wrong) or 0))
	stats.Partial = math.max(0, math.floor(tonumber(stats.Partial) or 0))
	stats.RubricPoints = math.max(0, math.floor(tonumber(stats.RubricPoints) or 0))
	stats.RubricMaxPoints = math.max(0, math.floor(tonumber(stats.RubricMaxPoints) or 0))
	stats.ConsecutiveCorrect = math.max(0, math.floor(tonumber(stats.ConsecutiveCorrect) or 0))
	stats.ConsecutiveWrong = math.max(0, math.floor(tonumber(stats.ConsecutiveWrong) or 0))
	stats.LastSeenAt = math.max(0, math.floor(tonumber(stats.LastSeenAt) or 0))
	stats.LastCorrectAt = math.max(0, math.floor(tonumber(stats.LastCorrectAt) or 0))
	stats.LastWrongAt = math.max(0, math.floor(tonumber(stats.LastWrongAt) or 0))
	stats.MisconceptionCounts = type(stats.MisconceptionCounts) == "table" and stats.MisconceptionCounts or {}
	local attemptNow = os.time()
	stats.LastSeenAt = attemptNow

	local awarded = math.max(0, math.floor(tonumber(rubricPoints) or 0))
	local possible = math.max(1, math.floor(tonumber(rubricMaxPoints) or 2))
	stats.RubricPoints += awarded
	stats.RubricMaxPoints += possible
	if not correct and awarded > 0 then
		stats.Partial += 1
	end

	local adaptive = nil
	local mutateAdaptive = updateAdaptive ~= false
	if mutateAdaptive then
		adaptive = ensureAdaptiveState(profileData, question.StationId)
	end
	if correct then
		stats.Correct += 1
		stats.ConsecutiveCorrect += 1
		stats.ConsecutiveWrong = 0
		stats.LastCorrectAt = attemptNow
		if adaptive ~= nil then
			adaptive.CorrectStreak += 1
			adaptive.WrongStreak = 0
			profileData.Learning.WrongStreak = 0
			if adaptive.CorrectStreak >= Config.AdaptiveQuestioning.PromoteAfterCorrect then
				adaptive.Difficulty = math.min(Config.AdaptiveQuestioning.MaxDifficulty, adaptive.Difficulty + 1)
				adaptive.CorrectStreak = 0
			end
		end
	else
		stats.Wrong += 1
		stats.ConsecutiveWrong += 1
		stats.ConsecutiveCorrect = 0
		stats.LastWrongAt = attemptNow
		if type(misconception) == "string" and misconception ~= "" then
			stats.MisconceptionCounts[misconception] = (stats.MisconceptionCounts[misconception] or 0) + 1
		end
		if adaptive ~= nil then
			adaptive.WrongStreak += 1
			adaptive.CorrectStreak = 0
			profileData.Learning.WrongStreak += 1
			if adaptive.WrongStreak >= Config.AdaptiveQuestioning.ScaffoldAfterWrong then
				adaptive.Difficulty = Config.AdaptiveQuestioning.MinDifficulty
			end
		end
	end
	if firstAttempt ~= false and SpacedMastery.IsUnlocked(profileData, Config.LearningAutomation.Step6SpacedMastery) then
		if spacedRetrieval == true then
			SpacedMastery.RecordRetrieval(
				profileData,
				skillKey,
				correct,
				attemptNow,
				Config.LearningAutomation.Step6SpacedMastery
			)
		else
			SpacedMastery.Observe(
				profileData,
				skillKey,
				correct,
				attemptNow,
				Config.LearningAutomation.Step6SpacedMastery
			)
		end
	end
	ensureAutomationState(profileData)
	return adaptive, stats
end

local function experimentVariant(profileData, question): (string?, string?)
	if question == nil or type(question.Experiment) ~= "table" then
		return nil, nil
	end
	ensureQuestionState(profileData)
	local experimentId = tostring(question.Experiment.id or "")
	if experimentId == "" then
		return nil, nil
	end
	local existing = profileData.Learning.Experiments[experimentId]
	if existing == "A" or existing == "B" then
		return experimentId, existing
	end
	local percent = math.clamp(
		math.floor(tonumber(question.Experiment.treatmentPercent) or Config.QuestionExperiments.TreatmentPercent),
		5,
		10
	)
	local variant = if math.random(1, 100) <= percent
		then Config.QuestionExperiments.TreatmentVariant
		else Config.QuestionExperiments.ControlVariant
	profileData.Learning.Experiments[experimentId] = variant
	return experimentId, variant
end

local function responseTimeBand(startedAt: any): string
	local elapsed = math.max(0, os.clock() - (tonumber(startedAt) or os.clock()))
	if elapsed < 5 then return "under-5s" end
	if elapsed < 15 then return "5-15s" end
	if elapsed < 30 then return "15-30s" end
	return "30s-plus"
end

local function choiceIndex(question, choice: any): number?
	if question == nil or type(question.Choices) ~= "table" then return nil end
	for index, candidate in question.Choices do
		if tostring(candidate) == tostring(choice) then return index end
	end
	return nil
end

local function selectedQuestionFor(profileData, activityId: string)
	local cursor = questionCursor(profileData, activityId)
	local difficulty = targetDifficulty(profileData, activityId)
	local selected = LearningPriority.SelectForStation(
		profileData,
		CoreQuestionBank,
		activityId,
		cursor,
		difficulty,
		Config.LearningAutomation,
		os.time()
	)
	if selected ~= nil and LearningPriority.IsUnlocked(profileData, Config.LearningAutomation.Step5Priority) then
		local automation = ensureAutomationState(profileData)
		automation.LastPrioritySelectionAt = os.time()
	end
	return selected
end

local function publicActivity(activity, question, profileData)
	assert(question ~= nil, "question is required for public activity")
	local experimentId = nil
	local variantId = nil
	if profileData ~= nil then
		experimentId, variantId = experimentVariant(profileData, question)
	end
	local showRich = question.RichContent ~= nil
	if experimentId ~= nil then
		showRich = variantId == Config.QuestionExperiments.TreatmentVariant
	end
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
		difficulty = question.Difficulty,
		dok = question.DOK,
		cognitiveDemand = question.CognitiveDemand,
		standards = if type(question.Standards) == "table" then table.clone(question.Standards) else {},
		rubricMaxPoints = if type(question.Rubric) == "table" then tonumber(question.Rubric.maxPoints) or 2 else 2,
		richContent = if showRich then question.RichContent else nil,
		experimentId = experimentId,
		variantId = variantId,
		source = activity.Source,
		sourceWeek = CoreQuestionBank.Source.WeekLabel,
		bankSnapshotId = CoreQuestionBank.Source.BankSnapshotId,
		sourceHash = CoreQuestionBank.Source.PackSourceHash,
		tier = question.Tier,
		provenance = question.Provenance,
		reward = {
			coins = Config.QuestionReward.Coins,
			xp = Config.QuestionReward.XP,
			stars = 0,
		},
	}
end

local function pilotPublicActivity(activity, question, profileData, entry, index: number, total: number)
	local result = publicActivity(activity, question, profileData)
	result.mode = "pilot"
	result.title = string.format("Study Pilot • %d/%d", index, total)
	result.pilotIndex = index
	result.pilotTotal = total
	result.pilotBucket = entry.Bucket
	result.reward = {coins = 0, xp = 0, stars = 0}
	return result
end

function CoreGameLoopService.GradeAnswer(questionId: any, choice: any): boolean
	return CoreQuestionBank.Grade(questionId, choice)
end

function CoreGameLoopService.ApplyCorrectQuestionReward(
	profileData,
	activityId: string,
	questionId: string,
	firstAttempt: boolean?,
	sessionAuthorized: boolean?
)
	local question = CoreQuestionBank.GetById(questionId)
	if question == nil or question.StationId ~= activityId then
		return {ok = false, code = "question_station_mismatch"}
	end

	local currentCursor = questionCursor(profileData, activityId)
	if sessionAuthorized ~= true then
		local expected = selectedQuestionFor(profileData, activityId)
		if expected == nil or expected.Id ~= questionId then
			return {ok = false, code = "stale_question"}
		end
	end

	local cursors = ensureQuestionState(profileData)
	cursors[activityId] = currentCursor + 1
	table.insert(profileData.Learning.RecentQuestionIds, questionId)
	while #profileData.Learning.RecentQuestionIds > 24 do
		table.remove(profileData.Learning.RecentQuestionIds, 1)
	end

	local rubricPoints, rubricMaxPoints = rubricScore(question, question.Answer, true)
	recordLearningAttempt(profileData, question, true, rubricPoints, rubricMaxPoints, true, nil, false, firstAttempt ~= false)
	profileData.Economy.Coins += Config.QuestionReward.Coins
	profileData.Economy.XP += Config.QuestionReward.XP
	local nextQuestion = selectedQuestionFor(profileData, activityId)

	return {
		ok = true,
		coins = Config.QuestionReward.Coins,
		xp = Config.QuestionReward.XP,
		targetDifficulty = targetDifficulty(profileData, activityId),
		nextQuestionId = if nextQuestion ~= nil then nextQuestion.Id else nil,
		rubricScore = rubricPoints,
		rubricMaxPoints = rubricMaxPoints,
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
	return publicActivity(activity, question, nil)
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
		then selectedQuestionFor(profileData, recommendedActivityId)
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
		questionBank = {
			snapshotId = CoreQuestionBank.Source.BankSnapshotId,
			sourceHash = CoreQuestionBank.Source.PackSourceHash,
			sourceWeek = CoreQuestionBank.Source.WeekLabel,
			materialFirst = CoreQuestionBank.Source.MaterialFirst == true,
			starReadingCount = tonumber(CoreQuestionBank.Source.StarReadingCount) or 0,
			starMathCount = tonumber(CoreQuestionBank.Source.StarMathCount) or 0,
		},
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
		pilot = {
			enabled = Config.PilotMode.Enabled == true,
			sessionLength = Config.PilotMode.SessionLength,
			awardsEconomy = Config.PilotMode.AwardsEconomy == true,
			advancesChallenge = Config.PilotMode.AdvancesChallenge == true,
		},
		learningAutomation = {
			step5PriorityUnlocked = LearningPriority.IsUnlocked(profileData, Config.LearningAutomation.Step5Priority),
			step6SpacedMasteryUnlocked = SpacedMastery.IsUnlocked(profileData, Config.LearningAutomation.Step6SpacedMastery),
			questionsCompleted = ensurePilotState(profileData).QuestionsCompleted,
			sessionsCompleted = ensurePilotState(profileData).SessionsCompleted,
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
	self._pilotSessions = {}
	self._lastSubmitAt = {}
	self._lastPilotSubmitAt = {}
	self._connections = {}
	self._playerSpawnConnections = {}

	local oldRemotes = ReplicatedStorage:FindFirstChild(REMOTE_ROOT_NAME)
	if oldRemotes then
		oldRemotes:Destroy()
	end

	local remoteRoot = Instance.new("Folder")
	remoteRoot.Name = REMOTE_ROOT_NAME
	remoteRoot:SetAttribute("LoopId", Config.LoopId)
	remoteRoot:SetAttribute("QuestionBankSnapshotId", CoreQuestionBank.Source.BankSnapshotId or "")
	remoteRoot:SetAttribute("QuestionPackSourceHash", CoreQuestionBank.Source.PackSourceHash or "")
	remoteRoot:SetAttribute("QuestionSourceWeek", CoreQuestionBank.Source.WeekLabel or "")
	remoteRoot:SetAttribute("QuestionMaterialFirst", CoreQuestionBank.Source.MaterialFirst == true)
	remoteRoot:SetAttribute("StarReadingCount", tonumber(CoreQuestionBank.Source.StarReadingCount) or 0)
	remoteRoot:SetAttribute("StarMathCount", tonumber(CoreQuestionBank.Source.StarMathCount) or 0)
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

	local startPilot = Instance.new("RemoteFunction")
	startPilot.Name = "StartPilot"
	startPilot.Parent = remoteRoot

	local submitPilotAnswer = Instance.new("RemoteFunction")
	submitPilotAnswer.Name = "SubmitPilotAnswer"
	submitPilotAnswer.Parent = remoteRoot

	local dismissOnboarding = Instance.new("RemoteEvent")
	dismissOnboarding.Name = "DismissOnboarding"
	dismissOnboarding.Parent = remoteRoot

	self._activityOpened = activityOpened
	self._submitAnswer = submitAnswer
	self._requestStatus = requestStatus
	self._startPilot = startPilot
	self._submitPilotAnswer = submitPilotAnswer
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
			local selectedActivity = nil
			self._profiles:WithProfile(player, function(data)
				selectedQuestion = selectedQuestionFor(data, activityId)
				if activity ~= nil and selectedQuestion ~= nil then
					selectedActivity = publicActivity(activity, selectedQuestion, data)
				end
			end)
			if activity == nil or selectedQuestion == nil or selectedActivity == nil then
				self._activityOpened:FireClient(player, {
					status = "unavailable",
					message = "This activity is refreshing. Try again in a moment.",
				})
				return
			end

			self._sessions[player] = {
				activityId = activityId,
				questionId = selectedQuestion.Id,
				rootQuestionId = selectedQuestion.Id,
				supportMode = false,
				wrongAttempts = 0,
				openedAt = os.clock(),
				questionPresentedAt = os.clock(),
				experimentId = selectedActivity.experimentId,
				variantId = selectedActivity.variantId,
			}
			if self._telemetry ~= nil then
				self._telemetry:RecordServerEvent(player, "station_opened", {
					activityId = activityId,
					questionId = selectedQuestion.Id,
				})
			end
			self._activityOpened:FireClient(player, {
				status = "ready",
				activity = selectedActivity,
			})
		end))
	end

	self._submitAnswer.OnServerInvoke = function(player: Player, request: any)
		return self:_submit(player, request)
	end

	self._requestStatus.OnServerInvoke = function(player: Player)
		return self:_status(player)
	end

	self._startPilot.OnServerInvoke = function(player: Player)
		return self:_startPilotSession(player)
	end

	self._submitPilotAnswer.OnServerInvoke = function(player: Player, request: any)
		return self:_submitPilot(player, request)
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

local function playerSpawnCFrame(baseSpawnCFrame: CFrame, player: Player): CFrame
	local slots = WorldBindings.Spawn.Slots
	if slots == nil or #slots == 0 then
		return baseSpawnCFrame
	end

	local slotIndex = (math.abs(player.UserId) % #slots) + 1
	local slot = slots[slotIndex]
	return baseSpawnCFrame * CFrame.new(slot.X, 0, slot.Z)
end

function CoreGameLoopService:_placeCharacterAtWorldSpawn(player: Player, character: Model)
	local root = character:WaitForChild("HumanoidRootPart", 5)
	if root ~= nil and root:IsA("BasePart") then
		character:PivotTo(playerSpawnCFrame(self._spawnCFrame, player))
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
	player:SetAttribute("StarBloxQuestionBankSnapshotId", CoreQuestionBank.Source.BankSnapshotId or "")
	player:SetAttribute("StarBloxQuestionPackSourceHash", CoreQuestionBank.Source.PackSourceHash or "")
	player:SetAttribute("StarBloxQuestionSourceWeek", CoreQuestionBank.Source.WeekLabel or "")
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
			self:_placeCharacterAtWorldSpawn(player, character)
		end)
	end)

	if player.Character ~= nil then
		local character = player.Character
		task.defer(function()
			self:_placeCharacterAtWorldSpawn(player, character)
		end)
	end
end

function CoreGameLoopService:_startPilotSession(player: Player)
	if Config.PilotMode.Enabled ~= true then
		return {ok = false, code = "pilot_disabled"}
	end
	if self._profiles:Get(player) == nil then
		return {ok = false, code = "profile_unavailable"}
	end

	local response = nil
	local found = self._profiles:WithProfile(player, function(data)
		local pilotState = ensurePilotState(data)
		local baselinePhase =
			Config.PilotMode.FreezeAdaptiveDifficultyDuringBaseline == true
			and pilotState.SessionsCompleted < Config.PilotMode.BaselineMinCompletedSessions
		pilotState.SessionsStarted += 1
		local pilotSessionNumber = pilotState.SessionsStarted
		ensureAutomationState(data)
		local queue = PilotQuestionMixer.Build(
			data,
			CoreQuestionBank,
			Config.PilotMode,
			pilotSessionNumber,
			Config.LearningAutomation
		)
		local first = queue[1]
		local question = if first ~= nil then CoreQuestionBank.GetById(first.QuestionId) else nil
		local activity = if first ~= nil then activityById(first.StationId) else nil
		if first == nil or question == nil or activity == nil then
			return
		end

		local public = pilotPublicActivity(activity, question, data, first, 1, #queue)
		self._pilotSessions[player] = {
			queue = queue,
			index = 1,
			wrongAttempts = 0,
			questionPresentedAt = os.clock(),
			experimentId = public.experimentId,
			variantId = public.variantId,
			baselinePhase = baselinePhase,
			pilotSessionNumber = pilotSessionNumber,
		}
		self._replicas:Sync(player, data)
		response = {
			ok = true,
			activity = public,
			pilotIndex = 1,
			pilotTotal = #queue,
			baselinePhase = baselinePhase,
			pilotSessionNumber = pilotSessionNumber,
		}
	end)

	if not found or response == nil then
		return {ok = false, code = "profile_unavailable"}
	end
	if self._telemetry ~= nil then
		self._telemetry:RecordServerEvent(player, "pilot_started", {
			questionId = response.activity.questionId,
			activityId = response.activity.id,
			baseline = response.baselinePhase == true,
			pilotSessionNumber = response.pilotSessionNumber,
		})
	end
	return response
end

function CoreGameLoopService:_submitPilot(player: Player, request: any)
	local now = os.clock()
	local previous = self._lastPilotSubmitAt[player] or -math.huge
	if now - previous < 0.2 then
		return {ok = false, code = "rate_limited"}
	end
	self._lastPilotSubmitAt[player] = now

	local session = self._pilotSessions[player]
	if session == nil then
		return {ok = false, code = "pilot_not_started"}
	end
	if type(request) ~= "table" or type(request.choice) ~= "string" then
		return {ok = false, code = "invalid_request"}
	end

	local entry = session.queue[session.index]
	local question = if entry ~= nil then CoreQuestionBank.GetById(entry.QuestionId) else nil
	local activity = if entry ~= nil then activityById(entry.StationId) else nil
	if entry == nil or question == nil or activity == nil then
		return {ok = false, code = "invalid_request"}
	end

	local correct = CoreGameLoopService.GradeAnswer(question.Id, request.choice)
	local rubricPoints, rubricMaxPoints = rubricScore(question, request.choice, correct)
	local attemptIndex = math.max(1, math.floor(tonumber(session.wrongAttempts) or 0) + 1)
	local attemptResponseBand = responseTimeBand(session.questionPresentedAt)
	local attemptChoiceIndex = choiceIndex(question, request.choice)
	local attemptExperimentId = session.experimentId
	local attemptVariantId = session.variantId
	local misconception = nil
	if type(question.Misconceptions) == "table" then
		misconception = question.Misconceptions[tostring(request.choice)]
	end

	local nextActivity = nil
	local completed = false
	local found = self._profiles:WithProfile(player, function(data)
		local pilotState = ensurePilotState(data)
		recordLearningAttempt(
			data,
			question,
			correct,
			rubricPoints,
			rubricMaxPoints,
			not (session.baselinePhase == true),
			misconception,
			entry.SpacedRetrieval == true,
			attemptIndex == 1
		)
		if correct then
			pilotState.QuestionsCompleted += 1
			local nextIndex = session.index + 1
			if nextIndex > #session.queue then
				pilotState.SessionsCompleted += 1
				pilotState.LastCompletedAt = os.time()
				completed = true
			else
				session.index = nextIndex
				session.wrongAttempts = 0
				local nextEntry = session.queue[nextIndex]
				local nextQuestion = CoreQuestionBank.GetById(nextEntry.QuestionId)
				local nextStation = activityById(nextEntry.StationId)
				if nextQuestion ~= nil and nextStation ~= nil then
					nextActivity = pilotPublicActivity(
						nextStation,
						nextQuestion,
						data,
						nextEntry,
						nextIndex,
						#session.queue
					)
					session.questionPresentedAt = os.clock()
					session.experimentId = nextActivity.experimentId
					session.variantId = nextActivity.variantId
				end
			end
		else
			session.wrongAttempts = math.max(0, math.floor(tonumber(session.wrongAttempts) or 0)) + 1
		end
		self._replicas:Sync(player, data)
	end)

	if not found then
		return {ok = false, code = "profile_unavailable"}
	end

	if self._telemetry ~= nil then
		self._telemetry:RecordServerEvent(player, "question_attempt", {
			activityId = activity.Id,
			questionId = question.Id,
			contentHash = question.ContentHash,
			correct = correct,
			choiceIndex = attemptChoiceIndex,
			attemptIndex = attemptIndex,
			responseTimeBand = attemptResponseBand,
			misconception = misconception,
			rubricPoints = rubricPoints,
			rubricMaxPoints = rubricMaxPoints,
			support = false,
			experimentId = attemptExperimentId,
			variantId = attemptVariantId,
			pilot = true,
			baseline = session.baselinePhase == true,
			pilotSessionNumber = session.pilotSessionNumber,
			pilotBucket = entry.Bucket,
		})
	end

	if not correct then
		local feedback = "That choice does not fit yet."
		if type(question.WrongFeedback) == "table" then
			feedback = question.WrongFeedback[tostring(request.choice)] or feedback
		end
		return {
			ok = true,
			correct = false,
			message = feedback,
			hint = question.Hint,
			scaffold = if session.wrongAttempts >= 2 then question.Scaffold else nil,
			rubricScore = rubricPoints,
			rubricMaxPoints = rubricMaxPoints,
			partialCredit = rubricPoints > 0,
			pilotIndex = session.index,
			pilotTotal = #session.queue,
		}
	end

	if completed then
		self._pilotSessions[player] = nil
		if self._telemetry ~= nil then
			self._telemetry:RecordServerEvent(player, "pilot_completed", {
				activityId = activity.Id,
				questionId = question.Id,
				baseline = session.baselinePhase == true,
				pilotSessionNumber = session.pilotSessionNumber,
			})
		end
		return {
			ok = true,
			correct = true,
			pilotComplete = true,
			message = "Study Pilot complete — 18 questions finished.",
			explanation = question.Explanation,
			rubricScore = rubricPoints,
			rubricMaxPoints = rubricMaxPoints,
			pilotIndex = #session.queue,
			pilotTotal = #session.queue,
		}
	end

	if nextActivity == nil then
		return {ok = false, code = "pilot_queue_invalid"}
	end
	return {
		ok = true,
		correct = true,
		pilotContinue = true,
		message = "Nice work — next question.",
		explanation = question.Explanation,
		rubricScore = rubricPoints,
		rubricMaxPoints = rubricMaxPoints,
		activity = nextActivity,
		pilotIndex = session.index,
		pilotTotal = #session.queue,
	}
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

	local answeredQuestion = CoreQuestionBank.GetById(session.questionId)
	local activity = activityById(session.activityId)
	if answeredQuestion == nil or activity == nil then
		return {ok = false, code = "invalid_request"}
	end

	local correct = CoreGameLoopService.GradeAnswer(session.questionId, request.choice)
	local rubricPoints, rubricMaxPoints = rubricScore(answeredQuestion, request.choice, correct)
	local attemptIndex = math.max(1, math.floor(tonumber(session.wrongAttempts) or 0) + 1)
	local attemptResponseBand = responseTimeBand(session.questionPresentedAt)
	local attemptChoiceIndex = choiceIndex(answeredQuestion, request.choice)
	local attemptExperimentId = session.experimentId
	local attemptVariantId = session.variantId
	local attemptWasSupport = session.supportMode == true

	if not correct then
		session.wrongAttempts = math.max(0, math.floor(tonumber(session.wrongAttempts) or 0)) + 1
		local feedback = "That choice does not fit yet."
		local hint = answeredQuestion.Hint
		local scaffold = nil
		local misconception = nil
		if type(answeredQuestion.Misconceptions) == "table" then
			misconception = answeredQuestion.Misconceptions[tostring(request.choice)]
		end
		local supportActivity = nil
		local found = self._profiles:WithProfile(player, function(data)
			local adaptive = recordLearningAttempt(
				data,
				answeredQuestion,
				false,
				rubricPoints,
				rubricMaxPoints,
				true,
				misconception,
				false,
				attemptIndex == 1
			)
			if type(answeredQuestion.WrongFeedback) == "table" then
				feedback = answeredQuestion.WrongFeedback[tostring(request.choice)] or feedback
			end

			if session.supportMode ~= true
				and session.wrongAttempts >= Config.AdaptiveQuestioning.ScaffoldAfterWrong
			then
				local support = CoreQuestionBank.FindSupportQuestion(
					session.activityId,
					answeredQuestion.Id,
					if adaptive ~= nil then adaptive.Difficulty else Config.AdaptiveQuestioning.MinDifficulty
				)
				if support ~= nil then
					session.rootQuestionId = session.rootQuestionId or answeredQuestion.Id
					session.questionId = support.Id
					session.supportMode = true
					session.wrongAttempts = 0
					supportActivity = publicActivity(activity, support, data)
					supportActivity.scaffold = true
				else
					scaffold = answeredQuestion.Scaffold
				end
			end
			self._replicas:Sync(player, data)
		end)
		if not found then
			return {ok = false, code = "profile_unavailable"}
		end
		if self._telemetry ~= nil then
			self._telemetry:RecordServerEvent(player, "answer_wrong", {
				activityId = session.activityId,
				questionId = answeredQuestion.Id,
				misconception = misconception,
				scaffolded = supportActivity ~= nil,
			})
			self._telemetry:RecordServerEvent(player, "question_attempt", {
				activityId = session.activityId,
				questionId = answeredQuestion.Id,
				contentHash = answeredQuestion.ContentHash,
				correct = false,
				choiceIndex = attemptChoiceIndex,
				attemptIndex = attemptIndex,
				responseTimeBand = attemptResponseBand,
				misconception = misconception,
				rubricPoints = rubricPoints,
				rubricMaxPoints = rubricMaxPoints,
				support = attemptWasSupport,
				experimentId = attemptExperimentId,
				variantId = attemptVariantId,
			})
		end
		if supportActivity ~= nil then
			session.questionPresentedAt = os.clock()
			session.experimentId = supportActivity.experimentId
			session.variantId = supportActivity.variantId
		end
		return {
			ok = true,
			correct = false,
			message = feedback,
			hint = hint,
			scaffold = scaffold,
			activity = supportActivity,
			rubricScore = rubricPoints,
			rubricMaxPoints = rubricMaxPoints,
			partialCredit = rubricPoints > 0,
		}
	end

	if session.supportMode == true then
		local rootQuestionId = session.rootQuestionId
		local rootQuestion = if type(rootQuestionId) == "string" then CoreQuestionBank.GetById(rootQuestionId) else nil
		if rootQuestion == nil then
			return {ok = false, code = "invalid_request"}
		end
		local rootActivity = nil
		local found = self._profiles:WithProfile(player, function(data)
			recordLearningAttempt(
				data,
				answeredQuestion,
				true,
				rubricPoints,
				rubricMaxPoints,
				true,
				nil,
				false,
				attemptIndex == 1
			)
			rootActivity = publicActivity(activity, rootQuestion, data)
			self._replicas:Sync(player, data)
		end)
		if not found or rootActivity == nil then
			return {ok = false, code = "profile_unavailable"}
		end
		if self._telemetry ~= nil then
			self._telemetry:RecordServerEvent(player, "question_attempt", {
				activityId = session.activityId,
				questionId = answeredQuestion.Id,
				contentHash = answeredQuestion.ContentHash,
				correct = true,
				choiceIndex = attemptChoiceIndex,
				attemptIndex = attemptIndex,
				responseTimeBand = attemptResponseBand,
				rubricPoints = rubricPoints,
				rubricMaxPoints = rubricMaxPoints,
				support = true,
				experimentId = attemptExperimentId,
				variantId = attemptVariantId,
			})
		end
		session.questionId = rootQuestion.Id
		session.supportMode = false
		session.wrongAttempts = 0
		session.questionPresentedAt = os.clock()
		session.experimentId = rootActivity.experimentId
		session.variantId = rootActivity.variantId
		rootActivity.scaffoldReturn = true
		return {
			ok = true,
			correct = true,
			scaffoldCleared = true,
			message = "Nice work. Now use that idea on the original question.",
			explanation = answeredQuestion.Explanation,
			activity = rootActivity,
			rubricScore = rubricPoints,
			rubricMaxPoints = rubricMaxPoints,
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
			session.questionId,
			attemptIndex == 1,
			true
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

	if self._telemetry ~= nil then
		self._telemetry:RecordServerEvent(player, "question_attempt", {
			activityId = session.activityId,
			questionId = answeredQuestion.Id,
			contentHash = answeredQuestion.ContentHash,
			correct = true,
			choiceIndex = attemptChoiceIndex,
			attemptIndex = attemptIndex,
			responseTimeBand = attemptResponseBand,
			rubricPoints = rubricPoints,
			rubricMaxPoints = rubricMaxPoints,
			support = false,
			experimentId = attemptExperimentId,
			variantId = attemptVariantId,
		})
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
		questionId = answeredQuestion.Id,
		nextQuestionId = questionReward.nextQuestionId,
		rubricScore = rubricPoints,
		rubricMaxPoints = rubricMaxPoints,
		completion = completion,
		status = statusSnapshot,
		economy = latestEconomy,
	}
end

function CoreGameLoopService:SetActivityPromptsEnabled(enabled: boolean)
	for _, prompt in self._prompts or {} do
		prompt.Enabled = enabled
			and BrookhavenMirrorConfig.LearningPresentation.LegacyWorldStationsEnabled == true
			and SchoolConfig.FeatureFlags.SchoolSystemEnabled ~= true
	end
end

function CoreGameLoopService:GetSpawnCFrame(): CFrame
	return self._spawnCFrame
end

function CoreGameLoopService:PlayerRemoving(player: Player)
	self._sessions[player] = nil
	self._pilotSessions[player] = nil
	self._lastSubmitAt[player] = nil
	self._lastPilotSubmitAt[player] = nil
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
	for player, _ in self._pilotSessions do
		self._pilotSessions[player] = nil
	end
	for player, _ in self._lastSubmitAt do
		self._lastSubmitAt[player] = nil
	end
	for player, _ in self._lastPilotSubmitAt do
		self._lastPilotSubmitAt[player] = nil
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
