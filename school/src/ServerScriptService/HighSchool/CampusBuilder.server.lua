local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local CampusRouteLayout = require(highSchool:WaitForChild("CampusRouteLayout"))
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
spawn.CanCollide = false
spawn.CanTouch = false
spawn.CanQuery = false
spawn.Size = Vector3.new(8, 1, 8)
spawn.Position = FoundationConfig.SPAWN_POSITION
spawn.Color = SchoolVisualTheme.SPAWN
spawn:SetAttribute("LocationId", "entrance")
spawn:SetAttribute("DisplayName", "Front Entrance")
spawn.Parent = campus

local registry = Instance.new("Folder")
registry.Name = "Locations"
registry.Parent = campus

local wayfinding = Instance.new("Folder")
wayfinding.Name = "Wayfinding"
wayfinding.Parent = campus

local routes = Instance.new("Folder")
routes.Name = "Routes"
routes.Parent = wayfinding

local gateways = Instance.new("Folder")
gateways.Name = "Gateways"
gateways.Parent = wayfinding

local entrancePad = Instance.new("Part")
entrancePad.Name = "EntranceArrivalPad"
entrancePad.Anchored = true
entrancePad.CanCollide = false
entrancePad.CanTouch = false
entrancePad.CanQuery = false
entrancePad.Material = Enum.Material.SmoothPlastic
entrancePad.Color = SchoolVisualTheme.SPAWN
entrancePad.Transparency = SchoolVisualTheme.PAD_TRANSPARENCY
entrancePad.Size = Vector3.new(16, 0.4, 16)
entrancePad.Position = Vector3.new(spawn.Position.X, 0.7, spawn.Position.Z)
entrancePad:SetAttribute("LocationId", "entrance")
entrancePad.Parent = wayfinding

local entranceSign = Instance.new("BillboardGui")
entranceSign.Name = "EntranceLabel"
entranceSign.Size = UDim2.fromOffset(260, 56)
entranceSign.StudsOffset = Vector3.new(0, 6, 0)
entranceSign.AlwaysOnTop = true
entranceSign.MaxDistance = SchoolVisualTheme.SIGN_MAX_DISTANCE
entranceSign.LightInfluence = 0
entranceSign.Parent = spawn

local entrancePanel = Instance.new("Frame")
entrancePanel.Name = "Panel"
entrancePanel.Size = UDim2.fromScale(1, 1)
entrancePanel.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND
entrancePanel.BackgroundTransparency = 0.05
entrancePanel.BorderSizePixel = 0
entrancePanel.Parent = entranceSign

local entranceCorner = Instance.new("UICorner")
entranceCorner.CornerRadius = UDim.new(0, 8)
entranceCorner.Parent = entrancePanel

local entranceOutline = Instance.new("UIStroke")
entranceOutline.Color = SchoolVisualTheme.SPAWN
entranceOutline.Thickness = 2
entranceOutline.Transparency = 0.1
entranceOutline.Parent = entrancePanel

local entranceText = Instance.new("TextLabel")
entranceText.Name = "Label"
entranceText.Position = UDim2.fromOffset(8, 4)
entranceText.Size = UDim2.new(1, -16, 1, -8)
entranceText.BackgroundTransparency = 1
entranceText.Font = Enum.Font.GothamBold
entranceText.Text = "Front Entrance • Main Lobby"
entranceText.TextColor3 = SchoolVisualTheme.SIGN_TEXT
entranceText.TextScaled = true
entranceText.TextStrokeTransparency = 1
entranceText.Parent = entrancePanel

local entranceTextConstraint = Instance.new("UITextSizeConstraint")
entranceTextConstraint.MinTextSize = SchoolVisualTheme.SIGN_MIN_TEXT_SIZE
entranceTextConstraint.MaxTextSize = SchoolVisualTheme.SIGN_MAX_TEXT_SIZE
entranceTextConstraint.Parent = entranceText

local seen = {}
local locationsById = {
    entrance = table.freeze({
        position = Vector3.new(spawn.Position.X, 3, spawn.Position.Z),
    }),
}
for _, location in ipairs(FoundationConfig.LOCATIONS) do
    assert(type(location.id) == "string" and location.id ~= "", "location id required")
    assert(not seen[location.id], "duplicate location id: " .. location.id)
    seen[location.id] = true
    locationsById[location.id] = location

    local marker = Instance.new("Part")
    marker.Name = location.id
    marker.Anchored = true
    marker.CanCollide = false
    marker.CanTouch = false
    marker.CanQuery = false
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
    pad.CanTouch = false
    pad.CanQuery = false
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

local lobbyLocation = assert(locationsById.lobby, "lobby location required for destination gateways")
local gatewayCount = 0
for _, location in ipairs(FoundationConfig.LOCATIONS) do
    if location.id ~= "lobby" then
        local towardLobby = Vector3.new(
            lobbyLocation.position.X - location.position.X,
            0,
            lobbyLocation.position.Z - location.position.Z
        )
        assert(towardLobby.Magnitude > 0, "gateway destination must be distinct from lobby")
        local approach = towardLobby.Unit
        local thresholdPosition = Vector3.new(location.position.X, 0.5, location.position.Z)
            + approach * CampusRouteLayout.GATEWAY_OFFSET
        local gatewayCFrame = CFrame.lookAt(thresholdPosition, thresholdPosition + approach)
        local accent = SchoolVisualTheme.getLocationAccent(location.id)

        local gateway = Instance.new("Model")
        gateway.Name = location.id .. "Gateway"
        gateway:SetAttribute("LocationId", location.id)
        gateway:SetAttribute("DisplayName", location.name)
        gateway:SetAttribute("ClearWidth", CampusRouteLayout.GATEWAY_OPENING_WIDTH)
        gateway.Parent = gateways

        local function makeGatewayPart(name, size, offset)
            local gatewayPart = Instance.new("Part")
            gatewayPart.Name = name
            gatewayPart.Anchored = true
            gatewayPart.CanCollide = false
            gatewayPart.CanTouch = false
            gatewayPart.CanQuery = false
            gatewayPart.Material = Enum.Material.SmoothPlastic
            gatewayPart.Color = accent
            gatewayPart.Size = size
            gatewayPart.CFrame = gatewayCFrame * CFrame.new(offset)
            gatewayPart.Parent = gateway
        end

        local postOffset = (
            CampusRouteLayout.GATEWAY_OPENING_WIDTH + CampusRouteLayout.GATEWAY_POST_WIDTH
        ) / 2
        local postSize = Vector3.new(
            CampusRouteLayout.GATEWAY_POST_WIDTH,
            CampusRouteLayout.GATEWAY_HEIGHT,
            CampusRouteLayout.GATEWAY_DEPTH
        )
        makeGatewayPart(
            "LeftPost",
            postSize,
            Vector3.new(-postOffset, CampusRouteLayout.GATEWAY_HEIGHT / 2, 0)
        )
        makeGatewayPart(
            "RightPost",
            postSize,
            Vector3.new(postOffset, CampusRouteLayout.GATEWAY_HEIGHT / 2, 0)
        )
        makeGatewayPart(
            "Header",
            Vector3.new(
                CampusRouteLayout.GATEWAY_OPENING_WIDTH
                    + CampusRouteLayout.GATEWAY_POST_WIDTH * 2,
                CampusRouteLayout.GATEWAY_HEADER_HEIGHT,
                CampusRouteLayout.GATEWAY_DEPTH
            ),
            Vector3.new(
                0,
                CampusRouteLayout.GATEWAY_HEIGHT
                    - CampusRouteLayout.GATEWAY_HEADER_HEIGHT / 2,
                0
            )
        )

        gatewayCount += 1
    end
end

local routeIds = {}
for _, segment in ipairs(CampusRouteLayout.SEGMENTS) do
    assert(not routeIds[segment.id], "duplicate campus route id: " .. segment.id)
    routeIds[segment.id] = true

    local fromLocation = assert(
        locationsById[segment.fromId],
        "unknown route origin: " .. tostring(segment.fromId)
    )
    local toLocation = assert(
        locationsById[segment.toId],
        "unknown route destination: " .. tostring(segment.toId)
    )

    local startPosition = Vector3.new(
        fromLocation.position.X,
        CampusRouteLayout.ROUTE_Y,
        fromLocation.position.Z
    )
    local endPosition = Vector3.new(
        toLocation.position.X,
        CampusRouteLayout.ROUTE_Y,
        toLocation.position.Z
    )
    local delta = endPosition - startPosition
    local distance = delta.Magnitude
    assert(distance > 0, "campus route must connect distinct locations: " .. segment.id)

    local route = Instance.new("Part")
    route.Name = segment.id
    route.Anchored = true
    route.CanCollide = false
    route.CanTouch = false
    route.CanQuery = false
    route.Material = Enum.Material.SmoothPlastic
    route.Color = SchoolVisualTheme.getLocationAccent(segment.toId)
    route.Transparency = CampusRouteLayout.ROUTE_TRANSPARENCY
    route.Size = Vector3.new(
        CampusRouteLayout.ROUTE_WIDTH,
        CampusRouteLayout.ROUTE_THICKNESS,
        distance
    )
    route.CFrame = CFrame.lookAt((startPosition + endPosition) / 2, endPosition)
    route:SetAttribute("FromLocationId", segment.fromId)
    route:SetAttribute("ToLocationId", segment.toId)
    route.Parent = routes
end

campus:SetAttribute("FoundationVersion", 1)
campus:SetAttribute("LocationCount", #FoundationConfig.LOCATIONS)
campus:SetAttribute("RouteCount", #CampusRouteLayout.SEGMENTS)
campus:SetAttribute("GatewayCount", gatewayCount)
campus:SetAttribute("EntranceWayfindingCount", 1)
