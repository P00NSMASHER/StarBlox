# Workstream 14 — Visual Release QA

STATUS: **CATALOG_SPRINT / CI PASS / STAGED-ASSET RENDERING PASS / CATALOG GATE FAIL**

Branch: `screenshot-match-preproduction` only  
Runtime/catalog-byte proof: current through CI-proven `8e49cff09f28c6cb4bfc44cba0f7d69d8e0dd7e9`; detailed unchanged-runtime baseline `d044d6d68a21009ae521c65fe893fd81905e0863`  
Lighting candidate source: `6b5401fcb708763b73525343ca82a172588ae0e0`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

The automated game baseline is green, but Delivery Protocol v2 now has real pixel evidence that multiple catalog families — including assets historically labeled `final-portable` — do not meet the premium dimensional screenshot-art target. Those labels are not visual acceptance. The project must stay in `CATALOG_SPRINT` until all 192 current final hashes are independently accepted and the complete catalog gate passes.

The previously measured Home/Store/Quest geometry defects remain deferred to `GAME_FINISHING`; they are not being used to block catalog completion.

## Fresh automated evidence

Current CI run `35646740058`, job `106488999656`, on `8e49cff09f28c6cb4bfc44cba0f7d69d8e0dd7e9`: **PASS test-build**.

Detailed CI run `35646326387`, job `106487626130`, on unchanged runtime/catalog bytes at `d044d6d68a21009ae521c65fe893fd81905e0863`:

- Vitest: **20/20 test files, 85/85 tests PASS**;
- production Vite build: **PASS**;
- **1,612 modules transformed**;
- exactly 192 permanent Store IDs: **PASS**;
- manifest metadata and unique existing asset paths: **PASS**;
- interim Aura/companion promotion guard: **PASS**;
- catalog SVG self-contained / no executable or embedded active content: **PASS**;
- storage recovery, unknown/no-art ownership retention and rapid purchase/room/Quest guards: **PASS automated**;
- hardened learning bank, five-action Quest and reward/evidence rules: **PASS automated**.

Git comparison after that runtime proof contains workflow/config, review/report documents and a tiny binary capability probe, but **no game runtime or catalog asset-byte changes**, so the runtime/content tests remain applicable.

CI has also been narrowed with `paths-ignore` for `docs/**` / markdown-only pushes, while runtime/assets/workflow changes still trigger the suite. Existing concurrency continues to cancel superseded CI jobs. This removes repeated heavy builds from documentation-only QA commits without weakening runtime coverage.

## Branch-local staged-art fixture — PASS

Workstream 14 implemented the required review-before-wiring path without touching canonical Store mappings or Replit:

- fixture: `docs/preproduction/catalog-sprint/reviews/14-lighting-contact-sheet.svg`;
- workflow: `.github/workflows/catalog-staged-art-qa.yml`;
- repository-root HTTP server + Playwright Chromium;
- card-scale contact sheet plus one 800×800 detail capture per exact candidate.

The first workflow attempt **FAILED** on a Playwright full-page SVG screenshot timeout. It produced no artifact and was not treated as visual proof. The workflow was narrowly corrected to render an HTML contact grid and capture each SVG element directly.

Retry run `35646739825` **PASS** produced artifact `10660601212`, digest `sha256:be5c24af79fb8f023d5bf8cda06f1e209c41faeb39068273c6614eb3a7b0f261`:

- 12/12 exact Lighting candidate URLs returned HTTP 200;
- 12/12 contained exactly one SVG;
- 12/12 detail screenshots captured;
- contact sheet captured;
- 0 page errors / console errors.

Lighting assets did not change from source `6b5401f...` through review, so this artifact is bound to the hashes in `lane-04.json`.

## Independent Lighting review — FAIL / REWORK 12

`docs/preproduction/catalog-sprint/reviews/14.json` records the exact-hash decisions.

**0 ACCEPT / 12 REWORK / 0 BLOCKED.**

All twelve Lighting candidates are recognizable, cleanly framed and distinct in broad silhouette, but the rendered pixels share a flat/vector presentation: shallow front-facing construction, white outline/glow, pastel gradient card backgrounds, limited believable material response and baked-in `TIER` badges. Higher tiers add motifs/glow rather than the richer three-quarter construction, materials and controlled lighting/spectacle required by the screenshot target.

The current Lighting hashes are therefore **ineligible for final integration**. Workstream 04 should repair them in bounded versioned batches from the item-specific findings in `reviews/14.json`; replacement hashes require fresh independent review.

## Current V2 visual-review accounting

| Family | Reviewer | Reviewed | ACCEPT | REWORK |
|---|---:|---:|---:|---:|
| Tops | 01 | 12 | 0 | 12 |
| Seating candidates | 02 | 11 | 0 | 11 |
| Auras | 05 | 12 | 0 | 12 |
| Lighting | 14 | 12 | 0 | 12 |
| **Total** |  | **47** | **0** | **47** |

**145 IDs remain without qualified current-hash visual dispositions.** More importantly, every independently reviewed family so far has concrete premium-art defects; the manifest's legacy `final-portable` count cannot be interpreted as screenshot-quality completion.

## Catalog release gate

Canonical manifest remains v12:

- target: **192**;
- legacy `final-portable`: **99**;
- interim-not-verified: **23**;
- canonical manifest/runtime mappings: **122**;
- remaining relative to final-portable label: **93**;
- duplicate manifest paths: **0**.

Classification:

- 192 permanent Store IDs: **PASS automated**;
- current wired metadata/path integrity: **PASS automated**;
- current wired path uniqueness: **PASS automated**;
- catalog SVG active/embed-content safety: **PASS automated**;
- all 192 unique accepted final canonical assets: **FAIL**;
- all 192 current hashes independently accepted: **FAIL — 47 reviewed / 0 accepted / 145 unreviewed**;
- complete final-set exact-content duplicate scan: **NOT TESTED — final set does not exist**;
- complete final-set rendered near-duplicate review: **NOT TESTED**;
- final post-integration Store desktop/phone art pass: **NOT TESTED — no accepted new art integrated**;
- catalog-induced learning P0: **PASS automated — none found**;
- save/economy automated baseline: **PASS / live timing NOT TESTED**;
- catalog-specific persistence report: **BLOCKED — `persistence-qa.json` not yet present**;
- exact original-reference pixel parity: **BLOCKED — original user reference pixels are not repository-accessible**.

Machine-readable gate: `docs/preproduction/catalog-sprint/release-qa.json`. Human summary: `release-qa.md`.

## Desk asset transfer status — capability fixed, delivery still pending

`lane-03.json` is no longer missing. It records three generated local desk candidates (`desks-2..4`) but zero repository-staged images.

Workstream 08 subsequently proved an authorized binary repository path with exact readback:

`create_blob(base64) → create_tree → create_commit → update_ref(force=false) → fetch/readback hash verify`.

Probe `docs/preproduction/catalog-sprint/binary-upload-probe.png` round-tripped exactly. Therefore **binary GitHub writing is no longer a project capability blocker**. However, Workstream 08 cannot see the historical generated desk file IDs from Workstream 03's separate run. Workstream 03 must use the now-proven path from the run where its generated bytes are visible; it should stage the existing desks-2..4 rather than regenerate them. `desks-5..12` still require candidates.

## Deferred whole-game release work

The last strict whole-game Playwright structural gate measured **13 failures: Home 3, Store 4, Quest 6**. These are retained as historical measured evidence but were **not remeasured in this catalog-focused pass** and are not catalog gate requirements. Workstream 14 will remeasure the then-current implementation after the switch to `GAME_FINISHING` before directing fixes.

Physical-device performance, real VoiceOver/TalkBack/NVDA smoke, final keyboard/focus/contrast proof, live persistence timing and exact original screenshot comparison likewise remain **NOT TESTED / BLOCKED where stated**, never silently promoted to PASS.

## Exact current blockers / next owners

1. **04:** repair `lighting-1..12` from the exact `reviews/14.json` defects; preserve rejected hashes.
2. **14:** review Wall next from actual card/detail pixels, then Rugs and Decor; repaired Lighting hashes preempt untouched review.
3. **01 / 02 / 05:** continue their disjoint partitions and prioritize replacement candidates over untouched legacy finals.
4. **08:** integrate only qualified current-hash ACCEPT decisions; **none of the 47 reviewed hashes currently qualifies**.
5. **03:** use the now-proven binary blob/tree/commit/ref path from its producer run to stage existing desks-2..4; do not regenerate them; continue remaining desks.
6. **13:** produce catalog-specific synthetic-browser persistence/re-entry evidence before catalog PASS.
7. **14 final catalog gate:** after 192 accepted final bytes exist, run complete exact-content hashing, rendered near-duplicate review, integrated Store desktop/phone checks and final regression/build.

**Phase stays `CATALOG_SPRINT`. Replit/Floot and `main` remain untouched. No deployment is authorized.**
