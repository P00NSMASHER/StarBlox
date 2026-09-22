# Workstream 12 — Accessory Art

Status: **HEADWEAR 1–4 ACCEPTED / HEADWEAR 5–8 GENERATED + PRESERVED EXTERNALLY / EXACT BYTE TRANSFER BLOCKED / HEADWEAR 9–12 PREP ONLY**  
Branch: `screenshot-match-preproduction` only  
Producer: **12** · transport helper: **04** · Headwear reviewer: **01** · canonical writer: **08** · coordinator: **15**

## Live assignment

`ART_VISUALS_SPRINT.json` remains authoritative. The newest coordination evidence read this cycle, `docs/preproduction/catalog-sprint/coordination-15-20260922-0705.json`, explicitly preserves `headwear5_8` as **PRESERVED_EXTERNAL_NOT_STAGED** and says not to regenerate or repeat unchanged failed transport; materialization is allowed only through a genuinely new exact-byte path. It does **not** open Headwear 9–12 or another accessory family for Workstream 12. `artVisualsComplete` is still false, so this task remains ART_AND_VISUALS_ONLY.

Input branch head before this evidence write: `5ad34b900d7ad1a6de74d8310242e918ae238571`.

## Preserved accepted work

Reviewer 01 independently ACCEPTED the exact Headwear 1–4 replacements. Preserve these hashes; do not regenerate or self-review them:

- `headwear-1` `4d4424962a49f5145422723b625778d6649a4b26`
- `headwear-2` `595c8fe9182f4aecd5355856f19947c7c83daa11`
- `headwear-3` `86db079b85360dc64e669aeca53cba874176c693`
- `headwear-4` `4257b4a959153fba985fa2a97720c379b6d63e33`

Workstream 08 alone owns canonical integration.

## Active bounded pilot — Headwear 5–8

No art was regenerated, re-exported, cropped, rethemed, recompressed or substituted. The exact existing 600×600 PNG derivatives and 1024×1024 Firefly sources remain preserved with full provenance in `lane-12.json`.

| ID | Item | Tier | Theme | Planned repository path | Current state |
| --- | --- | ---: | --- | --- | --- |
| `headwear-5` | Flower Crown | 2 | Pixel Party | `public/assets/catalog/headwear-5-w12-v2.png` | external only; no repository hash |
| `headwear-6` | Gamer Headset | 2 | Berry Blast | `public/assets/catalog/headwear-6-w12-v2.png` | external only; no repository hash |
| `headwear-7` | Bucket Hat | 3 | Garden Glow | `public/assets/catalog/headwear-7-w12-v2.png` | external only; no repository hash |
| `headwear-8` | Star Clips | 3 | Galaxy Glow | `public/assets/catalog/headwear-8-w12-v2.png` | external only; no repository hash |

All four exact planned paths were reread on the current branch before this write and remained absent (404). Therefore the accounting remains **generated external 4 / preserved external 4 / repository-staged 0 / accepted-current-hash 0 / canonical 0**. Reviewer 01 still has no exact current repository hashes to disposition.

## New exact-transfer evidence

This cycle did not repeat helper 04's prior failed probes. It tested only newly exposed/supported surfaces:

1. The current Adobe connector exposes `asset_inline_preview` as a byte-fetch/inspection operation. Calling it on the exact preserved Headwear 5 600×600 derivative URL succeeds and renders the expected existing Flower Crown, confirming the preserved derivative is still live. However, the connector result surfaced to this worker still provides only the visual preview, not a reusable raw PNG/base64 payload that can be attached byte-for-byte to GitHub.
2. The currently exposed Adobe presigned-URL resolver is restricted to ACP/Lightroom assets returned from Adobe search; it is not a generic resolver for these Photoshop short URLs. The connector documentation mentions download/short-URL capabilities, but no callable exact-byte resolver/downloader for this short URL is exposed in the current tool surface.
3. One genuinely new read-only public-browser resolution attempt was made against the exact Headwear 5 short URL. In this non-interactive execution it failed immediately with `RuntimeError: User input required but current turn is running in a non-interactive mode.` No image bytes were materialized. The identical route was not repeated for Headwear 6–8.

The older direct-download failure also remains valid: the supported `curl -L` route previously failed before receiving bytes with `curl: (6) Could not resolve host: photoshop-api.adobe.io`. Helper 04's transport record remains `docs/preproduction/catalog-sprint/headwear-5-8-transport-helper-04-to-12-01.json`.

The blocker is therefore still narrowly defined as **materializing the exact preserved 600×600 PNG bytes without re-encoding, substitution, recreation, crop, resize or any art modification**. GitHub attachment/readback can proceed immediately once those exact bytes become available.

## Prep-only next micro-batch — Headwear 9–12

No new production batch is authorized. Existing prep remains ready but unchanged:

- `headwear-9` Pencil Crown · Tier 3 · Sunny Pop · 460 · 2★
- `headwear-10` Cat Ears · Tier 4 · Aqua Wave · 640 · 5★
- `headwear-11` Halo Headband · Tier 4 · Art Attack · 880 · 5★
- `headwear-12` Crystal Crown · Tier 5 · Star Luxe · 1200 · 9★

Exact legacy hashes, reviewer-01 REWORK state and dimensional prompt recipes remain in `lane-12.json`. Accounting remains **prep-only 4 / generated 0 / staged 0** for Headwear 9–12. Do not generate them until Headwear 5–8 are repository-stored/read back, reviewer 01 dispositions those exact hashes, and Workstream 15 opens the next bounded batch.

## Exact next action

Helper 04 or another coordinator-approved supported byte path should transfer the **exact existing Headwear 5–8 derivative bytes** to the four planned versioned repository paths, preserving producer provenance as Workstream 12. The helper must not alter art, self-review or canonical-wire.

As soon as bytes land, Workstream 12 will reread every path, record exact Git blob/content hash, dimensions and byte size, and hand those exact hashes to reviewer 01 for actual card/detail review. Workstream 08 acts only after reviewer 01 ACCEPTs an exact repository hash.

## Freeze / verification

No runtime, learning, economy, save, canonical mapping, test, player-data, Replit, Floot, `main`, paid-setting or deployment change was made. No build/test rerun was warranted because no runtime/canonical/test bytes changed. Headwear 5–8 remain **NOT READY FOR REVIEW** solely because repository bytes/hashes are missing.
