# Workstream 14 — Visual Release QA

STATUS: **CURRENT CI PASS / PLAYWRIGHT VISUAL GATE FAIL — 13 STRUCTURAL BLOCKERS**

Branch: `screenshot-match-preproduction` only
Current audited runtime head: `276181274e2f11ed49b46e09852712d43899b538`
Replit: **untouched**
Main: **not merged or modified**

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

The current branch builds cleanly and all automated tests pass. The previously identified Home/Room navigation hierarchy blocker is now fixed and browser-verified at all four exercised viewports. The strict branch-local Playwright visual gate still fails with **13 measured structural geometry blockers** across Home, Store, and Quest. Catalog completion, live persistence stress, full accessibility smoke, runtime performance profiling, and exact side-by-side reference-pixel comparison also remain incomplete.

Do not convert any of those untested areas to PASS.

## Evidence reviewed this pass

- all current workstream notes 01–13 plus current Workstream 14 state;
- `docs/preproduction/SCREENSHOT_MATCH_TARGET.md`;
- the current Workstream 01 measurable design contract;
- `docs/preproduction/COORDINATION.md`;
- `VISUAL_NORTH_STAR.md`;
- `RELEASE_STATUS.md` as historical baseline only;
- `catalog-art-manifest.json`;
- current shell/Home/Store/Quest runtimes and relevant tests;
- current CI and visual-QA workflows;
- latest Playwright screenshots for Home, Store and Quest at 1408×1056, 1024×768, 390×844 and 320×568.

Latest browser evidence: GitHub Actions run `35631059432`, artifact `10654114272` (`preproduction-visual-qa`).

## Current automated integration gate

Current-head CI run `35631059442` / job `106437102843` on exact runtime head `276181274e2f11ed49b46e09852712d43899b538`:

- dependency install: **PASS**;
- Vitest: **19/19 test files PASS, 84/84 tests PASS**;
- production build: **PASS**;
- Vite 8.3.0 transformed **1,611 modules**;
- production output: CSS **164.29 kB** (**35.15 kB gzip**), JS **300.70 kB** (**92.13 kB gzip**).

### Automated safety classifications

| Gate | Status | Evidence |
| --- | --- | --- |
| Learning integrity / P0 learning defects | **PASS — automated** | 200-question bank, exactly one keyed answer per 3-choice item, audited semantic families, deterministic five-action Quest, and retry/evidence policy all pass. **No P0 learning defect found.** |
| Shell navigation semantics | **PASS — automated + browser** | Targeted tests lock Home/Quests/Study/Room/Store ordering, logo-to-Home routing, and settings-based Customize access; Playwright verifies visible Home opens the screenshot-match bedroom composition. |
| Persistence / save recovery | **PASS — automated / NOT TESTED live timing** | Malformed-save recovery, valid-state round trip, and unknown/no-art ID preservation pass. IndexedDB timing/re-entry still needs live-browser stress. |
| Duplicate purchase / room / Quest action guard | **PASS — automated / NOT TESTED live stress** | Rapid Buy Forever, Place/Put Away, and Quest-answer guards pass, including React-style button replacement. |
| Store structure | **PASS — automated** | Exactly 192 unique permanent Store IDs remain. |
| Catalog item mapping | **PASS — automated** | Every manifest entry maps to exact stable Store metadata. |
| Duplicate art reuse | **PASS — automated** | Wired manifest paths are unique; manifest duplicate paths = 0. |
| Interim art promotion guard | **PASS — automated** | Aura/companion interim assets are not promoted to final without manifest review. |
| Build/import integrity | **PASS** | Production Vite build completes successfully. |
| Runtime performance | **NOT TESTED** | Bundle/build evidence is healthy, but phone/tablet paint, composite, animation smoothness, memory, and long-scroll profiling have not been performed. |

## QA fixes made during this gate

Two narrow verified QA/integration issues were resolved without touching Replit or `main`:

1. Shell navigation semantics were corrected by the shell owner so the underlying screenshot-match bedroom route is the visible **Home**, Brightside City/world remains reachable as **Room**, the visible order is Home → Quests → Study → Room → Store, and the logo routes to Home. Targeted regression tests were added.
2. The new shell tests exposed an existing queued-microtask teardown hazard in `homeScreenshotMatchRuntime.js`. QA added only a `typeof document === 'undefined'` guard inside the queued scan. This prevents an unhandled jsdom teardown error and does not alter gameplay, save state, economy, learning logic, or browser behavior while `document` exists.

The first shell-test attempt also used unavailable jest-dom matchers; those assertions were replaced with Vitest-native attribute checks. The current 84-test suite is green.

## Latest browser structural visual gate

Playwright run `35631059432` built the production bundle, launched a local Vite preview, rendered the current runtime, and captured 12 screenshots.

**VISUAL_QA_STATUS = FAIL**  
**VISUAL_QA_RELEASE_BLOCKING_COUNT = 13**

The blocker count dropped from 17 to 13 because the four viewport-specific Home-route failures are now **PASS**.

### Cross-viewport results that PASS

Across tested Home, Store and Quest at 1408×1056, 1024×768, 390×844 and 320×568:

- **PASS — Home route contract at all four viewports**: visible Home opens the approved bedroom Home composition;
- **PASS — no blank/crash state** on the three exercised primary screens;
- **PASS — no `pageerror` or `console.error`** observed;
- **PASS — no page-level horizontal overflow**;
- **PASS — five visible primary navigation controls**, named and touch-safe;
- **PASS — phone Home visible critical actions**: 13 visible actions, all at least 44px high;
- **PASS — phone Store first-row density**: 2 columns at 390px and 320px;
- **PASS — phone Quest answers**: all 3 visible and touch/readability safe;
- **PASS — Store desktop main chrome**;
- **PASS — Store desktop 6-column grid density/card sizing**;
- **PASS — Store visible generic fallback art in the current default category**: 0;
- **PASS — Store HUD transparent over scene**;
- **PASS — Quest lesson/answer split**: about 54.7% / 39.6%, directionally inside the reference contract.

These are browser-observed PASS results, not static inference.

## Exact 13 browser structural blockers

### Home — 3 failures

| Region | Status | Measured | Contract |
| --- | --- | ---: | ---: |
| Room Progress | **FAIL** | height **204.4px** | **165px ±6** |
| Dream Goal | **PASS** | within tolerance | target envelope |
| Daily Quests | **PASS** | within tolerance | target envelope |
| Customize | **FAIL** | y **787px** | **822px ±14** |
| Today I’m Learning | **FAIL** | y **713px** | **772px ±14** |
| Motivation card | **PASS** | within tolerance | target envelope |

**Home gate: FAIL.** Latest screenshot confirms the correct warm bedroom Home now opens from Home, but the progression strip remains too tall and the Customize / Today’s Learning regions remain materially too high.

### Store — 4 failures

| Region | Status | Measured | Contract |
| --- | --- | ---: | ---: |
| Main Store chrome | **PASS** | within tolerance | reference envelope |
| Grid density | **PASS** | **6 columns** | 6 columns |
| Avatar try-on stage | **FAIL** | **360×455px** | about **378×470px** |
| Selected-item detail | **FAIL** | height **261px** | **212px ±6.4** |
| Collection strip | **FAIL** | x **178**, y **1046.4**, w **912**, h **183** | x **10**, y **832**, w **1088**, h **216** |
| Value panel | **FAIL** | y **1046.4**, h **183** | y **850**, h **198** |

**Store gate: FAIL.** Latest screenshot confirms a strong upper product grid/try-on composition, but the collection/value region still begins at or below the reference viewport fold instead of occupying the intended lower band. The selected-detail rail is too tall and the avatar stage is modestly undersized.

### Quest — 6 failures

| Region | Status | Measured | Contract |
| --- | --- | ---: | ---: |
| Header | **FAIL** | height **83px** | **71px ±6** |
| Phase strip | **FAIL** | y **168px** | **153px ±14** |
| Avatar zone | **FAIL** | x **28**, w **348**, h **729** | x **12**, w **368**, h **755** |
| Learning body | **FAIL** | y **261**, h **642** | y **238**, h **662** |
| Mastery rail | **FAIL** | w **204**, h **712** | w **216**, h **678** |
| Earned summary | **FAIL** | x **486**, y **954**, w **619.5**, h **72** | x **470**, y **925**, w **385**, h **97** |
| Lesson/answer split | **PASS** | **54.7% / 39.6%** | approximately 57–60% / 40–43% |

**Quest gate: FAIL.** Latest screenshot is coherent and readable with no crash/overflow, but the outer layout is still too low/tall in several regions, and the earned summary is much too wide and too low.

## Subjective screenshot review

The current screenshots are recognizably one coherent StarBlox game: cobalt/cyan chrome, warm illustrated environments, avatar/buddy presentation, dense Store cards, Quest learning surfaces, and responsive mobile reflow are all visibly present. The corrected Home navigation now reveals the intended bedroom Home rather than Brightside City.

Exact perceptual screenshot parity is still **NOT TESTED / BLOCKED side-by-side** because the repository does not contain the approved reference image pixels for an automated image-diff comparator. Illustration quality, facial appeal, material depth, lighting richness, and final-logo fidelity therefore cannot be promoted to full visual PASS from geometry alone.

## Accessibility / narrow-screen classification

| Area | Status | Evidence |
| --- | --- | --- |
| Page-level horizontal overflow | **PASS — browser** | 0 tested failures across 12 primary-screen/viewport renders. |
| Home route semantics | **PASS — browser** | Correct at 1408, 1024, 390, and 320 widths. |
| Primary nav naming / phone target size | **PASS — browser** | Five visible named controls; phone controls touch-safe. |
| Home critical visible actions | **PASS — browser** | 13 visible phone actions, all ≥44px high. |
| Quest answer touch/readability | **PASS — browser** | 3 visible answers; all touch/readability safe at 390 and 320. |
| Store phone grid | **PASS — browser** | 2-column first row at 390 and 320. |
| Keyboard focus order | **NOT TESTED** | Requires browser keyboard traversal. |
| Focus clipping | **NOT TESTED** | Requires real traversal. |
| Screen-reader announcements | **NOT TESTED** | No VoiceOver/TalkBack/NVDA smoke completed. |
| Measured color contrast | **NOT TESTED** | Exact rendered contrast ratios not measured. |
| Fixed HUD/dock coverage of every late-page action | **NOT TESTED exhaustively** | Top-viewport checks pass; full-scroll reachability remains required. |

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

Missing/unfinished art remains a presentation fallback only and must never mutate ownership, equipment, room placement, or Dream Goal state.

## Save / inventory / economy risk

Automated state-safety coverage is **PASS** for inspected cases, including malformed-save recovery, unknown/no-art ownership preservation, round trips, and duplicate-action guards.

Still **NOT TESTED live**:

1. Buy Forever rapid clicks across actual React rerender;
2. Place/Put Away double tap under physical/touch browser timing;
3. Quest answer double tap under real event timing;
4. purchase/equip/place then refresh/re-entry;
5. refresh around final Quest-completion award;
6. localStorage loss with IndexedDB backup recovery;
7. malformed import recovery through the actual file input;
8. owned/equipped/placed item with no final art surviving refresh.

Do not promote persistence/economy to full runtime PASS until these execute.

## Performance classification

- production build and module graph: **PASS**;
- JS/CSS bundle sanity: **PASS as static evidence**;
- runtime errors during the 12 primary screenshots: **PASS**;
- reduced-motion helper tests: **PASS automated**;
- phone/tablet paint/composite cost, animation smoothness, memory, long-scroll performance, and browser reduced-motion behavior: **NOT TESTED**.

No performance regression is proven, but runtime performance is not release-cleared.

## Remaining release blockers beyond the 13 measured geometry failures

1. **Catalog completeness:** 93 items remain non-final; 23 interim Aura/companion assets still need visual approval before promotion.
2. **Side-by-side reference fidelity:** exact illustration/material/logo/character parity is BLOCKED until approved reference pixels are available to the comparator or an equivalent authoritative manual comparison is performed.
3. **Live persistence/economy stress:** the eight browser timing/re-entry cases above remain NOT TESTED.
4. **Real accessibility smoke:** keyboard traversal, focus clipping, measured contrast, and screen-reader smoke remain NOT TESTED.
5. **Runtime performance:** reduced-motion browser proof and phone/tablet paint/composite profiling remain NOT TESTED.
6. **Final coordinated rerun:** after screen-owner geometry/art fixes, both full CI and strict Playwright structural QA must pass on the exact release-candidate head.

## Handoff

Command Center / screen owners should fix in this order:

1. Quest outer geometry — learning-critical and 6 of the 13 strict failures;
2. Store lower-fold collection/value composition plus selected-detail/avatar geometry — 4 failures;
3. Home Room Progress height and the two lower-panel vertical positions — 3 failures;
4. continue catalog-art completion without changing stable IDs or ownership semantics;
5. rerun strict Playwright QA after each coordinated geometry batch rather than loosening tolerances;
6. when geometry stabilizes, run live persistence/accessibility/performance stress;
7. rerun the full test/build suite on the exact final runtime head;
8. update this file and `COMMAND_CENTER.md` only from measured PASS evidence.

**Replit must remain untouched. `main` must remain unmerged.**
