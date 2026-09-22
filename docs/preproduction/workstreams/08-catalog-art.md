## Workstream 08 — canonical catalog art integration

Phase remains **ART_AND_VISUALS_ONLY / CATALOG_SPRINT**. Workstream 08 is the sole canonical writer for `catalog-art-manifest.json` and `src/catalogArtRuntime.js`. It integrates only qualified current exact-hash independent ACCEPT evidence, preserves accepted hashes/rollback versions, and does not change gameplay/catalog identity metadata, phase, or deployment state.

## V2 canonical increment — Wall 1–4 v2 exact-hash ACCEPTs

Published canonical commit: `b91a8a9bf7806911d74e6f0972acf019f7056eaf` (manifest v29).

Reviewer 14 independently ACCEPTED the current producer-05 Wall pilot from actual card/detail pixels:

- `wall-1` School Star Poster — `/assets/catalog/wall-1-w05-v2.png` — Git blob `9908e774b4012cb89d3c86eed9ca3d10ce3bffe4` — Garden Glow / Tier 1.
- `wall-2` Cloud Wall Flag — `/assets/catalog/wall-2-w05-v2.png` — Git blob `febf517cd0db666f647962c0cb7d4e5af53d4b76` — Galaxy Glow / Tier 1.
- `wall-3` Pixel Scoreboard — `/assets/catalog/wall-3-w05-v2.png` — Git blob `5ad5aff97c9d365221de8c2d888abf3a26db547e` — Sunny Pop / Tier 1.
- `wall-4` Heart Gallery — `/assets/catalog/wall-4-w05-v2.png` — Git blob `bc38aee13c1c4840aa1e9657edfb67c8838a6a21` — Aqua Wave / Tier 2.

Exact live repository readback, authoritative Store metadata, scoped PNG decode/card/detail evidence, reviewer independence and path/content uniqueness passed before canonical wiring. The unrelated Desk failures in the shared staged-art workflow remain visible and were not converted into a global pass. Stable IDs, prices, unlocks, ownership, save data and gameplay metadata were untouched.

### Evidence-integrity reconciliation

Reviewer 02's current schema-10 audit records Seating 7–10 as `BLOCKED_EVIDENCE_NOT_DECISION`. The producer lane had attributed ACCEPT decisions to reviewer 02, but reviewer 02's authored lineage contains no qualifying independent visual decisions for those current hashes, and consumable card/detail proof was absent. No visual REWORK is inferred and the existing canonical mappings are retained, but these four items are excluded from the strict accepted count until reviewer 02 performs a genuine exact-current-hash pixel review.

Accordingly, the previously reported strict floor of 91 is corrected to **87 before this Wall batch**. Wall 1–4 add four valid strict ACCEPTs, so manifest v29 ends at **91/192 strict accepted+canonical**, not 95.

### Canonical counts after manifest v29

- catalog target: **192 IDs**
- manifest/runtime mappings: **168 / 168**
- legacy `final-portable`: **161**
- legacy interim-not-verified: **7**
- legacy non-final relative to target: **31**
- independently accepted current hashes canonically wired: **91 / 192**
- strict remaining: **101**
- release-cleared: **0 / 192**

Generated-local this increment: 0; preserved-blob-only: 0; newly staged: 0; qualified ACCEPTs consumed: 4; strict canonical delta from reconciled floor: +4.

### Exact-commit validation now complete

StarBlox CI run `35720030954` / job `106720519290` on canonical commit `b91a8a9bf7806911d74e6f0972acf019f7056eaf` is **PASS**. It reports **22 test files / 99 tests passed**, including `catalogManifestQa` 4/4, catalog asset safety, Store runtime 3/3, and the retained learning/persistence/economy gates. Art-factory contract tests pass **12/12**. The production Vite build passes with 1,613 modules transformed.

StarBlox Catalog Mobile QA run `35720030949` / job `106720518752` successfully built and started the preview, then remained **BLOCKED/FAIL** at the Store-navigation safeguard. Artifact `10690563316` records six release-blocking click timeouts before Store content opens across the four reduced-motion viewports and two normal-motion controls. No Store visual PASS or screenshot-parity PASS is claimed, no assertion is weakened, and valid accepted Wall art remains canonical.

### Current review queue

No newer qualified exact-hash ACCEPT exists in reviewer 01/02/05/14 at the evidence refresh head. Reviewer 01 has Tops 11–12 v6 BLOCKED on qualified pixel/signature evidence. Reviewer 02 has Seating 7–10 `BLOCKED_EVIDENCE_NOT_DECISION`. Reviewer 05 has now returned **REWORK 4/4** for current Companions 2/5/6/7 exact hashes after real card/detail inspection. Reviewer 14's Wall 1–4 ACCEPTs are fully consumed by v29.

Only Workstream 15 may declare ART_VISUALS_COMPLETE or change phase. No catalog/art completion authorizes deployment. Replit, Floot, `main`, deployment, paid settings and real player data remain untouched.
