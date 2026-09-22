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

Per Workstream-15 direction, Lane 11 did **not** claim another catalog family or edit shared runtime/state. The bounded visual-finishing handoff now consists of six mutually consistent artifacts:

1. `docs/preproduction/workstreams/11-motion-game-feel.md` — narrative motion/game-feel recipes, event semantics, cleanup and later evidence plan.
2. `docs/preproduction/workstreams/11-reference-effect-zones.md` — reference-coordinate effect masks, protection zones, compositing rules and static reduced-motion frames.
3. `docs/preproduction/workstreams/11-effect-material-recipes-v1.json` — machine-readable material/motion contract, Git blob `2bdeb9eb873f87922b65392070bb5b386ef23073`.
4. `docs/preproduction/workstreams/11-static-reduced-motion-capture-contract-v1.json` — deterministic static reduced-motion capture/acceptance packet, Git blob `8ab37c518ab105c9982857879241170a1e299bbb`, created at commit `6e51bbf65375148ac2418def9fe20a05a3b343bc`.
5. `docs/preproduction/workstreams/11-motion-keyframe-capture-contract-v1.json` — deterministic normal-motion keyframe and browser-trace capture packet, Git blob `fe8e89d8ea0032f94f7cc5caa0bdaa911c255d8c`, created at commit `fac5263fe02063d229c637de14abd4a3097a8f20`.
6. `docs/preproduction/workstreams/11-effect-material-lookdev-board-v1.svg` — **saved 1440×960 art-only lookdev source**, Git blob `768015042927ac767a6da503606d4a1a3aef10a3`, created at commit `cdc827e9a1f021efc599f480ba71c42f13c50f92`. It visualizes the reference-grounded panel materials, Star Spark depth hierarchy, Store selection/equip halo, Quest correct-only static celebration, Home warm-depth treatment, and static reduced-motion equivalents without changing runtime or state.

The effect-material lookdev board is original repository-authored SVG work. No image-generation model, API service, dataset import, or custom node was used. Its metadata keeps reference rights/source terms separate and pins the verified Home/Store/Quest reference hashes plus the machine-readable recipe source. During the write, another producer advanced the shared branch between preflight and commit: the board's commit parent `1ba6e716708ab0ebac243791a3d8097fec629f68` is authoritative; its embedded `dd05c0371534b773ef54e30cb87d6cb5bdf98d97` value is retained as the earlier preflight-observed branch head, not represented as the commit parent.

The static reduced-motion contract pins the verified Home/Store/Quest reference hashes and converts the existing visual recipes into screen/state/viewport still-image acceptance criteria. It defines Home truthful five-tier/no-motion composition, Store selected/equipped/after-scroll states, Quest unanswered/correct/wrong-clue-retry/next-clean states, 1408×1056 reference geometry, responsive rules for 1024×768 / 390×844 / 320×568, static material hierarchy, protected text/face/item zones, explicit fail conditions, and a Workstream-14 render-QA handoff. Responsive captures remain readability/hierarchy evidence only because no tablet/phone reference pixels exist.

The normal-motion contract removes timing ambiguity from later visual implementation and QA. It defines exact bounded keyframe windows for screen entry, Store selection/equip, semantic Quest correct, non-celebratory wrong/clue/retry, Home room reveal and optional avatar/Buddy micro-cycles; requires truthful state to exist before spectacle; specifies deterministic cleanup triggers and protected regions; and gives Workstream 14 trace windows for actual paint/composite, scroll stability, orphan-layer cleanup and reduced-motion preference transitions. It does **not** introduce gameplay state, accessibility state, runtime effects or performance claims.

This remains **ART-ONLY SOURCE + SPEC**. No motion runtime implementation, rendered-motion proof, paint/composite profiling, reduced-motion browser proof, catalog asset change, canonical mapping change, or new release clearance is claimed.

## Handoff

**05:** Aura family review is closed at the current hashes. Preserve all 12 ACCEPT decisions; re-review only if a later exact-hash defect or new asset hash is presented.  
**08:** Aura 11 is already canonical. Preserve current Aura mappings unless a later exact-hash defect is recorded.  
**14:** After 15 coordinates shared implementation, use the material recipe, reference-zone spec, static reduced-motion contract, normal-motion keyframe/trace contract and 1440×960 effect-material lookdev board to capture actual normal/reduced pixels and paint/composite/scroll evidence. Source/CSS inspection does not close the render or performance gates.  
**15:** Aura production is complete and Lane 11 claims no other catalog family. The narrative, zoning, machine-readable material, deterministic reduced-motion, deterministic normal-motion keyframe/trace and reusable effect-material lookdev source are ready; explicitly coordinate/reassign Workstream 11 before any new catalog family or shared runtime-entrypoint implementation.  
**11:** Preserve accepted Aura bytes. Stay `ART_AND_VISUALS_ONLY`; no catalog-family expansion or shared runtime/state changes without Workstream-15 ownership coordination.

Current counts: **12/12 exact-hash ACCEPT; 12/12 canonical; 0 pending reviewer-05 Aura hashes; 0 Aura regeneration IDs; 0 new catalog-family claims.**

Global catalog/release gates remain open where not executed. Normal/reduced motion render QA, reference parity and paint/composite/scroll profiling remain **OPEN / NOT EXECUTED**. No deployment action was taken.
