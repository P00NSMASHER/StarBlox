# Catalog Sprint — Lane 06 Companions

STATUS: **READY FOR REVIEW — RICH CANDIDATE EVIDENCE PACKAGED; 4-ITEM FIRST REVIEW QUEUE**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Production assignment: `companions-2` through `companions-12`  
Preserved final: `companions-1` Sprout Pup  
Canonical manifest/runtime: **unchanged by this lane**  
Self-approval: **NO**  
Independent reviewer under Delivery Protocol v2: **Workstream 05**  
Canonical integration owner: **Workstream 08**

## Material change this pass

The lane previously described only the 11 existing interim SVGs. That was incomplete: the branch also contains a repository-stored image-generation candidate batch under `public/assets/catalog-candidates/chat-20260921-intake01/` with source PNG plus card/detail WebP derivatives.

This pass did **not** generate or overwrite companion art. Instead it reconciled that stored batch with the current Lane 06 assignment and recorded the exact review queue, hashes, dimensions, provenance, theme holds, and missing rich candidate so Workstream 05 can perform independent actual-pixel review without repeating source discovery.

The import record says the candidate package contains **10 companion items / 30 image files**, remains `CANDIDATES_ONLY`, changed neither canonical manifest nor runtime, and passed its import-time regression suite and production build. These are still **not final assets**.

## First review queue for Workstream 05

These four repository-stored rich candidates were already marked `READY_FOR_INDEPENDENT_REVIEW` by the intake record. They should be rendered at card and detail scale and reviewed by exact current hash before any regeneration.

| ID | Item | Theme | Source | Card | Detail | Current lane disposition |
| --- | --- | --- | --- | --- | --- | --- |
| `companions-3` | Berry Bunny | Berry Blast | `7fcc085c…` PNG 1254×1254 | `0df56c98…` WebP 256×256 | `3f4bec2d…` WebP 768×768 | **READY FOR 05 REVIEW** |
| `companions-4` | Sunny Bird | Garden Glow | `f2356393…` PNG 1254×1254 | `b417fdf0…` WebP 256×256 | `92889982…` WebP 768×768 | **READY FOR 05 REVIEW** |
| `companions-10` | Pixel Bot | Midnight Neon | `6f6df89d…` PNG 1254×1254 | `cb9b6ed7…` WebP 256×256 | `c963cbad…` WebP 768×768 | **READY FOR 05 REVIEW** |
| `companions-11` | Dream Dragon | Candy Core | `b72c5009…` PNG 1254×1254 | `6ece80e9…` WebP 256×256 | `d531305b…` WebP 768×768 | **READY FOR 05 REVIEW** |

Exact paths and full hashes are in `lane-06.json` and `chat-intake01.json`.

## Rich-candidate theme holds

The following imported rich candidates are useful evidence but were not promoted to the first review queue because their intake notes identify a theme-fit question. This is **not** a rejection of the existing SVG version and **not** permission to regenerate yet.

- `companions-2` Moon Cat — subject fits, but the imported image does not clearly establish **Pixel Party**.
- `companions-5` Pebble Turtle — pebble identity fits, but the imported garden/stone treatment does not clearly establish **Galaxy Glow**.
- `companions-6` Comet Fox — comet identity fits, but the imported cool cosmic palette does not clearly establish **Sunny Pop**.
- `companions-7` Story Owl — scholar/story identity fits, but warm library treatment does not clearly establish **Aqua Wave**.
- `companions-8` Bubble Axolotl — subject/bubbles fit, but the imported image does not clearly establish **Art Attack**.
- `companions-12` Star Unicorn — star/unicorn identity fits, but **Adventure Club** identity is not established through explorer/accessory treatment.

`companions-9` Garden Snail has **no rich imported candidate** in this batch; its existing SVG remains the only current Lane 06 candidate.

## Existing SVG baseline preserved

All 11 assigned interim SVGs still exist under `/assets/catalog/companions-2.svg` through `/assets/catalog/companions-12.svg`, are 512×512 self-contained repo-owned SVGs, and have distinct Git blob identities. The lane did not overwrite them. They remain useful comparison/fallback candidates until Workstream 05 inspects real rendered pixels.

The SVG source inspection still shows distinct species/robot silhouettes and motifs: Moon Cat, Berry Bunny, Sunny Bird, Pebble Turtle, Comet Fox, Story Owl, Bubble Axolotl, Garden Snail, Pixel Bot, Dream Dragon, and Star Unicorn. Source validity is **not** being treated as premium-art acceptance.

## Validation actually performed

- **PASS — current assignment:** `CATALOG_SPRINT_STATE.json` still assigns `companions-2..12` to Workstream 06.
- **PASS — review ownership:** Delivery Protocol v2 assigns companions to independent reviewer **05**; the old 01/14 handoff is superseded.
- **PASS — SVG candidate identity:** 11/11 existing SVGs have recorded distinct blob SHAs and metadata.
- **PASS — rich candidate package discovered and reconciled:** 10 companion items / 30 stored source-card-detail files are recorded under the candidate directory.
- **PASS — rich package import-time decode/dimension checks, regression suite and production build:** retained from the hash-bound import record.
- **PASS — exact rich candidate review queue packaged:** companions 3, 4, 10, and 11 now have source/card/detail paths, hashes, bytes and dimensions in `lane-06.json`.
- **NOT PERFORMED — independent pixel acceptance:** Workstream 06 cannot self-approve its own production lane.
- **PENDING — reviewer shard:** `docs/preproduction/catalog-sprint/reviews/05.json` did not exist at the inspected head.
- **PENDING — canonical integration:** Workstream 08 may integrate only an independently accepted current asset hash.

## Next actions / handoff

1. **Workstream 05:** render `companions-3`, `companions-4`, `companions-10`, and `companions-11` from the stored card/detail files and write exact-hash `ACCEPT / REWORK / BLOCKED` decisions to `reviews/05.json`.
2. **Workstream 05:** compare existing SVGs against the six theme-hold rich candidates before requesting any regeneration.
3. **Workstream 08:** consume any qualified independent ACCEPT incrementally; the candidate directory remains non-canonical until then.
4. **Workstream 06:** if reviewer 05 returns a concrete REWORK, preserve the rejected version and repair only the named ID in a bounded 2–6 item batch. Do not regenerate pending items merely for activity.
5. **Command Center 15:** if review remains missing across another cycle, treat the specific reviewer dependency as the lane blocker and resolve/reassign review ownership rather than assigning duplicate companion generation.

**No companion asset bytes, avatar UI, save state, ownership, Buddy Bond, pricing, learning/economy logic, canonical manifest/runtime, Replit/Floot, or `main` were changed in this pass.**
