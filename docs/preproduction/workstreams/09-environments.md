# Workstream 09 — Environment / Room Backgrounds

STATUS: **PREMIUM ORIGINAL ENVIRONMENT PASS IMPLEMENTED / FULL BUILD + RENDER QA PENDING**

Branch: `screenshot-match-preproduction`

## Completed this pass

- Read the screenshot-match target, coordination contract, current Home runtime/composition, Quest visual/screenshot-match layers, Store screenshot-match layer, and the latest branch before editing.
- Added three original 1408×1056 Brightside City environment illustrations under `public/assets/environments/`:
  - `brightside-bedroom.svg` — warm pink/lilac bedroom for Home with soft daylight, Brightside City window, desk, bed, shelves, books, trophy, plant, lamp, central star rug, sparkles, and a deliberately quieter center for the avatar.
  - `brightside-learning-room.svg` — warm learning room for Quest/Study with Brightside City windows, whiteboard, bookshelves, trophies, desk, reading chair, plant, lamp, rug, and central readability wash.
  - `brightside-boutique.svg` — polished boutique-bedroom environment for Store with wardrobe, vanity, shelves, trophy, display pedestal, plant, reading chair, sparkles, and city daylight.
- Added `src/environmentArt.css` as an additive final environment layer rather than rewriting existing Home/Store/Quest layout code.
- Wired `environmentArt.css` last from `src/main.jsx`, allowing environment art to sit beneath the existing screenshot-match chrome while preserving each specialist workstream’s panel geometry.
- Home now uses the premium Brightside bedroom art beneath the avatar/panels, with a controlled vignette and subtle sparkle overlay for legibility.
- Quest now uses the Brightside learning room behind the lesson composition while retaining the approved light reading surface and darkened edge zones under the avatar/mastery rails.
- Store now uses the Brightside boutique room beneath Store chrome; the right-side avatar try-on stage keeps a quiet translucent pink/lilac treatment so equipped-item previews remain legible.
- Study inherits the Brightside learning-room family to keep the product visually coherent.
- Added desktop/tablet/phone background positioning rules so the central subject/readability zones remain useful when `cover` crops the 1408×1056 art.
- Added a reduced-motion rule so Home background staging does not retain decorative transform motion under `prefers-reduced-motion`.
- No third-party, Roblox, Brookhaven, branded, or recognizable character imagery was used. The SVGs are original StarBlox/Brightside scene artwork.

## Files changed

- `public/assets/environments/brightside-bedroom.svg`
- `public/assets/environments/brightside-learning-room.svg`
- `public/assets/environments/brightside-boutique.svg`
- `src/environmentArt.css`
- `src/main.jsx` — one final CSS import only
- `docs/preproduction/workstreams/09-environments.md`

## Checks / verification

- **PASS — branch isolation:** all changes were written only to `screenshot-match-preproduction`.
- **PASS — Replit untouched:** no Replit update/publish action was called.
- **PASS — asset presence:** GitHub confirms all three new environment SVG files exist under `public/assets/environments/`.
- **PASS — target canvas contract:** all three environment assets use the 1408×1056 reference canvas and are composed with important quiet/readability zones toward screen center.
- **PASS — additive integration:** the environment layer is imported after the Home/Store/Quest specialist CSS and does not change save, learning, answer-key, reward, purchase, ownership, or progression logic.
- **NOT TESTED — `npm test`:** this automation runtime did not execute the repository dependency tree.
- **NOT TESTED — `npm run build`:** consolidated branch build remains a Command Center / release-QA responsibility.
- **NOT TESTED — rendered screenshot comparison:** Replit was intentionally not updated or published; final browser proof is still required at 1408×1056, 1024 landscape, tablet, 390 px, and 320 px.

## Visual gaps remaining

1. The environment assets are high-detail vector scenes, not raster/3D renders. Render QA should decide whether the target screenshots require a later raster-art pass for even more volumetric lighting/material realism.
2. Home room-tier preview cards still use the five existing tier SVGs. The new premium bedroom improves the main Home scene but does not replace those progression thumbnails; keeping tier identity separate is intentional for now.
3. Quest contextual illustration art remains owned by `questContextArtRuntime.js`; this pass only upgrades the surrounding learning-space environment.
4. Store item fidelity still depends on Workstream 08 catalog-art completion and Workstream 06 final avatar/equipment rendering.
5. Actual browser rendering must confirm that wide-screen fixed HUD/nav chrome does not cover visually important window/shelf details and that mobile `cover` crops remain attractive on real devices.
6. Final compression/performance profiling is still needed. SVG was chosen to avoid large raster downloads while preserving resolution independence, but aggregate paint cost should be measured in release QA.

## Blockers

- **No environment implementation blocker found.**
- Release-quality visual PASS is blocked on actual rendered comparison, consolidated build/test execution, and any residual art-direction corrections discovered by Workstream 14 / Command Center.

## Handoff

- Workstream 10 should verify background crop, page overflow, contrast/readability, and touch usability at tablet, 390 px, and 320 px widths.
- Workstream 11 may add very subtle parallax or sparkle motion only if it does not move critical content, degrade performance, or violate reduced-motion behavior.
- Workstream 14 / Command Center should render Home, Store, Quest, and Study against the approved visual target and tune only measured crop/brightness/vignette gaps in `environmentArt.css` rather than re-editing all screen-specific CSS.
- If later raster/3D scene art is approved, preserve the same asset URLs or CSS variables so screen compositions do not need another structural rewrite.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction sign-off.**
