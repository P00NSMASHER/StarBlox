--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Clock = require(script.Parent.SchoolClockService)
local Attendance = require(script.Parent.SchoolAttendanceService)
local Sessions = require(script.Parent.ClassSessionService)
local Progress = require(script.Parent.SchoolProgressService)
local Report = require(script.Parent.ReportCardService)
local Selector = require(script.Parent.ClassQuestionSelector)
local Config = require(ReplicatedStorage.StarBlox.SchoolConfig)
local WorldBindings = require(ReplicatedStorage.StarBlox.SchoolWorldBindings)

local SchoolRuntimeService = {}
SchoolRuntimeService.__index = SchoolRuntimeService
local REMOTE_ROOT = "StarBloxSchool"
local SUBMIT_COOLDOWN_SECONDS = 0.2

local function pinnedQuestion(period, questionId: string)
	for _, question in period and period.QuestionSnapshots or {} do
		if question.Id == questionId then
			return question
		end
	end
	return nil
end

function SchoolRuntimeService.new(profiles, replicas, legacyCoreLoop)
	assert(Clock.IsEnabled(), "SchoolRuntimeService requires SchoolSystemEnabled")

	local self = setmetatable({}, SchoolRuntimeService)
	self._profiles = profiles
	self._replicas = replicas
	self._legacyCoreLoop = legacyCoreLoop
	self._connections = {}
	self._lastSubmitAt = {}
	self._makeupPeriodByPlayer = {}

	self._anchorFolder, self._prompts, self._anchors, self._specialPrompts, self._specialAnchors =
		Attendance.BuildWorld()

	local old = ReplicatedStorage:FindFirstChild(REMOTE_ROOT)
	if old then old:Destroy() end

	local root = Instance.new("Folder")
	root.Name = REMOTE_ROOT
	root.Parent = ReplicatedStorage

	local stateEvent = Instance.new("RemoteEvent")
	stateEvent.Name = "SchoolState"
	stateEvent.Parent = root

	local classOpened = Instance.new("RemoteEvent")
	classOpened.Name = "ClassOpened"
	classOpened.Parent = root

	local requestState = Instance.new("RemoteFunction")
	requestState.Name = "RequestSchoolState"
	requestState.Parent = root

	local submit = Instance.new("RemoteFunction")
	submit.Name = "SubmitClassAnswer"
	submit.Parent = root

	self._stateEvent = stateEvent
	self._classOpened = classOpened
	self._requestState = requestState
	self._submit = submit

	for classId, prompt in self._prompts do
		table.insert(self._connections, prompt.Triggered:Connect(function(player)
			local clock = Clock.Now()
			local anchor = self._anchors[classId]
			if anchor == nil or not Attendance.ValidateProximity(player, anchor, prompt.MaxActivationDistance + 3) then
				return
			end
			if not clock.AcademicPeriod or clock.ClassId ~= classId then
				self:_sendState(player)
				return
			end

			local opened = nil
			self._profiles:WithProfile(player, function(data)
				self:_reconcilePastPeriods(data, clock)
				opened = Sessions.OpenClass(data, clock.SchoolDayId, clock.PeriodId, classId)
				if opened and opened.ok then
					Attendance.Mark(
						data,
						clock.SchoolDayId,
						clock.PeriodId,
						clock.SecondsSincePeriodStart
					)
					self._replicas:Sync(player, data)
				end
			end)

			if opened and opened.ok then
				classOpened:FireClient(player, opened.session)
			end
		end))
	end

	local makeupPrompt = self._specialPrompts and self._specialPrompts.Makeup
	if makeupPrompt ~= nil then
		table.insert(self._connections, makeupPrompt.Triggered:Connect(function(player)
			local clock = Clock.Now()
			local library = self._specialAnchors and self._specialAnchors.Library
			if clock.PeriodKind ~= "after-school" then
				self:_sendState(player)
				return
			end
			if library == nil or not Attendance.ValidateProximity(player, library, makeupPrompt.MaxActivationDistance + 3) then
				return
			end

			local opened = nil
			self._profiles:WithProfile(player, function(data)
				self:_reconcilePastPeriods(data, clock)
				local periodId = Sessions.FindMakeupPeriod(data, clock.SchoolDayId)
				if periodId ~= nil then
					opened = Sessions.OpenMakeupClass(data, clock.SchoolDayId, periodId)
					if opened and opened.ok then
						self._makeupPeriodByPlayer[player] = periodId
						self._replicas:Sync(player, data)
					end
				else
					opened = {ok = false, code = "no_makeup_needed"}
				end
			end)

			if opened and opened.ok then
				classOpened:FireClient(player, opened.session)
			else
				self:_sendState(player)
			end
		end))
	end

	requestState.OnServerInvoke = function(player)
		return self:_stateFor(player)
	end

	submit.OnServerInvoke = function(player, request)
		local nowClock = os.clock()
		local previous = self._lastSubmitAt[player] or -math.huge
		if nowClock - previous < SUBMIT_COOLDOWN_SECONDS then
			return {ok = false, code = "rate_limited"}
		end
		self._lastSubmitAt[player] = nowClock

		if type(request) ~= "table" or type(request.sessionId) ~= "string" then
			return {ok = false, code = "invalid_request"}
		end

		local clock = Clock.Now()
		local result = nil
		self._profiles:WithProfile(player, function(data)
			Sessions.EnsureDay(data, clock.SchoolDayId)
			self:_reconcilePastPeriods(data, clock)

			local periodId = nil
			local period = nil
			if clock.AcademicPeriod then
				periodId = clock.PeriodId
				period = data.School.CurrentDay.Periods[periodId]
			elseif clock.PeriodKind == "after-school" then
				periodId, period = Sessions.ResolvePeriodForSession(data, clock.SchoolDayId, request.sessionId)
				if period == nil or period.Makeup ~= true then
					result = {ok = false, code = "makeup_session_required"}
					return
				end
			else
				result = {ok = false, code = "not_academic_period"}
				return
			end

			result = Sessions.SubmitAnswer(data, clock.SchoolDayId, periodId, request)
			if result and result.ok and result.correct then
				period = data.School.CurrentDay.Periods[periodId]
				local attempt = period and period.Attempts and period.Attempts[request.questionId]
				local question = pinnedQuestion(period, request.questionId) or Selector.GetServerQuestion(request.questionId)

				Progress.RecordLearningAttempt(
					data,
					question,
					attempt and attempt.FirstTryCorrect == true
				)

				result.reward = Progress.ApplyCorrectAnswer(
					data,
					clock.SchoolDayId,
					periodId,
					request.questionId
				)

				if result.classComplete then
					result.classReward = Progress.ApplyClassCompletion(
						data,
						clock.SchoolDayId,
						periodId
					)
					result.reportCard = Report.Build(data, clock.SchoolDayId, true)
					if period and period.Makeup == true then
						self._makeupPeriodByPlayer[player] = nil
					end
				end

				self._replicas:Sync(player, data)
				player:SetAttribute("StarBloxCoins", data.Economy.Coins)
				player:SetAttribute("StarBloxXP", data.Economy.XP)
				player:SetAttribute("StarBloxStars", data.Economy.Stars)
			end
		end)

		return result or {ok = false, code = "profile_unavailable"}
	end

	self._lastClock = Clock.Now()
	self:_syncLegacyPrompts(self._lastClock)
	self._running = true
	task.spawn(function()
		while self._running do
			task.wait(1)
			local now = Clock.Now()
			if now.PeriodId ~= self._lastClock.PeriodId then
				self:_finalizePrevious(self._lastClock)
				self._lastClock = now
				self:_syncLegacyPrompts(now)
				for _, player in Players:GetPlayers() do
					self:_sendState(player)
				end
			end
		end
	end)

	return self
end

function SchoolRuntimeService:_syncLegacyPrompts(clock)
	if self._legacyCoreLoop ~= nil and type(self._legacyCoreLoop.SetActivityPromptsEnabled) == "function" then
		self._legacyCoreLoop:SetActivityPromptsEnabled(clock.PeriodKind == "after-school")
	end
end

function SchoolRuntimeService:_reconcilePastPeriods(data, clock)
	Sessions.EnsureDay(data, clock.SchoolDayId)
	for _, definition in Config.Periods do
		if definition.Kind == "academic" and definition.EndOffsetSeconds <= clock.CycleOffsetSeconds then
			local existing = data.School.CurrentDay.Periods[definition.Id]
			if existing == nil then
				Attendance.MarkMissed(data, clock.SchoolDayId, definition.Id, definition.ClassId)
			elseif existing.Status == "in-progress" and existing.Makeup ~= true then
				Attendance.MarkMissed(data, clock.SchoolDayId, definition.Id, definition.ClassId)
				Sessions.FinalizePeriod(data, clock.SchoolDayId, definition.Id)
			end
		end
	end
end

function SchoolRuntimeService:_finalizePrevious(previous)
	if previous.AcademicPeriod then
		for _, player in Players:GetPlayers() do
			self._profiles:WithProfile(player, function(data)
				Sessions.EnsureDay(data, previous.SchoolDayId)
				Attendance.MarkMissed(
					data,
					previous.SchoolDayId,
					previous.PeriodId,
					previous.ClassId
				)
				Sessions.FinalizePeriod(data, previous.SchoolDayId, previous.PeriodId)
				self._replicas:Sync(player, data)
			end)
		end
	end
end

function SchoolRuntimeService:_targetForClock(clock)
	if clock.ClassId ~= nil then
		local binding = WorldBindings.Classes[clock.ClassId]
		return "SchoolClass_" .. clock.ClassId, clock.DisplayName, binding and binding.Room or nil
	end
	if clock.PeriodKind == "arrival" or clock.PeriodKind == "passing" then
		if clock.UpcomingClassId ~= nil then
			local binding = WorldBindings.Classes[clock.UpcomingClassId]
			return "SchoolClass_" .. clock.UpcomingClassId, clock.UpcomingClassName, binding and binding.Room or nil
		end
	elseif clock.PeriodKind == "lunch" then
		return "SchoolCafeteria", "Cafeteria", nil
	end
	return nil, nil, nil
end

function SchoolRuntimeService:_stateFor(player)
	local clock = Clock.Now()
	local targetAnchorName, targetDisplayName, targetRoom = self:_targetForClock(clock)
	local payload = {
		ok = true,
		clock = clock,
		targetAnchorName = targetAnchorName,
		targetDisplayName = targetDisplayName,
		targetRoom = targetRoom,
		dismissed = clock.PeriodKind == "after-school",
		makeupAvailable = false,
	}

	self._profiles:WithProfile(player, function(data)
		self:_reconcilePastPeriods(data, clock)

		if clock.PeriodKind == "report" or clock.PeriodKind == "after-school" then
			payload.report = Report.Build(data, clock.SchoolDayId, true)
		end

		if clock.PeriodKind == "after-school" then
			local makeupPeriodId, makeupClassId = Sessions.FindMakeupPeriod(data, clock.SchoolDayId)
			if makeupPeriodId ~= nil then
				payload.makeupAvailable = true
				payload.makeupPeriodId = makeupPeriodId
				payload.makeupClassId = makeupClassId
				payload.targetAnchorName = "SchoolLibrary"
				payload.targetDisplayName = "Library Make-Up"
				payload.targetRoom = nil
			end
		end

		self._replicas:Sync(player, data)
	end)

	return payload
end

function SchoolRuntimeService:_sendState(player)
	self._stateEvent:FireClient(player, self:_stateFor(player))
end

function SchoolRuntimeService:PlayerReady(player)
	self:_sendState(player)
end

function SchoolRuntimeService:PlayerRemoving(player)
	self._lastSubmitAt[player] = nil
	self._makeupPeriodByPlayer[player] = nil
end

function SchoolRuntimeService:Destroy()
	self._running = false
	if self._legacyCoreLoop ~= nil and type(self._legacyCoreLoop.SetActivityPromptsEnabled) == "function" then
		self._legacyCoreLoop:SetActivityPromptsEnabled(true)
	end
	for _, connection in self._connections do
		connection:Disconnect()
	end
	self._connections = {}
	self._lastSubmitAt = {}
	self._makeupPeriodByPlayer = {}

	if self._anchorFolder and self._anchorFolder.Parent then
		self._anchorFolder:Destroy()
	end

	local root = ReplicatedStorage:FindFirstChild(REMOTE_ROOT)
	if root then root:Destroy() end
end

return SchoolRuntimeService
