local FoundationConfig = {}

FoundationConfig.CAMPUS_NAME = "PipHighCampus"
FoundationConfig.SPAWN_NAME = "MainSpawn"

FoundationConfig.LOCATIONS = {
    { id = "lobby", name = "Main Lobby", position = Vector3.new(0, 3, 0) },
    { id = "math", name = "Math Classroom", position = Vector3.new(36, 3, 0) },
    { id = "ela", name = "Language Arts Classroom", position = Vector3.new(-36, 3, 0) },
    { id = "science", name = "Science Classroom", position = Vector3.new(0, 3, 36) },
    { id = "cafeteria", name = "Cafeteria", position = Vector3.new(0, 3, -36) },
}

return table.freeze(FoundationConfig)
