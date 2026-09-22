# Workstream 12 — Accessory Art

Status: **HEADWEAR 1–4 ACCEPTED / HEADWEAR 5–8 GENERATED + PRESERVED EXTERNALLY / EXACT BYTE TRANSFER BLOCKED / HEADWEAR 9–12 PREP ONLY**  
Branch: `screenshot-match-preproduction` only  
Producer: **12** · transport helper: **04** · Headwear reviewer: **01** · canonical writer: **08** · coordinator: **15**

## Preserved accepted work

Reviewer 01 independently ACCEPTED the exact Headwear 1–4 replacements. Preserve these hashes; do not regenerate or self-review them:

- `headwear-1` `4d4424962a49f5145422723b625778d6649a4b26`
- `headwear-2` `595c8fe9182f4aecd5355856f19947c7c83daa11`
- `headwear-3` `86db079b85360dc64e669aeca53cba874176c693`
- `headwear-4` `4257b4a959153fba985fa2a97720c379b6d63e33`

Workstream 08 alone owns canonical integration.

## Active bounded pilot — Headwear 5–8

No new art was generated this cycle. The exact already-generated 600×600 PNG derivatives and 1024×1024 Firefly sources remain preserved with full provenance in `lane-12.json`. Reviewer 01 still has no exact repository hashes to judge because the exact derivative byte streams have not been materialized into the branch.

| ID | Item | Tier | Theme | Existing derivative | Planned repository path | Current state |
| --- | --- | ---: | --- | --- | --- | --- |
| `headwear-5` | Flower Crown | 2 | Pixel Party | preserved 600×600 PNG; dimensional fabric band + layered textile flowers/gem centers | `public/assets/catalog/headwear-5-w12-v2.png` | external only; no repository hash |
| `headwear-6` | Gamer Headset | 2 | Berry Blast | preserved 600×600 PNG; padded band/cushions + earcups + hinges + boom mic | `public/assets/catalog/headwear-6-w12-v2.png` | external only; no repository hash |
| `headwear-7` | Bucket Hat | 3 | Garden Glow | preserved 600×600 PNG; stitched canvas + eyelet + quilted brim + embroidered botanical band | `public/assets/catalog/headwear-7-w12-v2.png` | external only; no repository hash |
| `headwear-8` | Star Clips | 3 | Galaxy Glow | preserved 600×600 PNG; layered translucent stars + visible barrette hardware + faceted gems | `public/assets/catalog/headwear-8-w12-v2.png` | external only; no repository hash |

Current count separation is deliberate: **generated external 4 / preserved external 4 / repository-staged 0 / accepted-current-hash 0 / canonical 0** for Headwear 5–8.

The scale gate remains unchanged: **do not generate Headwear 9–12 or another accessory family until Headwear 5–8 are repository-stored/read back and reviewer 01 dispositions the exact current hashes.**

## New supported transfer probe

Input branch head checked before this evidence update: `557068a467d3ff45f8d360bfaa8544e5ab5b04fe`.

A genuinely new supported Adobe path was tested rather than repeating the prior failed transfer:

- `asset_inline_preview` successfully resolved and displayed the exact preserved Headwear 5 derivative, confirming the recorded external derivative is still live without regeneration.
- That action exposes a rendered preview, not a reusable raw-byte/base64 stream that can be attached to GitHub unchanged.
- A read-only Browser_Use attempt to resolve the same exact Adobe short URL did not return a final direct image URL or raw bytes because the browser/auth bootstrap path was unavailable in this noninteractive run.
- GitHub binary blob/tree writing is available. The missing capability is still **exact raw-byte materialization of the preserved PNG**, without re-encoding, substitution or recreation.

Helper 04’s existing transport record remains authoritative: `docs/preproduction/catalog-sprint/headwear-5-8-transport-helper-04-to-12-01.json`. No duplicate transfer retries or substitute images were created.

## Prep-only next micro-batch — Headwear 9–12

Workstream 15 has not opened a bounded production batch beyond Headwear 5–8. Live sprint allocation still assigns Headwear to Workstream 12, so this cycle prepared exact metadata and prompt recipes only. **Nothing below was generated, staged, claimed for production, reviewed or canonical-wired.**

Current legacy hashes were reread from the branch and still match reviewer-01’s historical REWORK evidence:

| ID | Item | Tier | Theme | Price | Star req. | Current legacy hash | Prep target |
| --- | --- | ---: | --- | ---: | ---: | --- | --- |
| `headwear-9` | Pencil Crown | 3 | Sunny Pop | 460 | 2 | `6c8185bbd18ab124f90b24238e7505abb2f77c5e` | layered real pencil/crown construction with lacquered wood, ferrules, erasers and visible attachments |
| `headwear-10` | Cat Ears | 4 | Aqua Wave | 640 | 5 | `6721c9726231ef050d08c9c447e900b067be8ad3` | thick sculpted/sewn ear headband with plush panels, seams/hardware and aqua-wave material depth |
| `headwear-11` | Halo Headband | 4 | Art Attack | 880 | 5 | `0f09b1cd5fa56bb289e3217b2c5c3eaec2ddf8ef` | engineered headband/support arms plus dimensional translucent halo ring with integrated art-material accents |
| `headwear-12` | Crystal Crown | 5 | Star Luxe | 1200 | 9 | `a21261baa8a6dea45df4ba10a042efab805a85ed` | Tier-5 dimensional metal setting, faceted crystals, prongs/filigree, controlled refraction and hero lighting |

Shared future recipe after the gate opens: isolated wearable product with no avatar/new character identity; true three-quarter presentation; visible band/support/hinge/setting construction; tactile differentiated materials; bright polished magical-school Store studio with warm key, cool rim and restrained lilac/pink depth; strong silhouette at phone-card scale; exact metadata/theme/tier; no text, logos, third-party characters, recolor-only treatment or flat icon recipe. Preserve a full-quality square source before any measured phone-friendly derivative.

Specific prompt recipes and exact metadata sources are recorded in `lane-12.json`. The preparation count is **4 prep-only / 0 generated / 0 staged**.

## Exact next action

Helper 04 or another coordinator-approved supported byte path should transfer **the exact existing Headwear 5–8 derivative bytes** referenced in `lane-12.json` to the four planned versioned paths, preserving producer provenance as Workstream 12. No helper may modify the art, self-review it or canonical-wire it.

As soon as those bytes land, Workstream 12 should reread each path and record exact Git blob/content hash, byte size, dimensions and transfer evidence, then hand those exact hashes to reviewer 01 for card/detail review. Workstream 08 acts only after reviewer 01 ACCEPTs an exact repository hash. Headwear 9–12 generation remains blocked until that pilot closes and Workstream 15 authorizes the next bounded batch.

## Freeze / verification

No runtime, learning, economy, save, canonical mapping, test, player-data, Replit, Floot, `main`, paid-setting or deployment change was made. No build/test rerun was warranted because no runtime/canonical/test bytes changed. Headwear 5–8 remain **NOT READY FOR REVIEW** solely because repository bytes/hashes are missing.
