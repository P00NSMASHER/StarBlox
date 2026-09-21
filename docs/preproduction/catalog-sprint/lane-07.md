# Catalog Sprint Lane 07 — Rugs

STATUS: **READY_FOR_REVIEW / 12 OF 12 STAGED**

Branch: `screenshot-match-preproduction`  
Source head read before production: `2608b1f23ab09ed92e6cd1462586eebc7e37554f`  
Source head read before handoff: `6f9d7f6261b84d0f9f9ad13b0c591e0ef7a88590`  
Replit/Floot: **untouched**  
`main`: **untouched**

## Batch completed

Lane 07 produced the complete assigned rug family as original, self-contained StarBlox SVG candidates. Each item uses its own silhouette, pile/construction treatment, stitched detail, motif and signature feature rather than a recolor-only variant. The set intentionally scales from straightforward Starter treatment to denser Tier-4 and Tier-5 glow, layering and ornament.

| ID | Name | Tier | Theme | Path |
|---|---|---:|---|---|
| `rugs-1` | Starter Mat | 1 | Aqua Wave | `/assets/catalog/rugs-1.svg` |
| `rugs-2` | Cloud Rug | 1 | Art Attack | `/assets/catalog/rugs-2.svg` |
| `rugs-3` | Pixel Grid Rug | 1 | Star Luxe | `/assets/catalog/rugs-3.svg` |
| `rugs-4` | Heart Rug | 2 | Midnight Neon | `/assets/catalog/rugs-4.svg` |
| `rugs-5` | Leaf Rug | 2 | Candy Core | `/assets/catalog/rugs-5.svg` |
| `rugs-6` | Orbit Rug | 2 | Adventure Club | `/assets/catalog/rugs-6.svg` |
| `rugs-7` | Checker Rug | 3 | Cloud Pop | `/assets/catalog/rugs-7.svg` |
| `rugs-8` | Wave Rug | 3 | Pixel Party | `/assets/catalog/rugs-8.svg` |
| `rugs-9` | Splash Rug | 3 | Berry Blast | `/assets/catalog/rugs-9.svg` |
| `rugs-10` | Neon Grid Rug | 4 | Garden Glow | `/assets/catalog/rugs-10.svg` |
| `rugs-11` | Dream Cloud Rug | 4 | Galaxy Glow | `/assets/catalog/rugs-11.svg` |
| `rugs-12` | Luxe Star Rug | 5 | Sunny Pop | `/assets/catalog/rugs-12.svg` |

## Visual differentiation

- **Starter Mat** — woven rounded aqua mat, regular ribbing, short fringe and a simple star center.
- **Cloud Rug** — irregular fluffy cloud silhouette with sculpted pile and playful stitched art accents.
- **Pixel Grid Rug** — beveled dark grid with luminous checks, gold trim and a central star medallion.
- **Heart Rug** — plush heart silhouette with a dark midnight center and neon pink/cyan piping.
- **Leaf Rug** — leaf form with raised pale veins, stitched candy-color branches and sparkle details.
- **Orbit Rug** — circular celestial construction with raised planet center, orbital rings and satellite dots.
- **Checker Rug** — thick rounded checker pile with tufted star corners and fringe tabs.
- **Wave Rug** — asymmetrical layered surf bands with stepped pixel highlights.
- **Splash Rug** — irregular berry paint-splash silhouette with droplets and a pale star inset.
- **Neon Grid Rug** — octagonal dark perspective grid with cyan/green glow and botanical corner details.
- **Dream Cloud Rug** — galaxy cloud pile with crescent moon, constellation stitching and luminous highlights.
- **Luxe Star Rug** — layered five-point gold construction with raised star insets, jewel accents and radiant stitching.

## Producer validation

- **PASS** — all 12 SVG files parse as XML.
- **PASS** — all 12 render to 800×800 pixels with CairoSVG.
- **PASS** — producer contact-sheet inspection found all 12 readable and materially distinct.
- **PASS** — names, categories, tiers, themes, prices and Star requirements match the real Store model.
- **PASS** — all 12 Git blob SHAs are unique within this lane.
- **PASS** — no external URLs, raster embeds, fonts, brand marks, Roblox/Brookhaven assets or third-party characters were introduced.
- **PASS** — no catalog manifest, runtime wiring, player state, economy or learning data was changed by Lane 07.
- **PENDING** — independent rendered/card-scale acceptance by Workstream 01 and/or Workstream 14.
- **NOT TESTED** — real Store desktop/phone viewport context by this lane.
- **NOT RUN** — full branch build and full test suite by this lane.

Exact asset blob identities, byte sizes, creation commits and metadata are recorded in `docs/preproduction/catalog-sprint/lane-07.json`.

## Handoff

Workstreams 01/14 should review the exact recorded asset blobs and classify each item independently. `READY_FOR_REVIEW` is not final acceptance. Workstream 08 remains the sole owner of `catalog-art-manifest.json` and `src/catalogArtRuntime.js` and should integrate only independently accepted exact IDs.

Command Center 15 may reassign Lane 07 only after review/integration needs are reconciled. While the phase remains `CATALOG_SPRINT`, this worker must not resume unrelated progression-widget work.
