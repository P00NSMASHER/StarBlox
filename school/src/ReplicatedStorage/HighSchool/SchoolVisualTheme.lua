local SchoolVisualTheme = {}

SchoolVisualTheme.CAMPUS_FLOOR = Color3.fromRGB(239, 244, 250)
SchoolVisualTheme.SPAWN = Color3.fromRGB(79, 173, 230)
SchoolVisualTheme.SIGN_BACKGROUND = Color3.fromRGB(20, 38, 67)
SchoolVisualTheme.SIGN_TEXT = Color3.fromRGB(255, 255, 255)
SchoolVisualTheme.SIGN_SECONDARY_TEXT = Color3.fromRGB(203, 219, 238)
SchoolVisualTheme.PAD_TRANSPARENCY = 0.12
SchoolVisualTheme.PAD_CODE_CANVAS_SIZE = 256
SchoolVisualTheme.PAD_CODE_TEXT_SIZE = 72
SchoolVisualTheme.SIGN_MAX_DISTANCE = 90
SchoolVisualTheme.SIGN_MIN_TEXT_SIZE = 16
SchoolVisualTheme.SIGN_MAX_TEXT_SIZE = 24
SchoolVisualTheme.SIGN_WIDTH = 260
SchoolVisualTheme.SIGN_HEIGHT = 64
SchoolVisualTheme.SIGN_CODE_BADGE_WIDTH = 44
SchoolVisualTheme.SIGN_CODE_TEXT_SIZE = 16
SchoolVisualTheme.SIGN_TYPE_TEXT_SIZE = 13

SchoolVisualTheme.LOCATION_CODES = table.freeze({
    lobby = "LBY",
    math = "MTH",
    ela = "ELA",
    science = "SCI",
    cafeteria = "CAF",
    gym = "GYM",
})

SchoolVisualTheme.LOCATION_TYPES = table.freeze({
    lobby = "COMMONS",
    math = "CLASSROOM",
    ela = "CLASSROOM",
    science = "LAB CLASSROOM",
    cafeteria = "DINING",
    gym = "ATHLETICS",
})

SchoolVisualTheme.LOCATION_ACCENTS = table.freeze({
    lobby = Color3.fromRGB(33, 115, 196),
    math = Color3.fromRGB(224, 67, 72),
    ela = Color3.fromRGB(151, 101, 210),
    science = Color3.fromRGB(12, 139, 126),
    cafeteria = Color3.fromRGB(232, 151, 42),
    gym = Color3.fromRGB(105, 180, 75),
})

function SchoolVisualTheme.getLocationCode(locationId)
    return SchoolVisualTheme.LOCATION_CODES[locationId] or "LOC"
end

function SchoolVisualTheme.getLocationType(locationId)
    return SchoolVisualTheme.LOCATION_TYPES[locationId] or "DESTINATION"
end

function SchoolVisualTheme.getLocationAccent(locationId)
    return SchoolVisualTheme.LOCATION_ACCENTS[locationId]
        or SchoolVisualTheme.LOCATION_ACCENTS.lobby
end

return table.freeze(SchoolVisualTheme)
