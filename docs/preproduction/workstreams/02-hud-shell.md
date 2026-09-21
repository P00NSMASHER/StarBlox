# Workstream 02 — HUD + Shell + Navigation

STATUS: **IMPLEMENTED / AUTOMATED GATE PASS / SHELL BROWSER QA PASS**

Branch: `screenshot-match-preproduction` only
Verified source head: `276181274e2f11ed49b46e09852712d43899b538`
Shell runtime fix: `4b0aeaae6e0e017881c469035903f57e85a593a7`
Shell regression tests: `334676d88bbe2d71a8908f99aa385f8da013d5c5`
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

## Browser-QA correction completed

The first authoritative Playwright gate found a shell-owned hierarchy defect: the visible **Home** control was still the underlying `world` route, while the approved bedroom Home composition lived on the underlying `room` route. That made the visible Home button open Brightside City/world and made the visible Room button open the actual screenshot-match Home.

The corrected shell now:

- maps the underlying `room` route to the visible **Home** destination;
- maps the underlying `world` route to the visible **Room** destination;
- explicitly orders the visible rail **Home → Quests → Study → Room → Store** on desktop, tablet, and phone flex layouts;
- keeps active-state `aria-current` aligned to the correctly mapped visible destination;
- routes the StarBlox logo to the same bedroom Home destination instead of retaining the old world-route click;
- resolves settings actions by stable shell destination rather than brittle raw button index;
- keeps Customize reachable through settings while staying outside the five-item primary rail.

This is a presentation/routing-label correction only. No learning, reward, inventory, purchase, save, ownership, XP, Stars, Coins, mastery, or persistence behavior was changed.

## Files changed

- `src/shellChrome.css` — shared screenshot-match chrome, design tokens, desktop/tablet/phone shell geometry, selected/focus states.
- `src/shellChromeRuntime.js` — additive DOM decoration for the five visible destinations, semantic Home/Room mapping, visual ordering, logo-to-Home routing, settings access, `aria-current`, and preserved Customize access.
- `src/shellChromeRuntime.test.js` — regression coverage for visible navigation order, Home/Room mapping, logo routing, and settings-based Customize access.
- `src/main.jsx` — imports the shell runtime and shell chrome as part of the coordinated screenshot-match stack; `App.jsx` was not bloated with shell-specific presentation logic.
- `src/homeScreenshotMatchRuntime.js` — coordinated QA added a narrow queued-scan teardown guard after the new shell regression file exposed an existing jsdom microtask race; no Home behavior or state semantics changed.

## Tests / build status

- **PASS — complete CI on verified source head `276181274e2f11ed49b46e09852712d43899b538`:** 19/19 Vitest files and 84/84 tests passed.
- **PASS — shell regression suite:** all three new shell tests passed: visible five-destination order/mapping, logo-to-Home routing, and settings-based Customize access.
- **PASS — production build:** Vite 8.3.0 production build completed; 1,611 modules transformed. Output was CSS 164.29 kB / 35.15 kB gzip and JS 300.70 kB / 92.13 kB gzip.
- **PASS — shell browser route contract:** Playwright confirmed at 1408×1056, 1024×768, 390×844, and 320×568 that visible **Home** opens the approved bedroom Home composition.
- **PASS — primary navigation browser checks:** all exercised Home/Store/Quest viewports reported exactly five visible, named, touch-safe primary navigation controls.
- **PASS — responsive containment relevant to the shell:** all exercised viewports reported no page-level horizontal overflow and no page/console runtime errors.
- **PASS — child-sized mobile interaction evidence:** 390 px and 320 px Home actions remained at least 44 px high; Store and Quest mobile controls also remained touch-safe under the shared dock/HUD.
- **EXPECTED GLOBAL VISUAL-QA FAIL OUTSIDE THIS WORKSTREAM:** the strict visual workflow still reports 13 release-blocking geometry checks in Home/Store/Quest screen content. The former shell-owned Home-route failure is cleared; the remaining failures are screen-specific panel geometry, not shared HUD/nav failures.

## Visual gaps remaining

- The shell still uses a CSS-styled text `STARBLOX★` mark rather than a final authored illustrated logo asset. The current treatment matches the multicolor/outlined game language, but an original final logo illustration could improve fidelity.
- Coins/Stars use styled existing HUD values rather than fully bespoke final pictographic illustrations.
- Exact artistic comparison of logo/icon shapes can still be refined if later screenshot review supplies a concrete measurable mismatch, but shell structure, routing, responsive containment, and touch safety now have browser proof.
- The 13 current strict visual-QA failures belong to Home/Store/Quest content geometry and should be corrected by their owning workstreams rather than by independently moving the global shell.

## Blockers

- **No remaining Workstream 02 functional, build, routing, responsive-shell, or state-preservation blocker is known.**
- Final illustrated-logo/pictogram fidelity is an optional art-direction refinement, not a blocker to handing the shared shell to downstream screen QA.
- The overall StarBlox screenshot-match release remains blocked by screen-specific geometry, catalog completion, and other Command Center release gates outside this workstream.

## Handoff

- Home, Store, and Quest builders must treat the shell as **fixed overlay chrome** and must not reserve a solid desktop header/sidebar canvas.
- The visible destination contract is authoritative: **Home opens the bedroom Home composition; Room opens Brightside City/world; Quests, Study, and Store preserve their existing underlying behaviors.**
- Wide reference content can use the full viewport scene beneath the shell; keep critical interactive content out from under logo/HUD/nav hit areas.
- Responsive work must retain all five primary destinations and keep XP/level visible in compact form.
- Command Center should keep `shellChrome.css` as the shared chrome/token authority and avoid creating another global shell palette.
- If later integration changes the base nav array/order, update the shell source mapping and its regression test together rather than relabeling by visual position alone.
- Re-run full CI and the browser visual gate after any future runtime-affecting shell change.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction release sign-off and separate user approval.**
