# Catalog Sprint — Workstream 08 Integration

STATUS: **0 ACCEPT / 95 INDEPENDENT REWORKS / 12 BRANCH-STORED REPLACEMENTS AWAITING FRESH REVIEW**

Branch: `screenshot-match-preproduction` only  
Audited source head before this refresh: `b8d8dc1bdea4c1790c445fd210cbf1023a8f5f4e`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Canonical decision

Workstream 08 remains the only writer of `catalog-art-manifest.json` and `src/catalogArtRuntime.js` during `CATALOG_SPRINT`.

I did **not** change either canonical file in this pass because there is still **no qualified independent ACCEPT for any current or replacement asset hash**. V2 allows immediate micro-batch integration after one qualified independent exact-hash ACCEPT, but none exists yet.

Canonical state remains:

- actual Store IDs: **192**
- manifest version: **12**
- legacy `final-portable`: **99**
- `interim-not-verified`: **23**
- non-final relative to the legacy label: **93**
- manifest entries/runtime mappings: **122 / 122**
- duplicate manifest paths recorded: **0**
- V2 exact-hash ACCEPTs: **0**
- canonical promotions this pass: **0**

Stable canonical hashes remain manifest `862894db70500087409396dc5a72d032cf00a693`, runtime `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`, and game model `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`.

## Review coverage advanced to 95 / 192

All four V2 review shards are present. Exact-hash coverage is now **95 reviewed / 0 ACCEPT / 95 REWORK / 0 BLOCKED**, leaving **97 item IDs** without a qualified current-hash visual disposition.

Reviewed families:

- legacy Tops: 12 REWORK — reviewer 01
- Bottoms: 12 REWORK — reviewer 01
- Shoes: 12 REWORK — reviewer 02
- Seating 2–12: 11 REWORK — reviewer 02
- legacy Auras: 12 REWORK — reviewer 05
- legacy Companions: 12 REWORK — reviewer 05
- Beds: 12 REWORK — reviewer 05
- legacy Lighting: 12 REWORK — reviewer 14

The repeated finding is consistent: identities are generally readable, but current artwork is too flat/vector-like for the premium dimensional collectible target. A legacy `final-portable` or interim label is not screenshot-quality acceptance.

## Branch-stored replacement inventory now totals 12 versions

Six previously stored replacements remain pending fresh review:

- `tops-7` → `/assets/catalog/tops-7-w09-v2.svg` — `fe5b33a5b8eb8de137abab7daf315ddfaaaaf408`
- `tops-8` → `/assets/catalog/tops-8-w09-v2.svg` — `81bbec69f1e164b9772e0f867409581526f5255a`
- `auras-1` → `/assets/catalog/auras-1-v2.svg` — `48639f1262052350660127bbc5d3d25de34d61e3`
- `auras-2` → `/assets/catalog/auras-2-v2.svg` — `c2be24c165f3e28995d5d2eb946dbdde983afe2a`
- `auras-3` → `/assets/catalog/auras-3-v2.svg` — `9b682148eb26898ec5f56ac11eac635e7c93c8fc`
- `auras-4` → `/assets/catalog/auras-4-v2.svg` — `3059eae7ab68c125f1af1696305fdf5689131455`

A new producer-stage commit, `da070b301e8ce57ca10d44bcb4ccd2078cfe4690`, attached the six preserved Firefly Tops repairs to versioned branch paths without regenerating them:

- `tops-1` → `/assets/catalog/tops-1-w07-v2.jpg` — Git blob `5fd9544999694ec27c9b6247aaffeca1c0c7b484`
- `tops-2` → `/assets/catalog/tops-2-w07-v2.jpg` — `428450782feb314535163b54d0405f9af8b7cd65`
- `tops-3` → `/assets/catalog/tops-3-w07-v2.jpg` — `b4a834586feae169e102f43aeceaaaf11893ec11`
- `tops-4` → `/assets/catalog/tops-4-w07-v2.jpg` — `26d03c5ba26c565e79e809f825db87c9be1dba21`
- `tops-5` → `/assets/catalog/tops-5-w07-v2.jpg` — `78c5c89270be2f505f77d033f340c72cf0ff80a8`
- `tops-6` → `/assets/catalog/tops-6-w07-v2.jpg` — `44d88aa84246f9d8a76b3f22c408653eb28176aa`

These 12 versions are **replacement candidates only**. None is canonical and none counts final until its current hash receives independent pixel ACCEPT.

The StarBlox CI run on the Tops staging commit (`35653350977`) completed successfully. That proves the branch remains build/test healthy at that stage, but it is **not visual acceptance** and does not prove card/detail rendering quality for the new images.

## Remaining generated-image transfer work

The binary-transfer path is proven. The six Tops Firefly blobs have now moved from Git-object-only to actual versioned branch paths.

Four improved Lighting Firefly images remain preserved only as immutable Git objects and still need Workstream 04 path attachment/readback:

- lighting-1: `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3`
- lighting-2: `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3`
- lighting-3: `fc21ddf5a608ee393410ff9682cf2ef87a56c46d`
- lighting-4: `7975e490a9fb97574f03081acf9fc871c22224f3`

No regeneration is needed.

## Other prepared inventory

- Original assigned repository-staged candidate IDs remain **82**.
- Desk lane: `desks-2..4` are generated locally but **0 are repository-staged**; `desks-5..12` still need candidates.
- Rich companion intake remains **10 IDs / 30 repository-stored binary files**; legacy companion versions are REWORK, so richer versions need exact-hash reviewer-05 decisions before integration.
- Catalog persistence automated evidence is materially improved, but real-browser transaction timing/concurrency remains a final release blocker rather than a catalog mapping blocker.

## Validation this pass

- **PASS** — phase is `CATALOG_SPRINT`; Workstream 08 remains canonical writer.
- **PASS** — actual Store model remains 192 IDs on unchanged game-model hash.
- **PASS** — manifest/runtime stayed unchanged; duplicate manifest paths remain zero.
- **PASS** — all four review shards reconciled to **95 REWORK / 0 ACCEPT**.
- **PASS** — 12 replacement candidate versions are now branch-stored, including newly attached Tops 1–6 JPGs.
- **PASS** — Tops 1–6 staging commit exists and CI succeeded on that stage.
- **PENDING** — staged-art fixture must render the 12 current replacement hashes at card/detail scale before reviewers 01/05 can independently disposition them.
- **PENDING** — Workstream 04 must attach Lighting 1–4 preserved blobs to branch paths.
- **FAIL / incomplete** — desks remain 0 repository-staged.
- **NOT RUN** — post-integration catalog tests/build/Store validation because no canonical mapping changed.
- **FAIL** — catalog release gate remains open.

## Exact next dependencies

1. **14:** render the 12 current replacement versions in the generalized staged-art fixture with ID, repository path, exact Git blob, card screenshot and detail screenshot.
2. **01:** review Tops 1–8 replacement hashes from that fixture. A new ACCEPT/REWORK belongs to the replacement hash; legacy decisions do not transfer.
3. **05:** review Aura 1–4 replacement hashes from that fixture.
4. **04:** attach Lighting 1–4 preserved Firefly blobs to versioned branch paths using latest-head non-force commits and exact readback.
5. **03:** stage the already-generated desks-2..4 bytes, then continue desks-5..12.
6. **14:** continue Wall/Rugs/Decor review in parallel.
7. **08:** integrate the **first qualified exact-hash ACCEPT immediately**, then run affected catalog regression/build and canonical Store checks for that coherent batch.

Detailed machine-readable evidence is in `docs/preproduction/catalog-sprint/integration.json`. Workstream 15 alone may switch phase after the complete catalog gate passes.
