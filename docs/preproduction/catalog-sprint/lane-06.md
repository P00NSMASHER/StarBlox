# Catalog Sprint — Lane 06 Companions

STATUS: **FIRST 4 REPLACEMENTS ACCEPTED / NEXT 4 READY FOR SHARED RENDER REVIEW**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Current control policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Primary production assignment: `companions-2` through `companions-12`  
Current state also gives Workstream 06 repair capacity for rejected companions plus `seating-7..12` and `shoes-7..12`  
Independent companion reviewer: **Workstream 05**  
Canonical integration owner: **Workstream 08**  
Canonical manifest/runtime: **unchanged by this lane**  
Self-approval: **NO**

## Material increment this pass

Workstream 05 completed fresh exact-hash review for the first rich replacement batch and returned **4 ACCEPT / 0 REWORK / 0 BLOCKED**:

- `companions-3` Berry Bunny — `adba95dc769e603337dc4ac38b9a513ce9914b10`;
- `companions-4` Sunny Bird — `b382339e76ed9d4aeae72b1c8cccc904abf85b57`;
- `companions-10` Pixel Bot — `2b09d950b08083bb3a9ec5e2073ae23d88411cf4`;
- `companions-11` Dream Dragon — `465fe45abbe4d9b4355444cb3f75a49927b604e9`.

Reviewer 05 found that these replacements fix the legacy flat-mascot defect with dimensional anatomy, material response, lighting and distinct silhouettes. Workstream 06 will preserve these exact bytes and will not regenerate or overwrite them. Workstream 08 may integrate them after normal metadata/file/content checks.

Because reviewer input changed materially, this run advanced the next bounded companion batch instead of switching to secondary Seating/Shoes work.

## Second rich replacement batch — READY FOR REVIEW

The next four legacy-REWORK companion IDs already have repository-stored source/card/detail files from the rich candidate batch. Their detail versions are now marked `READY_FOR_REVIEW`, which causes the existing shared staged-art workflow to render them without canonical Store wiring.

| ID | Item | Tier / theme | Detail path | Exact Git blob | Bytes |
| --- | --- | --- | --- | --- | ---: |
| `companions-2` | Moon Cat | T1 / Pixel Party | `public/assets/catalog-candidates/chat-20260921-intake01/companions-2-detail.webp` | `88d10d6f8c412d0ab7fde6ac7a7ff202858077db` | 55,566 |
| `companions-5` | Pebble Turtle | T2 / Galaxy Glow | `public/assets/catalog-candidates/chat-20260921-intake01/companions-5-detail.webp` | `1ae7b431e519563ee1dbbdb0ae762bfee6f95ac0` | 61,302 |
| `companions-6` | Comet Fox | T2 / Sunny Pop | `public/assets/catalog-candidates/chat-20260921-intake01/companions-6-detail.webp` | `28cb411201d8ec30dae2f70b740efe1e86985386` | 69,582 |
| `companions-7` | Story Owl | T3 / Aqua Wave | `public/assets/catalog-candidates/chat-20260921-intake01/companions-7-detail.webp` | `39d35ea40a0a138ae99ddcdc09f8f2a3683fa49d` | 69,614 |

Each detail candidate is a repository-stored 768×768 WebP and retains its source PNG and card WebP siblings. These four are **not accepted or canonical**. Exact animal identity, theme fit, dimensional anatomy/materials, child-friendly expression and tier progression remain for Workstream 05 to judge from actual shared renders. The old legacy REWORK decisions do not transfer to these hashes.

## Remaining companion queue

After this batch:

- repository-rich candidates still behind it: `companions-8` Bubble Axolotl and `companions-12` Star Unicorn;
- no rich imported replacement yet: `companions-1` Sprout Pup and `companions-9` Garden Snail;
- accepted and frozen from producer changes: `companions-3`, `companions-4`, `companions-10`, `companions-11`.

If Moon Cat / Pebble Turtle / Comet Fox / Story Owl returns **REWORK**, preserve that exact hash and repair only that ID. If accepted, leave bytes untouched and advance Bubble Axolotl / Star Unicorn. Secondary repair capacity (`seating-7..12`, then `shoes-7..12`, reviewer 02) remains available only when companion work is genuinely waiting without changed input.

## Checks / preservation

- **PASS — policy:** Delivery Protocol V2 remains current.
- **PASS — assignment:** Workstream 06 owns companion repair and explicit secondary Seating/Shoes capacity.
- **PASS — legacy review:** 12/12 legacy companion hashes remain REWORK and preserved.
- **PASS — first replacement review:** 4/4 exact rich replacement hashes independently ACCEPTed by reviewer 05.
- **PASS — accepted bytes preserved:** no accepted companion was regenerated or overwritten.
- **PASS — second-batch repository storage:** 4/4 exact detail WebPs exist with stable Git blob hashes.
- **PENDING — second-batch shared render:** lane update triggers the existing staged-art workflow.
- **PENDING — second-batch independent review:** reviewer 05 must issue fresh exact-hash decisions.
- **PENDING — canonical integration:** Workstream 08 owns promotion of accepted exact hashes.
- **0 canonical mappings changed; 0 player data, equipment IDs, ownership, Buddy Bond, saves, pricing, learning or economy state changed.**

## Handoff

1. **14/shared staged-art workflow:** render Moon Cat, Pebble Turtle, Comet Fox and Story Owl at card/detail scale from the exact hashes above.
2. **05:** independently review those four exact rendered hashes.
3. **08:** integrate Berry Bunny, Sunny Bird, Pixel Bot and Dream Dragon after standard metadata/file/content checks; do not wait for the rest of the catalog.
4. **06:** preserve accepted hashes; repair only exact rejected IDs or advance `companions-8` / `companions-12` when the second batch passes.

**No avatar UI, item/equipment IDs, ownership, Buddy Bond, saves, pricing, learning/economy logic, canonical manifest/runtime, Replit/Floot, or `main` was changed.**
