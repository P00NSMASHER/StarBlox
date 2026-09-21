# Catalog Sprint — Lane 06 Companions

STATUS: **LEGACY COMPANIONS REWORK 12/12 — RICH REPAIR BATCH 4 READY FOR FRESH INDEPENDENT REVIEW**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Current control policy: `docs/preproduction/DELIVERY_PROTOCOL_V3.md`  
Production assignment: `companions-2` through `companions-12`  
Current repair assignment from state additionally includes `companions-1`  
Independent reviewer: **Workstream 05**  
Canonical integration owner: **Workstream 08**  
Canonical manifest/runtime: **unchanged by this lane**  
Self-approval: **NO**

## Material increment this pass

The prior review blocker is resolved: Workstream 05 has now independently reviewed the actual current Store pixels for **all 12 legacy companion SVG hashes** and returned **0 ACCEPT / 12 REWORK / 0 BLOCKED**. The common defect is not identity or child-friendliness; it is presentation quality. The current SVGs read as flat centered vector mascots with too little three-quarter anatomy, plush/toy material response, cast/rim lighting and tier progression for the premium screenshot target.

Lane 06 therefore did not repeat source inspection and did not blindly regenerate twelve images. It converted the strongest already-repository-stored high-resolution rich companion intake into the first bounded repair batch for four exact rejected IDs:

| ID | Item | Tier / Theme | Rejected legacy hash | Replacement detail candidate | Candidate Git blob | Size | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `companions-3` | Berry Bunny | T1 / Berry Blast | `c0e69b68240cb91c00dd16c2784b3d5c7c41c4fb` | `/assets/catalog-candidates/chat-20260921-intake01/companions-3-detail.webp` | `adba95dc769e603337dc4ac38b9a513ce9914b10` | 768×768 / 58,902 B | **READY FOR FRESH REVIEW** |
| `companions-4` | Sunny Bird | T2 / Garden Glow | `16e50e59ba950076bf0ecc512b9a3262bf5ca2de` | `/assets/catalog-candidates/chat-20260921-intake01/companions-4-detail.webp` | `b382339e76ed9d4aeae72b1c8cccc904abf85b57` | 768×768 / 53,770 B | **READY FOR FRESH REVIEW** |
| `companions-10` | Pixel Bot | T4 / Midnight Neon | `f1150f08a1a0bba8d9601ed2dd8f9dae6a17bb7d` | `/assets/catalog-candidates/chat-20260921-intake01/companions-10-detail.webp` | `2b09d950b08083bb3a9ec5e2073ae23d88411cf4` | 768×768 / 63,032 B | **READY FOR FRESH REVIEW** |
| `companions-11` | Dream Dragon | T4 / Candy Core | `883280e7edab0226ff76154d33cd9bddf2b30d67` | `/assets/catalog-candidates/chat-20260921-intake01/companions-11-detail.webp` | `465fe45abbe4d9b4355444cb3f75a49927b604e9` | 768×768 / 63,886 B | **READY FOR FRESH REVIEW — confirm Candy Core** |

Their retained 1254×1254 source PNGs, SHA-256 values, byte sizes and exact repository paths are recorded in `lane-06.json`. These are existing rich generated images already committed to the repository and previously decoded/hash-checked; no new generation or duplicate transfer was needed in this run.

## Why this is a real repair increment

The exact legacy hashes above now have independent `REWORK` evidence. Delivery policy therefore authorizes repair. Rather than discarding richer stored art and generating duplicates, Lane 06 selected four item-specific high-resolution candidates that were already classified as ready for independent review in `chat-intake01.md`.

Prior chat-intake verification remains reusable because the candidate hashes are unchanged:

- all source PNG and WebP variants decoded successfully;
- deterministic derivative rebuild checks passed;
- safe import checks passed;
- regression suite and production build passed at the import head;
- individual companion/contact-sheet pixels were producer-inspected in chat;
- **none of that is being treated as independent acceptance.**

Workstream 05 must now inspect these replacement pixels and bind `ACCEPT / REWORK / BLOCKED` to the replacement hashes. The old 12 REWORK decisions do not automatically transfer to these richer candidates.

## Remaining companion repair queue

The current control state now assigns companion repair responsibility to Lane 06 for `companions-1..12`. This run remains deliberately bounded to four reuse-first replacements.

Rich imported candidates exist but still need stronger theme-fit scrutiny before becoming the next repair batch:

- `companions-2` Moon Cat — Pixel Party;
- `companions-5` Pebble Turtle — Galaxy Glow;
- `companions-6` Comet Fox — Sunny Pop;
- `companions-7` Story Owl — Aqua Wave;
- `companions-8` Bubble Axolotl — Art Attack;
- `companions-12` Star Unicorn — Adventure Club.

`companions-1` Sprout Pup and `companions-9` Garden Snail do not have a rich imported candidate in this intake and will need a separate repair candidate if their replacement work reaches the front of the queue.

## Checks actually performed / reused

- **PASS — current control state:** phase remains `CATALOG_SPRINT`; Workstream 06 still owns companion production and now has explicit repair responsibility for all rejected companions.
- **PASS — independent legacy review:** Workstream 05 returned **REWORK 12/12** for current companion SVG hashes.
- **PASS — replacement storage:** the four replacement source/detail files above already exist in repository storage with exact Git blob identities.
- **PASS — decode/dimensions/import evidence:** reused from unchanged hash-bound `chat-intake01` evidence.
- **PASS — producer pixel inspection:** reused from the original rich intake; this is explicitly **not** independent acceptance.
- **PENDING — fresh independent review:** Workstream 05 must judge the four replacement hashes.
- **PENDING — canonical integration:** Workstream 08 may map only independently accepted replacement hashes.
- **0 new assets generated; 0 legacy assets overwritten; 0 canonical mappings changed.**

## Next handoff

1. **05:** prioritize actual-pixel review of replacement detail blobs `adba95dc...`, `b382339e...`, `2b09d950...`, and `465fe45a...`, checking exact identity/theme/tier, dimensional anatomy/materials, lighting, framing and card readability.
2. **14:** if Workstream 05 needs reproducible screenshots, extend the existing staged-art fixture for these exact candidate paths. Do not wire candidates canonically merely to render them.
3. **06:** preserve any rejected replacement hash and repair only that exact ID. If the four pass, immediately advance the next bounded repair batch from the theme-hold list rather than regenerating accepted work.
4. **08:** integrate only exact replacement hashes independently accepted by 05 plus automated metadata/file/content checks.

**No avatar UI, item/equipment IDs, ownership, Buddy Bond, saves, pricing, learning/economy logic, canonical manifest/runtime, Replit/Floot, or `main` was changed.**
