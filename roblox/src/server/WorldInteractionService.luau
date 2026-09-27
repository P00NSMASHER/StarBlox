--!strict

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")
local Workspace = game:GetService("Workspace")

local BrookhavenMirrorConfig = require(ReplicatedStorage.StarBlox.BrookhavenMirrorConfig)
local DefaultWorldInteractionBindings = require(ReplicatedStorage.StarBlox.WorldInteractionBindings)
local LegacyWorldInteractionBindings = require(ReplicatedStorage.StarBlox.LegacyWorldInteractionBindings)
local WorldInteractionBindings = if BrookhavenMirrorConfig.World.Mode == "legacy-reference-safe-world"
	then LegacyWorldInteractionBindings
	else DefaultWorldInteractionBindings

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

local function nativeSeatCounts(root: Instance): (number, number)
	local seats = 0
	local vehicleSeats = 0
	for _, descendant in root:GetDescendants() do
		if descendant:IsA("VehicleSeat") then
			vehicleSeats += 1
		elseif descendant:IsA("Seat") then
			seats += 1
		end
	end
	return seats, vehicleSeats
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
	self._garageStates = {}
	self._lightStates = {}
	self._connections = {}
	self._destroyed = false

	local runtimeSeats, runtimeVehicleSeats = nativeSeatCounts(runtime)
	local witnessSeats, witnessVehicleSeats = nativeSeatCounts(witness)
	assert(
		runtimeSeats == WorldInteractionBindings.NativeSeats.ExpectedSeatCount,
		"Brookhaven runtime Seat count no longer matches the certified witness"
	)
	assert(
		runtimeVehicleSeats == WorldInteractionBindings.NativeSeats.ExpectedVehicleSeatCount,
		"Brookhaven runtime VehicleSeat count no longer matches the certified witness"
	)
	assert(
		witnessSeats == runtimeSeats and witnessVehicleSeats == runtimeVehicleSeats,
		"Brookhaven runtime native seat classes diverged from the immutable witness"
	)
	runtime:SetAttribute("StarBloxCertifiedSeatCount", runtimeSeats)
	runtime:SetAttribute("StarBloxCertifiedVehicleSeatCount", runtimeVehicleSeats)
	runtime:SetAttribute("StarBloxInteractionBindingRevision", WorldInteractionBindings.Revision)

	for _, binding in WorldInteractionBindings.Doors do
		self:_bindDoor(binding)
	end
	for _, binding in WorldInteractionBindings.GarageDoors do
		self:_bindGarageDoor(binding)
	end
	for _, binding in WorldInteractionBindings.Lights do
		self:_bindLight(binding)
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


function WorldInteractionService:_bindGarageDoor(binding)
	assert(type(binding.Id) == "string" and binding.Id ~= "", "garage binding Id is required")
	assert(type(binding.PartName) == "string" and binding.PartName ~= "", "garage binding PartName is required")

	local runtimePart = self._runtime:FindFirstChild(binding.PartName, true)
	local witnessPart = self._witness:FindFirstChild(binding.PartName, true)
	assert(
		runtimePart ~= nil and runtimePart:IsA("BasePart"),
		"reviewed Brookhaven runtime garage door missing: " .. binding.PartName
	)
	assert(
		witnessPart ~= nil and witnessPart:IsA("BasePart"),
		"reviewed Brookhaven witness garage door missing: " .. binding.PartName
	)
	assert(
		runtimePart.ClassName == witnessPart.ClassName
			and runtimePart.Size == witnessPart.Size
			and runtimePart.CFrame == witnessPart.CFrame,
		"reviewed runtime garage door no longer matches immutable witness: " .. binding.PartName
	)

	local detector = Instance.new("ClickDetector")
	detector.Name = "StarBloxGarageClick"
	detector.MaxActivationDistance = finitePositive(binding.MaxActivationDistance, 12)
	detector.Parent = runtimePart

	local state = {
		binding = binding,
		part = runtimePart,
		closedCFrame = runtimePart.CFrame,
		closedCanCollide = runtimePart.CanCollide,
		detector = detector,
		active = false,
		token = 0,
		activeTween = nil,
	}
	self._garageStates[binding.Id] = state

	runtimePart:SetAttribute("StarBloxInteractionId", binding.Id)
	runtimePart:SetAttribute("StarBloxInteractionKind", "garage-door")
	runtimePart:SetAttribute("StarBloxGarageState", "closed")

	table.insert(self._connections, detector.MouseClick:Connect(function(player)
		self:_toggleGarageDoor(binding.Id, player)
	end))
end

function WorldInteractionService:_toggleGarageDoor(bindingId: string, player: Player)
	if self._destroyed then
		return
	end
	local state = self._garageStates[bindingId]
	if state == nil or state.active or player.Parent ~= Players then
		return
	end

	local root = playerRoot(player)
	if root == nil then
		return
	end
	local maxDistance = finitePositive(state.binding.MaxActivationDistance, 12)
	if (root.Position - state.part.Position).Magnitude > maxDistance + 2 then
		return
	end

	state.active = true
	state.token += 1
	local token = state.token
	state.detector.MaxActivationDistance = 0

	local liftStuds = finitePositive(
		state.binding.LiftStuds,
		math.max(6, state.part.Size.Y)
	)
	local openCFrame = state.closedCFrame * CFrame.new(0, liftStuds, 0)
	state.part.CanCollide = false
	state.part:SetAttribute("StarBloxGarageState", "opening")

	local opening = TweenService:Create(
		state.part,
		TweenInfo.new(0.38, Enum.EasingStyle.Quad, Enum.EasingDirection.Out),
		{CFrame = openCFrame}
	)
	state.activeTween = opening
	opening:Play()
	opening.Completed:Once(function()
		if self._destroyed or state.token ~= token then
			return
		end
		state.part:SetAttribute("StarBloxGarageState", "open")
	end)

	task.delay(finitePositive(state.binding.OpenSeconds, 2.5), function()
		if self._destroyed or state.token ~= token or state.part.Parent == nil then
			return
		end
		state.part:SetAttribute("StarBloxGarageState", "closing")
		local closing = TweenService:Create(
			state.part,
			TweenInfo.new(0.38, Enum.EasingStyle.Quad, Enum.EasingDirection.InOut),
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
			state.part:SetAttribute("StarBloxGarageState", "closed")
			state.detector.MaxActivationDistance = maxDistance
			state.activeTween = nil
			state.active = false
		end)
	end)
end

function WorldInteractionService:_bindLight(binding)
	assert(type(binding.Id) == "string" and binding.Id ~= "", "light binding Id is required")
	assert(type(binding.PartName) == "string" and binding.PartName ~= "", "light binding PartName is required")

	local runtimePart = self._runtime:FindFirstChild(binding.PartName, true)
	local witnessPart = self._witness:FindFirstChild(binding.PartName, true)
	assert(
		runtimePart ~= nil and runtimePart:IsA("BasePart"),
		"reviewed Brookhaven runtime light fixture missing: " .. binding.PartName
	)
	assert(
		witnessPart ~= nil and witnessPart:IsA("BasePart"),
		"reviewed Brookhaven witness light fixture missing: " .. binding.PartName
	)
	assert(
		runtimePart.ClassName == witnessPart.ClassName
			and runtimePart.Size == witnessPart.Size
			and runtimePart.CFrame == witnessPart.CFrame,
		"reviewed runtime light fixture no longer matches immutable witness: " .. binding.PartName
	)

	local detector = Instance.new("ClickDetector")
	detector.Name = "StarBloxLightClick"
	detector.MaxActivationDistance = finitePositive(binding.MaxActivationDistance, 10)
	detector.Parent = runtimePart

	local light = Instance.new("PointLight")
	light.Name = "StarBloxRuntimeLight"
	light.Brightness = finitePositive(binding.Brightness, 2)
	light.Range = finitePositive(binding.Range, 18)
	light.Shadows = binding.Shadows == true
	light.Enabled = binding.InitiallyOn == true
	light.Parent = runtimePart

	local state = {
		binding = binding,
		part = runtimePart,
		detector = detector,
		light = light,
		on = light.Enabled,
	}
	self._lightStates[binding.Id] = state

	runtimePart:SetAttribute("StarBloxInteractionId", binding.Id)
	runtimePart:SetAttribute("StarBloxInteractionKind", "light")
	runtimePart:SetAttribute("StarBloxLightState", if state.on then "on" else "off")

	table.insert(self._connections, detector.MouseClick:Connect(function(player)
		self:_toggleLight(binding.Id, player)
	end))
end

function WorldInteractionService:_toggleLight(bindingId: string, player: Player)
	if self._destroyed or player.Parent ~= Players then
		return
	end
	local state = self._lightStates[bindingId]
	if state == nil then
		return
	end
	local root = playerRoot(player)
	if root == nil then
		return
	end
	local maxDistance = finitePositive(state.binding.MaxActivationDistance, 10)
	if (root.Position - state.part.Position).Magnitude > maxDistance + 2 then
		return
	end

	state.on = not state.on
	state.light.Enabled = state.on
	state.part:SetAttribute("StarBloxLightState", if state.on then "on" else "off")
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

	for _, state in self._garageStates do
		state.token += 1
		if state.activeTween ~= nil then
			pcall(function()
				state.activeTween:Cancel()
			end)
		end
		if state.part ~= nil and state.part.Parent ~= nil then
			state.part.CFrame = state.closedCFrame
			state.part.CanCollide = state.closedCanCollide
			state.part:SetAttribute("StarBloxGarageState", nil)
			state.part:SetAttribute("StarBloxInteractionId", nil)
			state.part:SetAttribute("StarBloxInteractionKind", nil)
		end
		if state.detector ~= nil and state.detector.Parent ~= nil then
			state.detector:Destroy()
		end
	end
	self._garageStates = {}

	for _, state in self._lightStates do
		if state.part ~= nil and state.part.Parent ~= nil then
			state.part:SetAttribute("StarBloxLightState", nil)
			state.part:SetAttribute("StarBloxInteractionId", nil)
			state.part:SetAttribute("StarBloxInteractionKind", nil)
		end
		if state.detector ~= nil and state.detector.Parent ~= nil then
			state.detector:Destroy()
		end
		if state.light ~= nil and state.light.Parent ~= nil then
			state.light:Destroy()
		end
	end
	self._lightStates = {}

	if self._runtime ~= nil and self._runtime.Parent ~= nil then
		self._runtime:SetAttribute("StarBloxCertifiedSeatCount", nil)
		self._runtime:SetAttribute("StarBloxCertifiedVehicleSeatCount", nil)
		self._runtime:SetAttribute("StarBloxInteractionBindingRevision", nil)
	end
end

return WorldInteractionService
