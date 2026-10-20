local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Workspace = game:GetService("Workspace")

local highSchool = ReplicatedStorage:WaitForChild("HighSchool")
local CampusRouteLayout = require(highSchool:WaitForChild("CampusRouteLayout"))
local FoundationConfig = require(highSchool:WaitForChild("FoundationConfig"))

local existing = Workspace:FindFirstChild(FoundationConfig.CAMPUS_NAME)
if existing then
    existing:Destroy()
end

local campus = Instance.new("Folder")
campus.Name = FoundationConfig.CAMPUS_NAME
campus.Parent = Workspace

local function createPassivePart(name, size, cframe, color, transparency, parent)
    local part = Instance.new("Part")
    part.Name = name
    part.Anchored = true
    part.CanCollide = false
    part.CanTouch = false
    part.CanQuery = false
    part.Material = Enum.Material.SmoothPlastic
    part.Color = color
    part.Transparency = transparency
    part.Size = size
    part.CFrame = cframe
    part.Parent = parent
    return part
end

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
spawn.CanCollide = false
spawn.CanTouch = false
spawn.CanQuery = false
spawn.Size = Vector3.new(8, 1, 8)
spawn.Position = CampusRouteLayout.ENTRANCE_POSITION
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
routes.Parent = campus

local gateways = Instance.new("Folder")
gateways.Name = "Gateways"
gateways.Parent = campus

local routeChevrons = Instance.new("Folder")
routeChevrons.Name = "RouteChevrons"
routeChevrons.Parent = campus

local routeJunctions = Instance.new("Folder")
routeJunctions.Name = "RouteJunctions"
routeJunctions.Parent = campus

local entrancePad = createPassivePart(
    "EntrancePad",
    Vector3.new(CampusRouteLayout.ENTRANCE_PAD_SIZE, 0.4, CampusRouteLayout.ENTRANCE_PAD_SIZE),
    CFrame.new(
        CampusRouteLayout.ENTRANCE_POSITION.X,
        0.7,
        CampusRouteLayout.ENTRANCE_POSITION.Z
    ),
    CampusRouteLayout.ROUTE_COLOR,
    0.2,
    wayfinding
)
entrancePad:SetAttribute("LocationId", "entrance")
entrancePad:SetAttribute("DisplayName", "Front Entrance")

local locationsById = {
    entrance = {
        id = "entrance",
        name = "Front Entrance",
        position = Vector3.new(
            CampusRouteLayout.ENTRANCE_POSITION.X,
            3,
            CampusRouteLayout.ENTRANCE_POSITION.Z
        ),
    },
}

local seen = {}
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

    local pad = Instance.new("Part")
    pad.Name = location.id .. "Pad"
    pad.Anchored = true
    pad.CanCollide = false
    pad.CanTouch = false
    pad.CanQuery = false
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

local entrance = assert(locationsById.entrance, "entrance location required for gateways")
local lobby = assert(locationsById.lobby, "lobby location required for gateways")
local gatewayLocations = {
    entrance,
    lobby,
}
for _, location in ipairs(FoundationConfig.LOCATIONS) do
    if location.id ~= "lobby" then
        table.insert(gatewayLocations, location)
    end
end

local gatewayCount = 0
for _, location in ipairs(gatewayLocations) do
    local gatewayTarget = lobby
    if location.id == "lobby" then
        gatewayTarget = entrance
    end

    local towardGatewayTarget = Vector3.new(
        gatewayTarget.position.X - location.position.X,
        0,
        gatewayTarget.position.Z - location.position.Z
    ).Unit
    local right = Vector3.new(-towardGatewayTarget.Z, 0, towardGatewayTarget.X)
    local center = Vector3.new(location.position.X, 0, location.position.Z)
        + towardGatewayTarget * CampusRouteLayout.GATEWAY_OFFSET
    local frame = CFrame.lookAt(center, center + towardGatewayTarget)
    local halfSpan = (
        CampusRouteLayout.GATEWAY_OPENING_WIDTH + CampusRouteLayout.GATEWAY_POST_WIDTH
    ) / 2

    local gateway = Instance.new("Model")
    gateway.Name = location.id .. "Gateway"
    gateway:SetAttribute("LocationId", location.id)
    gateway:SetAttribute("DisplayName", location.name)
    gateway.Parent = gateways

    createPassivePart(
        "LeftPost",
        Vector3.new(
            CampusRouteLayout.GATEWAY_POST_WIDTH,
            CampusRouteLayout.GATEWAY_HEIGHT,
            CampusRouteLayout.GATEWAY_DEPTH
        ),
        frame + right * halfSpan + Vector3.new(0, CampusRouteLayout.GATEWAY_HEIGHT / 2, 0),
        CampusRouteLayout.ROUTE_COLOR,
        0.08,
        gateway
    )
    createPassivePart(
        "RightPost",
        Vector3.new(
            CampusRouteLayout.GATEWAY_POST_WIDTH,
            CampusRouteLayout.GATEWAY_HEIGHT,
            CampusRouteLayout.GATEWAY_DEPTH
        ),
        frame - right * halfSpan + Vector3.new(0, CampusRouteLayout.GATEWAY_HEIGHT / 2, 0),
        CampusRouteLayout.ROUTE_COLOR,
        0.08,
        gateway
    )
    createPassivePart(
        "Header",
        Vector3.new(
            CampusRouteLayout.GATEWAY_OPENING_WIDTH
                + CampusRouteLayout.GATEWAY_POST_WIDTH * 2,
            CampusRouteLayout.GATEWAY_HEADER_HEIGHT,
            CampusRouteLayout.GATEWAY_DEPTH
        ),
        frame + Vector3.new(
            0,
            CampusRouteLayout.GATEWAY_HEIGHT - CampusRouteLayout.GATEWAY_HEADER_HEIGHT / 2,
            0
        ),
        CampusRouteLayout.ROUTE_COLOR,
        0.08,
        gateway
    )
    gatewayCount += 1
end
local eastHallCrossing = createPassivePart(
    "EastHallCrossing",
    Vector3.new(
        CampusRouteLayout.JUNCTION_SIZE,
        CampusRouteLayout.JUNCTION_THICKNESS,
        CampusRouteLayout.JUNCTION_SIZE
    ),
    CFrame.new(CampusRouteLayout.JUNCTION_POSITION),
    CampusRouteLayout.GUIDE_COLOR,
    CampusRouteLayout.ROUTE_TRANSPARENCY,
    routeJunctions
)
eastHallCrossing:SetAttribute(
    "ConnectedRouteIds",
    "EntranceToCafeteria,LobbyToMath"
)

local routeIds = {}
local outdoorRouteCount = 0
local routeChevronCount = 0
for _, segment in ipairs(CampusRouteLayout.SEGMENTS) do
    assert(not routeIds[segment.id], "duplicate route id: " .. segment.id)
    routeIds[segment.id] = true

    local fromLocation = assert(locationsById[segment.fromId], "unknown route origin: " .. segment.fromId)
    local toLocation = assert(locationsById[segment.toId], "unknown route destination: " .. segment.toId)
    local fromPosition = Vector3.new(fromLocation.position.X, CampusRouteLayout.ROUTE_Y, fromLocation.position.Z)
    local toPosition = Vector3.new(toLocation.position.X, CampusRouteLayout.ROUTE_Y, toLocation.position.Z)
    local delta = toPosition - fromPosition
    local distance = delta.Magnitude
    assert(distance > 0, "route endpoints must differ: " .. segment.id)

    local route = createPassivePart(
        segment.id,
        Vector3.new(CampusRouteLayout.ROUTE_WIDTH, CampusRouteLayout.ROUTE_THICKNESS, distance),
        CFrame.lookAt((fromPosition + toPosition) / 2, toPosition),
        CampusRouteLayout.ROUTE_COLOR,
        CampusRouteLayout.ROUTE_TRANSPARENCY,
        routes
    )
    route:SetAttribute("FromLocationId", segment.fromId)
    route:SetAttribute("ToLocationId", segment.toId)

    local routeKind = "indoor"
    if CampusRouteLayout.OUTDOOR_ROUTE_IDS[segment.id] then
        routeKind = "outdoor"
        outdoorRouteCount += 1
    end
    route:SetAttribute("RouteKind", routeKind)

    local chevronCount = math.max(
        1,
        math.ceil(distance / CampusRouteLayout.ROUTE_CHEVRON_MAX_SPACING) - 1
    )
    local direction = delta.Unit
    for sequenceIndex = 1, chevronCount do
        local progress = sequenceIndex / (chevronCount + 1)
        local center = fromPosition:Lerp(toPosition, progress)
        center = Vector3.new(center.X, CampusRouteLayout.ROUTE_CHEVRON_Y, center.Z)
        local chevronFrame = CFrame.lookAt(center, center + direction)

        local chevron = Instance.new("Model")
        chevron.Name = segment.id .. "Chevron" .. sequenceIndex
        chevron:SetAttribute("RouteId", segment.id)
        chevron:SetAttribute("SequenceIndex", sequenceIndex)
        chevron:SetAttribute("SequenceCount", chevronCount)
        chevron.Parent = routeChevrons

        for wingIndex, angle in ipairs({ -35, 35 }) do
            local side = wingIndex == 1 and -1 or 1
            createPassivePart(
                "Wing" .. wingIndex,
                Vector3.new(
                    CampusRouteLayout.ROUTE_CHEVRON_SPAN / 2,
                    CampusRouteLayout.ROUTE_CHEVRON_THICKNESS,
                    CampusRouteLayout.ROUTE_CHEVRON_WIDTH
                ),
                chevronFrame
                    * CFrame.new(
                        side * CampusRouteLayout.ROUTE_CHEVRON_LENGTH / 4,
                        0,
                        0
                    )
                    * CFrame.Angles(0, math.rad(angle), 0),
                CampusRouteLayout.GUIDE_COLOR,
                0.08,
                chevron
            )
        end

        routeChevronCount += 1
    end
end

campus:SetAttribute("FoundationVersion", 1)
campus:SetAttribute("LocationCount", #FoundationConfig.LOCATIONS)
campus:SetAttribute("RouteCount", #CampusRouteLayout.SEGMENTS)
campus:SetAttribute("RouteChevronCount", routeChevronCount)
campus:SetAttribute("RouteJunctionCount", 1)
campus:SetAttribute("OutdoorRouteCount", outdoorRouteCount)
campus:SetAttribute("GatewayCount", gatewayCount)
campus:SetAttribute("EntranceWayfindingCount", 1)
