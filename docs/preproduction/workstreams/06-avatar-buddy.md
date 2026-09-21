# Workstream 06 — Avatar + Companion Presentation

STATUS: **IMPLEMENTED / RENDER + FULL BUILD QA PENDING**

Branch: `screenshot-match-preproduction`

## Changes completed

- Added `src/avatarBuddyRuntime.js` as an additive presentation layer. It reads existing save state without writing to it and preserves exact equipped IDs for tops, bottoms, shoes, headwear, face gear, back gear, hand gear, auras, and companions.
- Added `src/avatarBuddy.css`, loaded after the screen-specific screenshot-match CSS so the avatar has one coordinated premium treatment across Home, Store, Quest, Room, World, and Avatar views.
- Upgraded the base character toward the approved screenshot language while keeping it original to StarBlox:
  - warmer expressive face with larger readable eyes, blush, smile, and dimensional skin shading;
  - fuller brown hair;
  - pink cat-ear headphone treatment when no earned headwear is equipped;
  - star necklace / chest medallion identity;
  - softer fashion silhouette;
  - wide-leg denim treatment with heart/star accents on the screenshot-like denim families;
  - two-foot white/swatch-driven sneaker treatment rather than the prior one-card shoe preview;
  - sparkles, ground glow, rim/depth shadow, and improved illustration hierarchy.
- Preserved state-driven outfit differentiation by retaining the existing `homeHeroRuntime` palette variables and copying the exact saved equipment IDs into avatar data attributes.
- Integrated the existing repo-owned portable equipment artwork for headwear, face gear, back gear, hand gear, and auras while suppressing duplicate generic runtime silhouettes when exact equipment art is present.
- Kept shoes visibly state-driven while overriding the old single large catalog-card shoe rendering so both feet remain readable on the character.
- Upgraded the companion from a paw-icon label to the actual equipped original StarBlox buddy portrait using `/assets/catalog/companions-1.svg` through `companions-12.svg`.
- Upgraded the Avatar page buddy card with the same equipped companion portrait.
- Added responsive companion sizing and `prefers-reduced-motion` handling.
- Wired the runtime/CSS through `src/main.jsx` without rewriting `src/App.jsx`, changing save structure, changing item IDs, or touching economy/learning logic.
- Added `src/avatarBuddyRuntime.test.js` to cover exact equipment-ID preservation, safe defaults, and companion asset-path validation.

## Files changed

- `src/avatarBuddyRuntime.js` — new state-preserving avatar/companion decorator.
- `src/avatarBuddy.css` — new premium screenshot-match character and buddy presentation.
- `src/avatarBuddyRuntime.test.js` — targeted state/asset tests.
- `src/main.jsx` — imports the avatar/buddy runtime and loads its CSS last.

## Tests / verification

- **PASS — JavaScript syntax:** `avatarBuddyRuntime.js` logic was reproduced in an isolated Node module and passed `node --check`.
- **PASS — pure state checks:** verified exact saved IDs survive unchanged for top, bottom, shoes, head, and companion; companion bond remains intact; known companion IDs resolve to repo-owned assets; malformed/out-of-range IDs safely fall back to `companions-1.svg`.
- **PASS — save mutation review:** the new runtime performs no `localStorage.setItem`, no React state writes, and no economy/inventory mutations.
- **PASS — integration-path inspection:** `src/main.jsx` imports `avatarBuddyRuntime` and loads `avatarBuddy.css` after the current screenshot-match screen CSS.
- **NOT TESTED — full `npm test`:** repository CI is currently configured only for pushes/PRs targeting `main`, and this workstream must not merge/open a release path during preproduction.
- **NOT TESTED — `npm run build`:** full branch build has not been executed in this workstream.
- **NOT TESTED — rendered screenshot comparison:** Replit was intentionally not updated/published; final visual proof remains for coordinated QA.

## Visual gaps remaining

1. Portable head/face/back/hand/aura assets are square catalog illustrations being cropped into wearable presentation. They now sit more naturally on the character, but final rendered QA may still require per-category crop/position tuning.
2. The avatar remains CSS/DOM illustration rather than a fully authored single 3D character sprite. The treatment is intentionally original and closer to the reference hierarchy, but exact face/body proportions need screenshot proof at 1408×1056, tablet, 390 px, and 320 px.
3. The baseline cat-ear headphone treatment appears only when no earned headwear is equipped; equipped headwear correctly takes precedence, so individual players may not visually match the reference outfit exactly if they chose other gear.
4. Companion portraits use the original item-specific catalog illustrations; a future dedicated transparent buddy sprite set could improve scene integration further without changing item IDs.
5. Store/Quest/Home workstreams may still adjust avatar stage scale/position. Command Center should keep this character CSS as the shared appearance layer and tune only container geometry unless a concrete conflict appears.

## Blockers

- No functional blocker found.
- Full test/build and rendered visual-regression proof are pending workstream 14 / Command Center consolidation.

## Handoff

- Screen builders should not restyle the avatar anatomy independently. Use their container/stage to control scale and position, leaving `avatarBuddy.css` as the shared appearance layer.
- Preserve `data-top`, `data-bottom`, `data-shoes`, `data-head`, `data-face`, `data-back`, `data-hand`, `data-aura`, and `data-companion`; they intentionally mirror existing stable save IDs.
- If QA finds a specific portable asset crop failure, tune only that category selector rather than replacing IDs or changing ownership state.
- Keep the original StarBlox companion assets and character language; do not substitute Roblox/Brookhaven geometry or recognizable third-party character art.
- **Do not update/publish Replit and do not merge to `main` during preproduction.**
