--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Clock = require(script.Parent.SchoolClockService)
local Attendance = require(script.Parent.SchoolAttendanceService)
local Sessions = require(script.Parent.ClassSessionService)
local Progress = require(script.Parent.SchoolProgressService)
local Report = require(script.Parent.ReportCardService)
local Selector = require(script.Parent.ClassQuestionSelector)

local SchoolRuntimeService = {}
SchoolRuntimeService.__index = SchoolRuntimeService
local REMOTE_ROOT = "StarBloxSchool"

function SchoolRuntimeService.new(profiles, replicas)
	assert(Clock.IsEnabled(), "SchoolRuntimeService requires SchoolSystemEnabled")

	local self = setmetatable({}, SchoolRuntimeService)
	self._profiles = profiles
	self._replicas = replicas
	self._connections = {}

	self._anchorFolder, self._prompts, self._anchors = Attendance.BuildWorld()

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
			if not clock.AcademicPeriod or clock.ClassId ~= classId then
				self:_sendState(player)
				return
			end

			local opened = nil
			self._profiles:WithProfile(player, function(data)
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

	requestState.OnServerInvoke = function(player)
		return self:_stateFor(player)
	end

	submit.OnServerInvoke = function(player, request)
		local clock = Clock.Now()
		if not clock.AcademicPeriod then
			return {ok = false, code = "not_academic_period"}
		end

		local result = nil
		self._profiles:WithProfile(player, function(data)
			result = Sessions.SubmitAnswer(data, clock.SchoolDayId, clock.PeriodId, request)
			if result and result.ok and result.correct then
				local period = data.School.CurrentDay.Periods[clock.PeriodId]
				local attempt = period and period.Attempts and period.Attempts[request.questionId]
				local question = Selector.GetServerQuestion(request.questionId)

				Progress.RecordLearningAttempt(
					data,
					question,
					attempt and attempt.FirstTryCorrect == true
				)

				result.reward = Progress.ApplyCorrectAnswer(
					data,
					clock.SchoolDayId,
					clock.PeriodId,
					request.questionId
				)

				if result.classComplete then
					result.classReward = Progress.ApplyClassCompletion(
						data,
						clock.SchoolDayId,
						clock.PeriodId
					)
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
	self._running = true
	task.spawn(function()
		while self._running do
			task.wait(1)
			local now = Clock.Now()
			if now.PeriodId ~= self._lastClock.PeriodId then
				self:_finalizePrevious(self._lastClock)
				self._lastClock = now
				for _, player in Players:GetPlayers() do
					self:_sendState(player)
				end
			end
		end
	end)

	return self
end

function SchoolRuntimeService:_finalizePrevious(previous)
	if previous.AcademicPeriod then
		for _, player in Players:GetPlayers() do
			self._profiles:WithProfile(player, function(data)
				Attendance.MarkMissed(
					data,
					previous.SchoolDayId,
					previous.PeriodId,
					previous.ClassId
				)
				self._replicas:Sync(player, data)
			end)
		end
	end
end

function SchoolRuntimeService:_stateFor(player)
	local clock = Clock.Now()
	local payload = {
		ok = true,
		clock = clock,
		targetAnchorName = if clock.ClassId then "SchoolClass_" .. clock.ClassId else nil,
		dismissed = clock.PeriodKind == "after-school",
	}

	self._profiles:WithProfile(player, function(data)
		Sessions.EnsureDay(data, clock.SchoolDayId)
		if clock.PeriodKind == "report" or clock.PeriodKind == "after-school" then
			payload.report = Report.Build(
				data,
				clock.SchoolDayId,
				true
			)
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
	-- Class state lives in ProfileStore and needs no separate in-memory teardown.
end

function SchoolRuntimeService:Destroy()
	self._running = false
	for _, connection in self._connections do
		connection:Disconnect()
	end
	self._connections = {}

	if self._anchorFolder and self._anchorFolder.Parent then
		self._anchorFolder:Destroy()
	end

	local root = ReplicatedStorage:FindFirstChild(REMOTE_ROOT)
	if root then root:Destroy() end
end

return SchoolRuntimeService
