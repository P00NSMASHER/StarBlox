# Catalog Sprint — Lane 06 Companions + Secondary Seating Repair

STATUS: **COMPANION SECOND BATCH PENDING REVIEWER 05 / SEATING 7–10 STAGED + RENDERED FOR REVIEWER 02**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Phase: `CATALOG_SPRINT`  
Current control policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Primary production assignment: `companions-2` through `companions-12`  
Explicit repair capacity: rejected companions, then `seating-7..12`, then `shoes-7..12`  
Independent companion reviewer: **05**  
Independent Seating/Shoes reviewer: **02**  
Canonical integration owner: **08**  
Canonical manifest/runtime: **unchanged by this lane**  
Self-approval: **NO**

## Accepted companion versions — preserve exactly

Reviewer 05 independently accepted these exact rich replacement hashes. Workstream 06 did not regenerate or overwrite them:

- `companions-3` Berry Bunny — `adba95dc769e603337dc4ac38b9a513ce9914b10`
- `companions-4` Sunny Bird — `b382339e76ed9d4aeae72b1c8cccc904abf85b57`
- `companions-10` Pixel Bot — `2b09d950b08083bb3a9ec5e2073ae23d88411cf4`
- `companions-11` Dream Dragon — `465fe45abbe4d9b4355444cb3f75a49927b604e9`

These remain producer-frozen. Only Workstream 08 may alter canonical wiring.

## Companion batch currently waiting on reviewer 05

The current four rich repository-stored companion replacements remain unchanged and pending fresh exact-hash review:

| ID | Item | Tier / theme | Detail path | Exact Git blob |
| --- | --- | --- | --- | --- |
| `companions-2` | Moon Cat | T1 / Pixel Party | `public/assets/catalog-candidates/chat-20260921-intake01/companions-2-detail.webp` | `88d10d6f8c412d0ab7fde6ac7a7ff202858077db` |
| `companions-5` | Pebble Turtle | T2 / Galaxy Glow | `public/assets/catalog-candidates/chat-20260921-intake01/companions-5-detail.webp` | `1ae7b431e519563ee1dbbdb0ae762bfee6f95ac0` |
| `companions-6` | Comet Fox | T2 / Sunny Pop | `public/assets/catalog-candidates/chat-20260921-intake01/companions-6-detail.webp` | `28cb411201d8ec30dae2f70b740efe1e86985386` |
| `companions-7` | Story Owl | T3 / Aqua Wave | `public/assets/catalog-candidates/chat-20260921-intake01/companions-7-detail.webp` | `39d35ea40a0a138ae99ddcdc09f8f2a3683fa49d` |

No new reviewer-05 companion decision has appeared since the prior fresh-companion review. Per Delivery Protocol V2, Workstream 06 did not repeat generation or source inspection while these exact hashes remain pending.

## Material increment this pass — Seating 7–10 premium pilot

Because companion work is review-blocked, Workstream 06 used its explicit secondary repair capacity and completed a bounded **four-item Seating pilot**. All four legacy versions remain preserved.

The batch generated separate premium original images, retained full-resolution 1024×1024 PNG sources, stored 768×768 PNG review candidates at versioned paths, verified exact repository readback and unique content hashes, and rendered each exact candidate in an isolated browser review fixture. Nothing is self-approved or canonical.

| ID | Item | Tier / theme | Candidate path | Exact Git blob | Candidate bytes |
| --- | --- | --- | --- | --- | ---: |
| `seating-7` | Lounge Chair | T3 / Cloud Pop | `public/assets/catalog/seating-7-w06-v2.png` | `91457eddbb3ae915867d717eec72632ea6a183be` | 547,583 |
| `seating-8` | Bubble Seat | T3 / Pixel Party | `public/assets/catalog/seating-8-w06-v2.png` | `23c02ab51249ab373aab264a17778a090d023eb4` | 566,882 |
| `seating-9` | Art Stool | T3 / Berry Blast | `public/assets/catalog/seating-9-w06-v2.png` | `7fcdea13121a8820dd8dc64e8982637acb2c5819` | 527,794 |
| `seating-10` | Pod Chair | T4 / Garden Glow | `public/assets/catalog/seating-10-w06-v2.png` | `9aa53664cbc8ee24283ea44830f1f3037c576340` | 591,815 |

Full-quality originals are retained under `docs/preproduction/catalog-sprint/recovered-originals/seating-7-10-20260921/`. Exact source/candidate SHA-256, Git blob hashes, dimensions, byte sizes and generation/resize provenance are recorded in `lane-06-seating-7-10-intake.json`.

### Actual checks completed

- **PASS 4/4 — metadata:** exact name/category/type/tier/theme/price/star requirement checked against the current exported Store model.
- **PASS 4/4 — full-resolution source decode:** PNG, 1024×1024.
- **PASS 4/4 — review candidate decode:** PNG, 768×768.
- **PASS 4/4 — distinct candidate content:** four unique measured SHA-256 hashes.
- **PASS 8/8 — exact repository readback:** four source files + four review candidates.
- **PASS 4/4 — isolated browser render:** workflow run `35667087896`, card contact sheet plus four 768px detail renders, no render errors.
- **PENDING — independent visual review:** Workstream 02 must judge the exact hashes above.
- **NOT PERFORMED — canonical integration:** Workstream 08 only.

The visual recipe is intentionally not being scaled to Seating 11–12 yet. Reviewer 02 must first decide this four-item pilot. If it passes, Workstream 06 can continue `seating-11/12`; if any item is REWORK, preserve that hash and repair only the rejected ID before moving to Shoes 7–12.

## Remaining queue

Companions after the pending four-item batch:

- rich candidates still behind it: `companions-8` Bubble Axolotl and `companions-12` Star Unicorn;
- no rich imported replacement yet: `companions-1` Sprout Pup and `companions-9` Garden Snail;
- accepted/frozen: `companions-3`, `companions-4`, `companions-10`, `companions-11`.

Secondary capacity after reviewer-02 decision:

- Seating: `seating-11`, `seating-12`
- Shoes: `shoes-7` through `shoes-12`

## Handoff

1. **05:** independently review `companions-2/5/6/7` exact rich hashes when current render evidence is available; do not transfer legacy REWORK decisions.
2. **02:** independently review `seating-7..10` exact staged PNG hashes from workflow run `35667087896` at card/detail scale.
3. **08:** remain sole owner of canonical catalog manifest/runtime wiring.
4. **06:** preserve all accepted hashes. After reviewer input, repair only exact REWORK IDs or advance the next explicitly assigned IDs; do not scale an unreviewed visual recipe.

**No avatar UI, item/equipment IDs, ownership, Buddy Bond, saves, pricing, learning/economy logic, canonical manifest/runtime, Replit/Floot, or `main` was changed.**
