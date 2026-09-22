# Catalog Sprint — Lane 03 Desks & Tech

STATUS: **DESKS 2–6 INDEPENDENTLY ACCEPTED — PRESERVE EXACT HASHES; DESKS 7–12 HOLD — NO SPECULATIVE REPLACEMENT**

Branch: `screenshot-match-preproduction`  
Workstream: 03  
Allocation: `ART_AND_VISUALS_ONLY`  
Observed coordination head before this analysis: `2470036e8f1340b231b7329859f31e05176fa1b6`  
Independent Desk reviewer: **05**  
Canonical catalog writer: **08 only**  
Cross-owner coordinator: **15 only**

## Useful reconciliation this cycle

Current reviewer-05 evidence still preserves **ACCEPT** decisions for the exact current Desk 2–6 hashes. Lane 03 therefore freezes all five accepted replacements and does not regenerate, restyle or re-review them.

No Desk 7–12 replacement was generated. The current authoritative reviewer-05 evidence contains no fresh exact-hash Desk 7–12 REWORK and coordination 15 has not opened an unfinished Desk 7–12 repair batch for lane 03. Legacy age alone is not permission to replace them.

The changed input this cycle is Workstream 13's newly repository-staged `home-bedroom-w13-v3` environment repair. Lane 03 inspected the actual desktop and phone pixels as bounded Home composition evidence only. No Home runtime/CSS, scene asset bytes, canonical manifest/runtime, player state, learning content, prices/unlocks or reference images were changed here, so tests/build were not redundantly rerun.

## Current Desk truth

| ID | Item | Tier | Theme | Current path | Git blob SHA | Size | Review state |
|---|---|---:|---|---|---|---:|---|
| `desks-1` | Tiny Homework Desk | preserved | preserved | `/assets/catalog/desks-1.svg` | `1b39d2f14df20364ee908ed01fa48f0c82b66e6a` | 2,189 B | preserve existing |
| `desks-2` | Cloud Study Desk | 1 | Candy Core | `public/assets/catalog/desks-2-chat-v2.png` | `277eb1e38e8a69caa0dab6d4d27bbb91796746f8` | 845,051 B | **ACCEPT reviewer 05** |
| `desks-3` | Pixel Mini Setup | 1 | Adventure Club | `public/assets/catalog/desks-3-chat-v2.png` | `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e` | 1,148,489 B | **ACCEPT reviewer 05** |
| `desks-4` | Berry Vanity Desk | 2 | Cloud Pop | `public/assets/catalog/desks-4-chat-v2.png` | `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025` | 1,043,349 B | **ACCEPT reviewer 05** |
| `desks-5` | Garden Book Desk | 2 | Pixel Party | `public/assets/catalog/desks-5-w03-recovered-v2.jpg` | `95fe65632e4f40b76b23cce30071ee2fdc5b4399` | 51,545 B | **ACCEPT reviewer 05** |
| `desks-6` | Galaxy Gamer Setup | 2 | Berry Blast | `public/assets/catalog/desks-6-w03-recovered-v2.jpg` | `52df05265de236911927b904b07e68dac7a17828` | 34,981 B | **ACCEPT reviewer 05** |

## Reviewer-05 evidence

The current `docs/preproduction/catalog-sprint/reviews/05.json` explicitly preserves the following current exact-hash Desk accepts:

- `desks-2` → `277eb1e38e8a69caa0dab6d4d27bbb91796746f8`
- `desks-3` → `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e`
- `desks-4` → `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025`
- `desks-5` → `95fe65632e4f40b76b23cce30071ee2fdc5b4399`
- `desks-6` → `52df05265de236911927b904b07e68dac7a17828`

Desk 2–6 current accepted hashes are producer-frozen. Workstream 08 alone may perform canonical wiring after its own metadata/file/content checks; Workstream 03 does not modify manifest/runtime mappings.

### Superseded Desk 2–4 files — never select for current review

- `desks-2-v1.webp` — `357f4ba8385e737499f12409c0bea141f9bc5e6a`
- `desks-3-v1.webp` — `b3352961988d7e9c5ff48d1559fc4d2296d4eab3`
- `desks-4-v1.webp` — `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2`

Those old WebP blobs remain audit history only. They were superseded after invalid-signature/nondecoding evidence and must never displace the accepted current PNG hashes above.

## Bounded Home reference analysis — no runtime edits

### Stable reference findings retained

The immutable Home reference uses the bedroom as the full visual canvas: warm left-window illumination, soft textiles and rounded furniture, bed mass on the left, desk/shelving mass on the right, and a deliberately readable center for the avatar/buddy. Room Progress is image-led at top-center, Dream Goal is aspirational-room-led at right, and the dense bottom panels float over the room rather than replacing it with dashboard chrome. The preserved running Home already contains the needed modules; its larger visual gap is material/depth language, not missing panel inventory.

The prior `home-bedroom-w13-v2` environment moved strongly toward the reference's warm materials, floor contact, furniture thickness and bed-left/desk-right architecture, but reviewer 14 correctly returned it for lower hero-corridor and phone-crop composition. That material/light direction remains worth preserving.

### New actual-pixel inspection: `home-bedroom-w13-v3`

Workstream 13 has now staged and exact-readback-verified the repair for independent review:

- desktop: `public/assets/visuals/lane-13/home-bedroom-w13-v3-1408x1056.png`
- desktop SHA-256: `8e41a0f76546f73e50bbb09d3e4d3292baeb1084549e1e61ebc5d55e6e513884`
- phone: `public/assets/visuals/lane-13/home-bedroom-w13-v3-phone-390x844.png`
- phone SHA-256: `d2dafc3efe41c6c6982592e6724091dbd88f890a8f617cdf22538392a24a1715`
- intake/handoff head observed: `2470036e8f1340b231b7329859f31e05176fa1b6`
- producer state: **STAGED_READY_FOR_INDEPENDENT_REVIEW / not runtime-wired / not approved**

Actual desktop pixels show that the specific v2 composition defect was materially repaired. The bed remains a left-edge anchor and the desk/chair remain right-edge anchors, while the middle wall/floor corridor is now genuinely open. Warm directional window light enters from the left, the furniture has visible rounded volume and contact, and the center no longer contains a large footboard/chair collision that would compete directly with an avatar/buddy overlay.

The purposeful 390×844 crop also solves the earlier narrow-crop failure mechanically: the center column is mostly clear wall and floor, with only partial bed and chair context at the extreme edges. That is substantially safer for the mobile hero than center-covering the old 4:3 environment.

### Remaining fidelity risk to watch in independent review

The repair may have **over-corrected toward negative space**. Compared with the Home reference's dense cozy-world feeling, the v3 center is intentionally very quiet: a broad largely undecorated wall over a clean floor plane. That is useful for the hero and UI, but it reduces some of the reference's layered bedroom richness and visual storytelling when viewed as a standalone background.

The smallest art-direction response, **only if reviewers 01/14 request it**, would be to keep the cleared `x≈36–64%` hero corridor and current phone safety while adding depth outside that corridor: stronger edge-localized shelving/books/plants/star decor, more textile variation, or additional wall/furniture detail confined to the left and right thirds. Do not refill the center with furniture, baked UI, fake state or decorative noise. Any such scene change remains Workstream 13/15-owned, not lane 03 runtime/CSS work.

Lane 03 does **not** claim Home acceptance from this inspection. Reviewer 01 owns art judgment, reviewer 14 owns composition/performance judgment, and 15 coordinates any runtime wiring.

## Checks performed this cycle

- **PASS** — read `ART_VISUALS_SPRINT.json` before older mission text.
- **PASS** — read latest branch head before this documentation write.
- **PASS** — re-read current reviewer-05 evidence; Desk 2–6 exact hashes remain accepted.
- **PASS** — no exact current Desk 7–12 REWORK or explicit unfinished Desk 7–12 assignment was present, so no speculative desk generation occurred.
- **PASS** — actual staged Home v3 desktop and 390×844 phone pixels were inspected.
- **PASS** — Home v3 exact repository readback hashes/dimensions are recorded by Workstream 13; lane 03 did not duplicate or alter those assets.
- **NOT RERUN by design** — tests/build; this cycle changes owned documentation only, not runtime or asset bytes.
- **NOT ATTEMPTED by design** — canonical wiring; owner 08 only.
- **NOT ATTEMPTED by design** — shared Home runtime/CSS or environment edits; 13/15 ownership preserved.

## Handoff

1. **08:** preserve/consume independently accepted Desk hashes under normal metadata/file/content checks; 03 does not canonical-wire them.
2. **03:** preserve Desk 2–6. Do not regenerate any of those exact accepted versions.
3. **03 / 15:** Desk 7–12 remain on hold until reviewer 05 publishes an exact current REWORK or 15/current authoritative evidence explicitly assigns an unfinished Desk. If assigned, repair only that bounded 2–4 item batch.
4. **01 / 14 / 15:** independently review staged Home v3. The corridor/phone repair is visibly improved; scrutinize whether its large calm center still preserves enough reference-like cozy depth once avatar/buddy and real UI are composited.
5. **13 / 15:** if Home v3 needs another scene repair, preserve the open central corridor and phone-safe crop; add richness only at the edges rather than putting furniture back behind the hero.
6. **03:** do not edit shared Home runtime/CSS or claim Home acceptance until 15 assigns a specific 03-owned screen/module change.

**Replit/Floot/main/deploy/paid settings were not touched. Player data, saves, learning, Store IDs, prices/unlocks, canonical manifest/runtime and original reference files were not changed.**
