## V2 canonical increment — Tops 7-10 + Bottoms 1-4 + Headwear 1-4 exact-hash ACCEPTs

Prepared from `bda51b8b17c088d4bdc4a5d37ecded732205cb1f` using exact hash-bound reviewer 01 ACCEPT evidence. 12 items passed repository-byte, Store metadata, decode/safety, reviewer-independence and canonical uniqueness checks. Full tests/build/Store-mobile smoke are required before publication.

Exact IDs: `tops-7`, `tops-8`, `tops-9`, `tops-10`, `bottoms-1`, `bottoms-2`, `bottoms-3`, `bottoms-4`, `headwear-1`, `headwear-2`, `headwear-3`, `headwear-4`.

## V2 canonical increment — Rugs 1-8 + Decor 1-2 exact-hash ACCEPTs

Prepared from `328ea99adbd69a38096698629be66204f0b19bdc` using exact hash-bound reviewer 14 ACCEPT evidence. 10 items passed repository-byte, Store metadata, decode/safety, reviewer-independence and canonical uniqueness checks. Full tests/build/Store-mobile smoke are required before publication.

Exact IDs: `rugs-1`, `rugs-2`, `rugs-3`, `rugs-4`, `rugs-5`, `rugs-6`, `rugs-7`, `rugs-8`, `decor-1`, `decor-2`.

# Workstream 08 — Catalog Integration

STATUS: **INTEGRATED_ACCEPTED_INCREMENT_TESTS_PASS_STORE_SMOKE_PENDING**

Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data remain untouched.

## This integration

Integrated 8 newly qualified exact-hash replacements: `lighting-5`, `lighting-6`, `lighting-7`, `lighting-8`, `lighting-9`, `lighting-10`, `lighting-11`, `lighting-12`. Exact repository bytes/hashes, current Store metadata, supported decode, canonical path/content uniqueness and reviewer independence were all validated before wiring.

Canonical manifest is now v17: **122 final-portable / 16 interim / 70 non-final**, with 138 canonical entries and 138 runtime mappings. Legacy labels remain distinct from the strict accepted-current-hash count.

Strict current replacement state: **35 accepted / 35 canonical-wired / 0 release-cleared**.

## Validation

- metadata: PASS_8_OF_8_AGAINST_CURRENT_GAME_MODEL
- exact stored bytes: PASS_8_OF_8_EXACT_GIT_BLOB_SHA
- safe decode/render evidence: PASS_8_OF_8_SUPPORTED_FORMAT_PLUS_INDEPENDENT_RENDER_EVIDENCE
- canonical uniqueness: PASS_138_UNIQUE_PATHS_AND_CONTENT_HASHES
- npm tests: PASS_FULL_NPM_TEST_WORKFLOW
- production build: PASS_VITE_PRODUCTION_BUILD_WORKFLOW
- Store/mobile smoke: PENDING_AUTOMATIC_CATALOG_MOBILE_QA_ON_CANONICAL_COMMIT

Next: consume every fresh exact-hash ACCEPT immediately; never wire REWORK or producer-only claims.
