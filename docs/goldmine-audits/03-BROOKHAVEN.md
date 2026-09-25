# Goldmine Audit — Step 3: Brookhaven.rbxl public candidate

## Source identity

- Source repository: IIIStatusIII/Roblox-Uncopylocked-Games
- File: Brookhaven.rbxl
- Git blob SHA: c0f49a326ab670ffe6bd8218e5aff680eb5df863
- File byte length: 1,276,795
- StarBlox ingestion SHA-256: ddc2248663770e968dfe2b27b97b577c0c12fd93177305b884bed9c929923217
- Source type: binary Roblox place snapshot
- Archive license: none asserted
- Archive README says files came from YouTube, Roblox, Discord and other sources and are not owned by the archive maintainer.
- Project-specific rights context: the StarBlox owner has stated commercial/development rights for Brookhaven material. That statement is treated as project context, but this public snapshot has not been independently authenticated as a complete/current authorized Brookhaven production source.

## Static-ingestion result

The StarBlox safe catalog completed without executing imported Luau.

- instances: 32,157
- script instances: 382
- non-empty recoverable script sources: 196
- server Script instances: 187
- non-empty server Script sources: 1, and that one is a README helper rather than gameplay authority
- remotes: 62
- asset references: 38,708
- models: 3,045
- vehicle-classified inventory rows: 625
- house-classified inventory rows: 375
- UI trees: 694
- animations: 219
- sounds: 488
- catalog risk flags: runtime-introspection, unbounded-loop-review

This means the place is a rich world/client/system snapshot, but not an exact functional server-source copy.

## Verified implementation/system evidence

Static evidence includes:

- house state such as HouseBuilt, HouseNumber, HouseOwn and PlayerHouseStructure;
- real lot/house trees under Workspace/001_Lots/.../HousePickedByPlayer/HouseModel;
- HouseControl and motel-house-control UI, including recoverable LocalHouseControl scripts;
- housing remotes including GettingHouse, PlayerHouseChoice, PlayersHouse, RPHouseEvent and RPHouseEventColor;
- a large 003_CarBackup tree, CarClient implementations, Car remote, PlayersCar, NoMotorVehicles, Plane and helicopter controls;
- job state and world job-giver structures plus Jobs remote;
- avatar-editor catalogs and UpdateAvatar / AvatarEditorMessage / HairColor / Clothes remotes;
- extensive roleplay/UI/audio/animation/world content;
- mobile-related networking marker plus UserInputService / ContextActionService use in recoverable client code.

The largest recoverable StarBlox-relevant client script is PlayerHandler at 72,318 bytes / 1,699 lines and spans housing, economy, vehicles, NPCs, quests, social systems, camera, networking and world behavior. It is review-required because of an unbounded-loop flag.

## Requirement scores

| ID | Requirement | Level | Weighted contribution | Evidence summary |
|---|---|---:|---:|---|
| R1 | Open-world map / environment | 3 | 16.00 | Large physical town/world and location content are directly present. |
| R2 | Buildings + usable interiors | 3 | 10.00 | Hundreds of house-classified structures plus populated house/interior object trees are present. |
| R3 | World streaming / LOD / scale performance | 0 | 0.00 | No reusable large-world streaming/LOD implementation was verified. |
| R4 | Vehicle runtime | 2 | 6.00 | Extensive vehicle models, client controllers and remote contracts exist, but authoritative server vehicle scripts are missing from the snapshot. |
| R5 | Housing + furniture/building | 2 | 6.67 | House selection/control/ownership is strong; a general furniture/build editor comparable to Bloxburg/RoCitizens was not verified. |
| R6 | NPCs / ambient population / traffic | 1 | 2.33 | NPC/follow/social structures exist, but no near-complete ambient traffic/civilian system was verified. |
| R7 | Roleplay jobs / shops / locations | 2 | 4.00 | Job state, job giver structures, shops and town locations exist; server authority is absent. |
| R8 | World interaction / quest hooks | 2 | 4.00 | Rich remotes and client world interaction logic exist, but server handlers need rebuilding behind StarBlox authority. |
| R9 | Economy/progression integration surface | 2 | 4.67 | Economy/UI/player-state surfaces are extensive and can be redirected into StarBlox progression. |
| R10 | Durable world/player persistence | 1 | 2.00 | Durable-state shapes are visible, but authoritative persistence implementation is not recoverable. |
| R11 | Multiplayer/networking fit | 1 | 1.67 | 62 remotes expose useful contracts, but authoritative server implementations are missing. |
| R12 | Avatar / UI / phone / customization | 3 | 4.00 | Very large UI surface and recoverable avatar-editor/customization systems exist. |
| R13 | Mobile + performance readiness | 2 | 2.00 | Recoverable client code uses mobile/gamepad-relevant input APIs; full modern performance readiness is not proven. |
| R14 | Automated testing / build / repair leverage | 0 | 0.00 | No source test/build framework was found in this place snapshot. |
| R15 | Provenance + integration friction | 2 | 1.33 | Exact bytes are fingerprinted and Brookhaven rights are user-stated, but this public snapshot is not independently authenticated and contains review flags. |

**Weighted workload-elimination score: 64.67 / 100**

## Reuse classification

### Direct / asset value
- town/world structure;
- houses/interiors;
- vehicle models and presentation assets;
- UI trees;
- animation/audio/effects;
- location and roleplay presentation.

### Reusable after refactor
- house-control client logic;
- vehicle client controls;
- jobs UI/flow;
- avatar editor/customization;
- remote contracts;
- client roleplay interaction logic.

### Must be rebuilt under StarBlox authority
- authoritative vehicle spawning/state;
- house/persistence authority;
- economy/reward decisions;
- job outcomes;
- networking security;
- server-side interaction validation.

## Critical finding

This file is **not an exact functional Brookhaven copy**. It is highly valuable, but the missing authoritative server script source prevents it from being used as a drop-in game.

A separately supplied authorized Brookhaven source place containing the server implementation could score materially higher than this public snapshot.
