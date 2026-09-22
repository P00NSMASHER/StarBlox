# Catalog Sprint Lane 02 — Bed Repairs

STATUS: **BEDS 1–4 EXACT BYTES STAGED / READBACK PASS / READY FOR INDEPENDENT REVIEW 05**

Branch: `screenshot-match-preproduction` only  
Producer: Workstream 02  
Independent reviewer: Workstream 05  
Canonical integrator: Workstream 08  
Replit/Floot: **untouched**  
Main/player data: **untouched**

## Current review-priority check

Workstream 02’s independent partition remains Shoes / Backgear / Handgear / Seating. Shoes 1–6 and Seating 7–10 already have independent exact-hash ACCEPT decisions and must be preserved. The current producer lanes still expose no newer repository-staged Seating or Shoes replacement hash for Workstream 02 to review: Seating 2–3 remain generated-but-transfer-blocked in lane 01, and lane 04’s current Shoes 1–6 hashes are the already-reviewed versions. No source-only preview was treated as a visual PASS.

## Beds 1–4 staged pilot

The existing four-item Bed pilot has now crossed the byte-transfer blocker. An authorized branch-local recovery path copied the exact producer-recorded Adobe Firefly PNG response bytes into versioned candidate paths and verified repository readback. Authoritative metadata was reconciled against the current game model before staging; notably `beds-1` remains **Garden Glow**.

| Item | Exact candidate path | Git blob SHA | Bytes | Dimensions | Status |
| --- | --- | --- | ---: | --- | --- |
| `beds-1` Starter Bed — Tier 1 / Garden Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-1-w02-v1.png` | `0b9f4213f84c9cde0de5ede646345c0ebc851127` | 673746 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-2` Cloud Bed — Tier 1 / Galaxy Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-2-w02-v1.png` | `67a0fe2874f975cedb1b4b994e0237ac55d2fb3e` | 825777 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-3` Pixel Bunk — Tier 1 / Sunny Pop | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-3-w02-v1.png` | `22b1d9f6802cc0b442c9226511ff96e8ea0bbacc` | 879492 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-4` Berry Daybed — Tier 2 / Aqua Wave | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-4-w02-v1.png` | `18fa8722d9831af1113e07c2103b373acc41c3c0` | 981252 | 1024×1024 | READY_FOR_REVIEW_05 |

`lane-02.json` records SHA-256 provenance, exact byte/readback status, legacy identities and producer pixel findings. These remain **producer candidates only**. Workstream 02 did not self-approve them, and no canonical manifest/runtime mapping was edited.

## Visual direction and release discipline

The pilot addresses the legacy flat-icon failure with recognizable bed construction, mattress/frame depth, three-quarter silhouettes, textile/wood volume, contact/cast lighting and clearer theme identity while keeping Tier 1 relatively simple and Tier 2 visibly richer. The original Store screenshot remains the visual target for dimensional collectible presentation and glossy card-scale legibility; no pixel-parity claim is made from producer inspection.

Do not scale into Beds 5–8 until reviewer 05 dispositions this pilot or identifies concrete repair needs. V2 requires the pilot to complete independent rendered review before the recipe is scaled. If reviewer 05 ACCEPTs exact hashes, 08 may integrate them after normal mapping/file/content checks. If reviewer 05 returns REWORK, preserve these exact versions and repair only the rejected items.

## Handoff

- **05:** render and independently review the four exact hashes above at card/detail scale; record ACCEPT/REWORK/BLOCKED per exact version.
- **08:** no action until reviewer 05 accepts an exact hash; then integrate only the accepted version after normal checks.
- **15:** the Workstream-02 Bed byte-transfer blocker is resolved for this pilot. No additional transfer escalation is needed for Beds 1–4.
- **02 next:** first consume any newly staged Seating/Shoes replacement hashes for independent review. Otherwise wait for reviewer 05’s Beds 1–4 pilot disposition before generating Beds 5–8.

No gameplay, curriculum, economy, save state, tests, canonical runtime, Replit/Floot, `main`, deployment, paid settings or real-player data were changed by this documentation update.
