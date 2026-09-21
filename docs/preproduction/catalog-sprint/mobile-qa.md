# Catalog Sprint — Workstream 10 Mobile / Accessibility QA

STATUS: **PASS — CURRENT CANONICAL STORE PASSES CATALOG MOBILE/ACCESSIBILITY BROWSER GATE**

Branch: `screenshot-match-preproduction`  
Audited runtime head: `4d8bb9671b8c394db89d994de75ee4af3ccd578a`  
Catalog phase: `CATALOG_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## What changed

Workstream 10 added a dedicated branch-local Playwright catalog gate (`scripts/catalogMobileQa.mjs`) and GitHub Actions workflow. The gate builds the production bundle, serves the local production preview, opens Store through the real primary navigation, and exercises all 16 collections at desktop 1408×1056, phone 390×844, and phone 320×568 with reduced-motion emulation.

The first measured run exposed **52 release-blocking catalog UX defects**: 36 image-backed card cases lacked explicit intrinsic image dimensions and all 16 desktop collections used 11px item names / 10px prices. Two narrow Workstream-10 fixes were applied:

- Store catalog and selected-preview images receive square `width=512` / `height=512` intrinsic dimensions plus async decoding, preserving existing lazy loading and artwork.
- Dense desktop Store card names now render at 13px and prices at 11.5px, while phone layouts keep the existing larger two-column presentation.

No item IDs, prices, ownership, learning logic, catalog manifest entries, art assets, or producer lanes were changed.

## Final exact-head evidence

GitHub Actions run `35639821618`, job `106466219076`, artifact `10658055447` on exact head `4d8bb9671b8c394db89d994de75ee4af3ccd578a`.

Artifact digest: `sha256:b7aa40c7c0af6602607b06c284850d404ba89a85f2e242941361e2a8ee168230`.

Canonical/evidence hashes at the audited head:

- manifest blob: `862894db70500087409396dc5a72d032cf00a693`
- canonical catalog runtime blob: `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`
- game model blob: `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`
- Workstream 10 runtime blob: `8321cabf7deb6246adfabc69848fa3b3694c1d2f`
- Workstream 10 CSS blob: `35031e5d18de72fcd9b49b4e4a35a75340dac4dc`
- QA script blob: `e447d29ad9ca632f124e631429ad24592974d039`

**Final result: PASS, 0 release-blocking failures.**

## Browser checks

Across all 16 collections × all 3 viewports:

- category navigation: **48/48 PASS**
- page-level horizontal overflow: **48/48 PASS**
- critical card/category/tier touch targets: **48/48 PASS**
- readable item names, prices and visible item state: **48/48 PASS**
- Store card button semantics, focusability and accessible labels: **48/48 PASS**
- lazy image loading, image decode and accessible alternative semantics: **48/48 PASS**
- explicit image dimensions: **48/48 PASS**
- visible keyboard focus: **48/48 PASS**
- reduced-motion browser context: **48/48 PASS**
- Enter-key card activation: **48/48 PASS**
- runtime pageerror / console.error: **3/3 PASS**
- phone first-row two-column grid: **32/32 PASS**

Thirty-two screenshots are retained in the QA artifact: every collection at desktop and 390px phone. The 320px viewport was measured for the same behavioral/layout checks.

## Long-scroll / layout-stability probe

These measurements are **headless Chromium browser emulation, not physical-device performance**.

- Desktop 1408×1056: max page scroll 169px; 61 animation-frame samples; average 16.59ms; maximum 16.8ms; 0 frames >34ms; CLS 0.00156.
- Phone 390×844: max page scroll 2029px; average 16.41ms; maximum 16.8ms; 0 frames >34ms; CLS 0.
- Phone 320×568: max page scroll 2663px; average 16.40ms; maximum 16.8ms; 0 frames >34ms; CLS 0.

The current canonical Store loaded 175 catalog resources during the desktop sweep and 132 on each phone sweep. This is diagnostic browser evidence only and must not be presented as physical iPhone/iPad/Android performance clearance.

## Diagnostic progression

1. Head `fd7c1f0...`: **FAIL — 52 blockers** (36 explicit-image-dimension + 16 desktop readability).
2. Head `d22eb748...`: **FAIL — 16 blockers**; the dimension fix cleared all 36 dimension failures.
3. Head `4d8bb967...`: **PASS — 0 blockers** after desktop name/price readability correction.

The workflow now serializes catalog mobile QA and runs on integrated Store/runtime/manifest changes instead of every raw staged art commit. Staged producer art is not Store-visible until Workstream 08 integrates it.

## Important limits / handoff

This PASS clears Workstream 10's browser-emulated catalog mobile/accessibility checks for the **current canonical Store runtime**. It does **not** approve the overall catalog gate:

- Workstreams 01/14 still own independent visual acceptance of pending art.
- Workstream 08 still owns canonical manifest/runtime integration of accepted candidates.
- Physical iPhone/iPad/Android performance remains **NOT TESTED**.
- VoiceOver, TalkBack and NVDA remain **NOT TESTED**; browser semantics, labels, focus, keyboard activation and reduced-motion were verified.
- Future Workstream 08 manifest/runtime integrations must trigger this gate again before catalog completion.

Current Workstream 08 evidence still reports the canonical manifest/runtime unchanged at 99 final-portable items and blocked on independent art review, so this exact-head QA remains applicable to the current canonical Store even though later commits have staged additional unintegrated art.

**Handoff:** 08/14 can treat the current canonical Store mobile/browser behavior as PASS at the exact audited head, while continuing art review/integration. Workstream 10 remains active during `CATALOG_SPRINT` and should rerun this gate on the next canonical integration.
