--!strict

local Selection = game:GetService("Selection")
local Util = require(script.Parent.Util)

local Mutate = {}

local function splitTarget(path: string): (string, string)
	local normalized = string.gsub(path, "^game[%.\/]", "")
	local parts = string.split(normalized, "/")
	if #parts < 2 then
		error("script path must include a service/parent and name")
	end
	local name = table.remove(parts)
	return table.concat(parts, "/"), name
end

function Mutate.writeScript(args: any): any
	local inst = Util.resolvePath(args.path)
	if not inst and args.create == true then
		local parentPath, name = splitTarget(args.path)
		local parent, err = Util.resolvePath(parentPath)
		if not parent then error(err) end
		local className = args.className or "Script"
		if className ~= "Script" and className ~= "LocalScript" and className ~= "ModuleScript" then
			error("invalid script className")
		end
		inst = Instance.new(className)
		inst.Name = name
		inst.Parent = parent
	end
	if not inst then error("script not found: " .. tostring(args.path)) end
	Util.setSource(inst, tostring(args.source or ""))
	return { ok = true, path = Util.pathOf(inst), className = inst.ClassName }
end

function Mutate.editScript(args: any): any
	local inst, err = Util.resolvePath(args.path)
	if not inst then error(err) end
	local source = Util.getSource(inst)
	local old = tostring(args.old or "")
	local new = tostring(args.new or "")
	if old == "" then error("old text is required") end
	local firstStart, firstEnd = string.find(source, old, 1, true)
	if not firstStart then error("old text not found") end
	if string.find(source, old, firstEnd + 1, true) then
		error("old text must occur exactly once")
	end
	local updated = string.sub(source, 1, firstStart - 1) .. new .. string.sub(source, firstEnd + 1)
	Util.setSource(inst, updated)
	return { ok = true, path = Util.pathOf(inst) }
end

function Mutate.createInstance(args: any): any
	local parent, err = Util.resolvePath(args.parent)
	if not parent then error(err) end
	local inst = Instance.new(tostring(args.className))
	inst.Name = tostring(args.name or args.className)
	if type(args.properties) == "table" then
		for property, value in args.properties do
			local coerced = Util.coerceProperty(inst, property, value)
			local ok, propertyErr = pcall(function()
				(inst :: any)[property] = coerced
			end)
			if not ok then
				inst:Destroy()
				error("could not set " .. property .. ": " .. tostring(propertyErr))
			end
		end
	end
	inst.Parent = parent
	return { ok = true, path = Util.pathOf(inst), className = inst.ClassName }
end

function Mutate.deleteInstance(args: any): any
	local inst, err = Util.resolvePath(args.path)
	if not inst then error(err) end
	if inst == game then error("cannot delete DataModel") end
	local path = Util.pathOf(inst)
	inst:Destroy()
	return { ok = true, path = path }
end

function Mutate.setProperty(args: any): any
	local inst, err = Util.resolvePath(args.path)
	if not inst then error(err) end
	local property = tostring(args.property or "")
	if property == "" then error("property is required") end
	local value = Util.coerceProperty(inst, property, args.value)
	(inst :: any)[property] = value
	return {
		ok = true,
		path = Util.pathOf(inst),
		property = property,
		value = Util.encodeValue((inst :: any)[property]),
	}
end

function Mutate.setSelection(args: any): any
	local selected = {}
	for _, path in args.paths or {} do
		local inst = Util.resolvePath(path)
		if inst then table.insert(selected, inst) end
	end
	Selection:Set(selected)
	return { ok = true, count = #selected }
end

return Mutate
