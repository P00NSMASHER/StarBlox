# Workstream 08 — Catalog Art Factory / Canonical Integrator

STATUS: **CATALOG SPRINT ACTIVE / 46 CANDIDATES STAGED / INDEPENDENT REVIEW BLOCKS PROMOTION**

Branch: `screenshot-match-preproduction` only  
Audited pre-report source head: `6f9d7f6261b84d0f9f9ad13b0c591e0ef7a88590`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Current canonical state

Workstream 08 is the sole sprint writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js`. The canonical catalog is intentionally unchanged in this run because no staged candidate yet has independent hash-bound visual acceptance.

- target Store IDs: **192**
- manifest version: **12**
- final-portable: **99**
- interim-not-verified: **23**
- canonical non-final: **93**
- canonical manifest entries: **122**
- exact-ID runtime mappings: **122**
- recorded duplicate asset paths: **0**
- independently sprint-approved artwork recorded by Workstream 08: **0**

The 122 canonical mappings are the 99 final-portable assets plus the 23 interim Aura/companion assets. A runtime mapping does not make an interim asset final.

## Sprint handoffs ingested

Four producer handoffs are currently present:

| Lane | IDs | Count | Producer status | Canonical status |
|---|---|---:|---|---|
| CHAT | `seating-2` … `seating-12` | 11 | READY_FOR_REVIEW; producer browser render PASS | not wired / not final |
| 04 | `lighting-1` … `lighting-12` | 12 | READY_FOR_REVIEW; producer XML/render/contact-sheet PASS | not wired / not final |
| 05 | `wall-1` … `wall-12` | 12 | READY_FOR_REVIEW; metadata/path/XML checks PASS | not wired / not final |
| 06 | `companions-2` … `companions-12` | 11 | READY_FOR_REVIEW; pre-existing interim candidates inspected | still interim-not-verified |

Totals:

- **46 staged candidates**
- **35 newly authored candidates** (seating + lighting + wall)
- **11 pre-existing interim companion candidates**
- **47 assigned IDs not yet handed off**: desks 03, rugs 07, decor 09, auras 11
- **0 canonical promotions this run**

The four available handoffs match the current Store metadata for names, IDs, tier calculation and themes. Their recorded blob identities are unique within each lane, and no cross-lane blob identity collision was observed among the 46 reported candidates. This does not replace the full rendered/content duplicate audit required by release QA.

## Evidence bindings

- `docs/preproduction/catalog-sprint/lane-CHAT.json` blob `8d19cae6960874f612c646b7b79a7a1df7651a4d`
- `docs/preproduction/catalog-sprint/lane-04.json` blob `2b20dac09b16f66bb4d2de6fc702de2be57c90df`
- `docs/preproduction/catalog-sprint/lane-05.json` blob `1dc6c564e9172ddae7f6a607ce8fbfde9e292a4c`
- `docs/preproduction/catalog-sprint/lane-06.json` blob `266932942d7203d5cc2d33febcea68b542962b9a`
- canonical manifest blob `862894db70500087409396dc5a72d032cf00a693`
- runtime blob `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`
- game model blob `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`

Detailed integration evidence is in:

- `docs/preproduction/catalog-sprint/integration.json`
- `docs/preproduction/catalog-sprint/integration.md`

## Review blockers

`docs/preproduction/catalog-sprint/art-review.json` is not present. `docs/preproduction/catalog-sprint/release-qa.json` is also not present. Therefore none of the 46 staged candidates has the independent reviewer evidence required by the sprint contract.

Workstream 08 will **not** promote an item because it is a valid SVG, because its producer rendered it successfully, because its path is unique, or because it is labeled `READY_FOR_REVIEW`. Independent item-specific acceptance must be bound to the exact staged asset hash first.

## Checks this run

- **PASS** — sprint phase, branch, and Workstream 08 canonical ownership confirmed.
- **PASS** — current `gameModel.js` still defines 16 collections × 12 items = 192 Store IDs.
- **PASS** — available producer IDs/names/tiers/themes match current Store metadata.
- **PASS** — available producer handoffs do not overlap one another.
- **PASS** — canonical manifest remains at 99 final-portable / 23 interim / 93 non-final with 0 recorded duplicate paths.
- **PASS** — current runtime remains explicit stable-ID mapping; no card-position inference.
- **BLOCKED** — independent Workstream 01 visual acceptance is missing.
- **BLOCKED** — Workstream 14 catalog release QA is missing.
- **NOT RUN** — post-integration catalog tests/build, because no coherent canonical integration occurred in this run.
- **NOT RUN** — Store browser validation after integration, for the same reason.

## Previous completed canonical batch

The prior canonical batch added original final-portable artwork for `beds-2` through `beds-12` plus `seating-1`, bringing the manifest to 99 final-portable assets. Those mappings remain preserved.

## Next action

1. Workstreams 01 and/or 14 independently render and record ACCEPT / REWORK / BLOCKED by exact hash for the 46 staged candidates.
2. Workstreams 03, 07, 09, and 11 publish desks, rugs, decor, and aura lane handoffs.
3. Workstream 08 re-reads the latest branch and merges **only accepted exact-ID assets** into the manifest/runtime.
4. After each coherent canonical integration, run duplicate checks, relevant catalog regression tests, missing-image/ownership fallback checks, production build, and Store browser validation before reporting PASS.
5. Workstream 15 alone decides when the 192-item catalog gate is satisfied and switches to `GAME_FINISHING`.
