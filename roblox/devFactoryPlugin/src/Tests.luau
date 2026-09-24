--!strict

local ScriptEditorService = game:GetService("ScriptEditorService")
local Util = require(script.Parent.Util)

local Tests = {}

local SAFE_TEST_ROOTS = {
	"ServerScriptService/Tests",
	"ReplicatedStorage/Tests",
	"ServerStorage/Tests",
}

local function normalizePath(path: string): string
	return string.gsub(path, "^game[%.\/]", "")
end

local function isSafeTestPath(path: string): boolean
	local clean = normalizePath(path)
	for _, root in SAFE_TEST_ROOTS do
		if clean == root or string.sub(clean, 1, #root + 1) == root .. "/" then
			return true
		end
	end
	return false
end

local function sourceOf(inst: LuaSourceContainer): string
	local document = ScriptEditorService:FindScriptDocument(inst)
	return document and document:GetText() or (inst :: any).Source
end

local function runSpec(inst: ModuleScript): any
	local source = sourceOf(inst)
	local fn, compileError = (loadstring :: any)(source)
	if not fn then
		return { name = Util.pathOf(inst), ok = false, error = "compile: " .. tostring(compileError) }
	end

	pcall(function()
		local globals = (getfenv :: any)()
		local env = setmetatable({ script = inst }, { __index = globals })
		;(setfenv :: any)(fn, env)
	end)

	local ok, result = pcall(fn)
	if not ok then
		return { name = Util.pathOf(inst), ok = false, error = tostring(result) }
	end

	if type(result) == "table" then
		local passed = result.successCount or result.passed
		local failed = result.failureCount or result.failed
		if passed ~= nil or failed ~= nil then
			return {
				name = Util.pathOf(inst),
				passed = passed or 0,
				failed = failed or 0,
				errors = result.errors,
			}
		end
	end

	return { name = Util.pathOf(inst), ok = true }
end

function Tests.run(args: any): any
	local root: Instance? = nil
	local explicit = type(args.path) == "string" and args.path ~= ""
	if explicit then
		if not isSafeTestPath(args.path) then
			error("run_tests path must stay inside an approved Tests root")
		end
		root = Util.resolvePath(args.path)
	else
		root = Util.resolvePath("ServerScriptService/Tests")
	end
	if not root then
		return { passed = 0, failed = 0, total = 0, specCount = 0, results = {} }
	end

	local specs = {}
	for _, inst in root:GetDescendants() do
		if inst:IsA("ModuleScript") then
			local lower = string.lower(inst.Name)
			if explicit or string.find(lower, "spec") or string.find(lower, "test") then
				table.insert(specs, inst)
			end
		end
	end

	local results = {}
	local passed = 0
	local failed = 0

	for _, inst in specs do
		local result = runSpec(inst)
		if result.passed ~= nil or result.failed ~= nil then
			passed += result.passed or 0
			failed += result.failed or 0
		elseif result.ok then
			passed += 1
		else
			failed += 1
		end
		table.insert(results, result)
	end

	return {
		passed = passed,
		failed = failed,
		total = passed + failed,
		specCount = #specs,
		results = results,
	}
end

return Tests
