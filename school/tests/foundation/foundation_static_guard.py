#!/usr/bin/env python3
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
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

for location_id in location_ids:
    assert re.search(
        rf"\\b{re.escape(location_id)}\\s*=\\s*table\\.freeze\\(\\{{",
        audio_theme,
    ), f"missing ambience specification: {location_id}"

for cue_id in ("periodBell", "classComplete", "waypointConfirm"):
    assert re.search(
        rf"\\b{cue_id}\\s*=\\s*table\\.freeze\\(\\{{",
        audio_theme,
    ), f"missing sound cue specification: {cue_id}"

ambience_volumes = [
    float(value)
    for value in re.findall(r"targetVolume\\s*=\\s*(0\\.\\d+)", audio_theme)
]
assert len(ambience_volumes) == len(location_ids) + 3, "unexpected audio mix token count"
assert all(0 < value <= 0.5 for value in ambience_volumes), "audio target volume outside safe mix range"

max_distances = [
    int(value)
    for value in re.findall(r"maxDistance\\s*=\\s*(\\d+)", audio_theme)
]
assert len(max_distances) == len(location_ids), "every ambience zone needs one max distance"
assert all(24 <= value <= 64 for value in max_distances), "ambience distance outside campus readability range"

cue_durations = [
    float(value)
    for value in re.findall(r"maxDurationSeconds\\s*=\\s*(\\d+(?:\\.\\d+)?)", audio_theme)
]
assert len(cue_durations) == 3, "every sound cue needs a duration ceiling"
assert all(0.25 <= value <= 3 for value in cue_durations), "sound cue duration outside short-feedback range"

assert "ORIGINAL_ONLY = true" in audio_theme
assert "SAMPLE_RATE_HZ = 48000" in audio_theme
assert "PEAK_DB = -3" in audio_theme
assert "INTEGRATED_LUFS = -18" in audio_theme
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
