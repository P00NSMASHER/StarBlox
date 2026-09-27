--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local player = Players.LocalPlayer
local backpack = player:WaitForChild("Backpack")
local mirrorRemotes = ReplicatedStorage:WaitForChild("StarBloxMirror")
local toolAction = mirrorRemotes:WaitForChild("ToolAction") :: RemoteFunction

local boundTools: {[Tool]: {RBXScriptConnection}} = {}
local activeZoomTool: Tool? = nil
local savedFieldOfView: number? = nil
local busy = false

local function restoreCamera()
	local camera = Workspace.CurrentCamera
	if camera ~= nil and savedFieldOfView ~= nil then
		camera.FieldOfView = savedFieldOfView
	end
	activeZoomTool = nil
	savedFieldOfView = nil
end

local function toggleZoom(tool: Tool, fieldOfView: number)
	local camera = Workspace.CurrentCamera
	if camera == nil then
		return
	end

	if activeZoomTool == tool then
		restoreCamera()
		tool:SetAttribute("ClientToolActive", false)
		return
	end

	if activeZoomTool ~= nil then
		restoreCamera()
	end
	savedFieldOfView = camera.FieldOfView
	activeZoomTool = tool
	camera.FieldOfView = fieldOfView
	tool:SetAttribute("ClientToolActive", true)
end

local function invokeServer(tool: Tool)
	if busy then
		return
	end
	local itemId = tool:GetAttribute("ItemId")
	if type(itemId) ~= "string" then
		return
	end
	busy = true
	pcall(function()
		toolAction:InvokeServer(itemId)
	end)
	busy = false
end

local function unbind(tool: Tool)
	local connections = boundTools[tool]
	if connections ~= nil then
		for _, connection in connections do
			connection:Disconnect()
		end
		boundTools[tool] = nil
	end
	if activeZoomTool == tool then
		restoreCamera()
	end
end

local function bind(tool: Tool)
	if boundTools[tool] ~= nil then
		return
	end
	if type(tool:GetAttribute("ItemId")) ~= "string" then
		return
	end

	local connections = {}
	boundTools[tool] = connections

	table.insert(connections, tool.Activated:Connect(function()
		local kind = tostring(tool:GetAttribute("ToolKind") or "")
		if kind == "binoculars" then
			toggleZoom(tool, 28)
		elseif kind == "camera" then
			toggleZoom(tool, 42)
		elseif kind == "flashlight" or kind == "umbrella" or kind == "extinguisher" then
			invokeServer(tool)
		end
	end))

	table.insert(connections, tool.Unequipped:Connect(function()
		tool:SetAttribute("ClientToolActive", false)
		if activeZoomTool == tool then
			restoreCamera()
		end
	end))

	table.insert(connections, tool.AncestryChanged:Connect(function(_, parent)
		if parent == nil then
			unbind(tool)
		end
	end))
end

local function scan(container: Instance?)
	if container == nil then
		return
	end
	for _, child in container:GetChildren() do
		if child:IsA("Tool") then
			bind(child)
		end
	end
end

backpack.ChildAdded:Connect(function(child)
	if child:IsA("Tool") then
		bind(child)
	end
end)

local function bindCharacter(character: Model)
	restoreCamera()
	scan(character)
	character.ChildAdded:Connect(function(child)
		if child:IsA("Tool") then
			bind(child)
		end
	end)
end

scan(backpack)
if player.Character ~= nil then
	bindCharacter(player.Character)
end
player.CharacterAdded:Connect(bindCharacter)

Workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(function()
	if activeZoomTool ~= nil then
		restoreCamera()
	end
end)
