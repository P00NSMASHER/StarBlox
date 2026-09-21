# Workstream 08 — Catalog Integration

STATUS: **27 EXACT-HASH REPLACEMENTS ACCEPTED + CANONICALLY WIRED / LATEST 10-ITEM BATCH TEST+BUILD+STRICT STORE-MOBILE PASS**

Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data remain untouched. Workstream 08 remains the sole canonical writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js`; reviewer 14 retains independent catalog release-gate authority.

## Latest canonical integration

Canonical commit: `56245a88f5b680fae2c2d53fdf9c803dd6c809a2`.

Ten fresh reviewer-02 exact-hash ACCEPTs were integrated as one coherent batch after stored-byte/hash readback, authoritative Store metadata validation, raster decode, reviewer-independence checks, same-hash disagreement checks, and canonical path/content uniqueness checks:

- Shoes 1–6: `shoes-1`, `shoes-2`, `shoes-3`, `shoes-4`, `shoes-5`, `shoes-6`.
- Seating 7–10: `seating-7`, `seating-8`, `seating-9`, `seating-10`.

Reviewer 02 was independent from producers 04 and 06. No producer self-review was accepted. Historical REWORK decisions applied only to older hashes and were not transferred to these replacement hashes.

Canonical manifest is now v16 with **130 mappings**, **114 legacy final-portable labels**, **16 interim-not-verified entries**, and **78 IDs without a final-portable legacy label**. Legacy labels are not the strict visual-quality count.

Strict V2 replacement state is now **27 independently accepted / 27 canonical-wired / 0 release-cleared**, leaving **165/192** IDs still without a current exact-hash accepted+wired replacement under the strict catalog sprint standard.

Canonical manifest blob: `b93b1a0501370997aa658e49a36600150ccf5d71`.  
Canonical runtime blob: `48da673bc54df5bcea308509d496a9c77a5ab71b`.  
Canonical duplicate paths: **0**. Canonical duplicate content hashes: **0**.

## Validation

Workstream-08 integration workflow run `35669414785`, job `106562287824`, completed successfully. The following all passed before publication against the coherent canonical candidate:

- exact ID/name/collection/category/tier/theme checks against current `gameModel.store`: **PASS 10/10**;
- exact stored Git-blob readback: **PASS 10/10**;
- raster decode plus existing hash-bound visual evidence: **PASS 10/10**;
- reviewer independence: **PASS 10/10**;
- same-hash disagreement scan: **PASS — none**;
- canonical path/content uniqueness: **PASS 130/130**;
- manifest/runtime agreement: **PASS 130/130**;
- full npm regression suite: **PASS**;
- Vite production build: **PASS**;
- strict catalog Store/mobile QA: **PASS**.

A concurrent Desk 5–6 producer checkpoint landed while validation was running. It changed only Desk art/evidence and did not change the accepted reviewer-02 hashes, Store metadata, manifest or runtime inputs. The integration job rebased safely over that checkpoint and pushed without force.

The historical `beds-1` manifest drift is resolved and remains protected by the strict metadata invariant: `beds-1` is `Garden Glow`, matching the authoritative Store model.

## Current handoff

Reviewer 14: independently review the staged Lighting 5–8 replacement hashes and run a fresh Home/Store/Quest comparison against the now-committed original reference pixels at a coherent milestone. Workstream 08 does not self-approve reference parity or release clearance.

Reviewer 05: prioritize fresh visible Desk and Companion replacements; corrupt/transparent Desk versions remain ineligible regardless of schema validity. Reviewer 01: prioritize fresh Tops/Bottoms/Headwear/Facegear replacements. Reviewer 02: next fresh Seating 1–6/11–12 and Shoes 7–12 hashes. Workstream 08 will integrate each next qualified exact-hash ACCEPT immediately.

## Preserved prior accepted increments

Earlier current-hash accepted mappings remain intact, including Tops 1–6, Companions 3/4/10/11, Lighting 1–4 and Auras 6/7/8. Prior asset versions remain in Git history for rollback.

Catalog phase remains active. No phase switch, deployment, Replit/Floot update, main merge, player-data mutation, catalog expansion or visual-standard relaxation is authorized by this integration.
