# Open-World Goldmine Audit Matrix

Branch purpose: evaluate external Roblox/open-world candidates against one fixed StarBlox requirement set before any migration or activation work.

## Candidates

1. adpena/arnis-roblox
2. Brookhaven.rbxl candidate
3. Welcome to Bloxburg [BETA].rbxl candidate
4. RoCitizens.rbxl candidate
5. Meepcity.rbxl candidate
6. Jailbreak (Beta).rbxlx candidate
7. GamerKreep creator-released Robbing Simulator.rbxl

## Authority boundary

External candidates are not rewarded for duplicating systems StarBlox already owns authoritatively.

StarBlox remains authoritative for:
- learning/mastery state;
- Star Coin / XP / progression outcomes;
- ProfileStore-backed durable player state;
- ReplicaService player projections;
- typed server/client network contracts;
- server-authoritative social/home mutation;
- AI-NPC tool authorization and filtering;
- migration provenance, quarantine and integrity gates;
- release activation / publication controls.

External material is therefore judged primarily on how much bespoke engineering and content production it can eliminate while fitting behind those boundaries.

## 100-point requirement matrix

| ID | Requirement | Weight | What counts as near-complete elimination |
|---|---|---:|---|
| R1 | Open-world map / environment | 16 | Large playable world can be adopted/generated with only StarBlox adaptation and art pass |
| R2 | Buildings + usable interiors | 10 | Multiple interactive buildings/interiors already exist or can be generated automatically |
| R3 | World streaming / LOD / scale performance | 7 | Large-world loading, chunking, culling or equivalent production strategy already exists |
| R4 | Vehicle runtime | 9 | Drivable vehicle foundation, physics/control, spawning and world integration mostly exist |
| R5 | Housing + furniture/building | 10 | Player homes/plots and practical placement/customization system mostly exist |
| R6 | NPCs / ambient population / traffic | 7 | Reusable pedestrians, NPC runtime, traffic, ambient-life or scalable population system exists |
| R7 | Roleplay jobs / shops / locations | 6 | Multiple reusable jobs, shops, public services or roleplay interactions exist |
| R8 | World interaction / quest hooks | 6 | Doors, prompts, missions, waypoints, minigames or interaction substrate can host StarBlox quests |
| R9 | Economy/progression integration surface | 7 | Existing ownership/unlock/reward interfaces can be cleanly replaced by StarBlox authority |
| R10 | Durable world/player persistence | 6 | Useful persistence patterns/state models exist and can map cleanly into StarBlox ProfileStore |
| R11 | Multiplayer/networking fit | 5 | Server/client architecture fits authoritative multiplayer without major rewrite |
| R12 | Avatar / UI / phone / customization | 4 | Reusable avatar, wardrobe, UI, phone or customization systems exist |
| R13 | Mobile + performance readiness | 3 | Touch/gamepad/mobile and practical runtime performance are already addressed |
| R14 | Automated testing / build / repair leverage | 2 | Candidate materially improves autonomous build, test, verification or repair |
| R15 | Provenance + integration friction | 2 | Source is explicit, inspectable, license/provenance is strong, dependencies are tractable |

Total: 100 points.

## Rating scale per requirement

Each candidate receives one of four evidence levels:

- **0 = none**: no useful capability found.
- **1 = reference-only**: useful ideas/assets exist, but it does not materially eliminate implementation.
- **2 = partial donor**: substantial reusable implementation exists, but StarBlox still needs meaningful engineering.
- **3 = near-complete eliminator**: the candidate removes most bespoke work for this requirement.

Weighted elimination score:

`requirement weight × evidence level / 3`

The final score is interpreted as the approximate percentage of the currently identified open-world workload the candidate could eliminate by itself, not as a product-quality score.

## Mandatory evidence fields

Every candidate audit must record:

- exact repository or source URL;
- exact commit SHA or exact Git blob SHA/file size when available;
- source type (.rbxl/.rbxlx/source tree/etc.);
- stated license / provenance;
- actual files/systems observed;
- executable-script risk flags;
- external dependencies;
- directly reusable capabilities;
- reusable-after-refactor capabilities;
- asset-only value;
- blockers;
- requirement-by-requirement 0–3 evidence rating;
- weighted elimination score;
- overlap with systems already present in StarBlox;
- unique value not available from the other candidates.

## Evidence rules

1. README claims alone do not earn a 2 or 3.
2. A 2 requires inspectable implementation evidence.
3. A 3 requires implementation evidence plus a plausible StarBlox integration path.
4. Place-file candidates must be cataloged statically before imported Luau is executed.
5. Risky or unknown script behavior stays quarantine-only.
6. Missing provenance does not erase technical value, but it reduces R15 and is recorded as a blocker.
7. No candidate is allowed to replace StarBlox learning/mastery/economy authority simply because it ships an older economy.
8. Duplicate capabilities across candidates are not double-counted when producing the final combined-stack estimate.


## Results through Step 8

| Audit step | Candidate | Workload-elimination score | Strongest verified value | Status |
|---|---|---:|---|---|
| 2 | Arnis Roblox | 57.33 / 100 | Repeatable city generation, interiors, roads, streaming/LOD, ambient life and engineering automation | Complete |
| 3 | Brookhaven.rbxl public candidate | 64.67 / 100 | Brookhaven physical world, houses, vehicles, roleplay UI and client-side system contracts | Complete |
| 4 | Welcome to Bloxburg [BETA].rbxl public candidate | 65.33 / 100 | Deep recoverable build-mode, wall/fence/plot, furniture and interior logic | Complete |
| 5 | RoCitizens.rbxl public candidate | 76.00 / 100 | Broad roleplay stack: housing, careers/tasks, world events, phone/customization, trade, inventory and network contracts | Complete |\n| 6 | Meepcity.rbxl public candidate | 67.00 / 100 | Estates, pets, social parties, child-friendly activities and unusually complete recoverable server/persistence source | Complete |\n| 7 | Jailbreak (Beta).rbxlx public candidate | 51.67 / 100 | Strongest dedicated vehicle/garage/open-city driving donor, but authoritative server implementation is absent | Complete |\n| 8 | GamerKreep Robbing Simulator.rbxl | 78.33 / 100 | Creator-released full server source, city NPC response AI, housing/placeables, world events and persistence/economy patterns | Complete |

### Cross-candidate finding

The three public archive place files are not complete functional server-source copies. Static cataloging found zero recoverable gameplay server Script source in Bloxburg and RoCitizens, and Brookhaven's only non-empty server Script source is a README helper. Their value is therefore concentrated in physical content, client/shared logic, UI, data/state shapes and remote contracts. Server authority must be rebuilt or supplied from a separately authorized complete source.

## Final comparison outputs

After all seven audits, produce:

1. individual 100-point elimination score;
2. strongest unique capability from each candidate;
3. overlap/deduplication map;
4. best single candidate;
5. best combined stack;
6. estimated remaining bespoke StarBlox workload after the combined stack;
7. recommended migration order by engineering leverage and risk.