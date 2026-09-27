--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)

local SchoolProgressService = {}

local function utcDayKey(): string
	return os.date("!%Y-%m-%d")
end

local function ensureRewardState(profileData)
	profileData.School = type(profileData.School) == "table" and profileData.School or {}
	local school = profileData.School
	school.RewardState = type(school.RewardState) == "table" and school.RewardState or {}
	local state = school.RewardState
	local day = utcDayKey()

	if state.UtcDay ~= day then
		state.UtcDay = day
		state.RewardedSchoolDays = 0
		state.DayEligibility = {}
		state.Receipts = {}
		state.EarnedBySchoolDay = {}
	end

	state.DayEligibility = type(state.DayEligibility) == "table" and state.DayEligibility or {}
	state.Receipts = type(state.Receipts) == "table" and state.Receipts or {}
	state.EarnedBySchoolDay = type(state.EarnedBySchoolDay) == "table" and state.EarnedBySchoolDay or {}
	state.RewardedSchoolDays = math.max(0, tonumber(state.RewardedSchoolDays) or 0)
	return state
end

local function applyRewardTransaction(
	profileData,
	schoolDayId: string,
	key: string,
	coins: number,
	xp: number,
	stars: number
)
	local state = ensureRewardState(profileData)
	if state.Receipts[key] == true then
		return {rewarded = false, duplicate = true, coins = 0, xp = 0, stars = 0}
	end

	local previousEligibility = state.DayEligibility[schoolDayId]
	local previousRewardedSchoolDays = state.RewardedSchoolDays
	local eligible = previousEligibility
	if eligible == nil then
		eligible = previousRewardedSchoolDays < Config.Rewards.MaxRewardedSchoolDaysPerUtcDay
	end
	if eligible ~= true then
		state.DayEligibility[schoolDayId] = false
		return {rewarded = false, capped = true, coins = 0, xp = 0, stars = 0}
	end

	profileData.Economy = type(profileData.Economy) == "table" and profileData.Economy or {}
	local economy = profileData.Economy
	local previousCoins = math.max(0, tonumber(economy.Coins) or 0)
	local previousXP = math.max(0, tonumber(economy.XP) or 0)
	local previousStars = math.max(0, tonumber(economy.Stars) or 0)
	local awardCoins = math.max(0, tonumber(coins) or 0)
	local awardXP = math.max(0, tonumber(xp) or 0)
	local awardStars = math.max(0, tonumber(stars) or 0)

	local existingEarnings = state.EarnedBySchoolDay[schoolDayId]
	local hadEarnings = type(existingEarnings) == "table"
	local earnings = if hadEarnings then existingEarnings else {Coins = 0, XP = 0, Stars = 0}
	local previousEarnedCoins = math.max(0, tonumber(earnings.Coins) or 0)
	local previousEarnedXP = math.max(0, tonumber(earnings.XP) or 0)
	local previousEarnedStars = math.max(0, tonumber(earnings.Stars) or 0)

	-- No yielding occurs inside this protected section. ProfileStore persists the
	-- receipt and balances as one profile snapshot, while the rollback keeps an
	-- unexpected mutation failure retryable instead of consuming the receipt.
	local committed = pcall(function()
		if previousEligibility == nil then
			state.DayEligibility[schoolDayId] = true
			state.RewardedSchoolDays = previousRewardedSchoolDays + 1
		end
		state.EarnedBySchoolDay[schoolDayId] = earnings
		state.Receipts[key] = true
		economy.Coins = previousCoins + awardCoins
		economy.XP = previousXP + awardXP
		economy.Stars = previousStars + awardStars
		earnings.Coins = previousEarnedCoins + awardCoins
		earnings.XP = previousEarnedXP + awardXP
		earnings.Stars = previousEarnedStars + awardStars
	end)

	if not committed then
		state.Receipts[key] = nil
		state.DayEligibility[schoolDayId] = previousEligibility
		state.RewardedSchoolDays = previousRewardedSchoolDays
		economy.Coins = previousCoins
		economy.XP = previousXP
		economy.Stars = previousStars
		if hadEarnings then
			earnings.Coins = previousEarnedCoins
			earnings.XP = previousEarnedXP
			earnings.Stars = previousEarnedStars
		else
			state.EarnedBySchoolDay[schoolDayId] = nil
		end
		return {
			rewarded = false,
			code = "reward_transaction_failed",
			coins = 0,
			xp = 0,
			stars = 0,
		}
	end

	return {
		rewarded = true,
		coins = awardCoins,
		xp = awardXP,
		stars = awardStars,
	}
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
	return applyRewardTransaction(
		profileData,
		schoolDayId,
		key,
		Config.Rewards.QuestionCoins,
		Config.Rewards.QuestionXP,
		0
	)
end

function SchoolProgressService.ApplyClassCompletion(profileData, schoolDayId: string, periodId: string)
	local key = schoolDayId .. "|" .. periodId .. "|class-complete"
	return applyRewardTransaction(
		profileData,
		schoolDayId,
		key,
		0,
		Config.Rewards.ClassCompletionXP,
		0
	)
end

function SchoolProgressService.ApplyFullDay(profileData, schoolDayId: string)
	local key = schoolDayId .. "|full-day"
	return applyRewardTransaction(
		profileData,
		schoolDayId,
		key,
		0,
		Config.Rewards.FullDayXP,
		Config.Rewards.FullDayStars
	)
end

return SchoolProgressService
