--!strict

local Players = game:GetService("Players")
local HttpService = game:GetService("HttpService")

local MAX_MEMORY_ROWS = 12
local MAX_MESSAGE_CHARS = 400
local MAX_REPLY_CHARS = 500
local MAX_TOOL_CALLS = 3

local FORBIDDEN_TOOLS = {
	awardCoins = true,
	awardXp = true,
	awardStars = true,
	setMastery = true,
	setAbility = true,
	writeProfile = true,
	setDataStore = true,
	executeLuau = true,
	runCode = true,
	publishPlace = true,
	purchaseProduct = true,
}

local AiNpcService = {}
AiNpcService.__index = AiNpcService

local function ensureAiState(profileData)
	profileData.AiNpc = profileData.AiNpc or {
		Memory = {},
	}
	return profileData.AiNpc
end

local function trim(text: string, maxLength: number): string
	text = string.gsub(text, "[%c]+", " ")
	text = string.gsub(text, "%s+", " ")
	text = string.gsub(text, "^%s+", "")
	text = string.gsub(text, "%s+$", "")
	if #text > maxLength then
		text = string.sub(text, 1, maxLength)
	end
	return text
end

local function memoryFor(profileData, npcId: string)
	local state = ensureAiState(profileData)
	state.Memory[npcId] = state.Memory[npcId] or {}
	return state.Memory[npcId]
end

local function pushMemory(profileData, npcId: string, role: string, message: string)
	local rows = memoryFor(profileData, npcId)
	table.insert(rows, {
		Role = role,
		Text = message,
	})
	while #rows > MAX_MEMORY_ROWS do
		table.remove(rows, 1)
	end
end

local function publicPlayerContext(profileData)
	return {
		Economy = {
			Coins = profileData.Economy.Coins,
			XP = profileData.Economy.XP,
			Stars = profileData.Economy.Stars,
		},
		Progress = {
			Districts = table.clone(profileData.Progress.Districts),
			MasteredSkills = table.clone(profileData.Progress.MasteredSkills),
		},
		Daily = {
			LastDailyId = profileData.Daily.LastDailyId,
			Streak = profileData.Daily.Streak,
		},
		Social = profileData.Social and {
			NpcAffinity = table.clone(profileData.Social.NpcAffinity or {}),
			UnlockedSocialItems = table.clone(profileData.Social.UnlockedSocialItems or {}),
		} or {},
	}
end

function AiNpcService.new(profiles, adapters)
	assert(profiles ~= nil, "profiles service is required")
	assert(adapters ~= nil, "AI NPC adapters are required")
	assert(adapters.Provider ~= nil, "AI NPC provider is required")
	assert(adapters.FilterOutput ~= nil, "AI NPC output filter is required")
	assert(adapters.Config ~= nil, "AI NPC config is required")

	local self = setmetatable({}, AiNpcService)
	self._profiles = profiles
	self._provider = adapters.Provider
	self._moderator = adapters.Moderator
	self._filterOutput = adapters.FilterOutput
	self._toolExecutor = adapters.ToolExecutor
	self._config = adapters.Config
	self._lastTurnAt = {}
	return self
end

function AiNpcService:_definition(npcId: string)
	return self._config[npcId]
end

function AiNpcService:_cooldownKey(player: Player, npcId: string)
	return tostring(player.UserId) .. ":" .. npcId
end

function AiNpcService:Talk(player: Player, npcId: string, message: string)
	local def = self:_definition(npcId)
	if def == nil then
		return false, "unknown NPC"
	end

	local cleanMessage = trim(message, math.min(MAX_MESSAGE_CHARS, def.MaxInputChars or MAX_MESSAGE_CHARS))
	if cleanMessage == "" then
		return false, "empty message"
	end

	local key = self:_cooldownKey(player, npcId)
	local now = os.clock()
	local cooldown = math.max(0, def.CooldownSeconds or 1.5)
	if now - (self._lastTurnAt[key] or -math.huge) < cooldown then
		return false, "NPC cooldown"
	end

	if self._moderator then
		local ok, allowed = pcall(function()
			return self._moderator(player, cleanMessage)
		end)
		if not ok or allowed ~= true then
			return false, "input blocked"
		end
	end

	local profile = self._profiles:Get(player)
	if profile == nil then
		return false, "profile unavailable"
	end

	local allowedTools = {}
	for _, tool in def.AllowedTools or {} do
		allowedTools[tool] = true
	end

	local request = {
		TurnId = HttpService:GenerateGUID(false),
		NpcId = npcId,
		DisplayName = def.DisplayName or npcId,
		Personality = def.Personality,
		Message = cleanMessage,
		Memory = table.clone(memoryFor(profile.Data, npcId)),
		Context = publicPlayerContext(profile.Data),
		AllowedTools = def.AllowedTools or {},
	}

	local okProvider, result = pcall(function()
		return self._provider(request)
	end)
	if not okProvider or type(result) ~= "table" then
		return false, "NPC provider unavailable"
	end

	if type(result.Text) ~= "string" then
		return false, "NPC provider returned invalid text"
	end
	local rawText = trim(result.Text, math.min(MAX_REPLY_CHARS, def.MaxOutputChars or MAX_REPLY_CHARS))
	if rawText == "" then
		return false, "NPC provider returned empty text"
	end

	local rawCalls = if type(result.ToolCalls) == "table" then result.ToolCalls else {}
	if #rawCalls > MAX_TOOL_CALLS then
		return false, "too many NPC tool calls"
	end

	local calls = {}
	for _, call in rawCalls do
		if type(call) ~= "table" or type(call.Tool) ~= "string" then
			return false, "invalid NPC tool call"
		end
		if FORBIDDEN_TOOLS[call.Tool] or not allowedTools[call.Tool] then
			return false, "NPC tool not allowed"
		end
		table.insert(calls, {
			Tool = call.Tool,
			Args = if type(call.Args) == "table" then call.Args else {},
		})
	end

	local okFilter, filtered = pcall(function()
		return self._filterOutput(player, rawText)
	end)
	if not okFilter or type(filtered) ~= "string" or filtered == "" then
		return false, "NPC output filter rejected response"
	end
	filtered = trim(filtered, MAX_REPLY_CHARS)

	local toolResults = {}
	if #calls > 0 and self._toolExecutor == nil then
		return false, "NPC tool executor unavailable"
	end
	for _, call in calls do
		local okTool, toolResult = pcall(function()
			return self._toolExecutor(player, npcId, call)
		end)
		table.insert(toolResults, {
			Tool = call.Tool,
			Ok = okTool and type(toolResult) == "table" and toolResult.ok == true,
		})
	end

	pushMemory(profile.Data, npcId, "player", cleanMessage)
	pushMemory(profile.Data, npcId, "npc", filtered)
	self._lastTurnAt[key] = now

	return true, {
		TurnId = request.TurnId,
		Text = filtered,
		ToolResults = toolResults,
	}
end

function AiNpcService:PlayerRemoving(player: Player)
	local prefix = tostring(player.UserId) .. ":"
	for key in self._lastTurnAt do
		if string.sub(key, 1, #prefix) == prefix then
			self._lastTurnAt[key] = nil
		end
	end
end

return AiNpcService
