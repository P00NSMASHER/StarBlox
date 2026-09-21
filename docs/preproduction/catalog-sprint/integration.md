# Catalog Sprint — Workstream 08 Integration

STATUS: **NO ACCEPTED HASH YET / 71 INDEPENDENT REWORKS / 6 STORED REPLACEMENTS AWAIT REVIEW / 10 FIREFLY BLOBS PRESERVED**

Branch: `screenshot-match-preproduction` only  
Input head audited before this Workstream-08 evidence refresh: `a2770557f4e6dbb019ba76112ec1363a1857d2b4`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Canonical decision

Workstream 08 remains the only catalog manifest/runtime writer. I did **not** change `catalog-art-manifest.json` or `src/catalogArtRuntime.js` because there is still **no qualified independent ACCEPT for any current or replacement asset hash**.

Canonical state therefore remains unchanged:

- actual Store IDs: **192**
- manifest version: **12**
- legacy `final-portable`: **99**
- `interim-not-verified`: **23**
- non-final relative to the legacy label: **93**
- manifest entries: **122**
- runtime mappings: **122**
- duplicate manifest paths recorded: **0**
- V2 exact-hash ACCEPTs: **0**
- canonical promotions this pass: **0**

Stable canonical hashes are still:

- manifest Git blob: `862894db70500087409396dc5a72d032cf00a693`
- runtime Git blob: `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`
- game model Git blob: `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`

## Independent review coverage materially advanced

All four V2 review shards now exist. Current/legacy exact-hash review coverage is **71 / 192**, with **0 ACCEPT / 71 REWORK / 0 BLOCKED**:

- Tops: 12 REWORK — reviewer 01
- Seating 2–12: 11 REWORK — reviewer 02
- legacy Auras: 12 REWORK — reviewer 05
- Companions 1–12: 12 REWORK — reviewer 05
- Beds 1–12: 12 REWORK — reviewer 05
- Lighting 1–12: 12 REWORK — reviewer 14

The common release defect is now well evidenced: existing artwork is generally recognizable and readable but materially too flat/vector-like for the premium dimensional Store target. Legacy `final-portable` remains a compatibility label, not visual acceptance.

## Replacement versions now stored on the branch

Six replacement candidates have actual repository paths and exact Git blob readback, but none has fresh independent acceptance yet:

| ID | Replacement path | Git blob |
|---|---|---|
| tops-7 | `/assets/catalog/tops-7-w09-v2.svg` | `fe5b33a5b8eb8de137abab7daf315ddfaaaaf408` |
| tops-8 | `/assets/catalog/tops-8-w09-v2.svg` | `81bbec69f1e164b9772e0f867409581526f5255a` |
| auras-1 | `/assets/catalog/auras-1-v2.svg` | `48639f1262052350660127bbc5d3d25de34d61e3` |
| auras-2 | `/assets/catalog/auras-2-v2.svg` | `c2be24c165f3e28995d5d2eb946dbdde983afe2a` |
| auras-3 | `/assets/catalog/auras-3-v2.svg` | `9b682148eb26898ec5f56ac11eac635e7c93c8fc` |
| auras-4 | `/assets/catalog/auras-4-v2.svg` | `3059eae7ab68c125f1af1696305fdf5689131455` |

I read back the replacement bytes and verified the recorded exact Git blobs. Their embedded item/theme labels and lane metadata align with the current Store identities. They remain **READY_FOR_REVIEW**, not canonical final art. Reviewer 01 owns the two Tops replacements; reviewer 05 owns the four Aura replacements.

## Binary transfer path improved again

The binary-import capability has progressed from a synthetic probe to real generated-image byte preservation.

A supported path now exists from Adobe-generated rendition bytes to immutable Git blob objects. Ten improved Firefly replacements have been preserved as Git objects:

- Lighting 1–4: `9d8aa142...`, `8c10fe68...`, `fc21ddf5...`, `7975e490...`
- Tops 1–6: `5fd95449...`, `42845078...`, `b4a83458...`, `26d03c5b...`, `78c5c892...`, `44d88aa8...`

These are **not branch-staged assets yet**. Git object existence alone does not make an item reviewable or integratable. The owning lanes must attach those exact blobs to versioned repository paths with a normal latest-head, non-force commit and verify path/blob readback:

- Workstream 04 attaches Lighting 1–4.
- Workstream 07 attaches Tops 1–6.

No regeneration is needed for those ten images.

## Other prepared inventory

- Assigned repository-staged candidate IDs remain **82**.
- Desk lane: `desks-2..4` are generated locally but **0 are repository-staged**; `desks-5..12` still need candidates.
- Rich companion intake: **10 item IDs / 30 stored binary files**. Four (`companions-3`, `-4`, `-10`, `-11`) were queued for richer-candidate review; the legacy companion versions have now all been independently marked REWORK.
- Six stored replacement versions are awaiting fresh independent review.
- 121 catalog IDs still lack a qualified current-hash visual disposition.

## Validation performed this pass

- **PASS** — phase is `CATALOG_SPRINT`; Workstream 08 remains canonical writer.
- **PASS** — actual Store model remains 192 IDs on the unchanged game-model hash.
- **PASS** — canonical manifest/runtime hashes remain unchanged and recorded duplicate paths remain zero.
- **PASS** — all four V2 review shards are present and reconciled to **71 REWORK / 0 ACCEPT**.
- **PASS** — six branch-stored replacement versions have exact repository-path/Git-blob readback and distinct hashes.
- **PASS** — real Adobe-generated bytes have a proven transfer route into immutable Git blob objects.
- **PENDING** — owners 04/07 must attach the ten preserved Firefly blobs to branch paths before review.
- **FAIL / incomplete** — desks remain 0 repository-staged.
- **NOT RUN** — post-integration catalog tests/build/Store checks because no canonical mapping changed.
- **FAIL** — catalog release gate remains open; release QA records incomplete 192-art acceptance and the persistence track still has live-browser/re-entry work.

## Exact next dependencies

1. **01:** render and judge `tops-7-w09-v2` and `tops-8-w09-v2` now. After Workstream 07 attaches Tops 1–6 Firefly blobs, judge those exact hashes too.
2. **05:** render and judge `auras-1-v2` through `auras-4-v2` now; continue desks and richer companion replacements as they become staged.
3. **04 / 07:** attach the already-preserved Firefly Git blobs to versioned assigned paths and verify readback. Do not regenerate.
4. **03:** stage the existing desks-2..4 bytes from its producer run using the proven binary path, then continue desks-5..12.
5. **14:** continue actual-pixel wall/rug/decor review and refresh release QA at material milestones.
6. **08:** integrate the first qualified exact-hash ACCEPT immediately; only then change manifest/runtime and run the affected catalog regression/build/Store checks for that coherent batch.

Detailed machine-readable evidence is in `docs/preproduction/catalog-sprint/integration.json`. Workstream 15 alone may switch phase after the full catalog gate passes.
