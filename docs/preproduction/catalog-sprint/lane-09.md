# Catalog Sprint — Lane 09 Room Decor + Tops Repair Batch

STATUS: **READY FOR REVIEW — decor-1..12 preserved; tops-7..tops-12 replacement candidates staged**

Branch: `screenshot-match-preproduction`  
Workstream: 09  
Phase: `CATALOG_SPRINT`  
Environment/background work: **paused**  
Canonical manifest/runtime: **not changed by this lane**  
Self-approval: **NO**

## Current ownership and changed inputs

Primary production assignment remains `decor-1..decor-12`. Current sprint state also explicitly assigns Workstream 09 the secondary repair set `tops-7..tops-12` after Reviewer 01 rejected the legacy Tops family for flat frontal/vector treatment below the premium dimensional collectible target.

Reviewer 14 has now completed independent actual-pixel review for Lighting, Wall and Rugs: 36/48 of its assigned items are reviewed and all 36 are REWORK. `decor-1..decor-12` are the final 12 still awaiting Reviewer-14 item-level decisions. Because no Decor exact-hash REWORK decision exists yet, this pass correctly preserved all Room Decor bytes rather than regenerating them preemptively.

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

Previous producer render evidence remains valid for unchanged sampled Decor hashes: those candidates rendered at 800×800 and 220×220 without clipping. That proves renderability only. The producer-observed risk remains that current Decor art is flatter/vector-like than the premium dimensional target; Reviewer 14 must convert that concern into exact item-level `ACCEPT | REWORK | BLOCKED` decisions.

## Completed Tops 7–12 repair assignment

All six currently assigned Tops repairs are now versioned, repository-stored, and read back by exact Git blob while preserving their rejected legacy files.

| ID | Item | Tier / Theme | Replacement | Git blob | Bytes | Key dimensional repair |
| --- | --- | --- | --- | --- | ---: | --- |
| `tops-7` | Colorblock Hoodie | 3 / Aqua Wave | `/assets/catalog/tops-7-w09-v2.svg` | `fe5b33a5b8eb8de137abab7daf315ddfaaaaf408` | 4180 | angled pose, separate hood cavity, side material plane, layered colorblock panels, folds and shadow |
| `tops-8` | Puffer Vest | 3 / Art Attack | `/assets/catalog/tops-8-w09-v2.svg` | `81bbec69f1e164b9772e0f867409581526f5255a` | 3973 | angled silhouette, lofted quilt bands, collar/side plane, zipper hardware, art-swatch detail |
| `tops-9` | Art Smock | 3 / Star Luxe | `/assets/catalog/tops-9-w09-v2.svg` | `232c5db97964d710489c4e32bc7c87d4a985efc1` | 3861 | dimensional textile planes, gold trim, split pocket, brushes/palette and fabric highlights |
| `tops-10` | Star Bomber | 4 / Midnight Neon | `/assets/catalog/tops-10-w09-v2.svg` | `233739b22d0f3395b02bc51f57fb1f36afc41993` | 4208 | bomber volume, side plane, metal zipper/pockets, cyan-pink neon piping, ribbed hem and layered crest |
| `tops-11` | Cloud Jacket | 4 / Candy Core | `/assets/catalog/tops-11-w09-v2.svg` | `9e29094190a1c1867e94d44ef1c4134140447191` | 4217 | plush multi-lobe cloud collar, candy material gradients, zipper hardware, seams/pockets and dimensional side plane |
| `tops-12` | Star Coat | 5 / Adventure Club | `/assets/catalog/tops-12-w09-v2.svg` | `1788cfb30ffd70d71bf182f01f137f9d241200fa` | 4536 | long hero coat, layered gold lapels/lining, leather expedition pockets, gold trim/buttons, badges and premium star crest |

The new `tops-9..12` replacements directly address Reviewer 01’s exact legacy-hash defects: Art Smock now has layered garment/tool/pocket treatment; Star Bomber has richer Tier-4 construction, hardware and restrained neon; Cloud Jacket has explicit plush cloud volume and candy-luxe material response; Star Coat has a more elaborate Tier-5 adventure/luxe structure with layered lapels, trim, pockets and hero detailing.

All six candidates are original self-contained StarBlox SVGs with `800×800` viewBoxes. They do not embed external images or fonts and contain no third-party brands/characters, Roblox/Brookhaven content, emoji, or copied promotional art. Old files remain intact for comparison/revert.

## Validation and evidence

- **PASS — assignment:** current state assigns `tops-7..tops-12` repair production to Workstream 09.
- **PASS — prior versions preserved:** none of `tops-7.svg` through `tops-12.svg` was overwritten.
- **PASS — repository persistence/readback:** all six replacement paths exist on the current branch with exact Git blob identities.
- **PASS — measured Git-tree byte sizes:** 4180, 3973, 3861, 4208, 4217 and 4536 bytes respectively.
- **PASS — exact metadata:** names, tiers and themes remain bound to current catalog metadata.
- **PASS — 800×800 canvas contract:** all six replacements declare `viewBox="0 0 800 800"`.
- **PENDING — independent rendered acceptance:** Reviewer 01 must judge each replacement’s new exact hash from actual pixels. Old-hash REWORK decisions do not transfer automatically.
- **PENDING — shared replacement fixture evidence:** Workstream 14 has expanded the staged-art renderer; Workstream 09 is not claiming producer pixel acceptance merely from source/readback.
- **PENDING — Decor review:** Reviewer 14 still owes `decor-1..12` exact-hash pixel decisions before Workstream 09 may replace any current Decor candidate.
- **NOT RUN — full tests/build:** this pass changed only versioned asset candidates and lane documentation, not canonical runtime/manifest mappings.
- **PASS — scope isolation:** no gameplay, save/economy, learning, screen CSS/runtime, canonical catalog mapping, Replit/Floot, `main`, deployment or player-data changes.

## Handoff

**01:** prioritize actual-pixel review of the six Workstream-09 replacement hashes listed above. They are new versions and require fresh hash-bound decisions.

**14:** `decor-1..12` are now the remaining unreviewed 12 items in your 48-item partition. Issue exact-hash pixel decisions; Workstream 09 will repair only concrete REWORK versions.

**08:** no Workstream-09 Tops replacement may be wired until Reviewer 01 accepts that exact current hash. Workstream 09 did not edit `catalog-art-manifest.json` or `src/catalogArtRuntime.js`.

**15:** the currently explicit `tops-7..tops-12` secondary repair assignment is complete at candidate-staging level. Workstream 09 remains available for its primary Decor lane after Reviewer 14 decisions, or for a new non-self-reviewed exact repair assignment after current in-flight versions are reconciled.

Replit/Floot were not used. `main` was not merged or modified. Environment/background work remains paused until the catalog gate passes.
