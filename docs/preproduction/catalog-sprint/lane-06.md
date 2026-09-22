# Art + Visuals Sprint — Lane 06 Companions / Seating / Shoes

STATUS: **COMPANION 2/5/6/7 PENDING REVIEWER 05 · SEATING 7–10 ACCEPTED · SEATING 11–12 READY FOR WS14 RENDER / REVIEWER 02 BLOCKED ON PIXELS · SHOES 7–10 GENERATED REMOTELY / REPOSITORY UPLOAD BLOCKED**

Branch: `screenshot-match-preproduction`  
Workstream: 06  
Current control: `docs/preproduction/ART_VISUALS_SPRINT.json` + compatible `docs/preproduction/DELIVERY_PROTOCOL_V2.md` rules  
Assigned catalog scope: `companions-1..12`, `seating-7..12`, `shoes-7..12`  
Independent companion reviewer: **05**  
Independent Seating/Shoes reviewer: **02**  
Canonical integration owner: **08**  
Self-approval: **NO**  
Deployment / Replit / Floot / `main`: **FROZEN / UNTOUCHED**

## Accepted companion versions — preserve exactly

Reviewer 05 already accepted these exact rich replacements and the observed pipeline has integrated them. Workstream 06 did not regenerate or overwrite them:

- `companions-3` Berry Bunny — `adba95dc769e603337dc4ac38b9a513ce9914b10`
- `companions-4` Sunny Bird — `b382339e76ed9d4aeae72b1c8cccc904abf85b57`
- `companions-10` Pixel Bot — `2b09d950b08083bb3a9ec5e2073ae23d88411cf4`
- `companions-11` Dream Dragon — `465fe45abbe4d9b4355444cb3f75a49927b604e9`

Only Workstream 08 may alter canonical wiring.

## Companion batch still waiting on reviewer 05

The four repository-stored rich candidates below remain unchanged. The latest reviewer-05 shard still contains no fresh decision for these exact replacement hashes, so Workstream 06 did not regenerate them or transfer the obsolete legacy-SVG REWORK result onto them.

| ID | Item | Tier / theme | Detail path | Exact Git blob |
| --- | --- | --- | --- | --- |
| `companions-2` | Moon Cat | T1 / Pixel Party | `public/assets/catalog-candidates/chat-20260921-intake01/companions-2-detail.webp` | `88d10d6f8c412d0ab7fde6ac7a7ff202858077db` |
| `companions-5` | Pebble Turtle | T2 / Galaxy Glow | `public/assets/catalog-candidates/chat-20260921-intake01/companions-5-detail.webp` | `1ae7b431e519563ee1dbbdb0ae762bfee6f95ac0` |
| `companions-6` | Comet Fox | T2 / Sunny Pop | `public/assets/catalog-candidates/chat-20260921-intake01/companions-6-detail.webp` | `28cb411201d8ec30dae2f70b740efe1e86985386` |
| `companions-7` | Story Owl | T3 / Aqua Wave | `public/assets/catalog-candidates/chat-20260921-intake01/companions-7-detail.webp` | `39d35ea40a0a138ae99ddcdc09f8f2a3683fa49d` |

Remaining companion queue after those decisions: rich candidates `companions-8` Bubble Axolotl and `companions-12` Star Unicorn; no imported rich replacement yet for `companions-1` Sprout Pup and `companions-9` Garden Snail.

## Seating 7–10 — independently accepted

Reviewer 02 accepted all four previously staged exact hashes. They are producer-frozen now; no regeneration or overwrite is permitted unless a new concrete defect is evidenced.

| ID | Item | Tier / theme | Exact accepted Git blob |
| --- | --- | --- | --- |
| `seating-7` | Lounge Chair | T3 / Cloud Pop | `91457eddbb3ae915867d717eec72632ea6a183be` |
| `seating-8` | Bubble Seat | T3 / Pixel Party | `23c02ab51249ab373aab264a17778a090d023eb4` |
| `seating-9` | Art Stool | T3 / Berry Blast | `7fcdea13121a8820dd8dc64e8982637acb2c5819` |
| `seating-10` | Pod Chair | T4 / Garden Glow | `9aa53664cbc8ee24283ea44830f1f3037c576340` |

## Seating 11–12 — exact evidence reconciled, no regeneration

The current candidate bytes were preserved exactly. Direct branch readback and reviewer-02 evidence agree on the two candidate identities below; prior producer-ledger hashes were stale bookkeeping only and are preserved in `lane-06.json` reconciliation history rather than reused as review evidence.

| ID | Store identity | Candidate path | Exact Git blob | SHA-256 | Bytes | Dimensions |
| --- | --- | --- | --- | --- | ---: | --- |
| `seating-11` | Moon Chair · T4 · Galaxy Glow · 1276 · 5★ | `public/assets/catalog/seating-11-w06-v2.png` | `5126e9abcec4a09ef281dccb33aac6ba59b38b94` | `2bf8b90027f58f24323121305d675edc91ccb996605cd10ca73ccbe077645c47` | 579,001 | 768×768 |
| `seating-12` | Throne Chair · T5 · Sunny Pop · 1740 · 9★ | `public/assets/catalog/seating-12-w06-v2.png` | `793b32f60ed10fffa80b549e75b66858ac0d7e4f` | `5891818da864e528aaceb598f93d2b3426cb91c3eb1acd0375e4f57cbe7d69df` | 577,216 | 768×768 |

Full-resolution retained sources remain at their existing paths. Their current Git blob identities were re-read directly from the branch:

| ID | Source path | Exact current Git blob | Dimensions |
| --- | --- | --- | --- |
| `seating-11` | `docs/preproduction/catalog-sprint/recovered-originals/seating-11-12-20260921/seating-11-source.png` | `117f0bf64ef102b981e270add770b124e9ed4ba0` | 1024×1024 |
| `seating-12` | `docs/preproduction/catalog-sprint/recovered-originals/seating-11-12-20260921/seating-12-source.png` | `eab756cac2821ad2c77c549988f5ef371ce1574d` | 1024×1024 |

### Independent-render handoff

Reviewer 02 currently records both exact candidate hashes as **`BLOCKED_EVIDENCE_NOT_DECISION`**, because the shared staged-art fixture has not yet emitted real card/detail pixels for these exact versions. Workstream 14 should render `/assets/catalog/seating-11-w06-v2.png` at blob `5126e9abcec4a09ef281dccb33aac6ba59b38b94` and `/assets/catalog/seating-12-w06-v2.png` at blob `793b32f60ed10fffa80b549e75b66858ac0d7e4f`; reviewer 02 then independently decides ACCEPT/REWORK from those pixels. No regeneration is warranted for this evidence-only blocker.

## Shoes 7–10 — bounded production attempt, not staged

Reviewer 02 still has the exact legacy shoe SVGs in **REWORK**, and the current branch tree contains no newer `shoes-7-w*` through `shoes-10-w*` candidate paths. Workstream 06 therefore used the assigned 4-item production slot and produced visually inspected premium dimensional candidates for the exact Store identities: `shoes-7` Skate Shoe / T3 / Cloud Pop, `shoes-8` Chunky Sneaker / T3 / Pixel Party, `shoes-9` Light-Up Shoe / T3 / Berry Blast, and `shoes-10` Trail Boot / T4 / Garden Glow.

The generated pixels show full footwear pairs with materially distinct construction: Skate Shoe uses stitched pastel textile/suede panels, real laces and layered soles; Chunky Sneaker uses exaggerated stacked tread, lace cage and cyan/magenta pixel hardware; Light-Up Shoe uses berry/plum layered uppers and embedded luminous sole bars; Trail Boot uses deep lug soles, reinforced toes, padded collars, speed hooks and Garden Glow leaf detailing. All four passed producer visual inspection for distinct silhouette, material depth, pair completeness, child-friendly presentation and no text/branding/third-party IP.

**Repository status: `GENERATED_REMOTE / UPLOAD_BLOCKED / NOT_STAGED / NOT_REVIEWABLE`.** The generation/edit service returned only remote image outputs in this runtime, and the working container could not resolve those output hosts to obtain exact binary bytes. Therefore no source/candidate path, Git blob, SHA-256, byte count, repository readback or READY_FOR_REVIEW claim has been invented; the current legacy SVGs remain untouched. A later run may stage these exact visual concepts only after supported binary transfer is available, or regenerate a bounded batch if the remote outputs cannot be recovered.

## Current checks and boundaries

- **PASS — Seating 11–12 exact candidate identity:** direct branch/reviewer evidence matches the coordination hashes above.
- **PASS — Seating retained-source Git identity:** both source blob IDs were re-read directly and stale ledger values identified.
- **PENDING — Seating 11–12 independent pixel acceptance:** WS14 render evidence first, reviewer 02 decision second.
- **PASS — Shoes 7–10 eligibility:** current exact legacy hashes remain reviewer-02 REWORK and no newer staged candidate paths were present in the current branch tree before generation.
- **PASS — Shoes 7–10 producer visual inspection:** four distinct dimensional footwear concepts generated and inspected.
- **BLOCKED — Shoes 7–10 repository staging:** exact binary transfer/readback unavailable in this runtime; no staging claim made.
- **NOT PERFORMED — canonical integration:** Workstream 08 only.
- **UNCHANGED — player saves/equipped IDs, ownership, Buddy Bond, learning progress, Store IDs/economy, regression tests, original reference images, Replit/Floot/main/deployment.**

## Next bounded work

1. **14:** render the exact current Seating-11/12 hashes above at card/detail scale through the shared staged-art fixture.
2. **02:** independently decide Seating-11/12 from that exact render evidence; independently review Shoes 7–10 only after repository-staged exact binaries exist.
3. **06:** preserve all accepted Companion/Seating/Shoes versions; on the next run, first consume new reviewer decisions, then retry supported binary staging for the bounded Shoes 7–10 concepts if no newer candidate has appeared. Do not move to Shoes 11–12 until this 7–10 pilot has actual repository evidence/review.
4. **05:** continue independent Companion review on current exact hashes.
5. **08:** remain sole owner of canonical catalog manifest/runtime integration after exact-hash acceptance.

**No player save, equipment/item ID, ownership, Buddy Bond, learning progress, pricing/economy, canonical manifest/runtime, Replit, Floot, deployment, or `main` was changed.**
