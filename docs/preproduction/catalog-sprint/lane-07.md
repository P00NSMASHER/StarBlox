# Catalog Sprint Lane 07 — Rugs + Assigned Tops Repairs

STATUS: **TOPS 1–6 HAVE QUALIFIED PIXEL EVIDENCE / RUGS 1–3 NEW FIRE FLY REPAIRS GENERATED BUT NOT REPOSITORY-STAGED / RUGS LEGACY 12/12 REWORK**

Branch: `screenshot-match-preproduction`  
Delivery authority: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
`main`: **untouched**

## Material progress this run

### Tops 1–6: render evidence blocker cleared

The six exact Workstream-07 replacement JPEGs were already branch-stored and read back, so they were **not regenerated or re-uploaded**.

The shared staged-art QA workflow has now completed successfully for these exact hashes:

- workflow run: `35654620624` — **SUCCESS**;
- workflow head: `acbc6035da9d57bc88043604caa5ec0b6352398e`;
- artifact: `10663298893` (`catalog-staged-art-review`);
- artifact digest: `sha256:f2c0d3d3aa251f5e1934017a7c61acf644e8876ab1e1a5b0c37e7f06ffb8e9db`;
- `tops-1..6`: **HTTP 200, screenshots captured, no render errors**;
- rendered evidence is under `staged-replacements/staged-replacements-contact-sheet.png` plus six exact-hash detail PNGs.

Reviewer 01 therefore no longer lacks qualified pixel evidence for these replacements. The exact review targets are:

| ID | Versioned candidate | Git blob | Artifact detail |
|---|---|---|---|
| `tops-1` | `public/assets/catalog/tops-1-w07-v2.jpg` | `5fd9544999694ec27c9b6247aaffeca1c0c7b484` | `staged-replacements/detail/tops-1-5fd95449.png` |
| `tops-2` | `public/assets/catalog/tops-2-w07-v2.jpg` | `428450782feb314535163b54d0405f9af8b7cd65` | `staged-replacements/detail/tops-2-42845078.png` |
| `tops-3` | `public/assets/catalog/tops-3-w07-v2.jpg` | `b4a834586feae169e102f43aeceaaaf11893ec11` | `staged-replacements/detail/tops-3-b4a83458.png` |
| `tops-4` | `public/assets/catalog/tops-4-w07-v2.jpg` | `26d03c5ba26c565e79e809f825db87c9be1dba21` | `staged-replacements/detail/tops-4-26d03c5b.png` |
| `tops-5` | `public/assets/catalog/tops-5-w07-v2.jpg` | `78c5c89270be2f505f77d033f340c72cf0ff80a8` | `staged-replacements/detail/tops-5-78c5c892.png` |
| `tops-6` | `public/assets/catalog/tops-6-w07-v2.jpg` | `44d88aa84246f9d8a76b3f22c408653eb28176aa` | `staged-replacements/detail/tops-6-44d88aa8.png` |

These remain **producer candidates only**. Reviewer 01 must now record exact-hash ACCEPT / REWORK / BLOCKED. Workstream 08 alone may wire an accepted replacement.

## Rugs: first replacement micro-batch generated

Reviewer 14 has already dispositioned every legacy `rugs-1..12` hash **REWORK**. The family defect remains clear: the current art reads as upright floating badges rather than floor textiles. Replacements need a floor-plane three-quarter perspective, pile/weave, edge thickness, real floor contact and item-specific textile construction.

This run generated and visually inspected the first **3-item** replacement micro-batch in Adobe Firefly using the real metadata and those exact review defects:

| ID | Item / theme | Firefly asset | Generation | Producer visual check | Repository state |
|---|---|---|---|---|---|
| `rugs-1` | Starter Mat / Aqua Wave | `urn:aaid:sc:US:a1e701b2-ec20-4699-8f3e-8b0fa45044f8` | PNG, 1024×1024 | PASS — low floor mat, woven aqua wave relief, stitched/bound edge, visible thickness and contact shadow | **GENERATED, NOT STAGED** |
| `rugs-2` | Cloud Rug / Art Attack | `urn:aaid:sc:US:7059212c-2223-4a70-b84c-4989dc692661` | PNG, 1024×1024 | PASS_DIRECTIONAL — unmistakably floor-oriented plush tufted cloud with stitched edge/contact shadow; Art Attack accents intentionally restrained for Tier 1 | **GENERATED, NOT STAGED** |
| `rugs-3` | Pixel Grid Rug / Star Luxe | `urn:aaid:sc:US:1ad22d63-a119-431e-98e0-37431189dc3e` | PNG, 1024×1024 | PASS — floor-plane tufted pixel-grid textile, thick bound edge, violet/cyan fibers, restrained gold star accents and contact shadow | **GENERATED, NOT STAGED** |

### Exact blocker

The images were successfully generated, indexed and visually inspected, but this Workstream-07 runtime did **not** receive a binary file/base64 handle from the Adobe generation/rendition calls that could be passed into GitHub `create_blob`. Per protocol, no repository path/hash/byte count is invented and these three are **not READY_FOR_REVIEW** yet.

Do **not regenerate** these images merely to solve transfer. Command Center 15 has already demonstrated an Adobe-generation → exact Git-blob extraction route on other assets. The next transfer action is to preserve the exact three GenAI asset IDs above through that proven path, attach them to versioned `rugs-1..3` candidate paths with a normal non-force commit, read back exact Git blobs/bytes, then hand them to reviewer 14.

## Preserved rejected rug versions

The prior SVGs remain untouched and available for comparison. Reviewer 14's result is **REWORK 12/12, ACCEPT 0, BLOCKED 0**. No current rug hash is eligible for canonical wiring.

Next production after the transfer step is solved: continue `rugs-4..6` as the next bounded batch, unless a newly staged rug replacement returns REWORK first.

## Handoff

**Reviewer 01:** review `tops-1..6` immediately from artifact `10663298893`. Qualified exact-hash pixel evidence now exists; do not continue treating these six as evidence-blocked.

**Reviewer 14:** legacy Rugs remain REWORK 12/12. New `rugs-1..3` Firefly candidates are generated but are not yours to review until they are attached to versioned repository paths and exact readback is recorded.

**Workstream 08:** no self-approval occurred. Do not wire any Lane-07 item until its assigned independent reviewer ACCEPTs the exact current replacement hash.

**Command Center 15:** Tops review-pixel dependency is cleared. The remaining Lane-07 transfer blocker is narrow: preserve the exact three Firefly rug asset bytes into Git and return repository path/blob/byte readback without regenerating them.

No canonical manifest/runtime mapping, player data, economy, learning content, Replit/Floot project or `main` branch was modified.
