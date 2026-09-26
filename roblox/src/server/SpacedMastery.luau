--!strict

local SpacedMastery = {}

local function pilotState(profileData)
	local learning = profileData.Learning
	if type(learning) ~= "table" then return {} end
	return if type(learning.Pilot) == "table" then learning.Pilot else {}
end

function SpacedMastery.IsUnlocked(profileData, config): boolean
	if type(config) ~= "table" or config.Enabled ~= true then return false end
	local pilot = pilotState(profileData)
	return (tonumber(pilot.QuestionsCompleted) or 0) >= (tonumber(config.UnlockMinQuestionsCompleted) or math.huge)
		and (tonumber(pilot.SessionsCompleted) or 0) >= (tonumber(config.UnlockMinCompletedSessions) or math.huge)
end

local function ensureRoot(profileData)
	profileData.Learning = type(profileData.Learning) == "table" and profileData.Learning or {}
	profileData.Learning.SpacedMasteryBySkill =
		type(profileData.Learning.SpacedMasteryBySkill) == "table"
		and profileData.Learning.SpacedMasteryBySkill
		or {}
	return profileData.Learning.SpacedMasteryBySkill
end

local function ensureSkill(profileData, skill: string)
	local root = ensureRoot(profileData)
	local state = root[skill]
	if type(state) ~= "table" then
		state = {}
		root[skill] = state
	end
	state.Stage = math.max(0, math.floor(tonumber(state.Stage) or 0))
	state.DueAt = math.max(0, math.floor(tonumber(state.DueAt) or 0))
	state.LastRetrievalAt = math.max(0, math.floor(tonumber(state.LastRetrievalAt) or 0))
	state.Successes = math.max(0, math.floor(tonumber(state.Successes) or 0))
	state.Misses = math.max(0, math.floor(tonumber(state.Misses) or 0))
	state.Mastered = state.Mastered == true
	return state
end

local function intervals(config)
	return if type(config.IntervalsSeconds) == "table" then config.IntervalsSeconds else {14400, 172800, 604800, 1209600}
end

local function delayForStage(config, stage: number): number
	local values = intervals(config)
	local index = math.clamp(stage + 1, 1, #values)
	return math.max(60, math.floor(tonumber(values[index]) or 14400))
end

function SpacedMastery.Observe(profileData, skill: string, correct: boolean, now: number, config)
	if not SpacedMastery.IsUnlocked(profileData, config) then return nil end
	local state = ensureSkill(profileData, skill)
	local cleanNow = math.max(0, math.floor(now))
	if not correct then
		state.Stage = math.max(0, math.floor(tonumber(config.MissResetStage) or 0))
		state.Mastered = false
		state.Misses += 1
		state.DueAt = cleanNow + delayForStage(config, 0)
	elseif state.DueAt <= 0 then
		state.DueAt = cleanNow + delayForStage(config, 0)
	end
	return state
end

function SpacedMastery.RecordRetrieval(profileData, skill: string, correct: boolean, now: number, config)
	if not SpacedMastery.IsUnlocked(profileData, config) then return nil end
	local state = ensureSkill(profileData, skill)
	local cleanNow = math.max(0, math.floor(now))
	state.LastRetrievalAt = cleanNow
	if correct then
		state.Stage += 1
		state.Successes += 1
		state.Mastered = state.Stage >= math.max(1, math.floor(tonumber(config.MasteredStage) or 3))
		state.DueAt = cleanNow + delayForStage(config, state.Stage)
	else
		state.Stage = math.max(0, math.floor(tonumber(config.MissResetStage) or 0))
		state.Mastered = false
		state.Misses += 1
		state.DueAt = cleanNow + delayForStage(config, 0)
	end
	return state
end

function SpacedMastery.IsDue(profileData, skill: string, now: number, config): boolean
	if not SpacedMastery.IsUnlocked(profileData, config) then return false end
	local root = ensureRoot(profileData)
	local state = root[skill]
	if type(state) ~= "table" then return false end
	local dueAt = tonumber(state.DueAt) or 0
	return dueAt > 0 and dueAt <= now
end

function SpacedMastery.DueScore(profileData, skill: string, now: number, config): number
	if not SpacedMastery.IsUnlocked(profileData, config) then return 0 end
	local root = ensureRoot(profileData)
	local state = root[skill]
	if type(state) ~= "table" then return 0 end
	local dueAt = tonumber(state.DueAt) or 0
	if dueAt <= 0 then return 0 end
	if dueAt <= now then
		local overdue = math.max(0, now - dueAt)
		return math.clamp(0.75 + (overdue / 604800) * 0.25, 0.75, 1)
	end
	local untilDue = dueAt - now
	return math.clamp(1 - (untilDue / 604800), 0, 0.5)
end

function SpacedMastery.GetState(profileData, skill: string)
	local root = ensureRoot(profileData)
	return root[skill]
end

return table.freeze(SpacedMastery)
