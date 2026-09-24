--!strict

local AiNpcService = {}
AiNpcService.__index = AiNpcService

local FORBIDDEN_TOOL_WORDS = {
	"reward", "currency", "coin", "xp", "star", "mastery",
	"purchase", "spend", "publish", "deploy", "execute", "script",
	"datastore", "admin", "moder", "ban", "kick", "http", "secret", "credential",
}

local FORBIDDEN_ARG_WORDS = {
	"reward", "currency", "coin", "xp", "star", "mastery", "score",
	"correct", "answer", "selectedanswer", "publish", "purchase", "spend",
	"script", "source", "code", "command", "password", "secret", "token",
	"credential", "userid", "playerid",
}

local function semanticTokens(value: string)
	local normalized = string.gsub(value, "([a-z0-9])([A-Z])", "%1_%2")
	normalized = string.lower(normalized)
	local tokens = {}
	for token in string.gmatch(normalized, "[a-z0-9]+") do
		table.insert(tokens, token)
	end
	return tokens
end

local function containsSemanticToken(value: string, words): boolean
	for _, token in semanticTokens(value) do
		for _, word in words do
			if token == word then
				return true
			end
		end
	end
	return false
end

local function forbiddenArgKey(value: string): boolean
	local compact = string.gsub(string.lower(value), "[^a-z0-9]", "")
	if compact == "selectedanswer" or compact == "userid" or compact == "playerid" or compact == "apikey" then
		return true
	end
	return containsSemanticToken(value, FORBIDDEN_ARG_WORDS)
end

local function cleanString(value, maxLength: number): string?
	if type(value) ~= "string" then
		return nil
	end
	local clean = string.gsub(value, "^%s*(.-)%s*$", "%1")
	if clean == "" or #clean > maxLength then
		return nil
	end
	return clean
end

local function ensureAiNpc(profileData)
	profileData.AiNpc = profileData.AiNpc or {
		Memories = {},
		ProcessedRequestIds = {},
	}
	return profileData.AiNpc
end

local function findNpc(catalog, npcId: string)
	if type(catalog) ~= "table" or type(catalog.Npcs) ~= "table" then
		return nil
	end
	for _, def in catalog.Npcs do
		if def.NpcId == npcId then
			return def
		end
	end
	return nil
end

local function allowedToolSet(def)
	local out = {}
	for _, name in def.AllowedTools or {} do
		if type(name) == "string" and not containsSemanticToken(name, FORBIDDEN_TOOL_WORDS) then
			out[name] = true
		end
	end
	return out
end

local function validateValue(value, path: string, depth: number): (boolean, string?)
	if depth > 4 then
		return false, path .. " exceeds nesting limit"
	end
	local kind = type(value)
	if value == nil or kind == "boolean" or kind == "string" then
		return true, nil
	end
	if kind == "number" then
		if value ~= value or value == math.huge or value == -math.huge then
			return false, path .. " contains non-finite number"
		end
		return true, nil
	end
	if kind ~= "table" then
		return false, path .. " contains unsupported value"
	end

	local count = 0
	for key, child in value do
		count += 1
		if count > 30 then
			return false, path .. " contains too many fields"
		end
		if type(key) == "string" and forbiddenArgKey(key) then
			return false, path .. "." .. key .. " crosses authority boundary"
		end
		local ok, reason = validateValue(child, path .. "." .. tostring(key), depth + 1)
		if not ok then
			return false, reason
		end
	end
	return true, nil
end

local function safeMemoryFact(value): string?
	local fact = cleanString(value, 120)
	if fact == nil then
		return nil
	end
	local lower = string.lower(fact)
	local blocked = {
		"http://", "https://", "www.", "@", "discord", "snapchat",
		"phone number", "home address", "street address", "password",
		"real name", "school name",
	}
	for _, token in blocked do
		if string.find(lower, token, 1, true) ~= nil then
			return nil
		end
	end
	if string.find(fact, "%d%d%d%d%d%d%d") ~= nil then
		return nil
	end
	return fact
end

local function normalizeResponse(def, response, allowTools: boolean)
	if type(response) ~= "table" then
		return nil, "model response must be a table"
	end

	local maxOutput = math.clamp(math.floor(def.MaxOutputChars or 420), 64, 1000)
	local output = cleanString(response.text, maxOutput)
	if output == nil then
		return nil, "model response text is invalid"
	end

	local tools = {}
	local rawTools = if type(response.toolCalls) == "table" then response.toolCalls else {}
	local maxToolCalls = math.clamp(math.floor(def.MaxToolCalls or 3), 0, 8)
	if not allowTools and #rawTools > 0 then
		return nil, "final model response may not request tools"
	end
	if #rawTools > maxToolCalls then
		return nil, "model requested too many tools"
	end

	local allowed = allowedToolSet(def)
	for index, raw in rawTools do
		if type(raw) ~= "table" or type(raw.name) ~= "string" then
			return nil, "invalid tool call " .. tostring(index)
		end
		if allowed[raw.name] ~= true then
			return nil, "tool not allowed for NPC: " .. raw.name
		end
		local args = if type(raw.args) == "table" then raw.args else {}
		local ok, reason = validateValue(args, "tool.args", 0)
		if not ok then
			return nil, reason
		end
		table.insert(tools, {
			name = raw.name,
			args = args,
		})
	end

	local facts = {}
	local memoryLimit = math.clamp(math.floor(def.MemoryLimit or 20), 0, 50)
	if type(response.memoryFacts) == "table" then
		for _, rawFact in response.memoryFacts do
			if #facts >= memoryLimit then
				break
			end
			local fact = safeMemoryFact(rawFact)
			if fact ~= nil and table.find(facts, fact) == nil then
				table.insert(facts, fact)
			end
		end
	end

	return {
		text = output,
		toolCalls = tools,
		memoryFacts = facts,
	}, nil
end

local function safeGameContext(raw)
	local out = {}
	if type(raw) ~= "table" then
		return out
	end
	local allowed = {
		district = true,
		questId = true,
		dailyId = true,
		npcAffinity = true,
		friendshipLevel = true,
		activeMinigame = true,
		learningNeed = true,
		roleHint = true,
	}
	for key, value in raw do
		if allowed[key] then
			local kind = type(value)
			if kind == "string" then
				out[key] = string.sub(value, 1, 120)
			elseif kind == "boolean" then
				out[key] = value
			elseif kind == "number" and value == value and value ~= math.huge and value ~= -math.huge then
				out[key] = value
			end
		end
	end
	return out
end

local function appendBoundedUnique(target, values, limit: number)
	for _, value in values do
		if table.find(target, value) == nil then
			table.insert(target, value)
		end
	end
	while #target > limit do
		table.remove(target, 1)
	end
end

function AiNpcService.new(profiles, adapters, telemetrySink)
	assert(profiles ~= nil, "profiles service is required")
	local self = setmetatable({}, AiNpcService)
	self._profiles = profiles
	self._adapters = adapters or {}
	self._telemetry = telemetrySink
	self._lastTurn = {}
	self._inFlight = {}
	return self
end

function AiNpcService:RequestTurn(player: Player, npcId: string, message: string, requestId: string)
	local catalog = self._adapters.Catalog
	local def = findNpc(catalog, npcId)
	if def == nil then
		return false, "unknown AI NPC"
	end

	local maxInput = math.clamp(math.floor(def.MaxInputChars or 280), 32, 1000)
	local cleanInput = cleanString(message, maxInput)
	local cleanRequestId = cleanString(requestId, 120)
	if cleanInput == nil or cleanRequestId == nil then
		return false, "invalid AI NPC request"
	end

	local provider = self._adapters.ModelProvider
	local textPolicy = self._adapters.TextPolicy
	if provider == nil or provider.Generate == nil or textPolicy == nil
		or textPolicy.ModerateInput == nil or textPolicy.FilterOutput == nil then
		return false, "AI NPC adapters unavailable"
	end

	local profile = self._profiles:Get(player)
	if profile == nil then
		return false, "profile unavailable"
	end
	local aiState = ensureAiNpc(profile.Data)
	if table.find(aiState.ProcessedRequestIds, cleanRequestId) ~= nil then
		return false, "duplicate AI NPC request"
	end

	self._inFlight[player] = self._inFlight[player] or {}
	if self._inFlight[player][cleanRequestId] then
		return false, "AI NPC request already in flight"
	end

	local perPlayer = self._lastTurn[player] or {}
	local now = os.clock()
	local cooldown = math.clamp(def.CooldownSeconds or 1.5, 0.25, 30)
	local previous = perPlayer[npcId]
	if previous ~= nil and now - previous < cooldown then
		return false, "AI NPC cooldown"
	end
	perPlayer[npcId] = now
	self._lastTurn[player] = perPlayer
	self._inFlight[player][cleanRequestId] = true

	local function finish(ok, result)
		if self._inFlight[player] then
			self._inFlight[player][cleanRequestId] = nil
		end
		return ok, result
	end

	local moderateOk, moderation = pcall(function()
		return textPolicy.ModerateInput(player, cleanInput)
	end)
	if not moderateOk or type(moderation) ~= "table" or moderation.ok ~= true then
		return finish(false, "AI NPC input blocked")
	end
	local modelInput = cleanString(moderation.text or cleanInput, maxInput)
	if modelInput == nil then
		return finish(false, "AI NPC input blocked")
	end

	local context = {}
	if self._adapters.ContextBuilder then
		local ok, built = pcall(function()
			return self._adapters.ContextBuilder(player, npcId, profile.Data)
		end)
		if ok then
			context = safeGameContext(built)
		end
	end

	local memory = {}
	local memoryLimit = math.clamp(math.floor(def.MemoryLimit or 20), 0, 50)
	if type(aiState.Memories[npcId]) == "table" then
		for index = math.max(1, #aiState.Memories[npcId] - memoryLimit + 1), #aiState.Memories[npcId] do
			table.insert(memory, aiState.Memories[npcId][index])
		end
	end

	local baseRequest = {
		version = "starblox-ai-npc-v1",
		npcId = npcId,
		requestId = cleanRequestId,
		system = string.sub(def.SystemPrompt or "", 1, 2400),
		input = modelInput,
		memory = memory,
		knowledgeTags = def.KnowledgeTags or {},
		gameContext = context,
		tools = def.AllowedTools or {},
	}

	local generatedOk, raw = pcall(function()
		return provider.Generate(baseRequest)
	end)
	if not generatedOk then
		return finish(false, "AI NPC provider failed")
	end

	local first, responseError = normalizeResponse(def, raw, true)
	if first == nil then
		return finish(false, responseError or "AI NPC response rejected")
	end

	local toolResults = {}
	local handlers = self._adapters.ToolHandlers or {}
	for _, call in first.toolCalls do
		local handler = handlers[call.name]
		if type(handler) ~= "function" then
			return finish(false, "AI NPC tool handler unavailable: " .. call.name)
		end
		local ok, result = pcall(function()
			return handler(player, npcId, call.args, profile.Data)
		end)
		if not ok or type(result) ~= "table" then
			return finish(false, "AI NPC tool failed: " .. call.name)
		end
		local safe, reason = validateValue(result, "tool.result", 0)
		if not safe then
			return finish(false, reason or "AI NPC tool result rejected")
		end
		table.insert(toolResults, {
			name = call.name,
			result = result,
		})
	end

	local finalResponse = first
	if #toolResults > 0 then
		local secondRequest = table.clone(baseRequest)
		secondRequest.toolResults = toolResults
		secondRequest.phase = "final"
		local ok, secondRaw = pcall(function()
			return provider.Generate(secondRequest)
		end)
		if not ok then
			return finish(false, "AI NPC provider finalization failed")
		end
		local normalized, finalError = normalizeResponse(def, secondRaw, false)
		if normalized == nil then
			return finish(false, finalError or "AI NPC final response rejected")
		end
		finalResponse = normalized
		for _, fact in first.memoryFacts do
			if table.find(finalResponse.memoryFacts, fact) == nil then
				table.insert(finalResponse.memoryFacts, fact)
			end
		end
	end

	local filterOk, filtered = pcall(function()
		return textPolicy.FilterOutput(player, finalResponse.text)
	end)
	if not filterOk or type(filtered) ~= "string" or filtered == "" then
		return finish(false, "AI NPC output filter failed")
	end

	local currentProfile = self._profiles:Get(player)
	if currentProfile == nil or currentProfile ~= profile or not profile:IsActive() then
		return finish(false, "profile session ended during AI NPC turn")
	end

	local currentState = ensureAiNpc(profile.Data)
	if table.find(currentState.ProcessedRequestIds, cleanRequestId) ~= nil then
		return finish(false, "duplicate AI NPC request")
	end

	local approvedFacts = {}
	local memoryPolicy = self._adapters.MemoryPolicy
	if memoryPolicy and memoryPolicy.AllowFact then
		for _, fact in finalResponse.memoryFacts do
			local ok, allowed = pcall(function()
				return memoryPolicy.AllowFact(player, npcId, fact, profile.Data)
			end)
			if ok and allowed == true then
				local safeFact = safeMemoryFact(fact)
				if safeFact ~= nil then
					table.insert(approvedFacts, safeFact)
				end
			end
		end
	end

	currentState.Memories[npcId] = currentState.Memories[npcId] or {}
	appendBoundedUnique(currentState.Memories[npcId], approvedFacts, memoryLimit)
	appendBoundedUnique(currentState.ProcessedRequestIds, {cleanRequestId}, 200)

	if self._telemetry then
		pcall(function()
			self._telemetry("ai_npc_turn", {
				npcId = npcId,
				toolCount = #toolResults,
				memoryFactsAccepted = #approvedFacts,
			})
		end)
	end

	return finish(true, {
		npcId = npcId,
		requestId = cleanRequestId,
		text = filtered,
		toolCount = #toolResults,
	})
end

function AiNpcService:PlayerRemoving(player: Player)
	self._lastTurn[player] = nil
	self._inFlight[player] = nil
end

return AiNpcService
