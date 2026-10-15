local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local FoundationConfig = require(
    ReplicatedStorage:WaitForChild("HighSchool"):WaitForChild("FoundationConfig")
)

local existing = Workspace:FindFirstChild(FoundationConfig.CAMPUS_NAME)
if existing then
    existing:Destroy()
end

local campus = Instance.new("Folder")
campus.Name = FoundationConfig.CAMPUS_NAME
campus.Parent = Workspace

local floor = Instance.new("Part")
floor.Name = "CampusFloor"
floor.Anchored = true
floor.Size = Vector3.new(110, 1, 110)
floor.Position = Vector3.new(0, 0, 0)
floor.Material = Enum.Material.SmoothPlastic
floor.Parent = campus

local spawn = Instance.new("SpawnLocation")
spawn.Name = FoundationConfig.SPAWN_NAME
spawn.Anchored = true
spawn.Neutral = true
spawn.Size = Vector3.new(8, 1, 8)
spawn.Position = Vector3.new(0, 1, 12)
spawn.Parent = campus

local registry = Instance.new("Folder")
registry.Name = "Locations"
registry.Parent = campus

local wayfinding = Instance.new("Folder")
wayfinding.Name = "Wayfinding"
wayfinding.Parent = campus

local seen = {}
for _, location in ipairs(FoundationConfig.LOCATIONS) do
    assert(type(location.id) == "string" and location.id ~= "", "location id required")
    assert(not seen[location.id], "duplicate location id: " .. location.id)
    seen[location.id] = true

    local marker = Instance.new("Part")
    marker.Name = location.id
    marker.Anchored = true
    marker.CanCollide = false
    marker.Transparency = 1
    marker.Size = Vector3.new(4, 4, 4)
    marker.Position = location.position
    marker:SetAttribute("LocationId", location.id)
    marker:SetAttribute("DisplayName", location.name)
    marker.Parent = registry

    local pad = Instance.new("Part")
    pad.Name = location.id .. "Pad"
    pad.Anchored = true
    pad.CanCollide = false
    pad.Material = Enum.Material.SmoothPlastic
    pad.Transparency = 0.35
    pad.Size = Vector3.new(12, 0.4, 12)
    pad.Position = Vector3.new(location.position.X, 0.7, location.position.Z)
    pad:SetAttribute("LocationId", location.id)
    pad.Parent = wayfinding

    local sign = Instance.new("BillboardGui")
    sign.Name = "LocationLabel"
    sign.Size = UDim2.fromOffset(180, 40)
    sign.StudsOffset = Vector3.new(0, 5, 0)
    sign.AlwaysOnTop = true
    sign.Parent = marker

    local text = Instance.new("TextLabel")
    text.Name = "Label"
    text.Size = UDim2.fromScale(1, 1)
    text.BackgroundTransparency = 1
    text.Text = location.name
    text.TextScaled = true
    text.TextStrokeTransparency = 0.35
    text.Parent = sign
end

campus:SetAttribute("FoundationVersion", 1)
campus:SetAttribute("LocationCount", #FoundationConfig.LOCATIONS)
