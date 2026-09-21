# Workstream 10 — Mobile Accessibility QA

STATUS: **IMPLEMENTED ACCESSIBILITY + RESPONSIVE SAFETY PASS / FULL BROWSER + BUILD QA PENDING**

Branch: `screenshot-match-preproduction`

## Scope completed

Audited the shared shell plus Home, Store, Quest, Study, Room, Avatar, and World responsive behavior against the screenshot-match target and design-system contract. This pass is additive and does not change learning, reward, economy, inventory, persistence, or question-selection behavior.

### Responsive / narrow-screen fixes

- Added `src/mobileAccessibility.css` as the final responsive/accessibility safety layer.
- Added global width containment for the app shell and media so long names, generated art, horizontal trays, and nested panels cannot widen the page.
- Preserved intentional local horizontal scrolling for Store category/tier strips, Home customization tracks, room inventory, closet rows, and decor shelves instead of allowing whole-page horizontal overflow.
- Added fixed-HUD/bottom-dock clearance on tablet and phone screens, including safe-area-aware bottom padding.
- Reflowed the non-reference World screen from desktop absolute pins into a compact two-column mobile/tablet game-board layout below the fixed HUD. World title, all five destinations, and the mission card remain reachable without occupying the same fixed-coordinate canvas.
- Kept the Store at two columns on phones where practical, three columns on tablets, and normal-page scrolling on phones rather than a nested product scroller.
- Kept dense HUD information visible while preserving the existing five-item bottom navigation.
- Added overflow wrapping for long Store names/meta, Quest breadcrumbs, Study cards, Room HUD content, Avatar closet content, and progression copy.

### Touch targets / input

- Enforced approximately 44 CSS px minimum height for critical actions, including primary/secondary actions, read-aloud, Daily Quest buttons, customization tabs, Store tier/detail actions, inventory/decor/closet controls, backup actions, and settings-popover actions.
- Phone Store category controls are at least 64 px high, tier filters 48 px, and selected-item actions 48 px.
- Phone Quest answer controls are at least 56 px high and read-aloud is at least 48 px high.
- Phone shell settings remains at least 46×46 px; bottom navigation stays at least 56 px high.
- No critical action was converted to hover-only or drag-only behavior. Existing horizontal trays remain usable through native scroll/swipe while their actual choices remain discrete buttons.

### Readability / contrast / focus

- Raised phone Quest answer text to 16 px, passage/instructional copy to at least 15 px, and read-aloud text to 15–16 px.
- Raised key Store item, price, action, collection, and permanent-ownership copy on phones.
- Raised World destination labels/copy and mission CTA copy on phones.
- Strengthened muted text on light surfaces to a darker blue-gray where this workstream owns the final override.
- Added a high-visibility gold `:focus-visible` ring with a dark separator so keyboard focus remains visible on both light and cobalt surfaces.
- Disabled controls keep explicit disabled cursor/state rather than relying only on hover behavior.

### Screen-reader / semantic fixes

Added `src/mobileAccessibilityRuntime.js` with non-destructive DOM semantics:

- HUD currency and mastery labels plus a real XP `progressbar` (`aria-valuemin`, `aria-valuemax`, `aria-valuenow`).
- Primary navigation region label.
- Store grid grouping, keyboard-selectable item cards exposed as button-like controls, concise item/state/price labels, and `aria-pressed` selected/filter state.
- Store category/tier groups labeled without claiming unsupported toolbar/listbox keyboard behavior.
- Quest read-aloud receives an explicit accessible label; phase strip becomes an accessible list; answers get `Answer A/B/C…` labels; feedback is a polite atomic live region.
- Home Room Progress, Daily Quests, customization-category group, and owned-item strip receive accessible region/group labels.
- Room inventory/decor and Study backup actions receive concise accessible labels.

### Reduced motion

- Added a final global `prefers-reduced-motion: reduce` safety rule under the StarBlox shell to collapse animation/transition duration and disable smooth scrolling.
- The later Workstream 11 motion layer also independently removes its ambient/avatar/buddy/reward animations and Star Spark travel under reduced-motion, so the two layers are compatible.

## Files changed

- `src/mobileAccessibilityRuntime.js` — responsive/accessibility semantics, XP progressbar metadata, Store/Quest/Home/Room/Study labels.
- `src/mobileAccessibility.css` — touch targets, readable phone type, focus treatment, overflow containment, safe-area spacing, World mobile reflow, reduced-motion safety.
- `src/mobileAccessibilityRuntime.test.js` — targeted jsdom tests for XP parsing/progressbar semantics, Store keyboard/screen-reader semantics, filter pressed state, Quest read-aloud/answer/live-feedback labeling, and concise Store card labels.
- `src/main.jsx` — imports the accessibility runtime and final safety CSS. Concurrent Workstream 11 imports remain intact.

## Verification

- **PASS — branch isolation:** all changes are on `screenshot-match-preproduction`; this workstream did not merge to `main`.
- **PASS — Replit untouched:** no Replit update or publish action was used.
- **PASS — integration-path inspection:** latest `src/main.jsx` contains both `mobileAccessibilityRuntime` and `mobileAccessibility.css`, while preserving concurrent avatar/progression/environment/motion imports.
- **PASS — static implementation audit:** critical phone controls now have explicit minimum target sizes; the World absolute-pin overlap risk is removed by responsive grid reflow; page-width containment and local-scroll containment are explicitly defined.
- **PASS — semantics design review:** Store cards use button/group semantics rather than `listbox`/`toolbar` roles that would imply arrow-key behavior the app does not implement.
- **ADDED — targeted Vitest/jsdom regression tests:** `src/mobileAccessibilityRuntime.test.js`.
- **NOT RUN — targeted Vitest suite:** the automation runtime does not have the branch dependency tree available locally, and repository CI is configured only for pushes/PRs to `main`.
- **NOT RUN — full `npm test` / `npm run build`:** same branch/runtime constraint; these remain release-gate responsibilities for Workstream 14 / Command Center.
- **NOT TESTED — real browser viewport proof:** 1024/tablet/390/320 px rendered screenshots and real VoiceOver/TalkBack/keyboard traversal require an executable browser preview. Replit was intentionally left untouched.

## Remaining issues / risks

1. **Rendered overflow proof is still required.** CSS now contains explicit containment and reflow rules, but release QA must confirm zero horizontal page scrolling at 1024 landscape, tablet portrait, 390 px, and 320 px.
2. **Actual accessibility-tree verification is pending.** The DOM semantics are deterministic, but VoiceOver/TalkBack/NVDA output has not been observed in a running browser.
3. **Color contrast should receive browser/tool measurement.** This pass darkened several muted light-surface colors and preserved high-contrast primary text, but exact contrast ratios were not measured in a rendered environment.
4. **Focus order needs real-browser traversal.** No DOM order was intentionally rearranged by this workstream; Store cards, filters, Quest answers, settings, and backup controls need final Tab/Shift+Tab proof.
5. **Dynamic Store card labels depend on the screenshot-match Store runtime landing first.** Mutation observation covers class/child/text changes without watching the ARIA attributes this layer itself writes, avoiding an observer self-trigger loop.
6. **World mobile reflow is usability-oriented rather than screenshot-reference work.** The three approved screenshot targets are Home/Store/Quest; the World screen was only changed at ≤1023 px to keep navigation usable beneath the fixed mobile HUD.

## Handoff

- Workstream 14 / Command Center should run `npm test` and `npm run build`, then capture/browser-check Home, Store, Quest, World, Study, Room, and Avatar at 1024 landscape, tablet portrait, 390 px, and 320 px.
- During browser QA, explicitly verify: no page-level horizontal overflow; every primary control ≥44 px; fixed HUD and bottom dock never cover the active action; Store two-column cards stay readable; Quest passage/answers/read-aloud remain visible without zoom; and focus rings are never clipped.
- Run at least one keyboard-only traversal and one screen-reader smoke pass. Confirm XP progress, Store item names/states/prices, Quest read-aloud/answers/feedback, and navigation labels are announced sensibly.
- If Workstream 11 or later polish introduces new animated selectors after this pass, add them to the reduced-motion gate rather than weakening the existing preference behavior.
- Keep Replit untouched until Command Center declares the consolidated preproduction branch ready for the single final integration.
