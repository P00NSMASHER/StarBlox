# Catalog Sprint — Lane 06 Companions

STATUS: **READY FOR REVIEW — 11/11 ASSIGNED EXISTING COMPANION CANDIDATES INSPECTED**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Avatar anatomy/UI work: **paused by catalog-first directive**  
Canonical manifest/runtime: **not changed by this lane**  
Self-approval: **NO**  
Independent review required: **Workstream 01 and/or 14**  
Canonical integration owner: **Workstream 08**

## Scope completed

The assigned companion lane, `companions-2` through `companions-12`, already had repo-owned SVG assets present before this run. This pass inspected the **actual SVG source for every assigned asset** plus current catalog metadata and Git object identity rather than regenerating them merely because the manifest calls them `interim-not-verified`.

No file was missing and no concrete source-level defect was found that justified replacing original art before independent rendered review. Therefore **0 assets were regenerated or overwritten**. All 11 remain candidates only and are staged as `READY_FOR_REVIEW`; the canonical manifest still correctly retains their interim state until a different reviewer accepts the rendered appearance.

`companions-1` Sprout Pup remains the preserved final companion and was not changed.

| ID | Item | Tier | Theme | Price | Stars | Asset | Git blob | Bytes |
| --- | --- | ---: | --- | ---: | ---: | --- | --- | ---: |
| companions-2 | Moon Cat | 1 | Pixel Party | 45 | 0 | `/assets/catalog/companions-2.svg` | `45b5e59ea5bb28dbc3d8c325f313ec4b92ef8005` | 1968 |
| companions-3 | Berry Bunny | 1 | Berry Blast | 65 | 0 | `/assets/catalog/companions-3.svg` | `c0e69b68240cb91c00dd16c2784b3d5c7c41c4fb` | 2068 |
| companions-4 | Sunny Bird | 2 | Garden Glow | 85 | 0 | `/assets/catalog/companions-4.svg` | `16e50e59ba950076bf0ecc512b9a3262bf5ca2de` | 1828 |
| companions-5 | Pebble Turtle | 2 | Galaxy Glow | 125 | 0 | `/assets/catalog/companions-5.svg` | `3d30ea4f291c2ac5fb8b60171df249167c3647cb` | 1666 |
| companions-6 | Comet Fox | 2 | Sunny Pop | 175 | 0 | `/assets/catalog/companions-6.svg` | `0d7b1d86360e6ef7d9d6bf70340d009436836a70` | 1962 |
| companions-7 | Story Owl | 3 | Aqua Wave | 240 | 2 | `/assets/catalog/companions-7.svg` | `a7a852d6d6b1486d5f0820f5ea93240e31c9ae2c` | 1833 |
| companions-8 | Bubble Axolotl | 3 | Art Attack | 330 | 2 | `/assets/catalog/companions-8.svg` | `29a71f6ec9ba4b16aa84c3afd04466935a9a0a89` | 1808 |
| companions-9 | Garden Snail | 3 | Star Luxe | 460 | 2 | `/assets/catalog/companions-9.svg` | `3208135a5b44b0d080e5c80da43b63aa04d7652e` | 1993 |
| companions-10 | Pixel Bot | 4 | Midnight Neon | 640 | 5 | `/assets/catalog/companions-10.svg` | `f1150f08a1a0bba8d9601ed2dd8f9dae6a17bb7d` | 2211 |
| companions-11 | Dream Dragon | 4 | Candy Core | 880 | 5 | `/assets/catalog/companions-11.svg` | `883280e7edab0226ff76154d33cd9bddf2b30d67` | 2209 |
| companions-12 | Star Unicorn | 5 | Adventure Club | 1200 | 9 | `/assets/catalog/companions-12.svg` | `64b6ea9a0d31fd73ed9770f7d991152abbc47139` | 2669 |

All eleven declare a `512×512` SVG viewBox and an accessible `role="img"` / theme+item `aria-label`. Their Git blob SHAs are distinct.

## Source-level visual differentiation found

- `companions-2` Moon Cat: dark moonlit cat, cyan eyes, crescent backdrop, pixel accents and star chest emblem.
- `companions-3` Berry Bunny: long-eared white/pink bunny with berry-and-leaf chest motif and rounded friendly face.
- `companions-4` Sunny Bird: yellow bird silhouette with wings, orange beak and bright sun-like palette.
- `companions-5` Pebble Turtle: low wide turtle silhouette with patterned shell, head, feet and tail rather than a generic round pet.
- `companions-6` Comet Fox: pointed orange fox with white muzzle, star/comet forehead motif and curled tail.
- `companions-7` Story Owl: purple owl with large cream eye discs, side wings and book/page-like chest treatment.
- `companions-8` Bubble Axolotl: pink axolotl with six external gill branches, aquatic cyan surround and bubble accents.
- `companions-9` Garden Snail: side-profile snail with spiral shell, eyestalks, elongated body and leaf/flower garden detail.
- `companions-10` Pixel Bot: rounded metallic robot with neon cyan/pink screen eyes, antenna, block limbs and pixel accents.
- `companions-11` Dream Dragon: purple winged dragon with crown/horn treatment, pastel wings, tail and stronger higher-tier glow.
- `companions-12` Star Unicorn: white unicorn with gold horn, rainbow mane/tail, stars and the richest Tier-5 luminous treatment.

The family therefore has materially different animal/robot anatomy and silhouette rather than eleven recolors of one base drawing. The static SVGs also show a rough increase in ornament/glow density toward Pixel Bot, Dream Dragon and Star Unicorn.

## Validation actually performed

- **PASS — exact catalog metadata:** IDs, names, tiers, themes, prices and Star requirements were checked against the current `src/gameModel.js` generation rules.
- **PASS — repository presence:** all 11 assigned SVG paths exist on the preproduction branch.
- **PASS — asset identity:** all 11 have distinct Git blob SHAs and exact byte sizes recorded above.
- **PASS — 512×512 canvas:** each inspected file declares `viewBox="0 0 512 512"`.
- **PASS — accessible source labels:** each uses `role="img"` and a theme+item `aria-label` matching its catalog metadata.
- **PASS — source-level originality/safety review:** no external URL/image/font dependency, brand mark, recognizable third-party character, Roblox/Brookhaven asset, emoji, or answer cue was observed in the inspected SVG source.
- **PASS — scope isolation:** no companion asset, save state, Buddy Bond, ownership, pricing, manifest, runtime mapping, avatar UI, learning content or economy logic was changed in this pass.
- **NOT TESTED — rendered card-scale visual review:** this worker did not have branch-local pixel/contact-sheet evidence, so source inspection is not promoted to screenshot-quality approval.
- **NOT TESTED — Store/browser companion review:** Workstream 01/14 should inspect the exact blobs above in actual Store card/detail context.
- **NOT RUN — full build / full test suite:** no runtime or asset bytes were changed by this lane.
- **PENDING — independent visual approval:** all 11 retain `interim-not-verified` canonical status until Workstream 01 and/or 14 accepts the actual rendered appearance.

## Why no regeneration was performed

The sprint contract says to inspect existing interim companion art first, keep good candidates for independent review, and repair only an **evidenced** defect. Every assigned ID already had an item-specific, self-contained, uniquely hashed SVG with the correct theme/name and distinct species/robot silhouette. Regenerating all eleven without rendered rejection evidence would destroy useful provenance and violate the "do not regenerate valid art merely for activity" rule.

If Workstream 01 or 14 rejects a specific companion by hash after rendered inspection, Lane 06 should repair or regenerate only that exact rejected ID while preserving this candidate for comparison.

## Handoff / blockers

1. Workstream 01 and/or Workstream 14 should render these exact 11 blobs at Store-card/detail scale and record ACCEPT/REWORK/BLOCKED per ID, bound to the Git blob SHA.
2. Workstream 08 should promote or remap only independently accepted companions; Workstream 06 did **not** edit `catalog-art-manifest.json` or `src/catalogArtRuntime.js`.
3. If any companion is rejected, return it with a precise visual defect; do not replace it based only on the word `interim`.
4. Command Center 15 may reassign Lane 06 once review/integration needs for `companions-2..12` are reconciled. This file is Lane 06's reassignment request. Until then, this worker should perform read-only catalog review rather than resume Avatar/Buddy work early.
5. The current blocker is **independent rendered acceptance**, not missing companion files.

**Replit/Floot were not used. `main` was not merged or modified.**
