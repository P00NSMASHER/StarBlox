# Catalog Sprint — Lane 11 Auras

STATUS: **AURAS 6–8 ACCEPTED + CANONICAL / AURAS 1–4 V3 GENERATED REMOTE BUT UPLOAD-BLOCKED / AURAS 5 + 9–12 REWORK**

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

These four v3 candidates are **GENERATED_REMOTE / UPLOAD_BLOCKED**, not staged and not READY_FOR_REVIEW. The current Lane-11 tool path can generate and inspect the Adobe bytes, but it does not expose the binary payload needed by GitHub’s blob writer. Writing a new shared import workflow would violate the current ownership rule because shared harness/import changes belong to 14/15.

Therefore:

- intended paths are `public/assets/catalog/auras-1-w11-v3.png` through `auras-4-w11-v3.png`;
- repository byte counts and Git blob hashes do **not** exist yet and are not fabricated;
- reviewer 05 must not review these v3s until exact repository bytes exist;
- Workstream 08 must not integrate them until reviewer-05 exact-hash ACCEPT exists;
- Workstream 11 must not regenerate them while transport is pending.

This is the **first recorded cycle** for this exact v3 binary-transport blocker. Workstream 15 is handed the exact source/candidate identifiers so it can route the bytes through an already-authorized coordinator-owned import path if one exists, without regenerating or changing the pixels.

## Current Aura lane

- `auras-1..4`: second-repair v3 generated and visually checked; repository transport blocked.
- `auras-5`: v2 exact-hash REWORK; future bounded repair required.
- `auras-6..8`: **independent ACCEPT + canonical integration complete**; preserve exactly.
- `auras-9..12`: v2 exact-hash REWORK; future bounded repair required.
- Qualified current Aura ACCEPTs: **3**.
- Canonical Aura replacements: **3**.

## Handoff

**15:** route the exact Auras 1–4 v3 Adobe source/candidate outputs through an existing coordinator-owned binary intake path if available. Do not regenerate them. If this same transport blocker is unchanged for the next Lane-11 cycle, it becomes eligible for the V2 two-cycle escalation rule.

**05:** preserve the accepted `auras-6/7/8` hashes. The v3 repair pixels for `auras-1..4` are not review-eligible until repository paths/hashes exist. `auras-5` and `auras-9..12` remain current exact-hash REWORK.

**08:** no new Aura candidate from this pass is integration-eligible. Keep the already integrated `auras-6/7/8` exact hashes.

**11:** do not regenerate pending v3 Auras 1–4. If transport remains pending, the next non-conflicting production batch is a bounded repair of `auras-5` plus a subset of `auras-9..12`, unless 15 changes ownership.

General motion/game-feel work remains paused because the phase is still `CATALOG_SPRINT`. No deployment action was taken.
