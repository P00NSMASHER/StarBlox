--!strict

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")
local StudioTestService = game:GetService("StudioTestService")
local VirtualInputManager = game:GetService("VirtualInputManager")

local Runtime = {}
Runtime.__index = Runtime

local STOP_REQUEST_KEY = "StarBloxDevFactory.StopRequest"
local STOP_ACK_KEY = "StarBloxDevFactory.StopAck"

local function role(): string
	if not RunService:IsRunning() then return "edit" end
	if RunService:IsServer() then return "server" end
	return "client"
end

function Runtime.new(pluginObject: Plugin)
	return setmetatable({
		plugin = pluginObject,
		testRunning = false,
		lastStopRequest = nil,
	}, Runtime)
end

function Runtime:startStopMonitor()
	if role() ~= "server" then return end
	task.spawn(function()
		while RunService:IsRunning() do
			local requestId = self.plugin:GetSetting(STOP_REQUEST_KEY)
			if type(requestId) == "string" and requestId ~= "" and requestId ~= self.lastStopRequest then
				self.lastStopRequest = requestId
				local ok, result = pcall(function()
					return StudioTestService:EndTest("starblox_factory_stop")
				end)
				local errorText = nil
				if not ok then
					local message = tostring(result)
					if string.find(message, "can only be called once", 1, true) then
						ok = true
					else
						errorText = message
					end
				end
				self.plugin:SetSetting(STOP_ACK_KEY, HttpService:JSONEncode({
					id = requestId,
					ok = ok,
					error = errorText,
				}))
			end
			task.wait(0.1)
		end
	end)
end

function Runtime:getRunState(_args: any): any
	local currentRole = role()
	if currentRole ~= "edit" then
		return {
			running = RunService:IsRunning(),
			runMode = RunService:IsRunMode(),
			edit = RunService:IsEdit(),
			role = currentRole,
		}
	end

	local editModeActive = true
	pcall(function()
		editModeActive = (StudioTestService :: any).EditModeActive
	end)
	return {
		running = self.testRunning or editModeActive == false,
		runMode = false,
		edit = true,
		role = "edit",
	}
end

function Runtime:startPlaytest(args: any): any
	if role() ~= "edit" then error("start_playtest must run on the edit peer") end
	if self.testRunning then error("a factory playtest is already running") end
	local mode = tostring(args.mode or "play")
	if mode ~= "play" and mode ~= "run" then error('mode must be "play" or "run"') end

	self.testRunning = true
	task.spawn(function()
		local ok, result = pcall(function()
			if mode == "run" then
				return (StudioTestService :: any):ExecuteRunModeAsync({})
			end
			return (StudioTestService :: any):ExecutePlayModeAsync({})
		end)
		if not ok then
			warn("[StarBlox Factory] Playtest ended with error: " .. tostring(result))
		end
		self.testRunning = false
	end)

	return { success = true, mode = mode, message = "playtest start requested" }
end

function Runtime:stopPlaytest(_args: any): any
	if role() ~= "edit" then error("stop_playtest must run on the edit peer") end
	local requestId = HttpService:GenerateGUID(false)
	self.plugin:SetSetting(STOP_REQUEST_KEY, requestId)

	local deadline = os.clock() + 8
	while os.clock() < deadline do
		local raw = self.plugin:GetSetting(STOP_ACK_KEY)
		if type(raw) == "string" and raw ~= "" then
			local ok, decoded = pcall(function()
				return HttpService:JSONDecode(raw)
			end)
			if ok and decoded.id == requestId then
				if decoded.ok == true then
					return { success = true, message = "playtest stop acknowledged" }
				end
				error("playtest stop failed: " .. tostring(decoded.error))
			end
		end
		task.wait(0.1)
	end

	if not self.testRunning then
		return { success = true, alreadyEnded = true }
	end
	error("playtest stop was not acknowledged by the running server peer")
end

function Runtime:simulateInput(args: any): any
	if role() ~= "client" then error("simulate_input must run on a playtest client peer") end
	local actions = args.actions or {}
	local performed = 0

	for _, action in actions do
		if action.type == "key" then
			local key = (Enum.KeyCode :: any)[action.key]
			if not key then error("invalid KeyCode: " .. tostring(action.key)) end
			VirtualInputManager:SendKeyEvent(true, key, false, nil)
			task.wait(tonumber(action.duration) or 0.1)
			VirtualInputManager:SendKeyEvent(false, key, false, nil)
		elseif action.type == "click" then
			VirtualInputManager:SendMouseButtonEvent(
				tonumber(action.x) or 0,
				tonumber(action.y) or 0,
				0,
				true,
				nil,
				0
			)
			task.wait(0.05)
			VirtualInputManager:SendMouseButtonEvent(
				tonumber(action.x) or 0,
				tonumber(action.y) or 0,
				0,
				false,
				nil,
				0
			)
		elseif action.type == "move" then
			VirtualInputManager:SendMouseMoveEvent(tonumber(action.x) or 0, tonumber(action.y) or 0, nil)
		elseif action.type == "wait" then
			task.wait(math.max(0, tonumber(action.seconds) or 0.5))
		else
			error("unsupported input action: " .. tostring(action.type))
		end
		performed += 1
		task.wait(0.02)
	end

	return { ok = true, performed = performed }
end

function Runtime:sampleState(args: any): any
	if role() ~= "server" then error("playtest_sample_state must run on the server peer") end
	local requested = {}
	for _, name in args.domains or { "players", "world", "runtime" } do
		requested[tostring(name)] = true
	end
	local out = {}

	if requested.runtime then
		out.runtime = {
			isRunning = RunService:IsRunning(),
			isServer = RunService:IsServer(),
			isClient = RunService:IsClient(),
			isStudio = RunService:IsStudio(),
		}
	end

	if requested.players then
		local players = {}
		for _, player in Players:GetPlayers() do
			local info: any = { name = player.Name }
			local character = player.Character
			if character then
				local rootPart = character:FindFirstChild("HumanoidRootPart")
				if rootPart and rootPart:IsA("BasePart") then
					info.position = { rootPart.Position.X, rootPart.Position.Y, rootPart.Position.Z }
				end
				local humanoid = character:FindFirstChildOfClass("Humanoid")
				if humanoid then
					info.health = humanoid.Health
					info.maxHealth = humanoid.MaxHealth
				end
			end
			table.insert(players, info)
		end
		out.players = players
		out.playerCount = #players
	end

	if requested.world then
		local values = {}
		local total = 0
		local limit = 100
		for _, root in {
			game:GetService("Workspace"),
			game:GetService("ReplicatedStorage"),
			game:GetService("ServerStorage"),
		} do
			for _, inst in root:GetDescendants() do
				if inst:IsA("ValueBase") then
					total += 1
					if #values < limit then
						local ok, value = pcall(function()
							return (inst :: any).Value
						end)
						if ok then
							table.insert(values, {
								path = inst:GetFullName(),
								className = inst.ClassName,
								value = tostring(value),
							})
						end
					end
				end
			end
		end
		out.worldValues = values
		out.worldValueCount = total
		out.worldValuesTruncated = total > #values
	end

	return out
end

return Runtime
