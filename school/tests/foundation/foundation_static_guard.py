#!/usr/bin/env python3
import itertools
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
project_path = ROOT / "default.project.json"
project = json.loads(project_path.read_text(encoding="utf-8"))
project_text = json.dumps(project).lower()


def relative_luminance(color):
    channels = []
    for value in color:
        channel = value / 255
        channels.append(
            channel / 12.92
            if channel <= 0.04045
            else ((channel + 0.055) / 1.055) ** 2.4
        )
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast_ratio(first, second):
    light, dark = sorted(
        (relative_luminance(first), relative_luminance(second)),
        reverse=True,
    )
    return (light + 0.05) / (dark + 0.05)

for forbidden in ("highschool/", "pipsquest", "maze", "brookhaven", "bhw_", "rhs"):
    assert forbidden not in project_text, f"forbidden mapped dependency: {forbidden}"

mapped_paths = [
    project["tree"]["ReplicatedStorage"]["HighSchool"]["$path"],
    project["tree"]["ServerScriptService"]["HighSchool"]["$path"],
]
for rel in mapped_paths:
    target = (ROOT / rel).resolve()
    assert target.exists(), f"missing mapped path: {rel}"
    assert ROOT.resolve() in target.parents, f"mapped path escapes canonical school root: {rel}"

config = (ROOT / "src/ReplicatedStorage/HighSchool/FoundationConfig.lua").read_text(encoding="utf-8")
clock = (ROOT / "src/ReplicatedStorage/HighSchool/SchoolClock.lua").read_text(encoding="utf-8")
state = (ROOT / "src/ReplicatedStorage/HighSchool/FoundationState.lua").read_text(encoding="utf-8")
visual_theme = (ROOT / "src/ReplicatedStorage/HighSchool/SchoolVisualTheme.lua").read_text(encoding="utf-8")
audio_theme = (ROOT / "src/ReplicatedStorage/HighSchool/SchoolAudioTheme.lua").read_text(encoding="utf-8")
builder = (ROOT / "src/ServerScriptService/HighSchool/CampusBuilder.server.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/SchoolClockService.server.lua").read_text(encoding="utf-8")

assert 'CAMPUS_NAME = "PipHighCampus"' in config
assert 'SPAWN_NAME = "MainSpawn"' in config
assert 'marker:SetAttribute("LocationId", location.id)' in builder
assert 'marker:SetAttribute("WayfindingCode", locationCode)' in builder
assert 'marker:SetAttribute("RoomType", locationType)' in builder
assert 'assert(not seen[location.id]' in builder
assert 'wayfinding.Name = "Wayfinding"' in builder
assert 'pad.Name = location.id .. "Pad"' in builder
assert 'pad.Color = accent' in builder
assert 'pad.Transparency = SchoolVisualTheme.PAD_TRANSPARENCY' in builder
assert 'pad:SetAttribute("WayfindingCode", locationCode)' in builder
assert 'padCodeGui.Name = "WayfindingCode"' in builder
assert 'padCodeGui.Face = Enum.NormalId.Top' in builder
assert 'padCodeGui.AlwaysOnTop = true' in builder
assert 'padCode.Name = "Code"' in builder
assert 'padCode.Text = locationCode' in builder
assert 'padCode.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND' in builder
assert 'padCode.TextColor3 = SchoolVisualTheme.SIGN_TEXT' in builder
assert 'padCode.TextSize = SchoolVisualTheme.PAD_CODE_TEXT_SIZE' in builder
assert 'padCode.TextScaled = false' in builder
assert 'padCodeOutline.Color = accent' in builder
assert 'padCodeOutline.Parent = padCode' in builder
assert 'sign.Name = "LocationLabel"' in builder
assert 'SchoolVisualTheme.SIGN_WIDTH' in builder
assert 'SchoolVisualTheme.SIGN_HEIGHT' in builder
assert 'sign.MaxDistance = SchoolVisualTheme.SIGN_MAX_DISTANCE' in builder
assert 'panel.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND' in builder
assert 'outline.Color = accent' in builder
assert 'codeBadge.Name = "LocationCode"' in builder
assert 'codeBadge.Text = locationCode' in builder
assert 'codeBadge.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND' in builder
assert 'codeBadge.TextColor3 = SchoolVisualTheme.SIGN_TEXT' in builder
assert 'codeBadge.TextSize = SchoolVisualTheme.SIGN_CODE_TEXT_SIZE' in builder
assert 'codeBadge.TextScaled = false' in builder
assert 'codeOutline.Color = accent' in builder
assert 'codeOutline.Parent = codeBadge' in builder
assert 'text.Font = Enum.Font.GothamBold' in builder
assert 'text.Text = location.name' in builder
assert 'text.TextColor3 = SchoolVisualTheme.SIGN_TEXT' in builder
assert 'textConstraint.MinTextSize = SchoolVisualTheme.SIGN_MIN_TEXT_SIZE' in builder
assert 'textConstraint.MaxTextSize = SchoolVisualTheme.SIGN_MAX_TEXT_SIZE' in builder
assert 'roomType.Name = "RoomType"' in builder
assert 'roomType.Text = locationType' in builder
assert 'roomType.TextColor3 = SchoolVisualTheme.SIGN_SECONDARY_TEXT' in builder
assert 'roomType.TextSize = SchoolVisualTheme.SIGN_TYPE_TEXT_SIZE' in builder
assert 'roomType.TextScaled = false' in builder
assert 'roomType.TextXAlignment = Enum.TextXAlignment.Left' in builder

# Campus signs are construction-time geometry. Per-frame callbacks or polling here
# would multiply avoidable UI work on every client-facing destination marker.
for forbidden_runtime_work in (
    "RunService",
    "Heartbeat",
    "RenderStepped",
    "Stepped:Connect",
    "while true",
    "task.wait(",
    "task.spawn(",
    "task.defer(",
):
    assert forbidden_runtime_work not in builder, (
        f"campus builder must remain one-pass; found {forbidden_runtime_work}"
    )
assert builder.count(
    "for _, location in ipairs(FoundationConfig.LOCATIONS) do"
) == 1, "campus builder must keep one bounded location construction pass"
assert builder.count('Instance.new("SurfaceGui")') == 1, (
    "floor wayfinding must reuse one bounded SurfaceGui constructor inside the location pass"
)
assert builder.count('Instance.new("TextLabel")') == 4, (
    "destination wayfinding must remain four bounded labels inside the one-pass constructor"
)
assert builder.count('roomType.Name = "RoomType"') == 1, (
    "room type label must be constructed once per destination through the bounded location pass"
)

# Invisible registry markers and decorative floor pads have no gameplay touch or
# raycast role. Keeping them out of touch/query participation avoids ten needless
# physics candidates on the current five-destination campus.
for part_name in ("marker", "pad"):
    for physics_property in ("CanCollide", "CanTouch", "CanQuery"):
        assignment = f"{part_name}.{physics_property} = false"
        assert builder.count(assignment) == 1, (
            f"{part_name} must disable {physics_property} once in the bounded location pass"
        )

location_ids = set(re.findall(r'id = "([^"]+)", name = ', config))
core_location_ids = {"lobby", "math", "ela", "science", "cafeteria"}
planned_location_ids = {"gym"}
theme_location_ids = core_location_ids | planned_location_ids
assert core_location_ids <= location_ids, "canonical campus location missing"
assert location_ids <= theme_location_ids, "unexpected location id"
for location_id in theme_location_ids:
    assert f"{location_id} = Color3.fromRGB" in visual_theme, f"missing visual accent: {location_id}"

code_block = re.search(
    r"SchoolVisualTheme\.LOCATION_CODES\s*=\s*table\.freeze\(\{(.*?)\}\)",
    visual_theme,
    re.DOTALL,
)
assert code_block, "location wayfinding codes missing"
location_codes = dict(re.findall(r'([a-z]+)\s*=\s*"([A-Z]+)"', code_block.group(1)))
assert set(location_codes) == theme_location_ids, (
    "wayfinding codes must cover current and planned canonical destinations exactly"
)
assert len(set(location_codes.values())) == len(location_codes), "wayfinding codes must be unique"
assert all(re.fullmatch(r"[A-Z]{3}", code) for code in location_codes.values()), (
    "wayfinding codes must be compact three-letter uppercase labels"
)
type_block = re.search(
    r"SchoolVisualTheme\.LOCATION_TYPES\s*=\s*table\.freeze\(\{(.*?)\}\)",
    visual_theme,
    re.DOTALL,
)
assert type_block, "semantic room types missing"
location_types = dict(
    re.findall(r'([a-z]+)\s*=\s*"([A-Z ]+)"', type_block.group(1))
)
assert set(location_types) == theme_location_ids, (
    "semantic room types must cover the canonical destinations exactly"
)
assert all(re.fullmatch(r"[A-Z]+(?: [A-Z]+)?", label) for label in location_types.values()), (
    "semantic room types must remain compact uppercase labels"
)
assert all(len(label) <= 14 for label in location_types.values()), (
    "semantic room types must fit one phone-readable sign line"
)
for classroom_id in ("math", "ela", "science"):
    assert location_types[classroom_id].endswith("CLASSROOM"), (
        f"{classroom_id} must be identifiable as a classroom without relying on color"
    )
for amenity_id in ("lobby", "cafeteria", "gym"):
    assert "CLASSROOM" not in location_types[amenity_id], (
        f"{amenity_id} must remain distinguishable from classroom destinations"
    )

code_text_size_match = re.search(r"SIGN_CODE_TEXT_SIZE\s*=\s*(\d+)", visual_theme)
assert code_text_size_match, "wayfinding code text size missing"
assert int(code_text_size_match.group(1)) >= 16, "wayfinding codes must remain readable on phone"

sign_height_match = re.search(r"SIGN_HEIGHT\s*=\s*(\d+)", visual_theme)
type_text_size_match = re.search(r"SIGN_TYPE_TEXT_SIZE\s*=\s*(\d+)", visual_theme)
main_label_layout = re.search(
    r"text\.Position = UDim2\.fromOffset\([^\n]+,\s*(\d+)\)\n"
    r"\s*text\.Size = UDim2\.new\([^\n]+,\s*0,\s*(\d+)\)",
    builder,
)
room_type_layout = re.search(
    r"roomType\.Position = UDim2\.fromOffset\(\s*"
    r"SchoolVisualTheme\.SIGN_CODE_BADGE_WIDTH \+ 16,\s*(\d+)\s*\)\s*"
    r"roomType\.Size = UDim2\.new\(\s*1,\s*"
    r"-\(SchoolVisualTheme\.SIGN_CODE_BADGE_WIDTH \+ 24\),\s*0,\s*(\d+)\s*\)",
    builder,
    re.DOTALL,
)
assert sign_height_match and type_text_size_match, "semantic sign dimensions missing"
assert main_label_layout and room_type_layout, "semantic sign layout missing"
sign_height = int(sign_height_match.group(1))
type_text_size = int(type_text_size_match.group(1))
main_y, main_height = (int(value) for value in main_label_layout.groups())
type_y, type_height = (int(value) for value in room_type_layout.groups())
assert 60 <= sign_height <= 72, "two-line sign height outside compact mobile range"
assert 12 <= type_text_size <= 16, "room type text outside readable fixed-size range"
assert main_y + main_height <= type_y, "room type line overlaps the destination name"
assert type_y + type_height <= sign_height, "room type line overflows the sign panel"
assert type_text_size <= type_height, "room type glyphs exceed their fixed line height"

pad_canvas_match = re.search(r"PAD_CODE_CANVAS_SIZE\s*=\s*(\d+)", visual_theme)
pad_text_size_match = re.search(r"PAD_CODE_TEXT_SIZE\s*=\s*(\d+)", visual_theme)
assert pad_canvas_match, "floor wayfinding canvas size missing"
assert pad_text_size_match, "floor wayfinding text size missing"
pad_canvas_size = int(pad_canvas_match.group(1))
pad_text_size = int(pad_text_size_match.group(1))
assert 128 <= pad_canvas_size <= 512, "floor wayfinding canvas outside bounded mobile range"
assert 48 <= pad_text_size <= 96, "floor wayfinding code text outside readable fixed-size range"
assert pad_text_size <= pad_canvas_size // 2, (
    "floor wayfinding code must fit its fixed canvas without scaling"
)

assert 'SIGN_BACKGROUND = Color3.fromRGB(20, 38, 67)' in visual_theme
assert 'SIGN_TEXT = Color3.fromRGB(255, 255, 255)' in visual_theme
assert 'SIGN_SECONDARY_TEXT = Color3.fromRGB(203, 219, 238)' in visual_theme
assert "SIGN_MAX_DISTANCE = 90" in visual_theme
assert "rbxassetid://" not in visual_theme.lower(), "visual theme must remain asset-ID free"


palette_colors = {
    match.group(1): tuple(int(match.group(index)) for index in range(2, 5))
    for match in re.finditer(
        r"(?:SchoolVisualTheme\.)?([A-Za-z_]+)\s*=\s*"
        r"Color3\.fromRGB\((\d+),\s*(\d+),\s*(\d+)\)",
        visual_theme,
    )
}
assert all(
    0 <= channel <= 255
    for color in palette_colors.values()
    for channel in color
), "palette channel outside sRGB range"

sign_background = palette_colors["SIGN_BACKGROUND"]
sign_text = palette_colors["SIGN_TEXT"]
sign_secondary_text = palette_colors["SIGN_SECONDARY_TEXT"]
assert sign_secondary_text != sign_text, "secondary sign copy must remain visually distinct"
text_contrast = contrast_ratio(sign_text, sign_background)
assert text_contrast >= 4.5, f"sign text contrast below 4.5:1: {text_contrast:.2f}:1"
secondary_text_contrast = contrast_ratio(sign_secondary_text, sign_background)
assert secondary_text_contrast >= 4.5, (
    f"secondary sign text contrast below 4.5:1: {secondary_text_contrast:.2f}:1"
)
badge_text_contrast = contrast_ratio(sign_text, sign_background)
assert badge_text_contrast >= 4.5, (
    f"wayfinding badge text contrast below 4.5:1: {badge_text_contrast:.2f}:1"
)

location_accents = {
    location_id: palette_colors[location_id]
    for location_id in theme_location_ids
}
assert len(set(location_accents.values())) == len(location_accents), (
    "destination accents must be unique"
)
for first_id, second_id in itertools.combinations(sorted(location_accents), 2):
    first = location_accents[first_id]
    second = location_accents[second_id]
    max_channel_delta = max(abs(a - b) for a, b in zip(first, second))
    assert max_channel_delta >= 48, (
        f"{first_id} and {second_id} accents are too similar for categorical wayfinding: "
        f"maximum channel delta {max_channel_delta}"
    )

accent_minimum_match = re.search(
    r"WAYFINDING_ACCENT_MIN_CONTRAST\s*=\s*(\d+(?:\.\d+)?)",
    visual_theme,
)
assert accent_minimum_match, "wayfinding accent contrast token missing"
accent_minimum = float(accent_minimum_match.group(1))
assert accent_minimum == 3, "wayfinding accent contrast floor must remain 3:1"

for location_id in theme_location_ids:
    accent_contrast = contrast_ratio(location_accents[location_id], sign_background)
    assert accent_contrast >= accent_minimum, (
        f"{location_id} sign outline contrast below {accent_minimum:g}:1: "
        f"{accent_contrast:.2f}:1"
    )

for location_id in theme_location_ids:
    assert f"{location_id} = table.freeze({{" in audio_theme, (
        f"missing ambience specification: {location_id}"
    )

for cue_id in ("periodBell", "classComplete", "activityComplete", "waypointConfirm"):
    assert f"{cue_id} = table.freeze({{" in audio_theme, (
        f"missing sound cue specification: {cue_id}"
    )

ambience_volumes = [
    float(value)
    for value in re.findall(r"targetVolume\s*=\s*(0\.\d+)", audio_theme)
]
assert len(ambience_volumes) == len(theme_location_ids) + 4, "unexpected audio mix token count"
assert all(0 < value <= 0.5 for value in ambience_volumes), "audio target volume outside safe mix range"

min_distances = [
    int(value)
    for value in re.findall(r"minDistance\s*=\s*(\d+)", audio_theme)
]
max_distances = [
    int(value)
    for value in re.findall(r"maxDistance\s*=\s*(\d+)", audio_theme)
]
assert len(max_distances) == len(theme_location_ids), "every ambience zone needs one max distance"
assert all(24 <= value <= 64 for value in max_distances), "ambience distance outside campus readability range"
assert len(min_distances) == len(theme_location_ids), "every ambience zone needs one minimum distance"
assert all(8 <= value <= 20 for value in min_distances), (
    "ambience minimum distance outside stable room-scale listening range"
)
assert all(
    minimum < maximum
    for minimum, maximum in zip(min_distances, max_distances)
), "every ambience inner radius must remain below its outer radius"
assert 'AMBIENCE_ROLLOFF_MODE = "InverseTapered"' in audio_theme, (
    "campus ambience needs one predictable spatial attenuation mode"
)

loop_flags = re.findall(r"looped\s*=\s*(true|false)", audio_theme)
assert loop_flags == ["true"] * len(theme_location_ids) + ["false"] * 4, (
    "campus ambience must loop while short feedback cues remain one-shot"
)

cue_durations = [
    float(value)
    for value in re.findall(r"maxDurationSeconds\s*=\s*(\d+(?:\.\d+)?)", audio_theme)
]
assert len(cue_durations) == 4, "every sound cue needs a duration ceiling"
assert all(0.25 <= value <= 3 for value in cue_durations), "sound cue duration outside short-feedback range"

cue_caption_durations = [
    float(value)
    for value in re.findall(r"captionHoldSeconds\s*=\s*(\d+(?:\.\d+)?)", audio_theme)
]
assert len(cue_caption_durations) == 4, "every feedback cue needs a caption display time"
assert all(1.5 <= value <= 4 for value in cue_caption_durations), (
    "cue caption display time outside readable phone range"
)
assert all(
    caption_duration >= cue_duration
    for caption_duration, cue_duration in zip(cue_caption_durations, cue_durations)
), "cue captions must remain visible through their paired sound"

cue_caption_block_start = audio_theme.index("SchoolAudioTheme.CUES = table.freeze({")
cue_caption_block_end = audio_theme.index(
    "function SchoolAudioTheme.getLocationAmbience",
    cue_caption_block_start,
)
cue_caption_block = audio_theme[cue_caption_block_start:cue_caption_block_end]
cue_captions = re.findall(r'caption\s*=\s*"([^"]+)"', cue_caption_block)
assert len(cue_captions) == 4, "every feedback cue needs one non-audio caption"
assert len(set(cue_captions)) == len(cue_captions), "feedback cue captions must be unique"
assert all(1 <= len(caption) <= 40 for caption in cue_captions), (
    "feedback cue captions must remain concise on phone"
)
assert all(re.fullmatch(r"[A-Za-z][A-Za-z ]+\.", caption) for caption in cue_captions), (
    "feedback cue captions must be plain sentence-style status copy"
)
assert "CUE_CAPTIONS_REQUIRED = true" in audio_theme
assert "function SchoolAudioTheme.getCueCaption(cueId)" in audio_theme
assert "return cue and cue.caption or nil" in audio_theme
assert "function SchoolAudioTheme.getCueCaptionDuration(cueId)" in audio_theme
assert "return cue and cue.captionHoldSeconds or nil" in audio_theme
assert 'token = "cue_activity_complete"' in audio_theme
assert 'caption = "Activity complete."' in audio_theme
assert "captionHoldSeconds = 2.5" in audio_theme

assert "ORIGINAL_ONLY = true" in audio_theme
assert "SAMPLE_RATE_HZ = 48000" in audio_theme
assert "PEAK_DB = -3" in audio_theme
assert "INTEGRATED_LUFS = -18" in audio_theme
mix_policy_match = re.search(
    r"SchoolAudioTheme\.MIX_POLICY\s*=\s*table\.freeze\(\{(.*?)\}\)",
    audio_theme,
    re.DOTALL,
)
assert mix_policy_match, "audio mix policy missing"
mix_policy = {
    match.group(1): float(match.group(2))
    for match in re.finditer(
        r"([A-Za-z][A-Za-z0-9]+)\s*=\s*(-?\d+(?:\.\d+)?)",
        mix_policy_match.group(1),
    )
}
assert set(mix_policy) == {
    "maxConcurrentAmbience",
    "maxConcurrentCues",
    "cueRetriggerSeconds",
    "crossfadeSeconds",
    "ambienceEnterHoldSeconds",
    "ambienceExitPaddingStuds",
    "speechDuckDb",
    "reducedSensoryVolumeMultiplier",
}, "audio mix policy keys changed"
assert mix_policy["maxConcurrentAmbience"] == 1, "only one ambience may play at once"
assert mix_policy["maxConcurrentCues"] == 2, "short cues need a strict overlap budget"
assert 0.1 <= mix_policy["cueRetriggerSeconds"] <= 0.5, (
    "cue retrigger floor must prevent chatter without delaying responsive feedback"
)
assert 0.5 <= mix_policy["crossfadeSeconds"] <= 2, "ambience crossfade outside short-transition range"
assert 0.25 <= mix_policy["ambienceEnterHoldSeconds"] <= 1, (
    "ambience entry hold must reject doorway jitter without delaying room feedback"
)
assert 2 <= mix_policy["ambienceExitPaddingStuds"] <= 8, (
    "ambience exit padding must provide bounded spatial hysteresis"
)
assert mix_policy["crossfadeSeconds"] >= mix_policy["ambienceEnterHoldSeconds"], (
    "ambience crossfade must cover the stabilized transition"
)
assert -12 <= mix_policy["speechDuckDb"] <= -3, "speech ducking outside intelligibility range"
assert 0.25 <= mix_policy["reducedSensoryVolumeMultiplier"] <= 0.75, (
    "reduced-sensory volume multiplier outside useful range"
)
reduced_sensory_multiplier = mix_policy["reducedSensoryVolumeMultiplier"]
reduced_sensory_volumes = [
    volume * reduced_sensory_multiplier
    for volume in ambience_volumes
]
assert reduced_sensory_multiplier < 1, "reduced-sensory mode must lower every sound"
assert all(
    0 < reduced < original
    for original, reduced in zip(ambience_volumes, reduced_sensory_volumes)
), "reduced-sensory mode must preserve audible but lower output"
assert max(reduced_sensory_volumes) <= 0.25, (
    "reduced-sensory output exceeds the quiet-mix ceiling"
)

cue_block_start = audio_theme.index("SchoolAudioTheme.CUES = table.freeze({")
cue_block_end = audio_theme.index(
    "function SchoolAudioTheme.getLocationAmbience",
    cue_block_start,
)
cue_block = audio_theme[cue_block_start:cue_block_end]
cue_volumes = sorted(
    (
        float(value)
        for value in re.findall(r"targetVolume\s*=\s*(0\.\d+)", cue_block)
    ),
    reverse=True,
)
assert len(cue_volumes) == 4, "unexpected sound cue volume count"
max_concurrent_cues = int(mix_policy["maxConcurrentCues"])
assert sum(cue_volumes[:max_concurrent_cues]) <= 0.90, (
    "worst-case allowed cue overlap exceeds the configured accessibility headroom"
)

cue_entries = {
    match.group(1): match.group(2)
    for match in re.finditer(
        r"^    (periodBell|classComplete|activityComplete|waypointConfirm) = table\.freeze\(\{(.*?)^    \}\),",
        cue_block,
        re.DOTALL | re.MULTILINE,
    )
}
assert set(cue_entries) == {"periodBell", "classComplete", "activityComplete", "waypointConfirm"}, (
    "priority QA must cover every feedback cue"
)
cue_priorities = {}
for cue_id, cue_body in cue_entries.items():
    priority_match = re.search(r"priority\s*=\s*(\d+)", cue_body)
    assert priority_match, f"{cue_id} is missing overload priority"
    cue_priorities[cue_id] = int(priority_match.group(1))

assert len(set(cue_priorities.values())) == len(cue_priorities), (
    "cue overload priorities must form a deterministic total order"
)
assert all(priority > 0 for priority in cue_priorities.values()), (
    "cue overload priorities must remain positive"
)
admitted_cues = sorted(
    cue_priorities,
    key=lambda cue_id: (-cue_priorities[cue_id], cue_id),
)[:max_concurrent_cues]
assert admitted_cues == ["periodBell", "classComplete"], (
    "four-cue overload must preserve the school bell and class completion feedback"
)
assert "waypointConfirm" not in admitted_cues, (
    "low-priority waypoint feedback must yield when the two-cue budget is full"
)
assert "function SchoolAudioTheme.getCuePriority(cueId)" in audio_theme
assert "return cue and cue.priority or nil" in audio_theme

assert "SoundId" not in audio_theme, "audio specification must not embed asset IDs"
assert "rbxassetid://" not in audio_theme.lower(), "audio specification must remain asset-ID free"


audio_tokens = re.findall(r'token\s*=\s*"([^"]+)"', audio_theme)
assert len(audio_tokens) == len(theme_location_ids) + 4, "unexpected audio identity token count"
assert len(set(audio_tokens)) == len(audio_tokens), "audio identity tokens must be unique"
assert all(
    re.fullmatch(r"[a-z][a-z0-9_]+", token)
    for token in audio_tokens
), "audio identity tokens must use lowercase semantic names"
assert len([token for token in audio_tokens if token.startswith("ambience_")]) == len(theme_location_ids), (
    "every location must keep an ambience namespace token"
)
assert len([token for token in audio_tokens if token.startswith("cue_")]) == 4, (
    "every feedback sound must keep a cue namespace token"
)
assert 'token = "ambience_gym_activity"' in audio_theme, (
    "planned gym must keep its original semantic ambience token"
)

periods = re.findall(
    r'{ id = "([^"]+)", durationSeconds = (\d+), locationId = "([^"]+)" }',
    clock,
)
assert periods, "school clock periods missing"
period_ids = [period_id for period_id, _, _ in periods]
assert len(period_ids) == len(set(period_ids)), "duplicate period id"
assert all(int(duration) > 0 for _, duration, _ in periods), "period duration must be positive"
assert all(location_id in location_ids for _, _, location_id in periods), "period references unknown location"

service_files = list((ROOT / "src").rglob("SchoolClockService.server.lua"))
assert len(service_files) == 1, f"expected exactly one SchoolClock service, found {len(service_files)}"
assert 'SchoolClock.getState' in service
assert 'runtime:SetAttribute("PeriodId"' in service

assert "SetAttribute(" not in state, "FoundationState must be read-only"
assert "function FoundationState.getSnapshot()" in state

for text in (config, clock, state, visual_theme, audio_theme, builder, service):
    for forbidden in ("BrookhavenWorldRuntime", "BrookhavenWorldBaseline", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

print("canonical foundation static guard: PASS")
