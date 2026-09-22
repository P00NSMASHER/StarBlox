# Workstream 07 — Room-Tier Material & Lighting Study v1

**Phase:** ART_AND_VISUALS_ONLY  
**Branch:** `screenshot-match-preproduction`  
**Workstream:** 07 visual-production support only  
**Observed source head before write:** `10c9929fd3cfbbe3ea70942f6a61456fdb5330d5`  
**Shared coordination owner:** 15  
**Canonical catalog writer:** 08 only

This is a versioned, non-runtime visual-production study for the already-staged five-room-tier artwork. It is intended to give the shared visual-finishing phase a concrete material, lighting, thumbnail-readability and composition target without creating another room implementation, changing live state, or reopening catalog production. It is **not** an independent pixel review and does not approve any W07 Home asset.

## Authority and current repository truth

Read together, with newer exact evidence superseding older mission text:

- `docs/preproduction/ART_VISUALS_SPRINT.json`
- `docs/preproduction/DELIVERY_PROTOCOL_V2.md`
- `docs/preproduction/reference-screenshots/original-reference-manifest.json`
- authoritative Home original: `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`
- `docs/preproduction/catalog-sprint/lane-07.json`
- `docs/preproduction/catalog-sprint/lane-03.md`
- `docs/preproduction/catalog-sprint/integration.json`
- `docs/preproduction/catalog-sprint/coordination-15-20260922-0705.json`

The authoritative Home original remains the desktop visual reference. The current reference manifest records no supplied 390px or 320px original, so narrow-screen work may prove composition, reachability and readability but must not claim invented mobile screenshot parity.

Catalog production is closed for Workstream 07. Tops 1–6 and Rugs 1–12 remain frozen at their accepted exact hashes. Current `integration.json` has already canonical-wired the independently accepted Rugs 12 blob `eea2fc5b78c1186342f91f597bc792160ab8f8fe` in manifest v28. There is therefore **no W07 catalog action** in this study and no reason to regenerate, rereview or re-reconcile any Top or Rug.

## Exact preserved room inputs

| Tier | Room | Runtime candidate | Exact Git blob |
|---|---|---|---|
| 1 | Tiny Starter Studio | `/assets/home/room-tier-1-w07-v2.svg` | `2d3060ac1e260a53fd1ced809e7cf3bc760c5490` |
| 2 | Cozy Loft | `/assets/home/room-tier-2-w07-v2.svg` | `21410fe2456a1605e044939118d9f2edf100b441` |
| 3 | Creator Bedroom | `/assets/home/room-tier-3-w07-v2.svg` | `87cded45608fed8525c95cf48f60e51fb5c1811e` |
| 4 | Skyline Penthouse | `/assets/home/room-tier-4-w07-v2.svg` | `9963a3abdc2426608b717e9d7eff0dd87b43cae8` |
| 5 | Star Mansion | `/assets/home/room-tier-5-w07-v2.svg` | `c5eb44f34604737e085adfb7ad8c5d5e99087bb5` |

Preserve those exact files while evaluating the visual ladder. A future replacement requires an actual independent visual defect or an explicit Workstream 15 assignment; the existence of this study is not replacement authorization.

## Home reference scene grammar

The Home reference works because it reads as a **cozy bedroom world first**, with UI layered over it second. The stable scene grammar to preserve is:

- warm directional illumination from the left rather than flat all-over card lighting;
- meaningful furniture mass on the left and right edges, especially bed/soft furnishing left and desk/storage right;
- a readable center for the avatar/buddy rather than furniture directly behind the hero;
- visible floor contact, object thickness and soft material depth instead of flat icon-like scenery;
- image-led Room Progress and Dream Goal imagery that feels like part of the bedroom fantasy rather than a detached admin dashboard;
- dense lower widgets floating over the world while still yielding to real text, counters and controls.

The latest W13 Home-v3 composition analysis adds one especially useful constraint: preserve the roughly `x=36–64%` lower-center hero corridor. If the environment needs more richness, add it primarily in the left and right thirds through shelving, books, plants, wall treatment, textiles and furniture detail. Do not refill the center with large objects, baked UI or decorative noise.

## Current-source construction ladder — producer inventory, not pixel acceptance

The present v2 room files already declare a useful increase in construction complexity. This inventory describes what the current source is trying to communicate; it does **not** certify card-scale rendering quality.

| Tier | Current-source identity | Construction cue that must survive at thumbnail scale |
|---|---|---|
| 1 — Tiny Starter Studio | Simple bed, basic desk, small shelf, woven mat and daylight window | One clean bed mass + one simple work surface + modest woven floor shape; attractive but visibly uncomplicated |
| 2 — Cozy Loft | Raised sleeping nook, ladder, layered textiles, reading chair, plants and amber lighting | Vertical loft/ladder silhouette plus visibly softer textile and reading-zone layering |
| 3 — Creator Bedroom | Dual-screen workstation, display shelving, acoustic panels, richer bedding and creative equipment | Creator workstation silhouette becomes unmistakable; material/detail gain comes from built-out equipment and paneling, not glow |
| 4 — Skyline Penthouse | Broad skyline glazing, tailored bedding, walnut-and-metal desk, sculpted lounge seating, woven rug and architectural lighting | Premium glazing and tailored furniture geometry become the dominant read; broad window depth and refined surfaces separate it from Tier 3 |
| 5 — Star Mansion | Monumental night-sky glazing, architectural gold trim, layered canopy bed, luminous creator console, sculptural lounge, starburst chandelier, mixed-material floor and richly woven star rug | Canopy/architectural frame + monumental glazing + luxury floor/fixture treatment read as a genuine construction jump rather than a palette swap |

## Material and light signature by tier

### Tier 1 — Tiny Starter Studio

Keep the finish family low-complexity but intentional: cotton or simple woven bedding, flat-weave rug/mat, light birch/laminate or uncomplicated painted furniture, basic hardware and low-to-medium roughness. Daylight should be broad and soft. Specular response should be limited to window glass and tiny hardware accents. The room should never look cheap or unfinished; “Starter” means simple construction, not placeholder art.

### Tier 2 — Cozy Loft

Increase comfort rather than luxury. Use thicker knit/boucle or layered bedding cues, warmer oak/wood, small upholstered reading-zone softness and a warmer amber practical-light contribution. Shadows can deepen slightly at blanket folds, ladder joints and chair/floor contact. The key step from Tier 1 is tactile layering and vertical loft construction, not stronger saturation.

### Tier 3 — Creator Bedroom

Make creator identity the material story: ribbed/structured fabrics, painted or veneered wood, matte metal stands/frames, acoustic-panel relief, storage/display edges and practical desk illumination. Screen light may add cool local accents but must not flatten the room into neon. Desk hardware, screen bezels, shelving thickness and textile folds should produce the richness before color effects do.

### Tier 4 — Skyline Penthouse

Shift into premium architectural restraint. Use walnut, brushed/dark metal, tailored upholstery, deeper glazing, woven floor treatment and low-sheen stone/polished accents where appropriate. Window/city light can add controlled cool depth while warm architectural/practical light keeps the room inhabitable. Specular accents should be narrow and material-specific; broad plastic-looking gloss would collapse the premium read.

### Tier 5 — Star Mansion

Spectacle must come from real construction: velvet/soft luxury textiles, brushed-gold or warm metal trim, layered canopy architecture, monumental glass depth, mixed stone/wood/floor surfaces, a richly woven star rug and a distinct chandelier/fixture silhouette. Controlled bloom is allowed around intentional luminous elements, but material edges, textile pile, trim depth and floor contact must stay readable underneath it. Tier 5 fails if it is only Tier 4 with more purple/gold glow.

## Lighting continuity rules

All five rooms should feel like one progression family even as materials evolve. Keep a coherent three-quarter-room camera and believable floor plane. Maintain a dominant directional key rather than independently lighting every prop. Practical lights and screens may add local fill but should not erase contact shadows. Darker premium materials need readable edge separation so furniture does not dissolve at card scale. Emissive accents should illuminate nearby surfaces subtly rather than behaving like stickers.

For future scene finishing, the target is **depth hierarchy**, not maximum contrast everywhere: foreground furniture gets the clearest edge/contact treatment; middle-ground hero space stays calm; background glazing/walls establish atmosphere; tiny decor stays subordinate. This protects the avatar corridor and prevents progression thumbnails from becoming busier than the live hero.

## Thumbnail legibility contract

Independent visual finishing should evaluate the exact rendered assets at real thumbnail size, not only at SVG/source scale. A useful pass should answer all of the following without relying on room labels:

1. Can Tier 1 be recognized as the deliberately simple starter room while still looking polished?
2. Does Tier 2 visibly add a loft/soft-reading identity rather than only warmer color?
3. Does Tier 3 read as a creator workstation room because of structure/equipment, not because screens glow?
4. Does Tier 4 read as a premium penthouse through glazing, tailored furniture and material restraint?
5. Does Tier 5 read as a mansion-level construction jump through canopy/architecture/fixture/floor richness rather than extra bloom?
6. At small card scale, do the primary bed/desk/window/floor masses remain distinct instead of merging into a single bright blob?
7. Are material differences still visible as folds, edge thickness, trim, weave or controlled highlights after downscaling?

A useful diagnostic is to mentally ignore palette. If two adjacent tiers would become nearly indistinguishable without color, their construction/material differentiation is too weak even if the full-size art is attractive.

## Dream Goal and progression relationship

The separate Dream Goal image and W07 Daily/Today/Mastery/Reward decorative art should remain subordinate to the room world and real live state. Do not bake currency, stars, mastery percentages, completion marks, timers, streaks, owned quantities, unlocks or prices into these illustrations. Any real values belong to existing runtime state. If a narrow layout cannot fit both artwork and state cleanly, reduce or omit decoration before hiding or shrinking stateful content.

Dream Goal should visually promise an aspirational room outcome, while the five Room Progress previews explain the construction ladder. They should complement one another rather than compete through unrelated cameras, exaggerated glow or duplicated UI-like framing.

## Crop and responsive handoff

For `1408×1056` and `1024×768`, preserve the reference hierarchy: bedroom world first, hero/progress second, Dream Goal visually strong but bounded, lower widgets dense but subordinate. For room-tier thumbnails, prefer contain-first framing so the construction anchors that distinguish tiers remain visible.

For `390×844` and `320×568`, these are verification dimensions only, not reference-image parity targets. Preserve live labels/counters/controls first. Keep decorative art within bounded slots, avoid cover crops that delete the very material/construction cue that distinguishes a tier, and preserve the center hero corridor. No horizontal overflow or offscreen-only action is acceptable merely to keep more art visible.

## Independent review questions for the finishing phase

This study intentionally leaves approval to an independent visual owner. When 15 assigns the next Home-finishing review/integration step, inspect actual rendered pixels for:

- reference-like room-first hierarchy rather than dashboard-first composition;
- coherent camera and left-key lighting across all five tiers;
- real material escalation from Tier 1 through Tier 5;
- floor contact, object thickness and readable silhouettes at card scale;
- controlled specular/bloom instead of plastic gloss or neon flattening;
- protection of the `x≈36–64%` hero corridor in the shared Home scene;
- no fake state, punitive streak/FOMO treatment, or art-created interaction affordances;
- responsive containment at `1408×1056`, `1024×768`, `390×844` and `320×568`, with no mobile parity overclaim.

If a specific exact room asset later receives an independent REWORK finding, repair only that evidenced versioned asset under the assigned owner. Do not preemptively regenerate all five rooms.

## Ownership / freeze boundary

This file changes visual-production guidance only. Workstream 07 does not edit shared runtime, CSS, route/state code, economy, learning, persistence, live counters, player data or canonical catalog mappings. It does not reopen Tops or Rugs and does not claim another catalog family. Workstream 15 retains shared visual integration/assignment ownership; Workstream 08 retains catalog canonical wiring. Replit, Floot, `main`, deployment, purchases and paid settings remain frozen.