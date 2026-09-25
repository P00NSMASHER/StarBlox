# Goldmine Audit — Step 8: GamerKreep Robbing Simulator

## Source identity

- Primary source: Roblox Developer Forum release by GamerKreep, "Mass Uncopylocked | 35 free games and projects"
- Direct creator-provided place file
- File byte length: 2,531,904
- SHA-256: f413653c19d124517c4dc5409b635ae58122d4e1a63255e9aa7608fd0ba9f920
- Source type: creator-released Roblox place
- Permission: creator states the released projects may be used for modding, scrap parts, or other purposes.
- Creator caveat: older projects may contain broken or unsafe third-party scripts, so this source remains quarantine-only pending security review.

## Static-ingestion result

StarBlox cataloged the place without executing imported Luau.

- instances: 123,042
- scripts: 1,981
- server Script instances: 1,899
- server Scripts with recoverable source: 1,898 / 1,899
- LocalScripts with source: 60 / 60
- ModuleScripts with source: 22 / 22
- remotes: 7
- asset references: 210,001
- models: 7,256
- vehicle-classified rows: 70
- house-classified rows: 348
- UI trees: 4,482
- animations: 64
- sounds: 1,052
- aggregate static risk flag: unbounded-loop-review
- scripts carrying that flag: 49
- no require(asset-id) calls detected by the cataloger
- one legacy HttpService user detected

Static inspection is encouraging but is not a security proof.

## Verified StarBlox-relevant systems

### Server authority
Recoverable server source includes ServerManager, HomeCore, PlaceablesControl, GameEvents, Datastore, Leaderboard/Levels, PlayerSetup, Collect, TimeCycle, CloudCycle and CollisionCore.

This sharply distinguishes it from the public Brookhaven, Bloxburg, RoCitizens and Jailbreak snapshots, whose server authority was largely absent.

### Housing and placeables
Verified structures include HomeCore, LocalHomeCore, ManageProperty, PlaceItem, RemoveItem, a home store, placement UI, color customization, buyable homes and property purchase logic.

Catalog counts:
- housing-capability instances: 1,958
- placement-capability instances: 115

### NPC and response AI
The source contains scripted civilians, officers, security responders, vehicle responders and PathfindingService usage. This is the strongest directly inspectable city-NPC response donor in the audit so far.

### World-event / mission substrate
The source contains many location-triggered activities, collectibles, alerts, timed events, NPC responses, shops and property events. Those mechanics can be repurposed into age-appropriate StarBlox learning missions without carrying over the source game's theme.

### Economy and progression surface
Verified systems include Datastore, Leaderboard/Levels, collectibles, shops, home purchasing, placeable value loops and property-management contracts.

These should be adapted behind StarBlox's learning-powered Star Coin/XP authority rather than copied as the final economy.

### Persistence
A recoverable DataStoreService implementation exists. It is useful as source-state evidence but should be migrated into StarBlox ProfileStore rather than reused unchanged.

### Vehicles
The source includes motorcycle controls, service vehicles, dealership purchase flows and 335 vehicle-capability instances. Useful, though Jailbreak remains the stronger dedicated vehicle specialist.

### Networking
Game-specific replicated contracts include AlertPlayer, CollectPrinter, CommitActions, ManageProperty, PlaceItem and RemoveItem. Unlike most archive candidates, corresponding server-side source is present.

## Requirement scores

| ID | Requirement | Level | Weighted contribution |
|---|---|---:|---:|
| R1 | Open-world map / environment | 3 | 16.00 |
| R2 | Buildings + usable interiors | 3 | 10.00 |
| R3 | World streaming / LOD / scale performance | 0 | 0.00 |
| R4 | Vehicle runtime | 2 | 6.00 |
| R5 | Housing + furniture/building | 3 | 10.00 |
| R6 | NPCs / ambient population / traffic | 3 | 7.00 |
| R7 | Roleplay jobs / shops / locations | 2 | 4.00 |
| R8 | World interaction / quest hooks | 3 | 6.00 |
| R9 | Economy/progression integration surface | 3 | 7.00 |
| R10 | Durable world/player persistence | 2 | 4.00 |
| R11 | Multiplayer/networking fit | 2 | 3.33 |
| R12 | Avatar / UI / phone / customization | 2 | 2.67 |
| R13 | Mobile + performance readiness | 1 | 1.00 |
| R14 | Automated testing / build / repair leverage | 0 | 0.00 |
| R15 | Provenance + integration friction | 2 | 1.33 |

**Weighted workload-elimination score: 78.33 / 100**

## Reuse classification

### Highest-value donor areas
- server-side world-event framework
- civilian / responder AI patterns
- housing and placeables
- property management
- economy/event choreography
- shops and interactive locations
- world/interior content
- vehicle patterns
- server/client contract examples

### Reusable after refactor
- datastore state model into ProfileStore
- property/place-item contracts into typed StarBlox networking
- NPC response/pathfinding into StarBlox NPC services
- location-event triggers into age-appropriate learning missions
- legacy reward loops into learning-powered Star Coin/XP authority

### Exclude unless separately justified
- age-inappropriate thematic systems
- obsolete or redundant legacy systems
- any script that fails security review

## Critical finding

**Robbing Simulator is the highest raw technical workload-elimination candidate through Step 8 at 78.33 / 100.**

It narrowly exceeds RoCitizens because the creator-released place preserves almost the complete server implementation instead of only client content and remote contracts.

Its strongest StarBlox donor stack is:

**full server source + NPC response AI + housing/placeables + interactive city events + economy/persistence patterns.**

The source remains quarantine-only until security review because its creator explicitly warned that some older released projects may contain broken or unsafe third-party scripts.
