--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)

local SchoolProgressService = {}

local function utcDayKey(): string
	return os.date("!%Y-%m-%d")
end

local function ensureRewardState(profileData)
	local school = profileData.School
	school.RewardState = type(school.RewardState) == "table" and school.RewardState or {}
	local state = school.RewardState
	local day = utcDayKey()

	if state.UtcDay ~= day then
		state.UtcDay = day
		state.RewardedSchoolDays = 0
		state.DayEligibility = {}
		state.Receipts = {}
	end

	state.DayEligibility = type(state.DayEligibility) == "table" and state.DayEligibility or {}
	state.Receipts = type(state.Receipts) == "table" and state.Receipts or {}
	state.RewardedSchoolDays = math.max(0, tonumber(state.RewardedSchoolDays) or 0)
	return state
end

local function dayEligible(profileData, schoolDayId: string): boolean
	local state = ensureRewardState(profileData)
	local existing = state.DayEligibility[schoolDayId]
	if existing ~= nil then return existing == true end

	local allowed = state.RewardedSchoolDays < Config.Rewards.MaxRewardedSchoolDaysPerUtcDay
	state.DayEligibility[schoolDayId] = allowed
	if allowed then state.RewardedSchoolDays += 1 end
	return allowed
end

local function claimReceipt(profileData, key: string): boolean
	local state = ensureRewardState(profileData)
	if state.Receipts[key] == true then return false end
	state.Receipts[key] = true
	return true
end

local function ensureSkillStats(profileData)
	profileData.Learning = profileData.Learning or {}
	profileData.Learning.SkillStats =
		type(profileData.Learning.SkillStats) == "table"
		and profileData.Learning.SkillStats
		or {}
	return profileData.Learning.SkillStats
end

function SchoolProgressService.RecordLearningAttempt(profileData, question, firstTryCorrect: boolean)
	if question == nil then return end

	local key = tostring(question.Skill or question.Domain or "unknown")
	local all = ensureSkillStats(profileData)
	local stats = all[key]
	if type(stats) ~= "table" then
		stats = {Seen = 0, Correct = 0, Wrong = 0, ConsecutiveCorrect = 0, ConsecutiveWrong = 0}
		all[key] = stats
	end

	stats.Seen = (tonumber(stats.Seen) or 0) + 1
	if firstTryCorrect then
		stats.Correct = (tonumber(stats.Correct) or 0) + 1
		stats.ConsecutiveCorrect = (tonumber(stats.ConsecutiveCorrect) or 0) + 1
		stats.ConsecutiveWrong = 0
	else
		stats.Wrong = (tonumber(stats.Wrong) or 0) + 1
		stats.ConsecutiveWrong = (tonumber(stats.ConsecutiveWrong) or 0) + 1
		stats.ConsecutiveCorrect = 0
	end
end

function SchoolProgressService.ApplyCorrectAnswer(profileData, schoolDayId: string, periodId: string, questionId: string)
	local key = schoolDayId .. "|" .. periodId .. "|" .. questionId .. "|correct"
	if not claimReceipt(profileData, key) then
		return {rewarded = false, duplicate = true, coins = 0, xp = 0, stars = 0}
	end
	if not dayEligible(profileData, schoolDayId) then
		return {rewarded = false, capped = true, coins = 0, xp = 0, stars = 0}
	end

	profileData.Economy.Coins += Config.Rewards.QuestionCoins
	profileData.Economy.XP += Config.Rewards.QuestionXP
	return {rewarded = true, coins = Config.Rewards.QuestionCoins, xp = Config.Rewards.QuestionXP, stars = 0}
end

function SchoolProgressService.ApplyClassCompletion(profileData, schoolDayId: string, periodId: string)
	local key = schoolDayId .. "|" .. periodId .. "|class-complete"
	if not claimReceipt(profileData, key) then return {rewarded = false, duplicate = true, xp = 0} end
	if not dayEligible(profileData, schoolDayId) then return {rewarded = false, capped = true, xp = 0} end

	profileData.Economy.XP += Config.Rewards.ClassCompletionXP
	return {rewarded = true, xp = Config.Rewards.ClassCompletionXP}
end

function SchoolProgressService.ApplyFullDay(profileData, schoolDayId: string)
	local key = schoolDayId .. "|full-day"
	if not claimReceipt(profileData, key) then return {rewarded = false, duplicate = true, xp = 0, stars = 0} end
	if not dayEligible(profileData, schoolDayId) then return {rewarded = false, capped = true, xp = 0, stars = 0} end

	profileData.Economy.XP += Config.Rewards.FullDayXP
	profileData.Economy.Stars += Config.Rewards.FullDayStars
	return {rewarded = true, xp = Config.Rewards.FullDayXP, stars = Config.Rewards.FullDayStars}
end

return SchoolProgressService
