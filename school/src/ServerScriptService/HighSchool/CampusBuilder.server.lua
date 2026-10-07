local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))
local SchoolVisualTheme = require(highSchool:WaitForChild("SchoolVisualTheme"))

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
floor.Color = SchoolVisualTheme.CAMPUS_FLOOR
floor.Parent = campus

local spawn = Instance.new("SpawnLocation")
spawn.Name = FoundationConfig.SPAWN_NAME
spawn.Anchored = true
spawn.Neutral = true
spawn.Size = Vector3.new(8, 1, 8)
spawn.Position = Vector3.new(0, 1, 12)
spawn.Color = SchoolVisualTheme.SPAWN
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

    local accent = SchoolVisualTheme.getLocationAccent(location.id)

    local pad = Instance.new("Part")
    pad.Name = location.id .. "Pad"
    pad.Anchored = true
    pad.CanCollide = false
    pad.Material = Enum.Material.SmoothPlastic
    pad.Color = accent
    pad.Transparency = SchoolVisualTheme.PAD_TRANSPARENCY
    pad.Size = Vector3.new(12, 0.4, 12)
    pad.Position = Vector3.new(location.position.X, 0.7, location.position.Z)
    pad:SetAttribute("LocationId", location.id)
    pad.Parent = wayfinding

    local sign = Instance.new("BillboardGui")
    sign.Name = "LocationLabel"
    sign.Size = UDim2.fromOffset(220, 52)
    sign.StudsOffset = Vector3.new(0, 5, 0)
    sign.AlwaysOnTop = true
    sign.MaxDistance = SchoolVisualTheme.SIGN_MAX_DISTANCE
    sign.LightInfluence = 0
    sign.Parent = marker

    local panel = Instance.new("Frame")
    panel.Name = "Panel"
    panel.Size = UDim2.fromScale(1, 1)
    panel.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND
    panel.BackgroundTransparency = 0.05
    panel.BorderSizePixel = 0
    panel.Parent = sign

    local corner = Instance.new("UICorner")
    corner.CornerRadius = UDim.new(0, 8)
    corner.Parent = panel

    local outline = Instance.new("UIStroke")
    outline.Color = accent
    outline.Thickness = 2
    outline.Transparency = 0.1
    outline.Parent = panel

    local text = Instance.new("TextLabel")
    text.Name = "Label"
    text.Position = UDim2.fromOffset(8, 4)
    text.Size = UDim2.new(1, -16, 1, -8)
    text.BackgroundTransparency = 1
    text.Font = Enum.Font.GothamBold
    text.Text = location.name
    text.TextColor3 = SchoolVisualTheme.SIGN_TEXT
    text.TextScaled = true
    text.TextStrokeTransparency = 1
    text.Parent = panel

    local textConstraint = Instance.new("UITextSizeConstraint")
    textConstraint.MinTextSize = SchoolVisualTheme.SIGN_MIN_TEXT_SIZE
    textConstraint.MaxTextSize = SchoolVisualTheme.SIGN_MAX_TEXT_SIZE
    textConstraint.Parent = text
end

campus:SetAttribute("FoundationVersion", 1)
campus:SetAttribute("LocationCount", #FoundationConfig.LOCATIONS)
