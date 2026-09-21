# Catalog Sprint — Workstream 10 Mobile / Accessibility QA

STATUS: **PASS — FIRST V2 CANONICAL ART BATCH / 0 MOBILE RELEASE BLOCKERS**

Branch: `screenshot-match-preproduction`  
Audited runtime head: `8a2c53aa2133baef23e263d8dda8b2a180dffe19`  
Catalog phase: `CATALOG_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## Why this run was warranted

The previous Workstream-10 PASS was tied to manifest v12/runtime hashes. Workstream 08 has now completed the first V2 exact-hash canonical art integration, so the canonical Store really changed and prior unchanged-hash proof was no longer sufficient.

Manifest v13 promoted four independently accepted Companion replacements:

- `companions-3` Berry Bunny → `/assets/catalog-candidates/chat-20260921-intake01/companions-3-detail.webp` (`adba95dc769e603337dc4ac38b9a513ce9914b10`)
- `companions-4` Sunny Bird → `/assets/catalog-candidates/chat-20260921-intake01/companions-4-detail.webp` (`b382339e76ed9d4aeae72b1c8cccc904abf85b57`)
- `companions-10` Pixel Bot → `/assets/catalog-candidates/chat-20260921-intake01/companions-10-detail.webp` (`2b09d950b08083bb3a9ec5e2073ae23d88411cf4`)
- `companions-11` Dream Dragon → `/assets/catalog-candidates/chat-20260921-intake01/companions-11-detail.webp` (`465fe45abbe4d9b4355444cb3f75a49927b604e9`)

All four are 768×768 WebP files. Stable IDs, prices, unlock rules, ownership, learning, economy and saves were not changed by the integration.

Because this was the **first accepted V2 canonical art batch**, it was treated as a coherent catalog milestone and the full 16-collection browser matrix was run once. For later small batches Workstream 10 will return to the narrower rule: changed collection(s) plus one stable control at 1408/1024/390/320, reserving another full matrix for a coherent milestone or final gate.

## Exact evidence

GitHub Actions run `35659760652`, job `106532044131`, artifact `10667595844` on source head `8a2c53aa2133baef23e263d8dda8b2a180dffe19`.

Artifact digest: `sha256:7a5d1cb254d00086f95889dc316087116dfb7d245cda02755c42705efabc1607`  
Artifact: 36 files, 17,010,331-byte ZIP.

Canonical hashes:

- manifest v13 blob: `54fb26beca9b8da5f17472193831ee8248ffd3a4`
- catalog runtime blob: `b350940b703ea2934062e183c5529ad9f9b7f810`
- Workstream-10 runtime: `272fb9b6a95a38eba4696c7d732d805621a52f49`
- Workstream-10 CSS: `d1bf7ac11815a59baee4ccf45b58ec2ad40b6694`
- catalog mobile QA script: `3a563274fc4a069fe57062f9fcb0574a324a5533`

Production build inside the browser workflow: **PASS**, Vite 8.3.0, 1,613 modules, CSS 167.39 kB / 35.69 kB gzip, JS 304.31 kB / 93.39 kB gzip.

## Browser result

**CATALOG_MOBILE_QA_STATUS = PASS**  
**release-blocking failures = 0**

Playwright 1.55 Chromium headless on GitHub Actions Ubuntu 24.04 exercised reduced-motion Store behavior at `1408×1056`, `1024×768`, `390×844`, and `320×568`, plus normal-motion controls at `1024×768` and `390×844`.

| Check | Result |
| --- | --- |
| Category navigation | **64/64 PASS** |
| Page-level horizontal overflow | **64/64 PASS** |
| Critical card/category/tier touch targets | **64/64 PASS** |
| Readable names, prices and states | **64/64 PASS** |
| Card semantics, focusability and accessible labels | **64/64 PASS** |
| Image loading and alternatives | **64/64 PASS** |
| Explicit intrinsic image dimensions | **64/64 PASS or no image-backed canonical card yet** |
| Visible keyboard focus | **64/64 PASS** |
| Reduced-motion context | **64/64 PASS** |
| Enter-key card activation | **64/64 PASS** |
| Phone two-column grid | **32/32 PASS** |
| Tab traversal tiers → cards, no clipping/fixed-HUD obstruction | **4/4 PASS** |
| Last-card keyboard reachability | **4/4 PASS** |
| Reduced-motion active-animation check | **4/4 PASS; 0 active animations** |
| Runtime `pageerror` / `console.error` | **4/4 PASS** |

### Changed Companions collection

The canonical Companions collection now renders **12/12 image-backed cards** at every tested viewport. All 12 loaded successfully, exposed alternative semantics, declared intrinsic width/height, remained readable, showed visible keyboard focus, and supported Enter-key selection. At `390px` and `320px`, the first row remained exactly **2 columns** with no page-level horizontal overflow.

### Stable control

Tops was retained as the stable control and passed the same loading, intrinsic-dimension, readability, focus, keyboard and phone-grid checks at all four reduced-motion viewports.

## Scroll / layout stability

These are **headless Chromium emulation measurements**, not physical-device performance claims.

| Viewport | Max scroll | Avg frame | Frames >34ms | Catalog resources | CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1408×1056 | 169px | 16.1ms | 0/61 | 168 | 0.0016 |
| 1024×768 | 612px | 16.3ms | 0/61 | 140 | 0.0040 |
| 390×844 | 2029px | 16.3ms | 0/61 | 128 | 0.0000 |
| 320×568 | 2663px | 16.2ms | 0/61 | 128 | 0.0000 |

Normal-motion controls also passed: tablet `1024×768` stayed at four first-row columns and phone `390×844` at two, both with `0px` horizontal overflow, about `16.4ms` average frame time, `0/61` frames over 34ms and no runtime errors.

## Contrast / assistive technology

Exact rendered color contrast remains **NOT TESTED**. The existing automated sampler deliberately refuses to fabricate ratios where text is composited over gradients, images or translucent layers. Final screenshot/device-aware measurement is still required.

Physical iPhone/iPad/Android performance remains **NOT TESTED**. VoiceOver, TalkBack and NVDA remain **NOT TESTED**. Browser semantics, focus, keyboard activation, reachability and reduced-motion behavior are directly verified, but they are not substitutes for physical-device or screen-reader evidence.

## Deterministic screenshot capture support

The final deterministic Home/Store/Quest capture path is prepared:

- workflow: `.github/workflows/reference-screenshot-capture.yml`
- script: `scripts/referenceScreenshotCapture.mjs`
- controlled production build + Chromium preview
- deterministic target viewports
- screenshot artifacts, keyboard/focus checks, contrast tooling and optional pixel-diff support

The expected source directory `docs/preproduction/reference-screenshots` is currently absent. Therefore **pixel-identical reference comparison remains BLOCKED on the original user reference image files becoming repository-accessible**. Generated promotional collages are not valid substitutes.

## Handoff

- Workstream 08 may treat this four-Companion canonical batch as **mobile/accessibility browser PASS** at the exact hashes above.
- Workstream 14 may reuse artifact `10667595844` for canonical Store screenshots, while keeping visual-art acceptance and catalog release QA separate.
- On the next small canonical integration, Workstream 10 should test only the changed collection(s) plus one stable control at all four viewports, normal + reduced motion as applicable.
- Run another full 16-collection sweep only at a coherent catalog milestone or final release gate.
- Do not approve the catalog gate from this result: only **4/192** current item hashes are canonically accepted, and final visual, persistence, physical accessibility and reference-parity gates remain separate.

Replit/Floot and `main` remain untouched.
