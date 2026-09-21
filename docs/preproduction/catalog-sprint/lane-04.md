# Catalog Sprint Lane 04 — Lighting / Shoes Repair

STATUS: **LIGHTING 1–4 INDEPENDENTLY ACCEPTED; LIGHTING 5–12 GENERATED REMOTE; SHOES 1–4 GENERATED REMOTE; CANONICAL WIRING UNCHANGED**

Repository: `P00NSMASHER/StarBlox`  
Branch: `screenshot-match-preproduction`  
Active phase: `CATALOG_SPRINT`  
Primary assignment: `lighting-1` through `lighting-12`  
Secondary repair assignment: `shoes-1` through `shoes-6`  
Lighting independent reviewer: **Workstream 14**  
Shoes independent reviewer: **Workstream 02**  
Canonical manifest/runtime owner: **Workstream 08**  
Replit/Floot/main/player data: **untouched**

## Material progress this pass

Reviewer 14 has now independently reviewed the exact repository-staged Lighting v2 replacements. `lighting-1` through `lighting-4` are **ACCEPT 4/4** by exact Git blob hash. This closes their visual-review blocker and makes those exact versions eligible for Workstream 08's metadata/file/content checks and incremental canonical integration. Lane 04 did not edit the canonical manifest/runtime and did not self-approve anything.

Review evidence: Workstream-14 review blob `f3f20ddb9d2104aec998e70711584133b4d5e490`; workflow run `35656393329`; artifact `10665735307`; digest `sha256:ad8d2da6f5553eb922616956515b85a16c89d80b34574e6679dfd6716c6f3233`.

| ID | Versioned path | Git blob SHA | Bytes | Independent state |
|---|---|---|---:|---|
| `lighting-1` | `public/assets/catalog/lighting-1-v2.jpg` | `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` | 21,735 | **ACCEPT** |
| `lighting-2` | `public/assets/catalog/lighting-2-v2.jpg` | `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3` | 26,239 | **ACCEPT** |
| `lighting-3` | `public/assets/catalog/lighting-3-v2.jpg` | `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` | 27,378 | **ACCEPT** |
| `lighting-4` | `public/assets/catalog/lighting-4-v2.jpg` | `7975e490a9fb97574f03081acf9fc871c22224f3` | 21,757 | **ACCEPT** |

Attachment/readback remains PASS 4/4 from commit `f1f8492182e51358dda8e106644361feea5781f1`.

## Lighting 5–12 — preserve exact generated assets, do not regenerate

The dimensional Firefly repairs remain preserved by stable GenAI asset ID and producer pixel inspection. Their legacy hashes remain REWORK; the new generated versions require repository staging and a fresh exact-hash Workstream-14 review before any integration.

| ID | Item / theme | Firefly GenAI asset | Producer evidence | State |
|---|---|---|---|---|
| `lighting-5` | Vine Light / Galaxy Glow | `urn:aaid:sc:US:a7777709-a50b-40e8-987a-dfaef58bfb75` | Sculptural bronze vine, layered translucent leaves, emissive nodes, physical base/cast shadow. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-6` | Planet Lamp / Sunny Pop | `urn:aaid:sc:US:42d0edcf-6e79-4035-91e8-26514ee0b7d4` | Dimensional glowing globe with separated orbit rings and physical metal support. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-7` | Sun Lamp / Aqua Wave | `urn:aaid:sc:US:d98ee54e-0ca5-45fd-933a-df8a4d3600e2` | Translucent aqua sun form, chrome support and internal warm glow. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-8` | Bubble Lamp / Art Attack | `urn:aaid:sc:US:32cfde85-8990-4b1f-ab34-9127985e7d7f` | Refractive overlapping glass bubbles with physical stand and painted internal color. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-9` | Color Lamp / Star Luxe | `urn:aaid:sc:US:15f7fe15-5a46-4b69-9c9d-3ad89404271e` | Beveled prism/crystal shade, thick facets, dispersion and pedestal. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-10` | Neon Strip Tower / Midnight Neon | `urn:aaid:sc:US:5bdc1e60-cba6-4e2c-b80a-8742d968472b` | Deep dimensional chassis, inset cyan/magenta neon and floor spill. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-11` | Aurora Light / Candy Core | `urn:aaid:sc:US:a9b8f6e7-ca6f-4132-8b62-3f77070dceb5` | Thick translucent aurora ribbons around a physical base with emissive core. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-12` | Crystal Chandelier / Adventure Club | `urn:aaid:sc:US:0c826f3c-c2d5-4da4-ac5a-37a9bbddd0b4` | Layered antique-gold fixture, faceted crystals, warm emitters and high-tier suspension hierarchy. | GENERATED_REMOTE_UPLOAD_PENDING |

The current Adobe connector can resolve and visually inspect these assets, but this run still cannot expose their raw image bytes as base64 accepted by GitHub `create_blob`. Direct container fetch is unavailable. Therefore no repository path/hash has been invented. Coordination should reuse the already-proven Adobe→Git byte bridge from a context that can expose the exact bytes.

## Shoes 1–4 — first bounded secondary-repair batch generated

Lighting is now partially review-cleared but Lighting 5–12 are externally byte-import blocked. To avoid idling, Lane 04 started the assigned Shoes repair queue exactly as directed. Reviewer 02's preserved review (`adaecbc6fd1f534bd9055c2292bcb7776c27bdce`) marks Shoes 1–6 REWORK because the legacy family is flat/icon-like, weak in sole/panel/lace/material depth, and often expresses theme only through palette.

A four-item 1024×1024 premium Firefly batch was generated and visually inspected against those defects. These are **producer candidates only**, not staged and not approved.

| ID | Item / tier / theme | Firefly GenAI asset | Producer pixel finding | State |
|---|---|---|---|---|
| `shoes-1` | Sneakers / T1 / Aqua Wave | `urn:aaid:sc:US:4f905a5b-73a9-4338-881f-ed50f5b1d16a` | Three-quarter pair with thick layered soles, real laces/eyelets, stitched aqua/pearl panels and dimensional wave accents. | GENERATED_REMOTE_UPLOAD_PENDING |
| `shoes-2` | Slip-Ons / T1 / Art Attack | `urn:aaid:sc:US:0c4d62d9-c5d2-4e8e-9aea-fcb08b5acfbb` | Tangible canvas slip-ons with elastic gussets, stitched sole depth and dimensional colorful art details. | GENERATED_REMOTE_UPLOAD_PENDING |
| `shoes-3` | High-Tops / T1 / Star Luxe | `urn:aaid:sc:US:68ea78e2-c7d7-4196-82bb-d3feb682d707` | Tall three-quarter high-tops with padded collar, real laces/eyelets, panel seams, sole volume and restrained gold star hardware. | GENERATED_REMOTE_UPLOAD_PENDING |
| `shoes-4` | Bow Shoes / T2 / Midnight Neon | `urn:aaid:sc:US:01f92b75-fb85-403d-9822-d51a83e5d83a` | Structured dark shoes with dimensional satin bows, thick soles and embedded cyan/magenta luminous piping with real floor spill. | GENERATED_REMOTE_UPLOAD_PENDING |

Exact game metadata was preserved: names, IDs, tiers, themes, prices (`30`, `45`, `65`, `85`) and unlock requirements remain unchanged. No Store runtime or economy code was touched.

## Current blockers

1. **Lighting 5–12 byte staging:** generated and visually inspected, but raw bytes are not exposed through the available Adobe connector in this run. Do not regenerate; import the exact listed GenAI assets through the proven bridge, then route their current hashes to reviewer 14.
2. **Shoes 1–4 byte staging:** same connector boundary. Do not regenerate; stage the exact listed GenAI assets and route current hashes to reviewer 02.

This is not a global GitHub binary capability issue; Lighting 1–4 already proved repository binary attachment/readback works once bytes are available.

## Handoff

**08:** `lighting-1..4` v2 exact hashes are independently ACCEPTed and may be incrementally integrated after your normal metadata/file/content checks. No other Lane-04 candidate is eligible yet.

**14:** Lighting 1–4 replacement review is complete. Review Lighting 5–12 only after the exact generated bytes above are staged at versioned paths; legacy REWORK never transfers to a new hash.

**02:** Shoes 1–4 now have premium remote-generated replacements. Independently judge them only after those exact bytes are staged and rendered through the shared fixture.

**15:** Lighting 1–4 review blocker is closed. Use/reassign the proven Adobe-byte extraction bridge to attach the exact Lighting 5–12 and Shoes 1–4 GenAI assets. Do not regenerate them.

**04 next pass:** do not regenerate Lighting or Shoes 1–4. React to newly staged hashes/reviewer decisions first. If byte staging remains external and no Lighting defect is actionable, generate the remaining assigned Shoes 5–6 as the next bounded batch or take an explicit reassignment from 15.

No Replit/Floot action, no `main` merge, no deployment, no canonical manifest/runtime edit, no Store code edit, and no player-data change occurred.
