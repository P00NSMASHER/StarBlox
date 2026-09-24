--!strict

local ReplayIngressService = {}
ReplayIngressService.__index = ReplayIngressService

function ReplayIngressService.new(config)
	config = config or {}
	local self = setmetatable({}, ReplayIngressService)
	self._maxChunks = config.maxChunks or 512
	self._maxChunkBytes = config.maxChunkBytes or 8192
	self._maxReplayBytes = config.maxReplayBytes or 2 * 1024 * 1024
	self._sessions = {}
	return self
end

function ReplayIngressService:Begin(sessionId: string, replayId: string, engineVersion: string, seed: number)
	assert(self._sessions[sessionId] == nil, "replay session already exists")
	self._sessions[sessionId] = {
		replayId = replayId,
		engineVersion = engineVersion,
		seed = seed,
		nextChunkIndex = 1,
		bytes = 0,
		chunks = {},
	}
end

function ReplayIngressService:Append(sessionId: string, chunkIndex: number, chunk: string)
	local session = self._sessions[sessionId]
	assert(session ~= nil, "unknown replay session")
	assert(chunkIndex == session.nextChunkIndex, "replay chunks must be contiguous and ordered")
	assert(#session.chunks < self._maxChunks, "replay chunk limit exceeded")
	assert(#chunk <= self._maxChunkBytes, "replay chunk too large")
	assert(session.bytes + #chunk <= self._maxReplayBytes, "replay byte budget exceeded")

	table.insert(session.chunks, chunk)
	session.bytes += #chunk
	session.nextChunkIndex += 1
end

function ReplayIngressService:Finalize(sessionId: string)
	local session = self._sessions[sessionId]
	assert(session ~= nil, "unknown replay session")
	self._sessions[sessionId] = nil

	-- Evidence only. No score/final-state/result fields are accepted from the
	-- client here; authoritative verification remains the deterministic
	-- re-simulation service.
	return {
		replayId = session.replayId,
		engineVersion = session.engineVersion,
		seed = session.seed,
		chunkCount = #session.chunks,
		bytes = session.bytes,
		chunks = session.chunks,
	}
end

function ReplayIngressService:Abort(sessionId: string)
	self._sessions[sessionId] = nil
end

return ReplayIngressService
