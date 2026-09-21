# Workstream 03 — Home Screen

STATUS: **REFERENCE COMPOSITION IMPLEMENTED / FULL BUILD + RENDER QA PENDING**

Branch: `screenshot-match-preproduction`
Starting head for this pass: `e16e1fc7852addfda3b437728f7fda850254c42e`

## Changes completed

- Added a dedicated additive Home screenshot-match layer instead of rewriting `src/App.jsx` or the persistence model.
- Matched the approved 1408×1056 Home reference geometry much more closely at wide desktop:
  - Room Progress anchored at the approved top-center envelope with all five real room tiers visible at once;
  - central avatar hero envelope enlarged and lowered to match the reference composition;
  - Buddy moved beside the avatar with a reference-style speech card;
  - My Dream Goal moved to the narrow right rail with a larger aspirational art area and gold primary CTA treatment;
  - Daily Quests widened into the lower-left reference region;
  - Customize Me widened into the lower-center tray;
  - Today I’m Learning moved into the lower-right reference card;
  - added the separate lower-right “Smart Kids Change the World!” motivational card.
- Converged Home panel styling on the screenshot-match design contract: cobalt/navy dimensional chrome, cyan rim light, deep lower bevel, white inner highlight, gold/pink/green accents, and warmer scene treatment.
- Added subtle static sparkle/highlight layers without requiring new environment assets.
- Added the screenshot-reference safety note under Daily Quests: wrong answers are okay and nothing owned is lost.
- Added Dream Goal benefits using truthful permanent-progress language only:
  - earned through learning;
  - kept forever once unlocked;
  - progress is never taken away.
- Preserved the existing real-state bindings for:
  - room tier and Star Worth;
  - Dream Goal item, ownership, Coins and price;
  - Daily Quest counters;
  - recent learning stats;
  - owned customization inventory;
  - equipped avatar items;
  - equipped companion and Buddy Bond;
  - placed room favorites.
- Preserved starter-state positivity; no fake ownership, currency, quest completion, mastery, or room progress was introduced.
- Added a compatibility repair for the new five-item shell so legacy Home navigation targets such as `Market` resolve to the visible `Store` destination. This fixes Home CTA/daily routing after Workstream 02 renamed the shell destination.
- Added reduced-motion-safe Home overrides and kept existing touch-target behavior intact.

## Files changed

- `src/homeScreenshotMatch.css` — reference Home geometry, dimensional chrome, Daily/Dream/Customize/Learning composition, Buddy placement, motivation card, responsive and reduced-motion overrides.
- `src/homeScreenshotMatchRuntime.js` — additive DOM decoration for screenshot headings/cards, truthful Home support copy, world-change message, Buddy role label, and shell-route compatibility.
- `src/homeScreenshotMatchRuntime.test.js` — route-alias tests for Market→Store, Quest→Quests, and Avatar→Customize.
- `src/main.jsx` — loads the Home screenshot-match runtime and CSS after the existing Home layer and shared shell chrome.

## Verification

- **PASS — branch isolation:** all changes are on `screenshot-match-preproduction`; `main` was not merged or changed by this workstream.
- **PASS — Replit untouched:** no Replit update/publish action was called.
- **PASS — additive change review:** compare from the starting head shows only the new Home runtime/CSS/test files plus two imports in `src/main.jsx`.
- **PASS — new runtime syntax:** `node --check` completed successfully for `homeScreenshotMatchRuntime.js` in an isolated local syntax check.
- **PASS — route-normalization smoke check:** direct module assertions passed for Market→Store, Quest→Quests, Avatar→Customize, and unchanged Study.
- **PASS — CSS structural check:** opening/closing brace counts match for the new Home CSS.
- **NOT TESTED — full `npm test`:** the repository dependencies/build tree are not available in this automation runtime and this branch is intentionally not deployed to Replit.
- **NOT TESTED — `npm run build`:** same constraint; Visual Release QA / Command Center should run the full coordinated suite after additional workstreams land.
- **NOT TESTED — rendered pixel comparison:** no preview host or production Replit update was used, by design.

## Visual gaps remaining

1. The current room-tier SVGs are still flatter/vector-style than the warm high-detail bedroom in the reference. Workstream 09 should replace/upgrade environment art without changing this Home layout contract.
2. The avatar itself is still the existing generated/CSS character system. Workstream 06 owns the final high-detail original avatar/Buddy art and equipment fidelity.
3. The illustrated logo/top HUD/left navigation are owned by Workstream 02; Home now reserves the screenshot-style composition around that fixed overlay, but final rendered overlap must be checked at 1408×1056.
4. Dream Goal art fidelity depends on the selected real item and final catalog/environment art. This workstream intentionally did not fabricate a mansion image when the player’s actual Dream Goal is a different item.
5. Daily Quests currently reflect the three real tracked daily counters available in save state rather than inventing a fourth fake completion counter just to mirror the screenshot.
6. Today I’m Learning displays real/relevant tracked learning rows rather than faking five subject-progress values. Final icon treatment can be upgraded later without changing the data binding.
7. Full browser render verification at 1408×1056, 1024 landscape, tablet, 390 px and 320 px remains pending.

## Blockers

- **No code/data blocker found for the Home composition.**
- Release-quality visual PASS is blocked on final environment art, avatar/Buddy art, coordinated browser render proof, and full build/test execution.

## Handoff

- Workstream 06 should keep the Home avatar visual envelope and Buddy placement established here while replacing character fidelity inside those mounts.
- Workstream 07 may enrich Daily Quest / Dream Goal / Today’s Learning widgets, but must keep every displayed progress value bound to real state and should preserve the current Home region envelopes.
- Workstream 09 should upgrade the bedroom/room-tier scene art beneath the Home chrome; do not reintroduce a dashboard-like opaque background.
- Workstream 10 should verify the existing tablet/phone reflow plus the new world-message and safety-note additions at 390 px and 320 px.
- Workstream 14 / Command Center should render the Home screen against the approved 1408×1056 reference and adjust only measured residual geometry/fidelity gaps.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction sign-off.**
