local CampusRouteLayout = {}

CampusRouteLayout.ROUTE_WIDTH = 10
CampusRouteLayout.ROUTE_THICKNESS = 0.08
CampusRouteLayout.ROUTE_Y = 0.54
CampusRouteLayout.ROUTE_TRANSPARENCY = 0.42

CampusRouteLayout.SEGMENTS = table.freeze({
    table.freeze({ id = "LobbyToMath", fromId = "lobby", toId = "math" }),
    table.freeze({ id = "LobbyToLanguageArts", fromId = "lobby", toId = "ela" }),
    table.freeze({ id = "LobbyToScience", fromId = "lobby", toId = "science" }),
    table.freeze({ id = "LobbyToCafeteria", fromId = "lobby", toId = "cafeteria" }),
})

return table.freeze(CampusRouteLayout)
