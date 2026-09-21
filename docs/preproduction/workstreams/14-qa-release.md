# Workstream 14 — Visual Release QA

STATUS: **AUTOMATED TEST/BUILD PASS / PLAYWRIGHT VISUAL GATE FAIL — 17 RELEASE BLOCKERS**

Branch: `screenshot-match-preproduction` only
Current branch head audited: `b60c397b1dd2d462453e9a7213013ea489cfa315`
Browser-tested runtime head: `224b0a16480160549d0716646fe8a40d6a1fca34`
Replit: **untouched**
Main: **not merged or modified**

> `b60c397b...` differs from browser-tested runtime head `224b0a1...` only by the documentation refresh in `docs/preproduction/workstreams/01-visual-target.md`. Therefore the Playwright results below apply to the current runtime implementation. Any later runtime-affecting commit must earn a new browser gate.

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

The automated code gate is green and the first authoritative branch-local Playwright render gate is now available, but that browser gate is **FAIL** with **17 release-blocking checks**. The branch is functional, non-crashing, and substantially more responsive than the old baseline, but the approved screenshot geometry/hierarchy is not yet matched closely enough for release.

## Evidence reviewed this pass

- all current workstream notes 01–13 and current Workstream 14 state;
- `docs/preproduction/SCREENSHOT_MATCH_TARGET.md`;
- `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` / current Workstream 01 measurable contract;
- `docs/preproduction/COORDINATION.md`;
- `VISUAL_NORTH_STAR.md`;
- `RELEASE_STATUS.md` as historical baseline only;
- `catalog-art-manifest.json`;
- current runtime/navigation code and screenshot-match runtimes;
- current automated test/build workflow;
- Playwright structural visual QA workflow + report + screenshots for Home, Store and Quest at 1408×1056, 1024×768, 390×844 and 320×568.

Browser artifact inspected: GitHub Actions run `35629435156`, artifact `10653416728` (`preproduction-visual-qa`).

## Automated integration gate

Current-head CI run `35629823569` / job `106433024269` on exact head `b60c397b1dd2d462453e9a7213013ea489cfa315`:

- dependency install: **PASS**;
- Vitest: **18/18 test files PASS, 81/81 tests PASS**;
- production build: **PASS**;
- Vite 8.3.0 transformed **1,611 modules**;
- production output: CSS **164.29 kB** (**35.15 kB gzip**), JS **299.66 kB** (**91.88 kB gzip**).

### Automated safety classifications

| Gate | Status | Evidence |
| --- | --- | --- |
| Learning integrity / P0 learning defects | **PASS — automated** | 200-question bank, one keyed answer per 3-choice item, audited semantic families, deterministic five-action Quest, and retry/evidence rules all pass. **No P0 learning defect found.** |
| Persistence / save recovery | **PASS — automated / NOT TESTED live timing** | Storage recovery, malformed-field sanitization, valid-state round trip and unknown/no-art ID preservation pass. IndexedDB timing/re-entry still needs live-browser stress. |
| Duplicate purchase / room / Quest action guard | **PASS — automated / NOT TESTED live stress** | Rapid Buy Forever, room Place/Put Away and Quest answer double-tap guards pass, including React-style button replacement. |
| Store structure | **PASS — automated** | Exactly 192 unique permanent Store IDs remain. |
| Catalog item mapping | **PASS — automated** | Every wired manifest entry maps to the exact stable Store metadata. |
| Duplicate art reuse | **PASS — automated** | Unique existing repo asset path per wired manifest item; manifest duplicate paths = 0. |
| Interim art promotion guard | **PASS — automated** | Aura/companion interim assets are not promoted to final without manifest review. |
| Build/import integrity | **PASS** | Production Vite build completes successfully. |
| Performance regression | **NOT TESTED runtime** | Bundle size is bounded and build is healthy, but no phone/tablet paint/composite or interaction profiling has been completed. |

## Browser structural visual gate

Playwright run `35629435156` built the production bundle, launched a local Vite preview, rendered the current runtime, and captured 12 screenshots. The strict structural gate result was:

**VISUAL_QA_STATUS = FAIL**  
**VISUAL_QA_RELEASE_BLOCKING_COUNT = 17**

### Cross-viewport results that PASS

Across tested Home, Store and Quest at 1408×1056, 1024×768, 390×844 and 320×568:

- **PASS — no blank/crash state** on the three exercised primary screens;
- **PASS — no `pageerror` or `console.error`** observed in the rendered sessions;
- **PASS — no page-level horizontal overflow** at any exercised viewport;
- **PASS — five visible primary navigation controls**, all named and touch-safe on phone;
- **PASS — phone Home critical visible actions**: 13 visible actions, all at least 44px high;
- **PASS — phone Store first row density**: 2 columns at 390px and 320px;
- **PASS — phone Quest answers**: all 3 visible, touch-safe and at least 15px text;
- **PASS — Store desktop main chrome** geometry;
- **PASS — Store desktop 6-column product-grid density/card sizing**;
- **PASS — Store visible generic fallback art in current default category**: 0;
- **PASS — Store HUD remains transparent over the scene**;
- **PASS — Quest lesson/answer ratio**: measured about 54.7% / 39.6%, directionally inside the reference contract.

These are real browser PASS results, not static inference.

## Release-blocking browser failures

### P0 visual hierarchy / navigation

**FAIL — visible Home navigation opens Brightside City/world rather than the approved bedroom Home composition.**

This failed at all four tested viewports and accounts for four of the 17 strict failures. Static source inspection confirms the root mismatch: the base navigation currently maps the first route to `world` while the reference Home composition is mounted on the `room` path; the shell runtime relabels the visible first control as **Home** and the fourth as **Room**.

This is a release blocker because it violates the canonical navigation hierarchy. It is not safe for QA to relabel or alias the routes blindly because Home, Room and Brightside City/world still need deliberate product semantics. Command Center should make the smallest implementation change that gives **Home** its own correct bedroom composition while preserving access to Room/world and correct active-state semantics, then rerun the entire browser gate.

### Home — desktop geometry

Browser screenshot and measured target comparison:

| Region | Status | Measured | Contract |
| --- | --- | ---: | ---: |
| Room Progress | **FAIL** | height **204.4px** | **165px ±6** |
| Dream Goal | **PASS** | within tolerance | target envelope |
| Daily Quests | **PASS** | within tolerance | target envelope |
| Customize | **FAIL** | y **787px** | **822px ±14** |
| Today I’m Learning | **FAIL** | y **713px** | **772px ±14** |
| Motivation card | **PASS** | within tolerance | target envelope |

**Home gate: FAIL.** The warm bedroom/art direction and major panels are present, but the upper progression strip is too tall and two lower regions sit materially too high relative to the approved composition.

### Store — desktop geometry

| Region | Status | Measured | Contract |
| --- | --- | ---: | ---: |
| Main Store chrome | **PASS** | within tolerance | reference envelope |
| Grid density | **PASS** | **6 columns** | 6 columns |
| Avatar try-on stage | **FAIL** | **360×455px** | about **378×470px** |
| Selected-item detail | **FAIL** | height **261px** | **212px ±6.4** |
| Collection strip | **FAIL** | x **178**, y **1046.4**, w **912**, h **183** | x **10**, y **832**, w **1088**, h **216** |
| Value panel | **FAIL** | y **1046.4**, h **183** | y **850**, h **198** |

**Store gate: FAIL.** The upper Store/product system is structurally strong, but the lower collection/value composition is currently below the 1056px reference fold and much narrower than the target. The selected-detail rail is too tall and the avatar stage is modestly undersized.

### Quest — desktop geometry

| Region | Status | Measured | Contract |
| --- | --- | ---: | ---: |
| Header | **FAIL** | height **83px** | **71px ±6** |
| Phase strip | **FAIL** | y **168px** | **153px ±14** |
| Avatar zone | **FAIL** | x **28**, w **348**, h **729** | x **12**, w **368**, h **755** |
| Learning body | **FAIL** | y **261**, h **642** | y **238**, h **662** |
| Mastery rail | **FAIL** | w **204**, h **712** | w **216**, h **678** |
| Earned summary | **FAIL** | x **486**, y **954**, w **619.5**, h **72** | x **470**, y **925**, w **385**, h **97** |
| Lesson/answer split | **PASS** | **54.7% / 39.6%** | approximately 57–60% / 40–43% |

**Quest gate: FAIL.** The learning composition renders reliably and the internal lesson/answer split is directionally correct, but the outer geometry is consistently lower/taller/wider than the approved screenshot contract, especially the earned summary.

## Subjective screenshot review

The captured screenshots confirm that this is now recognizably one coherent StarBlox game rather than a blank/default React shell: cobalt/cyan chrome, warm scenes, avatar/buddy presentation, dense Store cards, Quest learning surfaces and mobile reflow are all visibly present.

However, exact perceptual screenshot parity is **not PASS**. The repository does not contain the original approved reference image pixels for automated image-diff scoring, so illustration quality, facial appeal, material depth, lighting richness and final logo polish remain **BLOCKED / NOT TESTED side-by-side** beyond the measurable geometry contract. Structural browser measurement is therefore authoritative for what it can prove, but it must not be converted into a full visual-fidelity PASS.

## Accessibility / narrow-screen classification

| Area | Status | Evidence |
| --- | --- | --- |
| Page-level horizontal overflow | **PASS — browser** | 0 tested overflow failures across 12 primary-screen/viewport renders. |
| Primary nav naming / phone target size | **PASS — browser** | Five visible named controls; phone controls touch-safe. |
| Home critical visible actions | **PASS — browser** | 13 visible phone actions, all ≥44px high. |
| Quest answer touch/readability | **PASS — browser** | 3 visible answers; all touch/readability safe at 390 and 320. |
| Store phone grid | **PASS — browser** | 2-column first row at 390 and 320. |
| Keyboard focus order | **NOT TESTED** | Requires browser keyboard traversal. |
| Focus clipping | **NOT TESTED** | Requires real traversal. |
| Screen-reader announcements | **NOT TESTED** | No VoiceOver/TalkBack/NVDA smoke completed. |
| Measured color contrast | **NOT TESTED** | Static palette reviewed; exact rendered ratios not measured. |
| Fixed HUD/dock coverage of every late-page action | **NOT TESTED exhaustively** | Current top-viewport checks pass, but full scroll/reachability proof remains required. |

## Catalog / art gate

Current manifest v12:

- target: **192**;
- final-portable: **99** (**51.56%**);
- remaining non-final: **93**;
- interim-not-verified: **23** — all 12 Aura assets plus companions 2–12;
- duplicate asset paths: **0**.

Classification:

- exact stable-ID mapping: **PASS automated**;
- duplicate path reuse: **PASS automated**;
- current default desktop Store category visible generic fallback count: **PASS browser (0)**;
- complete release-quality catalog coverage: **FAIL**;
- visual correctness of all 23 interim assets: **NOT TESTED / BLOCKED pending inspection**.

Missing/unfinished art must remain a presentation fallback only and must never mutate ownership/equipment/room/Dream Goal state.

## Save / inventory / economy risk

Automated state-safety coverage is strong and **PASS** for inspected unit/integration cases, including malformed save recovery, unknown/no-art ownership preservation, round trips and rapid duplicate-action guards.

Still **NOT TESTED live**:

1. Buy Forever rapid clicks across actual React rerender;
2. Place/Put Away double tap on a physical/touch browser;
3. Quest answer double tap under real event timing;
4. purchase/equip/place then refresh/re-entry;
5. refresh around final Quest completion award;
6. localStorage loss with IndexedDB backup recovery;
7. malformed import recovery through the actual file input;
8. owned/equipped/placed item with no final art surviving refresh.

Do not promote persistence/economy to full runtime PASS until those are exercised.

## Performance classification

- production build and module graph: **PASS**;
- JS/CSS bundle size sanity: **PASS as static evidence**;
- browser runtime errors on primary screenshots: **PASS**;
- reduced-motion helper tests: **PASS automated**;
- phone/tablet paint/composite cost, animation smoothness, memory and long-scroll performance: **NOT TESTED**.

No performance regression is proven, but runtime performance is not yet release-cleared.

## Exact remaining release blockers

1. **P0 visual/navigation:** visible Home must open the approved bedroom Home composition with correct active navigation semantics; preserve Room/world access rather than simply renaming routes.
2. **Home desktop geometry:** Room Progress height; Customize y; Today’s Learning y.
3. **Store desktop geometry:** avatar stage size; selected-detail height; collection strip position/width/height; value panel position/height.
4. **Quest desktop geometry:** header height; phase y; avatar-zone size/position; learning-body y/height; mastery-rail size; earned-summary geometry.
5. **Catalog completeness:** 93 items remain non-final; 23 interim Aura/companion assets need visual approval before promotion.
6. **Side-by-side reference fidelity:** exact illustration/material/logo/character polish cannot be fully cleared without the approved reference pixels available to the QA comparator.
7. **Live persistence/economy stress:** browser timing/re-entry/IndexedDB cases listed above.
8. **Real accessibility smoke:** keyboard traversal, focus clipping, measured contrast and screen-reader smoke.
9. **Runtime performance:** reduced-motion browser proof and phone/tablet paint/composite sanity.
10. **Final coordinated rerun:** after any runtime-affecting fixes, rerun both full CI and strict Playwright structural visual QA on the exact release candidate head.

## QA ownership / fixes this pass

No product runtime was modified by this QA pass. The browser evidence exposes a real Home route architecture mismatch plus screen-owner geometry defects. Those are recorded precisely rather than hidden with a QA-only tolerance change or unsafe route relabel. The structural tolerances remain unchanged.

No Replit update/publish action was taken. No merge or direct write to `main` was performed.

## Handoff

Command Center / screen owners should fix in this order:

1. Home route semantics first — it affects every viewport and is the highest-severity visible hierarchy defect;
2. Quest outer geometry — learning-critical screen;
3. Home remaining desktop geometry;
4. Store lower-fold composition and detail/avatar geometry while catalog art continues;
5. rerun strict Playwright visual QA;
6. perform live persistence/accessibility/performance stress only after the screen geometry is stable;
7. rerun full test/build on the exact final runtime head;
8. update this file and `COMMAND_CENTER.md` only from measured PASS evidence.

**Replit must remain untouched. `main` must remain unmerged.**
