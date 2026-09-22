## Workstream 08 — canonical catalog art integration

Phase remains **ART_AND_VISUALS_ONLY / CATALOG_SPRINT**. Workstream 08 is the sole canonical writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js`. It integrates only current exact-hash qualified independent ACCEPT evidence and does not generate art, change gameplay/catalog identity metadata, change phase, or authorize deployment. Replit/Floot/main/player data remain untouched.

## V2 canonical increment — Rugs 12 v3 exact-hash ACCEPT

Published canonical commit: `6666f15536ac8d5cacedcd0a282ad24364abf146` (manifest v28).

Reviewer 14 independently ACCEPTED the current `rugs-12` **Luxe Star Rug** asset from actual card/detail pixels:
- canonical path: `/assets/catalog/rugs-12-w07-v3.png`
- repository path: `public/assets/catalog/rugs-12-w07-v3.png`
- Git blob: `eea2fc5b78c1186342f91f597bc792160ab8f8fe`
- SHA256: `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3`
- raster: 1024×1024 PNG, 1,039,033 bytes
- authoritative Store metadata: Rugs / Luxe Star Rug / Tier 5 / Sunny Pop
- producer: 07; independent reviewer: 14
- direct evidence: `docs/preproduction/catalog-sprint/chat-rugs-12-v3-reconciled-review-14-to-08.json`
- normalized shard: `docs/preproduction/catalog-sprint/reviews/14.json`

The exact live path/blob, metadata, safe decode evidence, reviewer independence, current-hash disagreement state and repository content uniqueness all passed before wiring. The previously accepted mappings and all prior asset versions remain preserved for rollback. No stable ID, price, unlock, ownership, save, gameplay or player record changed.

### Canonical counts after manifest v28

- catalog target: **192 IDs**
- manifest/runtime mappings: **164 / 164**
- legacy `final-portable`: **157**
- legacy interim-not-verified: **7**
- legacy non-final relative to target: **35**
- independently accepted current hashes canonically wired: **91 / 192**
- strict remaining: **101**
- release-cleared: **0 / 192**
- duplicate canonical paths introduced by this increment: **0**
- integrated exact content blob occurrences in current repository tree: **1**

Generated-local this run: 0; preserved-blob-only: 0; newly staged: 0; qualified ACCEPTs consumed: 1; strict canonical delta: +1.

### Validation

On exact canonical commit `6666f15536ac8d5cacedcd0a282ad24364abf146`, `src/catalogManifestQa.test.js` passed **4/4**, and the catalog runtime/Store tests passed. The generic CI wrapper remains red because unrelated `scripts/artPromptOptimizer.test.mjs` contains no test suite; **99 tests passed and 2 were skipped**, with no catalog assertion weakened.

Catalog Mobile QA run `35707148100` built the production Vite bundle successfully. Its changed-art Store/mobile gate remains **BLOCKED**: all six controls resolve the visible Store nav button and then time out during the pointer click before Store content is reached. Artifact `10684444909`. This is the same shared navigation blocker and is not treated as a Rugs 12 decode/mapping rejection; the accepted mapping remains canonical and release-cleared stays 0.

Deterministic reference run `35707148121` verified the authoritative committed desktop references and passed its build; deterministic Home/Store/Quest capture was still running at the last verified read, so no screenshot-parity claim is made.

### Current review queue after Rugs 12

A live 01/02/05/14 recheck found no additional qualified current-hash ACCEPT to integrate. Reviewer 01 still has Tops 11-12 v6 BLOCKED on qualified signature/card-detail evidence and Headwear 5-8 unqualified. Reviewer 02 has no newer accepted hash beyond already-canonical Shoes/Seating. Reviewer 05 has no newer accepted hash beyond already-canonical Aura 11 and its preserved assigned accepts. Reviewer 14's Rugs 12 `eea2fc5b…` ACCEPT is now consumed/canonical and no newer accepted exact hash is present.

## Recent prior accepted increments

Manifest v27 integrated Shoes 7-10 (`04eb1f4c4a6f9efcd0e6bea9d33e7580740dcfd4`) and Aura 11 (`ad8867efc70d1b123cbc5e2f157766bec58e510d`), establishing the strict accepted/canonical floor of 90 consumed by this Rugs 12 increment. Manifest v25 previously integrated Rug 11 v3 exact hash `2c93f18fb5960f7056819c341a3da8f7fff3fb9d`. Seating 1/11/12 were integrated in `30089f73e38a18b746dd1ae981041c4c181caa3a`.

Only Workstream 15 may declare ART_VISUALS_COMPLETE or change phase. No catalog/art completion authorizes deployment.