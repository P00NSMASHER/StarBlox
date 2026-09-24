--!strict

local Selection = game:GetService("Selection")
local Util = require(script.Parent.Util)

local Inspect = {}

local COMMON_PROPERTIES = {
	"Name", "Enabled", "Disabled", "Anchored", "CanCollide", "CanTouch", "CanQuery",
	"Transparency", "Size", "Position", "Color", "Material", "Value", "Text",
	"Visible", "Active", "Image", "SoundId", "AnimationId", "CFrame", "PrimaryPart",
}

function Inspect.search(args: any): any
	local root: Instance = game
	if args.root then
		local found, err = Util.resolvePath(args.root)
		if not found then error(err) end
		root = found
	end
	local query = if type(args.query) == "string" and args.query ~= "" then string.lower(args.query) else nil
	local className = if type(args.className) == "string" and args.className ~= "" then args.className else nil
	local limit = math.clamp(tonumber(args.limit) or 50, 1, 500)
	local results = {}

	for _, inst in root:GetDescendants() do
		local nameOk = query == nil or string.find(string.lower(inst.Name), query, 1, true) ~= nil
		local classOk = className == nil or inst.ClassName == className
		if nameOk and classOk then
			table.insert(results, { path = Util.pathOf(inst), className = inst.ClassName })
			if #results >= limit then break end
		end
	end
	return { count = #results, truncated = #results >= limit, results = results }
end

function Inspect.inspect(args: any): any
	local inst, err = Util.resolvePath(args.path)
	if not inst then error(err) end
	local properties = {}
	for _, property in COMMON_PROPERTIES do
		local ok, value = pcall(function()
			return (inst :: any)[property]
		end)
		if ok and value ~= nil then
			properties[property] = Util.encodeValue(value)
		end
	end
	for name, value in inst:GetAttributes() do
		properties["@" .. name] = Util.encodeValue(value)
	end
	local children = {}
	for _, child in inst:GetChildren() do
		table.insert(children, { name = child.Name, className = child.ClassName })
	end
	return {
		path = Util.pathOf(inst),
		className = inst.ClassName,
		properties = properties,
		children = children,
	}
end

function Inspect.listChildren(args: any): any
	local inst, err = Util.resolvePath(args.path)
	if not inst then error(err) end
	local children = {}
	for _, child in inst:GetChildren() do
		table.insert(children, { name = child.Name, className = child.ClassName })
	end
	return { path = Util.pathOf(inst), children = children }
end

function Inspect.readScript(args: any): any
	local inst, err = Util.resolvePath(args.path)
	if not inst then error(err) end
	return {
		path = Util.pathOf(inst),
		className = inst.ClassName,
		source = Util.getSource(inst),
	}
end

function Inspect.readAllScripts(args: any): any
	local root: Instance = game
	if args.root then
		local found, err = Util.resolvePath(args.root)
		if not found then error(err) end
		root = found
	end
	local maxBytes = math.clamp(tonumber(args.maxBytes) or 120000, 1000, 1000000)
	local bytes = 0
	local scripts = {}
	local total = 0
	for _, inst in root:GetDescendants() do
		if inst:IsA("LuaSourceContainer") then
			total += 1
			local source = Util.getSource(inst)
			if bytes + #source <= maxBytes then
				bytes += #source
				table.insert(scripts, {
					path = Util.pathOf(inst),
					className = inst.ClassName,
					source = source,
				})
			end
		end
	end
	return {
		scripts = scripts,
		returned = #scripts,
		total = total,
		bytes = bytes,
		truncated = #scripts < total,
	}
end

function Inspect.scriptGrep(args: any): any
	local root: Instance = game
	if args.root then
		local found, err = Util.resolvePath(args.root)
		if not found then error(err) end
		root = found
	end
	local query = tostring(args.query or "")
	if query == "" then error("query is required") end
	local plain = args.isPattern ~= true
	local limit = math.clamp(tonumber(args.limit) or 100, 1, 500)
	local results = {}

	for _, inst in root:GetDescendants() do
		if inst:IsA("LuaSourceContainer") then
			local source = Util.getSource(inst)
			local lineNumber = 0
			for line in (source .. "\n"):gmatch("(.-)\n") do
				lineNumber += 1
				local found = if plain
					then string.find(line, query, 1, true)
					else string.find(line, query)
				if found then
					table.insert(results, {
						path = Util.pathOf(inst),
						line = lineNumber,
						text = string.sub(line, 1, 240),
					})
					if #results >= limit then
						return { count = #results, truncated = true, results = results }
					end
				end
			end
		end
	end
	return { count = #results, truncated = false, results = results }
end

function Inspect.getSelection(_args: any): any
	local paths = {}
	for _, inst in Selection:Get() do
		table.insert(paths, Util.pathOf(inst))
	end
	return { paths = paths }
end

return Inspect
