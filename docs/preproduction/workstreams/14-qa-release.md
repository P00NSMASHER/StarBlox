# Workstream 14 — Visual Release QA

STATUS: **CATALOG_SPRINT / CURRENT CI PASS / STAGED-ASSET RENDER PATH PASS / CATALOG GATE FAIL**

Branch: `screenshot-match-preproduction` only  
Audited runtime/catalog-asset continuity: full CI-proven `d044d6d68a21009ae521c65fe893fd81905e0863`; later reviewed changes are QA workflow/review/CI-filter files only  
Lighting candidate source: `6b5401fcb708763b73525343ca82a172588ae0e0`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

The runtime/test baseline is green, but the catalog is not remotely release-cleared under Delivery Protocol v2. Independent actual-pixel review has now demonstrated that several legacy `final-portable` and staged/interim families do **not** meet the premium dimensional screenshot-art standard. Accounting labels must not be treated as visual approval.

The catalog remains the active phase. Previously measured Home/Store/Quest geometry defects are intentionally deferred to `GAME_FINISHING`; they are not being used to block the catalog gate.

## Fresh automated gate

GitHub Actions run `35646326387`, job `106487626130`, exact head `d044d6d68a21009ae521c65fe893fd81905e0863`:

- dependency install: **PASS**;
- Vitest: **20/20 test files, 85/85 tests PASS**;
- production Vite build: **PASS**;
- **1,612 modules transformed**;
- output: CSS **167.22 kB / 35.66 kB gzip**; JS **300.96 kB / 92.19 kB gzip**;
- exactly 192 permanent Store IDs: **PASS**;
- current manifest metadata/existing unique paths: **PASS**;
- Aura/companion interim-promotion guard: **PASS**;
- catalog SVG self-contained / no executable or embedded active content: **PASS**;
- storage recovery, unknown/no-art ownership preservation and rapid purchase/room/Quest guards: **PASS automated**;
- hardened learning bank, deterministic five-action Quest and reward/evidence rules: **PASS automated**.

No runtime or catalog asset changed after that tested head during this pass, so the hash-bound automated proof remains applicable. CI was also narrowed so future `docs/**` / markdown-only pushes do not launch redundant full test/build jobs; runtime/assets/workflow changes still do.

## Staged-candidate rendering deadlock removed

Workstream 14 added a small branch-local staged-art QA path rather than wiring candidates into production or asking for a Replit preview:

- fixture: `docs/preproduction/catalog-sprint/reviews/14-lighting-contact-sheet.svg`;
- workflow: `.github/workflows/catalog-staged-art-qa.yml`;
- isolated repository-root HTTP server + Playwright Chromium;
- card contact sheet plus one 800×800 detail capture per exact candidate.

The first workflow attempt correctly **FAILED** because a full-page SVG screenshot timed out; no artifact or visual PASS was fabricated. The workflow was narrowly hardened to render an HTML contact grid and individual `<svg>` elements directly.

Retry run `35646739825` **PASS** produced artifact `10660601212`, digest `sha256:be5c24af79fb8f023d5bf8cda06f1e209c41faeb39068273c6614eb3a7b0f261`:

- 12/12 Lighting candidate URLs: HTTP 200;
- 12/12: exactly one rendered SVG;
- 12/12: detail screenshot captured;
- contact sheet captured;
- 0 page errors / console errors.

Git comparison from Lighting source head `6b5401f...` through the audited branch showed **no Lighting asset changes**, so the artifact is valid evidence for the exact hashes in `lane-04.json`.

## Independent Lighting review — actual pixels

`docs/preproduction/catalog-sprint/reviews/14.json` now contains hash-bound item decisions for `lighting-1..12`.

**Result: 0 ACCEPT / 12 REWORK / 0 BLOCKED.**

All twelve are recognizable and cleanly framed, and their object silhouettes are distinct. However, every rendered image uses a common flat/vector card language: front-facing or shallow 2.5D geometry, strong white outlines/glows, pastel gradient backdrop, limited believable material response, weak three-quarter collectible construction, and an embedded `TIER` badge baked into the artwork. Higher tiers add motif complexity but not enough material/lighting/spectacle progression. This is below the supplied premium dimensional toy-collectible target.

Exact per-item repair reasons are in `reviews/14.json`. The current hashes must **not** be promoted as final art. Workstream 04 should repair in bounded versioned batches and preserve the rejected versions for comparison.

## Cross-review catalog accounting

Current qualified V2 review shards now show:

| Family | Reviewer | Reviewed | ACCEPT | REWORK |
|---|---:|---:|---:|---:|
| Tops | 01 | 12 | 0 | 12 |
| Seating candidates | 02 | 11 | 0 | 11 |
| Auras | 05 | 12 | 0 | 12 |
| Lighting | 14 | 12 | 0 | 12 |
| **Total** |  | **47** | **0** | **47** |

**145 IDs remain without qualified current-hash visual dispositions.** The important finding is not merely incomplete review: every family independently inspected so far contains concrete premium-art defects. The old 99 `final-portable` count therefore cannot be used as screenshot-quality completion.

## Catalog release gate

Canonical manifest remains v12:

- target: **192**;
- legacy `final-portable`: **99**;
- interim-not-verified: **23**;
- canonical manifest/runtime mappings: **122**;
- remaining relative to final-portable label: **93**;
- duplicate manifest paths: **0**.

Current classifications:

- exactly 192 permanent Store IDs: **PASS automated**;
- exact metadata/path integrity for currently wired entries: **PASS automated**;
- wired path uniqueness: **PASS automated**;
- catalog SVG active/embed-content safety: **PASS automated**;
- all 192 current hashes independently accepted: **FAIL — 47 reviewed / 0 accepted / 145 unreviewed**;
- all 192 unique final canonical assets: **FAIL**;
- complete exact-content duplicate scan of the eventual final set: **NOT TESTED — final set does not exist yet**;
- complete rendered near-duplicate review of final set: **NOT TESTED**;
- final post-integration desktop/phone Store pass: **NOT TESTED — no accepted new art has been integrated**;
- catalog-induced learning P0: **PASS automated — none found**;
- catalog save/economy baseline: **PASS automated / live timing NOT TESTED**;
- catalog-specific persistence report: **BLOCKED — `persistence-qa.json` is still missing**;
- exact side-by-side original-reference pixel comparison: **BLOCKED — original user reference pixels are not repository-accessible**.

Full machine-readable status and exact blockers are in `docs/preproduction/catalog-sprint/release-qa.json`; concise human summary is in `release-qa.md`.

## Additional production blocker observed

`lane-03.json` now exists, so the old “missing desk handoff” blocker is obsolete. It reports three high-quality local generated desk candidates (`desks-2..4`) but **0 repository-staged bytes / 0 ready-for-review** because the producer lacked a supported binary-to-GitHub upload surface in that run. Local/generated image files are correctly not counted as delivered catalog assets. Workstream 15 should resolve or reassign that exact persistence path; Workstream 14 cannot visually accept local-only bytes as repository candidates.

## Whole-game evidence retained but deferred

The last strict whole-game Playwright structural gate measured **13 failures**: Home 3, Store 4, Quest 6. Those measurements remain useful historical evidence but were **not remeasured in this catalog-focused pass** and are not catalog completion requirements. Once Workstream 15 switches to `GAME_FINISHING`, Workstream 14 will remeasure the current implementation before directing fixes; no stale failure should be silently treated as current PASS or permanent FAIL.

Likewise, physical-device performance, real VoiceOver/TalkBack/NVDA smoke, final keyboard/focus/contrast proof, live persistence timing, and exact original screenshot parity remain **NOT TESTED / BLOCKED as explicitly recorded**, not inferred PASS.

## Next owner/action

1. **04:** repair Lighting based on exact `reviews/14.json` defects; use versioned assets, preserve rejected hashes.
2. **14:** review Wall next from actual card/detail pixels, then Rugs and Decor; replacement Lighting hashes preempt untouched legacy review.
3. **01 / 02 / 05:** continue disjoint partitions and prioritize replacement candidates over untouched legacy finals.
4. **08:** consume only qualified ACCEPT hashes; none of the 47 currently reviewed hashes qualifies for final integration.
5. **15:** resolve/reassign the Lane 03 binary-upload blocker without duplicate ownership and route exact REWORK batches.
6. **13:** produce catalog-specific synthetic-browser persistence/re-entry evidence before catalog PASS.
7. **14 final catalog check:** after the 192 accepted final bytes exist, run complete content-hash/near-duplicate scan plus full integrated Store desktop/phone/browser gate.

**Do not switch phase. Do not deploy. Replit and `main` remain untouched.**
