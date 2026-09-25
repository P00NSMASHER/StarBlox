# Goldmine Audit — Step 9: Deduplicated Mother-Lode Analysis

## Executive result

The audit does **not** support adding individual candidate percentages together. The candidates overlap heavily.

Two union views are therefore used:

1. **Technical maximum union** — all seven audited candidates, regardless of whether current provenance is sufficient for direct migration.
2. **Practical implementation union** — Arnis + authenticated/authorized Brookhaven material + creator-released Robbing Simulator, integrated behind the existing StarBlox authority layer.

R15 (provenance/integration friction) is treated as a gate rather than as functional capability when calculating union coverage. Functional coverage therefore uses R1–R14, whose total weight is 98.

### Functional union scores

- **All-seven technical maximum:** 95.33 / 98 = **97.28% functional coverage**
- **Practical implementation union:** 88.33 / 98 = **90.14% functional coverage**

The practical stack leaves **9.67 weighted functional points**, or **9.86% of the functional matrix**, not supplied at near-complete donor strength.

That 9.86% is a feature-gap metric, not a calendar estimate. Integration, security review, content adaptation and QA remain cross-cutting work and are not represented linearly by the matrix.

---

## Individual results

| Candidate | Original score / 100 | Strongest unique value |
|---|---:|---|
| GamerKreep Robbing Simulator | **78.33** | Nearly complete recoverable server source, NPC response AI, housing/placeables, interactive city events |
| RoCitizens | **76.00** | Broadest career/task/event/phone/trade roleplay architecture |
| MeepCity | **67.00** | Estates + pets + social/child-friendly activities + recoverable server/persistence source |
| Bloxburg Beta | **65.33** | Deepest build-mode / wall / fence / plot / furniture client system |
| Brookhaven public snapshot | **64.67** | Most directly relevant Brookhaven world, houses, vehicles, avatar/UI and roleplay presentation |
| Arnis Roblox | **57.33** | Unique repeatable city compiler plus interiors, roads, streaming/LOD and world-generation tests |
| Jailbreak Beta | **51.67** | Strongest dedicated vehicle, garage, helicopter and vehicle-customization donor |

## Best single candidate

### Technical workload eliminator: Robbing Simulator

Robbing Simulator is the strongest single donor at **78.33 / 100** because it preserves nearly all authoritative server source rather than merely world/client snapshots.

Its highest-value StarBlox donor areas are:

- NPC/civilian/response AI;
- housing and placeables;
- property state;
- location-based world events;
- shops/interactions;
- persistence/economy patterns;
- complete server/client contract examples.

It remains quarantine-only until security review because the creator explicitly warned that some legacy released projects may contain broken or unsafe third-party scripts.

### Lowest-friction licensed engineering donor: Arnis

Arnis is the safest high-leverage source-code donor because it is an inspectable Apache-2.0 project and uniquely supplies city generation plus large-world streaming/LOD.

### Most directly StarBlox-relevant world donor: authenticated Brookhaven source

The public Brookhaven snapshot scores 64.67 but is missing authoritative gameplay server source. A separately supplied authenticated Brookhaven source containing the missing server implementation could materially improve the practical union.

---

## Deduplicated requirement coverage

| ID | Requirement | All-seven max | Practical stack | Best technical donor(s) | Practical source |
|---|---|---:|---:|---|---|
| R1 | Open-world map / environment | 3 | 3 | Arnis / Brookhaven / several place snapshots | Arnis + authorized Brookhaven |
| R2 | Buildings + usable interiors | 3 | 3 | Arnis / Brookhaven / Bloxburg / RoCitizens / MeepCity / Robbing | Arnis + authorized Brookhaven + Robbing |
| R3 | Streaming / LOD / scale | 3 | 3 | **Arnis only** | Arnis |
| R4 | Vehicle runtime | 3 | 2 | **Jailbreak** | Brookhaven / Robbing / Arnis partial implementations |
| R5 | Housing / furniture / building | 3 | 3 | Bloxburg / RoCitizens / MeepCity / Robbing | Robbing + authorized Brookhaven |
| R6 | NPCs / ambient population / traffic | 3 | 3 | **Robbing** | Robbing + Arnis ambient layer |
| R7 | Jobs / shops / locations | 3 | 2 | **RoCitizens** | Robbing + authorized Brookhaven; StarBlox career layer still needed |
| R8 | Interaction / quest hooks | 3 | 3 | MeepCity / Robbing | Robbing |
| R9 | Economy/progression integration surface | 3 | 3 | RoCitizens / MeepCity / Robbing | Robbing behind StarBlox authority |
| R10 | Durable persistence donor | 3 | 2 | **MeepCity** | Robbing pattern; StarBlox ProfileStore remains authoritative |
| R11 | Multiplayer/networking fit | 2 | 2 | Arnis / RoCitizens / MeepCity / Robbing | StarBlox production backbone remains authoritative |
| R12 | Avatar / UI / phone / customization | 3 | 3 | Brookhaven / RoCitizens | authorized Brookhaven |
| R13 | Mobile + performance readiness | 2 | 2 | several candidates tie | StarBlox final certification still required |
| R14 | Automated build/test leverage | 3 | 3 | **Arnis only among these seven** | Arnis + existing StarBlox AI Development Factory |

### Technical maximum

Across all seven candidates:

- **12 of 14 functional requirements reach level 3**
- R11 multiplayer/networking remains level 2
- R13 mobile/performance remains level 2
- no functional category is absent

This produces **95.33 / 98 = 97.28%** weighted functional coverage.

### Practical stack

Arnis + authorized Brookhaven + Robbing Simulator produces:

- **9 of 14 functional requirements at level 3**
- **5 of 14 at level 2**
- **0 requirements at level 0 or 1**

The five partial areas are:

1. R4 vehicle runtime;
2. R7 careers/jobs;
3. R10 persistence donor;
4. R11 networking fit;
5. R13 mobile/performance.

R10 and R11 are much less concerning than their level-2 donor scores imply because StarBlox already owns ProfileStore-backed persistence and an authoritative Roblox networking/replication backbone.

The genuinely remaining donor gaps are therefore concentrated around:

- final vehicle runtime/garage integration;
- broad child-safe career/job content;
- mobile/performance certification.

---

## Overlap / deduplication map

### World and buildings

Highly overlapping:
- Brookhaven
- Bloxburg
- RoCitizens
- MeepCity
- Jailbreak
- Robbing

Unique differentiator:
- **Arnis can generate new worlds repeatedly rather than donating one fixed world.**

Conclusion:
Use authorized Brookhaven for StarBlox identity/world fidelity and Arnis for expansion/streaming. Do not import six overlapping city maps.

### Housing

Strong overlap:
- Bloxburg
- RoCitizens
- MeepCity
- Robbing
- Brookhaven

Unique strengths:
- Bloxburg: deepest build UX
- RoCitizens: property/roommate/furniture state model
- MeepCity: estate customization and family/social presentation
- Robbing: complete recoverable server-side property/placeable authority
- Brookhaven: StarBlox-relevant roleplay-house presentation

Practical conclusion:
Use **Robbing server patterns + authorized Brookhaven presentation**. Treat Bloxburg/RoCitizens/MeepCity as reference libraries unless their rights are separately established.

### Vehicles

Overlap:
- Brookhaven
- Jailbreak
- Arnis
- Robbing

Unique strength:
- **Jailbreak has the strongest dedicated vehicle/garage/customization implementation.**

Practical conclusion:
Do not import Jailbreak directly without rights. Use its audit findings as design evidence; complete the production vehicle layer using authorized sources and StarBlox authority.

### NPCs / world events

Overlap:
- Arnis ambient NPCs
- RoCitizens event/career models
- MeepCity activity interactions
- Robbing NPC response/event system

Unique strength:
- **Robbing has the strongest recoverable authoritative NPC response implementation.**
- **RoCitizens has the broadest career/task taxonomy.**

Practical conclusion:
Use Robbing for server/event mechanics and recreate the useful RoCitizens career concepts natively in StarBlox.

### Persistence/networking

Several sources expose old persistence or networking patterns, but this is intentional overlap with systems StarBlox already owns.

Conclusion:
Do **not** transplant legacy persistence/networking as authority. Map imported state into:

- ProfileStore;
- ReplicaService projections;
- typed StarBlox networking;
- server-authoritative validation;
- existing SocialWorldService / LiveOps / quest systems.

---

## Best combined stack

### Production-oriented stack

```text
STAR BLOX AUTHORITY
ProfileStore / Replica / networking / Quest / mastery / economy
                 │
        ┌────────┼────────┐
        │        │        │
        ▼        ▼        ▼
     ARNIS   AUTHORIZED   ROBBING
             BROOKHAVEN   SIMULATOR
        │        │        │
 city generator │    NPC/event server
 roads/interiors│    housing/placeables
 streaming/LOD  │    world interactions
 expansion      │    persistence patterns
        │        │        │
        └────────┼────────┘
                 ▼
          STARBLOX WORLD
```

### Source roles

**Arnis**
- generated roads/cities/interiors;
- LOD and streaming;
- scalable future districts;
- world-generation tests.

**Authorized Brookhaven**
- primary StarBlox world/roleplay visual vocabulary;
- houses and landmark content;
- vehicles/assets;
- avatar/UI/customization;
- animations/audio/presentation.

**Robbing Simulator**
- NPC/civilian response patterns;
- server-side location events;
- housing/placeables authority patterns;
- interactive shops/locations;
- old persistence/economy implementation as migration evidence.

**Existing StarBlox**
- all final learning/mastery authority;
- Star Coins/XP;
- durable player profiles;
- secure multiplayer/network authority;
- social/home state;
- AI NPC tool authority;
- migration quarantine;
- release/certification gates.

---

## Research-only augmentation layer

The remaining archive candidates are still highly useful as architecture references:

- **RoCitizens:** careers/tasks, phone, trade, roommate/property schema;
- **Bloxburg:** build-mode interaction, walls/fences/plot UX;
- **MeepCity:** pets, estates, parties, family-friendly repeatable activities;
- **Jailbreak:** garage/vehicle/customization architecture.

Until separate provenance/rights are established, these should remain reference inputs rather than migration payloads.

If all four later become cleared for direct use, the union rises from **90.14%** to **97.28% functional coverage**.

---

## Remaining bespoke StarBlox workload

### Weighted feature gap

The practical stack leaves **9.67 / 98 functional points = 9.86%** not supplied at near-complete donor strength.

That gap is concentrated in:

1. final vehicle runtime/ownership/garage integration;
2. StarBlox-native child-safe careers/jobs;
3. persistence adaptation into ProfileStore;
4. typed multiplayer/network adapters;
5. final mobile/performance certification.

### Cross-cutting work not captured by that 9.86%

The matrix intentionally does not turn integration work into fake arithmetic. Significant work still remains in:

- security review of legacy scripts;
- provenance verification and source authentication;
- adapting imported systems behind StarBlox authority;
- replacing old remote/data patterns;
- reconciling art scale, naming and world coordinates;
- curriculum/learning mission conversion;
- child-safety/moderation requirements;
- mobile UX;
- performance profiling;
- automated tests;
- visual QA;
- regression certification.

Therefore **90.14% functional coverage does not mean 90.14% of calendar development is finished**.

---

## Recommended migration order

### 1. Arnis — integrate first

Reason:
- unique R3 solution;
- Apache-2.0;
- current inspectable source;
- low provenance risk;
- benefits every later world/content migration.

Target:
- world-generation/streaming layer only;
- preserve StarBlox runtime authority.

### 2. Authenticated Brookhaven source — world/content extraction

Reason:
- directly matches desired StarBlox/Brookhaven world model;
- maximum visual/content relevance.

Target:
- world/environment;
- houses/interiors;
- avatar/customization presentation;
- vehicles/assets;
- audio/animation/UI.

Do not make the public archive snapshot canonical. Prefer the user's authorized source and compare its fingerprint/catalog against the audited public snapshot.

### 3. Robbing Simulator — selective security-reviewed extraction

Reason:
- highest individual technical score;
- creator release has strong provenance;
- almost complete server source;
- strong NPC/event/housing implementation.

Mandatory gate:
- static + manual security review before any source is allowed to execute.

Target:
- NPC/pathfinding patterns;
- location-event framework;
- housing/placeables;
- property interactions;
- state/persistence migration patterns.

### 4. Build StarBlox adapters

Route all selected donor systems behind:

- ProfileStore;
- ReplicaStateService;
- typed network authority;
- SocialWorldService;
- Quest/mastery engine;
- Star Coin/XP authority;
- content/migration provenance gates.

### 5. Recreate high-value reference-only gaps natively

Use the audits as design specifications, not copy sources:

- RoCitizens-style career/task breadth;
- Bloxburg-style build UX;
- MeepCity-style child-friendly activities/pet/social loops;
- Jailbreak-style garage/vehicle customization.

### 6. Final certification

Run:
- security audit;
- multiplayer playtests;
- mobile/controller tests;
- performance profiling;
- save/load/migration tests;
- quest reward idempotency tests;
- visual QA;
- StarBlox release gates.

---

## Final conclusion

The mother lode is **not one repository**.

It is the combination of:

1. **Arnis** for repeatable world generation and streaming;
2. **authorized Brookhaven** for the desired world/content identity;
3. **Robbing Simulator** for recoverable authoritative NPC/event/housing/server patterns;
4. **StarBlox's existing production backbone** as the final authority.

That practical combination covers **90.14% of the weighted functional requirement matrix**, with every functional category at least partially covered and nine of fourteen near-complete.

The broader seven-candidate research corpus reaches **97.28% technical functional coverage**, leaving only networking and mobile/performance below level 3.

The remaining problem is no longer "build an open-world roleplay game from scratch."

It is now:

**authenticate → quarantine → extract → adapt → integrate → certify.**
