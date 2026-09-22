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
- A newly available run-specific GitHub Actions artifact-download path was tested against staged-art run `35688873663`, artifact `10677797142`. The artifact downloaded successfully but contains only prior v5 rendered evidence (`tops-11-43a850ec.png`, `tops-12-73339e6c.png`, report/summary) and **no v7 WEBP payload**. This recovery path therefore did not justify a branch attachment.

### Exact next action

Restore/mount the original v7 WEBP bytes or have an approved helper deliver those exact byte streams. Then:

1. create each raw Git blob from the unmodified bytes;
2. require GitHub to return **exactly** `0641cd1563cd9f683d685231c52a28c9f66424be` for Tops 11 and `9f13c65b0310a70be3fb1e6464baf22dabe75ce1` for Tops 12 before attaching either path;
3. reread the versioned repository paths and verify SHA-256, exact byte count, WEBP signature and 600×600 decode;
4. run shared Store card/detail QA on those exact hashes;
5. hand only those exact rendered hashes to Reviewer 01.

Do **not** regenerate, recompress, approximately reconstruct, reuse v6, attach mismatched orphan blobs or self-approve. Reviewer 01 alone decides ACCEPT/REWORK; Workstream 08 alone canonical-wires an independently accepted exact hash.

## Reference-grounded Decor 3–4 specification — PLANNING ONLY

This is a non-production art-planning increment prepared while the Tops gate remains closed. No Decor candidate was generated, staged, reviewed or wired.

Reviewer 14’s latest family finding now preserves `decor-1` and `decor-2` as **ACCEPT** and leaves `decor-3..12` **REWORK**. The accepted first two items are frozen. The first future repair pilot is therefore `decor-3` and `decor-4`, but generation remains gated until Tops 11–12 have valid repository hashes, clean card/detail pixels and Reviewer 01 disposition.

### Actual Store reference consumed

The stored original Store screenshot was recovered from the verified reference-intake artifact and inspected at full resolution:

- `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`
- 1448×1086, 771,971 bytes
- SHA-256 `4e21df57778c17ce2c10958b61cb8a5c14f8bccdc703f8f0f6b57de8aa36829d`

The target is not flat icon art. The reference uses a premium toy-like boutique presentation: soft pink/lilac architecture, warm peach key light, glossy fixture highlights, dimensional fabric/object shading, clean silhouettes, restrained negative space, distinct material response and believable contact shadows. Future Decor art should inherit that physical polish while preserving each item’s own theme.

### Shared future card/detail contract

- Camera: consistent three-quarter product view with a slight downward pitch, exposing front plus a meaningful side/top plane.
- Framing: one physical object/group with breathing room; silhouette and function must remain legible at 220×220 card scale and support 600×600 detail review.
- Light: soft warm upper-left key, gentle cool/pink ambient fill, material-specific specular response, grounded contact/cast shadow.
- Background: simple boutique-compatible lilac/pink neutral field with soft depth only; no promotional sheet, text, UI chrome, logos, characters or unrelated props.
- Material rule: hard surfaces need bevel thickness/specular rolloff; textiles need seams, nap/compression and soft highlights; metal/glass need restrained reflections. Do not solve depth with heavier outlines or extra SVG decoration.

### `decor-3` — Arcade Mini

Exact Store metadata from the live game model: Room Decor / `Arcade Mini` / Tier 1 / `Adventure Club` / 94 coins / 0 stars. Current legacy candidate: `/assets/catalog/decor-3.svg`, blob `4fc2f591915f53b249956c20c50693ad22e3a1bb`. Planned next version stem only: `/assets/catalog/decor-3-w09-v3`.

Future visual construction: a compact functional tabletop arcade cabinet, unmistakably readable as an arcade machine. Use an Adventure Club navy/teal shell with cream/brass accents; a beveled cabinet body; inset glass screen with an original abstract star-navigation game; separate joystick/button deck; recessed speaker/coin-detail area; visible side thickness; rubber feet; and a soft grounded shadow. Keep Tier 1 attractive through proportion and believable materials rather than excessive ornament. No third-party game imagery, logos or text.

### `decor-4` — Plush Stack

Exact Store metadata from the live game model: Room Decor / `Plush Stack` / Tier 2 / `Cloud Pop` / 123 coins / 0 stars. Current legacy candidate: `/assets/catalog/decor-4.svg`, blob `cb4bc4cfca9bdd4764905fdf94aa8291605f1ce0`. Planned next version stem only: `/assets/catalog/decor-4-w09-v3`.

Future visual construction: a physically stacked trio of original Cloud Pop plush decor pieces with distinct silhouettes rather than recolored blobs—a broad cloud cushion base, rounded sleepy plush center and smaller star/cloud accent top. Show textile nap, stitched panel seams, embroidered detail, edge piping, compression where pieces contact, subtle squash at the base and soft self-shadowing between layers. Tier 2 should feel richer than Starter through tactile construction while staying cozy and uncluttered. No branded-character likenesses or emoji treatment.

## Scope freeze

Decor **production** remains unopened until Tops 11–12 are independently dispositioned; the Decor 3–4 section above is specification only. Tops 1–10, accepted Decor 1–2 and all historical Tops 11–12 versions are preserved. No Replit/Floot, `main`, deployment, paid settings/services, canonical runtime/manifest, gameplay, saves, economy, learning state, scene implementation or real-player data was changed.
