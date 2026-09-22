# Workstream 12 — Accessory Art

Status: **HEADWEAR 1–4 ACCEPTED / HEADWEAR 5–8 GENERATED / BYTE TRANSFER BLOCKED**  
Branch: `screenshot-match-preproduction` only  
Producer: **12** · Headwear reviewer: **01** · Canonical writer: **08** · Coordinator: **15**

## Preserved accepted work

Reviewer 01 independently ACCEPTED the exact Headwear 1–4 replacements. Preserve these hashes and do not regenerate or self-review them:

- `headwear-1` `4d4424962a49f5145422723b625778d6649a4b26`
- `headwear-2` `595c8fe9182f4aecd5355856f19947c7c83daa11`
- `headwear-3` `86db079b85360dc64e669aeca53cba874176c693`
- `headwear-4` `4257b4a959153fba985fa2a97720c379b6d63e33`

Workstream 08 owns their canonical integration. Workstream 12 makes no canonical claim.

## Active bounded pilot — Headwear 5–8

Before generation, the current legacy hashes remained reviewer-01 **REWORK**, and no newer versioned Headwear 5–8 candidate was staged. The actual stored Store reference was viewed again this cycle and used as the visual target: dimensional toy-fashion product imagery, clear construction/material depth, lilac/pink studio depth, warm/cool lighting and card-readable silhouettes.

| ID | Item | Tier | Theme | New premium replacement | Planned repository path | State |
| --- | --- | ---: | --- | --- | --- | --- |
| `headwear-5` | Flower Crown | 2 | Pixel Party | fabric band + layered textile flowers/leaves + cyan/magenta/gold pixel-gem centers | `public/assets/catalog/headwear-5-w12-v2.png` | generated, 600×600 derivative visually PASS, transfer blocked |
| `headwear-6` | Gamer Headset | 2 | Berry Blast | thick padded band/cushions + molded earcups + sliders/hinges + boom mic | `public/assets/catalog/headwear-6-w12-v2.png` | generated, 600×600 derivative visually PASS, transfer blocked |
| `headwear-7` | Bucket Hat | 3 | Garden Glow | soft canvas crown + seams/eyelet + thick quilted brim + embroidered vine/blossom band | `public/assets/catalog/headwear-7-w12-v2.png` | generated, 600×600 derivative visually PASS, transfer blocked |
| `headwear-8` | Star Clips | 3 | Galaxy Glow | layered translucent stars + visible metal spring/barrette hardware + faceted gems/reflections | `public/assets/catalog/headwear-8-w12-v2.png` | generated, 600×600 derivative visually PASS, transfer blocked |

All four source generations are preserved as 1024×1024 Adobe Firefly assets; all four 600×600 PNG derivatives were separately previewed after resize and passed producer framing/identity/material checks. These are **producer checks only**. Reviewer 01 must judge the exact repository hashes after staging.

## Provenance

| ID | Firefly asset ID | Generation request | 600×600 resize request |
| --- | --- | --- | --- |
| `headwear-5` | `urn:aaid:sc:US:77f50381-8f34-4611-924d-703009f479cc` | `6c022fa5-5dd7-4140-a94e-18209a0f3357` | `fc134853-70a7-4ccc-b1d6-c2020bb57514` |
| `headwear-6` | `urn:aaid:sc:US:1163131b-1ea4-4759-9efe-98e5c88bf240` | `0491e505-01d7-4dad-abc8-242cbfe858dd` | `9e17dc76-0612-4128-b62f-77c1ef835c59` |
| `headwear-7` | `urn:aaid:sc:US:834210c4-c55e-4a9e-b9d0-bc3bbdb0f483` | `5af1bdfd-721b-4e77-b6a7-fb62f08def85` | `440045e8-7935-4de1-b478-7eb0dbdddea3` |
| `headwear-8` | `urn:aaid:sc:US:176bd0de-812f-4d61-9ba5-d26e1ab12774` | `a589b20f-3ff5-4d05-aff2-4f554f8b770d` | `4b2d8b3f-0414-4ea3-a61c-03ab11cc1483` |

The structured JSON record contains the source/derivative output URLs, stable legacy hashes, exact Store tier/theme/price/star requirements, and producer observations.

## Exact blocker and escalation

`W12-ADOBE-BYTE-TRANSFER` still prevents delivery. This cycle added new transport evidence rather than repeating the old audit: all four new Firefly assets were rediscovered with stable Adobe asset IDs and sizes, and Adobe presigned resolution succeeded, but the resulting download/preview links still resolve through `at.adobe.com`. The execution container cannot resolve either `at.adobe.com` or `photoshop-api.adobe.io`, so it cannot obtain raw bytes for GitHub `create_blob`. Both available public-browser transfer connections require interactive user input in this non-interactive run. Workstream 12 did not create or alter a shared importer/workflow because its explicit write scope remains owned candidate paths plus this lane evidence.

The missing capability is one coordination-owned Adobe-output → raw-byte bridge. Workstream 15 should recover the **existing** four 600×600 derivative bytes and either attach them at the planned versioned paths or expose the bytes to Workstream 12 for direct Git blob creation. **Do not regenerate Headwear 5–8.** Once exact paths/hashes/bytes read back from GitHub, reviewer 01 can disposition this pilot. Do not start Headwear 9–12 or switch families before that disposition.

## Verification / freeze

No runtime, learning, economy, save, canonical mapping, player data, Replit, Floot, `main` or deployment change was made. No tests/build were rerun because no runtime/canonical/test bytes changed. Headwear 5–8 are **not READY_FOR_REVIEW** yet because repository bytes and exact Git hashes do not exist. The authoritative structured record is `docs/preproduction/catalog-sprint/lane-12.json`.
