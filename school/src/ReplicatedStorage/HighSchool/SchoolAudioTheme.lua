local SchoolAudioTheme = {}

SchoolAudioTheme.ORIGINAL_ONLY = true
SchoolAudioTheme.CUE_CAPTIONS_REQUIRED = true
SchoolAudioTheme.SAMPLE_RATE_HZ = 48000
SchoolAudioTheme.PEAK_DB = -3
SchoolAudioTheme.INTEGRATED_LUFS = -18
SchoolAudioTheme.AMBIENCE_ROLLOFF_MODE = "InverseTapered"

SchoolAudioTheme.MIX_POLICY = table.freeze({
    maxConcurrentAmbience = 1,
    maxConcurrentCues = 2,
    cueRetriggerSeconds = 0.25,
    crossfadeSeconds = 1.25,
    ambienceEnterHoldSeconds = 0.35,
    ambienceExitPaddingStuds = 4,
    speechDuckDb = -6,
    reducedSensoryVolumeMultiplier = 0.5,
})

SchoolAudioTheme.LOCATION_AMBIENCE = table.freeze({
    lobby = table.freeze({
        token = "ambience_campus_hub",
        productionNote = "Soft footsteps, airy room tone, and distant friendly chatter.",
        looped = true,
        minDistance = 16,
        targetVolume = 0.18,
        maxDistance = 48,
    }),
    math = table.freeze({
        token = "ambience_math_focus",
        productionNote = "Quiet pencil taps and a sparse wooden click pulse.",
        looped = true,
        minDistance = 10,
        targetVolume = 0.12,
        maxDistance = 32,
    }),
    ela = table.freeze({
        token = "ambience_language_arts_focus",
        productionNote = "Soft page turns with a warm, calm library room tone.",
        looped = true,
        minDistance = 10,
        targetVolume = 0.12,
        maxDistance = 32,
    }),
    science = table.freeze({
        token = "ambience_science_lab",
        productionNote = "Gentle ventilation with occasional glass and metal ticks.",
        looped = true,
        minDistance = 10,
        targetVolume = 0.12,
        maxDistance = 32,
    }),
    cafeteria = table.freeze({
        token = "ambience_cafeteria_hum",
        productionNote = "Low tray clatter beneath diffuse lunchtime conversation.",
        looped = true,
        minDistance = 14,
        targetVolume = 0.16,
        maxDistance = 40,
    }),
    gym = table.freeze({
        token = "ambience_gym_activity",
        productionNote = "Airy court reflections with soft shoe and ball textures.",
        looped = true,
        minDistance = 12,
        targetVolume = 0.14,
        maxDistance = 36,
    }),
})

SchoolAudioTheme.CUES = table.freeze({
    periodBell = table.freeze({
        token = "cue_period_bell",
        productionNote = "Two warm mallet notes with a quick, clean decay.",
        looped = false,
        priority = 4,
        caption = "School bell rings.",
        captionHoldSeconds = 3,
        targetVolume = 0.35,
        maxDurationSeconds = 2.5,
    }),
    classComplete = table.freeze({
        token = "cue_class_complete",
        productionNote = "Three rising wooden tones ending in a soft sparkle.",
        looped = false,
        priority = 3,
        caption = "Class activity complete.",
        captionHoldSeconds = 2.5,
        targetVolume = 0.45,
        maxDurationSeconds = 1.5,
    }),
    activityComplete = table.freeze({
        token = "cue_activity_complete",
        productionNote = "Two bright percussion hits followed by a compact tonal lift.",
        looped = false,
        priority = 2,
        caption = "Activity complete.",
        captionHoldSeconds = 2.5,
        targetVolume = 0.40,
        maxDurationSeconds = 1.25,
    }),
    waypointConfirm = table.freeze({
        token = "cue_waypoint_confirm",
        productionNote = "One rounded wooden click with a short tonal lift.",
        looped = false,
        priority = 1,
        caption = "Destination confirmed.",
        captionHoldSeconds = 2,
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

function SchoolAudioTheme.getCueCaption(cueId)
    local cue = SchoolAudioTheme.getCue(cueId)
    return cue and cue.caption or nil
end

function SchoolAudioTheme.getCueCaptionDuration(cueId)
    local cue = SchoolAudioTheme.getCue(cueId)
    return cue and cue.captionHoldSeconds or nil
end

function SchoolAudioTheme.getCuePriority(cueId)
    local cue = SchoolAudioTheme.getCue(cueId)
    return cue and cue.priority or nil
end

return table.freeze(SchoolAudioTheme)
