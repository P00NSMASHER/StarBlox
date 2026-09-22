# Catalog Sprint — Lane 09 Tops 11–12 v7 Repair Handoff

STATUS: **TOPS 11–12 V7 — AUTHORITATIVE RECEIPT PRESERVED / RAW-BLOB TRANSPORT NOW SUPPORTED / EXACT V7 PAYLOAD NOT AVAILABLE IN CURRENT RUNTIME**

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

Reviewer evidence: workflow `35687207417`, rerun job `106617438415`, artifact `10677595359`. Producer reconciliation also confirmed v6 does not contain valid JPEG bytes. Do not reuse either v6 hash.

## Authoritative v7 receipt — preserve exactly, do not regenerate

The bounded v7 repair was already created from source generation ID `183f523f-ccbb-4de7-ad41-185508d12295`. The following byte receipts are authoritative even though their exact payloads are not mounted in the current execution environment.

### Tops 11 — Cloud Jacket

- Identity: Tops / `Cloud Jacket` / Tier 4 / `Candy Core`.
- Planned versioned path: `/assets/catalog/tops-11-w09-v7.webp`.
- Exact format/dimensions/bytes: **WEBP / 600×600 / 22,824 bytes**.
- Exact SHA-256: `b021eb2773dbe902debf39216eeeca51c5f8db7b7ef137a177a46969bb27a2fa`.
- Expected Git blob on byte-exact transfer: `0641cd1563cd9f683d685231c52a28c9f66424be`.
- Decode at creation: **PASS**, `RIFF....WEBP`.
- Intended construction: padded Candy Core jacket with wrapped torso/sleeve baffles, seam compression, recessed hood depth, attached sleeve volume, textile response, zipper/pocket hardware and contact/form lighting.

### Tops 12 — Star Coat

- Identity: Tops / `Star Coat` / Tier 5 / `Adventure Club`.
- Planned versioned path: `/assets/catalog/tops-12-w09-v7.webp`.
- Exact format/dimensions/bytes: **WEBP / 600×600 / 30,026 bytes**.
- Exact SHA-256: `f0a76bcf14af0bc9d0ff9fb0ea5fb2980181a9873a1f034ab41f9633d8b1f94a`.
- Expected Git blob on byte-exact transfer: `9f13c65b0310a70be3fb1e6464baf22dabe75ce1`.
- Decode at creation: **PASS**, `RIFF....WEBP`.
- Intended construction: long Tier-5 Adventure Club outerwear with three-quarter torso depth, storm/yoke layering, quilted loft, woven drape/fold tension, belt/pockets/compass hardware, metal highlights and grounded shadow.

These assets are **not repository-staged, accepted or canonical**.

## New transfer evidence

A materially better transport primitive is now available: GitHub raw blob creation accepts caller-supplied base64 bytes, so exact binary persistence can be performed without UTF-8/text transcoding once the authoritative v7 payload is present.

The remaining dependency is no longer the GitHub transport primitive itself; it is the missing authoritative byte payload in this execution environment:

- Lookup of expected blob `0641cd1563cd9f683d685231c52a28c9f66424be` returned **not found**.
- Lookup of expected blob `9f13c65b0310a70be3fb1e6464baf22dabe75ce1` returned **not found**.
- Current runtime storage, conversation files and Library were checked for the exact v7 filenames/receipts; no checksum-matching 22,824-byte or 30,026-byte WEBP payload was available.
- A reconstruction search against the preserved source generation did not reproduce either authoritative SHA-256, so no approximation was accepted and no blob was attached.

### Exact next action

Restore/mount the original v7 WEBP bytes or have an approved helper deliver those exact byte streams. Then:

1. create each raw Git blob from the unmodified bytes;
2. require GitHub to return **exactly** `0641cd1563cd9f683d685231c52a28c9f66424be` for Tops 11 and `9f13c65b0310a70be3fb1e6464baf22dabe75ce1` for Tops 12 before attaching either path;
3. reread the versioned repository paths and verify SHA-256, exact byte count, WEBP signature and 600×600 decode;
4. run shared Store card/detail QA on those exact hashes;
5. hand only those exact rendered hashes to Reviewer 01.

Do **not** regenerate, recompress, approximately reconstruct, reuse v6, attach mismatched orphan blobs or self-approve. Reviewer 01 alone decides ACCEPT/REWORK; Workstream 08 alone canonical-wires an independently accepted exact hash.

## Scope freeze

Decor remains unopened until Tops 11–12 are independently dispositioned. Tops 1–10 and all historical Tops 11–12 versions are preserved. No Replit/Floot, `main`, deployment, paid settings/services, canonical runtime/manifest, gameplay, saves, economy, learning state, scene work or real-player data was changed.
