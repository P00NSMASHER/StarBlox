# Catalog Sprint — Lane 05 Wall Decor

STATUS: **READY FOR REVIEW — 12/12 ASSIGNED WALL CANDIDATES STAGED**

Branch: `screenshot-match-preproduction`  
Workstream: 05  
Phase: `CATALOG_SPRINT`  
Quest UI work: **paused by catalog-first directive**  
Canonical manifest/runtime: **not changed by this lane**  
Self-approval: **NO**  
Independent review required: **Workstream 01 and/or 14**  
Canonical integration owner: **Workstream 08**

## Scope completed

The complete assigned wall-decor lane, `wall-1` through `wall-12`, now has original StarBlox-specific 800×800 SVG candidates staged under `public/assets/catalog/`. The family intentionally avoids text-heavy/generated lettering and uses distinct object compositions rather than one generic frame recolored twelve times.

| ID | Item | Tier | Theme | Asset | Git blob | Bytes |
| --- | --- | ---: | --- | --- | --- | ---: |
| wall-1 | School Star Poster | 1 | Garden Glow | `/assets/catalog/wall-1.svg` | `aedaec3bbb44bd966e62d897ea0ccc5a64b14bd8` | 2743 |
| wall-2 | Cloud Wall Flag | 1 | Galaxy Glow | `/assets/catalog/wall-2.svg` | `2dd6f4f09bd201e1e03582cb2b8990930f934d39` | 1905 |
| wall-3 | Pixel Scoreboard | 1 | Sunny Pop | `/assets/catalog/wall-3.svg` | `3419da96bd482ef0300acce28363662ec45abddf` | 1899 |
| wall-4 | Heart Gallery | 2 | Aqua Wave | `/assets/catalog/wall-4.svg` | `269b888dffce8aa2ac6cc9f885960d7c5e3d70b5` | 1766 |
| wall-5 | Garden Garland | 2 | Art Attack | `/assets/catalog/wall-5.svg` | `e9db285a837784a875642c0b56a7964873d79a5d` | 2223 |
| wall-6 | Planet Map | 2 | Star Luxe | `/assets/catalog/wall-6.svg` | `d31b39482cce122c9030e8105592d89be3f6fd33` | 1662 |
| wall-7 | Skate Poster | 3 | Midnight Neon | `/assets/catalog/wall-7.svg` | `f291c8368d4218603e3afe957662c3d37c5ca62a` | 1871 |
| wall-8 | Ocean Window | 3 | Candy Core | `/assets/catalog/wall-8.svg` | `d50201ae8eb39ea26cffc8b7c85686cf6b4b7baa` | 1606 |
| wall-9 | Art Gallery Wall | 3 | Adventure Club | `/assets/catalog/wall-9.svg` | `0a83f6684de27c0ac31057d600bb24e2a3e5a183` | 1674 |
| wall-10 | Neon City Sign | 4 | Cloud Pop | `/assets/catalog/wall-10.svg` | `df566297cc638fbcf1673d799a7ffb9e1f586927` | 1639 |
| wall-11 | Star Mirror | 4 | Pixel Party | `/assets/catalog/wall-11.svg` | `d0609238147f8d63e58662efe9755abbaecc39e1` | 1853 |
| wall-12 | Golden Crest | 5 | Berry Blast | `/assets/catalog/wall-12.svg` | `84a7eeb0f909572fe9e896b912b675990187ae48` | 1747 |

All twelve candidates use an 800×800 SVG viewBox, are self-contained, and contain no external image/font references, brand marks, recognizable third-party characters, Roblox/Brookhaven assets, emoji, or initials-as-art.

## Visual differentiation

- `wall-1` is a framed school-star achievement poster with school-tool motifs.
- `wall-2` is a pointed pennant with a dimensional cloud emblem.
- `wall-3` is a dark pixel-scoreboard panel with tiled score lights.
- `wall-4` is an asymmetric multi-frame heart gallery.
- `wall-5` is a leaf-and-flower hanging garland with suspended star ornaments.
- `wall-6` is an orbital planet-map plaque with a ringed world and satellites.
- `wall-7` is a neon skateboard poster with glowing wheels and diagonal movement.
- `wall-8` is a deep-set ocean window with layered waves and fish.
- `wall-9` is a multi-frame gallery wall with varied abstract scenes.
- `wall-10` is a glowing dimensional city-skyline sign.
- `wall-11` is a star-shaped framed mirror with reflective highlights.
- `wall-12` is an ornate Tier-5 heraldic golden crest with a luminous star centerpiece.

The family increases spectacle and ornamental density toward the higher tiers without deliberately making the Tier-1 items unattractive.

## Validation actually performed

- **PASS — exact catalog metadata:** IDs, names, tiers and themes were matched to current `src/gameModel.js` metadata.
- **PASS — repository presence:** GitHub readback confirms all 12 asset paths exist on the preproduction branch.
- **PASS — asset identity:** all 12 have distinct Git blob SHAs and recorded byte sizes.
- **PASS — 800×800 canvas contract:** every candidate declares `viewBox="0 0 800 800"`.
- **PASS — XML syntax before write:** each authored SVG parsed successfully in an isolated local XML check before upload.
- **PASS — scope isolation:** this lane did not edit `catalog-art-manifest.json`, `src/catalogArtRuntime.js`, Quest learning/UI code, save/economy code, question content, answer keys, evidence, or rewards.
- **NOT TESTED — rendered card-scale visual review:** no branch-local raster/contact-sheet renderer was available in this lane.
- **NOT TESTED — Store browser render:** Workstream 14/10 owns independent browser/card-scale verification.
- **NOT RUN — full production build / full test suite:** no shared runtime or manifest code was changed by this lane.
- **PENDING — independent visual approval:** these assets are candidates only; no item is self-promoted to final-portable or visually accepted by Workstream 05.

## Handoff / blockers

1. Workstream 01 and/or Workstream 14 should render and inspect the actual asset bytes at Store-card/detail scale, binding approval to the recorded Git blob SHA for each ID.
2. Any item judged REWORK should return with an exact visual defect; preserve the current candidate for comparison rather than overwriting without review evidence.
3. Workstream 08 should update the canonical manifest and exact-ID runtime mapping **only for independently accepted candidates**.
4. Workstream 15 may reassign Lane 05 after the review/integration needs for `wall-1..wall-12` are reconciled. This file is the lane's reassignment request; Lane 05 will not take another category or resume Quest work early.
5. The absence of a rendered independent review is the only reason this lane is not marked final. Schema validity and file presence alone are not premium-art acceptance.

**Replit/Floot were not used. `main` was not merged or modified.**
