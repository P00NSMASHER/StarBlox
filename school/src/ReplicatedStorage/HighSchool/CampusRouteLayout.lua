local CampusRouteLayout = {}

CampusRouteLayout.ROUTE_WIDTH = 10
CampusRouteLayout.ROUTE_THICKNESS = 0.08
CampusRouteLayout.ROUTE_Y = 0.54
CampusRouteLayout.ROUTE_TRANSPARENCY = 0.42
CampusRouteLayout.ENTRANCE_PAD_SIZE = 14
CampusRouteLayout.ROUTE_CHEVRON_LENGTH = 4
CampusRouteLayout.ROUTE_CHEVRON_SPAN = 4
CampusRouteLayout.ROUTE_CHEVRON_WIDTH = 0.75
CampusRouteLayout.ROUTE_CHEVRON_THICKNESS = 0.1
CampusRouteLayout.ROUTE_CHEVRON_Y = 0.74

CampusRouteLayout.JUNCTION_SIZE = 12
CampusRouteLayout.JUNCTION_THICKNESS = 0.08
CampusRouteLayout.JUNCTION_POSITION = Vector3.new(20.57, 0.64, 0)

CampusRouteLayout.GATEWAY_OPENING_WIDTH = 10
CampusRouteLayout.GATEWAY_POST_WIDTH = 1
CampusRouteLayout.GATEWAY_HEIGHT = 8
CampusRouteLayout.GATEWAY_DEPTH = 1
CampusRouteLayout.GATEWAY_HEADER_HEIGHT = 1
CampusRouteLayout.GATEWAY_OFFSET = 6

CampusRouteLayout.OUTDOOR_ROUTE_IDS = table.freeze({
    OutdoorEntranceToMath = true,
    OutdoorEntranceToScience = true,
    OutdoorEntranceToCafeteria = true,
})

CampusRouteLayout.SEGMENTS = table.freeze({
    table.freeze({ id = "EntranceToLobby", fromId = "entrance", toId = "lobby" }),
    table.freeze({ id = "OutdoorEntranceToMath", fromId = "entrance", toId = "math" }),
    table.freeze({ id = "OutdoorEntranceToScience", fromId = "entrance", toId = "science" }),
    table.freeze({ id = "OutdoorEntranceToCafeteria", fromId = "entrance", toId = "cafeteria" }),
    table.freeze({ id = "LobbyToMath", fromId = "lobby", toId = "math" }),
    table.freeze({ id = "LobbyToLanguageArts", fromId = "lobby", toId = "ela" }),
    table.freeze({ id = "LobbyToScience", fromId = "lobby", toId = "science" }),
    table.freeze({ id = "LobbyToCafeteria", fromId = "lobby", toId = "cafeteria" }),
    table.freeze({ id = "LobbyToGym", fromId = "lobby", toId = "gym" }),
    table.freeze({ id = "GymToCafeteria", fromId = "gym", toId = "cafeteria" }),
    table.freeze({ id = "LanguageArtsToGym", fromId = "ela", toId = "gym" }),
})

return table.freeze(CampusRouteLayout)
