# Catalog Sprint Lane 07 — Rugs 11–12 v3 review handoff

STATUS: **READY FOR REVIEWER 14 — Rugs 11–12 v3 exact hashes**

Branch: `screenshot-match-preproduction`  
Authority: `docs/preproduction/ART_VISUALS_SPRINT.json` + `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Replit/Floot/main/deploy/paid settings/player data: **untouched**

## Preserve accepted work

Rugs 1–10 are independently ACCEPTed at their current exact hashes. They were not regenerated, re-uploaded, or edited in this increment. Tops 1–6 also remain preserved at their already accepted/canonical versions. Workstream 07 will not replace any accepted hash without a new exact-hash reviewer defect.

## Triggering reviewer-14 REWORK

| ID | Exact rejected v2 | Finding |
|---|---|---|
| `rugs-11` Dream Cloud Rug, Tier 4, Galaxy Glow | `/assets/catalog/rugs-11-chat-v2.png` — `cfff5c4d235295c0f3e0efc0ef34bfcbf629c916` | Heavy plush lobes/sidewalls read as a floor cushion or ottoman and create near-duplicate risk with the accepted Cloud Rug. |
| `rugs-12` Luxe Star Rug, Tier 5, Sunny Pop | `/assets/catalog/rugs-12-chat-v2.png` — `e008d4b097caadd5e246d2d023e61179d543da3e` | Heavy quilting, raised star and padded rim read as a padded playmat/floor cushion instead of a rug. |

Those v2 files remain preserved. No self-approval is implied.

## Current two-item v3 repair batch

The replacement pixels had already been generated, so this increment **did not duplicate generation**. They were recovered through supported Adobe/Photoshop rendition URLs and committed as new versioned repository bytes in staging commit `92af6c535460423ac78b0a6715d3928caa49a2a2`.

| ID | Current candidate | Exact Git blob | Format / dimensions | Bytes | SHA-256 |
|---|---|---|---|---:|---|
| `rugs-11` Dream Cloud Rug | `/assets/catalog/rugs-11-w07-v3.png` | `2c93f18fb5960f7056819c341a3da8f7fff3fb9d` | PNG 1024×1024 | 1,206,852 | `cb5bea407b241c79887f07f8b37136b64f2336de23683fdafc6007aa23fefdfd` |
| `rugs-12` Luxe Star Rug | `/assets/catalog/rugs-12-w07-v3.png` | `85007bbb5e31a5545cf006f9cf43f25167ffb37f` | PNG 1024×1024 | 1,039,033 | `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3` |

Producer recovery evidence: workflow `35679955267`, job `106594548155`. The job verified PNG signatures, exact 1024×1024 dimensions, byte counts and SHA-256 values before committing and pushing both files. Binary-only recovery did not alter runtime code, so no new test/build claim is made for this increment.

Provenance:
- Rugs 11 rendition: `https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:fe1a242b-38f6-49af-a84e-24886f323129`
- Rugs 12 rendition: `https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:b0c14964-700b-4814-aa57-a2e9823147b3`

## Exact reviewer-14 handoff

Reviewer 14 now owns independent card/detail rendering and disposition of these exact current hashes:

- `rugs-11` — `/assets/catalog/rugs-11-w07-v3.png` — `2c93f18fb5960f7056819c341a3da8f7fff3fb9d`
- `rugs-12` — `/assets/catalog/rugs-12-w07-v3.png` — `85007bbb5e31a5545cf006f9cf43f25167ffb37f`

If reviewer 14 issues an exact-hash REWORK on either v3 candidate, Workstream 07 repairs only that ID. If both are ACCEPTed, Workstream 08 alone may canonical-wire the accepted versions and Workstream 07 holds for Workstream 15 reassignment. No manifest/runtime wiring was changed here.
