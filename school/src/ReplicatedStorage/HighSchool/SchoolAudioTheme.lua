local SchoolAudioTheme = {}

SchoolAudioTheme.ORIGINAL_ONLY = true
SchoolAudioTheme.SAMPLE_RATE_HZ = 48000
SchoolAudioTheme.PEAK_DB = -3
SchoolAudioTheme.INTEGRATED_LUFS = -18

SchoolAudioTheme.MIX_POLICY = table.freeze({
    maxConcurrentAmbience = 1,
    crossfadeSeconds = 1.25,
    speechDuckDb = -6,
    reducedSensoryVolumeMultiplier = 0.5,
})

SchoolAudioTheme.LOCATION_AMBIENCE = table.freeze({
    lobby = table.freeze({
        token = "ambience_campus_hub",
        targetVolume = 0.18,
        maxDistance = 48,
    }),
    math = table.freeze({
        token = "ambience_math_focus",
        targetVolume = 0.12,
        maxDistance = 32,
    }),
    ela = table.freeze({
        token = "ambience_language_arts_focus",
        targetVolume = 0.12,
        maxDistance = 32,
    }),
    science = table.freeze({
        token = "ambience_science_lab",
        targetVolume = 0.12,
        maxDistance = 32,
    }),
    cafeteria = table.freeze({
        token = "ambience_cafeteria_hum",
        targetVolume = 0.16,
        maxDistance = 40,
    }),
})

SchoolAudioTheme.CUES = table.freeze({
    periodBell = table.freeze({
        token = "cue_period_bell",
        targetVolume = 0.35,
        maxDurationSeconds = 2.5,
    }),
    classComplete = table.freeze({
        token = "cue_class_complete",
        targetVolume = 0.45,
        maxDurationSeconds = 1.5,
    }),
    waypointConfirm = table.freeze({
        token = "cue_waypoint_confirm",
        targetVolume = 0.30,
        maxDurationSeconds = 0.75,
    }),
})

function SchoolAudioTheme.getLocationAmbience(locationId)
    return SchoolAudioTheme.LOCATION_AMBIENCE[locationId]
end

function SchoolAudioTheme.getCue(cueId)
    return SchoolAudioTheme.CUES[cueId]
end

return table.freeze(SchoolAudioTheme)
