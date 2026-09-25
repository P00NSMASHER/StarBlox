# Goldmine Audit — Step 4: Welcome to Bloxburg [BETA].rbxl public candidate

## Source identity

- Source repository: IIIStatusIII/Roblox-Uncopylocked-Games
- File in source repository: Welcome to Bloxburg [BETA].rbxl
- Git blob SHA: 99557137ca7a147aa801128ce818f2c92d188dbe
- File byte length: 1,315,731
- StarBlox ingestion SHA-256: 2137d275799df4e28bb95d7653e7a013a4b4ee1f4556df8b1ad193c535a01826
- Source type: binary Roblox place snapshot
- Archive license: none asserted
- The archive maintainer explicitly says the files come from mixed outside sources and are not owned by the maintainer.

This audit therefore measures technical leverage only. Use of Bloxburg-specific source/material remains blocked unless separate authorization/provenance is established.

## Static-ingestion result

The StarBlox safe catalog completed without executing imported Luau.

- instances: 63,134
- script instances: 175
- non-empty recoverable script sources: 137
- server Script instances: 2
- non-empty server Script sources: 0
- remotes: 3
- asset references: 34,094
- models: 4,121
- vehicle-classified inventory rows: 88
- house-classified inventory rows: 350
- UI trees: 65
- animations: 180
- sounds: 382
- catalog risk flags: runtime-introspection

This is a large physical/client/module snapshot, but not a complete authoritative game source.

## Verified implementation/system evidence

The strongest evidence is the build/home stack:

- BuildInterface: 113,807 recoverable source bytes / 2,888 lines;
- InteractionData: 91,183 bytes / 2,219 lines;
- Items: 61,780 bytes / 1,110 lines;
- WallHandler: 44,786 bytes / 1,246 lines;
- FenceHandler and PlotHandler structures;
- PlotEffects and BuildSettings;
- a large Plot_Player2/House tree with appliances, counters, furniture and placed objects;
- hundreds of furniture-related instances and buildable object models.

Vehicle/client evidence includes:

- CarModule;
- MotorcycleModule;
- VehicleController;
- Vehicle HUD;
- moped/vehicle object trees and drive/motorcycle animations.

Roleplay/job client evidence includes job-specific interfaces such as:

- PizzaPlanetBaker;
- BloxyBurgersCashier;
- BensIceCreamSeller;
- other interaction/job presentation represented through the client/UI structures.

Networking/persistence is much weaker than the housing/building stack:

- only DataEvent, DataFunction and ReportGoogleAnalyticsError remotes were cataloged;
- no recoverable server Script source;
- DataManager and other modules expose client/shared concepts but not the authoritative backend.

## Requirement scores

| ID | Requirement | Level | Weighted contribution | Evidence summary |
|---|---|---:|---:|---|
| R1 | Open-world map / environment | 3 | 16.00 | 63k-instance place contains a substantial built environment and world content. |
| R2 | Buildings + usable interiors | 3 | 10.00 | Dense house/interior/appliance/furniture content is directly present. |
| R3 | World streaming / LOD / scale performance | 0 | 0.00 | No reusable large-world streaming/LOD framework was verified. |
| R4 | Vehicle runtime | 2 | 6.00 | Car/motorcycle client modules and controls are recoverable, but authoritative server behavior is missing. |
| R5 | Housing + furniture/building | 3 | 10.00 | BuildInterface, wall/fence/plot systems and dense furniture/house content remove most client-side building-editor work. |
| R6 | NPCs / ambient population / traffic | 1 | 2.33 | NPC/roleplay interaction content exists, but no scalable ambient population/traffic runtime was verified. |
| R7 | Roleplay jobs / shops / locations | 2 | 4.00 | Multiple job-specific client flows and commercial locations exist; server job authority is missing. |
| R8 | World interaction / quest hooks | 2 | 4.00 | InteractionData and interaction-handler architecture are substantial, but server-side validation must be rebuilt. |
| R9 | Economy/progression integration surface | 2 | 4.67 | Shops/items/client economy surfaces can be redirected to StarBlox authority. |
| R10 | Durable world/player persistence | 1 | 2.00 | Shared/client data concepts exist, but the authoritative persistence implementation is absent. |
| R11 | Multiplayer/networking fit | 1 | 1.67 | Very small recovered remote surface and no server scripts mean considerable networking reconstruction. |
| R12 | Avatar / UI / phone / customization | 2 | 2.67 | Character customization and substantial UI exist, but a broad phone/social stack was not verified. |
| R13 | Mobile + performance readiness | 2 | 2.00 | InputManager, Gamepad, VehicleController, UserInputService/ContextActionService use and performance utilities give useful cross-device groundwork. |
| R14 | Automated testing / build / repair leverage | 0 | 0.00 | No test/build automation donor was found in the place snapshot. |
| R15 | Provenance + integration friction | 0 | 0.00 | Public archive provides no license or ownership chain for this Bloxburg file. |

**Weighted workload-elimination score: 65.33 / 100**

## Reuse classification

### Highest technical value
- build-mode UX and geometry concepts;
- wall/fence/plot handling;
- furniture/item catalog structure;
- interior object content;
- vehicle client-control architecture;
- roleplay-job UI patterns.

### Reusable after refactor
- BuildInterface and interaction modules;
- vehicle client modules;
- job interfaces;
- item/economy UI;
- character customization.

### Must be rebuilt under StarBlox authority
- all authoritative build validation;
- ownership/persistence;
- server-side jobs/economy;
- network security and multiplayer state;
- purchase/reward authority.

## Critical finding

Bloxburg is the strongest housing/building specialist examined so far, but this public file is **not a complete Bloxburg server source**. Its value is concentrated in world objects and recoverable client/shared build-system logic.

Without separate rights/provenance, it remains a research benchmark rather than an approved migration input.
