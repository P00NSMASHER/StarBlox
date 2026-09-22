# Catalog Sprint — Lane 03 Desks & Tech

STATUS: **DESKS 2–6 INDEPENDENTLY ACCEPTED — PRESERVE EXACT HASHES; DESKS 7–12 HOLD — NO SPECULATIVE REPLACEMENT**

Branch: `screenshot-match-preproduction`  
Workstream: 03  
Allocation: `ART_AND_VISUALS_ONLY`  
Observed coordination head before this reconciliation: `6fc0680b0c6be4554fccc97dda72f855ce4c6714`  
Independent Desk reviewer: **05**  
Canonical catalog writer: **08 only**  
Cross-owner coordinator: **15 only**

## Useful reconciliation this cycle

Current reviewer-05 evidence changed the Desk lane materially: Desk 2–4 are no longer pending. Reviewer 05 now preserves **ACCEPT** decisions for the exact current Desk 2–4 PNG hashes, alongside the already accepted Desk 5–6 hashes. Lane 03 therefore freezes all five accepted replacements and does not regenerate or restyle them.

No Desk 7–12 replacement was generated. The current authoritative evidence contains no exact reviewer-05 REWORK for those IDs and no new explicit unfinished assignment from 15. Legacy age alone is not permission to replace them.

This was a documentation/evidence reconciliation only. No runtime/CSS, asset bytes, canonical manifest/runtime, player state, learning content, prices/unlocks, or reference images changed, so tests/build were not redundantly rerun.

## Current Desk truth

| ID | Item | Tier | Theme | Current path | Git blob SHA | Size | Review state |
|---|---|---:|---|---|---|---:|---|
| `desks-1` | Tiny Homework Desk | preserved | preserved | `/assets/catalog/desks-1.svg` | `1b39d2f14df20364ee908ed01fa48f0c82b66e6a` | 2,189 B | preserve existing |
| `desks-2` | Cloud Study Desk | 1 | Candy Core | `public/assets/catalog/desks-2-chat-v2.png` | `277eb1e38e8a69caa0dab6d4d27bbb91796746f8` | 845,051 B | **ACCEPT reviewer 05** |
| `desks-3` | Pixel Mini Setup | 1 | Adventure Club | `public/assets/catalog/desks-3-chat-v2.png` | `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e` | 1,148,489 B | **ACCEPT reviewer 05** |
| `desks-4` | Berry Vanity Desk | 2 | Cloud Pop | `public/assets/catalog/desks-4-chat-v2.png` | `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025` | 1,043,349 B | **ACCEPT reviewer 05** |
| `desks-5` | Garden Book Desk | 2 | Pixel Party | `public/assets/catalog/desks-5-w03-recovered-v2.jpg` | `95fe65632e4f40b76b23cce30071ee2fdc5b4399` | 51,545 B | **ACCEPT reviewer 05** |
| `desks-6` | Galaxy Gamer Setup | 2 | Berry Blast | `public/assets/catalog/desks-6-w03-recovered-v2.jpg` | `52df05265de236911927b904b07e68dac7a17828` | 34,981 B | **ACCEPT reviewer 05** |

## Reviewer-05 evidence

The current `docs/preproduction/catalog-sprint/reviews/05.json` explicitly preserves the following current exact-hash Desk accepts:

- `desks-2` → `277eb1e38e8a69caa0dab6d4d27bbb91796746f8`
- `desks-3` → `aeebeacdc4a95bf75af36583dae6e2391d9a1d9e`
- `desks-4` → `6f87e1527ec7d9bf1a3f81e1f54320f462dbb025`
- `desks-5` → `95fe65632e4f40b76b23cce30071ee2fdc5b4399`
- `desks-6` → `52df05265de236911927b904b07e68dac7a17828`

Desk 2–4 are therefore no longer review-pending. Their current PNG replacements are accepted exact hashes and must not be replaced or churned by the producer lane. Desk 5–6 remain accepted at their prior exact hashes and are likewise frozen.

Reviewer 05's current file records its prior shard as preserving all exact-hash Desk 2–6 acceptance history. Workstream 08 alone may perform canonical wiring after its own metadata/file/content checks; Workstream 03 does not modify manifest/runtime mappings.

### Superseded Desk 2–4 files — never select for current review

- `desks-2-v1.webp` — `357f4ba8385e737499f12409c0bea141f9bc5e6a`
- `desks-3-v1.webp` — `b3352961988d7e9c5ff48d1559fc4d2296d4eab3`
- `desks-4-v1.webp` — `711feeb78e6d08351fc2fd2d3176ddb1a288e8f2`

Those old WebP blobs remain audit history only. They were superseded after invalid-signature/nondecoding evidence and must never displace the accepted current PNG hashes above.

## Checks performed this cycle

- **PASS** — read `ART_VISUALS_SPRINT.json` before older mission text.
- **PASS** — re-read the latest branch head before writing.
- **PASS** — re-read current reviewer-05 evidence after the lane's prior pending state.
- **PASS** — reviewer 05 currently preserves exact-hash ACCEPT for Desk 2–6.
- **PASS** — no accepted Desk was regenerated, overwritten, or restyled.
- **PASS** — no speculative Desk 7–12 production started.
- **NOT RERUN by design** — tests/build; this cycle changed owned documentation only, not runtime or asset bytes.
- **NOT ATTEMPTED by design** — canonical wiring; owner 08 only.
- **NOT ATTEMPTED by design** — shared Home runtime/CSS edits; coordination remains with 15 and shared asset owners.

## Handoff

1. **08:** Desk 2–6 exact ACCEPT hashes are eligible for normal metadata/file/content integration checks. 03 does not canonical-wire them.
2. **03:** preserve Desk 2–6. Do not regenerate any of those exact accepted versions.
3. **03 / 15:** Desk 7–12 remain on hold until reviewer 05 publishes an exact current REWORK or 15/current authoritative evidence explicitly assigns an unfinished Desk. If assigned, repair only that bounded 2–4 item batch.
4. While waiting, 03 may inspect and record bounded Home reference/material/composition differences in its own lane, but must not edit shared runtime/CSS or claim final Home acceptance.

**Replit/Floot/main/deploy/paid settings were not touched. Player data, saves, learning, Store IDs, prices/unlocks, canonical manifest/runtime and original reference files were not changed.**
