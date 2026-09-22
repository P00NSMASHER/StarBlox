# Catalog Sprint Lane 04 — Lighting / Shoes Repair

STATUS: **ALL 18 ASSIGNED CURRENT HASHES INDEPENDENTLY ACCEPTED; SHOES 1–6 CANONICAL V16; LIGHTING 5–12 AWAIT WORKSTREAM 08 INTEGRATION**

Repository: `P00NSMASHER/StarBlox`  
Branch: `screenshot-match-preproduction`  
Phase: `CATALOG_SPRINT`  
Observed source head before this documentation sync: `384481ae03bfd12028f6405dd1160a6cf32c5bf6`  
Lighting review shard: `docs/preproduction/catalog-sprint/reviews/14.json` @ `4c0b5863be0d4b674a9a707e932a746b2811078b`  
Shoes review shard: `docs/preproduction/catalog-sprint/reviews/02.json` @ `ad4d8c9892a5e4c9c2a33553d5ab50f89b03b036`  
Canonical manifest/runtime: Workstream 08 only  
Replit/Floot/main/player data: untouched

## Lighting 1–12

Reviewer 14 has now independently accepted **all 12 current Lighting hashes**. No Lighting repair remains in Lane 04.

`lighting-1..4` remain the accepted canonical versions from manifest v15:

| ID | Canonical path | Git blob | State |
|---|---|---|---|
| lighting-1 | `public/assets/catalog/lighting-1-v2.jpg` | `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` | ACCEPTED_CANONICAL |
| lighting-2 | `public/assets/catalog/lighting-2-v2.jpg` | `8c10fe689d6e398e85b24eb1ca1323cee07ea3` | ACCEPTED_CANONICAL |
| lighting-3 | `public/assets/catalog/lighting-3-v2.jpg` | `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` | ACCEPTED_CANONICAL |
| lighting-4 | `public/assets/catalog/lighting-4-v2.jpg` | `7975e490a9fb97574f03081acf9fc871c22224f3` | ACCEPTED_CANONICAL |

`lighting-5..12` are repository-stored 600×600 JPEG derivatives with preserved 1024×1024 originals. Reviewer 14 accepted these exact hashes after rendered pixel inspection; they now await Workstream 08's canonical metadata/file/content checks and wiring.

| ID | Accepted candidate path | Git blob | Bytes | State |
|---|---|---|---:|---|
| lighting-5 | `public/assets/catalog/lighting-5-w04-recovered-v2.jpg` | `a9e03e73c7080fdc2effd884bb0965999954d90c` | 70,274 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-6 | `public/assets/catalog/lighting-6-w04-recovered-v2.jpg` | `d8d8fca7cda78451860377bfdfd257b4a450aa9c` | 40,517 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-7 | `public/assets/catalog/lighting-7-w04-recovered-v2.jpg` | `7ce162a18ab641df7ab73f380557aad5aa64b24d` | 54,969 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-8 | `public/assets/catalog/lighting-8-w04-recovered-v2.jpg` | `9073a049ec9116cf3e4408adf068be48f1ad00f1` | 59,051 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-9 | `public/assets/catalog/lighting-9-w04-recovered-v2.jpg` | `d9a0e461a1a8ace589cf6be1ec93e61972ba7faf` | 54,235 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-10 | `public/assets/catalog/lighting-10-w04-recovered-v2.jpg` | `e4ca304730d4c330711534c2c7c52da218c9acfa` | 59,730 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-11 | `public/assets/catalog/lighting-11-w04-recovered-v2.jpg` | `995b6ae729b3daa9e1199dd032b24e128db0b61b` | 44,462 | ACCEPTED_PENDING_08_INTEGRATION |
| lighting-12 | `public/assets/catalog/lighting-12-w04-recovered-v2.jpg` | `ddb71949f485348a45e00c5105eb336ad55a010a` | 86,386 | ACCEPTED_PENDING_08_INTEGRATION |

Lighting 5–8 retain isolated card/detail render evidence from run `35665938359`. Lighting 9–12 were rendered and independently reviewed from their exact current hashes in run `35669695516`, artifact `10670588502`. Reviewer 14 records `ACCEPT_12_OF_12` for the current Lighting family. No image bytes were regenerated or changed in this pass.

## Shoes 1–6

Reviewer 02 independently accepted all six current Shoes hashes, and Workstream 08 subsequently wired them canonically in manifest v16 at canonical commit `56245a88f5b680fae2c2d53fdf9c803dd6c809a2`.

| ID | Canonical path | Git blob | Bytes | State |
|---|---|---|---:|---|
| shoes-1 | `public/assets/catalog/shoes-1-w04-recovered-v2.jpg` | `1a0351a733c7639ecdf4d90d41e4e5159bd7e8ad` | 76,160 | ACCEPTED_CANONICAL_V16 |
| shoes-2 | `public/assets/catalog/shoes-2-w04-recovered-v2.jpg` | `4377e9c6b996a154db67feae1adb924715364f54` | 57,235 | ACCEPTED_CANONICAL_V16 |
| shoes-3 | `public/assets/catalog/shoes-3-w04-recovered-v2.jpg` | `995c65c304af6acc85fad2a98cfe07029b486472` | 60,955 | ACCEPTED_CANONICAL_V16 |
| shoes-4 | `public/assets/catalog/shoes-4-w04-recovered-v2.jpg` | `121bd48007f74a2df4c760fa4650e7075138cffb` | 48,963 | ACCEPTED_CANONICAL_V16 |
| shoes-5 | `public/assets/catalog/shoes-5-w04-v2.jpg` | `eaac23dcecf94ac3875adb61017f2436cf4d1d0c` | 53,844 | ACCEPTED_CANONICAL_V16 |
| shoes-6 | `public/assets/catalog/shoes-6-w04-v2.jpg` | `2622d23d9a24e689c669292671c531a91b355221` | 59,428 | ACCEPTED_CANONICAL_V16 |

All six preserve their existing Store IDs, names, tiers, themes, prices and unlock requirements. Their 600×600 repository derivatives and 1024×1024 preserved originals remain unchanged.

## Current handoff

**08:** Consume `lighting-5..12` from reviewer 14's exact-hash ACCEPT decisions after the normal canonical metadata/file/content checks. Preserve `lighting-1..4` and `shoes-1..6` accepted mappings.

**15:** Lane 04 has no producer repair left: all 18 assigned catalog assets are repository-stored and independently accepted. Shoes 1–6 are canonical v16; Lighting 1–4 are canonical v15; Lighting 5–12 are accepted and pending 08 integration at this snapshot. Assign a specific non-conflicting visual task if additional producer capacity is useful. Otherwise keep 04 parked until the overall catalog gate passes, then return it to Store visual finishing.

**04 next pass:** Do not regenerate any of these accepted hashes. Act only on a future exact-hash REWORK or an explicit reassignment from Workstream 15. Do not resume Store screen changes while phase remains `CATALOG_SPRINT`.

The overall catalog gate is still **FAIL** because the project does not yet have all 192 current final hashes independently accepted and canonically wired. Store visual finishing therefore remains correctly paused. No Replit/Floot action, `main` merge, deployment, Store-code edit, player-data change, price change or unlock change occurred in this pass.
