# Catalog Sprint — Workstream 10 Mobile / Accessibility QA

STATUS: **PASS — EXTENDED CANONICAL STORE BROWSER GATE, 0 RELEASE-BLOCKING FAILURES**

Branch: `screenshot-match-preproduction`  
Audited runtime head: `81bbf06dc070b0f72f942dde9c14ac4bba476922`  
Catalog phase: `CATALOG_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## This pass

Workstream 10 closed a real narrow-screen keyboard defect rather than rerunning the prior catalog sweep unchanged. Extended keyboard traversal exposed a 320px Store category tray case where Chromium's native focus scrolling could leave the newly focused category partly clipped. A first snap-alignment attempt was deliberately rejected after partial browser evidence showed it could interfere with pointer category navigation and wider desktop/tablet focus positioning.

The final fix in `src/mobileAccessibilityRuntime.js` keeps the horizontal reveal behavior keyboard-only through `:focus-visible`, uses snap-aligned correction only for the narrow category tray, preserves the minimal-delta behavior on wider layouts, and rechecks after Chromium's native focus scrolling settles. Pointer/touch clicks no longer move the tray during the press/release sequence. A targeted jsdom regression covers the 320px snapped-category alignment.

No item IDs, prices, ownership, learning logic, economy logic, catalog manifest entries, producer art, or saved player data were changed.

## Exact passing evidence

GitHub Actions run `35652513733`, job `106508054482`, artifact `10662478311` on exact source head `81bbf06dc070b0f72f942dde9c14ac4bba476922`.

Artifact digest: `sha256:0d18c7f21a2f04208c17199d0a8ab945690358d33b7d6c1cd0efb458387802e4`  
Artifact: 36 files, 16,916,667-byte ZIP.

Canonical/evidence hashes:

- manifest blob: `862894db70500087409396dc5a72d032cf00a693`
- canonical catalog runtime: `fcf502b18a51781b415b7ba3620e9b8eb66d37e3`
- Workstream-10 runtime: `272fb9b6a95a38eba4696c7d732d805621a52f49`
- Workstream-10 CSS: `d1bf7ac11815a59baee4ccf45b58ec2ad40b6694`
- QA harness: `3a563274fc4a069fe57062f9fcb0574a324a5533`
- targeted runtime test: `b0fe447b8b7bd2637b4d5865d66992f7f23f34d7`

The production build inside the browser workflow passed with Vite 8.3.0: 1,613 modules transformed; CSS 167.39 kB / 35.69 kB gzip; JS 304.14 kB / 93.34 kB gzip. The repository test/build check on the same runtime commit also passed.

A branch comparison from the audited runtime head to descendant `354590ca34c9f4265c99fdcc336e19be6a667b2a` found only `docs/preproduction/catalog-sprint/persistence-qa.json` changed. No Store, manifest/runtime, catalog asset, Workstream-10 runtime/CSS or QA-harness file changed in that interval, so this Workstream-10 evidence remains applicable until a later relevant change.

**Final catalog-mobile result: PASS, 0 release-blocking failures.**

## Full canonical Store matrix

The reduced-motion matrix exercised all 16 collections at desktop `1408×1056`, tablet `1024×768`, phone `390×844`, and phone `320×568` — 64 collection/viewport combinations.

| Check | Result |
| --- | --- |
| Category navigation | **64/64 PASS** |
| Page-level horizontal overflow | **64/64 PASS** |
| Critical card/category/tier touch targets | **64/64 PASS** |
| Readable names, prices and visible states | **64/64 PASS** |
| Card semantics, keyboard focus and accessible labels | **64/64 PASS** |
| Image loading and alternative semantics | **64/64 PASS** |
| Explicit intrinsic image dimensions | **64/64 PASS or honestly no image-backed canonical card yet** |
| Visible keyboard focus | **64/64 PASS** |
| Reduced-motion context | **64/64 PASS** |
| Enter-key card activation | **64/64 PASS** |
| Phone first-row two-column grid | **32/32 PASS** |
| Real Tab traversal reaches tiers + cards without clipping/fixed-chrome obstruction | **4/4 PASS** |
| Last-card keyboard reachability below/around fixed HUD/dock | **4/4 PASS** |
| Reduced-motion active-animation check | **4/4 PASS; 0 active animations, 0ms longest finite animation** |
| Runtime `pageerror` / `console.error` | **4/4 PASS** |

The gate also retained screenshots of all 16 canonical collections at desktop 1408px and phone 390px. Tablet and 320px behavior was measured by the same strict browser script.

## Scroll / layout-stability evidence

These are **Playwright 1.55 headless Chromium measurements on GitHub Actions Ubuntu 24.04**, not physical-device performance claims.

| Viewport | Max scroll | Avg frame | Frames >34ms | Catalog resources | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1408×1056 | 169px | 16.3ms | 0/61 | 187 | 0.0000 |
| 1024×768 | 612px | 16.2ms | 0/61 | 144 | 0.0040 |
| 390×844 | 2029px | 16.4ms | 0/61 | 132 | 0.0000 |
| 320×568 | 2663px | 16.4ms | 0/61 | 132 | 0.0000 |

Normal-motion controls were added instead of relying only on reduced-motion emulation. Tablet `1024×768` passed with four first-row columns, 0px horizontal overflow, 16.4ms average frame time and 0/61 frames above 34ms. Phone `390×844` passed with two first-row columns, 0px overflow, 16.6ms average frame time and 0/61 frames above 34ms. Neither normal-motion control produced a page error or `console.error`.

## Contrast status

Exact rendered text contrast remains **NOT TESTED**, deliberately. The catalog text samples sit over gradients, images and/or translucent layers; the automated solid-background sampler could not derive an unambiguous opaque background, so Workstream 10 refused to manufacture a contrast ratio. Exact rendered contrast still needs screenshot/device-aware sampling or a human/device accessibility pass.

## Canonical-versus-staged boundary

This PASS applies to the **current canonical Store manifest/runtime only**. The manifest is still v12 with 192 target IDs, 99 recorded `final-portable` and 93 remaining relative to that label. Staged or replacement art that Workstream 08 has not canonically integrated is explicitly outside this evidence.

That distinction is visible in the browser run: lighting, wall, rugs and decor currently had no canonical image-backed cards; seating and desks each had only their currently canonical first image. Their staged art can be reviewed in the staged-art pipeline, but it is not part of this canonical Store PASS. Workstream 10 must rerun the changed collections plus a stable control after Workstream 08 integrates new accepted art, with another full 16-collection sweep at a coherent catalog milestone or final gate.

## Limits / handoff

Physical iPhone/iPad/Android performance remains **NOT TESTED**. VoiceOver, TalkBack and NVDA remain **NOT TESTED**. Browser semantics, labels, focus-visible behavior, keyboard activation, full Tab traversal, long-scroll reachability and reduced-motion behavior are now directly exercised. Exact rendered contrast remains **NOT TESTED** for the reason above.

This PASS does **not** approve the catalog gate. Workstream 14 still owns final catalog release QA, Workstream 08 still owns canonical integration, and independent visual acceptance remains a separate requirement.

**Handoff:** 08/14 may treat the current canonical Store's browser-emulated mobile/accessibility behavior as PASS at the hashes above. On the next canonical art integration, rerun the affected collection(s) plus a stable control immediately; do not spend an unchanged cycle rerunning the whole catalog.
