# Catalog Sprint — Workstream 08 Integration

STATUS: **BLOCKED ON INDEPENDENT ART REVIEW — NO CANONICAL PROMOTIONS THIS RUN**

Branch: `screenshot-match-preproduction` only  
Audited source head: `6f9d7f6261b84d0f9f9ad13b0c591e0ef7a88590`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Canonical catalog state

The current Store still contains **192 permanent IDs**. The canonical manifest remains v12 with **99 final-portable**, **23 interim-not-verified**, and **93 non-final**. The runtime currently has **122 exact-ID artwork mappings**: the 99 final-portable entries plus the 23 interim Aura/companion entries. The manifest still records **0 duplicate asset paths**.

No manifest or runtime change was made in this pass because Workstream 08 is not allowed to convert producer `READY_FOR_REVIEW` output into final art without independent rendered acceptance.

## Sprint output available to integrate

Four production handoffs are now present and structurally coherent:

- **CHAT / Seating:** 11 candidates, `seating-2` through `seating-12`; browser-rendered by the producer and all marked READY_FOR_REVIEW.
- **04 / Lighting:** 12 candidates, `lighting-1` through `lighting-12`; producer XML/render/contact-sheet checks pass and all remain READY_FOR_REVIEW.
- **05 / Wall Decor:** 12 candidates, `wall-1` through `wall-12`; metadata/path/source checks pass and all remain READY_FOR_REVIEW.
- **06 / Companions:** 11 pre-existing interim candidates, `companions-2` through `companions-12`; exact files/metadata were inspected and remain READY_FOR_REVIEW rather than being relabeled final.

That is **46 staged candidates** total: **35 newly authored candidates** plus **11 pre-existing interim companion candidates**. Another **47 assigned IDs** still have no sprint handoff: desks (03), rugs (07), decor (09), and auras (11).

## Metadata and identity checks

The four available handoffs match the current `gameModel.js` names, collection order, tier rules, themes, prices/star requirements, and assigned IDs. Within each staged lane the recorded Git blob identities are unique; no cross-lane blob identity collision was observed among the 46 reported candidates. This is useful duplicate evidence, but it is **not** a substitute for the all-catalog rendered/hash audit required by Workstream 14.

Current evidence bindings:

- `lane-CHAT.json` blob `8d19cae6960874f612c646b7b79a7a1df7651a4d`
- `lane-04.json` blob `2b20dac09b16f66bb4d2de6fc702de2be57c90df`
- `lane-05.json` blob `1dc6c564e9172ddae7f6a607ce8fbfde9e292a4c`
- `lane-06.json` blob `266932942d7203d5cc2d33febcea68b542962b9a`
- manifest blob `862894db70500087409396dc5a72d032cf00a693`
- runtime blob `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`
- game model blob `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`

## Why nothing was promoted

`docs/preproduction/catalog-sprint/art-review.json` is not present, so there is no Workstream 01 hash-bound independent acceptance for the staged candidates. `docs/preproduction/catalog-sprint/release-qa.json` is also not present, so there is no Workstream 14 independent release disposition. The sprint contract explicitly forbids Workstream 08 from treating producer render checks, valid SVGs, unique paths, or `READY_FOR_REVIEW` labels as final visual approval.

Therefore:

- integrated IDs this run: **0**
- canonical final-portable count: **99**
- independently sprint-approved count recorded by 08: **0**
- pending independent review: **46**
- canonical non-final count: **93**

## Tests/build

There was **no coherent canonical integration** in this pass, so the required post-integration catalog regression suite and production build were not triggered. Running them without a manifest/runtime change would not clear the missing visual-acceptance gate. Producer-level checks remain evidence for staging only.

## Next handoff

1. Workstreams 01 and/or 14 should render the exact staged blobs and record item-specific ACCEPT / REWORK / BLOCKED decisions bound to hashes.
2. Workstreams 03, 07, 09, and 11 should publish the remaining desks, rugs, decor, and aura lane handoffs.
3. Workstream 08 should then re-read the latest branch and merge only accepted exact-ID assets into `catalog-art-manifest.json` and `src/catalogArtRuntime.js`, followed immediately by duplicate checks, relevant catalog tests, missing-image fallback verification, and a production build.
4. Workstream 15 retains sole authority to switch out of `CATALOG_SPRINT` after the 192-item gate is actually satisfied.
