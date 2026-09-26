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
local ITEM_METRICS_STORE_NAME = "StarBloxQuestionItemMetrics_v2"
local ITEM_METRICS_KEY = "aggregate"
local ITEM_METRICS_VERSION = "starblox-question-item-metrics-v2-pilot-baseline"
local MAX_ITEM_ROWS = 600
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
	question_attempt = true,
	pilot_started = true,
	pilot_completed = true,
	loop_completed = true,
})

local ALLOWED_RESPONSE_TIME_BANDS = table.freeze({
	["under-5s"] = true,
	["5-15s"] = true,
	["15-30s"] = true,
	["30s-plus"] = true,
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

local function ensureCounter(bucket, key: string, amount: number?)
	bucket[key] = (bucket[key] or 0) + (amount or 1)
end

local function cleanMetricKey(value: any, maxLength: number?): string?
	local limit = maxLength or 80
	if type(value) ~= "string" or value == "" or #value > limit then
		return nil
	end
	if string.match(value, "^[%w%-_%.]+$") == nil then
		return nil
	end
	return value
end

local function mergeCounters(target, incoming)
	if type(incoming) ~= "table" then return end
	for key, value in incoming do
		if type(key) == "string" and type(value) == "number" and value >= 0 then
			target[key] = (target[key] or 0) + math.floor(value)
		end
	end
end

local function ensureBaselinePending(report, sessionNumber: number)
	report.baselinePending = type(report.baselinePending) == "table" and report.baselinePending or {}
	local key = tostring(sessionNumber)
	local pending = report.baselinePending[key]
	if type(pending) ~= "table" then
		pending = {items = {}}
		report.baselinePending[key] = pending
	end
	pending.items = type(pending.items) == "table" and pending.items or {}
	return pending
end

local function ensureBaselinePendingItem(pending, questionId: string)
	local item = pending.items[questionId]
	if type(item) ~= "table" then
		item = {
			attempts = 0,
			correct = 0,
			wrong = 0,
			firstAttempts = 0,
			firstCorrect = 0,
			rubricPoints = 0,
			rubricMaxPoints = 0,
			bucketCounts = {},
			firstBucketCounts = {},
			responseTimeBands = {},
			misconceptionCounts = {},
		}
		pending.items[questionId] = item
	end
	return item
end

local function commitBaselinePending(report, sessionNumber: number): boolean
	if type(report.baselinePending) ~= "table" then return false end
	local key = tostring(sessionNumber)
	local pending = report.baselinePending[key]
	if type(pending) ~= "table" or type(pending.items) ~= "table" then return false end

	for questionId, source in pending.items do
		local target = report.itemAttempts[questionId]
		if type(target) == "table" and type(source) == "table" then
			target.baselinePilotAttempts += source.attempts or 0
			target.baselinePilotCorrect += source.correct or 0
			target.baselinePilotWrong += source.wrong or 0
			target.baselineFirstAttempts += source.firstAttempts or 0
			target.baselineFirstCorrect += source.firstCorrect or 0
			target.baselineRubricPoints += source.rubricPoints or 0
			target.baselineRubricMaxPoints += source.rubricMaxPoints or 0
			mergeCounters(target.baselineBucketCounts, source.bucketCounts)
			mergeCounters(target.baselineFirstBucketCounts, source.firstBucketCounts)
			mergeCounters(target.baselineResponseTimeBands, source.responseTimeBands)
			mergeCounters(target.baselineMisconceptionCounts, source.misconceptionCounts)
		end
	end
	report.baselinePending[key] = nil
	return true
end

function PrivatePlaytestTelemetryService.new(options)
	local opts = options or {}
	local self = setmetatable({}, PrivatePlaytestTelemetryService)
	self._store = opts.Store or DataStoreService:GetDataStore(STORE_NAME)
	self._retentionStore = opts.RetentionStore or DataStoreService:GetDataStore(RETENTION_STORE_NAME)
	self._itemMetricsStore = opts.ItemMetricsStore or DataStoreService:GetDataStore(ITEM_METRICS_STORE_NAME)
	self._persistEnabled = opts.Persist ~= false
	self._sessions = {}
	self._aggregatedSessions = {}
	self._aggregatedItemSessions = {}

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
			question_attempt = 0,
			pilot_started = 0,
			pilot_completed = 0,
			loop_completed = 0,
		},
		activityIds = {},
		questionIds = {},
		itemAttempts = {},
		baselinePending = {},
		retention = {
			firstStationSeconds = nil,
			firstActivityId = nil,
			activityOpenOrder = {},
			firstLoopSeconds = nil,
			secondLoopStarted = false,
			secondLoopCompleted = false,
			baselinePilotSessionsStarted = 0,
			baselinePilotSessionsCompleted = 0,
		},
		privacy = {
			storesUsername = false,
			storesUserId = false,
			storesRawAnswers = false,
			storesChat = false,
			storesSessionIdInAggregate = false,
			storesChoiceIndexOnly = true,
			storesResponseTimeBandsOnly = true,
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
					pilotSessionsStarted = 0,
					pilotSessionsCompleted = 0,
					baselinePilotSessionsStarted = 0,
					baselinePilotSessionsCompleted = 0,
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
			aggregate.pilotSessionsStarted =
				(aggregate.pilotSessionsStarted or 0) + math.max(0, math.floor(snapshot.server.pilot_started or 0))
			aggregate.pilotSessionsCompleted =
				(aggregate.pilotSessionsCompleted or 0) + math.max(0, math.floor(snapshot.server.pilot_completed or 0))
			aggregate.baselinePilotSessionsStarted =
				(aggregate.baselinePilotSessionsStarted or 0)
				+ math.max(0, math.floor(snapshot.retention.baselinePilotSessionsStarted or 0))
			aggregate.baselinePilotSessionsCompleted =
				(aggregate.baselinePilotSessionsCompleted or 0)
				+ math.max(0, math.floor(snapshot.retention.baselinePilotSessionsCompleted or 0))
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

function PrivatePlaytestTelemetryService:_persistItemMetricsAggregate(report)
	if not self._persistEnabled or self._aggregatedItemSessions[report.sessionId] == true then
		return
	end

	local snapshot = self:_snapshot(report)
	local firstAttempts = 0
	local firstCorrect = 0
	local firstPilotAttempts = 0
	local firstPilotCorrect = 0
	for _, item in snapshot.itemAttempts or {} do
		if item.firstScoredSeen == true then
			firstAttempts += 1
			if item.firstCorrect == true then firstCorrect += 1 end
			if item.firstPilot == true then
				firstPilotAttempts += 1
				if item.firstCorrect == true then firstPilotCorrect += 1 end
			end
		end
	end
	if firstAttempts <= 0 then
		self._aggregatedItemSessions[report.sessionId] = true
		return
	end

	local sessionAccuracy = firstCorrect / firstAttempts
	local pilotSessionAccuracy = if firstPilotAttempts > 0 then firstPilotCorrect / firstPilotAttempts else nil
	self._aggregatedItemSessions[report.sessionId] = true
	local ok, reason = pcall(function()
		self._itemMetricsStore:UpdateAsync(ITEM_METRICS_KEY, function(existing)
			local aggregate = if type(existing) == "table"
				and existing.metricsVersion == ITEM_METRICS_VERSION
				then existing
				else {
					schemaVersion = 1,
					metricsVersion = ITEM_METRICS_VERSION,
					sessions = 0,
					pilotSessionsStarted = 0,
					pilotSessionsCompleted = 0,
					baselinePilotSessionsStarted = 0,
					baselinePilotSessionsCompleted = 0,
					items = {},
					updatedAt = 0,
					privacy = {
						storesUsername = false,
						storesUserId = false,
						storesRawAnswers = false,
						storesChat = false,
						storesSessionIds = false,
						storesChoiceIndexOnly = true,
						storesResponseTimeBandsOnly = true,
					},
				}

			aggregate.sessions = (aggregate.sessions or 0) + 1
			aggregate.pilotSessionsStarted =
				(aggregate.pilotSessionsStarted or 0) + math.max(0, math.floor(snapshot.server.pilot_started or 0))
			aggregate.pilotSessionsCompleted =
				(aggregate.pilotSessionsCompleted or 0) + math.max(0, math.floor(snapshot.server.pilot_completed or 0))
			aggregate.baselinePilotSessionsStarted =
				(aggregate.baselinePilotSessionsStarted or 0)
				+ math.max(0, math.floor(snapshot.retention.baselinePilotSessionsStarted or 0))
			aggregate.baselinePilotSessionsCompleted =
				(aggregate.baselinePilotSessionsCompleted or 0)
				+ math.max(0, math.floor(snapshot.retention.baselinePilotSessionsCompleted or 0))
			aggregate.items = type(aggregate.items) == "table" and aggregate.items or {}

			for questionId, item in snapshot.itemAttempts or {} do
				if type(questionId) == "string" and item.firstScoredSeen == true then
					local row = aggregate.items[questionId]
					if type(row) ~= "table" then
						row = {
							sessions = 0,
							attempts = 0,
							correct = 0,
							wrong = 0,
							firstAttempts = 0,
							firstCorrect = 0,
							rubricPoints = 0,
							rubricMaxPoints = 0,
							supportAttempts = 0,
							pilotAttempts = 0,
							pilotCorrect = 0,
							pilotWrong = 0,
							firstPilotAttempts = 0,
							firstPilotCorrect = 0,
							pilotRubricPoints = 0,
							pilotRubricMaxPoints = 0,
							pilotBucketCounts = {},
							firstPilotBucketCounts = {},
							pilotResponseTimeBands = {},
							pilotMisconceptionCounts = {},
							baselinePilotAttempts = 0,
							baselinePilotCorrect = 0,
							baselinePilotWrong = 0,
							baselineFirstAttempts = 0,
							baselineFirstCorrect = 0,
							baselineRubricPoints = 0,
							baselineRubricMaxPoints = 0,
							baselineBucketCounts = {},
							baselineFirstBucketCounts = {},
							baselineResponseTimeBands = {},
							baselineMisconceptionCounts = {},
							sumPilotSessionAccuracy = 0,
							sumPilotSessionAccuracySquared = 0,
							sumPilotItemSessionProduct = 0,
							responseTimeBands = {},
							choiceIndexCounts = {},
							misconceptionCounts = {},
							variants = {},
							sumSessionAccuracy = 0,
							sumSessionAccuracySquared = 0,
							sumItemSessionProduct = 0,
							updatedAt = 0,
						}
						aggregate.items[questionId] = row
					end

					row.sessions = (row.sessions or 0) + 1
					row.attempts = (row.attempts or 0) + (item.scoredAttempts or 0)
					row.correct = (row.correct or 0) + (item.correct or 0)
					row.wrong = (row.wrong or 0) + (item.wrong or 0)
					row.firstAttempts = (row.firstAttempts or 0) + 1
					row.firstCorrect = (row.firstCorrect or 0) + (if item.firstCorrect == true then 1 else 0)
					row.rubricPoints = (row.rubricPoints or 0) + (item.rubricPoints or 0)
					row.rubricMaxPoints = (row.rubricMaxPoints or 0) + (item.rubricMaxPoints or 0)
					row.supportAttempts = (row.supportAttempts or 0) + (item.supportAttempts or 0)
					row.pilotAttempts = (row.pilotAttempts or 0) + (item.pilotAttempts or 0)
					row.pilotCorrect = (row.pilotCorrect or 0) + (item.pilotCorrect or 0)
					row.pilotWrong = (row.pilotWrong or 0) + (item.pilotWrong or 0)
					row.firstPilotAttempts =
						(row.firstPilotAttempts or 0) + (if item.firstPilot == true then 1 else 0)
					row.firstPilotCorrect =
						(row.firstPilotCorrect or 0) + (if item.firstPilot == true and item.firstCorrect == true then 1 else 0)
					row.pilotRubricPoints = (row.pilotRubricPoints or 0) + (item.pilotRubricPoints or 0)
					row.pilotRubricMaxPoints = (row.pilotRubricMaxPoints or 0) + (item.pilotRubricMaxPoints or 0)
					row.pilotBucketCounts = type(row.pilotBucketCounts) == "table" and row.pilotBucketCounts or {}
					row.firstPilotBucketCounts = type(row.firstPilotBucketCounts) == "table" and row.firstPilotBucketCounts or {}
					row.pilotResponseTimeBands = type(row.pilotResponseTimeBands) == "table" and row.pilotResponseTimeBands or {}
					row.pilotMisconceptionCounts = type(row.pilotMisconceptionCounts) == "table" and row.pilotMisconceptionCounts or {}
					row.baselinePilotAttempts = (row.baselinePilotAttempts or 0) + (item.baselinePilotAttempts or 0)
					row.baselinePilotCorrect = (row.baselinePilotCorrect or 0) + (item.baselinePilotCorrect or 0)
					row.baselinePilotWrong = (row.baselinePilotWrong or 0) + (item.baselinePilotWrong or 0)
					row.baselineFirstAttempts = (row.baselineFirstAttempts or 0) + (item.baselineFirstAttempts or 0)
					row.baselineFirstCorrect = (row.baselineFirstCorrect or 0) + (item.baselineFirstCorrect or 0)
					row.baselineRubricPoints = (row.baselineRubricPoints or 0) + (item.baselineRubricPoints or 0)
					row.baselineRubricMaxPoints = (row.baselineRubricMaxPoints or 0) + (item.baselineRubricMaxPoints or 0)
					row.baselineBucketCounts = type(row.baselineBucketCounts) == "table" and row.baselineBucketCounts or {}
					row.baselineFirstBucketCounts = type(row.baselineFirstBucketCounts) == "table" and row.baselineFirstBucketCounts or {}
					row.baselineResponseTimeBands = type(row.baselineResponseTimeBands) == "table" and row.baselineResponseTimeBands or {}
					row.baselineMisconceptionCounts = type(row.baselineMisconceptionCounts) == "table" and row.baselineMisconceptionCounts or {}
					mergeCounters(row.pilotBucketCounts, item.pilotBucketCounts)
					mergeCounters(row.firstPilotBucketCounts, item.firstPilotBucketCounts)
					mergeCounters(row.pilotResponseTimeBands, item.pilotResponseTimeBands)
					mergeCounters(row.pilotMisconceptionCounts, item.pilotMisconceptionCounts)
					mergeCounters(row.baselineBucketCounts, item.baselineBucketCounts)
					mergeCounters(row.baselineFirstBucketCounts, item.baselineFirstBucketCounts)
					mergeCounters(row.baselineResponseTimeBands, item.baselineResponseTimeBands)
					mergeCounters(row.baselineMisconceptionCounts, item.baselineMisconceptionCounts)
					if item.firstPilot == true and pilotSessionAccuracy ~= nil then
						row.sumPilotSessionAccuracy = (row.sumPilotSessionAccuracy or 0) + pilotSessionAccuracy
						row.sumPilotSessionAccuracySquared =
							(row.sumPilotSessionAccuracySquared or 0) + (pilotSessionAccuracy * pilotSessionAccuracy)
						row.sumPilotItemSessionProduct =
							(row.sumPilotItemSessionProduct or 0) + (if item.firstCorrect == true then pilotSessionAccuracy else 0)
					end
					row.responseTimeBands = type(row.responseTimeBands) == "table" and row.responseTimeBands or {}
					row.choiceIndexCounts = type(row.choiceIndexCounts) == "table" and row.choiceIndexCounts or {}
					row.misconceptionCounts = type(row.misconceptionCounts) == "table" and row.misconceptionCounts or {}
					mergeCounters(row.responseTimeBands, item.responseTimeBands)
					mergeCounters(row.choiceIndexCounts, item.choiceIndexCounts)
					mergeCounters(row.misconceptionCounts, item.misconceptionCounts)
					row.sumSessionAccuracy = (row.sumSessionAccuracy or 0) + sessionAccuracy
					row.sumSessionAccuracySquared = (row.sumSessionAccuracySquared or 0) + (sessionAccuracy * sessionAccuracy)
					row.sumItemSessionProduct =
						(row.sumItemSessionProduct or 0) + (if item.firstCorrect == true then sessionAccuracy else 0)

					local variant = item.firstVariant
					if variant == "A" or variant == "B" then
						row.variants = type(row.variants) == "table" and row.variants or {}
						local variantRow = row.variants[variant]
						if type(variantRow) ~= "table" then
							variantRow = {firstAttempts = 0, firstCorrect = 0, rubricPoints = 0, rubricMaxPoints = 0}
							row.variants[variant] = variantRow
						end
						variantRow.firstAttempts = (variantRow.firstAttempts or 0) + 1
						variantRow.firstCorrect =
							(variantRow.firstCorrect or 0) + (if item.firstCorrect == true then 1 else 0)
						variantRow.rubricPoints = (variantRow.rubricPoints or 0) + (item.firstRubricPoints or 0)
						variantRow.rubricMaxPoints = (variantRow.rubricMaxPoints or 0) + (item.firstRubricMaxPoints or 0)
					end
					row.updatedAt = os.time()
				end
			end

			local keys = {}
			for questionId, row in aggregate.items do
				table.insert(keys, {questionId = questionId, updatedAt = tonumber(row.updatedAt) or 0})
			end
			if #keys > MAX_ITEM_ROWS then
				table.sort(keys, function(a, b) return a.updatedAt > b.updatedAt end)
				for index = MAX_ITEM_ROWS + 1, #keys do
					aggregate.items[keys[index].questionId] = nil
				end
			end

			aggregate.updatedAt = os.time()
			return aggregate
		end)
	end)

	if not ok then
		self._aggregatedItemSessions[report.sessionId] = nil
		warn("StarBlox question item metrics persist failed: " .. tostring(reason))
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

	if eventName == "question_attempt" and questionId ~= nil then
		local item = report.itemAttempts[questionId]
		if type(item) ~= "table" then
			item = {
				attempts = 0,
				scoredAttempts = 0,
				correct = 0,
				wrong = 0,
				supportAttempts = 0,
				pilotAttempts = 0,
				pilotCorrect = 0,
				pilotWrong = 0,
				pilotRubricPoints = 0,
				pilotRubricMaxPoints = 0,
				pilotBucketCounts = {},
				firstPilotBucketCounts = {},
				pilotResponseTimeBands = {},
				pilotMisconceptionCounts = {},
				baselinePilotAttempts = 0,
				baselinePilotCorrect = 0,
				baselinePilotWrong = 0,
				baselineFirstAttempts = 0,
				baselineFirstCorrect = 0,
				baselineRubricPoints = 0,
				baselineRubricMaxPoints = 0,
				baselineBucketCounts = {},
				baselineFirstBucketCounts = {},
				baselineResponseTimeBands = {},
				baselineMisconceptionCounts = {},
				rubricPoints = 0,
				rubricMaxPoints = 0,
				responseTimeBands = {},
				choiceIndexCounts = {},
				misconceptionCounts = {},
				firstScoredSeen = false,
				firstCorrect = false,
				firstPilot = false,
				firstVariant = nil,
				firstRubricPoints = 0,
				firstRubricMaxPoints = 0,
			}
			report.itemAttempts[questionId] = item
		end

		item.attempts += 1
		local support = cleanBool(source.support)
		local pilot = cleanBool(source.pilot)
		local baseline = pilot and cleanBool(source.baseline)
		local correct = cleanBool(source.correct)
		local attemptIndex = clampInteger(source.attemptIndex, 1, 100)
		local pilotSessionNumber = clampInteger(source.pilotSessionNumber, 0, 1000000)
		local baselinePendingItem = nil
		local pilotBucket = nil
		if pilot then
			item.pilotAttempts += 1
			if correct then item.pilotCorrect += 1 else item.pilotWrong += 1 end
			pilotBucket = cleanMetricKey(source.pilotBucket, 40)
			if pilotBucket ~= nil then
				ensureCounter(item.pilotBucketCounts, pilotBucket)
			end
			local pilotBand = cleanMetricKey(source.responseTimeBand, 20)
			if pilotBand ~= nil and ALLOWED_RESPONSE_TIME_BANDS[pilotBand] == true then
				ensureCounter(item.pilotResponseTimeBands, pilotBand)
			end
			local pilotMisconception = cleanMetricKey(source.misconception, 80)
			if pilotMisconception ~= nil then
				ensureCounter(item.pilotMisconceptionCounts, pilotMisconception)
			end

			if baseline and pilotSessionNumber >= 1 then
				local pending = ensureBaselinePending(report, pilotSessionNumber)
				baselinePendingItem = ensureBaselinePendingItem(pending, questionId)
				baselinePendingItem.attempts += 1
				if correct then
					baselinePendingItem.correct += 1
				else
					baselinePendingItem.wrong += 1
				end
				if attemptIndex == 1 then
					baselinePendingItem.firstAttempts += 1
					if correct then baselinePendingItem.firstCorrect += 1 end
					if pilotBucket ~= nil then
						ensureCounter(baselinePendingItem.firstBucketCounts, pilotBucket)
					end
				end
				if pilotBucket ~= nil then
					ensureCounter(baselinePendingItem.bucketCounts, pilotBucket)
				end
				if pilotBand ~= nil and ALLOWED_RESPONSE_TIME_BANDS[pilotBand] == true then
					ensureCounter(baselinePendingItem.responseTimeBands, pilotBand)
				end
				if pilotMisconception ~= nil then
					ensureCounter(baselinePendingItem.misconceptionCounts, pilotMisconception)
				end
			end
		end
		local rubricPoints = clampInteger(source.rubricPoints, 0, 10)
		local rubricMaxPoints = math.max(1, clampInteger(source.rubricMaxPoints, 1, 10))
		if pilot then
			item.pilotRubricPoints += rubricPoints
			item.pilotRubricMaxPoints += rubricMaxPoints
			if baselinePendingItem ~= nil then
				baselinePendingItem.rubricPoints += rubricPoints
				baselinePendingItem.rubricMaxPoints += rubricMaxPoints
			end
		end
		item.rubricPoints += rubricPoints
		item.rubricMaxPoints += rubricMaxPoints
		if support then
			item.supportAttempts += 1
		else
			item.scoredAttempts += 1
			if correct then item.correct += 1 else item.wrong += 1 end
			if item.firstScoredSeen ~= true then
				item.firstScoredSeen = true
				item.firstCorrect = correct
				item.firstPilot = pilot
				if pilot and pilotBucket ~= nil then
					ensureCounter(item.firstPilotBucketCounts, pilotBucket)
				end
				item.firstRubricPoints = rubricPoints
				item.firstRubricMaxPoints = rubricMaxPoints
				local variant = cleanMetricKey(source.variantId, 8)
				if variant == "A" or variant == "B" then item.firstVariant = variant end
			end
		end

		local band = cleanMetricKey(source.responseTimeBand, 20)
		if band ~= nil and ALLOWED_RESPONSE_TIME_BANDS[band] == true then
			ensureCounter(item.responseTimeBands, band)
		end
		local choice = clampInteger(source.choiceIndex, 0, 3)
		if choice >= 1 and choice <= 3 then
			ensureCounter(item.choiceIndexCounts, tostring(choice))
		end
		local misconception = cleanMetricKey(source.misconception, 80)
		if misconception ~= nil then
			ensureCounter(item.misconceptionCounts, misconception)
		end
	elseif eventName == "pilot_started" then
		if cleanBool(source.baseline) then
			local pilotSessionNumber = clampInteger(source.pilotSessionNumber, 0, 1000000)
			if pilotSessionNumber >= 1 then
				ensureBaselinePending(report, pilotSessionNumber)
				report.retention.baselinePilotSessionsStarted += 1
			end
		end
	elseif eventName == "pilot_completed" then
		if cleanBool(source.baseline) then
			local pilotSessionNumber = clampInteger(source.pilotSessionNumber, 0, 1000000)
			if pilotSessionNumber >= 1 and commitBaselinePending(report, pilotSessionNumber) then
				report.retention.baselinePilotSessionsCompleted += 1
			end
		end
	elseif eventName == "station_opened" then
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
	self:_persistItemMetricsAggregate(report)
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
			self:_persistItemMetricsAggregate(report)
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
