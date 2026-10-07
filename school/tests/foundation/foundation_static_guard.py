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
route_layout = (ROOT / "src/ReplicatedStorage/HighSchool/CampusRouteLayout.lua").read_text(encoding="utf-8")
visual_theme = (ROOT / "src/ReplicatedStorage/HighSchool/SchoolVisualTheme.lua").read_text(encoding="utf-8")
audio_theme = (ROOT / "src/ReplicatedStorage/HighSchool/SchoolAudioTheme.lua").read_text(encoding="utf-8")
builder = (ROOT / "src/ServerScriptService/HighSchool/CampusBuilder.server.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/SchoolClockService.server.lua").read_text(encoding="utf-8")

assert 'CAMPUS_NAME = "PipHighCampus"' in config
assert 'SPAWN_NAME = "MainSpawn"' in config
assert 'SPAWN_POSITION = Vector3.new(48, 1, 48)' in config
assert 'spawn.Position = FoundationConfig.SPAWN_POSITION' in builder
assert 'spawn.CanCollide = false' in builder
assert 'spawn.CanTouch = false' in builder
assert 'spawn:SetAttribute("LocationId", "entrance")' in builder
assert 'spawn:SetAttribute("DisplayName", "Front Entrance")' in builder

spawn_match = re.search(
    r"SPAWN_POSITION = Vector3\.new\((-?[0-9.]+),\s*(-?[0-9.]+),\s*(-?[0-9.]+)\)",
    config,
)
assert spawn_match, "canonical entrance position missing"
spawn_x, _, spawn_z = (float(value) for value in spawn_match.groups())
assert abs(spawn_x) <= 50 and abs(spawn_z) <= 50, "entrance must stay inside the campus floor"
assert abs(spawn_x) >= 12 and abs(spawn_z) >= 12, (
    "entrance must stay off the lobby's cardinal destination spokes"
)
assert 'marker:SetAttribute("LocationId", location.id)' in builder
assert 'assert(not seen[location.id]' in builder
assert 'wayfinding.Name = "Wayfinding"' in builder
assert 'pad.Name = location.id .. "Pad"' in builder
assert 'pad.Color = accent' in builder
assert 'pad.Transparency = SchoolVisualTheme.PAD_TRANSPARENCY' in builder
assert 'sign.Name = "LocationLabel"' in builder
assert 'sign.MaxDistance = SchoolVisualTheme.SIGN_MAX_DISTANCE' in builder
assert 'panel.BackgroundColor3 = SchoolVisualTheme.SIGN_BACKGROUND' in builder
assert 'outline.Color = accent' in builder
assert 'text.Font = Enum.Font.GothamBold' in builder
assert 'text.Text = location.name' in builder
assert 'text.TextColor3 = SchoolVisualTheme.SIGN_TEXT' in builder
assert 'textConstraint.MinTextSize = SchoolVisualTheme.SIGN_MIN_TEXT_SIZE' in builder
assert 'textConstraint.MaxTextSize = SchoolVisualTheme.SIGN_MAX_TEXT_SIZE' in builder

location_ids = set(re.findall(r'id = "([^"]+)", name = ', config))
assert location_ids, "location registry must not be empty"
assert len(location_ids) == 5, "unexpected location count"
for location_id in location_ids:
    assert f"{location_id} = Color3.fromRGB" in visual_theme, f"missing visual accent: {location_id}"

assert 'SIGN_BACKGROUND = Color3.fromRGB(20, 38, 67)' in visual_theme
assert 'SIGN_TEXT = Color3.fromRGB(255, 255, 255)' in visual_theme
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
text_contrast = contrast_ratio(sign_text, sign_background)
assert text_contrast >= 4.5, f"sign text contrast below 4.5:1: {text_contrast:.2f}:1"

location_accents = {
    location_id: palette_colors[location_id]
    for location_id in location_ids
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

for location_id in location_ids:
    accent_contrast = contrast_ratio(location_accents[location_id], sign_background)
    assert accent_contrast >= 3.0, (
        f"{location_id} sign outline contrast below 3:1: "
        f"{accent_contrast:.2f}:1"
    )

route_segments = re.findall(
    r'{ id = "([^"]+)", fromId = "([^"]+)", toId = "([^"]+)" }',
    route_layout,
)
assert route_segments, "campus route segments missing"
route_ids = [route_id for route_id, _, _ in route_segments]
assert len(route_ids) == len(set(route_ids)), "duplicate campus route id"
known_route_nodes = location_ids | {"entrance"}
assert all(
    from_id in known_route_nodes and to_id in known_route_nodes
    for _, from_id, to_id in route_segments
), "campus route references unknown node"
assert ("EntranceToLobby", "entrance", "lobby") in route_segments, (
    "front entrance must have a direct lobby route"
)
destination_routes = [
    segment for segment in route_segments if segment[1] == "lobby"
]
assert {to_id for _, _, to_id in destination_routes} == location_ids - {"lobby"}, (
    "every non-lobby destination must have one direct lobby route"
)
assert len(route_segments) == len(location_ids), (
    "route network must contain one entrance link and one spoke per non-lobby destination"
)

route_width_match = re.search(r"ROUTE_WIDTH = ([0-9.]+)", route_layout)
assert route_width_match and float(route_width_match.group(1)) >= 10, (
    "campus routes must remain at least 10 studs wide"
)
assert 'routes.Name = "Routes"' in builder
assert 'entrance = table.freeze({' in builder
assert 'route.CanCollide = false' in builder
assert 'route.CanTouch = false' in builder
assert 'route.CFrame = CFrame.lookAt' in builder
assert 'route:SetAttribute("FromLocationId", segment.fromId)' in builder
assert 'route:SetAttribute("ToLocationId", segment.toId)' in builder
assert 'campus:SetAttribute("RouteCount", #CampusRouteLayout.SEGMENTS)' in builder
for location_id in location_ids:
    assert f"{location_id} = table.freeze({{" in audio_theme, (
        f"missing ambience specification: {location_id}"
    )

for cue_id in ("periodBell", "classComplete", "waypointConfirm"):
    assert f"{cue_id} = table.freeze({{" in audio_theme, (
        f"missing sound cue specification: {cue_id}"
    )

ambience_volumes = [
    float(value)
    for value in re.findall(r"targetVolume\s*=\s*(0\.\d+)", audio_theme)
]
assert len(ambience_volumes) == len(location_ids) + 3, "unexpected audio mix token count"
assert all(0 < value <= 0.5 for value in ambience_volumes), "audio target volume outside safe mix range"

max_distances = [
    int(value)
    for value in re.findall(r"maxDistance\s*=\s*(\d+)", audio_theme)
]
assert len(max_distances) == len(location_ids), "every ambience zone needs one max distance"
assert all(24 <= value <= 64 for value in max_distances), "ambience distance outside campus readability range"

cue_durations = [
    float(value)
    for value in re.findall(r"maxDurationSeconds\s*=\s*(\d+(?:\.\d+)?)", audio_theme)
]
assert len(cue_durations) == 3, "every sound cue needs a duration ceiling"
assert all(0.25 <= value <= 3 for value in cue_durations), "sound cue duration outside short-feedback range"

assert "ORIGINAL_ONLY = true" in audio_theme
assert "SAMPLE_RATE_HZ = 48000" in audio_theme
assert "PEAK_DB = -3" in audio_theme
assert "INTEGRATED_LUFS = -18" in audio_theme
assert "SoundId" not in audio_theme, "audio specification must not embed asset IDs"
assert "rbxassetid://" not in audio_theme.lower(), "audio specification must remain asset-ID free"


audio_tokens = re.findall(r'token\s*=\s*"([^"]+)"', audio_theme)
assert len(audio_tokens) == len(location_ids) + 3, "unexpected audio identity token count"
assert len(set(audio_tokens)) == len(audio_tokens), "audio identity tokens must be unique"
assert all(
    re.fullmatch(r"[a-z][a-z0-9_]+", token)
    for token in audio_tokens
), "audio identity tokens must use lowercase semantic names"
assert len([token for token in audio_tokens if token.startswith("ambience_")]) == len(location_ids), (
    "every location must keep an ambience namespace token"
)
assert len([token for token in audio_tokens if token.startswith("cue_")]) == 3, (
    "every feedback sound must keep a cue namespace token"
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

for text in (config, clock, state, route_layout, visual_theme, audio_theme, builder, service):
    for forbidden in ("BrookhavenWorldRuntime", "BrookhavenWorldBaseline", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

print("canonical foundation static guard: PASS")
