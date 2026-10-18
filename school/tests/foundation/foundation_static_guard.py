#!/usr/bin/env python3
import json
import math
import re
from collections import deque
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
route_layout = (ROOT / "src/ReplicatedStorage/HighSchool/CampusRouteLayout.lua").read_text(encoding="utf-8")
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

for part_name in ("marker", "pad"):
    for physics_property in ("CanCollide", "CanTouch", "CanQuery"):
        assignment = f"{part_name}.{physics_property} = false"
        assert builder.count(assignment) == 1, (
            f"{part_name} must disable {physics_property} exactly once in the location pass"
        )

location_rows = re.findall(
    r'id = "([^"]+)", name = "([^"]+)", position = Vector3\.new\((-?\d+), 3, (-?\d+)\)',
    config,
)
location_positions = {
    location_id: (float(x), float(z))
    for location_id, _name, x, z in location_rows
}
location_ids = set(location_positions)
assert len(location_ids) == 6, "unexpected location count"
assert 'id = "gym", name = "Gym & Fitness", position = Vector3.new(-36, 3, -36)' in config, (
    "canonical gym destination missing"
)
assert 'campus:SetAttribute("LocationCount", #FoundationConfig.LOCATIONS)' in builder, (
    "campus builder must expose the data-driven destination count"
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

for text in (config, route_layout, clock, state, builder, service):
    for forbidden in ("BrookhavenWorldRuntime", "BrookhavenWorldBaseline", "BHW_", "PipsQuest", "MazeWorld"):
        assert forbidden not in text, f"retired runtime dependency found: {forbidden}"

assert "SchoolVisualTheme" not in route_layout + builder
assert "SchoolAudioTheme" not in route_layout + builder
assert "rbxassetid://" not in route_layout + builder.lower(), "route-only slice must not import assets"

entrance_match = re.search(
    r"ENTRANCE_POSITION = Vector3\.new\((-?\d+), 1, (-?\d+)\)",
    route_layout,
)
assert entrance_match, "entrance position missing"
entrance_position = (float(entrance_match.group(1)), float(entrance_match.group(2)))
location_positions["entrance"] = entrance_position

segments = re.findall(
    r'table\.freeze\(\{ id = "([^"]+)", fromId = "([^"]+)", toId = "([^"]+)" \}\)',
    route_layout,
)
assert len(segments) == 12, f"expected 12 route segments, found {len(segments)}"
route_ids = [route_id for route_id, _, _ in segments]
assert len(route_ids) == len(set(route_ids)), "route ids must be unique"
assert all(origin in location_positions and destination in location_positions for _, origin, destination in segments)

expected_routes = {
    "EntranceToLobby",
    "EntranceToMath",
    "EntranceToScience",
    "EntranceToCafeteria",
    "LobbyToMath",
    "LobbyToLanguageArts",
    "LobbyToScience",
    "LanguageArtsToScience",
    "LobbyToCafeteria",
    "LobbyToGym",
    "GymToCafeteria",
    "LanguageArtsToGym",
}
assert set(route_ids) == expected_routes, "route topology changed without a reviewed layout update"

adjacency = {location_id: set() for location_id in location_positions}
for _route_id, origin, destination in segments:
    adjacency[origin].add(destination)
    adjacency[destination].add(origin)

reachable = {"entrance"}
pending = deque(["entrance"])
while pending:
    current = pending.popleft()
    for neighbor in adjacency[current] - reachable:
        reachable.add(neighbor)
        pending.append(neighbor)
assert reachable == set(location_positions), "every destination must be reachable from the entrance"

for required_cycle in (
    {"lobby", "cafeteria", "gym"},
    {"lobby", "ela", "gym"},
    {"lobby", "ela", "science"},
):
    cycle_edges = sum(
        1
        for _, origin, destination in segments
        if origin in required_cycle and destination in required_cycle
    )
    assert cycle_edges == 3, f"missing alternate-path cycle for {sorted(required_cycle)}"

def layout_number(name):
    match = re.search(rf"{name} = ([0-9.]+)", route_layout)
    assert match, f"missing layout constant: {name}"
    return float(match.group(1))

floor_half_size = 55
route_width = layout_number("ROUTE_WIDTH")
entrance_pad_size = layout_number("ENTRANCE_PAD_SIZE")
entrance_edge_margin = layout_number("ENTRANCE_EDGE_MARGIN")
max_chevron_spacing = layout_number("ROUTE_CHEVRON_MAX_SPACING")
assert route_width >= 10, "routes must remain readable on phone-sized viewports"
assert entrance_pad_size >= 12, "entrance needs a clear mobile landing target"
actual_edge_margin = (
    floor_half_size - max(abs(value) for value in entrance_position) - entrance_pad_size / 2
)
assert actual_edge_margin >= entrance_edge_margin, "entrance pad extends beyond the campus floor"

route_chevron_count = 0
for route_id, origin, destination in segments:
    start = location_positions[origin]
    finish = location_positions[destination]
    distance = math.hypot(finish[0] - start[0], finish[1] - start[1])
    assert distance > 0, f"zero-length route: {route_id}"
    for endpoint in (start, finish):
        assert max(abs(value) for value in endpoint) + route_width / 2 <= floor_half_size
    chevron_count = max(1, math.ceil(distance / max_chevron_spacing) - 1)
    gap = distance / (chevron_count + 1)
    assert gap <= max_chevron_spacing + 1e-9, f"chevrons too sparse on {route_id}"
    route_chevron_count += chevron_count
assert route_chevron_count == 14, "route chevron budget changed unexpectedly"

outdoor_route_ids = set(re.findall(r"^    (EntranceTo(?:Math|Science|Cafeteria)) = true,$", route_layout, re.MULTILINE))
assert outdoor_route_ids == {
    "EntranceToMath",
    "EntranceToScience",
    "EntranceToCafeteria",
}

for marker in (
    'routes.Name = "Routes"',
    'gateways.Name = "Gateways"',
    'routeChevrons.Name = "RouteChevrons"',
    'routeJunctions.Name = "RouteJunctions"',
    'spawn.Position = CampusRouteLayout.ENTRANCE_POSITION',
    'route:SetAttribute("FromLocationId", segment.fromId)',
    'route:SetAttribute("ToLocationId", segment.toId)',
    'route:SetAttribute("RouteKind", routeKind)',
    'campus:SetAttribute("RouteCount", #CampusRouteLayout.SEGMENTS)',
    'campus:SetAttribute("RouteChevronCount", routeChevronCount)',
    'campus:SetAttribute("GatewayCount", gatewayCount)',
):
    assert marker in builder, f"campus builder missing route contract: {marker}"

for part_name in ("part", "spawn", "marker", "pad"):
    for physics_property in ("CanCollide", "CanTouch", "CanQuery"):
        assert f"{part_name}.{physics_property} = false" in builder, (
            f"{part_name} must disable {physics_property}"
        )

gateway_count = len(location_ids - {"lobby"})
passive_route_part_budget = 1 + gateway_count * 3 + 1 + len(segments) + route_chevron_count * 2
assert passive_route_part_budget == 57
assert passive_route_part_budget < 64, "route guide geometry exceeded the reviewed performance budget"

print("canonical foundation and connected route static guard: PASS")
