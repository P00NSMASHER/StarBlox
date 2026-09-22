# Catalog Sprint — Lane 09 Tops 11–12 v6 Repair Handoff

STATUS: **TOPS 11–12 V6 — REPOSITORY-STAGED, EXACT READBACK PASS, SHARED PIXEL QA PENDING**

Branch: `screenshot-match-preproduction`  
Phase: `ART_AND_VISUALS_ONLY`  
Protocol: `DELIVERY_PROTOCOL_V2`  
Canonical integration owner: **08 only**  
Independent review owner: **01 only**  
Self-approval: **NO**

## Reviewer input consumed

Reviewer 01 independently REWORKED both current v5 hashes after actual card/detail inspection. These were visual-quality failures, not decode failures:

- `tops-11` Cloud Jacket — `/assets/catalog/tops-11-w09-v5.svg`, blob `43a850ecdc0b7e8861870f7c277f2544f6c87405` — **REWORK** because card-scale volume/material response remained too flat for Tier 4 despite improved silhouette/hardware.
- `tops-12` Star Coat — `/assets/catalog/tops-12-w09-v5.svg`, blob `73339e6c9e472283f481ff18b1e6ba821856f617` — **REWORK** because the long-coat read and Tier-5 physical/material depth remained below accepted Tops 7–10.

All v5 and older candidates remain preserved. No rejected hash was reused.

## New exact v6 candidates

### Tops 11 — Cloud Jacket

- Identity preserved: `Cloud Jacket`, Tops, Tier 4, `Candy Core`.
- New path: `/assets/catalog/tops-11-w09-v6.jpg`.
- Exact Git blob: `061a749472ad71e61732ac3a9629c42d54b4e580`.
- SHA-256: `ed9c8f99d904a3d980684f2f67f94b52eb6906c14a058c79794de3226694d2db`.
- Format/dimensions/bytes: **JPEG / 600×600 / 49,502 bytes**.
- Construction target realized: visibly inflated torso/sleeve chambers, seam compression, recessed padded hood, attached sleeve volume, glossy-shell versus knit separation, zipper/pocket hardware, controlled warm/cool form lighting and grounded shadow.
- Provenance: original StarBlox image-generation repair exported as a clean repository JPEG; no copied screenshot pixels, third-party brands/characters, or Roblox/Brookhaven art.

### Tops 12 — Star Coat

- Identity preserved: `Star Coat`, Tops, Tier 5, `Adventure Club`.
- New path: `/assets/catalog/tops-12-w09-v6.jpg`.
- Exact Git blob: `e9d462cb222c2ff20e220e237cb3890e1e6eb76c`.
- SHA-256: `c14905d41ba51e10cc2a96dabdfdb5183aff563b2d738a5031a774bb6b79db26`.
- Format/dimensions/bytes: **JPEG / 600×600 / 61,020 bytes**.
- Construction target realized: unmistakable long outerwear silhouette, deep three-quarter torso, overlapping storm/yoke layers, padded hood, layered woven panels with fold/drape tension, belt and utility pockets, compass/star hardware, distinct metal highlights and cast/contact shadow.
- Provenance: original StarBlox image-generation repair exported as a clean repository JPEG; no copied screenshot pixels, third-party brands/characters, or Roblox/Brookhaven art.

## Repository persistence/readback

Asset commit: `0e59daad65faf9f4af6a017b62fa193b4db851e4`.

Both 600×600 JPEGs were written as Git blobs and read back from `screenshot-match-preproduction` at their exact versioned paths. Repository blob identity matches the values above. The local export/decode/dimension checks pass.

The first shared QA push after the asset commit ran before lane-09 was pointed at v6, so run `35686953352` correctly rendered the previous v5 rows. That evidence is **not** transferred to v6. This lane update makes the two v6 paths authoritative inputs for the next shared staged-art card/detail capture.

## Required next evidence + handoff

**Shared staged-art QA:** render the exact v6 hashes at Store-card and detail scale, recording natural dimensions, HTTP/decode status, screenshot paths and per-item errors.

**01:** after that exact v6 pixel evidence exists, independently issue ACCEPT or REWORK for `061a7494...` and `e9d462cb...`. Do not transfer the v5 verdicts.

**08:** do not canonical-wire either asset until Reviewer 01 accepts that exact v6 hash.

**09:** preserve these v6 candidates while review is pending. Do **not** start Decor until Tops 11–12 v6 receive clean card/detail evidence and reviewer-01 disposition.

No Replit/Floot, `main`, deployment, paid settings/services, canonical runtime/manifest, player state, saves, economy, learning logic, scene work, or existing accepted asset was changed.
