# Catalog Sprint Lane 07 — Rugs 12 exact-tree reconciliation

STATUS: **READY FOR REVIEWER 14 — Rugs 12 exact current hash only**

Branch: `screenshot-match-preproduction`  
Authority: `docs/preproduction/ART_VISUALS_SPRINT.json` + `docs/preproduction/DELIVERY_PROTOCOL_V2.md`  
Source head checked before this write: `7515a016c43870f906ae173c1d440bc102bc7b73`  
Replit/Floot/main/deploy/paid settings/player data: **untouched**

## Preserve accepted work

Rugs 1–10 remain independently ACCEPTed at their preserved exact hashes. Reviewer 14 has now independently ACCEPTed `rugs-11` Dream Cloud Rug at `/assets/catalog/rugs-11-w07-v3.png`, exact Git blob `2c93f18fb5960f7056819c341a3da8f7fff3fb9d`; Workstream 07 preserves it unchanged and leaves canonical wiring to 08.

No Rugs 1–11 asset was regenerated, re-uploaded, or edited in this increment. Prior rejected versions remain preserved.

## Rugs 12 reconciliation

Reviewer 14 correctly blocked the prior handoff because Lane 07 declared `85007bbb5e31a5545cf006f9cf43f25167ffb37f` while the current tree contained `eea2fc5b78c1186342f91f597bc792160ab8f8fe`.

The discrepancy is producer metadata, not a later art mutation:

- Staging commit `92af6c535460423ac78b0a6715d3928caa49a2a2` itself created `public/assets/catalog/rugs-12-w07-v3.png` with Git blob `eea2fc5b78c1186342f91f597bc792160ab8f8fe`.
- The latest commit touching that path is still `92af6c535460423ac78b0a6715d3928caa49a2a2`; no later asset replacement occurred.
- Recovery workflow `35679955267`, job `106594548155`, measured the staged source bytes as PNG, 1024×1024, 1,039,033 bytes, SHA-256 `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3` before commit/push.
- Original Adobe/Photoshop rendition provenance remains `https://photoshop-api.adobe.io/v2/short-url/urn:aaid:ps:US:b0c14964-700b-4814-aa57-a2e9823147b3`.
- The rejected v2 remains preserved at `/assets/catalog/rugs-12-chat-v2.png`, Git blob `e008d4b097caadd5e246d2d023e61179d543da3e`.

Therefore the existing current-tree bytes are now the authoritative v3 candidate; **no binary regeneration or re-upload was performed**.

| ID | Authoritative candidate | Exact Git blob | Format / dimensions | Bytes | SHA-256 |
|---|---|---|---|---:|---|
| `rugs-12` Luxe Star Rug — Tier 5, Sunny Pop | `/assets/catalog/rugs-12-w07-v3.png` | `eea2fc5b78c1186342f91f597bc792160ab8f8fe` | PNG 1024×1024 | 1,039,033 | `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3` |

## Exact reviewer-14 handoff

Reviewer 14 should freshly render and judge only this exact candidate:

`rugs-12` — `/assets/catalog/rugs-12-w07-v3.png` — Git blob `eea2fc5b78c1186342f91f597bc792160ab8f8fe`

No ACCEPT or REWORK is claimed by Workstream 07. If reviewer 14 returns REWORK on this exact hash, repair only `rugs-12`. If reviewer 14 ACCEPTs it, 08 alone may canonical-wire it.

Producer checks for this reconciliation: current/staging Git blob readback PASS; PNG signature PASS; 1024×1024 PASS; 1,039,033-byte measurement PASS; SHA-256 measurement PASS. Tests/build were not rerun because this increment changes documentation only and leaves the binary/runtime unchanged.
