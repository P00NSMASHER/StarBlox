# Workstream 14 — Visual Release QA

STATUS: **CATALOG_SPRINT / 180 OF 192 IDS REVIEWED / 14 EXACT REPLACEMENT ACCEPTS / DESK BYTES FAIL VISUAL QA / CURRENT CI FAILS ONE CANONICAL METADATA CHECK / CATALOG GATE FAIL**

Branch: `screenshot-match-preproduction` only  
Delivery policy: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
Main: **not merged or modified**  
Real player data: **not used**

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

Material progress occurred: independent review coverage is now 180/192 unique IDs, 14 exact replacement hashes have qualified ACCEPT decisions across the reviewer shards, four accepted Companions are already integrated in canonical manifest v13, the real-browser persistence/economy blocker is closed, and the original Home/Store/Quest reference pixels are now preserved in the repository. The release is still blocked by incomplete catalog replacement/acceptance, a genuine `beds-1` canonical metadata mismatch, unusable Desk replacement bytes, incomplete final duplicate/near-duplicate/Store verification, and later physical accessibility/performance/reference-comparison gates.

Store/Quest geometry remains `GAME_FINISHING` work and does not block the catalog phase. Home remains structurally PASS unless new evidence demonstrates regression.

## Shared staged-art fixture — hardened evidence gate

The existing `.github/workflows/catalog-staged-art-qa.yml` remains the single staged-art framework. No duplicate orchestration path was added. The renderer supports versioned SVG/PNG/JPG/JPEG/WEBP, binds every card/detail screenshot to computed Git blob identity, and uploads one compact artifact.

This pass hardened the renderer against two false-positive classes:

1. a file with the expected extension but invalid image signature;
2. a technically decodable image whose pixels are effectively fully transparent/blank.

The latest diagnostic evidence is workflow run `35663502757` on `60e0f9a5cddfaf4925aae4800dd96816690a98ae`, artifact `10668875135`, digest `sha256:a17eaf3d70986b473fa017cbdef1119ba2f86dbc9d15b6969262cec30ab81f54`.

The fixture correctly rejects current Desk replacement evidence:

- `desks-2-v1.webp`, `desks-3-v1.webp`, `desks-4-v1.webp`: invalid WebP signatures;
- `desks-2-w03-v1.webp`, `desks-3-w03-v1.webp`, `desks-4-w03-v1.webp`: decode as 512×512 WebP but render with `opaqueFraction = 0`, so actual detail captures contain no visible Desk.

This is a producer-byte defect, not a reason to weaken the renderer. Reviewer 05 must not classify these Desk files as visually accepted or visually reviewed. Workstream 03 must restage genuinely visible replacements.

Cross-partition rendering remains evidence-only. Workstream 14 does not disposition Tops/Auras/Desks/Companions.

## Workstream-14 independent review

Assigned partition: Lighting / Wall / Rugs / Decor = **48 IDs**.

Current exact-hash disposition remains **48 reviewed / 4 ACCEPT / 44 REWORK / 0 BLOCKED**.

Accepted Lighting replacements:

| ID | Exact Git blob | Decision |
|---|---|---|
| lighting-1 | `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` | **ACCEPT** |
| lighting-2 | `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3` | **ACCEPT** |
| lighting-3 | `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` | **ACCEPT** |
| lighting-4 | `7975e490a9fb97574f03081acf9fc871c22224f3` | **ACCEPT** |

They meet the current premium dimensional item-art threshold at card/detail scale. Lighting 5–12, Wall 1–12, Rugs 1–12 and Decor 1–12 remain REWORK at their reviewed hashes. All 48 reviewer-14 reviewed hashes are exact-content unique; manual pixel review found no identity-level near-duplicate collision, while repeated flat/vector template treatment remains a quality defect.

Machine-readable decisions remain in `docs/preproduction/catalog-sprint/reviews/14.json`.

## Cross-partition independent review accounting

Unique ID coverage is now **180 / 192**:

- Workstream 01: **48 / 48** Tops, Bottoms, Headwear, Facegear;
- Workstream 02: **48 / 48** Shoes, Backgear, Handgear, Seating;
- Workstream 05: **36 / 48** Auras, Companions, Beds; Desk remains unreviewed because current replacement bytes are unusable;
- Workstream 14: **48 / 48** Lighting, Wall, Rugs, Decor.

Qualified current replacement ACCEPTs known across shards: **14 exact hashes**:

- Tops 1–6 — reviewer 01;
- Companions 3, 4, 10, 11 — reviewer 05;
- Lighting 1–4 — reviewer 14.

Legacy/current REWORK decisions do not transfer to later replacement hashes. Current Auras 1–4 v2 remain REWORK. Tops 7–12 replacement attempts remain REWORK at their reviewed hashes. Desk is the only remaining 12-ID unique review-coverage gap.

## Canonical manifest and current CI

Canonical manifest is now **v13**, with `finalCount = 103`. Workstream 08 has promoted exact accepted Companions 3, 4, 10 and 11. This confirms incremental V2 integration is functioning.

Latest full CI attempt `35663779638`, job `106544831585`, on `a7003fb7715b1515b660a21670a2ec9c53f94511` is **FAIL**:

- **98 / 99 tests PASS**;
- the sole failure is the strict catalog metadata invariant: `beds-1` manifest theme is `Aqua Wave`, while `gameModel` says `Garden Glow`;
- current production build is **NOT TESTED** on that head because CI stops after the failed test.

The QA test itself was narrowly corrected earlier to V2 rules: supported repo-owned art may be SVG/PNG/JPG/WEBP, and a final Aura/Companion must have an independent ACCEPT for the exact current asset hash. Those checks pass. The `beds-1` metadata mismatch remains intentionally failing and must be corrected by Workstream 08 rather than hidden by a weaker assertion.

Until that metadata defect is repaired and CI/build rerun, the canonical release gate is FAIL even though earlier unchanged runtime/persistence build evidence remains reusable for unaffected code paths.

## Real-browser persistence / economy — PASS

Workstream 13 now reports **PASS_REAL_BROWSER_PERSISTENCE_ECONOMY_MATRIX** using synthetic-only Chromium on GitHub Actions. Evidence covers purchase/equip/room/reload, rapid and multi-tab exactly-once behavior, malformed import, IndexedDB recovery after localStorage loss, wrong/retry no-farming, assisted-vs-independent evidence, rapid correct exactly-once and final Quest completion committed before presentation transition and surviving immediate reload.

No real player data was used. Workstream 13 currently has **no release blocker**. Re-run its browser matrix only after relevant runtime changes or on the frozen final candidate.

## Original reference pixels — now available

The prior missing-reference blocker is resolved. Commit `9d64486f85e8779faaabb87214af0bdf2f998ece` preserves the original user-supplied Home, Store and Quest JPEGs and deterministic 1408×1056 lossless PNG derivatives under `docs/preproduction/reference-screenshots/`.

`original-reference-manifest.json` verifies all 3 original SHA-256 values, 1448×1086 source dimensions, 1408×1056 normalized comparison dimensions and no GPS metadata. These are the authoritative reference pixels; generated promotional collages remain invalid evidence.

The first honest compare workflow did **not** reach screenshot capture because the current application regression suite stopped first on the `beds-1` metadata mismatch. Therefore the reference gate is now:

- reference availability: **PASS**;
- pixel-identical game parity: **NOT TESTED**, not PASS and no longer blocked by missing reference files.

After Workstream 08 repairs the canonical metadata failure, the existing reference-capture path can perform actual Home/Store/Quest comparison against these preserved originals.

## Current release gate

| Gate | Status |
|---|---|
| 192 stable permanent Store IDs | **PASS** |
| Canonical manifest exact metadata | **FAIL — beds-1 theme mismatch** |
| Existing canonical asset paths unique/existing | **PASS on latest executed CI** |
| Workstream-14 partition fully dispositioned | **PASS** |
| Independent unique-ID review coverage | **180 / 192** |
| Desk usable rendered evidence | **FAIL — corrupt/fully transparent replacements** |
| Qualified exact replacement ACCEPTs | **14** |
| All 192 current final hashes independently accepted | **FAIL** |
| All 192 accepted current hashes canonically wired | **FAIL** |
| Complete final exact-content duplicate scan | **NOT TESTED — final accepted set incomplete** |
| Complete final rendered near-duplicate review | **NOT TESTED — final accepted set incomplete** |
| Final integrated desktop/phone Store art verification | **NOT TESTED** |
| Catalog-induced learning P0 | **PASS — none in latest executed tests** |
| Real-browser persistence/economy | **PASS** |
| Physical-device performance | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA | **NOT TESTED** |
| Original reference pixels | **PASS** |
| Actual reference pixel comparison | **NOT TESTED — current CI metadata failure stops capture** |

## Exact blockers / handoff

1. **08 — canonical metadata:** correct `beds-1` manifest theme from `Aqua Wave` to exact `gameModel` value `Garden Glow`, then rerun the catalog manifest invariant and production build. Do not weaken the QA assertion.
2. **03 — Desk production:** replace/restage Desks 2–4 with visible bytes. The old aliases are invalid WebP files and current `-w03-v1` files are fully transparent despite decoding. Continue remaining Desks after correcting the delivery path.
3. **05 — Desk review:** make no Desk visual decision until Workstream 14's shared fixture emits visible exact-hash card/detail pixels.
4. **08 — accepted integration:** preserve integrated Companions 3/4/10/11; integrate accepted Tops 1–6 and Lighting 1–4 once canonical metadata/build is clean and normal metadata/file/content checks pass.
5. **04 / 05 / 07 / 09 / 11 / 06 — art repairs:** continue current REWORK families in bounded versioned batches; every new hash needs fresh independent review.
6. **14 — release QA:** maintain the single fixture, disposition only Lighting/Wall/Rugs/Decor replacement hashes, and run complete final duplicate/near-duplicate, Store/mobile and reference comparison at coherent milestones.
7. **15 — phase owner:** remain in `CATALOG_SPRINT` until all 192 current hashes are stored, correct, unique, accepted, wired and Store-verified with no catalog-induced P0.

## Deferred GAME_FINISHING release work

After catalog PASS, remeasure before editing. Retained structural backlog remains Store **4** blockers and Quest **6** blockers; Home is currently structurally PASS. Final frozen-candidate QA still needs actual reference-pixel comparison, physical/mobile performance, keyboard/focus/contrast, screen-reader smoke, navigation, purchase/equip/place/Quest flows and final regression/build evidence.

**Replit/Floot untouched. `main` untouched. No deployment authorized.**
