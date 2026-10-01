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
builder = (ROOT / "src/ServerScriptService/HighSchool/CampusBuilder.server.lua").read_text(encoding="utf-8")
service = (ROOT / "src/ServerScriptService/HighSchool/SchoolClockService.server.lua").read_text(encoding="utf-8")

assert 'CAMPUS_NAME = "PipHighCampus"' in config
assert 'SPAWN_NAME = "MainSpawn"' in config
assert 'marker:SetAttribute("LocationId", location.id)' in builder
assert 'assert(not seen[location.id]' in builder
assert 'wayfinding.Name = "Wayfinding"' in builder
assert 'pad.Name = location.id .. "Pad"' in builder
assert 'pad.Transparency = 0.35' in builder
assert 'sign.Name = "LocationLabel"' in builder
assert 'text.Text = location.name' in builder

location_ids = set(re.findall(r'id = "([^"]+)", name = ', config))
assert location_ids, "location registry must not be empty"
assert len(location_ids) == 5, "unexpected location count"

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

for text in (config, clock, state, builder, service):
    for forbidden in ("BrookhavenWorldRuntime", "BrookhavenWorldBaseline", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

print("canonical foundation static guard: PASS")
