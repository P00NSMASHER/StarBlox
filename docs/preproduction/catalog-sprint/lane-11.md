# Catalog Sprint — Lane 11 Auras

STATUS: **REPAIR BATCHES 1–2 STAGED — AURAS 1–8 AWAITING INDEPENDENT REVIEW**

Branch: `screenshot-match-preproduction`  
Workstream: 11  
Phase: `CATALOG_SPRINT`  
Independent reviewer: **05**  
Canonical integrator: **08**  
Replit/Floot: **untouched**  
`main`: **untouched**  
Player state: **unchanged**

## Current review basis

Workstream 05 independently reviewed the original `auras-1..12` hashes and returned **REWORK 12/12**. The common defect is weak assigned-theme expression, insufficient card-scale contrast and overly flat/non-premium material and lighting treatment. Legacy decisions do **not** transfer to replacement hashes.

Batch 1 (`auras-1..4`) is already repository-staged and has qualified shared rendered evidence from the existing staged-art workflow: run `35654620624`, artifact `10663298893`, digest `sha256:f2c0d3d3aa251f5e1934017a7c61acf644e8876ab1e1a5b0c37e7f06ffb8e9db`. Workstream 05 must still make the independent exact-hash visual decision.

This pass reconciled the next four replacement files that were already created on the live branch but not yet reflected in Lane 11’s handoff. **No duplicate regeneration occurred.**

## Batch 1 — awaiting reviewer 05 decision

| ID | Item / theme / tier | Replacement | Git blob | Bytes |
| --- | --- | --- | --- | ---: |
| `auras-1` | Soft Sparkles / Midnight Neon / T1 | `/assets/catalog/auras-1-v2.svg` | `48639f1262052350660127bbc5d3d25de34d61e3` | 2,592 |
| `auras-2` | Cloud Puffs / Candy Core / T1 | `/assets/catalog/auras-2-v2.svg` | `c2be24c165f3e28995d5d2eb946dbdde983afe2a` | 2,536 |
| `auras-3` | Pixel Bits / Adventure Club / T1 | `/assets/catalog/auras-3-v2.svg` | `9b682148eb26898ec5f56ac11eac635e7c93c8fc` | 2,929 |
| `auras-4` | Berry Hearts / Cloud Pop / T2 | `/assets/catalog/auras-4-v2.svg` | `3059eae7ab68c125f1af1696305fdf5689131455` | 2,927 |

The shared artifact captured all four exact hashes at replacement card/detail scale. That is render evidence, not acceptance.

## Batch 2 — repository-staged and read back

| ID | Item / theme / tier | Rejected original | New versioned candidate | New Git blob | Bytes | Creation commit |
| --- | --- | --- | --- | --- | ---: | --- |
| `auras-5` | Garden Fireflies / Pixel Party / T2 | `537e3a60ee47a50e219ff4d165f0cf8fa7cf45f7` | `/assets/catalog/auras-5-v2.svg` | `16416de7ab535af16c59aa40e4d8f5a85a2958bf` | 5,102 | `68929b1d8cbb3b7997a23a7c2c1f6f62786646ab` |
| `auras-6` | Galaxy Orbit / Berry Blast / T2 | `12323f12b60b5b411cde8ad383d3238d78e40053` | `/assets/catalog/auras-6-v2.svg` | `ce4b155c7fb5469fde415ab9d744cab41027fe4d` | 5,030 | `8a9e0b6077184d2a684646bcc1fe0fe1517beaad` |
| `auras-7` | Sunny Rays / Garden Glow / T3 | `82678bb86daa67c81faa82ca6613b698133a5ebd` | `/assets/catalog/auras-7-v2.svg` | `c451e7479e142f1eca89cc5282b352c2d2ca2d4b` | 4,889 | `a212e64ba540711ddbf5d88adbbb46c71b952764` |
| `auras-8` | Aqua Bubbles / Galaxy Glow / T3 | `9cf59e4329b180645ccf6a12057654a126f10cdd` | `/assets/catalog/auras-8-v2.svg` | `6884668fe721f3b26a562e11924237a32c656db6` | 4,778 | `09d0501b349ea3f3ea0c347291530a792c4e81ac` |

All four paths were fetched from the current branch and returned the exact Git blob hashes above. Each remains a **512×512 SVG**. This satisfies repository staging/readback evidence; it does not substitute for independent pixel review.

### Producer evidence for Batch 2

- **Garden Fireflies:** dark dimensional garden field, vine/leaf depth, multiple luminous firefly nodes and Pixel Party accents; materially different from the rejected flat original.
- **Galaxy Orbit:** crossed perspective orbit rings, berry/cosmic planet volumes, comet trails and a star field create a distinct spatial structure.
- **Sunny Rays:** layered foliage, dimensional gold rays, a sculpted sun/star core and orbiting light motes give Tier 3 a clearer Garden Glow identity.
- **Aqua Bubbles:** multiple reflective translucent bubble volumes surround a galaxy-filled central sphere with rim gradients, glow and depth shadow.

These observations come from the actual repository source bytes and producer inspection only. Workstream 14’s shared staged-art fixture must produce card/detail screenshots for Batch 2 before Workstream 05 makes the independent visual disposition.

## Remaining Aura repair work

The originals for `auras-9..12` remain rejected and preserved:

- `auras-9` — `df6ff86bdb73909ae6e41a505861aba8bfce2f5a`
- `auras-10` — `be285375c688a518b491b09ff047920cc6e23fe5`
- `auras-11` — `3a80508473e5364899b1276256ea26c72f9efce0`
- `auras-12` — `afa2b684e811302c2889e068b16e730eb58e6d27`

Unless reviewer 05 returns a concrete defect on a replacement hash first, the next bounded production batch is `auras-9..12`.

## Current checks

- **PASS** — Workstream 11 still owns Aura production/repair.
- **PASS** — original Aura hashes are independently `REWORK 12/12`.
- **PASS** — Batch 1 replacement files are staged and have shared hash-bound render evidence.
- **PASS** — Batch 2 replacement paths exist on the current branch and exact Git blob readback matches 4/4.
- **PASS** — all eight replacement files preserve the rejected originals under separate versioned paths.
- **PENDING** — reviewer 05 independent exact-hash decision for Batch 1.
- **PENDING** — Workstream 14 card/detail fixture render for Batch 2, then reviewer 05 exact-hash decision.
- **PENDING** — Workstream 08 canonical wiring only after qualified `ACCEPT`.
- **UNCHANGED** — manifest/runtime, IDs, prices, ownership/player state and live Aura logic.

## Handoff

**14:** render `auras-5-v2.svg` through `auras-8-v2.svg` with the existing staged-art fixture. Record card/detail screenshots against the exact hashes above; do not create a new harness.

**05:** immediately review `auras-1-v2.svg` through `auras-4-v2.svg` from artifact `10663298893`. After Batch 2 render evidence exists, independently `ACCEPT/REWORK/BLOCKED` `auras-5-v2.svg` through `auras-8-v2.svg`. Do not inherit the legacy decisions.

**08:** consume any accepted replacement hash immediately after normal metadata/file/content checks. Do not wait for all twelve Auras.

**11:** preserve Batches 1 and 2 while they are pending independent review. Continue with `auras-9..12` next unless a concrete replacement defect preempts that batch.

No general motion/game-feel work resumed because the phase remains `CATALOG_SPRINT`.
