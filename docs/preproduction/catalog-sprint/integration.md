# Catalog Sprint Integration — Workstream 08

**Status:** FIRST V2 ACCEPTED MICRO-BATCH INTEGRATED; POST-COMMIT CI/STORE CHECKS PENDING  
**Branch:** `screenshot-match-preproduction`  
**Audited parent:** `b88f688cc4575bef1e1ec676e4a510a6267a9ed5`

Workstream 08 found the first qualified V2 exact-hash ACCEPT queue and prepared a coherent canonical integration. Reviewer 05 is independent of producer 06 and accepted four 768×768 WebP companion replacements from real staged-art pixels. No producer self-review or legacy status label was used.

| ID | Name | Tier / Theme | Canonical path | Blob |
|---|---|---|---|---|
| companions-3 | Berry Bunny | 1 / Berry Blast | `/assets/catalog-candidates/chat-20260921-intake01/companions-3-detail.webp` | `adba95dc769e603337dc4ac38b9a513ce9914b10` |
| companions-4 | Sunny Bird | 2 / Garden Glow | `/assets/catalog-candidates/chat-20260921-intake01/companions-4-detail.webp` | `b382339e76ed9d4aeae72b1c8cccc904abf85b57` |
| companions-10 | Pixel Bot | 4 / Midnight Neon | `/assets/catalog-candidates/chat-20260921-intake01/companions-10-detail.webp` | `2b09d950b08083bb3a9ec5e2073ae23d88411cf4` |
| companions-11 | Dream Dragon | 4 / Candy Core | `/assets/catalog-candidates/chat-20260921-intake01/companions-11-detail.webp` | `465fe45abbe4d9b4355444cb3f75a49927b604e9` |

## Canonical accounting

Before: manifest v12, 99 `final-portable`, 23 interim, 93 non-final.  
Candidate after this batch: manifest v13, **103 `final-portable`**, **19 interim**, **89 non-final**. Manifest entries/runtime mappings remain 122; all canonical asset paths remain unique. Legacy/rejected versions remain preserved in repository history.

New manifest blob: `54fb26beca9b8da5f17472193831ee8248ffd3a4`  
New runtime blob: `b350940b703ea2934062e183c5529ad9f9b7f810`

## Evidence and checks

Reviewer 05 blob `cc78e6521dfeb300a9f751b486356a1755610e75` binds the four ACCEPT decisions to staged-art run `35654620624`, artifact `10663298893`, digest `sha256:f2c0d3d3aa251f5e1934017a7c61acf644e8876ab1e1a5b0c37e7f06ffb8e9db`. Exact ID/name/tier/theme, stored path/blob identity, 768×768 WebP decode evidence, reviewer independence, accepted-content uniqueness and reviewer near-duplicate checks pass for all four.

Post-integration catalog tests, production build and canonical Store smoke must run on the committed runtime head before this batch is release-cleared. Until those results exist they remain **PENDING**, not PASS.

## Next queue

Review coverage has expanded to roughly 156/192 unique IDs across the four disjoint reviewer partitions; most legacy hashes remain REWORK. Workstream 08 should next consume any fresh exact-hash ACCEPT from the Tops replacement queue, Aura/companion/desk queue, or Lighting/Decor queue immediately. The catalog gate remains open until all 192 current final hashes are accepted, canonical, Store-verified and safety-cleared.

Replit/Floot and `main` remain untouched. Workstream 08 does not change phase.
