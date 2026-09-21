# Catalog Sprint — Lane 11 Auras

STATUS: **REPAIR BATCH 1 READY FOR INDEPENDENT REVIEW — AURAS 1–4**

Branch: `screenshot-match-preproduction`  
Workstream: 11  
Phase: `CATALOG_SPRINT`  
Independent reviewer: **05**  
Canonical integrator: **08**  
Replit/Floot: **untouched**  
`main`: **untouched**  
Player state: **unchanged**

## Independent review is now actionable

Workstream 05 has independently reviewed the original `auras-1..12` hashes in the actual Store and returned **REWORK 12/12**. The common release defect is not identity or uniqueness; it is insufficient assigned-theme expression, card-scale contrast and premium dimensional material/lighting depth. The exact original hashes remain preserved for comparison.

Lane 11 therefore has an evidenced repair assignment for all twelve Auras. This pass completed the first bounded repair batch: **`auras-1` through `auras-4`**. No canonical mapping changed and none of the replacements is self-approved.

## Batch 1 repaired candidates

| ID | Item / theme / tier | Rejected original | New versioned candidate | New Git blob | Bytes | Repair intent |
| --- | --- | --- | --- | --- | ---: | --- |
| `auras-1` | Soft Sparkles / Midnight Neon / T1 | `5fdf391924548197f0d1025fbfddc6b5eea1dada` | `/assets/catalog/auras-1-v2.svg` | `48639f1262052350660127bbc5d3d25de34d61e3` | 2,592 | Strong midnight field, cyan/pink/violet orbit, larger luminous sparkles, bloom and motes while remaining a clean Starter effect. |
| `auras-2` | Cloud Puffs / Candy Core / T1 | `951d0de53b0177256bb71308f18fc3c5a2563a43` | `/assets/catalog/auras-2-v2.svg` | `c2be24c165f3e28995d5d2eb946dbdde983afe2a` | 2,536 | Plush candy-gradient cloud volumes, cyan/pink rim light, highlights, depth shadow and a candy-star anchor. |
| `auras-3` | Pixel Bits / Adventure Club / T1 | `a27b05e02ca3165d18bccac63a8cff3a645e393e` | `/assets/catalog/auras-3-v2.svg` | `9b682148eb26898ec5f56ac11eac635e7c93c8fc` | 2,929 | Tilted orbital tracks, beveled gold/aqua/violet voxel bits, compass-like star and bright pixel motes for a stronger Adventure Club identity. |
| `auras-4` | Berry Hearts / Cloud Pop / T2 | `feb01955145685f718c231287abbad60ecc2e408` | `/assets/catalog/auras-4-v2.svg` | `3059eae7ab68c125f1af1696305fdf5689131455` | 2,927 | Glossy berry-heart volumes around a sculpted Cloud Pop center with cyan cloud arcs, star core, specular highlights and layered glow. |

These are **versioned replacements**, not destructive overwrites. The original reviewed files remain in place until a replacement receives a fresh independent exact-hash `ACCEPT` and Workstream 08 chooses to wire it.

## Actual execution evidence

Before repository staging, the exact replacement bytes were rasterized locally with CairoSVG 2.8.2 at **512×512** and **192×192** and visually inspected on a dark Store-like field. After upload, GitHub readback returned the same Git blob SHA computed from each local source byte sequence.

Producer render results:

- `auras-1-v2`: 512 render 98,875 B (`14946bad...d8a2f`); 192 render 30,548 B (`9468d63b...2d0eb1`).
- `auras-2-v2`: 512 render 100,006 B (`45e8bed8...fc3db2`); 192 render 28,399 B (`1c17e8ee...87277`).
- `auras-3-v2`: 512 render 97,857 B (`28f95250...8bf99`); 192 render 29,333 B (`1d18c615...1eb035`).
- `auras-4-v2`: 512 render 97,505 B (`e934fb04...e0b645`); 192 render 30,506 B (`5a32aba0...89175`).

All four replacements render without clipping or malformed geometry and materially improve the specific rejected dimensions: card-scale contrast, theme identity, layering and glow/material depth. That statement is **producer evidence only**; it is not an acceptance decision.

## Remaining rejected originals

`auras-5` through `auras-12` remain on their independently rejected original hashes and are still repair work for Lane 11. They were **not regenerated in this pass** because Delivery Protocol V2 calls for bounded 2–6 item micro-batches and fresh review of each replacement version.

The next likely repair batch is `auras-5..8`, unless Workstream 05 returns a concrete defect on one of the new `v2` files that should be corrected first.

## Current checks

- **PASS** — Lane 11 still owns Aura production/repair.
- **PASS** — reviewer 05 returned exact-hash `REWORK` for all twelve originals.
- **PASS** — four replacements use new versioned paths and preserve originals.
- **PASS** — GitHub repository readback for all four replacements.
- **PASS** — unique Git blob identities, 512×512 SVG canvas, local 512/192 rasterization and producer pixel inspection.
- **PENDING** — fresh independent Workstream 05 card/detail review of the four new hashes.
- **PENDING** — Workstream 08 canonical wiring after any fresh `ACCEPT`.
- **UNCHANGED** — manifest/runtime, prices, item IDs, player state and live Aura logic.

## Handoff

**05:** independently render and review `auras-1-v2.svg` through `auras-4-v2.svg` at actual card and detail scale, binding every decision to the Git blob SHA above. If rejected again, return the precise visual defect.

**11:** preserve this batch while it is pending review; repair the next 2–6 rejected Aura IDs or immediately prioritize any concrete `v2` rejection. Do not self-promote a replacement.

**08:** do not wire a replacement until its new exact hash receives a qualified independent `ACCEPT` plus normal metadata/path/content checks.

No general motion/game-feel work was resumed because the phase remains `CATALOG_SPRINT`.
