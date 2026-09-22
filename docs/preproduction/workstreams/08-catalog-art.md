## Workstream 08 — canonical catalog art integration

Phase remains **ART_VISUALS_SPRINT / CATALOG_SPRINT**. Workstream 08 is the sole canonical writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js`; it does not generate art, change gameplay metadata, switch phase, or authorize deployment. Replit/Floot/main/player data remain untouched.

## V2 canonical increment — Seating 1 / 11 / 12

Published canonical commit: `30089f73e38a18b746dd1ae981041c4c181caa3a`.

Reviewer 02 independently accepted the exact current hashes for `seating-1` Floor Cushion (`/assets/catalog/seating-1-w01-v2.svg`, blob `50d5e16c2bd2647be4701e0c10b3ff9d786f41e1`, producer 01), `seating-11` Moon Chair (`/assets/catalog/seating-11-w06-v2.png`, blob `5126e9abcec4a09ef281dccb33aac6ba59b38b94`, producer 06), and `seating-12` Throne Chair (`/assets/catalog/seating-12-w06-v2.png`, blob `793b32f60ed10fffa80b549e75b66858ac0d7e4f`, producer 06).

Each current asset passed repository readback, exact Store name/type/tier/theme reconciliation, render/decode evidence, reviewer-independence and duplicate checks. No stale Seating 12 hash was substituted. Existing mappings and prior versions remain available through Git history for rollback.

### Canonical counts after manifest v24

- catalog target: **192 IDs**
- manifest/runtime mappings: **162 / 162**
- legacy `final-portable`: **154**
- legacy interim-not-verified: **8**
- legacy non-final/unmapped: **38**
- independently accepted current hashes canonically wired: **84 / 192**
- strict remaining: **108**
- release-cleared: **0 / 192**
- duplicate canonical paths: **0**
- duplicate exact canonical content: **0 known**

Do not treat the legacy 154 `final-portable` label as 154 independent visual accepts. The strict accepted/current-hash canonical count is 84.

### Validation

On exact canonical commit `30089f73...`, all four catalog-manifest invariants passed, catalog asset-safety passed, Store runtime tests passed 3/3, and **99 executed assertions passed with zero assertion failures**. The general CI wrapper remains red because unrelated `scripts/artPromptOptimizer.test.mjs` is collected as a test file but contains no test suite; Workstream 08 did not weaken or change that harness.

The production Vite build passed on the exact commit in both Preproduction Visual QA run `35685092735` and Catalog Mobile QA run `35685092749`.

Preproduction Visual QA run `35685092735` fails with 10 release blockers: Store navigation times out before Store content at all four tested visual viewports, and six existing Quest desktop geometry checks remain outside contract. Home structural checks remain green. Artifact `10676830427`.

Changed-art Catalog Mobile QA run `35685092749` fails with **6 release blockers**. All four reduced-motion viewports and both normal-motion controls time out clicking the visible Store navigation before Store content is reached; artifact `10677200113`. This reproduces the pre-existing shared Store-entry defect rather than an item decode/mapping failure, so accepted mappings are retained and Store/mobile release clearance remains open.

Fresh deterministic reference-capture run `35685092811` had passed reference-input verification and production build and was still capturing at the last verified read.

## Current handoff

Every future run must reread reviewers 01/02/05/14 against the live branch and integrate only newly qualified current exact-hash ACCEPTs. Never re-integrate the existing 84 accepted/canonical hashes, transfer verdicts across changed hashes, or accept producer self-review. Successful Store/mobile entry/proof, final accepted-set duplicate/near-duplicate review and the remaining 108 strict catalog items are still open. Only Workstream 15 may declare art completion or change phase, and no catalog completion authorizes deployment.
