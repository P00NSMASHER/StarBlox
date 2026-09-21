# Workstream 10 — Mobile Accessibility QA

STATUS: **CATALOG_SPRINT / FIRST ACCEPTED CANONICAL ART BATCH PASS / 0 MOBILE RELEASE BLOCKERS**

Branch: `screenshot-match-preproduction`  
Audited source head: `8a2c53aa2133baef23e263d8dda8b2a180dffe19`  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## Current result

Workstream 08 changed the canonical Store for the first V2 independently accepted art batch, promoting four Companion replacements. That invalidated the earlier unchanged-manifest continuity shortcut, so Workstream 10 exercised the actual canonical Store again.

GitHub Actions run `35659760652` / job `106532044131` completed successfully with artifact `10667595844`, digest `sha256:7a5d1cb254d00086f95889dc316087116dfb7d245cda02755c42705efabc1607`.

**Catalog mobile/accessibility result: PASS — 0 release-blocking failures.**

Canonical hashes under test:

- manifest v13: `54fb26beca9b8da5f17472193831ee8248ffd3a4`
- runtime: `b350940b703ea2934062e183c5529ad9f9b7f810`
- Workstream-10 runtime: `272fb9b6a95a38eba4696c7d732d805621a52f49`
- Workstream-10 CSS: `d1bf7ac11815a59baee4ccf45b58ec2ad40b6694`
- catalog QA script: `3a563274fc4a069fe57062f9fcb0574a324a5533`

The changed canonical IDs are `companions-3`, `companions-4`, `companions-10`, and `companions-11`, all 768×768 WebP replacements. IDs, prices, unlocks, ownership and saved-state semantics were unchanged.

## Browser coverage

The first V2 canonical art batch was treated as a coherent milestone, so the full 16-collection matrix was run once at:

- desktop `1408×1056`
- tablet `1024×768`
- phone `390×844`
- phone `320×568`

Reduced-motion coverage included all 64 collection/viewport combinations. Normal-motion controls were retained at tablet 1024 and phone 390.

Passing checks:

- category navigation: **64/64**
- no page-level horizontal overflow: **64/64**
- touch targets: **64/64**
- readable card name/price/state: **64/64**
- card semantics and accessible labels: **64/64**
- image loading and alternatives: **64/64**
- explicit image dimensions or honestly no image-backed card yet: **64/64**
- visible focus: **64/64**
- reduced-motion context: **64/64**
- Enter-key card activation: **64/64**
- phone two-column first row: **32/32**
- Tab traversal without clipping/fixed-HUD obstruction: **4/4**
- last-card keyboard reachability: **4/4**
- runtime errors: **4/4**
- reduced-motion active animations: **0** across all four primary viewports

The changed Companions collection showed **12/12 loaded image-backed cards** at every tested viewport with explicit intrinsic dimensions and accessible alternative semantics. At 390px and 320px the collection remained exactly two columns with no horizontal page overflow.

## Performance / stability evidence

Headless Chromium emulation only:

| Viewport | Max scroll | Avg frame | >34ms frames | CLS |
| --- | ---: | ---: | ---: | ---: |
| 1408×1056 | 169px | 16.1ms | 0/61 | 0.0016 |
| 1024×768 | 612px | 16.3ms | 0/61 | 0.0040 |
| 390×844 | 2029px | 16.3ms | 0/61 | 0.0000 |
| 320×568 | 2663px | 16.2ms | 0/61 | 0.0000 |

Normal-motion controls at 1024 and 390 averaged about 16.4ms/frame with 0/61 frames over 34ms, 0px horizontal overflow and no runtime errors.

The production build inside this QA run passed with Vite 8.3.0: 1,613 modules transformed; CSS 167.39 kB / 35.69 kB gzip; JS 304.31 kB / 93.39 kB gzip.

## Deterministic screenshot-capture support

The final Home/Store/Quest capture/diff path exists:

- `.github/workflows/reference-screenshot-capture.yml`
- `scripts/referenceScreenshotCapture.mjs`

It builds the production bundle, captures controlled Chromium screenshots, supports keyboard/focus and contrast checks, and can perform pixel diffs when real references are present.

The directory `docs/preproduction/reference-screenshots` is currently absent, so **exact pixel-diff parity is BLOCKED on the original user reference files becoming repository-accessible**. Generated promotional collages are explicitly not acceptable references.

## Remaining limitations

- **NOT TESTED — exact rendered WCAG contrast ratios** where text sits over gradients/images/translucent backgrounds. The solid-background sampler deliberately declines to invent a ratio.
- **NOT TESTED — physical iPhone/iPad/Android performance.** Current timings are headless Chromium emulation.
- **NOT TESTED — VoiceOver/TalkBack/NVDA.** Browser semantics, focus, labels, keyboard activation and reachability pass, but that is not screen-reader-device evidence.
- Catalog release is still not complete: only four current hashes are canonically accepted; visual acceptance/integration of the rest is outside Workstream 10.

## Handoff

1. Workstream 08 may reuse this exact four-Companion canonical mobile/accessibility PASS.
2. Workstream 14 may reuse artifact `10667595844` for canonical Store screenshots while keeping final visual-art acceptance separate.
3. For the next small canonical art batch, test **only changed collection(s) + one stable control** at 1408/1024/390/320. Reserve another full 16-collection matrix for a coherent milestone or the frozen final candidate.
4. When `GAME_FINISHING` begins, audit Home/Store/Quest/World/Study/Room/Avatar across target widths, then close physical-device/screen-reader/contrast evidence where available.
5. Final screenshot parity requires the actual original reference pixels; do not substitute generated mockups.

No learning, economy, inventory, save state, manifest mappings or producer art were edited by Workstream 10. Replit/Floot and `main` remain frozen.
