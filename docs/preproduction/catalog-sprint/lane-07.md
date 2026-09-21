# Catalog Sprint Lane 07 — Rugs + Assigned Tops Repairs

STATUS: **TOPS 1–6 INDEPENDENTLY ACCEPTED / READY FOR WORKSTREAM 08 / RUGS 1–6 PREMIUM REPAIRS GENERATED BUT NOT REPOSITORY-STAGED / LEGACY RUGS 12/12 REWORK**

Branch: `screenshot-match-preproduction`  
Delivery authority: `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot: **untouched**  
`main`: **untouched**

## Material progress this run

### Tops 1–6 — independent acceptance complete

The six exact Workstream-07 Firefly replacement JPEGs were already stored on the branch and were **not regenerated or re-uploaded**. Reviewer 01 has now independently reviewed the qualified hash-bound pixels from staged-art artifact `10663298893` and recorded **ACCEPT 6 / REWORK 0 / BLOCKED 0** for these exact hashes:

| ID | Candidate | Exact Git blob | Reviewer 01 |
|---|---|---|---|
| `tops-1` | `public/assets/catalog/tops-1-w07-v2.jpg` | `5fd9544999694ec27c9b6247aaffeca1c0c7b484` | **ACCEPT** |
| `tops-2` | `public/assets/catalog/tops-2-w07-v2.jpg` | `428450782feb314535163b54d0405f9af8b7cd65` | **ACCEPT** |
| `tops-3` | `public/assets/catalog/tops-3-w07-v2.jpg` | `b4a834586feae169e102f43aeceaaaf11893ec11` | **ACCEPT** |
| `tops-4` | `public/assets/catalog/tops-4-w07-v2.jpg` | `26d03c5ba26c565e79e809f825db87c9be1dba21` | **ACCEPT** |
| `tops-5` | `public/assets/catalog/tops-5-w07-v2.jpg` | `78c5c89270be2f505f77d033f340c72cf0ff80a8` | **ACCEPT** |
| `tops-6` | `public/assets/catalog/tops-6-w07-v2.jpg` | `44d88aa84246f9d8a76b3f22c408653eb28176aa` | **ACCEPT** |

Reviewer 01's finding is that these six replacements materially fix the legacy flat-vector garment defect through dimensional construction, fabric/fold depth, hardware where applicable and controlled lighting while preserving item identity and starter/Tier-2 restraint.

**Handoff to Workstream 08:** these six exact hashes are now eligible for canonical-integration evaluation. Workstream 08 still owns metadata/file/content validation and all manifest/runtime wiring. Workstream 07 has no reason to regenerate or repair Tops 1–6 unless a later exact-hash regression is evidenced.

## Rugs — legacy family remains REWORK 12/12

Reviewer 14's exact finding still controls the rug repair scope: every legacy `rugs-1..12` image reads too much like an upright badge/sign rather than a floor textile. Replacements therefore require floor-plane three-quarter perspective, visible pile/weave, edge thickness, actual floor contact and item/theme-specific textile construction. Higher tiers must progress through materials and construction rather than glow-only ornament.

The rejected legacy SVG hashes remain preserved for comparison and rollback. No legacy rug hash is eligible for canonical promotion.

## Rugs 1–3 — preserved generated repairs, still awaiting binary attachment

The previously generated Firefly replacements were re-located and visually inspected again this run; they were **not regenerated**:

| ID | Item / theme | Exact Firefly asset | Producer visual check |
|---|---|---|---|
| `rugs-1` | Starter Mat / Aqua Wave | `urn:aaid:sc:US:a1e701b2-ec20-4699-8f3e-8b0fa45044f8` | Low woven floor mat, aqua wave relief, stitched/bound edge, thickness and contact shadow. |
| `rugs-2` | Cloud Rug / Art Attack | `urn:aaid:sc:US:7059212c-2223-4a70-b84c-4989dc692661` | Plush tufted cloud floor rug with stitched edge and floor contact; independent review must still judge theme strength. |
| `rugs-3` | Pixel Grid Rug / Star Luxe | `urn:aaid:sc:US:1ad22d63-a119-431e-98e0-37431189dc3e` | Tufted pixel-grid floor textile with thick bound edge, violet/cyan fibers, restrained gold accents and contact shadow. |

All three remain **GENERATED, NOT STAGED** because there is still no Workstream-07 binary/base64 handle suitable for GitHub `create_blob`.

## Rugs 4–6 — new bounded premium repair batch generated

Using reviewer 14's item-level REWORK findings, this run generated and visually inspected the next three replacements:

| ID | Item / theme | Exact Firefly asset | Generation request | Producer visual check | Repository state |
|---|---|---|---|---|---|
| `rugs-4` | Heart Rug / Midnight Neon | `urn:aaid:sc:US:11a1ec20-e664-463c-9fb6-4efaef419723` | `b837d13d-68e0-4987-b2fd-f9406c09a9d9` | Heart-shaped plush floor rug, thick tufting, midnight purple/navy material, restrained cyan-magenta luminous piping, three-quarter floor depth and contact shadow. | **GENERATED, NOT STAGED** |
| `rugs-5` | Leaf Rug / Candy Core | `urn:aaid:sc:US:c25cb861-5324-40aa-9fc5-b48167719c1d` | `5de1e5e1-1532-44ce-9de1-7fbf825f573c` | Leaf-shaped plush floor rug, pink/mint/cream tufted vein construction, visible bound edge and floor contact. | **GENERATED, NOT STAGED** |
| `rugs-6` | Orbit Rug / Adventure Club | `urn:aaid:sc:US:0fe30bbd-402c-4695-9ae7-4f534358a411` | `8df89ac5-3567-4949-9617-b0c01b7f4dad` | Round navy/teal rug with thick tufted edge, orbital stitched paths, gold planet/star motifs, clear floor-plane depth and contact. | **GENERATED, NOT STAGED** |

Each successful output is PNG at 1024×1024. One initial `rugs-5` generation request was blocked before producing an output; it was retried once with neutral product-render wording. Only the successful exact asset above is retained as the production candidate.

## Exact transfer blocker — escalated after second consecutive cycle

Workstream 07 can search, resolve and visually inspect the exact Firefly assets, but still does not receive a direct binary/base64 handle that can be passed to GitHub `create_blob`. Because this is the second consecutive cycle with the same narrow transfer blocker, it is now explicitly escalated to Workstream 15 rather than repeated as a passive wait.

**Do not regenerate any of Rugs 1–6 to solve transport.** Command Center 15 should use the already-proven Adobe-generation → Git-blob extraction path on these exact six GenAI asset IDs, attach the bytes to versioned `rugs-1..6` repository paths with a normal non-force commit, read back exact path/blob/byte evidence, and hand the hashes to reviewer 14.

Until that happens, these six are **not STAGED, not READY_FOR_REVIEW and not eligible for Workstream 08 integration**.

## Next actions / handoff

**Workstream 08:** consume reviewer-01 ACCEPT for the exact Tops 1–6 replacement hashes now; perform normal metadata/file/content checks and wire only if those checks pass.

**Workstream 15:** resolve the repeated binary transfer blocker for the six exact Rug GenAI assets. Do not regenerate them.

**Reviewer 14:** once Rug replacement bytes are attached to versioned repository paths and shared staged-art rendering exists, independently disposition each exact replacement hash. Legacy Rug REWORK decisions do not automatically transfer to a new hash.

**Workstream 07:** after the transfer handoff, continue `rugs-7..9` as the next bounded repair batch unless a newly staged `rugs-1..6` replacement returns REWORK first.

No runtime/canonical mapping changed in this Workstream-07 pass, so no new build/test claim is made. No canonical manifest/runtime, player data, economy, learning content, Replit/Floot project or `main` branch was modified.
