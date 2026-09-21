# Workstream 02 — HUD + Shell + Navigation

STATUS: **IMPLEMENTED / BUILD NOT YET EXECUTED ON BRANCH**

## Scope completed
- Added a dedicated screenshot-match shell layer without rewriting `src/App.jsx`.
- Converted the shared shell toward the approved reference geometry: floating illustrated StarBlox logo area, independent Coins / Stars / XP / Mastery modules, settings gear, and overlaid left navigation rather than a flat full-width web header.
- Primary navigation now presents the five reference destinations: **Home, Quests, Study, Room, Store**.
- Preserved the existing Avatar/Customize screen by keeping its original navigation action in the DOM and exposing it through the settings gear instead of deleting the route.
- Added a small settings popover with **Customize avatar** and **Study & backup** shortcuts. No save/economy/learning state is modified by the shell runtime.
- Added selected-state redundancy (`aria-current`, brighter gradient, white/cyan rim, glow, and star marker) so active state is not color-only.
- Added child-sized controls: wide nav buttons are 60 px tall; tablet/phone dock controls remain at least 56 px high; settings stays 46–58 px.
- Kept XP/level visible on narrow phones instead of hiding it below 560 px.
- Added responsive shell contracts:
  - >=1280: large floating logo/HUD + 170 px left rail;
  - 1024–1279: compressed floating shell + 136 px rail;
  - 768–1023: compact top HUD + persistent five-item bottom dock;
  - <=767: two-level compact HUD + five-item bottom dock;
  - <=389: further density compression without removing XP or primary navigation.
- Added reduced-motion-safe shell behavior and keyboard Escape handling for the settings popover.

## Files changed
- `src/shellChrome.css` — shared screenshot-match chrome, design tokens, desktop/tablet/phone shell geometry, selected/focus states.
- `src/shellChromeRuntime.js` — additive DOM decoration for exact five-item nav labels, settings access, `aria-current`, and preserved Customize access.
- `src/main.jsx` — imports the shell runtime and loads shell chrome last so it can converge older base-shell rules on the shared design contract.

## Checks
- **PASS — JavaScript syntax:** the authored `shellChromeRuntime.js` was checked with `node --check` in an isolated local syntax check.
- **PASS — integration-path inspection:** `src/main.jsx` now imports both new shell modules and both files exist on `screenshot-match-preproduction`.
- **NOT TESTED — full `npm test`:** repository CI currently runs only for pushes/PRs targeting `main`; this workstream did not merge or open a release PR by design.
- **NOT TESTED — `npm run build`:** same branch/CI limitation. Command Center or release QA should execute the full test/build suite once the coordinated preproduction changes are consolidated.
- **NOT TESTED — rendered screenshot comparison:** no Replit update/publish was performed, per preproduction rules.

## Visual gaps remaining
- The shell still uses the existing text-based `STARBLOX★` mark rather than a final illustrated logo asset. The CSS gives it the approved multicolor/outlined game treatment, but a final original logo illustration could improve fidelity.
- Coins/Stars remain existing textual HUD values enhanced by shell art rather than dedicated final pictographic assets.
- Screen-specific panels can still overlap shell-safe areas until Home/Store/Quest workstreams finish their screenshot-match compositions.
- Final visual acceptance at 1408×1056, 1024 landscape, tablet, 390 px, and 320 px remains a QA responsibility.

## Blockers
- No functional blocker found in the shell implementation.
- Full branch build/render verification is pending coordinated QA.

## Handoff
- Home, Store, and Quest builders should treat the shell as **fixed overlay chrome**: do not reserve a solid header/sidebar canvas on wide desktop.
- Wide reference content can use the full viewport scene beneath the shell; keep critical interactive content out from under the logo/HUD/nav hit areas.
- Responsive work should retain the five primary destinations and keep XP/level visible in compact form.
- Command Center should consolidate any later duplicate palette/radius/glow declarations into these shared shell tokens rather than creating another shell-specific palette.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction release sign-off.**
