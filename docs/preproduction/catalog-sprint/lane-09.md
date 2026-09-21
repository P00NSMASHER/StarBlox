# Catalog Sprint — Lane 09 Room Decor + Assigned Tops Repair Batch

STATUS: **READY FOR REVIEW — decor-1..12 preserved; tops-7/tops-8 replacement candidates staged**

Branch: `screenshot-match-preproduction`  
Workstream: 09  
Phase: `CATALOG_SPRINT`  
Environment/background work: **paused**  
Canonical manifest/runtime: **not changed by this lane**  
Self-approval: **NO**

## Current ownership read from state

Primary production assignment remains `decor-1..decor-12`. The latest `CATALOG_SPRINT_STATE.json` also gives Workstream 09 an explicit secondary repair assignment for `tops-7..tops-12`, after Reviewer 01 rejected the existing Tops family for flat frontal/vector treatment below the dimensional collectible target.

The current Room Decor candidates remain preserved exactly as staged. Reviewer 14 owns their independent actual-pixel decisions. Because no decor REWORK decision has been issued yet, this pass did **not** regenerate pending decor merely for activity.

## Room Decor candidates preserved

| ID | Item | Tier | Theme | Blob | Bytes |
| --- | --- | ---: | --- | --- | ---: |
| `decor-1` | Book Crate | 1 | Midnight Neon | `81999ed9d9b289bd2137cac690a36e8e99d03824` | 2742 |
| `decor-2` | Cloud Shelf | 1 | Candy Core | `c07d57b318bfed909f22e11427e389cb26490696` | 2076 |
| `decor-3` | Arcade Mini | 1 | Adventure Club | `4fc2f591915f53b249956c20c50693ad22e3a1bb` | 2308 |
| `decor-4` | Plush Stack | 2 | Cloud Pop | `cb4bc4cfca9bdd4764905fdf94aa8291605f1ce0` | 2461 |
| `decor-5` | Plant Wall | 2 | Pixel Party | `0f7559a576177758d94dba1c3da27373a9151a2b` | 2332 |
| `decor-6` | Telescope | 2 | Berry Blast | `3a8d81ea490f8bac42ef2147797a3926d69df9ef` | 2464 |
| `decor-7` | Skate Rack | 3 | Garden Glow | `671c609625400bf5c2142daef73ab632bd1225a2` | 2317 |
| `decor-8` | Mini Aquarium | 3 | Galaxy Glow | `87e33d5190b7a7ef21e23ae875dda8ae1808c4be` | 2550 |
| `decor-9` | Easel Set | 3 | Sunny Pop | `5c95b853da763f7ff2e9e332169ea5841ac1885e` | 2390 |
| `decor-10` | Mini Fridge | 4 | Aqua Wave | `f390a4a237605f8768111efc65c85d059529a690` | 2365 |
| `decor-11` | Dream Vanity Set | 4 | Art Attack | `250aad2e72917036ae03c1db3e9071ae6c7aa983` | 2876 |
| `decor-12` | Trophy Wall | 5 | Star Luxe | `903e0f5d45dd6874c4352493db3e3e3346e0b39c` | 3115 |

Previous producer pixel evidence still applies to the unchanged Room Decor hashes: a representative cross-tier sample rendered successfully at 800×800 and 220×220 without clipping. That evidence is renderability only, not independent acceptance. The producer-observed fidelity concern remains: these assets are clean and recognizable but visibly flatter/vector-like than the premium dimensional target, so Reviewer 14 still needs to convert that concern into item-level `ACCEPT | REWORK | BLOCKED` decisions.

## New secondary repair micro-batch

This pass repaired two exact Reviewer-01 REWORK items while preserving the original versions for comparison.

### `tops-7` — Colorblock Hoodie — Tier 3 / Aqua Wave

Reviewer defect: the current hoodie is a flat frontal family treatment and needs stronger hood/body dimensionality, seams/folds, material variation and three-quarter collectible framing.

- prior: `/assets/catalog/tops-7.svg`
- prior blob: `5ae692e97f583f8644a4f8c430b07462de3d46df`
- prior bytes: `1677`
- replacement candidate: `/assets/catalog/tops-7-w09-v2.svg`
- new blob: `fe5b33a5b8eb8de137abab7daf315ddfaaaaf408`
- bytes: `4180`
- canvas: `800×800` SVG viewBox
- creation commit: `8e5d0b8249a7f1bd1af16175fca5bf6f6f34ada3`

The replacement changes the presentation substantially rather than recoloring the old icon: angled collectible pose, separate hood cavity, stronger front/side material planes, layered aqua/violet/pink color-block construction, seams/fold highlights, and a stronger cast shadow.

### `tops-8` — Puffer Vest — Tier 3 / Art Attack

Reviewer defect: the existing puffer sections do not convincingly read as lofted/quilted material; the item needs stronger cushion volume, panel highlights/shadows, zipper/opening construction and art-theme detail.

- prior: `/assets/catalog/tops-8.svg`
- prior blob: `5f3f1b1efeab3722616b7a14acfc0155bea10724`
- prior bytes: `1601`
- replacement candidate: `/assets/catalog/tops-8-w09-v2.svg`
- new blob: `81bbec69f1e164b9772e0f867409581526f5255a`
- bytes: `3973`
- canvas: `800×800` SVG viewBox
- creation commit: `398b35fff3910d243040b5fe6fd829dd38ab3512`

The replacement uses an angled vest silhouette, separate collar and side plane, repeated quilt/puff highlight-shadow bands, explicit center zipper treatment, small art-swatch details and stronger object shadow/volume.

Both replacements are original StarBlox artwork authored from the exact independent review defects. They contain no external raster images, external fonts, brand marks, third-party characters, Roblox/Brookhaven content, emoji, or copied promotional imagery.

## Validation performed this pass

- **PASS — current ownership:** latest state explicitly assigns `tops-7..tops-12` repair production to Workstream 09.
- **PASS — original versions preserved:** `tops-7.svg` and `tops-8.svg` were not overwritten.
- **PASS — repository persistence/readback:** both new candidate paths read back from the branch with exact Git blob identities.
- **PASS — exact metadata:** IDs/names/tiers/themes remain Colorblock Hoodie / Tier 3 / Aqua Wave and Puffer Vest / Tier 3 / Art Attack.
- **PASS — measured byte sizes:** 4180 and 3973 bytes from the Git tree.
- **PASS — 800×800 canvas contract:** both replacement files use `viewBox="0 0 800 800"`.
- **PENDING — actual independent rendered acceptance:** Reviewer 01 must render and judge these new exact hashes; the earlier REWORK decisions apply only to the old hashes.
- **NOT TESTED — producer raster/card-scale render for these replacements in this pass:** repository readback is proven, but this lane is not claiming pixel approval without an actual rendered artifact.
- **NOT RUN — full tests/build:** this is an asset-only repair micro-batch with no runtime/manifest change.
- **PASS — scope isolation:** no catalog manifest/runtime, gameplay, save/economy, learning, screen CSS, environment runtime, Replit/Floot, `main`, deployment or player-data changes.

## Handoff

**01:** prioritize actual-pixel review of the new exact hashes `fe5b33a5...` (`tops-7`) and `81bbec69...` (`tops-8`). These are new versions and require fresh hash-bound decisions; do not reuse the old-hash rejection.

**14:** `decor-1..12` remain unchanged and pending your independent room-art review. The producer concern about flat/vector material depth remains actionable review guidance, not self-rejection.

**08:** do not wire the new Tops replacements until Reviewer 01 accepts their current hashes. Workstream 09 did not touch `catalog-art-manifest.json` or `src/catalogArtRuntime.js`.

**15:** Workstream 09 has begun the explicit `tops-7..tops-12` secondary repair assignment with a two-item versioned batch. Remaining assigned repairs are `tops-9..tops-12`; any new reviewer feedback should take priority before the next batch.

Replit/Floot were not used. `main` was not merged or modified. Environment/background work remains paused until the catalog gate passes.
