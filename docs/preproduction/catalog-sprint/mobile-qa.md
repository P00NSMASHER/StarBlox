# Catalog Sprint — Workstream 10 Mobile / Accessibility QA

STATUS: **PASS — EXTENDED CANONICAL STORE BROWSER GATE, CURRENT CANONICAL HASHES UNCHANGED**

Branch: `screenshot-match-preproduction`  
Audited runtime head: `81bbf06dc070b0f72f942dde9c14ac4bba476922`  
Observed descendant before this report: `b8d8dc1bdea4c1790c445fd210cbf1023a8f5f4e`  
Catalog phase: `CATALOG_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## This pass

Workstream 10 did **not** rerun the unchanged 16-collection canonical Store matrix merely because the schedule fired. A Git comparison from the exact browser-proven runtime head through the current descendant found no change to `catalog-art-manifest.json`, `src/catalogArtRuntime.js`, Store runtime/styles, Workstream-10 runtime/CSS, or the catalog-mobile QA harness.

The material new files are six Workstream-07 replacement Tops JPEGs (`tops-1-w07-v2.jpg` through `tops-6-w07-v2.jpg`) plus staged-art workflow/review/coordination changes. Those six images are **branch-staged candidates, not canonical Store mappings**, so they are explicitly excluded from this canonical PASS. Workstream 14 owns the staged card/detail render fixture and Workstream 01 owns their independent visual disposition. Workstream 10 will exercise the Tops collection plus one stable control immediately after Workstream 08 canonically wires an independently accepted replacement hash.

This is a continuity/evidence pass, not a claim that staged images have passed mobile QA.

No item IDs, prices, ownership, learning logic, economy logic, catalog manifest mappings, producer art, or saved player data were changed by Workstream 10.

## Exact passing evidence retained

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

**Current canonical catalog-mobile result remains PASS, 0 release-blocking failures, because the relevant runtime/manifest hashes are unchanged.**

## Full canonical Store matrix retained

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

The gate retained screenshots of all 16 canonical collections at desktop 1408px and phone 390px. Tablet and 320px behavior were measured by the same strict browser script.

## Scroll / layout-stability evidence retained

These are **Playwright 1.55 headless Chromium measurements on GitHub Actions Ubuntu 24.04**, not physical-device performance claims.

| Viewport | Max scroll | Avg frame | Frames >34ms | Catalog resources | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1408×1056 | 169px | 16.3ms | 0/61 | 187 | 0.0000 |
| 1024×768 | 612px | 16.2ms | 0/61 | 144 | 0.0040 |
| 390×844 | 2029px | 16.4ms | 0/61 | 132 | 0.0000 |
| 320×568 | 2663px | 16.4ms | 0/61 | 132 | 0.0000 |

Normal-motion controls also passed: tablet `1024×768` used four first-row columns with 0px horizontal overflow and 16.4ms average frame time; phone `390×844` used two columns with 0px overflow and 16.6ms average frame time. Both had 0/61 frames over 34ms and no runtime errors.

## Staged-candidate boundary

New branch-stored but non-canonical assets observed this cycle:

- `/assets/catalog/tops-1-w07-v2.jpg`
- `/assets/catalog/tops-2-w07-v2.jpg`
- `/assets/catalog/tops-3-w07-v2.jpg`
- `/assets/catalog/tops-4-w07-v2.jpg`
- `/assets/catalog/tops-5-w07-v2.jpg`
- `/assets/catalog/tops-6-w07-v2.jpg`

They are **not included** in the canonical Store evidence above. Workstream 14's staged-art path may render them before integration; that is staged-fixture evidence only. Workstream 10's next executable catalog action begins after Workstream 08 changes the canonical mapping: test the changed collection plus one unchanged control at desktop/tablet/390/320, then reserve a full 16-collection sweep for a coherent catalog milestone or final gate.

## Contrast / assistive-technology status

Exact rendered text contrast remains **NOT TESTED**, deliberately. The catalog text sits over gradients, images and translucent layers; the existing solid-background sampler cannot derive a defensible WCAG ratio and Workstream 10 will not fabricate one. This has now remained unchanged across repeated passes, so the final screenshot/device-aware contrast check is explicitly handed to Workstream 15 / final accessibility QA rather than triggering another unchanged automated catalog sweep.

Physical iPhone/iPad/Android performance remains **NOT TESTED**. VoiceOver, TalkBack and NVDA remain **NOT TESTED**. Browser semantics, labels, focus-visible behavior, keyboard activation, full Tab traversal, long-scroll reachability and reduced-motion behavior are directly exercised, but those automated results are not physical-device or screen-reader evidence.

## Canonical-versus-staged boundary

The manifest remains v12 with 192 target IDs, 99 recorded `final-portable`, and 93 remaining relative to that legacy label. Lighting, wall, rugs and decor still lack canonical image-backed coverage in this manifest version; seating and desks each have only their currently canonical first image. Staged/replacement art stays outside this PASS until Workstream 08 integrates it.

This PASS does **not** approve the catalog gate. Workstream 14 owns final catalog release QA, Workstream 08 owns canonical integration, and independent visual acceptance remains a separate requirement.

**Handoff:** 08/14 may continue to reuse the current canonical Store mobile/accessibility PASS at the exact hashes above. Do not rerun the unchanged full catalog because of staged-only files. After the next canonical art integration, immediately test affected collection(s) plus a stable control, with exact runtime/manifest/asset hashes and normal + reduced-motion browser evidence.
