# Catalog Sprint — Lane 09 Room Decor + Tops Repair Batch

STATUS: **PIXEL EVIDENCE DELIVERED — decor-1..12 preserved; tops-7..12 replacements staged; reviewer decisions pending**

Branch: `screenshot-match-preproduction`  
Workstream: 09  
Phase: `CATALOG_SPRINT`  
Environment/background work: **paused**  
Canonical manifest/runtime: **not changed by this lane**  
Self-approval: **NO**

## Current ownership and changed inputs

Primary production assignment remains `decor-1..decor-12`. Current sprint state also explicitly assigns Workstream 09 the secondary repair set `tops-7..tops-12` after Reviewer 01 rejected the legacy Tops family for flat frontal/vector treatment below the premium dimensional collectible target.

Reviewer 14 still has item-level decisions for Lighting, Wall and Rugs but not Decor. `decor-1..decor-12` therefore remain unchanged pending Reviewer-14 exact-hash disposition. Workstream 09 does not convert producer observations into `ACCEPT` or `REWORK` decisions.

The important new evidence in this pass is that the generalized staged-art fixture has now completed successfully and contains real rendered pixels for every current Decor hash plus the `tops-7` and `tops-8` Workstream-09 replacement hashes.

## Shared actual-pixel evidence now available

GitHub Actions staged-art run **35654620624** on source head `acbc6035da9d57bc88043604caa5ec0b6352398e` completed **SUCCESS**. Artifact **10663298893** (`catalog-staged-art-review`) has digest `sha256:f2c0d3d3aa251f5e1934017a7c61acf644e8876ab1e1a5b0c37e7f06ffb8e9db`.

The artifact `report.json` records **no errors**, `replacementCount: 16`, and exact replacement IDs/hashes. For `decor-1..decor-12`, every current repository path returned HTTP 200, every item produced a screenshot, every per-item error array is empty, and the Decor contact-sheet error list is empty.

Useful immutable render references from that artifact:

- Decor contact sheet: `decor/decor-contact-sheet.png`, SHA-256 `a2d97ea1353c692f148954d88d33fa892e5ad121988a7037305e34e75a1d7f2c`.
- `decor-1` detail: `decor/detail/decor-1-81999ed9.png`, SHA-256 `5fb95cc00d53804d33f0aa734d68a8331ffe6b2b41581f6e2eab1530ecfbb660`.
- `decor-12` detail: `decor/detail/decor-12-903e0f5d.png`, SHA-256 `29e406da8b34285b0cfc89d7339fe787a4c0cc7d8d34d7cde80e42acae73aa8e`.
- Staged-replacement contact sheet: `staged-replacements/staged-replacements-contact-sheet.png`, SHA-256 `cea0fea5dd18ebab4867845ec531c84ac43030b54a5d2dc43cf0ac01b44d09c3`.
- `tops-7` replacement detail for exact blob `fe5b33a5b8eb8de137abab7daf315ddfaaaaf408`: `staged-replacements/detail/tops-7-fe5b33a5.png`, SHA-256 `7e855b4036c72b1131a29d6cdfbc3cfa3958482b177a1eafea30ec65cf9359e4`.
- `tops-8` replacement detail for exact blob `81bbec69f1e164b9772e0f867409581526f5255a`: `staged-replacements/detail/tops-8-81bbec69.png`, SHA-256 `8b1d284a2fc801764e86ed651b2ee92bfe75cd4df042c2d489c64521cc7fc0a8`.

Producer-side inspection of the Decor contact sheet confirms the earlier risk signal: identities are readable, but the family still presents largely as flat front-facing/vector objects on shared gradient cards with limited material depth and tier spectacle. That observation is **not** independent review. Reviewer 14 must issue the authoritative exact-hash `ACCEPT | REWORK | BLOCKED` decisions before Workstream 09 changes any Decor asset.

The same fixture gives Reviewer 01 qualified actual-pixel evidence for `tops-7` and `tops-8`; their old legacy-hash decisions do not transfer. `tops-9..tops-12` were committed after the fixture source head and are therefore **not** present in artifact 10663298893. They remain staged/read-back candidates awaiting the next shared fixture render and fresh Reviewer-01 exact-hash decisions.

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

All 12 exact current hashes now have shared actual-pixel card/detail evidence available to Reviewer 14. No Decor bytes were replaced in this pass because the required independent item-level decision has not yet been recorded.

## Completed Tops 7–12 repair assignment

All six currently assigned Tops repairs are versioned, repository-stored, and read back by exact Git blob while preserving their rejected legacy files.

| ID | Item | Tier / Theme | Replacement | Git blob | Bytes | Pixel evidence state |
| --- | --- | --- | --- | --- | ---: | --- |
| `tops-7` | Colorblock Hoodie | 3 / Aqua Wave | `/assets/catalog/tops-7-w09-v2.svg` | `fe5b33a5b8eb8de137abab7daf315ddfaaaaf408` | 4180 | **PASS — fixture detail + contact sheet available** |
| `tops-8` | Puffer Vest | 3 / Art Attack | `/assets/catalog/tops-8-w09-v2.svg` | `81bbec69f1e164b9772e0f867409581526f5255a` | 3973 | **PASS — fixture detail + contact sheet available** |
| `tops-9` | Art Smock | 3 / Star Luxe | `/assets/catalog/tops-9-w09-v2.svg` | `232c5db97964d710489c4e32bc7c87d4a985efc1` | 3861 | pending next fixture |
| `tops-10` | Star Bomber | 4 / Midnight Neon | `/assets/catalog/tops-10-w09-v2.svg` | `233739b22d0f3395b02bc51f57fb1f36afc41993` | 4208 | pending next fixture |
| `tops-11` | Cloud Jacket | 4 / Candy Core | `/assets/catalog/tops-11-w09-v2.svg` | `9e29094190a1c1867e94d44ef1c4134140447191` | 4217 | pending next fixture |
| `tops-12` | Star Coat | 5 / Adventure Club | `/assets/catalog/tops-12-w09-v2.svg` | `1788cfb30ffd70d71bf182f01f137f9d241200fa` | 4536 | pending next fixture |

The new `tops-9..12` replacements directly address Reviewer 01’s exact legacy-hash defects: Art Smock has layered garment/tool/pocket treatment; Star Bomber has richer Tier-4 construction, hardware and restrained neon; Cloud Jacket has explicit plush cloud volume and candy-luxe material response; Star Coat has a more elaborate Tier-5 adventure/luxe structure with layered lapels, trim, pockets and hero detailing.

All six candidates are original self-contained StarBlox SVGs with `800×800` viewBoxes. They do not embed external images or fonts and contain no third-party brands/characters, Roblox/Brookhaven content, emoji, or copied promotional art. Old files remain intact for comparison/revert.

## Validation and evidence

- **PASS — assignment:** current state assigns `tops-7..tops-12` repair production to Workstream 09.
- **PASS — prior versions preserved:** none of `tops-7.svg` through `tops-12.svg` was overwritten.
- **PASS — repository persistence/readback:** all six replacement paths exist on the current branch with exact Git blob identities.
- **PASS — measured Git-tree byte sizes:** 4180, 3973, 3861, 4208, 4217 and 4536 bytes respectively.
- **PASS — exact metadata:** names, tiers and themes remain bound to current catalog metadata.
- **PASS — 800×800 canvas contract:** all six replacements declare `viewBox="0 0 800 800"`.
- **PASS — Decor shared render evidence:** all 12 current exact Decor hashes rendered with HTTP 200, screenshots present, and no fixture item/contact-sheet errors in run 35654620624.
- **PASS — Tops 7–8 replacement shared render evidence:** exact replacement hashes are present in artifact 10663298893 at card/detail scale.
- **PENDING — Tops 9–12 shared render evidence:** committed after fixture source head `acbc6035...`; require next staged-art render.
- **PENDING — independent rendered acceptance:** Reviewer 01 must judge each Tops replacement’s current hash; Reviewer 14 must judge Decor exact hashes. Producer pixel inspection is not acceptance.
- **NOT RUN — full tests/build:** no canonical runtime/manifest mapping changed in this evidence-only pass.
- **PASS — scope isolation:** no gameplay, save/economy, learning, screen CSS/runtime, canonical catalog mapping, Replit/Floot, `main`, deployment or player-data changes.

## Handoff

**01:** artifact 10663298893 now supplies qualified actual-pixel evidence for `tops-7` blob `fe5b33a5…` and `tops-8` blob `81bbec69…`. Review those exact replacements immediately. `tops-9..12` need the next shared fixture render before exact-hash disposition.

**14:** artifact 10663298893 contains card/detail evidence for all 12 current Decor hashes with zero report errors. Decor is your final unreviewed 12-item partition; issue exact-hash `ACCEPT | REWORK | BLOCKED` decisions. Workstream 09 will repair only concrete current-hash REWORK.

**08:** no Workstream-09 replacement may be wired until its assigned independent reviewer accepts the exact current hash. Workstream 09 did not edit `catalog-art-manifest.json` or `src/catalogArtRuntime.js`.

**15:** the Tops 7–12 production assignment is complete at staging level. This pass removed the missing-pixel-evidence blocker for Decor and Tops 7–8. The remaining Workstream-09 critical dependencies are Reviewer-14 Decor decisions, Reviewer-01 Tops 7–8 decisions, and a new staged-art fixture capture for Tops 9–12.

Replit/Floot were not used. `main` was not merged or modified. Environment/background work remains paused until the catalog gate passes.
