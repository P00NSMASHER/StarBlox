# Catalog Sprint Lane 07 — Rugs + Assigned Tops Repairs

STATUS: **RUGS REWORK 12/12 / TOPS 1–6 STAGED FOR REVIEWER 01**

Branch: `screenshot-match-preproduction`  
Delivery authority: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
`main`: **untouched**

## Material progress this run

The six already-generated Adobe Firefly Tops repairs were **not regenerated**. Command Center 15 supplied the exact immutable Git blobs from the supported rendition path. Lane 07 attached those exact blobs to preproduction with a normal non-force commit, then read the resulting catalog Git tree back and verified every versioned path, blob SHA and byte size.

Staging commit: `da070b301e8ce57ca10d44bcb4ccd2078cfe4690`

| ID | Versioned candidate | Format | Git blob | Git bytes | State |
|---|---|---|---|---:|---|
| `tops-1` | `public/assets/catalog/tops-1-w07-v2.jpg` | image/jpeg | `5fd9544999694ec27c9b6247aaffeca1c0c7b484` | 22,951 | READY_FOR_REVIEW |
| `tops-2` | `public/assets/catalog/tops-2-w07-v2.jpg` | image/jpeg | `428450782feb314535163b54d0405f9af8b7cd65` | 27,448 | READY_FOR_REVIEW |
| `tops-3` | `public/assets/catalog/tops-3-w07-v2.jpg` | image/jpeg | `b4a834586feae169e102f43aeceaaaf11893ec11` | 22,414 | READY_FOR_REVIEW |
| `tops-4` | `public/assets/catalog/tops-4-w07-v2.jpg` | image/jpeg | `26d03c5ba26c565e79e809f825db87c9be1dba21` | 31,644 | READY_FOR_REVIEW |
| `tops-5` | `public/assets/catalog/tops-5-w07-v2.jpg` | image/jpeg | `78c5c89270be2f505f77d033f340c72cf0ff80a8` | 21,739 | READY_FOR_REVIEW |
| `tops-6` | `public/assets/catalog/tops-6-w07-v2.jpg` | image/jpeg | `44d88aa84246f9d8a76b3f22c408653eb28176aa` | 31,238 | READY_FOR_REVIEW |

The source generations were 1024×1024 item-specific Firefly outputs created against the exact Store metadata and reviewer-01 defects. Repository byte sizes above are the authoritative Git readback sizes for the extracted JPEG blobs, not the larger Adobe rendition sizes recorded in the earlier generation handoff. All six Git blobs are distinct.

These six are **producer candidates only**. Reviewer 01 must independently inspect the exact current hashes at Store-card/detail scale. Workstream 08 alone may wire an independently accepted replacement. The rejected legacy SVG mappings remain intact until that happens.

## Rug review is no longer pending

Reviewer 14 inspected the exact current `rugs-1..12` hashes from actual rendered pixels. Artifact `10662541654` contains `rugs/rugs-contact-sheet.png` and per-item detail screenshots. Result: **REWORK 12/12, ACCEPT 0, BLOCKED 0**.

The family-level defect is consistent and actionable: every current rug reads as an upright floating badge/sign rather than a floor textile. Replacement art must show a floor plane / three-quarter perspective, believable pile or weave, visible edge thickness, floor contact and item-specific textile construction. Higher tiers must become richer through materials/construction—not merely glow or extra ornament.

The current reviewed hashes are preserved as rejected comparison versions; they were not regenerated just for activity.

| ID | Item | Current reviewed hash | Reviewer 14 disposition |
|---|---|---|---|
| `rugs-1` | Starter Mat | `30965be773947cbff94d1499ddf2d8e2a121c54c` | REWORK |
| `rugs-2` | Cloud Rug | `3ab198d01c381f12b20a8764327b8ee2df50f9c8` | REWORK |
| `rugs-3` | Pixel Grid Rug | `9008fbd26088d82946b1a84330ef4135a844e8ed` | REWORK |
| `rugs-4` | Heart Rug | `094e35add74786eae5c371eeb6e98a01af3f91a4` | REWORK |
| `rugs-5` | Leaf Rug | `444fc7ee4adae44ed23879e72f2b69f3f17a9624` | REWORK |
| `rugs-6` | Orbit Rug | `3fad9495eb41588d635dfbe0a96854b2bf1cd309` | REWORK |
| `rugs-7` | Checker Rug | `4bf9d6ad3cb2c6a8fa625d5084a0eade817d2f45` | REWORK |
| `rugs-8` | Wave Rug | `38d97147ca1ace14db22c8a408fb206776cc979d` | REWORK |
| `rugs-9` | Splash Rug | `3b6f3de23334a43a85b99165280fba82fd8c3431` | REWORK |
| `rugs-10` | Neon Grid Rug | `2a12b492144b9de33e454c18cbc1d0d4e64c28f5` | REWORK |
| `rugs-11` | Dream Cloud Rug | `1c09f5503a2f42d550b3abe60182ae6c54cdda9d` | REWORK |
| `rugs-12` | Luxe Star Rug | `718227d632a1a85fa3386f1d9ef1e407a7e5a115` | REWORK |

## Next bounded production action

Unless Command Center 15 records another exact assignment first, Lane 07 should repair **`rugs-1..6`** as the next 2–6 item batch. Keep real names/themes/tiers, but render them unmistakably as premium floor textiles in perspective:

- `rugs-1` Starter Mat — simple woven Aqua Wave mat, restrained Tier 1 detail.
- `rugs-2` Cloud Rug — plush/tufted cloud with handmade Art Attack accents.
- `rugs-3` Pixel Grid Rug — floor-oriented grid with actual pile/border and restrained Star Luxe yarn/trim.
- `rugs-4` Heart Rug — plush heart with stitched edge depth and Midnight Neon luminous-thread/piping treatment.
- `rugs-5` Leaf Rug — shaped textile with pile/edge fibers and Candy Core material depth.
- `rugs-6` Orbit Rug — foreshortened round tufted rug with stitched orbital pattern and Adventure Club exploration cues.

Any replacement must use a versioned path, preserve the rejected SVG for comparison, be repository-stored/read back, and return to reviewer 14 as a new exact hash. No self-approval.

## Handoff

**Reviewer 01:** inspect the six exact Tops JPEG hashes in the first table. Record exact-hash ACCEPT / REWORK / BLOCKED; do not infer acceptance from the producer handoff.

**Reviewer 14:** current Rugs review is reconciled as REWORK 12/12 from artifact `10662541654`; no current rug hash is accepted.

**Workstream 08:** do not wire any of these six Tops replacements or any rug replacement until the assigned independent reviewer ACCEPTs the exact current replacement hash.

**Command Center 15:** the Tops binary-transfer blocker is cleared. Six versioned Tops JPEGs are repository-staged and verified by exact Git-tree readback. The Rug review blocker is also cleared in the opposite direction: the old 12 rug hashes are conclusively REWORK and now have an actionable repair specification.

No canonical manifest/runtime mapping, player state, economy, learning content, Replit/Floot project or `main` branch was modified.
