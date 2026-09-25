# Goldmine Audit — Step 2: Arnis Roblox

## Source identity

- Repository: adpena/arnis-roblox
- Audited commit: ff7984f990336da1d9f303d54b3f2e223bfdab35
- Source type: full source tree + Roblox runtime + Rust city compiler
- License: Apache-2.0
- Repository size observed: 1,554,170 KB

## Verified implementation evidence

Directly inspected implementation includes:

- BuildingBuilder.lua — batched EditableMesh building construction, materials, shell geometry and LOD-related evidence.
- RoomBuilder.lua — generated floors, ceilings, partitions, doors/windows and room geometry.
- RoadBuilder.lua — road geometry plus surface-specific physical properties.
- StreamingService.lua — chunk streaming, near/mid/far LOD rings, hysteresis, memory guardrails, in-flight import protection and opt-in multiplayer focus union.
- AmbientLife.lua — deterministic parked-car placement and lightweight sidewalk NPC population.
- VehicleController.client.lua + Traversal/CarController.lua — player car/traversal implementation.
- MinimapService.lua — world-derived roads/buildings/water/rail/barrier minimap feed.
- RoomBuilder.spec.lua and CanonicalWorldParity.spec.lua — implementation-level tests rather than README-only claims.

## Requirement scores

| ID | Requirement | Level | Weighted contribution | Evidence summary |
|---|---|---:|---:|---|
| R1 | Open-world map / environment | 3 | 16.00 | Real-world geodata compiler + Roblox import/runtime removes most base city/world construction. |
| R2 | Buildings + usable interiors | 3 | 10.00 | Building and room builders are implemented and tested. |
| R3 | World streaming / LOD / scale performance | 3 | 7.00 | Chunk streaming, LOD rings, hysteresis, memory guardrails and multiplayer focus state exist. |
| R4 | Vehicle runtime | 2 | 6.00 | Functional player car/traversal exists, but ownership/garage/content breadth still needs StarBlox integration. |
| R5 | Housing + furniture/building | 0 | 0.00 | No player-owned home/plot/furniture system found. |
| R6 | NPCs / ambient population / traffic | 2 | 4.67 | Ambient parked cars and sidewalk NPCs exist; population is lightweight and not a full social/traffic simulation. |
| R7 | Roleplay jobs / shops / locations | 0 | 0.00 | No roleplay job framework found. |
| R8 | World interaction / quest hooks | 1 | 2.00 | Generated world can host interactions, but no broad quest/interaction substrate was verified. |
| R9 | Economy/progression integration surface | 1 | 2.33 | World/runtime is separable enough for StarBlox authority, but no meaningful native ownership economy was verified. |
| R10 | Durable world/player persistence | 0 | 0.00 | Not a player-profile persistence donor. |
| R11 | Multiplayer/networking fit | 2 | 3.33 | Multiplayer streaming support exists; full StarBlox authoritative gameplay integration remains. |
| R12 | Avatar / UI / phone / customization | 0 | 0.00 | No material donor value verified. |
| R13 | Mobile + performance readiness | 2 | 2.00 | Strong performance work; traversal declares gamepad support, but full mobile product readiness is not proven. |
| R14 | Automated testing / build / repair leverage | 3 | 2.00 | Large test surface, compiler, build/audit scripts and repeatable world generation. |
| R15 | Provenance + integration friction | 3 | 2.00 | Explicit Apache-2.0 source tree with NOTICE/attribution obligations and inspectable dependencies. |

**Weighted workload-elimination score: 57.33 / 100**

## Reuse classification

### Directly reusable
- world-generation compiler concepts/code subject to Apache obligations;
- road/building/room builders;
- world streaming/LOD infrastructure;
- minimap/world geometry pipeline;
- performance and world-audit patterns.

### Reusable after refactor
- vehicle runtime;
- ambient NPC/parked-car presentation;
- multiplayer streaming integration;
- any runtime services that need to route through StarBlox ECS/network authority.

### Asset-only value
Low relative to its code/runtime value. Arnis is primarily an engineering accelerator.

## Main blockers

- no player housing/furniture system;
- no jobs/roleplay service framework;
- no avatar/phone/wardrobe donor;
- no StarBlox learning/economy ownership model;
- ambient NPCs are presentation-level, not full social AI;
- integration must preserve StarBlox ProfileStore/Replica/Zap/Matter authority.

## Unique value

Arnis is currently the strongest candidate for eliminating **world-production and large-world performance work**. Its unique value is not copying a prebuilt city; it can repeatedly generate new city-scale environments and therefore reduces both initial build time and future content-expansion cost.
