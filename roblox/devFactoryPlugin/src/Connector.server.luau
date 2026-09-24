--!strict

local ChangeHistoryService = game:GetService("ChangeHistoryService")
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")

local Inspect = require(script.Parent.Inspect)
local Logs = require(script.Parent.Logs)
local Mutate = require(script.Parent.Mutate)
local RuntimeModule = require(script.Parent.Runtime)
local Tests = require(script.Parent.Tests)
local Vision = require(script.Parent.Vision)

local runtime = RuntimeModule.new(plugin)
runtime:startStopMonitor()

local BRIDGE_URL = plugin:GetSetting("StarBloxDevFactory.BridgeUrl") or "http://127.0.0.1:38473"
local TOKEN = plugin:GetSetting("StarBloxDevFactory.Token") or ""
local INSTANCE_ID = plugin:GetSetting("StarBloxDevFactory.InstanceId") or "default"
local CONNECTOR_VERSION = "starblox-studio-connector-v1"

local function role(): string
	if not RunService:IsRunning() then return "edit" end
	if RunService:IsServer() then return "server" end
	return "client"
end

local MUTATING = {
	write_script = true,
	edit_script = true,
	create_instance = true,
	delete_instance = true,
	set_property = true,
	set_selection = false,
}

local handlers = {
	search_tree = Inspect.search,
	inspect_instance = Inspect.inspect,
	list_children = Inspect.listChildren,
	script_grep = Inspect.scriptGrep,
	read_script = Inspect.readScript,
	read_all_scripts = Inspect.readAllScripts,
	get_selection = Inspect.getSelection,
	set_selection = Mutate.setSelection,
	write_script = Mutate.writeScript,
	edit_script = Mutate.editScript,
	create_instance = Mutate.createInstance,
	set_property = Mutate.setProperty,
	delete_instance = Mutate.deleteInstance,
	run_tests = Tests.run,
	get_logs = Logs.get,
	get_run_state = function(args: any) return runtime:getRunState(args) end,
	start_playtest = function(args: any) return runtime:startPlaytest(args) end,
	stop_playtest = function(args: any) return runtime:stopPlaytest(args) end,
	simulate_input = function(args: any) return runtime:simulateInput(args) end,
	playtest_sample_state = function(args: any) return runtime:sampleState(args) end,
	capture_viewport = Vision.capture,
}

local function advertisedTools(): { string }
	local tools = {}
	for name, _ in pairs(handlers) do
		table.insert(tools, name)
	end
	table.sort(tools)
	return tools
end

local CONNECTOR_TOOLS = advertisedTools()

local function executeTool(name: string, args: any): (boolean, any)
	local handler = handlers[name]
	if not handler then
		return false, "unsupported built-in StarBlox Studio tool: " .. name
	end

	if MUTATING[name] then
		local recordingId = nil
		pcall(function()
			recordingId = ChangeHistoryService:TryBeginRecording(
				"StarBlox Factory: " .. name,
				"StarBlox AI Development Factory · " .. name
			)
		end)

		local ok, result = pcall(handler, args)

		if recordingId then
			pcall(function()
				ChangeHistoryService:FinishRecording(
					recordingId,
					ok and Enum.FinishRecordingOperation.Commit or Enum.FinishRecordingOperation.Cancel
				)
			end)
		elseif ok then
			pcall(function()
				ChangeHistoryService:SetWaypoint("StarBlox Factory: " .. name)
			end)
		end
		return ok, result
	end

	return pcall(handler, args)
end

local function headers(): any
	local result = {
		["content-type"] = "application/json",
	}
	if type(TOKEN) == "string" and TOKEN ~= "" then
		result["x-starblox-bridge-token"] = TOKEN
	end
	return result
end

local function post(path: string, body: any): any
	local response = HttpService:RequestAsync({
		Url = BRIDGE_URL .. path,
		Method = "POST",
		Headers = headers(),
		Body = HttpService:JSONEncode(body),
	})
	if not response.Success then
		error("Studio bridge HTTP " .. tostring(response.StatusCode) .. ": " .. tostring(response.Body))
	end
	return HttpService:JSONDecode(response.Body)
end

local function sendResult(id: string, ok: boolean, result: any)
	local payload = {
		id = id,
		ok = ok,
		result = if ok then result else tostring(result),
	}
	local sent, err = pcall(function()
		post("/result", payload)
	end)
	if not sent then
		warn("[StarBlox Factory] Could not return tool result: " .. tostring(err))
	end
end

task.spawn(function()
	while true do
		local currentRole = role()
		local ok, payload = pcall(function()
			return post("/poll", {
				instanceId = INSTANCE_ID,
				role = currentRole,
				connectorVersion = CONNECTOR_VERSION,
				tools = CONNECTOR_TOOLS,
				waitMs = 15000,
				limit = 3,
			})
		end)

		if ok and payload and type(payload.calls) == "table" then
			for _, request in payload.calls do
				local requestId = tostring(request.id)
				local expiresAt = tonumber(request.expiresAt)
				if expiresAt and DateTime.now().UnixTimestampMillis >= expiresAt then
					sendResult(requestId, false, "Studio tool request expired before execution")
				else
					local toolOk, result = executeTool(tostring(request.tool), request.args or {})
					sendResult(requestId, toolOk, result)
				end
			end
		else
			task.wait(1)
		end
	end
end)

print(
	"[StarBlox Factory] Studio connector " ..
	CONNECTOR_VERSION ..
	" active as " ..
	role() ..
	" → " ..
	tostring(BRIDGE_URL)
)
