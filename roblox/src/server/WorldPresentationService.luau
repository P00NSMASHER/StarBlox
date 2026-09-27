--!strict

local Lighting = game:GetService("Lighting")

local WorldPresentationService = {}
WorldPresentationService.__index = WorldPresentationService

local POLISH_REVISION = "iphone-spawn-polish-v1"
local SPAWN_RADIUS = 92
local NEON_RADIUS = 58
local LIGHT_RADIUS = 68

local function horizontalDistance(a: Vector3, b: Vector3): number
	local delta = Vector3.new(a.X - b.X, 0, a.Z - b.Z)
	return delta.Magnitude
end

local function isFlatSurface(part: BasePart): boolean
	local wide = math.max(part.Size.X, part.Size.Z)
	local narrow = math.min(part.Size.X, part.Size.Z)
	return wide >= 5 and narrow >= 3 and part.Size.Y <= math.max(3, narrow * 0.3)
end

local function isStrongRed(color: Color3): boolean
	return color.R >= 0.55 and color.R >= color.G * 1.45 and color.R >= color.B * 1.35
end

local function isStrongGreen(color: Color3): boolean
	return color.G >= 0.48 and color.G >= color.R * 1.25 and color.G >= color.B * 1.18
end

local function findSpawnReference(runtimeWorld: Model): BasePart?
	for _, name in {"BHW_1202", "LBH_14370"} do
		local candidate = runtimeWorld:FindFirstChild(name, true)
		if candidate ~= nil and candidate:IsA("BasePart") then
			return candidate
		end
	end
	return nil
end

local function toneSpawnSurface(part: BasePart): boolean
	if not isFlatSurface(part) or part.Transparency >= 0.8 then
		return false
	end
	if isStrongRed(part.Color) then
		part.Color = Color3.fromRGB(112, 114, 118)
		part.Material = Enum.Material.Concrete
		part.Reflectance = math.min(part.Reflectance, 0.04)
		return true
	end
	if isStrongGreen(part.Color) then
		part.Color = Color3.fromRGB(82, 121, 72)
		part.Material = Enum.Material.Grass
		part.Reflectance = 0
		return true
	end
	return false
end

local function reduceNeonBlowout(part: BasePart): boolean
	if part.Material ~= Enum.Material.Neon or part.Transparency >= 0.8 then
		return false
	end
	if math.max(part.Size.X, part.Size.Y, part.Size.Z) < 4 then
		return false
	end
	part.Material = Enum.Material.SmoothPlastic
	if part.Color.R > 0.9 and part.Color.G > 0.9 and part.Color.B > 0.9 then
		part.Color = Color3.fromRGB(232, 232, 232)
	end
	part.Reflectance = math.min(part.Reflectance, 0.03)
	return true
end

local function polishLighting()
	Lighting.ExposureCompensation = math.min(Lighting.ExposureCompensation, 0.05)
	Lighting.Brightness = math.min(Lighting.Brightness, 2.5)
	for _, child in Lighting:GetChildren() do
		if child:IsA("BloomEffect") then
			child.Intensity = math.min(child.Intensity, 0.15)
			child.Size = math.min(child.Size, 18)
			child.Threshold = math.max(child.Threshold, 1.35)
		elseif child:IsA("ColorCorrectionEffect") then
			child.Saturation = math.clamp(child.Saturation, -0.08, 0.08)
			child.Contrast = math.clamp(child.Contrast, -0.05, 0.12)
		end
	end
end

local function polishLocalLights(runtimeWorld: Model, origin: Vector3): number
	local changed = 0
	for _, descendant in runtimeWorld:GetDescendants() do
		local isLocalLight = descendant:IsA("PointLight")
			or descendant:IsA("SpotLight")
			or descendant:IsA("SurfaceLight")
		if isLocalLight then
			local light = descendant :: any
			local parent = light.Parent
			if parent ~= nil and parent:IsA("BasePart") and horizontalDistance(parent.Position, origin) <= LIGHT_RADIUS then
				light.Brightness = math.min(light.Brightness, 1.2)
				light.Range = math.min(light.Range, 14)
				light.Shadows = false
				changed += 1
			end
		end
	end
	return changed
end

function WorldPresentationService.new(worldProjection)
	assert(worldProjection ~= nil, "worldProjection is required")
	local runtimeWorld = worldProjection:GetRuntimeWorld()
	assert(runtimeWorld ~= nil and runtimeWorld:IsA("Model"), "runtime Brookhaven world is required")

	local spawnReference = findSpawnReference(runtimeWorld)
	local surfaceCount = 0
	local neonCount = 0
	local lightCount = 0

	if spawnReference ~= nil then
		local origin = spawnReference.Position
		for _, descendant in runtimeWorld:GetDescendants() do
			if descendant:IsA("BasePart") then
				local distance = horizontalDistance(descendant.Position, origin)
				if distance <= SPAWN_RADIUS and toneSpawnSurface(descendant) then
					surfaceCount += 1
				end
				if distance <= NEON_RADIUS and reduceNeonBlowout(descendant) then
					neonCount += 1
				end
			end
		end
		lightCount = polishLocalLights(runtimeWorld, origin)
	end

	polishLighting()
	runtimeWorld:SetAttribute("StarBloxPresentationPolishRevision", POLISH_REVISION)
	runtimeWorld:SetAttribute("StarBloxRetonedSpawnSurfaces", surfaceCount)
	runtimeWorld:SetAttribute("StarBloxReducedSpawnNeon", neonCount)
	runtimeWorld:SetAttribute("StarBloxClampedSpawnLights", lightCount)

	local self = setmetatable({}, WorldPresentationService)
	self._runtimeWorld = runtimeWorld
	return self
end

function WorldPresentationService:Destroy()
	self._runtimeWorld = nil
end

return WorldPresentationService
