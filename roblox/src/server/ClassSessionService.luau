--!strict

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local SchoolConfig = require(ReplicatedStorage.StarBlox.SchoolConfig)
local ClassQuestionSelector = require(script.Parent.ClassQuestionSelector)

local ClassSessionService = {}

local function cloneArray(values)
	local out = {}
	for index, value in values or {} do
		out[index] = value
	end
	return out
end

local function ensureSchool(profileData)
	profileData.School = profileData.School or {}
	local school = profileData.School

	school.CurrentDay = type(school.CurrentDay) == "table" and school.CurrentDay or {
		DayId = "",
		BankSnapshotId = "",
		Periods = {},
	}
	school.CurrentDay.DayId = type(school.CurrentDay.DayId) == "string" and school.CurrentDay.DayId or ""
	school.CurrentDay.BankSnapshotId =
		type(school.CurrentDay.BankSnapshotId) == "string"
		and school.CurrentDay.BankSnapshotId
		or ""
	school.CurrentDay.Periods =
		type(school.CurrentDay.Periods) == "table"
		and school.CurrentDay.Periods
		or {}

	school.RecentDays = type(school.RecentDays) == "table" and school.RecentDays or {}
	school.QuestionCursorByClass =
		type(school.QuestionCursorByClass) == "table"
		and school.QuestionCursorByClass
		or {}
	school.Statistics = type(school.Statistics) == "table" and school.Statistics or {
		DaysAttended = 0,
		ClassesCompleted = 0,
		OnTimeClasses = 0,
		ByClass = {},
	}
	school.Statistics.DaysAttended = math.max(0, tonumber(school.Statistics.DaysAttended) or 0)
	school.Statistics.ClassesCompleted = math.max(0, tonumber(school.Statistics.ClassesCompleted) or 0)
	school.Statistics.OnTimeClasses = math.max(0, tonumber(school.Statistics.OnTimeClasses) or 0)
	school.Statistics.ByClass =
		type(school.Statistics.ByClass) == "table"
		and school.Statistics.ByClass
		or {}
	school.RewardState = type(school.RewardState) == "table" and school.RewardState or {
		UtcDay = "",
		RewardedSchoolDays = 0,
		Receipts = {},
	}
	school.RewardState.UtcDay =
		type(school.RewardState.UtcDay) == "string"
		and school.RewardState.UtcDay
		or ""
	school.RewardState.RewardedSchoolDays =
		math.max(0, tonumber(school.RewardState.RewardedSchoolDays) or 0)
	school.RewardState.Receipts =
		type(school.RewardState.Receipts) == "table"
		and school.RewardState.Receipts
		or {}

	return school
end

local function archivePeriod(period)
	return {
		PeriodId = period.PeriodId,
		ClassId = period.ClassId,
		Status = period.Status,
		Score = period.Score,
		Grade = period.Grade,
		CompletedQuestionCount = period.CompletedQuestionCount,
		QuestionCount = period.QuestionCount,
		Attendance = period.Attendance,
		BankSnapshotId = period.BankSnapshotId,
		CompletedAtUnix = period.CompletedAtUnix,
	}
end

local function rotateDay(school, schoolDayId: string)
	if school.CurrentDay.DayId == schoolDayId then
		return school.CurrentDay
	end

	if school.CurrentDay.DayId ~= "" then
		local archived = {
			DayId = school.CurrentDay.DayId,
			BankSnapshotId = school.CurrentDay.BankSnapshotId,
			Periods = {},
		}
		for periodId, period in school.CurrentDay.Periods do
			archived.Periods[periodId] = archivePeriod(period)
		end
		table.insert(school.RecentDays, archived)
		while #school.RecentDays > 7 do
			table.remove(school.RecentDays, 1)
		end
	end

	school.CurrentDay = {
		DayId = schoolDayId,
		BankSnapshotId = "",
		Periods = {},
	}
	return school.CurrentDay
end

local function gradeForScore(score: number): string
	if score >= SchoolConfig.Scoring.GradeA then
		return "A"
	elseif score >= SchoolConfig.Scoring.GradeB then
		return "B"
	elseif score >= SchoolConfig.Scoring.GradeC then
		return "C"
	end
	return "Practice"
end

local function publicQuestion(question)
	if question == nil then
		return nil
	end
	return {
		id = question.Id,
		contentHash = question.ContentHash,
		prompt = question.Prompt,
		choices = cloneArray(question.Choices),
		subject = question.Subject,
		skill = question.Skill,
		tier = question.Tier,
		domain = question.Domain,
		difficulty = question.Difficulty,
	}
end

local function publicPeriod(period)
	local current = period.QuestionSnapshots[period.CurrentQuestionIndex]
	return {
		sessionId = period.SessionId,
		periodId = period.PeriodId,
		classId = period.ClassId,
		status = period.Status,
		bankSnapshotId = period.BankSnapshotId,
		questionIndex = period.CurrentQuestionIndex,
		questionCount = period.QuestionCount,
		completedQuestionCount = period.CompletedQuestionCount,
		score = period.Score,
		grade = period.Grade,
		question = publicQuestion(current),
	}
end

local function recentQuestions(profileData)
	profileData.Learning = profileData.Learning or {}
	profileData.Learning.RecentQuestionIds =
		type(profileData.Learning.RecentQuestionIds) == "table"
		and profileData.Learning.RecentQuestionIds
		or {}
	return profileData.Learning.RecentQuestionIds
end

local function rememberQuestion(profileData, questionId: string)
	local recent = recentQuestions(profileData)
	table.insert(recent, questionId)
	while #recent > SchoolConfig.QuestionSelection.RecentQuestionWindow do
		table.remove(recent, 1)
	end
end

local function incrementClassStats(school, classId: string, grade: string)
	local byClass = school.Statistics.ByClass
	local stats = byClass[classId]
	if type(stats) ~= "table" then
		stats = {
			Completed = 0,
			GradeA = 0,
			GradeB = 0,
			GradeC = 0,
			Practice = 0,
		}
		byClass[classId] = stats
	end
	stats.Completed = math.max(0, tonumber(stats.Completed) or 0) + 1
	local gradeKey = "Grade" .. grade
	if grade == "Practice" then
		gradeKey = "Practice"
	end
	stats[gradeKey] = math.max(0, tonumber(stats[gradeKey]) or 0) + 1
end

function ClassSessionService.EnsureDay(profileData, schoolDayId: string)
	local school = ensureSchool(profileData)
	return rotateDay(school, schoolDayId)
end

function ClassSessionService.OpenClass(
	profileData,
	schoolDayId: string,
	periodId: string,
	classId: string,
	options: any?
)
	if type(schoolDayId) ~= "string" or schoolDayId == "" then
		return {ok = false, code = "invalid_school_day"}
	end
	if type(periodId) ~= "string" or periodId == "" then
		return {ok = false, code = "invalid_period"}
	end
	if SchoolConfig.Classes[classId] == nil then
		return {ok = false, code = "unknown_class"}
	end

	local school = ensureSchool(profileData)
	local day = rotateDay(school, schoolDayId)
	local existing = day.Periods[periodId]
	if existing ~= nil then
		if existing.ClassId ~= classId then
			return {ok = false, code = "period_class_conflict"}
		end
		return {
			ok = true,
			reusedPinnedBundle = true,
			session = publicPeriod(existing),
		}
	end

	local cursor = math.max(0, math.floor(tonumber(school.QuestionCursorByClass[classId]) or 0))
	local preferredSubject = nil
	if type(options) == "table" and type(options.preferredSubject) == "string" then
		preferredSubject = options.preferredSubject
	end

	local bundle
	if classId == "star-lab" then
		bundle = ClassQuestionSelector.SelectBundleForProfile(classId, cursor, profileData, schoolDayId)
	else
		bundle = ClassQuestionSelector.SelectBundle(
			classId,
			cursor,
			recentQuestions(profileData),
			preferredSubject,
			profileData.Learning and profileData.Learning.SkillStats or {}
		)
	end
	if bundle.ok ~= true then
		return bundle
	end

	local snapshots = {}
	for _, question in bundle.questions do
		table.insert(snapshots, {
			Id = question.Id,
			ContentHash = question.ContentHash,
			Prompt = question.Prompt,
			Choices = cloneArray(question.Choices),
			Answer = question.Answer,
			Explanation = question.Explanation,
			Subject = question.Subject,
			Skill = question.Skill,
			Tier = question.Tier,
			Domain = question.Domain,
			Difficulty = question.Difficulty,
			Provenance = question.Provenance,
			SourceFact = question.SourceFact,
			Standards = question.Standards,
			DOK = question.DOK,
			Hint = question.Hint,
			Scaffold = question.Scaffold,
			WrongFeedback = question.WrongFeedback,
			Misconceptions = question.Misconceptions,
		})
	end

	local sessionId = schoolDayId .. "|" .. periodId .. "|" .. classId
	local period = {
		SessionId = sessionId,
		PeriodId = periodId,
		ClassId = classId,
		Status = "in-progress",
		BankSnapshotId = bundle.bankSnapshotId,
		BankSourceHash = bundle.bankSourceHash,
		QuestionSnapshots = snapshots,
		QuestionCount = #snapshots,
		CurrentQuestionIndex = 1,
		CompletedQuestionCount = 0,
		Score = 0,
		Grade = "",
		Attendance = "UNSET",
		Attempts = {},
		OpenedAtUnix = os.time(),
		CompletedAtUnix = 0,
	}
	day.Periods[periodId] = period
	if day.BankSnapshotId == "" then
		day.BankSnapshotId = bundle.bankSnapshotId
	end
	school.QuestionCursorByClass[classId] = bundle.nextCursor

	return {
		ok = true,
		reusedPinnedBundle = false,
		session = publicPeriod(period),
	}
end

function ClassSessionService.SubmitAnswer(
	profileData,
	schoolDayId: string,
	periodId: string,
	request: any
)
	if type(request) ~= "table" then
		return {ok = false, code = "invalid_request"}
	end
	local school = ensureSchool(profileData)
	if school.CurrentDay.DayId ~= schoolDayId then
		return {ok = false, code = "school_day_mismatch"}
	end

	local period = school.CurrentDay.Periods[periodId]
	if type(period) ~= "table" then
		return {ok = false, code = "class_not_open"}
	end
	if period.Status ~= "in-progress" then
		return {ok = false, code = "class_not_active"}
	end
	if request.sessionId ~= period.SessionId then
		return {ok = false, code = "session_mismatch"}
	end

	local question = period.QuestionSnapshots[period.CurrentQuestionIndex]
	if question == nil then
		return {ok = false, code = "question_missing"}
	end
	if request.questionId ~= question.Id then
		return {ok = false, code = "stale_question"}
	end
	if request.contentHash ~= nil and request.contentHash ~= question.ContentHash then
		return {ok = false, code = "content_hash_mismatch"}
	end
	if type(request.choice) ~= "string" then
		return {ok = false, code = "invalid_choice"}
	end

	local attempt = period.Attempts[question.Id]
	if type(attempt) ~= "table" then
		attempt = {
			Count = 0,
			FirstTryCorrect = nil,
			FinalCorrect = false,
			Points = 0,
		}
		period.Attempts[question.Id] = attempt
	end
	if attempt.FinalCorrect == true then
		return {ok = false, code = "question_already_completed"}
	end

	attempt.Count += 1
	local correct = string.lower(request.choice) == string.lower(question.Answer)
	if attempt.Count == 1 then
		attempt.FirstTryCorrect = correct
	end

	if not correct then
		local feedback = question.Explanation
		if type(question.WrongFeedback) == "table" and type(question.WrongFeedback[request.choice]) == "string" then
			feedback = question.WrongFeedback[request.choice]
		end
		return {
			ok = true,
			correct = false,
			retry = true,
			explanation = feedback,
			scaffold = if attempt.Count >= 2 then question.Scaffold else nil,
			score = period.Score,
			questionIndex = period.CurrentQuestionIndex,
			questionCount = period.QuestionCount,
		}
	end

	attempt.FinalCorrect = true
	attempt.Points = if attempt.Count == 1
		then SchoolConfig.Scoring.FirstTryPoints
		else SchoolConfig.Scoring.RetryPoints
	period.Score += attempt.Points
	period.CompletedQuestionCount += 1
	rememberQuestion(profileData, question.Id)

	local classComplete = period.CompletedQuestionCount >= period.QuestionCount
	if classComplete then
		period.Status = "completed"
		period.Grade = gradeForScore(period.Score)
		period.CompletedAtUnix = os.time()
		school.Statistics.ClassesCompleted += 1
		incrementClassStats(school, period.ClassId, period.Grade)
	else
		period.CurrentQuestionIndex += 1
	end

	return {
		ok = true,
		correct = true,
		retry = false,
		points = attempt.Points,
		explanation = question.Explanation,
		classComplete = classComplete,
		score = period.Score,
		grade = period.Grade,
		nextQuestion = if classComplete then nil else publicQuestion(
			period.QuestionSnapshots[period.CurrentQuestionIndex]
		),
		session = publicPeriod(period),
	}
end

function ClassSessionService.GetPublicSession(profileData, schoolDayId: string, periodId: string)
	local school = ensureSchool(profileData)
	if school.CurrentDay.DayId ~= schoolDayId then
		return nil
	end
	local period = school.CurrentDay.Periods[periodId]
	if type(period) ~= "table" then
		return nil
	end
	return publicPeriod(period)
end

function ClassSessionService.GradeForScore(score: any): string
	return gradeForScore(math.max(0, tonumber(score) or 0))
end

return ClassSessionService
