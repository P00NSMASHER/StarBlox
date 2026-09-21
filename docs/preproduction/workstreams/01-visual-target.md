# Workstream 01 — Visual Target Director

STATUS: **DESIGN CONTRACT COMPLETE / IMPLEMENTATION PENDING**

Branch inspected: `screenshot-match-preproduction`
Latest inspected head after this pass: `671665fdf39d1483e729d92417a1339f2609491d`

## Completed this pass

- Read the screenshot-match target, coordination contract, Visual North Star, current branch head, and representative base/Home/Quest CSS.
- Re-measured the three approved 1408×1056 screenshots as the canonical wide-desktop reference frame.
- Added `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` as the shared measurable visual implementation contract.
- Linked the measurable contract from `docs/preproduction/SCREENSHOT_MATCH_TARGET.md` so downstream visual workstreams have one canonical token/layout source.
- Defined measurable shared values for:
  - cobalt/navy/cyan/gold/pink/lilac/green palette;
  - panel/button gradients;
  - border widths, bevel depths, glow and shadow recipes;
  - typography hierarchy and final minimum reading sizes;
  - 4 px spacing scale, gutters, padding and density limits;
  - 1408×1056 logo/HUD/nav geometry;
  - Home, Store and Quest major panel envelopes;
  - Store 6-column card-density target;
  - Quest passage/answer ratio and three-zone desktop composition;
  - avatar/buddy scale targets;
  - responsive breakpoints at 1280, 1024, 768 and 390 px;
  - touch targets, reduced-motion requirements and visual QA tolerances.

## Key measurable decisions

### Shell
- Wide desktop uses a full-bleed scene with floating chrome, not an opaque 72 px full-width application navbar.
- Reference logo box: about x 28–380, y 8–180, width 24–26vw with 355 px max.
- Reference top HUD: about x 410–1310, y 12–82, 56–68 px high.
- Left nav: x 12–182, 160–172 px wide, 57–64 px buttons, 7–9 px vertical gaps.

### Home
- Room Progress roughly 610×165 at x 520/y 84.
- Hero avatar envelope roughly x 520–930/y 260–825 with ~500–565 px character height.
- Dream Goal roughly 255 px wide at right.
- Daily Quests ~410 px wide bottom-left; Customize ~600 px wide bottom-center; Today panel ~334 px wide bottom-right.

### Store
- Main Store chrome roughly x 178–1020; right avatar/detail rail ~1030–1408.
- Wide reference target: 6 product columns, 128–142 px cards, 145–158 px tall, 6–8 px gaps, 3 visible rows.
- 8 category tabs visible on reference desktop.

### Quest
- Header/phase/main learning body roughly x 390–1173; left avatar zone x 12–380; right mastery rail x 1182–1398.
- Central learning body target split: 57–60% passage/illustration and 40–43% answer/control.
- Passage card should move toward the approved light/white reading surface rather than a large dark-blue slab.

### Responsive
- ≥1280: preserve three-zone/reference composition.
- 1024–1279: compact rails, 4–5 Store columns.
- 768–1023: intentional tablet reflow; nav may become bottom/horizontal dock.
- ≤767: one-column flow, 44×44 px minimum critical targets, 50–56 px primary CTAs, two-column Store where fit allows.
- ≤389: prioritize current learning/action controls and eliminate horizontal page scroll.

## Current visual mismatches / remaining work

1. Base `.hud` is still a solid 72 px full-width strip; the approved desktop reference wants floating counters over the scene.
2. Base `.sidebar` is 145 px wide; the wide-reference nav target is ~160–172 px and starts below the oversized logo.
3. Base font stack is Inter-first; final game chrome should use a more rounded/friendly display treatment.
4. Base phone CSS currently hides the XP/level box under 560 px; target requires progression remain accessible in compact form rather than disappear.
5. Home has moved structurally close to the approved composition, but several preview/status labels are 7–10 px and below final readability targets.
6. Quest has a strong multi-zone composition already, but the central lesson treatment is darker than the approved screenshot and should move to a predominantly light/white reading surface.
7. Chrome values are duplicated across multiple CSS files; downstream work should converge on shared custom properties/token values instead of adding more independent palettes.
8. Several final icon/art surfaces still depend on placeholder/simple geometry; visual PASS requires original item-specific/character/environment assets.

## Tests / verification

- Runtime code changed: **NO**.
- Learning/economy/persistence code changed: **NO**.
- Replit updated/published: **NO**.
- Build/test suite: **NOT RUN — documentation-only visual-contract pass**.
- Visual implementation PASS: **NO — contract is complete; implementation remains for workstreams 02–11 and QA**.

## Handoff

All visual workstreams should read `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` before introducing new color, radius, panel, typography, spacing, or responsive values. Prefer shared CSS custom properties based on this contract. Screen-specific builders should aim for the stated 1408×1056 panel envelopes first, then apply the explicit responsive reflow rules rather than shrinking the desktop canvas.

Do not modify learning/economy semantics to obtain visual fidelity. Do not ship Roblox/Brookhaven or recognizable third-party assets; use original StarBlox artwork and the screenshot only as visual-language/composition reference.