# Catalog Sprint — Lane 03 Desks & Tech

STATUS: **DESKS 5–6 ACCEPTED — PRESERVE EXACT HASHES; DESKS 2–4 CURRENT PNG REPLACEMENTS PENDING REVIEWER 05; DESKS 7–12 HOLD — NO SPECULATIVE REPLACEMENT**

Branch: `screenshot-match-preproduction`  
Workstream: 03  
Allocation: `ART_AND_VISUALS_ONLY`  
Observed coordination head before this reconciliation: `59dc6137a2d6dbd55d4342083dd8ba5a224665d6`  
Independent Desk reviewer: **05**  
Canonical catalog writer: **08 only**  
Cross-owner coordinator: **15 only**

## Useful reconciliation this cycle

Lane 03 was stale: it still described Desk 5–6 as upload-blocked/awaiting review and pointed Desk 2–4 at superseded invalid WebP candidates. I reconciled the lane to current exact-hash evidence instead of generating more art.

Desk 5 and Desk 6 are now independently **ACCEPTED by reviewer 05**. Their exact repository bytes are present at the current paths and were re-read from the branch in this cycle. They are frozen from producer regeneration or stylistic churn.

Desk 2–4 now use the valid replacement PNGs created after the old WebP files failed signature/decode checks. The current PNG blobs were re-read from the branch and remain with reviewer 05. They are **not** being regenerated while that review is pending.

Desk 7–12 are deliberately on hold. Latest coordination does not allow replacing them merely because older catalog status is stale. Lane 03 will start another 2–4 item repair batch only after an exact current REWORK or an explicit unfinished assignment from Workstream 15/current authoritative evidence.

## Current Desk truth

| ID | Item | Tier | Theme | Current path | Git blob SHA | Size | Review state |
|---|---|---:|---|---|---|---:|---|
| `desks-1` | Tiny Homework Desk | preserved | preserved | `/assets/catalog/desks-1.svg` | `1b39d2f14df20364ee908ed01fa48f0c82b66e6a` | 2,189 B | preserve existing |
| `desks-2` | Cloud Study Desk | 1 | Candy Core | `public/assets/catalog/desks-2-chat-v2.png` | `277eb1e38e8a69caa0dab6d4d27bbb91796746f8` | 845,051 B | **PENDING reviewer 05** |
| `desks-3` | Pixel Mini Setup | 1 | Adventure Club | `public/assets/catalog/desks-3-chat-v2.png` | `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e` | 1,148,489 B | **PENDING reviewer 05** |
| `desks-4` | Berry Vanity Desk | 2 | Cloud Pop | `public/assets/catalog/desks-4-chat-v2.png` | `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025` | 1,043,349 B | **PENDING reviewer 05** |
| `desks-5` | Garden Book Desk | 2 | Pixel Party | `public/assets/catalog/desks-5-w03-recovered-v2.jpg` | `95fe65632e4f40b76b23cce30071ee2fdc5b4399` | 51,545 B | **ACCEPT reviewer 05** |
| `desks-6` | Galaxy Gamer Setup | 2 | Berry Blast | `public/assets/catalog/desks-6-w03-recovered-v2.jpg` | `52df05265de236911927b904b07e68dac7a17828` | 34,981 B | **ACCEPT reviewer 05** |

### Accepted evidence retained

Reviewer-05 commit `bccf05881847a8ff5ee63a7d7ca98a6f7630c457` binds the Desk 5–6 decisions to their exact current hashes. The review used workflow `35669227577`, artifact `10670532506`, with actual card/detail pixels and exact-hash binding for both assets.

Desk 5 acceptance finding: strong dimensional three-quarter furniture silhouette, rounded wood volume, drawers, book cubby, planter, articulated lamp, material depth and card readability appropriate to Tier 2 Pixel Party.

Desk 6 acceptance finding: layered dimensional gaming setup with galaxy monitor, keyboard, speakers/controllers, orb light, beveled supports and Berry Blast magenta accents; material separation and card readability pass at Tier 2.

### Superseded Desk 2–4 files — never select for current review

- `desks-2-v1.webp` — `357f4ba8385e737499f12409c0bea141f9bc5e6a`
- `desks-3-v1.webp` — `b3352961988d7e9c5ff48d1559fc4d2296d4eab3`
- `desks-4-v1.webp` — `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2`

Those prior WebP blobs are preserved only for audit. They were superseded after invalid-signature/nondecoding evidence and must not be confused with the current PNG candidates above.

## Checks performed this cycle

- **PASS** — read `ART_VISUALS_SPRINT.json` before older mission text.
- **PASS** — re-read latest branch before lane write.
- **PASS** — exact branch readback of current Desk 2–6 repository paths; returned blobs match lane hashes.
- **PASS** — reviewer-05 exact-hash ACCEPT evidence verified for Desk 5–6.
- **PASS** — no accepted Desk was regenerated or modified.
- **PASS** — no speculative Desk 7–12 generation started.
- **NOT ATTEMPTED by design** — canonical wiring; owner 08 only.
- **NOT ATTEMPTED by design** — shared Home runtime/CSS edits while Desk review remains active.

## Handoff

1. **05:** disposition only the current Desk 2–4 PNG hashes above. Do not transfer any verdict from the superseded WebP files.
2. **08:** Desk 5–6 exact ACCEPT hashes are eligible for normal metadata/file/content integration checks; 03 does not wire them.
3. **03:** preserve Desk 5–6 and wait for Desk 2–4 exact decisions. Repair only a concrete current REWORK. Do not begin Desk 7–12 without exact current REWORK evidence or explicit 15 assignment.
4. While waiting, 03 may record bounded Home reference/material/composition observations in its own lane, but must not touch shared runtime/CSS or claim final Home acceptance.

**Replit/Floot/main/deploy/paid settings were not touched. Player data, saves, learning, Store IDs, prices/unlocks, canonical manifest/runtime and original reference files were not changed.**
