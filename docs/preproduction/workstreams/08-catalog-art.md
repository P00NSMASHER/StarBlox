## V2 canonical increment — Deterministic Decor11 + Wall9 qualified exact-hash ACCEPTs

Prepared from `ecd69a80e4f4793981a1851ec954c65f2b94d075` using exact hash-bound reviewer 14 ACCEPT evidence. 2 items passed repository-byte, Store metadata, decode/safety, reviewer-independence and canonical uniqueness checks. Full tests/build/Store-mobile smoke are required before publication.

Exact IDs: `decor-11`, `wall-9`.

## V2 canonical increment — Deterministic Desk10 + Desk11 qualified exact-hash ACCEPTs

Prepared from `660b50d450bc1c3061f5aa6f2df821fa21970982` using exact hash-bound reviewer 05 ACCEPT evidence. 2 items passed repository-byte, Store metadata, decode/safety, reviewer-independence and canonical uniqueness checks. Full tests/build/Store-mobile smoke are required before publication.

Exact IDs: `desks-10`, `desks-11`.

# Workstream 08 — Catalog Integration

STATUS: **INTEGRATED_ACCEPTED_INCREMENT_TESTS_PASS_STORE_SMOKE_PENDING**

Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data remain untouched.

## This integration

Integrated 8 newly qualified exact-hash replacements: `lighting-5`, `lighting-6`, `lighting-7`, `lighting-8`, `lighting-9`, `lighting-10`, `lighting-11`, `lighting-12`. Exact repository bytes/hashes, current Store metadata, supported decode, canonical path/content uniqueness and reviewer independence were all validated before wiring.

Canonical manifest is now v31: **163 final-portable / 7 interim / 29 non-final**, with 170 canonical entries and 170 runtime mappings. Legacy labels remain distinct from the strict accepted-current-hash count.

Strict current replacement state: **36 accepted / 8 canonical-wired / 0 release-cleared**.

## Validation

- metadata: PASS_8_OF_8_AGAINST_CURRENT_GAME_MODEL
- exact stored bytes: PASS_8_OF_8_EXACT_GIT_BLOB_SHA
- safe decode/render evidence: PASS_8_OF_8_SUPPORTED_FORMAT_PLUS_INDEPENDENT_RENDER_EVIDENCE
- canonical uniqueness: PASS_170_UNIQUE_PATHS_AND_CONTENT_HASHES
- npm tests: PASS_FULL_NPM_TEST_WORKFLOW
- production build: PASS_VITE_PRODUCTION_BUILD_WORKFLOW
- Store/mobile smoke: PENDING_AUTOMATIC_CATALOG_MOBILE_QA_ON_CANONICAL_COMMIT

Next: consume every fresh exact-hash ACCEPT immediately; never wire REWORK or producer-only claims.
