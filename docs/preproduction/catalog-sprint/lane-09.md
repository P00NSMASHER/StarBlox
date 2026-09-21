# Catalog Sprint — Lane 09 Room Decor + Tops Repair Batch

STATUS: **REVIEW-DRIVEN REPAIR ADVANCED — Tops 7–10 + Decor 1/2 generated in Adobe; repository staging blocked for second cycle and escalated to 15**

Branch: `screenshot-match-preproduction`  
Workstream: 09  
Phase: `CATALOG_SPRINT`  
Environment/background work: **paused**  
Canonical manifest/runtime: **not changed by this lane**  
Self-approval: **NO**

## Changed review inputs

Reviewer 01 now has exact current-hash decisions for all six Workstream-09 Tops candidates. Tops 1–6 from the other producer remain accepted; **tops-7 through tops-12 current W09 v2 hashes are all REWORK**. The newly reviewed exact hashes are:

- `tops-9` Art Smock — `232c5db97964d710489c4e32bc7c87d4a985efc1` — REWORK: still frontal/flat; lacks smock construction depth, fabric folds, pocket/tool volume and convincing material/contact light.
- `tops-10` Star Bomber — `233739b22d0f3395b02bc51f57fb1f36afc41993` — REWORK: needs real bomber volume, ribbed cuffs/waist, zipper/hardware depth, differentiated materials and controlled neon lighting.
- `tops-11` Cloud Jacket — `9e29094190a1c1867e94d44ef1c4134140447191` — REWORK: needs stronger body/sleeve depth, seams/hardware, plush-vs-shell separation and richer Tier-4 treatment.
- `tops-12` Star Coat — `1788cfb30ffd70d71bf182f01f137f9d241200fa` — REWORK: needs true coat thickness/folds, layered lapels/trim, premium hardware and Tier-5 Adventure Club construction/light.

Reviewer 14 remains unchanged at **Decor 1–12 REWORK**, exact current hashes, reason code `FLAT_PRODUCT_ICON`. The baseline Decor versions remain preserved until replacement bytes are repository-staged and independently re-reviewed.

## New bounded repair pilot — Tops 9–10

Two additional premium 1024×1024 PNG repairs were generated and inspected from actual pixels. This is intentionally a two-item pilot because the lane already has four earlier generated images waiting on binary staging; generating Tops 11/12 or more Decor before transport recovery would accumulate unshippable art.

| ID | Item | Tier / theme | Intended path | Stable Adobe GenAI asset | Stored bytes | Producer pixel finding |
| --- | --- | --- | --- | --- | ---: | --- |
| `tops-9` | Art Smock | T3 / Star Luxe | `/assets/catalog/tops-9-w09-v3.png` | `urn:aaid:sc:US:177bdebd-f68a-4742-8d51-e576d41570d1` | 1,111,663 | clear three-quarter smock/apron construction, rolled sleeve volume, deep tool pockets, fabric folds/stitching, restrained gold star hardware and grounded cast shadow |
| `tops-10` | Star Bomber | T4 / Midnight Neon | `/assets/catalog/tops-10-w09-v3.png` | `urn:aaid:sc:US:61864223-7124-4bf1-afc1-20e679aa4ec5` | 1,388,197 | true padded bomber body/sleeve volume, ribbed cuffs/waist, raised collar, zipper/pocket hardware, satin-vs-knit separation and controlled cyan/magenta rim/specular lighting |

Generation request IDs are retained in `lane-09.json`. These images are **GENERATED_ADOBE_STAGING_BLOCKED**, not STAGED and not READY_FOR_REVIEW.

## Existing generated batch preserved without regeneration

The prior four generated replacements remain stable and were not regenerated:

- `tops-7` Colorblock Hoodie → intended `/assets/catalog/tops-7-w09-v3.png`, Adobe asset `urn:aaid:sc:US:a146737a-008b-4662-8e45-07fdc29254ad`.
- `tops-8` Puffer Vest → intended `/assets/catalog/tops-8-w09-v3.png`, Adobe asset `urn:aaid:sc:US:a89505f7-417e-4449-b346-365f707a9618`.
- `decor-1` Book Crate → intended `/assets/catalog/decor-1-w09-v2.png`, Adobe asset `urn:aaid:sc:US:acf980d3-05f0-47bd-8949-55f729654a37`.
- `decor-2` Cloud Shelf → intended `/assets/catalog/decor-2-w09-v2.png`, Adobe asset `urn:aaid:sc:US:712c6b0d-d36b-482d-8d69-6fee92742ec7`.

All original/versioned SVG candidates remain in repository history and current branch paths; none was overwritten.

## Binary staging blocker — second cycle escalation

This is now the **second consecutive Workstream-09 cycle** with the same concrete delivery blocker. Authenticated Adobe presigned rendition/source URLs were successfully resolved for the prior four generated assets, but this runtime still cannot transfer the returned binary image bytes into GitHub `create_blob(base64)`. A direct container egress attempt to the Adobe short host also failed at DNS resolution.

Per Delivery Protocol V2 anti-stall rules, this is escalated to Workstream 15 rather than retried indefinitely. Workstream 15 already has a proven Adobe-generation → Git recovery path in this repository for other catalog lanes. It should recover the six stable generation URNs now recorded in `lane-09.json`, publish exact bytes to the intended versioned paths on the newest preproduction head using non-force commits, and verify exact readback. **Do not regenerate these six images.**

Until at least one blocked batch is repository-persisted, Workstream 09 will not generate Tops 11/12 or Decor 3+; this prevents status churn and an expanding queue of inaccessible artwork.

## Validation this pass

- **PASS** — latest `ART_VISUALS_SPRINT.json`, Delivery Protocol V2, branch head and current review shards read before work.
- **PASS** — exact Reviewer-01 current-hash REWORK decisions consumed for Tops 7–12.
- **PASS** — exact Reviewer-14 Decor 12/12 REWORK evidence retained.
- **PASS** — Tops 7/8 pending generated replacements preserved without regeneration.
- **PASS** — two new dimensional Tops 9/10 assets generated and actual pixels inspected.
- **PASS** — old repository versions preserved; no shared manifest/runtime or gameplay file edits.
- **BLOCKED** — generated PNG repository persistence/readback, second cycle.
- **NOT RUN** — full tests/build because no repository asset bytes or canonical runtime mappings changed in this pass.
- **PASS** — no Replit/Floot, `main`, deployment, paid settings, player data, saves, economy or learning changes.

## Handoff

**15 — second-cycle escalation:** recover and stage the six stable Adobe assets recorded in `lane-09.json`. Stage Batch 3 first (Tops 7/8 + Decor 1/2), then Batch 4 (Tops 9/10). Preserve exact bytes and versioned intended paths; no regeneration.

**01:** wait for exact Git hashes and card/detail renders before reviewing new Tops 7–10 replacements. Tops 11/12 current W09 v2 hashes remain REWORK and preserved; no new versions are generated yet because transport is blocked.

**14:** Decor 1/2 dimensional replacements remain generated but unstaged. Retain current REWORK decisions until exact new Git hashes exist. Decor 3–12 remain actionable REWORK but are intentionally paused behind the transport bottleneck.

**08:** nothing from this pass is eligible for canonical integration; no new replacement has repository readback plus independent exact-hash ACCEPT.

Environment/background work remains paused until the catalog gate passes. Replit/Floot were not used, and `main` was not touched.
