# Catalog Sprint — Lane 11 Auras

STATUS: **ALL 12 AURAS HAVE VERSIONED REPLACEMENTS — BATCH 1 REWORK / BATCHES 2–3 AWAITING INDEPENDENT REVIEW**

Branch: `screenshot-match-preproduction`  
Workstream: 11  
Phase: `CATALOG_SPRINT`  
Independent reviewer: **05**  
Canonical integrator: **08**  
Replit/Floot: **untouched**  
`main`: **untouched**  
Player state / live Aura logic: **unchanged**

## Reviewer-05 decisions consumed this pass

Reviewer 05 independently reviewed the exact `auras-1-v2.svg` through `auras-4-v2.svg` hashes from the shared staged-art artifact and returned **REWORK 4/4**. The concrete defects are still insufficient volumetric depth/material lighting despite better theme identity:

- `auras-1` Soft Sparkles — too sparse/flat; needs layered particle depth and emissive falloff.
- `auras-2` Cloud Puffs — repeated flat clouds; needs true puff volume, depth staggering and atmospheric overlap.
- `auras-3` Pixel Bits — improved glow but still a flat orbit; needs 3D/parallax and stronger Adventure Club signature.
- `auras-4` Berry Hearts — sticker-like hearts/cloud; needs richer heart material, volumetric cloud and layered glow/occlusion.

Those rejected replacement versions are preserved. They are **not** integration eligible.

## Batch 2 — Auras 5–8

These four versioned replacements remain repository-staged with exact readback and await Workstream 14’s shared card/detail render plus reviewer-05 disposition:

| ID | Item / theme / tier | Replacement hash |
| --- | --- | --- |
| `auras-5` | Garden Fireflies / Pixel Party / T2 | `16416de7ab535af16c59aa40e4d8f5a85a2958bf` |
| `auras-6` | Galaxy Orbit / Berry Blast / T2 | `ce4b155c7fb5469fde415ab9d744cab41027fe4d` |
| `auras-7` | Sunny Rays / Garden Glow / T3 | `c451e7479e142f1eca89cc5282b352c2d2ca2d4b` |
| `auras-8` | Aqua Bubbles / Galaxy Glow / T3 | `6884668fe721f3b26a562e11924237a32c656db6` |

No regeneration occurred while these candidates are pending review.

## Batch 3 — Auras 9–12 staged this pass

The remaining rejected legacy Aura family is now replaced with four new versioned candidates. Old originals remain untouched.

| ID | Item / theme / tier | Versioned path | Git blob | Bytes |
| --- | --- | --- | --- | ---: |
| `auras-9` | Art Confetti / Sunny Pop / T3 | `/assets/catalog/auras-9-v2.svg` | `f88be0c4b5fdb36df870ffa113c08f8ec668363c` | 3,973 |
| `auras-10` | Neon Trail / Aqua Wave / T4 | `/assets/catalog/auras-10-v2.svg` | `cbc767e6b29db880535d7fd99741debdadbcf6c5` | 2,798 |
| `auras-11` | Dream Aurora / Art Attack / T4 | `/assets/catalog/auras-11-v2.svg` | `ddb2c81b49db8e6ea6369c8f70cb720228feb73c` | 2,895 |
| `auras-12` | Luxe Starstorm / Star Luxe / T5 | `/assets/catalog/auras-12-v2.svg` | `93b33a82e9a5045e1e070ab7561bab08ce5ae947` | 3,205 |

All four repository paths were read back after creation and matched the exact Git blob hashes above. They retain the exact catalog names/themes/tiers from `gameModel.js`.

### Producer execution evidence

Each exact source was rasterized with CairoSVG 2.8.2 at **512×512** and **192×192** before staging, then the repository source was read back exactly. This is producer evidence only, not independent acceptance.

- **Art Confetti:** layered warm/cool ribbon vortex, foreground/background confetti pieces, sunlit spark stars, depth blur and cast-shadow treatment. 512 PNG SHA-256 `3e88b29052c274ff4568e0b0f6e0395f5d920290c00382edd24bb7956884f66f`; 192 PNG SHA-256 `f6ac9951d93768fa7fab4f9858669fbda8ef206f658110db6a487e82cccd3922`.
- **Neon Trail:** large perspective aqua trail arcs, luminous wave filaments, droplets and layered cyan/blue/violet depth. 512 `88908e512b86cb9fb5de58e480df4f8f758fa55797cf788f1e38ef09ef66edad`; 192 `ab05464085cc35818b8be507a2cf91f387edb9fa3d63dd246eebf70048a6bc45`.
- **Dream Aurora:** three layered painterly aurora curtains, mixed-pigment accents, highlight filaments, glow and asymmetric paint-like motes. 512 `b85d1c4d67ad2d7b41cd20d92cb38c8e6fe28e2079f337b8b3aa432501e0524f`; 192 `94e6dd6165fcba351612e34d8252a4f3a166bb01b9314bef8218aab56982e616`.
- **Luxe Starstorm:** multiple crossing perspective rings, luminous star crystals, orbiting jewel-light nodes, comet arcs and gold/violet/pink hero lighting. 512 `5c7748238d00729c44d963c28669c6233d3b65d3e2e99e06857e83eef2d8c683`; 192 `802db7440d4560e87266ad0da538729cb72af2ab469ec896037fb04ac6dacadc`.

Producer checks found no clipping at either size and all four retained a distinct card-scale silhouette. Reviewer 05 must still decide premium quality from the shared staged-art fixture.

## Current Aura lane state

- **Legacy Auras 1–12:** REWORK 12/12.
- **Replacement Auras 1–4 v2:** REWORK 4/4; second repair required.
- **Replacement Auras 5–8 v2:** staged/readback verified; shared render + reviewer-05 decision pending.
- **Replacement Auras 9–12 v2:** staged/readback verified this pass; shared render + reviewer-05 decision pending.
- **Qualified Aura ACCEPTs:** 0.
- **Canonical Aura promotions by Workstream 08:** 0 at this handoff.

## Handoff

**14:** use the existing staged-art fixture to render `auras-5-v2.svg` through `auras-12-v2.svg` at card/detail scale. Bind screenshots to the exact hashes above; do not create another harness.

**05:** do not integrate or inherit decisions for the rejected `auras-1..4` v2 hashes. Once shared evidence exists, independently `ACCEPT/REWORK/BLOCKED` the exact `auras-5..12` v2 hashes.

**08:** integrate only Aura replacement hashes with qualified reviewer-05 `ACCEPT` plus normal metadata/file/content checks. No Aura replacement is accepted yet.

**11:** all 12 Aura IDs now have preserved versioned replacement attempts. The next productive Aura work is a second repair of `auras-1..4` against reviewer-05’s exact dimensional/material defects, unless fresh reviewer decisions on Batches 2/3 preempt it.

General motion/game-feel work remains paused because the phase is still `CATALOG_SPRINT`.
