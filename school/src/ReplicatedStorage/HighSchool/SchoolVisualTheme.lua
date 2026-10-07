local SchoolVisualTheme = {}

SchoolVisualTheme.CAMPUS_FLOOR = Color3.fromRGB(239, 244, 250)
SchoolVisualTheme.SPAWN = Color3.fromRGB(79, 173, 230)
SchoolVisualTheme.SIGN_BACKGROUND = Color3.fromRGB(20, 38, 67)
SchoolVisualTheme.SIGN_TEXT = Color3.fromRGB(255, 255, 255)
SchoolVisualTheme.PAD_TRANSPARENCY = 0.12
SchoolVisualTheme.SIGN_MAX_DISTANCE = 90
SchoolVisualTheme.SIGN_MIN_TEXT_SIZE = 16
SchoolVisualTheme.SIGN_MAX_TEXT_SIZE = 24

SchoolVisualTheme.LOCATION_ACCENTS = table.freeze({
    lobby = Color3.fromRGB(33, 115, 196),
    math = Color3.fromRGB(224, 67, 72),
    ela = Color3.fromRGB(151, 101, 210),
    science = Color3.fromRGB(12, 139, 126),
    cafeteria = Color3.fromRGB(232, 151, 42),
})

function SchoolVisualTheme.getLocationAccent(locationId)
    return SchoolVisualTheme.LOCATION_ACCENTS[locationId]
        or SchoolVisualTheme.LOCATION_ACCENTS.lobby
end

return table.freeze(SchoolVisualTheme)
