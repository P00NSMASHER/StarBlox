# Workstream 02 — HUD + Shell + Navigation

STATUS: **IMPLEMENTED / BROWSER-QA NAV SEMANTICS FIXED / CURRENT CI + VISUAL RECHECK RUNNING**

Branch: `screenshot-match-preproduction` only
Latest shell runtime commit: `4b0aeaae6e0e017881c469035903f57e85a593a7`
Latest shell regression-test commit: `334676d88bbe2d71a8908f99aa385f8da013d5c5`
Replit: **untouched**
Main: **not merged or modified**

## Scope completed

- Added and retained a dedicated screenshot-match shell layer without rewriting `src/App.jsx`.
- Converted the shared shell toward the approved reference geometry: floating StarBlox logo area, independent Coins / Stars / XP / Mastery modules, settings gear, and overlaid navigation rather than a flat full-width web header.
- Primary navigation visibly presents the five reference destinations in the required order: **Home, Quests, Study, Room, Store**.
- Preserved the existing Avatar/Customize screen by keeping its underlying route and exposing it through the settings gear instead of deleting behavior.
- Added a small settings popover with **Customize avatar** and **Study & backup** shortcuts. No save/economy/learning state is modified by the shell runtime.
- Added selected-state redundancy (`aria-current`, brighter gradient, white/cyan rim, glow, and star marker) so active state is not color-only.
- Added child-sized controls: wide nav buttons are about 60 px tall; tablet/phone dock controls remain at least 56 px high; settings remains 46–58 px.
- Kept XP/level visible on narrow phones instead of hiding it.
- Added responsive shell contracts:
  - >=1280: large floating logo/HUD + ~170 px left rail;
  - 1024–1279: compressed floating shell + ~136 px rail;
  - 768–1023: compact top HUD + persistent five-item bottom dock;
  - <=767: two-level compact HUD + five-item bottom dock;
  - <=389: further density compression without removing XP or primary navigation.
- Added reduced-motion-safe shell behavior and keyboard Escape handling for the settings popover.

## Browser-QA correction completed this pass

The first authoritative Playwright gate found a shell-owned hierarchy defect: the visible **Home** control was still the underlying `world` route, while the approved bedroom Home composition lived on the underlying `room` route. That made the visible Home button open Brightside City/world and made the visible Room button open the actual screenshot-match Home.

This pass fixes that without changing React game state or rewriting `App.jsx`:

- the underlying `room` route is now the visible **Home** destination;
- the underlying `world` route is now the visible **Room** destination;
- the visible rail is explicitly ordered **Home → Quests → Study → Room → Store** on desktop, tablet, and phone flex layouts;
- active-state `aria-current` follows the correctly mapped visible destination;
- the StarBlox logo now routes to the same screenshot-match Home destination instead of retaining the old `world` click while claiming an accessible Home label;
- settings actions resolve destinations by stable shell destination rather than brittle raw button index;
- Customize remains reachable through settings while staying outside the five-item primary rail.

This is a presentation/routing-label correction only. No learning, reward, inventory, purchase, save, ownership, XP, Stars, Coins, mastery, or persistence behavior was changed.

## Files changed

- `src/shellChrome.css` — shared screenshot-match chrome, design tokens, desktop/tablet/phone shell geometry, selected/focus states.
- `src/shellChromeRuntime.js` — additive DOM decoration for the five visible destinations, semantic Home/Room mapping, visual ordering, logo-to-Home routing, settings access, `aria-current`, and preserved Customize access.
- `src/shellChromeRuntime.test.js` — regression coverage for visible navigation order, Home/Room mapping, logo routing, and settings-based Customize access.
- `src/main.jsx` — already imports the shell runtime and shell chrome as part of the coordinated screenshot-match stack; no new `App.jsx` rewrite was required.

## Tests / build status

- **PASS — prior coordinated automated gate:** before this browser-QA correction, the consolidated source head `583872b4083cd8d28b312da3c5c567eb9ce72b13` passed 18/18 test files, 81/81 tests, and the Vite production build.
- **PASS — branch/browser diagnosis:** authoritative Playwright QA identified the Home/Room hierarchy mismatch and confirmed five named visible primary nav controls, target touch sizes, and no page-level horizontal overflow at the exercised responsive widths.
- **ADDED — targeted shell regression suite:** `src/shellChromeRuntime.test.js` now locks the required Home/Quests/Study/Room/Store order, correct semantic route mapping, logo-to-Home behavior, and settings access to Customize.
- **RUNNING — current full CI:** GitHub Actions CI for shell test head `334676d88bbe2d71a8908f99aa385f8da013d5c5` is executing the dependency install, complete Vitest suite, and production build.
- **RUNNING — current Playwright visual gate:** the preproduction visual workflow is rebuilding and rechecking the same head, including the structural browser assertions and screenshot artifact set.
- **NOT YET CLAIMED PASS — current rendered recheck:** this document does not mark the new Home/Room correction visually PASS until the current Playwright run completes.

## Visual gaps remaining

- The shell still uses a CSS-styled text `STARBLOX★` mark rather than a final authored illustrated logo asset. The existing treatment matches the multicolor/outlined game language, but a final original logo illustration could improve fidelity.
- Coins/Stars use styled existing HUD values rather than fully bespoke final pictographic illustrations.
- Final exact screenshot fidelity still depends on measured viewport proof at 1408×1056, 1024 landscape/tablet, 390 px, and 320 px after this navigation correction.
- Screen-specific geometry defects reported by visual QA belong to their owning Home/Store/Quest workstreams and should not be fixed by independently moving the global shell.

## Blockers

- No shell logic or state-preservation blocker is currently known.
- The current full CI/build and Playwright structural visual gate must complete on the corrected shell head before this workstream can be called fully verified.
- Final illustrated-logo fidelity remains an art-direction improvement rather than a functional blocker.

## Handoff

- Home, Store, and Quest builders must treat the shell as **fixed overlay chrome** and must not reserve a solid desktop header/sidebar canvas.
- The visible destination contract is now authoritative: **Home opens the bedroom Home composition; Room opens Brightside City/world; Quests, Study, and Store preserve their existing underlying behaviors.**
- Wide reference content can use the full viewport scene beneath the shell; keep critical interactive content out from under logo/HUD/nav hit areas.
- Responsive work must retain all five primary destinations and keep XP/level visible in compact form.
- Command Center should keep `shellChrome.css` as the shared chrome/token authority and avoid creating another global shell palette.
- If later integration changes the base nav array/order, update the shell source mapping and its regression test together rather than relabeling by visual position alone.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction release sign-off and separate user approval.**
