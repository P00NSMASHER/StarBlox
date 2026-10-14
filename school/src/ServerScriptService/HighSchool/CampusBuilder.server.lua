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

    local accent = SchoolVisualTheme.getLocationAccent(location.id)
    local locationCode = SchoolVisualTheme.getLocationCode(location.id)
    marker:SetAttribute("WayfindingCode", locationCode)
    marker.Parent = registry

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
    pad:SetAttribute("WayfindingCode", locationCode)
    pad.Parent = wayfinding

    local padCodeGui = Instance.new("SurfaceGui")
    padCodeGui.Name = "WayfindingCode"
    padCodeGui.Face = Enum.NormalId.Top
    padCodeGui.CanvasSize = Vector2.new(
        SchoolVisualTheme.PAD_CODE_CANVAS_SIZE,
        SchoolVisualTheme.PAD_CODE_CANVAS_SIZE
    )
    padCodeGui.LightInfluence = 0
    padCodeGui.AlwaysOnTop = true
    padCodeGui.Parent = pad

    local padCode = Instance.new("TextLabel")
    padCode.Name = "Code"
    padCode.Position = UDim2.fromScale(0.15, 0.15)
    padCode.Size = UDim2.fromScale(0.7, 0.7)
    padCode.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND
    padCode.BackgroundTransparency = 0.05
    padCode.BorderSizePixel = 0
    padCode.Font = Enum.Font.GothamBold
    padCode.Text = locationCode
    padCode.TextColor3 = SchoolVisualTheme.SIGN_TEXT
    padCode.TextSize = SchoolVisualTheme.PAD_CODE_TEXT_SIZE
    padCode.TextScaled = false
    padCode.Parent = padCodeGui

    local padCodeCorner = Instance.new("UICorner")
    padCodeCorner.CornerRadius = UDim.new(0, 18)
    padCodeCorner.Parent = padCode

    local padCodeOutline = Instance.new("UIStroke")
    padCodeOutline.Color = accent
    padCodeOutline.Thickness = 6
    padCodeOutline.Transparency = 0
    padCodeOutline.Parent = padCode

    local sign = Instance.new("BillboardGui")
    sign.Name = "LocationLabel"
    sign.Size = UDim2.fromOffset(
        SchoolVisualTheme.SIGN_WIDTH,
        SchoolVisualTheme.SIGN_HEIGHT
    )
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

    local codeBadge = Instance.new("TextLabel")
    codeBadge.Name = "LocationCode"
    codeBadge.Position = UDim2.fromOffset(8, 8)
    codeBadge.Size = UDim2.fromOffset(
        SchoolVisualTheme.SIGN_CODE_BADGE_WIDTH,
        SchoolVisualTheme.SIGN_HEIGHT - 16
    )
    codeBadge.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND
    codeBadge.BackgroundTransparency = 0
    codeBadge.BorderSizePixel = 0
    codeBadge.Font = Enum.Font.GothamBold
    codeBadge.Text = locationCode
    codeBadge.TextColor3 = SchoolVisualTheme.SIGN_TEXT
    codeBadge.TextSize = SchoolVisualTheme.SIGN_CODE_TEXT_SIZE
    codeBadge.TextScaled = false
    codeBadge.Parent = panel

    local codeOutline = Instance.new("UIStroke")
    codeOutline.Color = accent
    codeOutline.Thickness = 2
    codeOutline.Transparency = 0
    codeOutline.Parent = codeBadge

    local codeCorner = Instance.new("UICorner")
    codeCorner.CornerRadius = UDim.new(0, 6)
    codeCorner.Parent = codeBadge

    local text = Instance.new("TextLabel")
    text.Name = "Label"
    text.Position = UDim2.fromOffset(SchoolVisualTheme.SIGN_CODE_BADGE_WIDTH + 16, 4)
    text.Size = UDim2.new(1, -(SchoolVisualTheme.SIGN_CODE_BADGE_WIDTH + 24), 1, -8)
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
