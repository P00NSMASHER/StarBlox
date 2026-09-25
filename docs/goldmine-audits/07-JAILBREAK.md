# Goldmine Audit — Step 7: Jailbreak (Beta).rbxlx public candidate

## Source identity

- Source repository: IIIStatusIII/Roblox-Uncopylocked-Games
- File: Jailbreak (Beta).rbxlx
- Git blob SHA: 1a9a917765d79c0bda7c8c193db4f1d7a905d84a
- File byte length: 64,229,455
- StarBlox ingestion SHA-256: b0faf9f831669d2d52e07cda08a2f8737d10c6f81f94bea57765be6769451267
- Source type: Roblox XML place snapshot
- Archive license: none asserted
- Archive provenance: mixed outside sources; archive maintainer disclaims ownership.

This audit measures technical leverage only. Jailbreak-specific migration remains blocked unless separate authorization/provenance is established.

## Static-ingestion result

The StarBlox safe catalog completed without executing imported Luau.

- instances: 27,598
- script instances: 274
- remotes: 5
- asset references: 22,375
- models: 2,908
- vehicle-classified rows: 271
- house-classified rows: 131
- UI trees: 9
- animations: 2
- sounds: 112
- catalog risk flags: unbounded-loop-review

The snapshot contains 8 Script instances and **0 recoverable server Script sources**. Like Brookhaven/Bloxburg/RoCitizens, it is not a complete authoritative game source.

## Verified implementation/system evidence

### Vehicles
Jailbreak's strongest donor value is vehicle runtime.

Recoverable source includes:
- AlexChassis — 22,810 bytes / 929 lines
- Heli — 7,243 bytes / 253 lines
- AlexInput — 6,681 bytes / 255 lines
- vehicle particle/effects modules
- vehicle engine/drift audio
- large vehicle object inventory
- multiple garage structures

The garage models expose customization surfaces for:
- body colors
- wheel colors
- window colors
- wheels
- decals
- glow

This is stronger vehicle-system evidence than the other archive snapshots.

### Open world / crime-roleplay content
Verified world structures include:
- city roads and railroad
- banks
- prison/cell content
- police/criminal teleports
- cameras
- garages
- weapons
- Most Wanted presentation
- bank dynamite
- bank lasers
- robbery-related world geometry

### Client gameplay
A 114,513-byte / 3,818-line LocalScript contains broad client gameplay behavior and is review-required because of an unbounded-loop flag.

Other recoverable gameplay modules include:
- SafesData
- Region
- ragdoll
- inverse-kinematics support
- camera systems
- gamepad image/input infrastructure
- Shotgun and Sword resource structures

### Networking
Only one apparent game-specific RemoteEvent, Resource/Event, is recoverable. The other four cataloged remotes belong to Roblox follow/dialog infrastructure.

This strongly implies that the authoritative game server implementation is missing from this snapshot.

## Requirement scores

| ID | Requirement | Level | Weighted contribution | Evidence summary |
|---|---|---:|---:|---|
| R1 | Open-world map / environment | 3 | 16.00 | Large city, roads, railroad, bank/prison/garage and roleplay environment are present. |
| R2 | Buildings + usable interiors | 2 | 6.67 | Bank, prison/cells, garages and other functional structures exist, but reusable interior breadth is below housing-focused candidates. |
| R3 | World streaming / LOD / scale performance | 0 | 0.00 | No production streaming/LOD framework verified. |
| R4 | Vehicle runtime | 3 | 9.00 | AlexChassis, Heli, AlexInput, garages, customization, audio/effects and vehicle content provide a near-complete vehicle donor. |
| R5 | Housing + furniture/building | 0 | 0.00 | No player-home/furniture/build editor system verified. |
| R6 | NPCs / ambient population / traffic | 1 | 2.33 | Police/NPC presentation exists, but no scalable ambient population/traffic system verified. |
| R7 | Roleplay jobs / shops / locations | 2 | 4.00 | Police/criminal, prison, bank robbery and garage loops provide a substantial roleplay/activity framework, though narrower than RoCitizens. |
| R8 | World interaction / quest hooks | 2 | 4.00 | Dynamite, bank lasers, teleports, Most Wanted and location logic provide reusable activity hooks; authoritative handlers are missing. |
| R9 | Economy/progression integration surface | 2 | 4.67 | Safes/money/garage ownership surfaces can be redirected behind StarBlox authority. |
| R10 | Durable world/player persistence | 0 | 0.00 | No authoritative persistence implementation recovered. |
| R11 | Multiplayer/networking fit | 1 | 1.67 | The game clearly targets multiplayer, but almost all authoritative networking/server implementation is absent. |
| R12 | Avatar / UI / phone / customization | 1 | 1.33 | Vehicle customization is strong, but player-avatar/phone/social customization is not a major donor. |
| R13 | Mobile + performance readiness | 2 | 2.00 | Gamepad/input/camera modules exist and the recovered client stack addresses multiple control modes. |
| R14 | Automated testing / build / repair leverage | 0 | 0.00 | No automated test/build donor found. |
| R15 | Provenance + integration friction | 0 | 0.00 | Public archive provides no license/ownership chain. |

**Weighted workload-elimination score: 51.67 / 100**

## Unique value

Jailbreak is the strongest **vehicle + garage + crime-event** specialist in the audit so far.

Its most useful StarBlox application would not be copying its combat/crime loop wholesale. The high-leverage pieces are:
- vehicle chassis/handling patterns;
- helicopter control;
- garages and vehicle customization;
- location-based event sequencing;
- large-city driving presentation.

## Critical finding

This 64 MB snapshot is not a complete functional Jailbreak source. All 8 server Script instances lack recoverable source. The high-value material is client/shared vehicle code, physical world content and event/garage presentation.

Without separate rights/provenance, it remains a research benchmark rather than an approved migration input.
