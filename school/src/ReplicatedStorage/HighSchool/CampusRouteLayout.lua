local CampusRouteLayout = {}

CampusRouteLayout.ROUTE_WIDTH = 10
CampusRouteLayout.ROUTE_THICKNESS = 0.08
CampusRouteLayout.ROUTE_Y = 0.54
CampusRouteLayout.ROUTE_TRANSPARENCY = 0.42

CampusRouteLayout.GATEWAY_OPENING_WIDTH = 10
CampusRouteLayout.GATEWAY_POST_WIDTH = 1
CampusRouteLayout.GATEWAY_HEIGHT = 8
CampusRouteLayout.GATEWAY_DEPTH = 1
CampusRouteLayout.GATEWAY_HEADER_HEIGHT = 1
CampusRouteLayout.GATEWAY_OFFSET = 6

CampusRouteLayout.SEGMENTS = table.freeze({
    table.freeze({ id = "EntranceToLobby", fromId = "entrance", toId = "lobby" }),
    table.freeze({ id = "LobbyToMath", fromId = "lobby", toId = "math" }),
    table.freeze({ id = "LobbyToLanguageArts", fromId = "lobby", toId = "ela" }),
    table.freeze({ id = "LobbyToScience", fromId = "lobby", toId = "science" }),
    table.freeze({ id = "LobbyToCafeteria", fromId = "lobby", toId = "cafeteria" }),
})

return table.freeze(CampusRouteLayout)
