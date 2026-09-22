# Workstream 12 — Accessory Art

Status: **HEADWEAR 1–4 ACCEPTED / HEADWEAR 5–8 GENERATED + PRESERVED EXTERNALLY / EXACT BYTE TRANSFER BLOCKED / HEADWEAR 9–12 PREP ONLY**  
Branch: `screenshot-match-preproduction` only  
Producer: **12** · transport helper: **04** · Headwear reviewer: **01** · canonical writer: **08** · coordinator: **15**

## Live assignment

`ART_VISUALS_SPRINT.json` remains authoritative. The latest coordinator evidence read this cycle, `coordination-15-20260922T0107Z.json`, still assigns Workstream 12 to preserve accepted Headwear 1–4 and operate the bounded Headwear 5–8 pilot. It does **not** open Headwear 9–12 or another accessory family. The scale gate therefore remains in force.

## Preserved accepted work

Reviewer 01 independently ACCEPTED the exact Headwear 1–4 replacements. Preserve these hashes; do not regenerate or self-review them:

- `headwear-1` `4d4424962a49f5145422723b625778d6649a4b26`
- `headwear-2` `595c8fe9182f4aecd5355856f19947c7c83daa11`
- `headwear-3` `86db079b85360dc64e669aeca53cba874176c693`
- `headwear-4` `4257b4a959153fba985fa2a97720c379b6d63e33`

Workstream 08 alone owns canonical integration.

## Active bounded pilot — Headwear 5–8

No art was regenerated, re-exported, cropped, rethemed, or substituted. The exact existing 600×600 PNG derivatives and 1024×1024 Firefly sources remain preserved with full provenance in `lane-12.json`.

| ID | Item | Tier | Theme | Planned repository path | Current state |
| --- | --- | ---: | --- | --- | --- |
| `headwear-5` | Flower Crown | 2 | Pixel Party | `public/assets/catalog/headwear-5-w12-v2.png` | external only; no repository hash |
| `headwear-6` | Gamer Headset | 2 | Berry Blast | `public/assets/catalog/headwear-6-w12-v2.png` | external only; no repository hash |
| `headwear-7` | Bucket Hat | 3 | Garden Glow | `public/assets/catalog/headwear-7-w12-v2.png` | external only; no repository hash |
| `headwear-8` | Star Clips | 3 | Galaxy Glow | `public/assets/catalog/headwear-8-w12-v2.png` | external only; no repository hash |

At input head `cc0de0b5dd675b98a2bf8f7525de0b10e299a5c0`, all four exact planned paths were reread and returned 404. Therefore the count remains **generated external 4 / preserved external 4 / repository-staged 0 / accepted-current-hash 0 / canonical 0**.

Reviewer 01 still has no exact current repository hashes to disposition.

## New exact-transfer evidence

This cycle tested one genuinely new supported path rather than repeating helper 04’s prior probes. Adobe’s connector initialization explicitly documents direct `curl -L` download of Adobe tool output URLs. I exercised that documented path once against the exact preserved Headwear 5 600×600 derivative URL.

Result: the transfer failed before any bytes were received with `curl: (6) Could not resolve host: photoshop-api.adobe.io`. All four derivative URLs use the same host, so the identical host-level failure was **not** redundantly repeated for Headwear 6–8.

The exact Headwear 5 derivative still resolves successfully through Adobe inline preview, confirming the preserved external asset remains live without regeneration. That preview does not expose a reusable lossless raw-byte/base64 stream. GitHub exact binary creation is available once raw bytes/base64 exist, so the unresolved blocker is now narrowly defined as **materializing the exact preserved PNG bytes without re-encoding, substitution, recreation, or art modification**.

Helper 04’s transport record remains: `docs/preproduction/catalog-sprint/headwear-5-8-transport-helper-04-to-12-01.json`.

## Prep-only next micro-batch — Headwear 9–12

No new production batch was authorized. Existing prep remains ready but unchanged: `headwear-9` Pencil Crown / Tier 3 / Sunny Pop; `headwear-10` Cat Ears / Tier 4 / Aqua Wave; `headwear-11` Halo Headband / Tier 4 / Art Attack; `headwear-12` Crystal Crown / Tier 5 / Star Luxe. Exact metadata, current legacy hashes, historical reviewer-01 REWORK state, and dimensional construction recipes remain in `lane-12.json`.

Accounting remains **4 prep-only / 0 generated / 0 staged** for Headwear 9–12. Do not generate them until Headwear 5–8 are repository-stored/read back, reviewer 01 dispositions those exact hashes, and Workstream 15 opens the next bounded batch.

## Exact next action

Helper 04 or another coordinator-approved supported byte path should transfer the **exact existing Headwear 5–8 derivative bytes** to the four planned versioned repository paths, preserving producer provenance as Workstream 12. The helper must not alter art, self-review, or canonical-wire.

As soon as bytes land, Workstream 12 rereads every path, records exact Git blob/content hash, dimensions and byte size, and hands those exact hashes to reviewer 01 for actual card/detail review. Workstream 08 acts only after reviewer 01 ACCEPTs an exact repository hash.

## Freeze / verification

No runtime, learning, economy, save, canonical mapping, test, player-data, Replit, Floot, `main`, paid-setting or deployment change was made. No build/test rerun was warranted because no runtime/canonical/test bytes changed. Headwear 5–8 remain **NOT READY FOR REVIEW** solely because repository bytes/hashes are missing.
