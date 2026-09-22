# Workstream 08 catalog integration

Status: **Five qualified exact-hash ACCEPTs integrated; catalog assertions and production builds pass; Store/mobile release proof remains blocked before Store content by the shared navigation click defect.**

Current canonical head: `ad8867efc70d1b123cbc5e2f157766bec58e510d` on `screenshot-match-preproduction`. Replit/Floot/main/deploy/paid settings/player data untouched.

## Integrated accepted increments

| ID | Name | Tier · theme | Canonical asset | Git blob | Independent reviewer |
|---|---|---|---|---|---|
| shoes-7 | Chunky Sneakers | T3 · Cloud Pop | `/assets/catalog/shoes-7-w06-v3.png` | `cb8f02aaa4844d1a19a013edc3d0d1a15c0620a2` | 02 |
| shoes-8 | Trainers | T3 · Pixel Party | `/assets/catalog/shoes-8-w06-v3.png` | `1aa21e1156f7645fc218402c337d2eebe95d81f8` | 02 |
| shoes-9 | Paint Kicks | T3 · Berry Blast | `/assets/catalog/shoes-9-w06-v3.png` | `ff5e914eb935194a1541cebf5421264e5da2d543` | 02 |
| shoes-10 | Light Shoes | T4 · Garden Glow | `/assets/catalog/shoes-10-w06-v3.png` | `489e37f25644d13a4ca9518f4047ebfb35747a47` | 02 |
| auras-11 | Dream Aurora | T4 · Art Attack | `/assets/catalog/auras-11-w11-v3.jpg` | `7f3372c1584e07f18a3abfc7818013190fff1560` | 05 |

Shoes 7-10 were published as bounded manifest v26 commit `04eb1f4c4a6f9efcd0e6bea9d33e7580740dcfd4`. Aura 11 was then published separately as manifest v27 commit `ad8867efc70d1b123cbc5e2f157766bec58e510d` after rebasing over unrelated documentation work without force push or stale whole-file overwrite.

Each accepted asset passed stored-byte/blob readback, exact authoritative Store name/type/tier/theme reconciliation, decode/render evidence, reviewer independence and path/content uniqueness. Existing accepted mappings and prior asset versions remain preserved in Git history.

## Current counts

Manifest v27 has **163/163 canonical mappings**, **156 legacy `final-portable`**, **7 legacy interim-not-verified**, and **36 target IDs outside the legacy final set**. The stricter V2 count is **90/192 independently accepted current hashes canonically wired**, leaving **102 strict remaining**. Release-cleared remains **0/192**. Duplicate canonical paths/content introduced by this run: **0**.

Generated-local this run: 0. Preserved-blob-only this run: 0. Newly branch-staged this run: 0. Qualified accepted evidence consumed: 5. Canonical strict count delta: +5.

## Validation

For both canonical increments the catalog manifest invariants, asset-safety checks and Store runtime tests passed; the suites executed **99 passing assertions with no assertion failure**. The generic CI wrapper still reports the unrelated existing `scripts/artPromptOptimizer.test.mjs` collection problem (`No test suite found`); no assertion was weakened or bypassed.

Production Vite build passed for Shoes 7-10 in Catalog Mobile QA run `35689825441` and passed again for Aura 11 in Catalog Mobile QA run `35690236073`. The strict changed-art Store/mobile safeguard reproduced the same pre-existing shared blocker on both commits: all six controls resolve the visible Store nav button, then time out during the click before Store content is reached. Shoes artifact: `10677978587`; Aura artifact: `10678253907`. Store proof is therefore **BLOCKED**, not passed, and release-cleared remains 0.

A fresh reference screenshot workflow was triggered for the Aura 11 canonical commit (`35690236105`). Reference import/capture is evidence only, not a parity or release-clearance claim.

## Live review recheck

Reviewer 01 has no new qualified ACCEPT: Tops 11-12 current v6 candidates remain BLOCKED on qualified pixel/signature evidence and Headwear 5-8 are not repository-qualified. Reviewer 02 has no new ACCEPT beyond Shoes 7-10 now canonical. Reviewer 05 has no new ACCEPT beyond Aura 11 now canonical. Reviewer 14's live shard still does not provide a qualified current-hash Rugs 12 ACCEPT, so Rugs 12 remains unwired.

Only Workstream 15 may declare visual completion or change phase. Catalog/art completion does not authorize deployment.