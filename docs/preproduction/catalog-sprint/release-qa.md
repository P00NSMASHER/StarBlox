# Catalog Sprint — Workstream 14 Release QA

STATUS: **FAIL — CATALOG NOT RELEASE READY**

Branch: `screenshot-match-preproduction` only. Replit/Floot untouched. `main` unmodified. No real player data used.

## Material evidence this pass

The single staged-art Playwright workflow now renders both Workstream-14 collections and every repository-staged versioned replacement it can discover. The narrow fixture update keeps the existing framework/artifact and adds robust versioned-file discovery for SVG/JPG/WEBP plus hash binding. The latest proven run is `35657747373` on head `20515bb8fe8da83c56843ec3b690574699eeb2f7`, artifact `10665857539`, digest `sha256:1480d7f858cb7ecfffe7f53871d71aad230ff39df864d0a4ebd0a3025d5dc63f`.

That run successfully rendered **48/48** reviewer-14 items plus **27 versioned replacement files** with HTTP 200, nonzero decoded dimensions, card/detail screenshots and **zero page/console errors**. The replacement set includes Auras 1–8, Desks 2–4, Lighting 1–4 and Tops 1–12. Cross-partition renders are evidence only; Workstream 14 does not disposition Tops/Auras/Desks.

The workflow change itself was covered by normal CI run `35657434360` / job `106524446604` on `00d6cebfaf0e645ce08c150db1a93245d3eed148`: **22/22 test files PASS, 98/98 tests PASS, production Vite build PASS, 1,613 modules transformed**. Output was CSS 167.39 kB / 35.69 kB gzip and JS 304.14 kB / 93.34 kB gzip.

## Independent Workstream-14 visual review

The assigned partition is now fully dispositioned: **48 reviewed / 4 ACCEPT / 44 REWORK / 0 BLOCKED**.

### First accepted replacement hashes

Actual staged pixels materially corrected the prior flat-vector defects for:

- `lighting-1` → `/assets/catalog/lighting-1-v2.jpg` → `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` — **ACCEPT**
- `lighting-2` → `/assets/catalog/lighting-2-v2.jpg` → `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3` — **ACCEPT**
- `lighting-3` → `/assets/catalog/lighting-3-v2.jpg` → `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` — **ACCEPT**
- `lighting-4` → `/assets/catalog/lighting-4-v2.jpg` → `7975e490a9fb97574f03081acf9fc871c22224f3` — **ACCEPT**

They now show dimensional construction, believable material/emissive response, grounded/cast lighting and clear card/detail readability. Workstream 08 may integrate these exact hashes after its metadata/file/content checks; no second universal visual approval is required.

### Remaining Workstream-14 rework

- Lighting 5–12 current canonical hashes: **8 REWORK**. Lighting 5–8 have producer-generated remote replacements but those bytes still need repository staging; 9–12 still need replacement production.
- Wall 1–12: **12 REWORK** — readable identities but insufficient physical mounting/frame/glass/metal/fabric/neon depth.
- Rugs 1–12: **12 REWORK** — current art reads as upright/floating badges instead of floor textiles with pile/weave/edge/contact perspective.
- Decor 1–12: **12 REWORK** — readable/distinct objects but shallow icon-like construction/material response and weak high-tier progression.

All 48 Workstream-14 current/replacement hashes are exact-content unique. Manual rendered review found no item-identity near-duplicate collision; repeated flat templates/backgrounds remain quality defects rather than duplicate content.

## Overall review accounting

The four disjoint reviewer partitions currently contain evidence for **155 / 192 unique item IDs** at at least one exact hash: reviewer 01 = 36, reviewer 02 = 35, reviewer 05 = 36, reviewer 14 = 48. This is review coverage, not final acceptance coverage; many reviewed legacy hashes are superseded or awaiting replacements.

The catalog has only **4 qualified accepted replacement hashes known to this release gate** at this point. Legacy `final-portable` labels do not count as screenshot-quality acceptance.

## Canonical and release gates

Canonical manifest is still v12: target 192, legacy `final-portable` count 99, 23 interim-not-verified, 122 manifest/runtime mappings and zero duplicate manifest paths. Automated CI still confirms exactly 192 stable Store IDs and exact metadata/path integrity for wired entries.

Gate status:

- 192 stable catalog IDs: **PASS**
- current wired metadata/path integrity: **PASS — automated**
- Workstream-14 partition fully reviewed: **PASS**
- all 192 current final hashes independently accepted: **FAIL**
- all 192 accepted hashes canonically wired: **FAIL**
- complete final-set exact-content duplicate scan: **NOT TESTED — final set incomplete**
- complete final-set rendered near-duplicate review: **NOT TESTED — final set incomplete**
- post-integration desktop/phone Store art verification: **NOT TESTED — first accepted batch not yet integrated**
- catalog-induced P0 learning defect: **PASS — automated, none found**
- automated purchase/Quest reload/replay safety: **PASS**
- synthetic real-browser persistence timing/concurrency/recovery: **NOT TESTED — release blocker**
- physical-device performance: **NOT TESTED**
- screen-reader smoke: **NOT TESTED**
- pixel-identical reference parity: **BLOCKED — original user reference image pixels are not repository-accessible**

Store/Quest geometry remains deferred to `GAME_FINISHING` and is not a catalog-completion prerequisite. Home's latest measured structural geometry remains PASS unless new evidence shows a regression.

## Exact next owners

1. **08:** integrate Lighting 1–4 v2 exact accepted hashes immediately after metadata/file/content checks, then run affected catalog tests/build and canonical Store smoke.
2. **04:** preserve accepted Lighting 1–4; stage the already-generated Lighting 5–8 bytes and continue Lighting 9–12 replacement production.
3. **05 / 07 / 09:** submit versioned Wall / Rug / Decor replacements from the exact review defects above.
4. **01 / 05:** consume the staged-art artifact for their Tops/Auras/Desks replacements and make their own exact-hash decisions; Workstream 14 does not decide those families.
5. **14:** keep the same staged-art fixture current and independently review new Lighting/Wall/Rugs/Decor replacement hashes as soon as they arrive.
6. **13:** close the isolated real-browser persistence/re-entry/concurrency gate using synthetic state only.
7. **15:** keep phase `CATALOG_SPRINT` until all 192 current hashes pass the catalog gate.

**READY FOR SINGLE REPLIT INTEGRATION: NO.**
