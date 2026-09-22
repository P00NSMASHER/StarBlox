# Catalog Sprint — Lane 11 Auras

STATUS: **AURAS 1–12 EXACT-HASH ACCEPTED + CANONICAL / AURA PRODUCTION CLOSED / ART-ONLY VISUAL SPECS READY**

Branch: `screenshot-match-preproduction`  
Workstream: 11  
Phase: `CATALOG_SPRINT` / `ART_AND_VISUALS_ONLY`  
Independent reviewer: **05**  
Canonical integrator: **08**  
Coordinator: **15**  
Replit/Floot/main/deploy: **untouched**  
Player state / learning / persistence / economy / live Aura logic: **unchanged**

## Current authoritative Aura state

Aura production is closed. Reviewer 05's schema-9 shard independently ACCEPTS **Dream Aurora v3** at exact Git blob `7f3372c1584e07f18a3abfc7818013190fff1560` after actual card/detail pixel review. The same reviewer evidence preserves current exact-hash ACCEPT decisions for **Auras 1–12**, with no pending Aura hashes.

Workstream 08 then canonically wired Aura 11. Preserved integration evidence shows:

- canonical integration commit: `ad8867efc70d1b123cbc5e2f157766bec58e510d` — `catalog: integrate reviewed Aura 11`
- manifest evidence: version **27**, blob `27c77919cfbc5cf52570bf91871338b59cded055`
- runtime mapping evidence blob: `a3b5b2b98a8507f5226191959a3cd91ef6729bdb`
- both mapping surfaces point `auras-11` to `/assets/catalog/auras-11-w11-v3.jpg`
- manifest status for Aura 11: `final-portable`

No accepted Aura bytes were regenerated, rewritten, re-reviewed, or remapped by Workstream 11.

## Preserved current accepted hashes

| ID | Name | Exact accepted Git blob | Canonical path |
| --- | --- | --- | --- |
| auras-1 | Soft Sparkles | `a7921c7b7c8f48fc47908595c1afa6f59217c7a5` | `/assets/catalog/auras-1-w11-v3.png` |
| auras-2 | Cloud Puffs | `1e421c71217e5386c1b255dfedeade8215976bcb` | `/assets/catalog/auras-2-w11-v3.png` |
| auras-3 | Pixel Bits | `f164aefb93a21374a1cf0b9b7b7312a0ae68d34c` | `/assets/catalog/auras-3-w11-v3.png` |
| auras-4 | Berry Hearts | `3357a67e4121ca631377e30033a31ef4c815ab61` | `/assets/catalog/auras-4-w11-v3.png` |
| auras-5 | Garden Fireflies | `ae3bef6cbbf4333aa740dc9a3fddf4f2b5540192` | `/assets/catalog/auras-5-w11-v3.jpg` |
| auras-6 | Galaxy Orbit | `ce4b155c7fb5469fde415ab9d744cab41027fe4d` | `/assets/catalog/auras-6-v2.svg` |
| auras-7 | Sunny Rays | `c451e7479e142f1eca89cc5282b352c2d2ca2d4b` | `/assets/catalog/auras-7-v2.svg` |
| auras-8 | Aqua Bubbles | `6884668fe721f3b26a562e11924237a32c656db6` | `/assets/catalog/auras-8-v2.svg` |
| auras-9 | Art Confetti | `9331e516a7a1a2fa32abafaf3bbf0932c3ca792d` | `/assets/catalog/auras-9-w11-v3.jpg` |
| auras-10 | Neon Trail | `6f07fe7f5c8be236f3c17df5f55afc550888f52e` | `/assets/catalog/auras-10-w11-v3.jpg` |
| auras-11 | Dream Aurora | `7f3372c1584e07f18a3abfc7818013190fff1560` | `/assets/catalog/auras-11-w11-v3.jpg` |
| auras-12 | Luxe Starstorm | `d0fcf528ff4ee91e56760932fdcf357ab264dd3d` | `/assets/catalog/auras-12-w11-v3.jpg` |

## Dream Aurora closure evidence

Dream Aurora current source:

- repository path: `public/assets/catalog/auras-11-w11-v3.jpg`
- exact Git blob: `7f3372c1584e07f18a3abfc7818013190fff1560`
- SHA-256: `0a06996522c9cb999e82b8ba028e94bfe2cb8d16e043c94999065e0ae8ce1dc2`
- dimensions: **600×600 JPEG**
- bytes: **18,443**
- branch readback: **PASS exact hash**

Reviewer 05 current evidence:

- review shard blob: `d038b469dc46337c8a2b2c1fb7015748d54a7c09`
- decision: **ACCEPT**
- actual card-scale pixels reviewed: **yes**
- actual detail pixels reviewed: **yes**
- reviewed at: `2026-09-22T04:34:43Z`
- workflow run: **35682911760**
- artifact: **10675401829**
- detail render: `staged-replacements/detail/auras-11-7f3372c1.png`
- detail SHA-256: `e175fcd79c8f0c8decf254748fd83d71103795fee717899bea76655de0350f73`
- contact sheet SHA-256: `98b0e9b5021f3239cdd9021a596fe8d56785d403704898db7c9be77915f6ba05`

The legacy Aura-11 hash `ddb2c81b49db8e6ea6369c8f70cb720228feb73c` remains historical REWORK evidence only. Its verdict did not transfer to v3.

## Spare-capacity visual deliverables

Per Workstream-15 direction, Lane 11 did **not** claim another catalog family or edit shared runtime/state. The current bounded visual-finishing handoff now consists of three mutually consistent artifacts:

1. `docs/preproduction/workstreams/11-motion-game-feel.md` — narrative motion/game-feel recipes, event semantics, cleanup and later evidence plan.
2. `docs/preproduction/workstreams/11-reference-effect-zones.md` — reference-coordinate effect masks, protection zones, compositing rules and static reduced-motion frames.
3. `docs/preproduction/workstreams/11-effect-material-recipes-v1.json` — machine-readable visual contract, Git blob `2bdeb9eb873f87922b65392070bb5b386ef23073`, committed at `70ddefa85504c6fe54ae640eb5aa810f28c45a51`.

The new machine-readable contract pins the verified Home/Store/Quest reference hashes and design-contract blob, defines the shared material palette and visual layer stack, gives bounded timing/particle/halo budgets, specifies Home room/avatar behavior, Store selection/equip/scroll behavior, Quest correct-vs-wrong/clue/retry behavior, and supplies explicit static reduced-motion equivalents. It also records the later Workstream-14 capture/profile packet without claiming any render or performance PASS.

This remains **SPEC ONLY**. No motion runtime implementation, rendered-motion proof, paint/composite profiling, reduced-motion browser proof, catalog asset change, canonical mapping change, or new release clearance is claimed.

## Handoff

**05:** Aura family review is closed at the current hashes. Preserve all 12 ACCEPT decisions; re-review only if a later exact-hash defect or new asset hash is presented.  
**08:** Aura 11 is already canonical. Preserve current Aura mappings unless a later exact-hash defect is recorded.  
**14:** After 15 coordinates shared implementation, use the machine-readable recipe and reference-zone spec to capture actual normal/reduced states and paint/composite/scroll evidence. Open gates remain open until that execution exists.  
**15:** Aura production is complete and Lane 11 claims no other catalog family. The narrative, coordinate-zoning and machine-readable visual-finishing specs are ready; explicitly coordinate/reassign Workstream 11 before any new catalog family or shared runtime-entrypoint implementation.  
**11:** Preserve accepted Aura bytes. Stay `ART_AND_VISUALS_ONLY`; no catalog-family expansion or shared runtime/state changes without Workstream-15 ownership coordination.

Current counts: **12/12 exact-hash ACCEPT; 12/12 canonical; 0 pending reviewer-05 Aura hashes; 0 Aura regeneration IDs; 0 new catalog-family claims.**

Global catalog/release gates remain open where not executed. Normal/reduced motion render QA and paint/composite/scroll profiling remain **OPEN / NOT EXECUTED**. No deployment action was taken.
