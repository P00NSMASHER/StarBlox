# Workstream 14 — Visual Release QA

STATUS: **AUTOMATED TEST/BUILD PASS / RENDER + LIVE-BROWSER RELEASE GATES BLOCKED**

Branch: `screenshot-match-preproduction`
Automated source head verified: `583872b4083cd8d28b312da3c5c567eb9ce72b13`
Replit: **untouched**
Main: **not merged or modified**

## Consolidated integration QA

The coordinated preproduction branch now completes its full available GitHub CI gate successfully on the exact source head above.

GitHub Actions run `35627020800` / job `106423763469`:
- dependency install: **PASS**;
- Vitest: **18/18 test files PASS, 81/81 tests PASS**;
- production build: **PASS**;
- Vite 8.3.0 transformed **1,611 modules** and completed the production bundle;
- generated bundle sizes: CSS 164.29 kB (35.15 kB gzip), JS 299.66 kB (91.88 kB gzip).

## Integration defects found and fixed

The first coordinated CI passes exposed concrete integration defects rather than product-rule failures. The fixes were kept narrow and presentation-only:

1. **Store browser-API robustness** — `storeScreenshotMatchRuntime.js` no longer assumes `CSS.escape` exists; it uses native `CSS.escape` when available and a safe fallback otherwise. Its queued scan also exits safely if the DOM has already been torn down.
2. **Accessibility queued-scan teardown safety** — `mobileAccessibilityRuntime.js` now exits safely if its queued scan runs after the test/browser DOM has disappeared.
3. **Quest observer self-trigger loop** — `questScreenshotMatchRuntime.js` no longer repeatedly writes already-present CSS classes while observing `class` mutations. This removed the CI hang and preserved the same visual/runtime contract.

No answer key, question source, reward calculation, ownership rule, save field, price, item ID, mastery rule, or Quest count was changed by these fixes.

## Release-gate classification

| Gate | Status | Evidence / remaining work |
| --- | --- | --- |
| Full automated tests | **PASS** | 18 files / 81 tests pass on `583872b...`. |
| Production build | **PASS** | Vite production build passes on the same source head. |
| Learning integrity | **PASS — automated** | 200-question bank, exact keyed-answer structure, audited semantic families, deterministic five-action Quest, and retry/evidence policy all pass. |
| Persistence/economy regression | **PASS — automated / NOT TESTED live** | Storage recovery, unknown/no-art ID preservation, rapid purchase, room toggle, and Quest double-tap tests pass. Browser refresh/re-entry and IndexedDB timing still require live stress. |
| Store structural integrity | **PASS — automated** | Exactly 192 unique permanent Store IDs remain; Store screenshot runtime and DOM idempotence pass. |
| Catalog manifest integrity | **PASS — automated / FAIL completeness** | Manifest entries map to stable Store metadata with unique existing paths and interim assets are not promoted. Only 99/192 are final-portable. |
| Home screenshot fidelity | **NOT TESTED rendered** | Reference composition is implemented; authoritative pixel/viewport proof is still required. |
| Store screenshot fidelity | **NOT TESTED rendered / BLOCKED by catalog coverage** | Selected-item rail, try-on stage, dense grid and detail actions are implemented; rendered proof plus remaining art coverage are required. |
| Quest screenshot fidelity | **NOT TESTED rendered** | Screenshot-match composition and learning contract are implemented; desktop/tablet/390/320 rendered proof is required. |
| HUD / avatar / buddy | **NOT TESTED rendered** | Shared shell and character presentation are implemented and automated tests pass where applicable; final visual proof is absent. |
| Mobile / accessibility | **PASS static+automated / NOT TESTED browser** | Responsive/accessibility tests pass; real 1024/tablet/390/320 overflow, keyboard, focus, contrast and screen-reader smoke remain unverified. |
| Motion / reduced motion | **PASS automated / NOT TESTED browser performance** | Bounded-motion and reduced-motion helpers pass; real paint/composite cost and visual intensity remain unverified. |
| Environment art | **IMPLEMENTED / NOT TESTED rendered** | Brightside bedroom, learning room and boutique are integrated; crop, contrast and performance need browser proof. |
| Replit integration | **BLOCKED BY DESIGN** | Replit remains intentionally untouched until this preproduction gate is fully cleared. |

## Catalog / environment accounting

Current `catalog-art-manifest.json` state:
- target: **192**;
- final-portable: **99** (**51.56%**);
- remaining final art: **93**;
- interim-not-verified: **23** (12 Aura assets and companions 2–12);
- duplicate asset paths: **0**.

The three primary original environment scenes are implemented. Environment completion is therefore primarily a rendered crop/readability/performance gate, while catalog completion remains a material Store visual-fidelity dependency.

## Remaining release blockers

1. **Rendered screenshot proof:** capture and compare Home, Store and Quest at 1408×1056, 1024 landscape/tablet, 390 px and 320 px. Do not infer visual PASS from CSS/static tests.
2. **Catalog visual coverage:** complete or explicitly release-approve the remaining 93 non-final items and visually inspect the 23 interim Aura/companion assets. Primary Store surfaces must not depend on generic fallback presentation for release-quality screenshot parity.
3. **Live persistence/economy stress:** rapid Buy Forever across rerender; room Place/Put Away double tap; Quest answer double tap; purchase/equip/place + refresh/re-entry; Quest completion refresh edge; localStorage loss with IndexedDB recovery; malformed import recovery; no-art owned ID persistence.
4. **Real-browser accessibility/responsive QA:** no page-level horizontal overflow, fixed HUD/dock clearance, ≥44 px critical targets, keyboard focus order, visible focus rings, measured contrast and at least one screen-reader smoke test.
5. **Motion/environment performance:** verify reduced-motion behavior and profile major scene/motion paint/composite cost on phone/tablet class hardware.

## Release decision

**READY FOR SINGLE REPLIT INTEGRATION: NO.**

The automated code gate is green, but rendered visual proof, live browser state stress, accessibility/device proof, and catalog-art coverage remain release blockers. Replit must remain untouched and `main` must remain unmerged until those blockers are cleared and the Command Center records a final release decision.
