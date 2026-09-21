# Catalog Sprint Lane 04 — Lighting

STATUS: **REWORK IN PROGRESS — Lighting 1–4 staged for fresh review; Lighting 5–8 newly generated; Lighting 9–12 remain**

Repository: `P00NSMASHER/StarBlox`  
Branch: `screenshot-match-preproduction`  
Active phase: `CATALOG_SPRINT`  
Primary assignment: `lighting-1` through `lighting-12`  
Secondary assignment after Lighting: `shoes-1` through `shoes-6`  
Independent Lighting reviewer: **Workstream 14**  
Canonical manifest/runtime owner: **Workstream 08**  
Replit/Floot: **untouched**  
`main`: **untouched**

## Why the legacy Lighting set is being replaced

Workstream 14 independently rendered the legacy Lighting family and recorded **12/12 REWORK**. The items are recognizable, but the old SVGs are too flat/front-facing for the premium dimensional screenshot target: shallow construction and materials, weak emitted-light depth, inconsistent theme expression and insufficient tier progression. No legacy Lighting hash has an independent ACCEPT.

Lane 04 therefore repaired only reviewed defects and preserved every old version. It did not touch `catalog-art-manifest.json`, `src/catalogArtRuntime.js`, Store runtime/CSS, item IDs, prices, unlocks, saves, ownership, rewards or player data.

## Lighting 1–4 — binary-transfer blocker closed

The exact previously generated Firefly bytes were already preserved as immutable Git blobs by coordination. This run attached those same bytes to versioned paths on the latest branch using a normal non-force tree/commit/ref update; **nothing was regenerated**.

Attachment commit: `f1f8492182e51358dda8e106644361feea5781f1`

| ID | Versioned path | Git blob SHA | Bytes | State |
|---|---|---|---:|---|
| `lighting-1` | `public/assets/catalog/lighting-1-v2.jpg` | `9d8aa142fa53f06dbad9ce59e9c8d34c1096ddc3` | 21,735 | READY_FOR_REVIEW |
| `lighting-2` | `public/assets/catalog/lighting-2-v2.jpg` | `8c10fe689d6d7e398e85b24eb1ca1323cee07ea3` | 26,239 | READY_FOR_REVIEW |
| `lighting-3` | `public/assets/catalog/lighting-3-v2.jpg` | `fc21ddf5a608ee393410ff9682cf2ef87a56c46d` | 27,378 | READY_FOR_REVIEW |
| `lighting-4` | `public/assets/catalog/lighting-4-v2.jpg` | `7975e490a9fb97574f03081acf9fc871c22224f3` | 21,757 | READY_FOR_REVIEW |

Exact tree/path/blob readback is **PASS 4/4**. The branch subsequently advanced through unrelated reviewer/documentation commits, and these files remain on the descendant branch. They are producer candidates, not accepted art. Reviewer 14 must render these exact new hashes before Workstream 08 may wire any of them.

## Lighting 5–8 — next dimensional batch generated

A new bounded four-item Firefly batch was created from the exact current metadata and Workstream-14 defect notes. Each output was visually inspected at approximately 800px during this run. Producer inspection confirms that each is materially more dimensional than its rejected legacy SVG, but **producer inspection is not independent acceptance**.

| ID | Item / theme | Firefly GenAI asset | Producer pixel finding | State |
|---|---|---|---|---|
| `lighting-5` | Vine Light / Galaxy Glow | `urn:aaid:sc:US:a7777709-a50b-40e8-987a-dfaef58bfb75` | Sculptural bronze vine, layered translucent leaves, many star-orb emitters and clear contact/cast shadow. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-6` | Planet Lamp / Sunny Pop | `urn:aaid:sc:US:42d0edcf-6e79-4035-91e8-26514ee0b7d4` | Dimensional glowing planet globe, physically separated rings, warm metal support/base and strong Sunny Pop light. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-7` | Sun Lamp / Aqua Wave | `urn:aaid:sc:US:d98ee54e-0ca5-45fd-933a-df8a4d3600e2` | Translucent aqua glass center/rays, chrome stem/base and warm internal glow visibly express dimensional Aqua Wave construction. | GENERATED_REMOTE_UPLOAD_PENDING |
| `lighting-8` | Bubble Lamp / Art Attack | `urn:aaid:sc:US:32cfde85-8990-4b1f-ab34-9127985e7d7f` | Overlapping refractive glass bubbles, chrome stand and vivid paint-like internal swirls address the old flat-circle treatment. | GENERATED_REMOTE_UPLOAD_PENDING |

Generation outputs are 1024×1024 PNGs in Adobe. The recorded Firefly container sizes are 1,055,809; 883,836; 1,135,259; and 1,107,905 bytes respectively.

### Current transfer limitation for this new batch

The existing Adobe connector rendered all four generated images successfully and preserved them by exact GenAI asset ID. In this Lane 04 run, however, the raw binary extraction needed for GitHub `create_blob(base64)` was not exposed through the image-preview result, and direct container retrieval of the Adobe host was unavailable. Therefore Lighting 5–8 are **not repository-staged** and no Git hash/path is fabricated for them.

This is narrower than the prior blocker: the project-level Adobe→GitHub bridge is already proven, and Lighting 1–4 demonstrate it works. Coordination should reuse that supported byte-extraction bridge for the four exact Firefly IDs above. **Do not regenerate Lighting 5–8.**

## Remaining Lighting work

`lighting-9` Color Lamp / Star Luxe, `lighting-10` Neon Strip Tower / Midnight Neon, `lighting-11` Aurora Light / Candy Core and `lighting-12` Crystal Chandelier / Adventure Club remain on their rejected legacy hashes and are the next bounded generation batch unless reviewer 14 sends a higher-priority replacement REWORK.

Shoes 1–6 remain the secondary Lane 04 repair assignment only after Lighting is completed or blocked on review/import. This run did not start shoe work because Lighting still has actionable work.

## Handoff

**14:** immediately render and independently review `lighting-1-v2.jpg` through `lighting-4-v2.jpg` by the exact Git hashes above. The legacy REWORK decisions do not automatically apply to these replacements.

**08:** do not wire producer-only candidates. Lighting 1–4 can become eligible only after reviewer-14 exact-hash ACCEPT. Lighting 5–8 are still generated-remote, not staged.

**15:** the old Lighting 1–4 upload blocker is closed. Reuse the already-proven Adobe/Firefly byte-extraction bridge for the exact Lighting 5–8 GenAI IDs above, attach them to versioned branch paths, and verify exact readback; do not regenerate them.

**04 next pass:** preserve Lighting 5–8, generate/stage Lighting 9–12 in a bounded batch if import capacity is available, or repair any current replacement hash that reviewer 14 rejects. Do not resume Store redesign while `phase=CATALOG_SPRINT`.

No Replit/Floot action, no `main` merge, no deployment, no canonical manifest/runtime edit, and no player-data change occurred.
