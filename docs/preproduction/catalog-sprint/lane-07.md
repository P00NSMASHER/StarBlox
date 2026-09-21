# Catalog Sprint Lane 07 — Tops 1–6 + Rugs 1–12

STATUS: **TOPS 1–6 ACCEPTED AND CANONICAL / RUGS 1–9 PREMIUM REPAIRS GENERATED BUT NOT REPOSITORY-STAGED / LEGACY RUGS 12/12 REWORK**

Branch: `screenshot-match-preproduction`  
Authority: `docs/preproduction/ART_VISUALS_SPRINT.json` + `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
`main`: **untouched**

## Reconciled current truth

Reviewer 01 independently ACCEPTed the exact Workstream-07 Tops 1–6 JPEG hashes, and current `catalog-art-manifest.json` version 15 now maps `tops-1..6` to those exact v2 paths. There is no remaining Tops production or Workstream-08 wiring backlog for these six versions. Preserve them unless a new exact-hash defect is evidenced.

| ID | Canonical path | Exact Git blob | State |
|---|---|---|---|
| `tops-1` | `public/assets/catalog/tops-1-w07-v2.jpg` | `5fd9544999694ec27c9b6247aaffeca1c0c7b484` | ACCEPTED + CANONICAL |
| `tops-2` | `public/assets/catalog/tops-2-w07-v2.jpg` | `428450782feb314535163b54d0405f9af8b7cd65` | ACCEPTED + CANONICAL |
| `tops-3` | `public/assets/catalog/tops-3-w07-v2.jpg` | `b4a834586feae169e102f43aeceaaaf11893ec11` | ACCEPTED + CANONICAL |
| `tops-4` | `public/assets/catalog/tops-4-w07-v2.jpg` | `26d03c5ba26c565e79e809f825db87c9be1dba21` | ACCEPTED + CANONICAL |
| `tops-5` | `public/assets/catalog/tops-5-w07-v2.jpg` | `78c5c89270be2f505f77d033f340c72cf0ff80a8` | ACCEPTED + CANONICAL |
| `tops-6` | `public/assets/catalog/tops-6-w07-v2.jpg` | `44d88aa84246f9d8a76b3f22c408653eb28176aa` | ACCEPTED + CANONICAL |

Reviewer 14 still controls the rug family disposition: all 12 legacy/current rug SVG hashes are REWORK because they read as upright badges/signs rather than floor textiles. New versions need grounded three-quarter floor perspective, visible pile/weave, real edge thickness, floor contact and item/theme-specific construction.

## Preserved Rug repair candidates

Rugs 1–6 remain the exact previously generated Firefly candidates and were not regenerated. This run produced only the next bounded Tier-3 batch, Rugs 7–9, then stopped further scaling pending repository-staged independent review.

| ID | Item / theme | Exact Firefly asset | Producer visual check | Repository state |
|---|---|---|---|---|
| `rugs-1` | Starter Mat / Aqua Wave | `urn:aaid:sc:US:a1e701b2-ec20-4699-8f3e-8b0fa45044f8` | Low woven aqua mat, bound edge, visible thickness/contact shadow. | GENERATED, NOT STAGED |
| `rugs-2` | Cloud Rug / Art Attack | `urn:aaid:sc:US:7059212c-2223-4a70-b84c-4989dc692661` | Plush tufted cloud rug with grounded edge/contact; theme strength still needs 14. | GENERATED, NOT STAGED |
| `rugs-3` | Pixel Grid Rug / Star Luxe | `urn:aaid:sc:US:1ad22d63-a119-431e-98e0-37431189dc3e` | Tufted pixel-grid textile, bound edge, violet/cyan fibers and restrained gold accents. | GENERATED, NOT STAGED |
| `rugs-4` | Heart Rug / Midnight Neon | `urn:aaid:sc:US:11a1ec20-e664-463c-9fb6-4efaef419723` | Thick heart-shaped tufting, midnight material and restrained cyan-magenta piping. | GENERATED, NOT STAGED |
| `rugs-5` | Leaf Rug / Candy Core | `urn:aaid:sc:US:c25cb861-5324-40aa-9fc5-b48167719c1d` | Leaf-shaped plush rug with pink/mint/cream tufted veins and bound edge. | GENERATED, NOT STAGED |
| `rugs-6` | Orbit Rug / Adventure Club | `urn:aaid:sc:US:0fe30bbd-402c-4695-9ae7-4f534358a411` | Round navy/teal rug, orbital stitched paths, gold planet/star motifs and floor contact. | GENERATED, NOT STAGED |
| `rugs-7` | Checker Rug / Cloud Pop | `urn:aaid:sc:US:3b6aec5a-8de8-4d2f-ad1f-3a5e342b0b1d` | Plush cloud-white/sky-blue checker construction with raised tufted squares, stitched edge/backing thickness and low floor camera. | GENERATED, NOT STAGED |
| `rugs-8` | Wave Rug / Pixel Party | `urn:aaid:sc:US:b1036a27-8e1c-49ba-97f0-93e7bcc133e2` | Asymmetrical wave silhouette, cyan/violet bands, stepped pixel accents, raised tufted ridges and grounded shadow. | GENERATED, NOT STAGED |
| `rugs-9` | Splash Rug / Berry Blast | `urn:aaid:sc:US:b00a0244-56e8-4393-939f-1c14209bc561` | Berry-splash floor silhouette with dense raspberry/pink/magenta pile, cream seed stitching, edge thickness and floor contact. | GENERATED, NOT STAGED |

All nine successful outputs are PNG at 1024×1024 and were visually inspected by the producer. They are not independently accepted.

## Transfer blocker and anti-scale gate

Workstream 07 still lacks a raw binary/base64 handle accepted by GitHub `create_blob`, so Rugs 1–9 remain **generated-only**. They are not branch-staged, not `READY_FOR_REVIEW`, and not eligible for Workstream 08 integration. Do not regenerate them to solve transport.

**Workstream 15 handoff:** use the already-proven Adobe-generation → Git recovery path on the exact nine GenAI asset IDs above, attach the bytes to versioned rug paths with normal non-force commits, read back exact path/blob/byte evidence, then hand the hashes to reviewer 14.

**Reviewer 14 handoff:** review the first newly staged repair micro-batch at actual card/detail scale. Legacy REWORK does not transfer to a new replacement hash.

**Workstream 07 anti-scale rule:** hold `rugs-10..12` generation until at least one current repair micro-batch has repository save/readback/render and independent reviewer-14 evidence, or Workstream 15 explicitly overrides after reconciling current evidence. If a new rug hash is REWORK, repair only that exact item/version before scaling further.

No runtime/canonical mapping was changed by Workstream 07 this run, so no new test/build claim is made. No player data, economy, learning content, Replit/Floot project or `main` branch was modified.
