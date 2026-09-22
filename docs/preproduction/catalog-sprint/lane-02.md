# Catalog Sprint Lane 02 — Bed Repairs + Independent Seating/Shoes Review

STATUS: **SEATING 2–3 EXACT-HASH ACCEPTED / BEDS 1–4 RENDERED / READY FOR INDEPENDENT REVIEW 05**

Branch: `screenshot-match-preproduction` only  
Producer: Workstream 02 (Beds 1–12 only)  
Independent review partition: Shoes / Backgear / Handgear / Seating  
Bed independent reviewer: Workstream 05  
Canonical integrator: Workstream 08  
Replit/Floot: **untouched**  
Main/player data: **untouched**

## Current independent-review progress

The original Store screenshot and its hash-verified manifest remain the visual target; unchanged reference evidence was reused. Legacy Shoes / Backgear / Handgear / Seating remains 48/48 reviewed as exact-hash REWORK and those old decisions do not transfer to replacements.

Fresh replacement coverage now includes exact-hash **ACCEPT** for Shoes 1–6 and Seating 2–3 / 7–10. This pass consumed the newly staged Workstream-01 Seating 2–3 replacements rather than reviewing source-only previews.

| Item | Exact candidate | Git blob SHA | Decision | Pixel evidence |
| --- | --- | --- | --- | --- |
| `seating-2` Cloud Pouf — Tier 1 / Art Attack | `/assets/catalog/seating-2-w01-recovered-v2.jpg` | `c3d4705b7182b1be735b1a762b2ae79d58928aa5` | **ACCEPT** | Artifact 10671012131 contact sheet + exact detail render |
| `seating-3` Pixel Beanbag — Tier 1 / Star Luxe | `/assets/catalog/seating-3-w01-recovered-v2.jpg` | `5d69a2f6adf1e4cf9b4ec413dbeedba84c41813b` | **ACCEPT** | Artifact 10671012131 contact sheet + exact detail render |

Reviewer 02 inspected actual card/contact-sheet pixels and both exact-hash detail screenshots. Cloud Pouf preserves a readable low cloud silhouette with stuffed lobes, upholstery seams, fabric response, cast shadow and Art Attack markings. Pixel Beanbag preserves a deep beanbag cavity with panel seams, stuffed deformation, gold star stitching and restrained pixel accents. Both remain legible at card scale and are visually distinct. Full item-specific reasons and evidence hashes are in `reviews/02.json`.

Recovery workflow evidence: run `35671770098`, artifact `10671012131`, digest `sha256:07b7da381d584a08538754db0d8e97c4ed7434a4f23e8460f88ab73669fb3966`. Its Seating 2–3 card/detail render check is **PASS 2/2**, tests **PASS**, and build **PASS**. The workflow's broader shared-render overall result remains **FAIL** and is intentionally not hidden or converted into an overall visual PASS.

Next independent-review priority is fresh Seating 4–6 / 11–12 and Shoes 7–12 when exact staged hashes arrive, then Backgear/Handgear replacements.

## Beds 1–4 staged pilot

The existing four-item Bed pilot is repository-staged with exact-byte readback. Authoritative metadata was reconciled against `src/gameModel.js`; notably `beds-1` remains **Garden Glow**.

| Item | Exact candidate path | Git blob SHA | Bytes | Dimensions | Status |
| --- | --- | --- | ---: | --- | --- |
| `beds-1` Starter Bed — Tier 1 / Garden Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-1-w02-v1.png` | `0b9f4213f84c9cde0de5ede646345c0ebc851127` | 673746 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-2` Cloud Bed — Tier 1 / Galaxy Glow | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-2-w02-v1.png` | `67a0fe2874f975cedb1b4b994e0237ac55d2fb3e` | 825777 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-3` Pixel Bunk — Tier 1 / Sunny Pop | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-3-w02-v1.png` | `22b1d9f6802cc0b442c9226511ff96e8ea0bbacc` | 879492 | 1024×1024 | READY_FOR_REVIEW_05 |
| `beds-4` Berry Daybed — Tier 2 / Aqua Wave | `/assets/catalog-candidates/w02-beds-20260921-b01/beds-4-w02-v1.png` | `18fa8722d9831af1113e07c2103b373acc41c3c0` | 981252 | 1024×1024 | READY_FOR_REVIEW_05 |

The same shared artifact `10671012131` now contains exact-hash card/contact-sheet pixels and separate detail screenshots for all four Beds. `lane-02.json` records the artifact digest plus SHA-256 for each detail screenshot so reviewer 05 can make a reproducible independent decision without waiting for another render fixture.

These remain **producer candidates only**. Workstream 02 did not self-approve them, and no canonical manifest/runtime mapping was edited.

## Visual direction and release discipline

The Bed pilot addresses the legacy flat-icon failure with recognizable mattress/frame construction, three-quarter silhouettes, textile/wood volume, grounded lighting and clearer theme identity while keeping Tier 1 relatively simple and Tier 2 richer. No pixel-parity claim is made from producer inspection.

Do **not** scale into Beds 5–8 until reviewer 05 dispositions this pilot or identifies concrete repair needs. If reviewer 05 ACCEPTs an exact hash, 08 may integrate only that accepted version after normal mapping/file/content checks. If reviewer 05 returns REWORK, preserve the existing version and repair only the rejected item.

## Handoff

- **05:** exact Bed render evidence is now available in workflow run `35671770098`, artifact `10671012131`; independently disposition Beds 1–4 by exact hash.
- **08:** Seating 2–3 exact hashes now have one independent reviewer-02 ACCEPT and are usable after normal checks. Beds remain blocked on reviewer 05.
- **01:** preserve the accepted Seating 2–3 hashes; do not regenerate them absent a later concrete defect.
- **15:** route remaining fresh Seating 4–6 / 11–12 and Shoes 7–12 to reviewer 02 as soon as staged exact hashes and pixels are ready.
- **02 next:** consume ready replacement review work first; otherwise wait for reviewer 05’s Bed-pilot disposition. No Beds 5–8 generation yet.

No gameplay, curriculum, economy, save state, canonical runtime, Replit/Floot, `main`, deployment, paid settings or real-player data were changed by this pass.
