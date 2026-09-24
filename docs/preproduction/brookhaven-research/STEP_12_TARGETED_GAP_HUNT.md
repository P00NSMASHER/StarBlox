# Brookhaven Research — Step 12 of 12: Targeted Gap Hunt and Reprioritization

Status: **COMPLETE — 12-step research plan closed; no merge/deploy performed**

Machine-readable result:

`docs/preproduction/brookhaven-research/step-12-targeted-gap-hunt-v1.json`

## What Step 12 did

Step 12 followed the rule established in Step 11: stop broad searching and search only for gaps exposed by implementation.

The targeted gaps were:

- `GetListOfPortedVehicles` return payload;
- backing tables behind `LoadableEntries.Houses`, `Mansions`, `Motels`, and `Apartments`;
- MeshId/TextureId mappings for `031_House`, `049_House`, `052_House`, and `056_House`;
- public Brookhaven `.rbxl/.rbxlx/.rbxm/.rbxmx` payloads;
- contents behind Roblox module `110191289672557`;
- any new vehicle asset payload corresponding to the 13 resolved current vehicle names.

## Outcome

No complete new house/vehicle visual payload catalog was recovered from public GitHub.

That negative result is important and is now persisted so future discovery tasks do not repeatedly search the same dead lanes.

Specifically:

- no public GitHub hit for Brookhaven `.rbxl`, `.rbxlx`, `.rbxm`, or `.rbxmx` in the targeted code search;
- no searched house identifier produced an associated Brookhaven MeshId/TextureId table;
- no public copy of the `GetListOfPortedVehicles` return payload was found;
- no public copy of the backing `LoadableEntries.*` tables was found.

## New evidence pinned

### Independent map-module corroboration

`Cristianboy9/Requires-Roblox-Pekora@c808eb4...`

`Maps/Brookhaven.lua` contains only:

`require(110191289672557).brookhaven()`

This independently corroborates the previously discovered “Brookhaven Map” module pointer but does not expose the module contents.

### Brookhaven IslandService pointer

`Venom-DevX/Modules@2f68279...`

`Brookhaven/IslandService.lua` exists as a large obfuscated runtime module. It is classified as **runtime implementation, not an asset catalog** and remains barred from StarBlox production by the Step 4 reuse boundary.

### Opensurs refresh

The public `HOSTI1315/Opensurs` repository advanced to commit `73980f9...`, but the relevant `Brookhaven.lua.txt` Git blob remains exactly:

`a83bf37be1bf8635cc7851906ead200bee43b85b`

—the same content frozen earlier. That is useful dedupe evidence: repository-head movement did not produce a new Brookhaven asset catalog in that artifact.

## Final asset-recovery assessment

The strongest actual inputs remain:

1. the serialized Brookhaven Map Gist for geometry/material/decal scene information;
2. the Aqui runtime scan for world and subsystem taxonomy;
3. Opensurs/Vazador for property IDs, lots, vehicle names, and behavior vocabulary.

The bottleneck is no longer understanding the Brookhaven product architecture. The bottleneck is obtaining **authorized asset-level visual payloads/backing tables** and passing them through the neutral converter.

## Recommended next work after this 12-step plan

1. controlled replay onto the stabilized StarBlox branch;
2. use the project's verified-rights source channel to export the actual map/module or equivalent authorized source;
3. export the house/mansion/motel/apartment tables and current vehicle list from an authorized source environment;
4. bind every recovered payload to the Step 3 identifiers and provenance manifest;
5. replace Step 6 proxies incrementally and run technical/content/performance QA;
6. resume GitHub searching only when a new concrete identifier/path/asset ID is exposed by implementation.

## Completion state

- Steps 1–12: complete.
- Rights state: verified-for-project-use as already recorded by the project.
- Brookhaven runtime/exploit dependency in StarBlox: none.
- Live product integration: none.
- Merge: not performed.
- Deployment: not performed.
