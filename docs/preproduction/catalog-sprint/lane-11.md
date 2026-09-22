# Catalog Sprint — Lane 11 Auras

STATUS: **AURAS 6–8 ACCEPTED + CANONICAL / AURAS 1–5, 9, 10, 12 V3 STAGED + PENDING 05 / AURA 11 REWORK**

Branch: `screenshot-match-preproduction`  
Workstream: 11  
Phase: `CATALOG_SPRINT`  
Independent reviewer: **05**  
Canonical integrator: **08**  
Replit/Floot: **untouched**  
`main`: **untouched**  
Player state / learning / economy / live Aura logic: **unchanged**

## Fresh reviewer-05 decisions consumed

Reviewer 05 has now independently reviewed the current v2 replacements for all twelve Aura IDs. The fresh result is **ACCEPT 3 / REWORK 9 / BLOCKED 0**.

The accepted exact hashes are preserved and must not be regenerated:

| ID | Item | Exact accepted hash | Canonical status |
| --- | --- | --- | --- |
| `auras-6` | Galaxy Orbit | `ce4b155c7fb5469fde415ab9d744cab41027fe4d` | integrated by 08 |
| `auras-7` | Sunny Rays | `c451e7479e142f1eca89cc5282b352c2d2ca2d4b` | integrated by 08 |
| `auras-8` | Aqua Bubbles | `6884668fe721f3b26a562e11924237a32c656db6` | integrated by 08 |

Workstream 08’s current integration report records those same three Aura hashes in manifest version 15 after metadata/file/reviewer checks. They are no longer Lane-11 repair work.

The current exact-hash REWORK set is `auras-1..5` plus `auras-9..12`. Reviewer defects remain specific: volumetric depth/material-lighting for 1–4; weak Pixel Party spatial depth for Garden Fireflies; spatial scatter/material depth for Art Confetti; volumetric ribbon/light spill for Neon Trail; translucent curtain/painterly light interaction for Dream Aurora; and crystalline near/far luxury storm depth for Luxe Starstorm.

## Second repair pilot — Auras 1–4

A new four-item second-repair pilot was generated from the reviewer-05 defects using Adobe Firefly. These are **new pixels**, not relabeled v2 SVGs. Full-size sources are 1024×1024 PNG outputs; 768×768 PNG candidates were then produced with resize-only processing and visually inspected again.

| ID | Exact item | Tier / theme | Source asset | Producer visual result |
| --- | --- | --- | --- | --- |
| `auras-1` | Soft Sparkles | T1 / Midnight Neon | `urn:aaid:sc:US:96e36bd6-1803-401c-ba42-5640d7780b8d` | faceted crystal star sparks at multiple apparent depths, luminous dust, curved cyan/magenta trails; materially richer while still Starter-simple |
| `auras-2` | Cloud Puffs | T1 / Candy Core | `urn:aaid:sc:US:3f30d527-cb7d-46aa-9afc-f14d13f1df26` | overlapping candy-colored cloud volumes with soft internal scattering, occlusion and suspended motes |
| `auras-3` | Pixel Bits | T1 / Adventure Club | `urn:aaid:sc:US:f89c3b68-841a-49f9-a5cf-2f39b5aff489` | chunky beveled voxel cluster, gold/teal/berry palette and perspective segmented paths with obvious 3D parallax |
| `auras-4` | Berry Hearts | T2 / Cloud Pop | `urn:aaid:sc:US:a7fbf1ae-ba43-4942-aec0-459342422483` | glossy berry hearts, volumetric white/pink clouds, pearl droplets and layered light trails with an open card-readable center |

The exact generation/resize request IDs and Adobe output URLs are preserved in `lane-11.json`. All four 1024px outputs and all four 768px candidates were actually previewed after generation; no clipping or unreadable framing was observed.

### Honest transport status

These four v3 candidates are now **STAGED / READY_FOR_REVIEW_05** after coordination-owned exact-byte recovery. The current Lane-11 tool path can generate and inspect the Adobe bytes, but it does not expose the binary payload needed by GitHub’s blob writer. Writing a new shared import workflow would violate the current ownership rule because shared harness/import changes belong to 14/15.

Therefore:

- intended paths are `public/assets/catalog/auras-1-w11-v3.png` through `auras-4-w11-v3.png`;
- repository byte counts and Git blob hashes do **not** exist yet and are not fabricated;
- reviewer 05 must not review these v3s until exact repository bytes exist;
- Workstream 08 must not integrate them until reviewer-05 exact-hash ACCEPT exists;
- Workstream 11 must not regenerate them while transport is pending.

This is the **first recorded cycle** for this exact v3 binary-transport blocker. Workstream 15 is handed the exact source/candidate identifiers so it can route the bytes through an already-authorized coordinator-owned import path if one exists, without regenerating or changing the pixels.

## Current Aura lane

- `auras-1..4`: second-repair v3 repository-staged and READY_FOR_REVIEW_05.
- `auras-5`: v2 exact-hash REWORK; future bounded repair required.
- `auras-6..8`: **independent ACCEPT + canonical integration complete**; preserve exactly.
- `auras-9..12`: v2 exact-hash REWORK; future bounded repair required.
- Qualified current Aura ACCEPTs: **3**.
- Canonical Aura replacements: **3**.

## Handoff

**15:** Aura 1–4 transport is cleared. Preserve their staged hashes and coordinate the newly staged 5/9/10/12 pilot without regeneration.

**05:** preserve accepted `auras-6/7/8`. Auras 1–5, 9, 10 and 12 now have newer staged v3 hashes that require independent actual-pixel review; do not transfer v2 verdicts.

**08:** keep integrated `auras-6/7/8`. No v3 Aura is integration-eligible until reviewer 05 accepts its exact current hash.

**11:** do not regenerate staged v3 candidates. Aura 11 is the only remaining REWORK Aura without a newer staged replacement.

General motion/game-feel work remains paused because the phase is still `CATALOG_SPRINT`. No deployment action was taken.


## Third repair pilot — Auras 5, 9, 10, 12

A bounded four-item pilot is now staged as new versioned bytes. Accepted Auras 6–8 remain untouched.

| ID | Exact metadata | New candidate | Measured dimensions / bytes | Git blob | Review state |
| --- | --- | --- | --- | --- | --- |
| `auras-5` | Garden Fireflies — T2 / Pixel Party | `/assets/catalog/auras-5-w11-v3.jpg` | 600×600 JPEG / 66,937 B | `ae3bef6cbbf4333aa740dc9a3fddf4f2b5540192` | PENDING independent 05 |
| `auras-9` | Art Confetti — T3 / Sunny Pop | `/assets/catalog/auras-9-w11-v3.jpg` | 600×600 JPEG / 109,330 B | `9331e516a7a1a2fa32abafaf3bbf0932c3ca792d` | PENDING independent 05 |
| `auras-10` | Neon Trail — T4 / Aqua Wave | `/assets/catalog/auras-10-w11-v3.jpg` | 600×600 JPEG / 129,235 B | `6f07fe7f5c8be236f3c17df5f55afc550888f52e` | PENDING independent 05 |
| `auras-12` | Luxe Starstorm — T5 / Star Luxe | `/assets/catalog/auras-12-w11-v3.jpg` | 600×600 JPEG / 142,496 B | `d0fcf528ff4ee91e56760932fdcf357ab264dd3d` | PENDING independent 05 |

The full-quality originals remain preserved as Adobe GenAI assets by exact URN/request ID in `lane-11.json`. The exact quality-96 600×600 JPEG bytes inspected during generation were committed to the branch and read back with matching Git blob SHAs.

Repair targets:
- `auras-5` Garden Fireflies / Pixel Party: true near/mid/far firefly depth, translucent foliage, occlusion and pixel-cube accents instead of a flat wreath.
- `auras-9` Art Confetti / Sunny Pop: spatial foreground/background scatter, glossy ribbons/confetti and Tier-3 material depth.
- `auras-10` Neon Trail / Aqua Wave: refractive volumetric aqua ribbons, true depth crossings and layered Tier-4 light spill.
- `auras-12` Luxe Starstorm / Star Luxe: faceted crystalline hero stars, prismatic/gold luxury materials and strong near/far Tier-5 storm depth.

These files are **staged, not accepted**. Reviewer 05 owns the independent exact-hash decision and Workstream 08 alone owns canonical wiring. Old v2 REWORK decisions do not transfer to these new hashes. Do not regenerate them while review is pending.

Aura 11 is now the only remaining rejected Aura without a newer staged replacement. No learning, economy, save, live player state, deployment, Replit/Floot, or `main` changes were made.


## Exact-hash staged-art render evidence — pilot 5/9/10/12

The existing shared staged-art fixture selected the new Aura v3 hashes and produced actual screenshots in workflow run **35672325902**, artifact **10671442777** (`catalog-staged-art-review`, SHA-256 `190e080af412f1aa7cd73a523a6bd1a231b5fb6a9bd62cc0fd8bbd40aaa2ddf8`).

All four Lane-11 pilot entries passed the render-level checks needed before independent visual judgment:

- `auras-5@ae3bef6c...`: HTTP 200, natural 600×600, screenshot produced, zero per-item errors.
- `auras-9@9331e516...`: HTTP 200, natural 600×600, screenshot produced, zero per-item errors.
- `auras-10@6f07fe7f...`: HTTP 200, natural 600×600, screenshot produced, zero per-item errors.
- `auras-12@d0fcf528...`: HTTP 200, natural 600×600, screenshot produced, zero per-item errors.

Reviewer 05 should use `staged-replacements/staged-replacements-contact-sheet.png` plus the exact detail renders named in `lane-11.json.latestPilotBatch.renderEvidence`.

The workflow's overall conclusion is still **failure**, but the failure is not an Aura decode/render failure: the same run hit the already-known stale `desks-2/3/4-w03-v1.webp` decode defect in the shared fixture. That release-visible failure remains owned by Workstream 14 and was not waived or hidden. Lane 11 did not modify the fixture.

No self-approval was recorded. The four new Aura hashes remain PENDING independent reviewer-05 decisions and cannot be wired by anyone except 08 after an exact-hash ACCEPT.
