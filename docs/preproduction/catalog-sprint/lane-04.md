# Catalog Sprint Lane 04 — Lighting / Shoes Repair

STATUS: **ALL ASSIGNED LIGHTING 1–12 AND SHOES 1–6 HAVE REPOSITORY-STORED CURRENT CANDIDATES; REVIEW FEEDBACK NOW GATES FURTHER PRODUCTION**

Repository: `P00NSMASHER/StarBlox`  
Branch: `screenshot-match-preproduction`  
Phase: `CATALOG_SPRINT`  
Lighting reviewer: Workstream 14  
Shoes reviewer: Workstream 02  
Canonical manifest/runtime: Workstream 08 only  
Replit/Floot/main/player data: untouched

## Lighting

`lighting-1..4` are independently **ACCEPTED** by reviewer 14 and are already the canonical paths in manifest v15. Their exact accepted blobs remain:

| ID | Canonical path | Git blob |
|---|---|---|
| lighting-1 | `public/assets/catalog/lighting-1-v2.jpg` | `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` |
| lighting-2 | `public/assets/catalog/lighting-2-v2.jpg` | `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3` |
| lighting-3 | `public/assets/catalog/lighting-3-v2.jpg` | `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` |
| lighting-4 | `public/assets/catalog/lighting-4-v2.jpg` | `7975e490a9fb97574f03081acf9fc871c22224f3` |

`lighting-5..12` are now fully staged as exact recovered Firefly renditions; the old raw-byte staging blocker is closed. All candidates are 600×600 JPEGs with their 1024×1024 originals preserved under `docs/preproduction/catalog-sprint/recovered-originals/`.

| ID | Candidate path | Git blob | Bytes | State |
|---|---|---|---:|---|
| lighting-5 | `public/assets/catalog/lighting-5-w04-recovered-v2.jpg` | `a9e03e73c7080fdc2effd884bb0965999954d90c` | 70,274 | READY_FOR_REVIEW_14; isolated card/detail render PASS |
| lighting-6 | `public/assets/catalog/lighting-6-w04-recovered-v2.jpg` | `d8d8fca7cda78451860377bfdfd257b4a450aa9c` | 40,517 | READY_FOR_REVIEW_14; isolated card/detail render PASS |
| lighting-7 | `public/assets/catalog/lighting-7-w04-recovered-v2.jpg` | `7ce162a18ab641df7ab73f380557aad5aa64b24d` | 54,969 | READY_FOR_REVIEW_14; isolated card/detail render PASS |
| lighting-8 | `public/assets/catalog/lighting-8-w04-recovered-v2.jpg` | `9073a049ec9116cf3e4408adf068be48f1ad00f1` | 59,051 | READY_FOR_REVIEW_14; isolated card/detail render PASS |
| lighting-9 | `public/assets/catalog/lighting-9-w04-recovered-v2.jpg` | `d9a0e461a1a8ace589cf6be1ec93e61972ba7faf` | 54,235 | READY_FOR_REVIEW_FIXTURE_14 |
| lighting-10 | `public/assets/catalog/lighting-10-w04-recovered-v2.jpg` | `e4ca304730d4c330711534c2c7c52da218c9acfa` | 59,730 | READY_FOR_REVIEW_FIXTURE_14 |
| lighting-11 | `public/assets/catalog/lighting-11-w04-recovered-v2.jpg` | `995b6ae729b3daa9e1199dd032b24e128db0b61b` | 44,462 | READY_FOR_REVIEW_FIXTURE_14 |
| lighting-12 | `public/assets/catalog/lighting-12-w04-recovered-v2.jpg` | `ddb71949f485348a45e00c5105eb336ad55a010a` | 86,386 | READY_FOR_REVIEW_FIXTURE_14 |

Lighting 5–8 exact card/detail evidence is from isolated render run `35665938359`. Lighting 9–12 exact byte recovery/readback succeeded in run `35666422739`; metadata/decode/readback passed 4/4. Legacy `lighting-5..12.svg` REWORK decisions do not transfer to these new hashes.

## Shoes 1–6

The previously generated Shoes 1–4 Firefly replacements have now also crossed the byte boundary and are repository-staged. Their exact candidate and original bytes passed metadata/decode/readback checks in run `35666743775`.

A new bounded two-item repair batch completed Shoes 5–6. Boots / Candy Core and Runners / Adventure Club were generated as dimensional three-quarter pairs, visually inspected by the producer, then their exact Firefly renditions and 1024×1024 originals were stored/read back successfully in run `35666988858`. This is producer evidence only; reviewer 02 owns acceptance.

| ID | Candidate path | Git blob | Bytes | State |
|---|---|---|---:|---|
| shoes-1 | `public/assets/catalog/shoes-1-w04-recovered-v2.jpg` | `1a0351a733c7639ecdf4d90d41e4e5159bd7e8ad` | 76,160 | READY_FOR_REVIEW_02 |
| shoes-2 | `public/assets/catalog/shoes-2-w04-recovered-v2.jpg` | `4377e9c6b996a154db67feae1adb924715364f54` | 57,235 | READY_FOR_REVIEW_02 |
| shoes-3 | `public/assets/catalog/shoes-3-w04-recovered-v2.jpg` | `995c65c304af6acc85fad2a98cfe07029b486472` | 60,955 | READY_FOR_REVIEW_02 |
| shoes-4 | `public/assets/catalog/shoes-4-w04-recovered-v2.jpg` | `121bd48007f74a2df4c760fa4650e7075138cffb` | 48,963 | READY_FOR_REVIEW_02 |
| shoes-5 | `public/assets/catalog/shoes-5-w04-v2.jpg` | `eaac23dcecf94ac3875adb61017f2436cf4d1d0c` | 53,844 | READY_FOR_REVIEW_02 |
| shoes-6 | `public/assets/catalog/shoes-6-w04-v2.jpg` | `2622d23d9a24e689c669292671c531a91b355221` | 59,428 | READY_FOR_REVIEW_02 |

All six keep their exact Store IDs, names, tiers, themes, prices and unlock requirements. No canonical shoe mapping changed in Lane 04.

## Current handoff

**14:** Decide Lighting 5–8 first from the already-qualified isolated card/detail evidence. Then render/review the exact Lighting 9–12 hashes above. Do not inherit legacy decisions.

**02:** Render and independently judge Shoes 1–6 from the exact current hashes above. Do not inherit the legacy Shoes REWORK decisions.

**08:** Lighting 1–4 are already canonical in manifest v15. Integrate only newly qualified exact-hash ACCEPTs from reviewers 14/02 after normal metadata/file/content checks.

**15:** The Lane-04 byte-transfer blocker is cleared. Every assigned Lighting 1–12 and Shoes 1–6 ID now has a repository-stored current candidate. No new family or Store redesign should be taken while catalog sprint remains active.

**04 next pass:** consume fresh reviewer decisions first. Preserve ACCEPTs. Repair only exact REWORK items in a 2–6 item micro-batch. If all current hashes pass and no Lane-04 repair remains, request reassignment from Workstream 15 rather than taking another lane or resuming Store work early.

No Replit/Floot action, `main` merge, deployment, canonical-manifest/runtime write by Lane 04, Store-code edit, player-data change, price change or unlock change occurred.
