--!strict

local ServerStorage = game:GetService("ServerStorage")
local Workspace = game:GetService("Workspace")

local WorldProjectionService = {}
WorldProjectionService.__index = WorldProjectionService

local WITNESS_NAME = "BrookhavenWorldBaseline"
local RUNTIME_NAME = "BrookhavenWorldRuntime"

local function assertNoGameplayClasses(root: Model)
	for _, descendant in root:GetDescendants() do
		assert(
			not descendant:IsA("Script")
				and not descendant:IsA("LocalScript")
				and not descendant:IsA("ModuleScript")
				and not descendant:IsA("RemoteEvent")
				and not descendant:IsA("RemoteFunction")
				and not descendant:IsA("UnreliableRemoteEvent"),
			"Brookhaven immutable witness contains forbidden gameplay class: " .. descendant.ClassName
		)
	end
end

function WorldProjectionService.new()
	local witness = ServerStorage:FindFirstChild(WITNESS_NAME)
	assert(
		witness ~= nil and witness:IsA("Model"),
		"immutable Brookhaven witness missing from ServerStorage/" .. WITNESS_NAME
	)
	assertNoGameplayClasses(witness)

	local staleWitness = Workspace:FindFirstChild(WITNESS_NAME)
	assert(staleWitness == nil, "immutable Brookhaven witness must not be mounted in Workspace")

	local previous = Workspace:FindFirstChild(RUNTIME_NAME)
	if previous then
		previous:Destroy()
	end

	local runtime = witness:Clone()
	runtime.Name = RUNTIME_NAME
	runtime:SetAttribute("StarBloxRuntimeProjection", true)
	runtime:SetAttribute("ImmutableWitnessName", WITNESS_NAME)
	runtime:SetAttribute("RuntimeMutationAllowed", true)
	runtime.Parent = Workspace

	local self = setmetatable({}, WorldProjectionService)
	self._witness = witness
	self._runtime = runtime
	return self
end

function WorldProjectionService:GetWitness(): Model
	return self._witness
end

function WorldProjectionService:GetRuntimeWorld(): Model
	return self._runtime
end

function WorldProjectionService:Destroy()
	if self._runtime ~= nil and self._runtime.Parent ~= nil then
		self._runtime:Destroy()
	end
	self._runtime = nil
end

return WorldProjectionService
