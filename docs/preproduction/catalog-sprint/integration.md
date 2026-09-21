# Workstream 08 — Catalog Integration

STATUS: **INTEGRATED_ACCEPTED_TOPS_LIGHTING_BATCH_TESTS_PASS_STORE_SMOKE_PENDING**

Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data remain untouched.

## This integration

Integrated 10 newly qualified exact-hash replacements: `tops-1`, `tops-2`, `tops-3`, `tops-4`, `tops-5`, `tops-6`, `lighting-1`, `lighting-2`, `lighting-3`, `lighting-4`. Each exact repository blob was read from the checkout, Git-blob SHA verified, JPEG structure/dimensions verified, metadata matched against the current 192-item game model, reviewer independence checked, and no duplicate canonical path/content was introduced.

Canonical manifest is now v14: **107 final-portable / 19 interim / 85 non-final**, with 126 canonical entries and 126 runtime mappings. Legacy labels remain distinct from the stricter exact-hash accepted count.

Current independently accepted replacement hashes: **17**. Canonically wired accepted replacement hashes: **14**. Release-cleared IDs remain **0** until the 192-item catalog gate passes.

## Validation

- metadata / stable IDs / prices / unlocks: PASS_10_OF_10_AGAINST_CURRENT_GAME_MODEL
- exact stored blob readback: PASS_10_OF_10_EXACT_GIT_BLOB_SHA
- safe JPEG structure + prior independent rendered decode: PASS_10_OF_10_JPEG_STRUCTURE_DIMENSIONS_PLUS_INDEPENDENT_RENDER_EVIDENCE
- unique canonical paths/content: PASS_126_UNIQUE_PATHS_AND_CONTENT_HASHES
- npm tests: PASS_FULL_NPM_TEST_WORKFLOW
- production build: PASS_VITE_PRODUCTION_BUILD_WORKFLOW
- Store/mobile smoke: PENDING_AUTOMATIC_CATALOG_MOBILE_QA_ON_CANONICAL_COMMIT

Next: consume the next fresh exact-hash ACCEPT immediately; do not rewire REWORK or merely generated assets.
