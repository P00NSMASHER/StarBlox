# Step 2 — Brookhaven / StarBlox parity inventory

Status: **source indexed; current-live and same-device client parity unverified**. This is an inventory and a set of test requirements, not a parity certification. No world, menu, gameplay, school, or published place was modified by this step.

## Frozen source identity

- Legacy `.rbxl`: `IIIStatusIII/Roblox-Uncopylocked-Games/Brookhaven.rbxl` at `d92b5bf18bec7866356b154b56ffb525e137bd34`, SHA-256 `ddc2248663770e968dfe2b27b97b577c0c12fd93177305b884bed9c929923217`.
- Smaller original serialized world: SHA-256 `e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694`, 4,936 entries. This is not the full legacy `.rbxl` and must not be mistaken for a current-live export.
- Current private StarBlox release: place `17602626136`, version 28, based on the sanitized legacy source. Its release receipt explicitly says `current2026CertificationSatisfied: false` and `exactCurrentParityClaimAllowed: false`.

## Source-indexed items

`STEP2_PARITY_SOURCE_LEDGER.csv` gives an individually numbered, testable row for every item exposed by the checked-in legacy extraction receipts: **5,474 records**. `STEP2_PARITY_SOURCE_LEDGER_META.json` records counts and completion limits. These include 10 Workspace roots, 1,158 lot models, 69 vehicle models, 1,543 UI candidates, 12 house chooser buttons, 19 vehicle templates, 50 unique tool entries, and 2,613 name-matched candidates across doors, garages, houses, lights, lots, roads, tools, and vehicles. Rows overlap; they are not 5,474 unique assets.

Underlying source receipts: `LEGACY_BROOKHAVEN_SOURCE_INVENTORY.json`, `LEGACY_BROOKHAVEN_CATALOG_DISCOVERY.json`, `LEGACY_BROOKHAVEN_CATALOG_BASELINE.json`, `LEGACY_BROOKHAVEN_PROFILE.json`, `LEGACY_BROOKHAVEN_BINDING_MANIFEST.json`, and `LEGACY_BROOKHAVEN_GEOMETRY_BREADTH_GATE.json`.

The full legacy source profile reports 24,349 Workspace instances, 14,459 geometry items, 890 decals, 473 textures, 3,065 MeshParts, 319 Sounds, four Animations, 18 SpawnLocations, 399 Seats, 12 VehicleSeats, and 156 script/remote instances. The sanitized development geometry retains all 14,459 geometry items, but scripts, remotes, and interactive detectors were removed and interactions reimplemented separately. Structural coverage therefore does **not** establish visual, audio, or behavior parity.

## Parity requirements and evidence status

Each scenario below is a pass/fail requirement. A source asset existing or a button rendering is insufficient. `U` means unverified against a same-device reference client recording.

| ID | Area | Required result | Current evidence |
| --- | --- | --- | --- |
| P2-01 | Spawn/town layout | Fresh and returning players spawn at the reference town-center position and facing; roads and landmarks line up with the pinned source. | Legacy spawn binding and geometry receipt; client U. |
| P2-02 | Every map area | Each source area has a named route, entrance, exit, bounds, collision and camera check; no holes or inaccessible regions. | Workspace/model source index; complete named-area map U. |
| P2-03 | Every building/interior | Exterior and interior render with correct meshes, decals, textures, lighting and furniture; entry and exit work. | Lot/model index; interior-by-interior client U. |
| P2-04 | Houses/plots | Vacant plot -> claim -> select house -> place -> enter -> visit -> leave -> change/remove works, with ownership and errors validated. | Seven plotted homes and 12 chooser buttons; client U. |
| P2-05 | Vehicles | Each of 19 legacy templates has a tile, correct 3D preview, spawn, seat, drive, camera and despawn flow. | Legacy source/catalog receipt; client U. |
| P2-06 | Tools/props | Each of 50 unique source entries equips, performs its intended action and unequips; unavailable items explain why. | Legacy catalog; client U. |
| P2-07 | Doors/garages/lights | Every bound target activates from valid range, changes world state and replicates to another player. | 39 doors, five garages, eight lights bound in legacy completion; client U. |
| P2-08 | HUD and right rail | Native Roblox controls, Quick Chat, Home Cams/time, Family and five main actions occupy their reference locations without overlap. | `BROOKHAVEN_EXACT_PARITY.md` and StarBlox recording; comparison U. |
| P2-09 | Every menu/button | Each indexed UI control has matching thumbnail/icon, text, size, visibility rules, navigation, action and close/back behavior. | 1,543 legacy UI candidates; image properties and current-live comparison U. |
| P2-10 | Avatar/animations | Body, outfit, accessories, save/apply/reset and every reference animation visibly affect the avatar and survive menu transitions. | Four animations counted in legacy source; client U. |
| P2-11 | Home Cams/Family/Quick Chat | Cycling, invites/roles and chat actions produce the expected player-visible outcome. | StarBlox modules and historical parity contract; client U. |
| P2-12 | Movement/camera | Walking, jumping, seats, vehicles, interiors, respawn and teleport keep a usable third-person camera with no clipping. | StarBlox recording shows suspected occlusion; root cause U. |
| P2-13 | School exception | Schedule, destination, class, attendance, question feedback and rewards appear contextually inside the school without permanently obscuring town play. | StarBlox recording visibly shows overlapping school UI; fail for visual presentation, location/flow U. |
| P2-14 | Audio/effects | Each source sound/effect/animation has a named location, trigger, audible/visible outcome and fallback. | Aggregate counts only; itemized paths and client U. |
| P2-15 | Responsive/performance | Repeat all flows on the same phone, tablet and computer models as the reference at matching graphics settings; record frame rate, loading and input latency. | Paired phone-style recordings reviewed; hardware/settings, tablet/computer and measured performance U. |

## Recording observations

The new paired uploads show Brookhaven reference gameplay (83.67 seconds) and StarBlox playtest gameplay (69.63 seconds). See `STEP2_RECORDING_DEFECTS.md` for timestamped observations and acceptance tests. They provide partial phone-flow comparison, not complete same-device certification: exact hardware, graphics settings, build versions and complete catalog coverage remain unverified. The StarBlox file stores sideways landscape content; its stored portrait dimensions are not evidence of a portrait-layout bug.

The 13.83-second `ScreenRecording_09-27-2026 06-00-38_1.mp4` shows a house carousel and school prompt competing for space, two translucent information bands at the top, a large central `JOIN CLASS` card, a mostly gray/occluded scene after travel, and avatar customization opening while the school card remains. This establishes presentation defects; it does **not** prove why the gray scene occurs or prove that house purchase/travel completes.

## Evidence needed to close Step 2

1. Preserve the user's chosen pinned legacy source as the implementation baseline. Record differences between that source and the newly supplied live reference as explicit scope gaps; do not imply that the legacy file contains every modern asset. Exact current-live certification additionally needs version-provenanced reference evidence; the current-source gate remains awaiting a candidate.
2. Extend the supplied paired recordings to complete fresh-join, house, vehicle, avatar, tools, building, and school journeys on matching phone, tablet and computer configurations. Confirm hardware and graphics settings. The cloud browser cannot run the native Roblox client or capture these journeys.
3. An uncapped DOM inventory of the pinned binary, including every instance path, mesh/decal/texture/image/audio/animation reference and building/interior grouping. Existing name-match categories stop at 500 rows and the UI extraction omits image properties. The checked-in Rust reader is available in source but Rust is not installed in this workspace; no completeness claim is made from the capped receipts.
4. A mapping from each source ledger item and scenario to the current StarBlox runtime instance or control, with a side-by-side result: pass, fail, intentionally changed for school, or not present.

Until these four evidence items are closed, **Step 2 is not complete** and steps 3–9 must not be represented as exact-parity work against the current Brookhaven client. The ledger is a reproducible starting point for those comparisons, not a substitute for them.
