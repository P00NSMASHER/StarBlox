# Catalog Sprint — Lane 06 Companions

STATUS: **READY FOR REVIEW — COMPANION REVIEW DEPENDENCY ESCALATED AFTER TWO CYCLES**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Production assignment: `companions-2` through `companions-12`  
Preserved final: `companions-1` Sprout Pup  
Independent reviewer: **Workstream 05**  
Canonical integration owner: **Workstream 08**  
Canonical manifest/runtime: **unchanged by this lane**  
Self-approval: **NO**

## Material increment this pass

Lane 06 did not repeat SVG source inspection or regenerate pending art. It re-read the current branch at `f1512099a2b9f467ff3e5e4ca985ca649bc3b15d`, the v2 coordination state, reviewer-05 shard, stored rich-candidate directory, and the shared staged-art workflow.

The blocker is now narrower and evidenced:

- `reviews/05.json` now exists (`9d855d01e7f0132e999850a7c616cfd1239eb015`), but it contains **12 Aura REWORK decisions and zero companion decisions**.
- The repository still contains the rich companion batch under `public/assets/catalog-candidates/chat-20260921-intake01/`: **10 companion items / 30 source-card-detail files** were read back at the current head.
- The shared staged-art QA workflow exists, but its current file (`dcaa37f4dce03ab4a88a16fb9323a6a1757c30ba`) renders **Lighting only**. Workstream 14 owns that common harness; Lane 06 will not edit it.
- Because no companion exact-hash `REWORK` exists, v2 forbids speculative regeneration while current SVG/rich candidates are awaiting independent pixel review.

This is the second Lane-06 cycle with the same missing companion review dependency, so the lane now explicitly escalates the review/fixture dependency to Command Center 15 rather than generating duplicate companion art.

## First independent review queue — current file identities

These four rich candidates remain the preferred first review batch. The source/card/detail files are repository-stored, non-canonical, and now bound to both existing SHA-256 evidence and current Git blob identities.

| ID | Item | Theme | Card Git blob | Detail Git blob | Card/detail size | State |
| --- | --- | --- | --- | --- | --- | --- |
| `companions-3` | Berry Bunny | Berry Blast | `7a104a2d609c16272cb58e18da50bff8072c347f` | `adba95dc769e603337dc4ac38b9a513ce9914b10` | 256² / 768² | **PENDING 05 PIXEL REVIEW** |
| `companions-4` | Sunny Bird | Garden Glow | `cfa57b9102aea1f42696a4488bcf0be53dc50986` | `b382339e76ed9d4aeae72b1c8cccc904abf85b57` | 256² / 768² | **PENDING 05 PIXEL REVIEW** |
| `companions-10` | Pixel Bot | Midnight Neon | `ec8d60c931fedc8505e3e4ff7a17e00492baed1d` | `2b09d950b08083bb3a9ec5e2073ae23d88411cf4` | 256² / 768² | **PENDING 05 PIXEL REVIEW** |
| `companions-11` | Dream Dragon | Candy Core | `b7e808511f870638db6e5434d57b9a877b060bf1` | `465fe45abbe4d9b4355444cb3f75a49927b604e9` | 256² / 768² | **PENDING 05 PIXEL REVIEW** |

Full source/card/detail paths, SHA-256 values, dimensions and bytes are in `lane-06.json`. The current directory readback confirms these exact files remain stored.

## Other companion candidates

The existing 512×512 SVG candidates for `companions-2..12` remain preserved as interim comparison/fallback versions. Their prior source-level evidence remains reusable because their hashes did not change; source validity is not visual acceptance.

Six imported rich candidates remain on theme-review hold rather than being regenerated without reviewer evidence:

- `companions-2` Moon Cat — Pixel Party expression needs review.
- `companions-5` Pebble Turtle — Galaxy Glow expression needs review.
- `companions-6` Comet Fox — Sunny Pop expression needs review.
- `companions-7` Story Owl — Aqua Wave expression needs review.
- `companions-8` Bubble Axolotl — Art Attack expression needs review.
- `companions-12` Star Unicorn — Adventure Club expression needs review.

`companions-9` Garden Snail still has no rich imported candidate; its existing SVG remains the current Lane-06 candidate.

## Checks actually performed / reused

- **PASS — assignment current:** Workstream 06 still owns `companions-2..12`.
- **PASS — review ownership current:** Workstream 05 owns companion independent review.
- **PASS — current repository storage:** 10 rich companion items / 30 stored files remain in the candidate directory.
- **PASS — first queue blob identity:** all 12 source/card/detail files for companions 3, 4, 10 and 11 have current Git blob identities recorded in `lane-06.json`.
- **PASS — import-time decode/dimension checks:** reused by unchanged hash from the prior import evidence.
- **PASS — import-time regression suite/build:** reused from import head `f371e00ca215752c29ae67bb548e2005ad5fced5`; this pass did not claim a new build.
- **PENDING — independent companion pixel decisions:** reviewer 05 has not reviewed companions yet.
- **PENDING — canonical integration:** Workstream 08 may integrate only an independently accepted current asset hash.
- **0 new assets generated; 0 existing assets overwritten.**

## Escalated next action

1. **05:** inspect actual card/detail pixels for `companions-3`, `companions-4`, `companions-10`, and `companions-11` and append exact-hash `ACCEPT / REWORK / BLOCKED` decisions to `reviews/05.json`.
2. **14:** if reviewer 05 requires a reproducible fixture, extend/reuse the staged-art QA path for those exact repository-stored files. Do not wire candidates canonically merely to render them.
3. **15:** resolve this two-cycle anti-stall dependency through reviewer/fixture coordination rather than assigning duplicate companion generation.
4. **06:** only after a concrete exact-hash `REWORK`, preserve the rejected version and repair the named companion in a bounded 2–6 item batch.
5. **08:** integrate only a current companion hash with qualified independent `ACCEPT` plus automated mapping/file checks.

**No companion asset bytes, avatar UI, item IDs, ownership, Buddy Bond, saves, pricing, learning/economy logic, canonical manifest/runtime, Replit/Floot, or `main` were changed in this pass.**
