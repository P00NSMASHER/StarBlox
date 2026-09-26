--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local WorldInteractionBindings = require(ReplicatedStorage.StarBlox.WorldInteractionBindings)

local WorldInteractionService = {}
WorldInteractionService.__index = WorldInteractionService

local function playerRoot(player: Player): BasePart?
	local character = player.Character
	local root = character and character:FindFirstChild("HumanoidRootPart")
	if root and root:IsA("BasePart") then
		return root
	end
	return nil
end

local function finitePositive(value: any, fallback: number): number
	local parsed = tonumber(value)
	if parsed == nil or parsed ~= parsed or parsed == math.huge or parsed == -math.huge or parsed <= 0 then
		return fallback
	end
	return parsed
end

function WorldInteractionService.new(worldProjection)
	assert(worldProjection ~= nil, "worldProjection is required")

	local runtime = worldProjection:GetRuntimeWorld()
	local witness = worldProjection:GetWitness()
	assert(runtime ~= nil and runtime:IsA("Model"), "Brookhaven runtime projection is required")
	assert(witness ~= nil and witness:IsA("Model"), "Brookhaven immutable witness is required")
	assert(runtime.Name == WorldInteractionBindings.WorldRootName, "interaction bindings target the wrong runtime world")
	assert(
		witness.Name == WorldInteractionBindings.ImmutableWitnessName,
		"interaction bindings target the wrong immutable witness"
	)
	assert(runtime ~= witness, "runtime world and immutable witness must be separate instances")
	assert(runtime:IsDescendantOf(Workspace), "runtime world must be mounted in Workspace")
	assert(not witness:IsDescendantOf(Workspace), "immutable witness must remain outside Workspace")
	assert(
		WorldInteractionBindings.AutomaticCandidateActivationAllowed == false,
		"automatic Brookhaven candidate activation must remain disabled"
	)

	local self = setmetatable({}, WorldInteractionService)
	self._runtime = runtime
	self._witness = witness
	self._doorStates = {}
	self._connections = {}
	self._destroyed = false

	for _, binding in WorldInteractionBindings.Doors do
		self:_bindDoor(binding)
	end

	return self
end

function WorldInteractionService:_bindDoor(binding)
	assert(type(binding.Id) == "string" and binding.Id ~= "", "door binding Id is required")
	assert(type(binding.PartName) == "string" and binding.PartName ~= "", "door binding PartName is required")

	local runtimeDoor = self._runtime:FindFirstChild(binding.PartName, true)
	assert(
		runtimeDoor ~= nil and runtimeDoor:IsA("BasePart"),
		"reviewed Brookhaven runtime door missing: " .. binding.PartName
	)

	local witnessDoor = self._witness:FindFirstChild(binding.PartName, true)
	assert(
		witnessDoor ~= nil and witnessDoor:IsA("BasePart"),
		"reviewed Brookhaven witness door missing: " .. binding.PartName
	)
	assert(
		runtimeDoor.ClassName == witnessDoor.ClassName
			and runtimeDoor.Size == witnessDoor.Size
			and runtimeDoor.CFrame == witnessDoor.CFrame,
		"reviewed runtime door no longer matches immutable witness: " .. binding.PartName
	)

	if binding.HelperPartName ~= nil then
		local runtimeHelper = self._runtime:FindFirstChild(binding.HelperPartName, true)
		local witnessHelper = self._witness:FindFirstChild(binding.HelperPartName, true)
		assert(
			runtimeHelper ~= nil and runtimeHelper:IsA("BasePart"),
			"reviewed Brookhaven runtime helper missing: " .. tostring(binding.HelperPartName)
		)
		assert(
			witnessHelper ~= nil and witnessHelper:IsA("BasePart"),
			"reviewed Brookhaven witness helper missing: " .. tostring(binding.HelperPartName)
		)
	end

	local previousDetector = runtimeDoor:FindFirstChild("StarBloxDoorClick")
	if previousDetector then
		previousDetector:Destroy()
	end

	local detector = Instance.new("ClickDetector")
	detector.Name = "StarBloxDoorClick"
	detector.MaxActivationDistance = finitePositive(binding.MaxActivationDistance, 9)
	detector.Parent = runtimeDoor

	local state = {
		binding = binding,
		part = runtimeDoor,
		closedCFrame = runtimeDoor.CFrame,
		closedCanCollide = runtimeDoor.CanCollide,
		detector = detector,
		active = false,
		token = 0,
		activeTween = nil,
	}
	self._doorStates[binding.Id] = state

	runtimeDoor:SetAttribute("StarBloxInteractionId", binding.Id)
	runtimeDoor:SetAttribute("StarBloxInteractionKind", "door")
	runtimeDoor:SetAttribute("StarBloxDoorState", "closed")

	table.insert(self._connections, detector.MouseClick:Connect(function(player)
		self:_toggleDoor(binding.Id, player)
	end))
end

function WorldInteractionService:_toggleDoor(bindingId: string, player: Player)
	if self._destroyed then
		return
	end
	local state = self._doorStates[bindingId]
	if state == nil or state.active then
		return
	end
	if player.Parent ~= Players then
		return
	end

	local root = playerRoot(player)
	if root == nil then
		return
	end

	local maxDistance = finitePositive(state.binding.MaxActivationDistance, 9)
	if (root.Position - state.part.Position).Magnitude > maxDistance + 2 then
		return
	end

	state.active = true
	state.token += 1
	local token = state.token
	state.detector.MaxActivationDistance = 0

	local localPosition = state.closedCFrame:PointToObjectSpace(root.Position)
	local swingDegrees = finitePositive(state.binding.SwingDegrees, 88)
	local direction = if localPosition.Z >= 0 then -1 else 1
	local angle = math.rad(swingDegrees * direction)

	local hingeSide = if tonumber(state.binding.HingeSide) == 1 then 1 else -1
	local hingeOffset = hingeSide * (state.part.Size.X / 2)
	local hingeCFrame = state.closedCFrame * CFrame.new(hingeOffset, 0, 0)
	local doorRelativeToHinge = hingeCFrame:ToObjectSpace(state.closedCFrame)
	local openCFrame =
		hingeCFrame
		* CFrame.Angles(0, angle, 0)
		* doorRelativeToHinge

	state.part.CanCollide = false
	state.part:SetAttribute("StarBloxDoorState", "opening")

	local opening = TweenService:Create(
		state.part,
		TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{CFrame = openCFrame}
	)
	state.activeTween = opening
	opening:Play()
	opening.Completed:Once(function()
		if self._destroyed or state.token ~= token then
			return
		end
		state.part:SetAttribute("StarBloxDoorState", "open")
	end)

	task.delay(finitePositive(state.binding.OpenSeconds, 1.35), function()
		if self._destroyed or state.token ~= token or state.part.Parent == nil then
			return
		end

		state.part:SetAttribute("StarBloxDoorState", "closing")
		local closing = TweenService:Create(
			state.part,
			TweenInfo.new(0.22, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut),
			{CFrame = state.closedCFrame}
		)
		state.activeTween = closing
		closing:Play()
		closing.Completed:Once(function()
			if self._destroyed or state.token ~= token then
				return
			end
			state.part.CFrame = state.closedCFrame
			state.part.CanCollide = state.closedCanCollide
			state.part:SetAttribute("StarBloxDoorState", "closed")
			state.detector.MaxActivationDistance = maxDistance
			state.activeTween = nil
			state.active = false
		end)
	end)
end

function WorldInteractionService:Destroy()
	if self._destroyed then
		return
	end
	self._destroyed = true

	for _, connection in self._connections do
		connection:Disconnect()
	end
	self._connections = {}

	for _, state in self._doorStates do
		state.token += 1
		if state.activeTween ~= nil then
			pcall(function()
				state.activeTween:Cancel()
			end)
		end
		if state.part ~= nil and state.part.Parent ~= nil then
			state.part.CFrame = state.closedCFrame
			state.part.CanCollide = state.closedCanCollide
			state.part:SetAttribute("StarBloxDoorState", "closed")
			state.part:SetAttribute("StarBloxInteractionId", nil)
			state.part:SetAttribute("StarBloxInteractionKind", nil)
		end
		if state.detector ~= nil and state.detector.Parent ~= nil then
			state.detector:Destroy()
		end
	end
	self._doorStates = {}
end

return WorldInteractionService
