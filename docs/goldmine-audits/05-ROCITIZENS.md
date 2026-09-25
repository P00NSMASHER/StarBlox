# Goldmine Audit — Step 5: RoCitizens.rbxl public candidate

## Source identity

- Source repository: IIIStatusIII/Roblox-Uncopylocked-Games
- File: RoCitizens.rbxl
- Git blob SHA: f7b39c429c703406693a46b54d59175032a5e19f
- File byte length: 1,246,335
- StarBlox ingestion SHA-256: 1fae1780d724976f185907694352518ad4413edf2dd2a09dc3a22107d3c56abc
- Source type: binary Roblox place snapshot
- Archive license: none asserted
- The archive maintainer says the files come from mixed outside sources and are not owned by the maintainer.

This audit therefore measures technical leverage only. RoCitizens-specific migration remains blocked unless separate authorization/provenance is established.

## Static-ingestion result

The StarBlox safe catalog completed without executing imported Luau.

- instances: 80,536
- script instances: 1,115
- non-empty recoverable script sources: 894
- server Script instances: 221
- non-empty server Script sources: 0
- remotes: 64
- asset references: 27,896
- models: 6,401
- vehicle-classified inventory rows: 127
- house-classified inventory rows: 667
- UI trees: 398
- animations: 143
- sounds: 25
- automatic catalog risk flags: none

“No automatic risk flags” is not equivalent to “safe to activate”; server authority is still missing and the source still requires quarantine/review.

## Verified implementation/system evidence

RoCitizens is the broadest roleplay-system donor found in Steps 2–5.

### Housing/building
Verified structures include:

- HouseDiagrams with multiple house types;
- large house/property trees;
- 17,000+ path matches involving furniture;
- inventory furniture selection and furniture-shop client scripts;
- PlaceFurniture and RemoveFurniture remote contracts;
- HomePurchase/Apartment and HomePurchase/House remotes;
- ResetApartment / ResetProperty;
- ChangeColor;
- roommate management UI/client logic and UpdateRoommate remote;
- placement-wall structures.

### Jobs/world events
CareerCatalog contains hundreds of structured job/task records, including:

- Medicine career levels and tasks;
- Law Enforcement career levels and car-crash response tasks;
- Crime career tasks;
- event models such as cardiac arrest, car crash, burglary and other location-based scenarios;
- WorkOperator client logic;
- TaskRequest and WorkStatusRequest remote contracts.

### Economy/social/interaction
Verified structures include:

- inventory and shop systems;
- trading interface/client logic;
- RequestTrade, TradeStart, TradeUpdate, TradeAccept, TradeCancel and ExchangeItems contracts;
- SendPartyInvites;
- MoneyUpdate;
- interactive doors, lights, curtains, TVs, sounds and generic object interaction remotes.

### Player data
The recovered network contracts expose a mature state model:

- PrimaryDataLoad / PrimaryDataSave;
- PDSave / PDLoad;
- PDMultSave / PDMultLoad;
- CanSave;
- IntroData;
- MoneyUpdate.

The corresponding authoritative server implementation is not recoverable, so these are architecture/schema evidence rather than drop-in persistence.

### Vehicles
Verified contracts include:

- SpawnCar;
- DestroyCar;
- ToggleLights;
- ToggleLocks;
- vehicle-seat/network ownership objects;
- multiple world vehicle models.

### Avatar/UI/phone
Verified content includes:

- a large phone UI/application structure;
- character customizer/save-request logic;
- UpdateClothing;
- ChangeHairColor;
- item equip/unequip contracts;
- extensive roleplay UI.

## Requirement scores

| ID | Requirement | Level | Weighted contribution | Evidence summary |
|---|---|---:|---:|---|
| R1 | Open-world map / environment | 3 | 16.00 | 80k-instance place includes extensive city/property/location content. |
| R2 | Buildings + usable interiors | 3 | 10.00 | Multiple house/property types and dense interior/furniture content are directly present. |
| R3 | World streaming / LOD / scale performance | 0 | 0.00 | No reusable large-world streaming/LOD framework was verified. |
| R4 | Vehicle runtime | 2 | 6.00 | Vehicle models, network contracts and client-facing flows exist, but authoritative server vehicle logic is absent. |
| R5 | Housing + furniture/building | 3 | 10.00 | House purchase, furniture inventory, placement/removal, roommates and property reset/recolor interfaces provide a near-complete roleplay-home substrate. |
| R6 | NPCs / ambient population / traffic | 2 | 4.67 | Large NPC/event/career surface exists; a complete scalable ambient traffic/crowd engine was not verified. |
| R7 | Roleplay jobs / shops / locations | 3 | 6.00 | CareerCatalog, WorkOperator and structured world-event/job tasks remove most roleplay-job design scaffolding. |
| R8 | World interaction / quest hooks | 2 | 4.00 | Rich interaction and work-task contracts exist, but authoritative server validation must be rebuilt. |
| R9 | Economy/progression integration surface | 3 | 7.00 | Inventory, shops, trade, money and ownership surfaces are broad and can be redirected to StarBlox learning-powered authority. |
| R10 | Durable world/player persistence | 2 | 4.00 | Mature save/load contract and state shapes exist, but server persistence source is absent and must map into ProfileStore. |
| R11 | Multiplayer/networking fit | 2 | 3.33 | 64 structured remotes expose a coherent multiplayer contract, but server implementations are missing. |
| R12 | Avatar / UI / phone / customization | 3 | 4.00 | Full phone/customizer/clothing/hair/equipment surfaces provide major roleplay UI leverage. |
| R13 | Mobile + performance readiness | 1 | 1.00 | Some optimization/input infrastructure exists, but modern mobile readiness is not demonstrated strongly enough for level 2. |
| R14 | Automated testing / build / repair leverage | 0 | 0.00 | No automated testing/build framework donor was found in the snapshot. |
| R15 | Provenance + integration friction | 0 | 0.00 | Public archive provides no license or ownership chain for this RoCitizens file. |

**Weighted workload-elimination score: 76.00 / 100**

## Reuse classification

### Highest technical value
- career/job/task taxonomy;
- world-event mission structures;
- housing/furniture/roommate UX and state model;
- phone/customizer UI;
- inventory/trade/shop interaction design;
- remote-contract map for a complete roleplay game.

### Reusable after refactor
- WorkOperator and job client flows;
- furniture/building clients;
- trading/social clients;
- vehicle flows;
- character customization;
- interaction UI and event models.

### Must be rebuilt under StarBlox authority
- all server remote handlers;
- persistence implementation;
- reward/economy decisions;
- authoritative vehicle ownership/spawning;
- furniture placement validation;
- job/task completion validation;
- trade security;
- social safety controls.

## Critical finding

**RoCitizens is the technical mother lode so far.**

It scores higher than the public Brookhaven and Bloxburg snapshots because it combines housing, jobs, events, phone/customization, trade, economy surfaces, vehicle contracts and a coherent remote map in one place.

But it is not a drop-in complete game: all 221 server Script instances lack recoverable source. Its strongest value is as a comprehensive client/content/contract donor and architectural reference.

Without separate rights/provenance, it remains a research benchmark rather than an approved migration input.
