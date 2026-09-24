--!strict

local ScriptEditorService = game:GetService("ScriptEditorService")

local Util = {}

function Util.resolvePath(path: string): (Instance?, string?)
	if path == "" or path == "game" then
		return game, nil
	end

	local normalized = string.gsub(path, "^game[%.\/]", "")
	local parts = string.split(normalized, "/")
	if #parts == 1 and string.find(normalized, ".", 1, true) then
		parts = string.split(normalized, ".")
	end
	if #parts == 0 then
		return nil, "empty path"
	end

	local ok, root = pcall(function()
		return game:GetService(parts[1])
	end)
	local current: Instance? = if ok then root else game:FindFirstChild(parts[1])
	if not current then
		return nil, "root not found: " .. parts[1]
	end

	for index = 2, #parts do
		current = current:FindFirstChild(parts[index])
		if not current then
			return nil, "path not found: " .. table.concat(parts, "/", 1, index)
		end
	end
	return current, nil
end

function Util.pathOf(inst: Instance): string
	local parts = {}
	local current: Instance? = inst
	while current and current ~= game do
		table.insert(parts, 1, current.Name)
		current = current.Parent
	end
	return table.concat(parts, "/")
end

function Util.encodeValue(value: any): any
	local kind = typeof(value)
	if kind == "nil" or kind == "string" or kind == "boolean" or kind == "number" then
		return value
	elseif kind == "Vector2" then
		return { value.X, value.Y }
	elseif kind == "Vector3" then
		return { value.X, value.Y, value.Z }
	elseif kind == "Color3" then
		return { value.R, value.G, value.B }
	elseif kind == "UDim" then
		return { value.Scale, value.Offset }
	elseif kind == "UDim2" then
		return { { value.X.Scale, value.X.Offset }, { value.Y.Scale, value.Y.Offset } }
	elseif kind == "CFrame" then
		return { value:GetComponents() }
	elseif kind == "EnumItem" then
		return tostring(value)
	elseif kind == "BrickColor" then
		return value.Number
	elseif kind == "Instance" then
		return Util.pathOf(value)
	end
	return tostring(value)
end

function Util.getSource(inst: Instance): string
	if not inst:IsA("LuaSourceContainer") then
		error(Util.pathOf(inst) .. " is not a script")
	end
	local document = ScriptEditorService:FindScriptDocument(inst)
	if document then
		return document:GetText()
	end
	return (inst :: any).Source
end

function Util.setSource(inst: Instance, source: string)
	if not inst:IsA("LuaSourceContainer") then
		error(Util.pathOf(inst) .. " is not a script")
	end
	ScriptEditorService:UpdateSourceAsync(inst, function()
		return source
	end)
end

local function enumFromString(value: string): any?
	local enumName, itemName = string.match(value, "^Enum%.([^.]+)%.(.+)$")
	if not enumName or not itemName then
		return nil
	end
	local ok, item = pcall(function()
		return (Enum :: any)[enumName][itemName]
	end)
	return if ok then item else nil
end

function Util.coerceProperty(inst: Instance, property: string, value: any): any
	local ok, current = pcall(function()
		return (inst :: any)[property]
	end)
	if not ok then
		return value
	end

	local kind = typeof(current)
	if type(value) == "table" then
		if kind == "Vector3" and #value >= 3 then
			return Vector3.new(value[1], value[2], value[3])
		elseif kind == "Vector2" and #value >= 2 then
			return Vector2.new(value[1], value[2])
		elseif kind == "Color3" and #value >= 3 then
			return Color3.new(value[1], value[2], value[3])
		elseif kind == "UDim2" and type(value[1]) == "table" and type(value[2]) == "table" then
			return UDim2.new(value[1][1], value[1][2], value[2][1], value[2][2])
		elseif kind == "UDim" and #value >= 2 then
			return UDim.new(value[1], value[2])
		elseif kind == "CFrame" and #value == 3 then
			return CFrame.new(value[1], value[2], value[3])
		elseif kind == "CFrame" and #value >= 12 then
			return CFrame.new(table.unpack(value, 1, 12))
		end
	end

	if kind == "EnumItem" and type(value) == "string" then
		return enumFromString(value) or value
	end
	if kind == "BrickColor" then
		if type(value) == "number" then return BrickColor.new(value) end
		if type(value) == "string" then return BrickColor.new(value) end
	end
	return value
end

return Util
