# Catalog Sprint — Workstream 14 Release QA

STATUS: **FAIL — CATALOG NOT RELEASE READY**

Branch: `screenshot-match-preproduction` only. Replit/Floot untouched. `main` unmodified.

## Material evidence from this pass

- Full branch CI on `d044d6d68a21009ae521c65fe893fd81905e0863`: **20/20 test files, 85/85 tests PASS; production Vite build PASS; 1,612 modules transformed.** The later audited head changes only QA workflow/review/CI-filter files, so runtime/catalog-asset hashes remain unchanged.
- Added a branch-local staged-candidate rendering path, independent of canonical Store wiring. Initial screenshot capture timed out; the harness was narrowly corrected rather than relabeling the failed run. Retry GitHub Actions run `35646739825` **PASS** produced artifact `10660601212` (`sha256:be5c24af79fb8f023d5bf8cda06f1e209c41faeb39068273c6614eb3a7b0f261`) with one card contact sheet, 12 individual 800×800 Lighting detail screenshots and a machine report. All 12 returned HTTP 200, contained one SVG, rendered a screenshot, and logged no page/console errors.
- The same run is bound to exact staged Lighting blob hashes. Git comparison from candidate source `6b5401f...` through the audited head contains **no Lighting asset changes**.
- Independent pixel review of `lighting-1..12`: **0 ACCEPT / 12 REWORK / 0 BLOCKED**. Identity and framing are generally clear, but every item remains too flat/vector-like for the premium dimensional three-quarter collectible target; material/light depth and tier progression are insufficient. See `reviews/14.json` for per-item findings.

## Current catalog gate

| Requirement | Status | Evidence |
|---|---|---|
| Exactly 192 permanent Store IDs | **PASS — automated** | current full CI |
| Existing wired metadata matches stable IDs | **PASS — automated** | current manifest tests |
| Existing wired asset paths exist and are unique | **PASS — automated** | 0 duplicate manifest paths |
| Catalog SVG active/embed-content safety | **PASS — automated** | `catalogAssetSafety.test.js` |
| Production build | **PASS** | current full CI |
| All 192 have unique final canonical art | **FAIL** | manifest still v12: 99 legacy final-portable, 23 interim; only 122 wired entries |
| Every current art hash independently accepted | **FAIL** | 47 reviewed so far, **0 accepted / 47 rework** |
| Complete exact-content duplicate scan | **NOT TESTED — complete final set unavailable** | final 192-asset set does not yet exist |
| Complete rendered near-duplicate review | **NOT TESTED — complete final set unavailable** | ongoing by partition |
| Final integrated Store desktop/phone art pass | **NOT TESTED** | no independently accepted new art integrated yet |
| Catalog-induced learning P0 | **PASS — automated** | current learning suite green |
| Catalog save/economy live timing | **NOT TESTED / BLOCKED** | `persistence-qa.json` still missing |
| Original screenshot pixel parity | **BLOCKED** | original user reference pixels are not repository-accessible |

## Independent visual-review accounting

Current V2 exact-hash decisions visible at this pass:

- Tops — reviewer 01: **12 REWORK**.
- Seating candidates — reviewer 02: **11 REWORK**.
- Auras — reviewer 05: **12 REWORK**.
- Lighting — reviewer 14: **12 REWORK**.

Total: **47 reviewed / 0 accepted / 47 rework / 145 not yet reviewed**. Legacy `final-portable` and `interim-not-verified` labels are therefore accounting labels, not premium visual approval.

## Exact blockers

1. `lighting-1..12` must return to Workstream 04 as versioned replacements; current hashes are independently rejected.
2. 145 IDs still need qualified current-hash rendered dispositions across the four V2 review partitions.
3. The canonical manifest/runtime still does not expose a unique final asset for all 192 IDs.
4. Lane 03 reports three locally generated desk images but **0 repository-staged images** because its binary-upload surface is unresolved; those local images cannot be reviewed or integrated as delivered assets.
5. Complete final-set content hashing and rendered near-duplicate inspection cannot finish until the replacement/final bytes exist.
6. Catalog-specific real-browser persistence/re-entry evidence is still missing.
7. Exact visual parity to the original user screenshots remains blocked without accessible reference pixels. Contract-based review can proceed, but pixel-identical parity cannot be claimed.

The previously measured 13 Home/Store/Quest geometry failures remain whole-game `GAME_FINISHING` work and are **not** catalog-gate blockers. They were not remeasured in this catalog-focused pass.

## Next actions

Workstream 04 should repair Lighting in bounded batches from the exact `reviews/14.json` defects. Workstream 14 next reviews Wall/Rugs/Decor actual pixels and re-reviews repaired Lighting hashes first. Workstreams 01/02/05 continue their independent partitions. Workstream 08 may integrate an item only after a qualified ACCEPT for that current hash plus mapping/file checks; none of the 47 reviewed hashes currently qualifies. Workstream 15 should resolve the desk binary-upload blocker and route repairs without duplicate ownership. Workstream 13 must provide the missing catalog-specific persistence evidence before the catalog gate can PASS.
