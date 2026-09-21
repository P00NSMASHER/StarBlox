# Workstream 08 — Catalog Art / Canonical Integration

STATUS: **FIRST V2 ACCEPTED BATCH INTEGRATED; FINAL CATALOG NOT READY**

Workstream 08 is the sole canonical writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js` during `CATALOG_SPRINT`.

## Current canonical candidate

- target IDs: **192**
- manifest version: **13**
- canonical manifest/runtime mappings: **122**
- `final-portable`: **103**
- `interim-not-verified`: **19**
- non-final relative to accepted/final-portable count: **89**
- duplicate canonical asset paths: **0**
- V2 exact-hash independently accepted and wired this batch: **4**
- catalog release-cleared IDs: **0** until post-integration tests/Store checks and final catalog gate

Integrated exact IDs:
- `companions-3` — Berry Bunny — `/assets/catalog-candidates/chat-20260921-intake01/companions-3-detail.webp`
- `companions-4` — Sunny Bird — `/assets/catalog-candidates/chat-20260921-intake01/companions-4-detail.webp`
- `companions-10` — Pixel Bot — `/assets/catalog-candidates/chat-20260921-intake01/companions-10-detail.webp`
- `companions-11` — Dream Dragon — `/assets/catalog-candidates/chat-20260921-intake01/companions-11-detail.webp`

Reviewer 05 is independent from producer 06 and accepted the exact current hashes using actual staged-art pixels. The four accepted WebPs are distinct stored blobs, 768×768, and match the exact Store ID/name/tier/theme metadata. Old companion SVG versions remain in repository history for rollback.

## Validation

Pre-commit checks pass for exact metadata, stored-byte/blob continuity, distinct accepted hashes, safe WebP evidence, reviewer independence, and canonical path uniqueness. No prices, unlocks, ownership, learning or player-state code is changed.

Post-commit affected catalog tests, production build and Store smoke are required before this batch can be described as release-cleared. Do not infer those results from the old runtime proof.

## Remaining work

The other Aura/companion interim entries stay interim until exact-hash acceptance. Legacy `final-portable` labels remain separate from V2 screenshot-quality acceptance; reviewed legacy families continue to produce REWORK findings. Consume every new qualified ACCEPT immediately, preserve rejected/prior versions, and keep generated/staged/accepted/wired/release-cleared counts distinct.

Replit/Floot/main remain frozen. Only Workstream 15 may change phase.
