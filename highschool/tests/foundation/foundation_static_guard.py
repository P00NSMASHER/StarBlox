#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
project = json.loads((ROOT / "default.project.json").read_text(encoding="utf-8"))
project_text = json.dumps(project).lower()

for forbidden in ("pipsquest", "maze", "brookhaven", "bhw_"):
    assert forbidden not in project_text, f"forbidden mapped dependency: {forbidden}"

mapped_paths = [
    project["tree"]["ReplicatedStorage"]["HighSchool"]["$path"],
    project["tree"]["ServerScriptService"]["HighSchool"]["$path"],
]
for rel in mapped_paths:
    assert (ROOT / rel).exists(), f"missing mapped path: {rel}"

config = (ROOT / "src/ReplicatedStorage/HighSchool/FoundationConfig.lua").read_text(encoding="utf-8")
builder = (ROOT / "src/ServerScriptService/HighSchool/CampusBuilder.server.lua").read_text(encoding="utf-8")

assert 'CAMPUS_NAME = "PipHighCampus"' in config
assert 'SPAWN_NAME = "MainSpawn"' in config
assert 'marker:SetAttribute("LocationId", location.id)' in builder
assert 'assert(not seen[location.id]' in builder

for forbidden in ("BrookhavenWorldRuntime", "BrookhavenWorldBaseline", "BHW_", "PipsQuest"):
    assert forbidden not in config
    assert forbidden not in builder

print("foundation static guard: PASS")
