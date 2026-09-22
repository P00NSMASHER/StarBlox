# Catalog Sprint — Workstream 10 Small-Card / Mobile Visual QA

STATUS: **BLOCKED — manifest v28 / canonical Rugs 12 reached the real responsive browser gate, but Store entry failed before any catalog card rendered**

Branch: `screenshot-match-preproduction`  
Audited branch head before report: `7be62a229f68f99713f821e63c30d8e1bdeba3f3`  
Phase: `ART_VISUALS_SPRINT`  
Catalog gate: **NOT APPROVED by Workstream 10**  
Replit/Floot/main/deployment/player data: **untouched**

## Change-aware result

Workstream 08 has now canonically wired the independently accepted **Luxe Star Rug (`rugs-12`)**. Current catalog evidence is manifest **v28**, blob `7933d7e0b1a7fd94a804b135ced83ae4e045c8f4`, with `finalCount: 157 / 192`, and catalog runtime blob `b44d1bad174f36167ff2909d37463f256c5cc50c`. The exact Rugs 12 asset remains `/assets/catalog/rugs-12-w07-v3.png`, Git blob `eea2fc5b78c1186342f91f597bc792160ab8f8fe`, SHA-256 `21a2f71224d9a7d4e0e60a672867cc629f21a481c3310fee6b1cac1c1be071b3`. Reviewer 14 owns the independent ACCEPT; Workstream 10 did not self-approve or alter the mapping.

Because this was a real canonical change, the existing changed-batch workflow legitimately ran again instead of reusing the old blocked result. `StarBlox Catalog Mobile QA` run `35707148100`, job `106678715888`, source head `6666f15536ac8d5cacedcd0a282ad24364abf146`, built the production bundle successfully and exercised headless Chromium on GitHub Actions Ubuntu 24.04 using Playwright 1.55 / Chromium 140.0.7339.16. The artifact is `10684444909`, digest `sha256:2350c5784c2944f6c5c421fa4582b2196d95a041d20b631c29c3c33b78b008c6`.

The responsive result is **FAIL / BLOCKED 6 of 6 before Store content**. In reduced-motion mode, 1408×1056, 1024×768, 390×844 and 320×568 all resolved the Store button as visible, enabled and stable, scrolled it into view, began the real pointer click, and then timed out after 30 seconds before any Store card rendered. Normal-motion controls at 1024×768 and 390×844 failed the same way. No forced DOM click, keyboard substitute, skipped assertion or static screenshot was used.

Structured blocker: **`CANONICAL_STORE_ENTRY_POINTER_TIMEOUT_BEFORE_CARD_RENDER`**. This is now reproduced across three canonical batches: Shoes 7–10, Aura 11, and current Rugs 12 / manifest v28. Workstream 15 remains the shared-entrypoint owner. Five commits after the Rugs 12 integration changed only lane/review documentation and a Home visual board; manifest, catalog runtime and Store entry did not change, so the v28 failure remains hash-valid for the current catalog runtime state.

## Rugs 12 visual evidence boundary

The exact Rugs 12 bytes are unchanged from the previously inspected staged fixture, so DELIVERY_PROTOCOL_V2 reuses that proof rather than rerendering identical staged cards. In the staged 210/140/110px diagnostics, Rugs 12 retained its star silhouette, warm center, dark outer form, tassel extensions, contain framing and Tier-5 richness; accepted Rugs 11 remained the stable control. No new artwork-quality failure label is warranted from unchanged staged pixels.

That staged result is **not** a responsive Store PASS. Because the real Store never opened, current Rugs 12 silhouette recognition, card/detail contrast, crop/contain behavior, transparent edges, detail-panel composition, image decode/intrinsic dimensions, scrolling/layout stability, premium-detail retention, HUD/dock reachability and overflow at 1408/1024/390/320 are all **NOT TESTED beyond the Store-entry failure**. No screenshot of the current canonical Rugs grid/detail was produced by this run.

## Regression gates remain visible

The same integration head also has a red `StarBlox CI` run `35707148157`. The catalog manifest invariants, learning, persistence/economy, accessibility helper and Store screenshot-match tests all passed; in total **99 tests passed**. CI is still correctly red because Vitest found `scripts/artPromptOptimizer.test.mjs` but reported **“No test suite found”** for that file, causing the later CI build step to be skipped. Workstream 10 did not weaken or bypass that separate art-learning/shared regression gate.

## Handoff

Workstream 15: repair or coordinate the real Store pointer-entry path without weakening the assertion or substituting another activation mechanism. Once that shared path actually changes, Workstream 10 should run **Rugs + one stable control only** at 1408×1056, 1024×768, 390×844 and 320×568 in normal/reduced-motion modes, covering silhouette, contrast, crop/contain, transparent edges, detail composition, loading/decode/dimensions, scrolling/layout stability, touch/focus/keyboard, fixed HUD/dock clearance and overflow. Do not rerun the same full matrix while the entrypoint remains byte-for-byte unchanged.

Physical iPhone/iPad/Android performance and VoiceOver/TalkBack/NVDA remain **NOT TESTED**. Headless Chromium and staged fixture evidence are not physical-device or screen-reader proof. The authoritative desktop Store target remains `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`, SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`.

No shared UI, canonical mapping, producer art, stable item metadata, gameplay, learning, persistence, economy, real player data, Replit, Floot, `main`, deployment, purchases, paid settings or secrets were changed by Workstream 10.
