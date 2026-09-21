# Workstream 08 — Catalog Integration

STATUS: **INTEGRATED_ACCEPTED_INCREMENT_TESTS_PASS_STORE_SMOKE_PENDING**

Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data remain untouched.

## This integration

Integrated 3 newly qualified exact-hash replacements: `auras-6`, `auras-7`, `auras-8`. Exact repository bytes/hashes, current Store metadata, supported decode, canonical path/content uniqueness and reviewer independence were all validated before wiring.

Canonical manifest is now v15: **110 final-portable / 16 interim / 82 non-final**, with 126 canonical entries and 126 runtime mappings. Legacy labels remain distinct from the strict accepted-current-hash count.

Strict current replacement state: **17 accepted / 17 canonical-wired / 0 release-cleared**.

## Validation

- metadata: PASS_3_OF_3_AGAINST_CURRENT_GAME_MODEL
- exact stored bytes: PASS_3_OF_3_EXACT_GIT_BLOB_SHA
- safe decode/render evidence: PASS_3_OF_3_SUPPORTED_FORMAT_PLUS_INDEPENDENT_RENDER_EVIDENCE
- canonical uniqueness: PASS_126_UNIQUE_PATHS_AND_CONTENT_HASHES
- npm tests: PASS_FULL_NPM_TEST_WORKFLOW
- production build: PASS_VITE_PRODUCTION_BUILD_WORKFLOW
- Store/mobile smoke: PENDING_AUTOMATIC_CATALOG_MOBILE_QA_ON_CANONICAL_COMMIT

Next: consume every fresh exact-hash ACCEPT immediately; never wire REWORK or producer-only claims.
