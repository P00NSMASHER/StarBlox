# Workstream 08 catalog integration

Status: **10 NEW EXACT-HASH ACCEPTS CANONICALLY WIRED; SCOPED TEST/BUILD/STORE SMOKE PASS**

Canonical commit: `56245a88f5b680fae2c2d53fdf9c803dd6c809a2`  
Source head before canonical write: `4d12f8bd531aa0bcf55935385126dcb4115914c6`  
Concurrent producer checkpoint safely rebased before publication: `092011946baa285ec71de3e613e07978e842452a` (Desk 5–6 art/evidence only; no conflicting canonical input)  
Reviewer shard: `docs/preproduction/catalog-sprint/reviews/02.json` @ `ad4d8c9892a5e4c9c2a33553d5ab50f89b03b036`  
Branch: `screenshot-match-preproduction` only. Replit/Floot/main/player data untouched.

## Newly integrated exact-hash ACCEPTs

| ID | Name | Tier/theme | Canonical asset | Git blob | Decode |
|---|---|---|---|---|---|
| shoes-1 | Sneakers | T1 · Aqua Wave | `/assets/catalog/shoes-1-w04-recovered-v2.jpg` | `1a0351a733c7639ecdf4d90d41e4e5159bd7e8ad` | JPEG 600×600 |
| shoes-2 | Slip-Ons | T1 · Art Attack | `/assets/catalog/shoes-2-w04-recovered-v2.jpg` | `4377e9c6b996a154db67feae1adb924715364f54` | JPEG 600×600 |
| shoes-3 | High-Tops | T1 · Star Luxe | `/assets/catalog/shoes-3-w04-recovered-v2.jpg` | `995c65c304af6acc85fad2a98cfe07029b486472` | JPEG 600×600 |
| shoes-4 | Bow Shoes | T2 · Midnight Neon | `/assets/catalog/shoes-4-w04-recovered-v2.jpg` | `121bd48007f74a2df4c760fa4650e7075138cffb` | JPEG 600×600 |
| shoes-5 | Boots | T2 · Candy Core | `/assets/catalog/shoes-5-w04-v2.jpg` | `eaac23dcecf94ac3875adb61017f2436cf4d1d0c` | JPEG 600×600 |
| shoes-6 | Runners | T2 · Adventure Club | `/assets/catalog/shoes-6-w04-v2.jpg` | `2622d23d9a24e689c669292671c531a91b355221` | JPEG 600×600 |
| seating-7 | Lounge Chair | T3 · Cloud Pop | `/assets/catalog/seating-7-w06-v2.png` | `91457eddbb3ae915867d717eec72632ea6a183be` | PNG 768×768 |
| seating-8 | Bubble Seat | T3 · Pixel Party | `/assets/catalog/seating-8-w06-v2.png` | `23c02ab51249ab373aab264a17778a090d023eb4` | PNG 768×768 |
| seating-9 | Art Stool | T3 · Berry Blast | `/assets/catalog/seating-9-w06-v2.png` | `7fcdea13121a8820dd8dc64e8982637acb2c5819` | PNG 768×768 |
| seating-10 | Pod Chair | T4 · Garden Glow | `/assets/catalog/seating-10-w06-v2.png` | `9aa53664cbc8ee24283ea44830f1f3037c576340` | PNG 768×768 |

Reviewer 02 is independent from producers 04/06. Each accepted file was re-read from repository bytes, its Git blob was matched to the exact review decision and producer handoff, metadata was checked against the authoritative Store model, raster decode succeeded, and canonical path/content uniqueness was recomputed. Historical REWORK hashes do not block these replacement hashes.

## Accounting

- Legacy manifest final-portable labels after this batch: **114/192**. This is not the strict visual-acceptance count.
- Current exact-hash independently accepted and canonical-wired replacements: **27/192**.
- Strict accepted/wired remaining: **165**.
- Interim-not-verified manifest entries: **16**.
- Canonical manifest/runtime mappings: **130**.
- Canonical manifest version: **16**.
- Canonical manifest blob: `b93b1a0501370997aa658e49a36600150ccf5d71`.
- Canonical runtime blob: `48da673bc54df5bcea308509d496a9c77a5ab71b`.
- Canonical duplicate paths: **0**; canonical duplicate content hashes: **0**.
- Catalog release-cleared IDs: **0** until reviewer 14 completes the independent release gate.

## Executed validation

Workstream-08 integration run `35669414785`, job `106562287824`, completed successfully. Exact-hash validation, full npm regression, Vite production build, and strict catalog Store/mobile QA all passed against the coherent prepared canonical files before commit. The canonical files were then rebased safely over the unrelated Desk 5–6 producer checkpoint and pushed without force. The canonical manifest/runtime digests above are unchanged from the validated candidate.

The earlier `beds-1` metadata defect remains fixed: canonical theme is `Garden Glow`, matching the authoritative Store model, and the strict catalog metadata test passed in this integration run.

Fresh Home/Store/Quest comparison against the committed original reference pixels remains independently owned by reviewer 14. Workstream 08 does not claim reference parity or catalog release clearance.
