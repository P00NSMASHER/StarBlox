#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def rgb_assignment(source, assignment):
    match = re.search(
        rf"{re.escape(assignment)}\s*=\s*Color3\.fromRGB\((\d+),\s*(\d+),\s*(\d+)\)",
        source,
    )
    assert match, f"missing RGB assignment: {assignment}"
    return tuple(int(match.group(index)) for index in range(1, 4))


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


project_path = ROOT / "default.project.json"
project = json.loads(project_path.read_text(encoding="utf-8"))
project_text = json.dumps(project).lower()

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
assert 'SchoolVisualTheme.PAD_CODE_CANVAS_SIZE' in builder
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
    "room types must cover current and planned canonical destinations exactly"
)
assert location_types["math"] == "CLASSROOM"
assert location_types["ela"] == "CLASSROOM"
assert location_types["science"] == "LAB CLASSROOM"
assert all(re.fullmatch(r"[A-Z]+(?: [A-Z]+)?", label) for label in location_types.values()), (
    "room types must remain short, uppercase, and glance-readable"
)
assert all(len(label) <= 14 for label in location_types.values()), (
    "room types must fit the compact phone-readable sign line"
)
assert 'SIGN_TYPE_TEXT_SIZE = 13' in visual_theme
assert 'function SchoolVisualTheme.getLocationType(locationId)' in visual_theme
assert 'return SchoolVisualTheme.LOCATION_TYPES[locationId] or "DESTINATION"' in visual_theme

assert 'SIGN_BACKGROUND = Color3.fromRGB(20, 38, 67)' in visual_theme
assert 'SIGN_TEXT = Color3.fromRGB(255, 255, 255)' in visual_theme
assert 'SIGN_SECONDARY_TEXT = Color3.fromRGB(203, 219, 238)' in visual_theme
assert "SIGN_MAX_DISTANCE = 90" in visual_theme
assert "PAD_CODE_CANVAS_SIZE = 256" in visual_theme
assert "PAD_CODE_TEXT_SIZE = 72" in visual_theme
assert "rbxassetid://" not in visual_theme.lower(), "visual theme must remain asset-ID free"

sign_background = rgb_assignment(visual_theme, "SchoolVisualTheme.SIGN_BACKGROUND")
sign_text = rgb_assignment(visual_theme, "SchoolVisualTheme.SIGN_TEXT")
sign_secondary_text = rgb_assignment(visual_theme, "SchoolVisualTheme.SIGN_SECONDARY_TEXT")
assert contrast_ratio(sign_text, sign_background) >= 4.5, (
    "wayfinding badge text must meet 4.5:1 contrast"
)
assert sign_secondary_text != sign_text, "room-type copy needs a distinct visual hierarchy"
assert contrast_ratio(sign_secondary_text, sign_background) >= 4.5, (
    "room-type subtitle must meet 4.5:1 contrast"
)

accent_minimum_match = re.search(
    r"WAYFINDING_ACCENT_MIN_CONTRAST\s*=\s*(\d+(?:\.\d+)?)",
    visual_theme,
)
assert accent_minimum_match, "wayfinding accent contrast token missing"
accent_minimum = float(accent_minimum_match.group(1))
assert accent_minimum == 3, "wayfinding accent contrast floor must remain 3:1"
for location_id in theme_location_ids:
    accent = rgb_assignment(visual_theme, location_id)
    assert contrast_ratio(accent, sign_background) >= accent_minimum, (
        f"{location_id} accent outline must meet {accent_minimum:g}:1 contrast"
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

max_distances = [
    int(value)
    for value in re.findall(r"maxDistance\s*=\s*(\d+)", audio_theme)
]
assert len(max_distances) == len(theme_location_ids), "every ambience zone needs one max distance"
assert all(24 <= value <= 64 for value in max_distances), "ambience distance outside campus readability range"

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

cue_priorities = [
    int(value)
    for value in re.findall(r"priority\s*=\s*(\d+)", cue_caption_block)
]
assert cue_priorities == [4, 3, 2, 1], (
    "cue priorities must keep the bell above class, activity, and waypoint feedback"
)
assert len(set(cue_priorities)) == len(cue_priorities), "cue priorities must be deterministic"
assert all(1 <= priority <= 4 for priority in cue_priorities), "cue priority outside bounded range"
assert "function SchoolAudioTheme.getCuePriority(cueId)" in audio_theme
assert "return cue and cue.priority or nil" in audio_theme

assert 'token = "cue_activity_complete"' in audio_theme
assert 'caption = "Activity complete."' in audio_theme
assert 'captionHoldSeconds = 2.5' in audio_theme
assert 'maxDurationSeconds = 1.25' in audio_theme
assert 'token = "ambience_gym_activity"' in audio_theme
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
    "speechDuckDb",
    "reducedSensoryVolumeMultiplier",
}, "audio mix policy keys changed"
assert mix_policy["maxConcurrentAmbience"] == 1, "only one ambience may play at once"
assert mix_policy["maxConcurrentCues"] == 2, "short cues need a strict overlap budget"
assert 0.1 <= mix_policy["cueRetriggerSeconds"] <= 0.5, (
    "cue retrigger floor must prevent chatter without delaying responsive feedback"
)
assert 0.5 <= mix_policy["crossfadeSeconds"] <= 2, "ambience crossfade outside short-transition range"
assert -12 <= mix_policy["speechDuckDb"] <= -3, "speech ducking outside intelligibility range"
assert 0.25 <= mix_policy["reducedSensoryVolumeMultiplier"] <= 0.75, (
    "reduced-sensory volume multiplier outside useful range"
)
assert "SoundId" not in audio_theme, "audio specification must not embed asset IDs"
assert "rbxassetid://" not in audio_theme.lower(), "audio specification must remain asset-ID free"

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
