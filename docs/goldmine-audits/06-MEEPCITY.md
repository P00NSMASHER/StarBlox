# Goldmine Audit — Step 6: Meepcity.rbxl public candidate

## Source identity

- Source repository: IIIStatusIII/Roblox-Uncopylocked-Games
- File: Meepcity.rbxl
- Git blob SHA: 9b53256bfad5423ca6858d93a0458198f9cbdccf
- File byte length: 1,389,873
- StarBlox ingestion SHA-256: 97e0df11a8ec2cec63a3f1cf6da4d3089a0c6d4d5f8c3c29b6f89e73363e2bc9
- Source type: binary Roblox place snapshot
- Archive license: none asserted
- Archive provenance: mixed outside sources; archive maintainer disclaims ownership.

This audit measures technical leverage only. MeepCity-specific migration remains blocked unless separate authorization/provenance is established.

## Static-ingestion result

The StarBlox safe catalog completed without executing imported Luau.

- instances: 24,968
- script instances: 104
- remotes: 2
- asset references: 35,456
- models: 1,103
- vehicle-classified rows: 179
- house-classified rows: 114
- UI trees: 108
- animations: 31
- sounds: 37
- catalog risk flags: unbounded-loop-review

Unlike the Brookhaven/Bloxburg/RoCitizens public snapshots, this file contains substantial recoverable server source.

### Recoverable server source

- Server — 214,989 bytes / 7,873 lines; review-required for unbounded loop
- PlayerDataStore module — 29,268 bytes / 894 lines; review-required
- Counter — 8,439 bytes
- ReturnItems — 4,770 bytes
- Transfer — 1,865 bytes
- Checker — 619 bytes

All 6 cataloged Script instances contain source.

## Verified implementation/system evidence

### Housing / estates
- EstateEdit — 57,292 source bytes / 2,134 lines
- EstateCustomize — 18,619 bytes / 696 lines
- multiple tiered EstateTemplate object trees
- EstateFurnitureObject and phone-specific furniture UI
- Shop_Furniture
- Shop_HomeImprovement
- DefaultEstate
- placement and rotation UI

### Pets / companions
- Meep — 43,141 bytes / 1,613 lines
- MeepCustomize — 18,741 bytes / 717 lines
- PetShop — 28,918 bytes / 995 lines
- PetNameMaster
- Shop_PetShop
- BabyMeep content

This is unusually relevant to StarBlox's Sprout Pup / Buddy Bond direction.

### Activities / locations
Recoverable client modules include:
- Fishing
- Gardening
- School
- Hospital
- Cafe
- IceCreamParlor
- PizzaShack
- Minigame and Minigame_Pizza
- Doors
- Interactables
- VirtualWorld

These provide a strong pattern for embedding learning quests into ordinary city activities.

### Social
- Parties — 17,082 bytes / 586 lines
- PartyObject, party ownership/title/player count
- replicated party estate/id/owner state
- BubbleChat and roleplay/social UI

### Economy / shops
- ItemShop — 49,049 bytes / 1,547 lines
- multiple shop catalogs and coin/Robux price objects
- furniture/home/pet/toy stores
- fishing/gardening worth/reward state

### Persistence / authority
- PlayerDataStore source is present
- the 214 KB server script provides recoverable server behavior
- only two generic network endpoints are used: Connection and ConnectionEvent

This old centralized networking style should not replace StarBlox's typed authority layer, but the full source materially improves migration understanding.

### Mobile/input
The place contains phone-specific estate, fishing, item-shop and other UI variants plus TouchInputService, GamepadService, ContextActionService and a recoverable VehicleController.

## Requirement scores

| ID | Requirement | Level | Weighted contribution | Evidence summary |
|---|---|---:|---:|---|
| R1 | Open-world map / environment | 2 | 10.67 | Multiple playable worlds/locations exist, but city breadth is below Brookhaven/RoCitizens/Jailbreak. |
| R2 | Buildings + usable interiors | 3 | 10.00 | Estate tiers, interior furniture and activity locations are directly present. |
| R3 | World streaming / LOD / scale performance | 0 | 0.00 | No reusable large-world streaming/LOD framework verified. |
| R4 | Vehicle runtime | 1 | 3.00 | VehicleController exists, but vehicles are not a core strength. |
| R5 | Housing + furniture/building | 3 | 10.00 | Estate editing/customization, tiered templates, furniture shops and placement UI are substantial. |
| R6 | NPCs / ambient population / traffic | 1 | 2.33 | Pets and activity NPC logic exist; no scalable ambient city-population system verified. |
| R7 | Roleplay jobs / shops / locations | 2 | 4.00 | School, hospital, cafe, pizza, ice cream, pet and other activity locations provide substantial reusable roleplay structure. |
| R8 | World interaction / quest hooks | 3 | 6.00 | Interactables plus fishing/gardening/minigames/location modules offer a rich mission substrate. |
| R9 | Economy/progression integration surface | 3 | 7.00 | ItemShop and multiple activity/shop reward surfaces map cleanly behind StarBlox authority. |
| R10 | Durable world/player persistence | 3 | 6.00 | Recoverable PlayerDataStore and server source materially eliminate persistence reverse-engineering. |
| R11 | Multiplayer/networking fit | 2 | 3.33 | Full server source is available, but old generic Connection/ConnectionEvent networking requires significant refactor. |
| R12 | Avatar / UI / phone / customization | 2 | 2.67 | Extensive UI plus Meep and estate customization, but less full-player-avatar depth than Brookhaven/RoCitizens. |
| R13 | Mobile + performance readiness | 2 | 2.00 | Phone-specific UIs and touch/gamepad/input services are present. |
| R14 | Automated testing / build / repair leverage | 0 | 0.00 | No automated test/build framework donor found. |
| R15 | Provenance + integration friction | 0 | 0.00 | Public archive provides no license/ownership chain. |

**Weighted workload-elimination score: 67.00 / 100**

## Unique value

MeepCity's strongest contribution is the combination of:

**housing + pets + social parties + repeatable child-friendly activities + recoverable server authority.**

That makes it a particularly relevant design/reference donor for the non-combat, child-friendly half of StarBlox.

## Critical finding

MeepCity is the first archive candidate in this audit whose snapshot preserves meaningful gameplay server source. Technically, that makes it more reconstructable than the public Brookhaven, Bloxburg and RoCitizens files even though it is smaller overall.

Without separate rights/provenance, it remains a research benchmark rather than an approved migration input.
