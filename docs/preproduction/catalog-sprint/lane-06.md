# Art + Visuals Sprint — Lane 06 Companions / Seating / Shoes

STATUS: **COMPANION 2/5/6/7 PENDING REVIEWER 05 · SEATING 7–10 ACCEPTED · SEATING 11–12 READY FOR REVIEWER 02**

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

## Material increment this pass — Seating 11–12 premium pilot

Because the companion batch remains review-blocked and Seating 7–10 has passed reviewer 02, Workstream 06 advanced only the two remaining assigned Seating IDs. Existing legacy SVGs and the earlier low-resolution Seating-11 chat-intake crop were preserved rather than relabeled.

Both new items use original premium dimensional product art with distinct silhouettes/materials, no third-party character geometry, no Store-ID changes, and no canonical wiring. Exact current Store metadata was checked before staging.

| ID | Store identity | Candidate path | Exact Git blob | SHA-256 | Bytes | Dimensions |
| --- | --- | --- | --- | --- | ---: | --- |
| `seating-11` | Moon Chair · T4 · Galaxy Glow · 1276 · 5★ | `public/assets/catalog/seating-11-w06-v2.png` | `5126e9db42ed26b15ddf7229218337753b1868a8` | `2bf8cbeac3824cd34c60c98d7c4d56d586ba7039cebe8e9d14122934a7819599` | 579,001 | 768×768 |
| `seating-12` | Throne Chair · T5 · Sunny Pop · 1740 · 9★ | `public/assets/catalog/seating-12-w06-v2.png` | `793b32568f2089eaadf33853992864775a7e90d1` | `589181f736b7837d1cfb6e9adf16446f908cb8ff02d62027bc37c826f5b3d83e` | 577,216 | 768×768 |

Full-resolution retained sources:

| ID | Source path | Exact Git blob | SHA-256 | Bytes | Dimensions |
| --- | --- | --- | --- | ---: | --- |
| `seating-11` | `docs/preproduction/catalog-sprint/recovered-originals/seating-11-12-20260921/seating-11-source.png` | `117f0fd52f9870b90fd27b1f4d084b239674d288` | `db820aef4582442ff30031f9b46e9c5f2dd674c450e54ab9c0f35a4db429e577` | 1,055,128 | 1024×1024 |
| `seating-12` | `docs/preproduction/catalog-sprint/recovered-originals/seating-11-12-20260921/seating-12-source.png` | `eab756b66bbd4c7aa2520379543879d4962033a7` | `2a52fd1ecb3e3ec08f89440041164859b1311ff51ed3ed07b01d63cddab7046e` | 1,108,644 | 1024×1024 |

### Actual checks completed

- **PASS 2/2 — current Store metadata:** name, collection, type, tier, theme, price and star requirement checked against the exported Store model before any asset commit.
- **PASS 2/2 — full-resolution source decode:** PNG, 1024×1024.
- **PASS 2/2 — optimized review derivative decode:** PNG, 768×768.
- **PASS 2/2 — unique candidate content.**
- **PASS 4/4 — post-push repository readback:** source and candidate blobs at exact current-branch paths/hashes/byte sizes.
- **PASS 2/2 — producer actual-pixel inspection:** Moon Chair reads as a dimensional crescent seat with Galaxy Glow treatment; Throne Chair reads as a materially richer sunburst high-back throne with Sunny Pop treatment. Both are child-friendly, accessory/material-distinct, text-free and unbranded.
- **PENDING — independent actual-pixel acceptance:** reviewer 02 must decide the exact two candidate hashes above.
- **NOT PERFORMED — canonical integration:** Workstream 08 only.

Asset staging workflow run: `35672223467`  
Asset commit: `efe5551ad0f42e23bb4524578f367a42e9a6b4cb`

Temporary intake tooling removed itself after the asset commit; the current branch retains only the intended versioned assets/sources plus this lane handoff.

## Next bounded work

1. **05:** independently review `companions-2/5/6/7` current exact rich hashes; do not transfer legacy SVG REWORK decisions.
2. **02:** independently review `seating-11` and `seating-12` exact staged PNG hashes at card/detail scale.
3. **08:** remain sole owner of canonical catalog manifest/runtime integration.
4. **06:** consume new reviewer decisions first. Preserve accepted bytes; repair only exact REWORK IDs. If reviews remain pending and `ART_VISUALS_SPRINT.json` still assigns the secondary lane, advance only the next 2–4 IDs from `shoes-7..12` rather than repeating companion/seating work.

**No player save, equipment/item ID, ownership, Buddy Bond, learning progress, pricing/economy, canonical manifest/runtime, Replit, Floot, deployment, or `main` was changed.**
