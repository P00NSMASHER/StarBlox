# Catalog Sprint Lane 07 — Tops 1–6 + Rugs 1–12

STATUS: **TOPS 1–6 ACCEPTED/CANONICAL AND CURRENT HASHES VERIFIED / RUGS 1–4 EXACT FIRELY REPAIRS REPOSITORY-STAGED + READY FOR REVIEWER 14 / RUGS 5–9 PRESERVED GENERATED / RUGS 10–12 HELD**

Branch: `screenshot-match-preproduction`  
Authority: `docs/preproduction/ART_VISUALS_SPRINT.json` + `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
`main`: **untouched**

## Tops 1–6 — preserve exact accepted versions

Reviewer 01 independently ACCEPTed Tops 1–6 and manifest v15 already maps these exact v2 JPEGs. This run directly re-read all six current branch files before any possible regeneration/upload and confirmed their Git blob hashes are unchanged. **No Top was regenerated or re-uploaded.**

| ID | Canonical path | Current Git blob |
|---|---|---|
| `tops-1` | `public/assets/catalog/tops-1-w07-v2.jpg` | `5fd9544999694ec27c9b6247aaffeca1c0c7b484` |
| `tops-2` | `public/assets/catalog/tops-2-w07-v2.jpg` | `428450782feb314535163b54d0405f9af8b7cd65` |
| `tops-3` | `public/assets/catalog/tops-3-w07-v2.jpg` | `b4a834586feae169e102f43aeceaaaf11893ec11` |
| `tops-4` | `public/assets/catalog/tops-4-w07-v2.jpg` | `26d03c5ba26c565e79e809f825db87c9be1dba21` |
| `tops-5` | `public/assets/catalog/tops-5-w07-v2.jpg` | `78c5c89270be2f505f77d033f340c72cf0ff80a8` |
| `tops-6` | `public/assets/catalog/tops-6-w07-v2.jpg` | `44d88aa84246f9d8a76b3f22c408653eb28176aa` |

Preserve these exact versions unless a new exact-hash defect is evidenced.

## Rugs 1–4 — exact-byte recovery pilot now staged

Reviewer 14's existing rug verdict remains **REWORK 12/12 for the legacy SVG hashes** because those read as upright badges/signs rather than grounded floor textiles. That legacy verdict does **not** transfer automatically to new hashes.

The exact previously generated Firefly repairs for Rugs 1–4 have now been recovered through the supported Adobe HTTPS source/rendition path with **zero new generations**. Original 1024×1024 PNG generation bytes are preserved under `docs/preproduction/catalog-sprint/recovered-originals/rugs-1-4-20260921/`; versioned 600×600 JPEG candidates are in `public/assets/catalog/` and have direct branch readback.

| ID | Item / theme | Versioned candidate | Exact Git blob | Candidate bytes | Preserved original |
|---|---|---|---|---:|---|
| `rugs-1` | Starter Mat / Aqua Wave | `public/assets/catalog/rugs-1-w07-v2.jpg` | `5e00d1456fa21af74de75e583c69de48c9f2ecd2` | 24,968 | PNG 1024×1024, 766,159 bytes, blob `b4b8897398e9cb7a2483f386f0093f4f26f4929d` |
| `rugs-2` | Cloud Rug / Art Attack | `public/assets/catalog/rugs-2-w07-v2.jpg` | `578caf5cc81998d6c7563082892e468fc9186eec` | 28,082 | PNG 1024×1024, 768,074 bytes, blob `f5209599c1f9f7f920cc0c4004742f2031411151` |
| `rugs-3` | Pixel Grid Rug / Star Luxe | `public/assets/catalog/rugs-3-w07-v2.jpg` | `0c3b62a84182cd8e7fc3b8dc57f9b1015e54e920` | 40,252 | PNG 1024×1024, 890,634 bytes, blob `eaa3fde63e478c35b4f1c925f8401327b09be84c` |
| `rugs-4` | Heart Rug / Midnight Neon | `public/assets/catalog/rugs-4-w07-v2.jpg` | `d2c1a712dc530cec13ce72100657714900134ce2` | 51,129 | PNG 1024×1024, 952,680 bytes, blob `b9e90c8d267e2766a5649ffb2411f8cb994994df` |

Producer/recovery checks: metadata **PASS 4/4**; candidate/original exact-byte readback **PASS 8/8**; JPEG decode **PASS 4/4**. Recovery evidence artifact: workflow run `35670969723`, artifact `10671335458` (`rugs-1-4-recovery-evidence`, 44,894,361 bytes, digest `sha256:0959864c21c125b4395b7c6c9f6bbdfbba88c4dffa5c113e072c0e63a82f5177`).

Regression/build evidence on tested source `179d94f8af462cd0bbf9cff09a861bd952bbde54`: `npm test` **PASS — 22 files / 99 tests**; `npm run build` **PASS**; exact Rugs 1–4 card/detail render matching **PASS 4/4**. The shared staged-art runner still returned nonzero because of unrelated Lane-03 `desks-2..4` WebP decode failures; that unrelated defect is not represented as a global render pass. A final evidence-file push also lost a non-force race to concurrent branch writes, but the review artifact and the staged rug bytes were successfully preserved.

### Exact handoff to reviewer 14

These remain **producer candidates, not ACCEPTed or canonical**. Reviewer 14 should independently inspect these exact path/hash pairs at actual card/detail scale:

- `rugs-1` — `public/assets/catalog/rugs-1-w07-v2.jpg` — `5e00d1456fa21af74de75e583c69de48c9f2ecd2`
- `rugs-2` — `public/assets/catalog/rugs-2-w07-v2.jpg` — `578caf5cc81998d6c7563082892e468fc9186eec`
- `rugs-3` — `public/assets/catalog/rugs-3-w07-v2.jpg` — `0c3b62a84182cd8e7fc3b8dc57f9b1015e54e920`
- `rugs-4` — `public/assets/catalog/rugs-4-w07-v2.jpg` — `d2c1a712dc530cec13ce72100657714900134ce2`

Workstream 08 must not wire them until reviewer 14 records exact-hash ACCEPT.

## Rugs 5–9 — preserve, do not duplicate generation

The following exact Firefly outputs remain generated/preserved but are not yet repository-staged. Do not regenerate them to solve transport:

| ID | Item / theme | Exact Firefly asset | State |
|---|---|---|---|
| `rugs-5` | Leaf Rug / Candy Core | `urn:aaid:sc:US:c25cb861-5324-40aa-9fc5-b48167719c1d` | GENERATED + PRESERVED, NOT STAGED |
| `rugs-6` | Orbit Rug / Adventure Club | `urn:aaid:sc:US:0fe30bbd-402c-4695-9ae7-4f534358a411` | GENERATED + PRESERVED, NOT STAGED |
| `rugs-7` | Checker Rug / Cloud Pop | `urn:aaid:sc:US:3b6aec5a-8de8-4d2f-ad1f-3a5e342b0b1d` | GENERATED + PRESERVED, NOT STAGED |
| `rugs-8` | Wave Rug / Pixel Party | `urn:aaid:sc:US:b1036a27-8e1c-49ba-97f0-93e7bcc133e2` | GENERATED + PRESERVED, NOT STAGED |
| `rugs-9` | Splash Rug / Berry Blast | `urn:aaid:sc:US:b00a0244-56e8-4393-939f-1c14209bc561` | GENERATED + PRESERVED, NOT STAGED |

## Gate / handoff

`rugs-10..12` remain held. The pilot now has real repository save/readback and scoped rendering, but DELIVERY_PROTOCOL_V2 still requires independent reviewer-14 exact-hash judgment before scaling the recipe further. If reviewer 14 marks a new v2 hash REWORK, repair only that exact ID/version. If the pilot is accepted, continue with supported exact-byte recovery for preserved Rugs 5–9 before generating Rugs 10–12.

No canonical rug manifest/runtime wiring, player data, economy, learning content, Replit/Floot project, deployment, paid settings, or `main` branch was changed by Workstream 07.
