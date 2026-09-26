--!strict

local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local DeploymentManifest = require(ReplicatedStorage.StarBlox.DeploymentManifest)

local PrivatePlaytestTelemetryService = {}
PrivatePlaytestTelemetryService.__index = PrivatePlaytestTelemetryService

local STORE_NAME = "StarBloxPrivatePlaytestTelemetry_v1"
local LATEST_KEY = "latest"
local RETENTION_STORE_NAME = "StarBloxPrivateRetention_v1"
local RETENTION_KEY = "aggregate"
local RETENTION_VERSION = "starblox-private-retention-v1"
local REMOTE_NAME = "StarBloxPrivatePlaytestTelemetry"

local ALLOWED_CLIENT_EVENTS = table.freeze({
	client_ready = true,
	onboarding_shown = true,
	onboarding_dismissed = true,
	activity_panel_opened = true,
	wrong_feedback_seen = true,
	success_feedback_seen = true,
	retry_state_seen = true,
})

local ALLOWED_SERVER_EVENTS = table.freeze({
	station_opened = true,
	answer_wrong = true,
	answer_correct = true,
	loop_completed = true,
})

local function deepCopy(value)
	if type(value) ~= "table" then
		return value
	end
	local out = {}
	for key, child in value do
		out[key] = deepCopy(child)
	end
	return out
end

local function clampInteger(value, minValue: number, maxValue: number): number
	if type(value) ~= "number" or value ~= value then
		return minValue
	end
	return math.clamp(math.floor(value), minValue, maxValue)
end

local function cleanBool(value): boolean
	return value == true
end

local function cleanActivityId(value): string?
	if type(value) ~= "string" or value == "" or #value > 80 then
		return nil
	end
	if string.match(value, "^[%w%-_]+$") == nil then
		return nil
	end
	return value
end

local function ensureCounter(bucket, key: string)
	bucket[key] = (bucket[key] or 0) + 1
end

function PrivatePlaytestTelemetryService.new(options)
	local opts = options or {}
	local self = setmetatable({}, PrivatePlaytestTelemetryService)
	self._store = opts.Store or DataStoreService:GetDataStore(STORE_NAME)
	self._retentionStore = opts.RetentionStore or DataStoreService:GetDataStore(RETENTION_STORE_NAME)
	self._persistEnabled = opts.Persist ~= false
	self._sessions = {}
	self._aggregatedSessions = {}

	local existing = ReplicatedStorage:FindFirstChild(REMOTE_NAME)
	if existing then
		existing:Destroy()
	end

	local remote = Instance.new("RemoteEvent")
	remote.Name = REMOTE_NAME
	remote:SetAttribute("TelemetryVersion", "starblox-private-playtest-v1")
	remote.Parent = ReplicatedStorage
	self._remote = remote

	self._connection = remote.OnServerEvent:Connect(function(player, eventName, payload)
		self:RecordClientEvent(player, eventName, payload)
	end)

	return self
end

function PrivatePlaytestTelemetryService:_ensureSession(player)
	local report = self._sessions[player]
	if report ~= nil then
		return report
	end

	report = {
		schemaVersion = 1,
		telemetryVersion = "starblox-private-playtest-v1",
		releaseId = DeploymentManifest.releaseId,
		placeVersion = game.PlaceVersion,
		sessionId = HttpService:GenerateGUID(false),
		startedAt = os.time(),
		lastEventAt = os.time(),
		durationSeconds = 0,
		sequence = 0,
		client = {
			ready = false,
			touchEnabled = false,
			keyboardEnabled = false,
			gamepadEnabled = false,
			viewportX = 0,
			viewportY = 0,
		},
		counts = {},
		server = {
			station_opened = 0,
			answer_wrong = 0,
			answer_correct = 0,
			loop_completed = 0,
		},
		activityIds = {},
		questionIds = {},
		retention = {
			firstStationSeconds = nil,
			firstActivityId = nil,
			activityOpenOrder = {},
			firstLoopSeconds = nil,
			secondLoopStarted = false,
			secondLoopCompleted = false,
		},
		privacy = {
			storesUsername = false,
			storesUserId = false,
			storesRawAnswers = false,
			storesChat = false,
			storesSessionIdInAggregate = false,
		},
		endedAt = nil,
	}
	self._sessions[player] = report
	return report
end

function PrivatePlaytestTelemetryService:_snapshot(report)
	local snapshot = deepCopy(report)
	snapshot.lastEventAt = os.time()
	snapshot.durationSeconds = math.max(0, snapshot.lastEventAt - snapshot.startedAt)
	return snapshot
end

function PrivatePlaytestTelemetryService:_persist(report)
	if not self._persistEnabled then
		return
	end

	report.sequence += 1
	report.lastEventAt = os.time()
	report.durationSeconds = math.max(0, report.lastEventAt - report.startedAt)
	local snapshot = self:_snapshot(report)

	task.spawn(function()
		local ok, reason = pcall(function()
			self._store:UpdateAsync(LATEST_KEY, function(existing)
				if type(existing) == "table"
					and type(existing.sequence) == "number"
					and existing.releaseId == snapshot.releaseId
					and existing.sequence > snapshot.sequence then
					return existing
				end
				return snapshot
			end)
		end)
		if not ok then
			warn("StarBlox private playtest telemetry persist failed: " .. tostring(reason))
		end
	end)
end

function PrivatePlaytestTelemetryService:_persistRetentionAggregate(report)
	if not self._persistEnabled or self._aggregatedSessions[report.sessionId] == true then
		return
	end

	local snapshot = self:_snapshot(report)
	self._aggregatedSessions[report.sessionId] = true
	local ok, reason = pcall(function()
		self._retentionStore:UpdateAsync(RETENTION_KEY, function(existing)
			local aggregate = if type(existing) == "table"
				and existing.retentionVersion == RETENTION_VERSION
				and existing.releaseId == snapshot.releaseId
				and existing.placeVersion == snapshot.placeVersion
				then existing
				else {
					schemaVersion = 1,
					retentionVersion = RETENTION_VERSION,
					releaseId = snapshot.releaseId,
					placeVersion = snapshot.placeVersion,
					sessions = 0,
					touchSessions = 0,
					fullLoopSessions = 0,
					repeatLoopSessions = 0,
					sessionsWithFirstStation = 0,
					totalFirstStationSeconds = 0,
					totalDurationSeconds = 0,
					firstActivityCounts = {},
					updatedAt = 0,
					privacy = {
						storesUsername = false,
						storesUserId = false,
						storesRawAnswers = false,
						storesChat = false,
						storesSessionIds = false,
					},
				}

			aggregate.sessions = (aggregate.sessions or 0) + 1
			aggregate.totalDurationSeconds = (aggregate.totalDurationSeconds or 0) + snapshot.durationSeconds
			if snapshot.client.touchEnabled == true then
				aggregate.touchSessions = (aggregate.touchSessions or 0) + 1
			end
			if (snapshot.server.loop_completed or 0) >= 1 then
				aggregate.fullLoopSessions = (aggregate.fullLoopSessions or 0) + 1
			end
			if snapshot.retention.secondLoopStarted == true then
				aggregate.repeatLoopSessions = (aggregate.repeatLoopSessions or 0) + 1
			end
			if type(snapshot.retention.firstStationSeconds) == "number" then
				aggregate.sessionsWithFirstStation = (aggregate.sessionsWithFirstStation or 0) + 1
				aggregate.totalFirstStationSeconds =
					(aggregate.totalFirstStationSeconds or 0) + snapshot.retention.firstStationSeconds
			end
			if type(snapshot.retention.firstActivityId) == "string" then
				aggregate.firstActivityCounts[snapshot.retention.firstActivityId] =
					(aggregate.firstActivityCounts[snapshot.retention.firstActivityId] or 0) + 1
			end
			aggregate.updatedAt = os.time()
			return aggregate
		end)
	end)

	if not ok then
		self._aggregatedSessions[report.sessionId] = nil
		warn("StarBlox private retention aggregate persist failed: " .. tostring(reason))
	end
end

function PrivatePlaytestTelemetryService:PlayerReady(player)
	local report = self:_ensureSession(player)
	self:_persist(report)
end

function PrivatePlaytestTelemetryService:RecordClientEvent(player, eventName: any, payload: any)
	if type(eventName) ~= "string" or ALLOWED_CLIENT_EVENTS[eventName] ~= true then
		return false
	end

	local report = self:_ensureSession(player)
	ensureCounter(report.counts, eventName)

	if eventName == "client_ready" then
		local source = if type(payload) == "table" then payload else {}
		report.client.ready = true
		report.client.touchEnabled = cleanBool(source.touchEnabled)
		report.client.keyboardEnabled = cleanBool(source.keyboardEnabled)
		report.client.gamepadEnabled = cleanBool(source.gamepadEnabled)
		report.client.viewportX = clampInteger(source.viewportX, 0, 10000)
		report.client.viewportY = clampInteger(source.viewportY, 0, 10000)
	elseif eventName == "activity_panel_opened" then
		local source = if type(payload) == "table" then payload else {}
		local activityId = cleanActivityId(source.activityId)
		local questionId = cleanActivityId(source.questionId)
		if activityId ~= nil then
			report.activityIds[activityId] = true
		end
		if questionId ~= nil then
			report.questionIds[questionId] = true
		end
	end

	self:_persist(report)
	return true
end

function PrivatePlaytestTelemetryService:RecordServerEvent(player, eventName: any, payload: any)
	if type(eventName) ~= "string" or ALLOWED_SERVER_EVENTS[eventName] ~= true then
		return false
	end

	local report = self:_ensureSession(player)
	report.server[eventName] = (report.server[eventName] or 0) + 1

	local source = if type(payload) == "table" then payload else {}
	local activityId = cleanActivityId(source.activityId)
	local questionId = cleanActivityId(source.questionId)
	if activityId ~= nil then
		report.activityIds[activityId] = true
	end
	if questionId ~= nil then
		report.questionIds[questionId] = true
	end

	if eventName == "station_opened" then
		if report.retention.firstStationSeconds == nil then
			report.retention.firstStationSeconds = math.max(0, os.time() - report.startedAt)
			report.retention.firstActivityId = activityId
		end
		if activityId ~= nil and #report.retention.activityOpenOrder < 12 then
			table.insert(report.retention.activityOpenOrder, activityId)
		end
		if (report.server.loop_completed or 0) >= 1 then
			report.retention.secondLoopStarted = true
		end
	elseif eventName == "loop_completed" then
		if report.server.loop_completed == 1 then
			report.retention.firstLoopSeconds = math.max(0, os.time() - report.startedAt)
		elseif report.server.loop_completed >= 2 then
			report.retention.secondLoopCompleted = true
		end
	end

	self:_persist(report)
	return true
end

function PrivatePlaytestTelemetryService:PlayerRemoving(player)
	local report = self._sessions[player]
	if report == nil then
		return
	end
	report.endedAt = os.time()
	self:_persist(report)
	self:_persistRetentionAggregate(report)
	self._sessions[player] = nil
end

function PrivatePlaytestTelemetryService:FlushAll()
	for _, report in self._sessions do
		report.endedAt = os.time()
		if self._persistEnabled then
			local snapshot = self:_snapshot(report)
			pcall(function()
				self._store:UpdateAsync(LATEST_KEY, function(existing)
					if type(existing) == "table"
						and type(existing.sequence) == "number"
						and existing.releaseId == snapshot.releaseId
						and existing.sequence > snapshot.sequence then
						return existing
					end
					return snapshot
				end)
			end)
			self:_persistRetentionAggregate(report)
		end
	end
end

function PrivatePlaytestTelemetryService:Destroy()
	if self._connection then
		self._connection:Disconnect()
		self._connection = nil
	end
end

return PrivatePlaytestTelemetryService
