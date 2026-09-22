# Catalog Sprint — Lane 09 Tops 11–12 v7 Repair Handoff

STATUS: **TOPS 11–12 V7 — GENERATED LOCAL / CLEAN 600×600 WEBP DERIVATIVES / EXACT REPOSITORY BYTE TRANSFER BLOCKED**

Branch: `screenshot-match-preproduction`  
Phase: `ART_AND_VISUALS_ONLY`  
Protocol: `DELIVERY_PROTOCOL_V2`  
Canonical integration owner: **08 only**  
Independent review owner: **01 only**  
Self-approval: **NO**

## Current reviewer evidence consumed

Reviewer 01’s latest exact-hash evidence supersedes the prior v5-only handoff. The current v6 candidates are **BLOCKED on evidence**, not visually rejected:

- `tops-11` Cloud Jacket — `/assets/catalog/tops-11-w09-v6.jpg`, blob `061a749472ad71e61732ac3a9629c42d54b4e580` — shared staged-art signature gate **FAIL**, no qualified v6 card/detail pixels.
- `tops-12` Star Coat — `/assets/catalog/tops-12-w09-v6.jpg`, blob `e9d462cb222c2ff20e220e237cb3890e1e6eb76c` — shared staged-art signature gate **FAIL**, no qualified v6 card/detail pixels.

Reviewer evidence: workflow `35687207417`, rerun job `106617438415`, artifact `10677595359`. The old v5 visual REWORK findings were not transferred to v6.

Producer reconciliation independently confirms the transport problem: exact GitHub readback for Tops 11 v6 does not begin with a valid JPEG `FF D8` signature despite its `.jpg` extension. Do not reuse either v6 hash.

## New bounded v7 repair package

A fresh original two-item generation was created, then each garment was isolated into a **separate item image** with no promotional text or board content. Source generation ID: `183f523f-ccbb-4de7-ad41-185508d12295`.

### Tops 11 — Cloud Jacket

- Exact identity retained: Tops / `Cloud Jacket` / Tier 4 / `Candy Core`.
- Planned versioned path: `/assets/catalog/tops-11-w09-v7.webp`.
- Clean local derivative: **WEBP / 600×600 / 22,824 bytes**.
- Local SHA-256: `b021eb2773dbe902debf39216eeeca51c5f8db7b7ef137a177a46969bb27a2fa`.
- Expected Git blob if those exact bytes are transferred unchanged: `0641cd1563cd9f683d685231c52a28c9f66424be`.
- Local decode/signature: **PASS**, `RIFF....WEBP`.
- Visual construction: deep padded torso and sleeve baffles, seam compression, recessed hood opening, attached sleeve volume, textile highlights/roughness, asymmetric Candy Core patches/hardware, zipper/pockets and grounded form light.

### Tops 12 — Star Coat

- Exact identity retained: Tops / `Star Coat` / Tier 5 / `Adventure Club`.
- Planned versioned path: `/assets/catalog/tops-12-w09-v7.webp`.
- Clean local derivative: **WEBP / 600×600 / 30,026 bytes**.
- Local SHA-256: `f0a76bcf14af0bc9d0ff9fb0ea5fb2980181a9873a1f034ab41f9633d8b1f94a`.
- Expected Git blob if those exact bytes are transferred unchanged: `9f13c65b0310a70be3fb1e6464baf22dabe75ce1`.
- Local decode/signature: **PASS**, `RIFF....WEBP`.
- Visual construction: unmistakable long outerwear silhouette, three-quarter torso depth, overlapping storm/yoke layers, padded/quilted loft, woven drape/fold tension, belt and utility pockets, compass/star hardware, metal-specific highlights and grounded cast/contact shadow.

These v7 derivatives are **GENERATED_LOCAL**, not staged, accepted or canonical.

## Exact blocker / transport handoff

The current GitHub binary blob writer is available, but the present binary-transfer path altered/truncated the raster payload before Git blob creation. Returned blob SHAs did not match the exact local expected hashes above. Those mismatched orphan blobs were deliberately **not attached to the branch**.

Do not recompress these images to a visibly lower quality simply to make transport easier. Workstream 15 or an approved transport helper should transfer the exact v7 derivative bytes to the planned paths without modification. Once bytes land, Workstream 09 must immediately:

1. reread each exact repository path;
2. verify file signature, Git blob, SHA-256, bytes and 600×600 dimensions;
3. run the shared staged-art Store-card/detail renderer on those new exact hashes;
4. hand only those exact rendered hashes to Reviewer 01.

Reviewer 01 alone decides ACCEPT/REWORK. Workstream 08 alone canonical-wires an independently accepted exact hash.

## Scope freeze

Decor remains unopened. Tops 1–10 and all historical Tops 11–12 versions are preserved. No Replit/Floot, `main`, deploy, paid settings/services, canonical runtime/manifest, gameplay, saves, economy, learning state, scene work or real-player data was changed.
