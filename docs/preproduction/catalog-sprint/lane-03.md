# Catalog Sprint — Lane 03 Desks & Tech

STATUS: **DESKS 2–6 INDEPENDENTLY ACCEPTED — PRESERVE EXACT HASHES; DESKS 7–12 HOLD — NO SPECULATIVE REPLACEMENT**

Branch: `screenshot-match-preproduction`  
Workstream: 03  
Allocation: `ART_AND_VISUALS_ONLY`  
Observed coordination head before this analysis: `f5f92e015379fc490b4fcedb00482c77d3ee6da3`  
Independent Desk reviewer: **05**  
Canonical catalog writer: **08 only**  
Cross-owner coordinator: **15 only**

## Useful reconciliation this cycle

Current reviewer-05 evidence preserves **ACCEPT** decisions for the exact current Desk 2–6 hashes. Lane 03 therefore freezes all five accepted replacements and does not regenerate or restyle them.

No Desk 7–12 replacement was generated. The current authoritative evidence contains no exact reviewer-05 REWORK for those IDs and no explicit unfinished Desk 7–12 assignment from 15. Legacy age alone is not permission to replace them.

Because the Desk lane had no actionable repair, this cycle used spare capacity for bounded Home visual analysis only. No Home runtime/CSS, asset bytes, canonical manifest/runtime, player state, learning content, prices/unlocks, or reference images changed, so tests/build were not redundantly rerun.

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

Desk 2–4 current PNG replacements and Desk 5–6 current JPEG replacements are accepted exact hashes and must not be replaced or churned by producer lane 03. Workstream 08 alone may perform canonical wiring after its own metadata/file/content checks; Workstream 03 does not modify manifest/runtime mappings.

### Superseded Desk 2–4 files — never select for current review

- `desks-2-v1.webp` — `357f4ba8385e737499f12409c0bea141f9bc5e6a`
- `desks-3-v1.webp` — `b3352961988d7e9c5ff48d1559fc4d2296d4eab3`
- `desks-4-v1.webp` — `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2`

Those old WebP blobs remain audit history only. They were superseded after invalid-signature/nondecoding evidence and must never displace the accepted current PNG hashes above.

## Bounded Home reference analysis — no runtime edits

Evidence inspected in this cycle:

- immutable reference: `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`, normalized comparison `home-desktop-1408x1056.png`;
- latest preserved running-browser Home diagnostic used by reviewer 14: workflow `35663655650`, artifact `10668287632`, including `home-desktop-1408x1056.png` and `home-phone-390x844.png`;
- current environment candidate under reviewer-14 composition review: `home-bedroom-w13-v2`, desktop exact blob `2806e8282923efb1b0dc467cbae7139b8d3f339b`;
- independent composition verdict: `docs/preproduction/visuals/chat-home-bedroom-w13-v2-composition-performance-14-to-15.json` = **REWORK_COMPOSITION_BEFORE_RUNTIME_INTEGRATION**.

### What the reference is doing visually

1. **The room is the canvas, not a secondary panel.** The reference carries warm bedroom pixels all the way behind the top HUD, with the left window as the brightest architectural source. It does not create a large visually dead header separating HUD from room.
2. **Depth is layered around a deliberately open hero corridor.** Bed and side furniture anchor the left, desk/shelving anchor the right, and the avatar/buddy occupy the clear middle floor plane. Foreground rug, furniture contact shadows, window light, textile softness and shelf depth keep the room dimensional without competing with the hero.
3. **The five-tier Room Progress strip is image-led.** Five room previews establish progression at a glance; text is subordinate to visual tier differentiation. The strip sits top-center over comparatively calm wall/room pixels.
4. **The Dream Goal card is aspirational-room-led.** Its large room image carries the emotional payoff; bullets and the CTA are secondary. The reference therefore feels like a bedroom world with UI floating over it, not a dashboard with a decorative background.
5. **Bottom UI is dense but visually separated.** Daily Quests, Customize Me, Today I’m Learning and the motivational card use high-contrast blue containers, while their thumbnails/icons stay bright and materially distinct from the room. This preserves scan order despite the amount of information.

### Current running Home gap visible in preserved browser evidence

The preserved running desktop capture is materially farther from the reference in **material/depth language** than in raw panel inventory. It already contains the expected Home modules, but the room itself reads flatter and more diagrammatic: large simplified color fields, low furniture/material response and much weaker window/floor depth than the reference. The large opaque navy header in that preserved capture also visually detaches the HUD from the bedroom, whereas the reference integrates HUD and room into one continuous composition. This capture is retained only as a placement/material diagnostic; Home structural geometry is currently green elsewhere and must not be reopened from this older diagnostic alone.

On the preserved 390px phone capture, Room Progress dominates the first viewport and the hero is pushed below it. Because no phone original was supplied, this is **not** an exact-parity failure claim. It does show why a Home background must tolerate a narrow center crop without placing bed/chair/plant silhouettes directly behind the hero.

### Current Home bedroom v2 candidate: what to preserve

The v2 environment is a large visual improvement over the preserved running background in the exact areas the reference depends on:

- believable rounded furniture volumes and visible table/bed thickness;
- warm wood, textile and painted-surface response instead of flat vector planes;
- clear floor contact/shadows and directional left-window lighting;
- bed-left / desk-right architecture that matches the reference composition language;
- a calm upper-center wall suitable for Room Progress/hero overlays;
- no baked UI, avatar, counters or fake player state.

Those qualities should survive the v3 repair. The remaining defect is composition, not a reason to reset the art direction.

### Smallest Home composition repair supported by the pixels

Reviewer 14's fresh decision is consistent with the direct pixel comparison: **keep v2's palette/material/light recipe, but open the lower center.** The bed/footboard reaches too far into the lower hero zone from the left and the chair/plant combination intrudes from the right. For the v3 environment assigned to Workstream 13, the repair should keep approximately `x=36–64%` visually quiet through the lower half, while preserving the left bed and right desk as edge anchors. A separate phone-oriented derivative/crop is preferable to center-covering the 4:3 desktop asset because center-cover retains both intrusions in the likely hero region.

Lane 03 does **not** own that asset repair. This analysis is a bounded handoff to 13/15 only; no shared Home CSS/runtime or scene files were edited here.

## Checks performed this cycle

- **PASS** — read `ART_VISUALS_SPRINT.json` before older mission text.
- **PASS** — re-read latest coordination head `f5f92e0...` before writing.
- **PASS** — re-read current reviewer-05 evidence; Desk 2–6 exact hashes remain accepted.
- **PASS** — 15's current coordination assigns the Home v3 corridor/mobile derivative repair to Workstream 13, not 03.
- **PASS** — no accepted Desk was regenerated, overwritten, restyled or re-reviewed.
- **PASS** — no speculative Desk 7–12 production started.
- **PASS** — directly inspected actual reference pixels, preserved running desktop/phone Home pixels and the current v2 environment candidate pixels.
- **NOT RERUN by design** — tests/build; this cycle changed owned documentation only, not runtime or asset bytes.
- **NOT ATTEMPTED by design** — canonical wiring; owner 08 only.
- **NOT ATTEMPTED by design** — shared Home runtime/CSS or environment edits; 15/13 ownership preserved.

## Handoff

1. **08:** preserve/consume independently accepted Desk hashes under normal metadata/file/content checks; 03 does not canonical-wire them.
2. **03:** preserve Desk 2–6. Do not regenerate any of those exact accepted versions.
3. **03 / 15:** Desk 7–12 remain on hold until reviewer 05 publishes an exact current REWORK or 15/current authoritative evidence explicitly assigns an unfinished Desk. If assigned, repair only that bounded 2–4 item batch.
4. **13 / 15:** for Home v3, preserve v2 material/light quality and bed-left/desk-right language, but clear the lower hero corridor and provide a deliberate phone derivative/crop. Do not wire v2 as-is; reviewer 14's current composition decision is REWORK.
5. **03:** do not edit shared Home runtime/CSS or claim Home acceptance until 15 assigns a specific 03-owned screen/module change.

**Replit/Floot/main/deploy/paid settings were not touched. Player data, saves, learning, Store IDs, prices/unlocks, canonical manifest/runtime and original reference files were not changed.**
