# Workstream 12 — Accessory Art

Status: **HEADWEAR 1–4 ACCEPTED / HEADWEAR 5–8 GENERATED + PRESERVED EXTERNALLY / EXACT BYTE TRANSFER BLOCKED / HEADWEAR 9–12 PREP ONLY**  
Branch: `screenshot-match-preproduction` only  
Producer: **12** · transport helper: **04** · Headwear reviewer: **01** · canonical writer: **08** · coordinator: **15**

## Live assignment and factory reconciliation

This run reread, in order, `ART_VISUALS_SPRINT.json`, `art-factory/README.md`, `art-factory/ART_FACTORY_V2.json`, current lane/helper/reviewer evidence, then compatible `DELIVERY_PROTOCOL_V2.md`. Current coordinator evidence `docs/preproduction/catalog-sprint/coordination-15-20260922-0705.json` still classifies Headwear 5–8 as **PRESERVED_EXTERNAL_NOT_STAGED**, forbids regeneration/repeated unchanged transport, and opens no later Workstream 12 batch. `artVisualsComplete` remains false.

Input head for exact-path reconciliation: `18c7f2deeafd8f17332f7eb52bb2921d5e9dc6fa`.

The preserved Headwear 5–8 generation predates the new Art Factory v2 receipt contract. Those exact assets are therefore preserved rather than regenerated merely to backfill factory metadata. Their receipts identify Adobe Firefly but do **not** expose an exact model/checkpoint ID or revision; that fact is recorded as missing rather than invented. Repository-code, user-provided Store-reference, Adobe service, and custom-node provenance/terms are kept separate in `lane-12.json`.

## Preserved accepted work

Reviewer 01 independently ACCEPTED the exact Headwear 1–4 replacements. Preserve these hashes; do not regenerate or self-review:

- `headwear-1` `4d4424962a49f5145422723b625778d6649a4b26`
- `headwear-2` `595c8fe9182f4aecd5355856f19947c7c83daa11`
- `headwear-3` `86db079b85360dc64e669aeca53cba874176c693`
- `headwear-4` `4257b4a959153fba985fa2a97720c379b6d63e33`

Workstream 08 alone owns canonical integration.

## Active bounded pilot — Headwear 5–8

No art was regenerated, re-exported, cropped, rethemed, recompressed or substituted. The exact existing 600×600 PNG derivatives and 1024×1024 Firefly sources remain preserved with their original request IDs, Creative Cloud asset IDs and output URLs in `lane-12.json`.

| ID | Item | Tier | Theme | Planned repository path | Current state |
| --- | --- | ---: | --- | --- | --- |
| `headwear-5` | Flower Crown | 2 | Pixel Party | `public/assets/catalog/headwear-5-w12-v2.png` | external only; no repository hash |
| `headwear-6` | Gamer Headset | 2 | Berry Blast | `public/assets/catalog/headwear-6-w12-v2.png` | external only; no repository hash |
| `headwear-7` | Bucket Hat | 3 | Garden Glow | `public/assets/catalog/headwear-7-w12-v2.png` | external only; no repository hash |
| `headwear-8` | Star Clips | 3 | Galaxy Glow | `public/assets/catalog/headwear-8-w12-v2.png` | external only; no repository hash |

All four exact planned paths were reread at the live input head and returned 404. Accounting is therefore **generated external 4 / preserved external 4 / repository-staged 0 / accepted-current-hash 0 / canonical 0**. Reviewer 01 still has no exact repository hashes to disposition.

### New exact-byte transport evidence

A genuinely new supported bridge was tested once against the exact existing Headwear-5 derivative: Adobe `asset_openai_file_upload` was explored as a service-to-service materialization path. Passing the preserved Photoshop short URL directly failed with `no file or image tokens found`; a URL-object form was schema-rejected because the action requires a connector file-reference token. No image was changed, and this failed bridge was not repeated for Headwear 6–8.

Adobe inline preview still resolves the exact Headwear-5 derivative, confirming it remains live, but the exposed preview result does not yield reusable raw PNG/base64 bytes. Connector discovery also does not expose a callable generic Photoshop-short-URL byte downloader. Helper-04's prior DNS/browser failures remain preserved and were not needlessly rerun.

The destination side is no longer ambiguous: the current GitHub connector exposes binary-safe blob/tree/commit/ref writes. The remaining blocker is **source-side exact byte materialization only**. As soon as unchanged bytes become available, they can be attached without re-encoding, reread from GitHub, hashed, dimension/byte-count verified, and handed to reviewer 01.

## Prep-only next micro-batch — Headwear 9–12

No production batch is authorized, so no optimizer/generation pilot was started. Current legacy files and metadata remain unchanged:

| ID | Exact metadata | Current legacy blob | Prepared prompt SHA-256 |
| --- | --- | --- | --- |
| `headwear-9` | Pencil Crown · Tier 3 · Sunny Pop · 460 · 2★ | `6c8185bbd18ab124f90b24238e7505abb2f77c5e` | `78cba9041de82ad254390b435c5d54db513691c30d08aca80c07f3cb709d1ea5` |
| `headwear-10` | Cat Ears · Tier 4 · Aqua Wave · 640 · 5★ | `6721c9726231ef050d08c9c447e900b067be8ad3` | `163c48793b0635f76c43b8406e06068af98038a3535b03649bd99059adecd9a9` |
| `headwear-11` | Halo Headband · Tier 4 · Art Attack · 880 · 5★ | `0f09b1cd5fa56bb289e3217b2c5c3eaec2ddf8ef` | `f9b17bb37710b040d3e30c4a2bc0b90a19b072d42690e203abf88d7a2ef63f72` |
| `headwear-12` | Crystal Crown · Tier 5 · Star Luxe · 1200 · 9★ | `a21261baa8a6dea45df4ba10a042efab805a85ed` | `5c2faf6c5874bb47da424dd55cd73d2ac396a6b3447ce9306f9d184224cd8df6` |

The exact recipes remain in `lane-12.json`; they are prep evidence only. `artPromptOptimizer` is deliberately **NOT RUN** because this batch is not actionable. If Workstream 15 opens it later, the optimizer must run first, then only a bounded 2–4 variant factory pilot may proceed with prompt SHA, seed/runtime/model revision evidence, reference hash, source/derivative lineage, repository readback, and actual Store card/detail pixels before independent reviewer-01 disposition.

Accounting for Headwear 9–12 remains **prep-only 4 / generated 0 / repository-staged 0 / accepted 0 / canonical 0**.

## Exact next action

Helper 04 or another coordinator-approved supported byte path should transfer the **exact existing Headwear 5–8 derivative bytes** to the four planned versioned paths, preserving producer provenance as Workstream 12. Do not alter art, self-review or canonical-wire.

Once bytes land, Workstream 12 will immediately reread all four paths, record exact Git blob/content hash, dimensions and byte size, and hand those exact current hashes to reviewer 01 for real card/detail review. Workstream 08 acts only after reviewer 01 ACCEPTs an exact repository hash.

## Freeze / verification

No runtime, learning, economy, save, canonical mapping, test, player-data, secret, Replit, Floot, `main`, paid-setting/purchase or deployment change was made. No build/test rerun was warranted because no runtime/canonical/test bytes changed. Headwear 5–8 remain **NOT READY FOR REVIEW** solely because repository bytes/hashes are missing.
