# Workstream 01 — Visual Target Director

STATUS: **CONTRACT LOCKED / CURRENT BRANCH AUDITED / VISUAL QA BLOCKERS REMAIN**

Branch: `screenshot-match-preproduction`
Latest implementation head audited before this documentation pass: `224b0a16480160549d0716646fe8a40d6a1fca34`
Reference: the three approved 1408×1056 Home / Store / Quest screenshots.

## Director decision

The screenshot-match target is now a measurable game-design contract rather than a loose style reference. `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md` remains the canonical token/layout source. This pass re-audited that contract against the latest implemented branch and the first authoritative Playwright browser gate.

The design direction is unchanged:
- glossy cobalt/navy game chrome floating over a warm pink/lilac illustrated world;
- bright cyan rim light and white inner highlights;
- gold achievement/currency emphasis;
- selective green for primary success/action CTAs;
- rounded, dense, tactile child-scale controls;
- large original StarBlox girl avatar and visible original buddy;
- asymmetric Home framing, dense Store merchandising, and rich three-zone Quest composition;
- original StarBlox artwork only for final shipped characters, items, rooms, logos, and environments — no Roblox/Brookhaven or recognizable third-party production assets.

No learning, answer-key, reward, economy, persistence, ownership, or save semantics may be changed to satisfy visual fidelity.

## Canonical measurable tokens

### Palette
Use these shared values unless a screen-specific illustration requires a small local tint:

| Role | Token / value |
| --- | --- |
| deepest bevel / shadow | `#051741` |
| deep navy rail | `#071E57` |
| dark panel body | `#0A2D73` |
| primary cobalt | `#0D439D` |
| bright cobalt | `#1266CF` |
| selected blue | `#2387EE` |
| cyan rim | `#63D9F4` |
| selected cyan rim | `#8AE9FF` |
| pale inner highlight | `#D6F8FF` |
| light reading/card surface | `#F8FDFF` / white |
| gold achievement | `#FFD84F` |
| gold highlight | `#FFF09A` |
| gold lower bevel | `#C77A12` |
| personality pink | `#FF78B7` |
| personality lilac | `#A77AF3` |
| success green | `#35CC6A` |
| success lower bevel | `#168846` |
| text on dark | `#FFFFFF` |
| text on light | `#17366B` |

Warm environment support colors should bias blush `#F3AFC4`, peach `#F6C28F`, lilac `#C9A7F2`, daylight cyan `#9EDFFF`, cream `#FFF0D2`, and plant green `#70B86F`. The screen must not become blue-on-blue; scene warmth is part of the target.

### Gradients
- dark game panel: `linear-gradient(180deg,#155FCB 0%,#0D439D 48%,#082A70 100%)`
- deep rail: `linear-gradient(180deg,#0D439D 0%,#071E57 100%)`
- selected nav/tab: `linear-gradient(180deg,#2C94FF 0%,#0E5FCC 58%,#0949A5 100%)`
- gold CTA: `linear-gradient(180deg,#FFF181 0%,#FFD044 45%,#F5A91B 100%)`
- green CTA: `linear-gradient(180deg,#73EA96 0%,#32C968 50%,#18A652 100%)`
- light reading surface: `linear-gradient(180deg,#FFFFFF 0%,#EEF7FF 100%)`

Major chrome should show at least two dimensional cues from gradient, white inner highlight, lower bevel, cyan rim, or outer glow; flat single-fill major panels are off-target.

### Border / bevel / glow / shadow
- major desktop border: **3px** cyan;
- inner white keyline: **1–2px at 18–28% opacity**;
- top inner highlight: approximately `0 2px 0 rgba(255,255,255,.28)`;
- major lower bevel: **6–8px** deep navy;
- small-control lower bevel: **3–5px**;
- major depth shadow: approximately `0 14px 30px rgba(3,20,63,.34)`;
- selected glow: approximately `0 0 0 2px rgba(150,235,255,.38), 0 0 18px rgba(74,207,255,.55)`.

### Radius hierarchy
- major panel: **22–26px**;
- medium panel: **16–20px**;
- item/card: **13–16px**;
- button: **13–16px**;
- pill/meter: **999px**.

### Typography
Primary UI stack should read as rounded/friendly game type: `"Nunito Sans", Nunito, ui-rounded, "Trebuchet MS", system-ui, sans-serif` or a bundled equivalent.

Reference desktop scale:
- micro/status: **10–11px**, heavy;
- small label: **12–13px**, heavy;
- body: **14–16px**, 1.35–1.5 line-height;
- control label: **16–19px**;
- panel title: **20–26px**;
- screen title: **30–42px**;
- story title: **28–34px**.

Phone instructional copy must stay **≥15px**; phone button text should be **≥16px**. Non-instructional micro/status may be smaller, but important child-facing instructions may not rely on 7–10px text.

### Spacing / density
Base unit: **4px**. Canonical spaces: `4, 8, 12, 16, 20, 24, 32`.

- desktop edge gutter: **12–18px**;
- major panel internal padding: **12–18px**;
- card padding: **8–12px**;
- repeated card gap: **6–10px**;
- nav gap: **7–10px**;
- avoid empty desktop gaps above **32px** unless intentionally exposing avatar/environment art.

## Shell geometry contract

At 1408×1056:
- logo visual envelope: x **28–380**, y **8–180**, width **24–26vw**, max about **355px**;
- floating HUD: x **410–1310**, y **12–82**, height **56–68px**;
- settings: **54–64px square**;
- left nav: x **12–182**, start y **205–215**, width **160–172px**;
- nav button: **57–64px** high, icon **38–45px**, label **17–20px**.

The scene starts at viewport top and continues behind shell chrome. Do not reintroduce a solid full-width application header.

Current implementation convergence: the shared shell now uses a transparent floating HUD, ~170px desktop nav rail, ~60px nav buttons, rounded Nunito-family stack, cyan/cobalt bevel treatment, and compact phone XP instead of hiding progression. The earlier base-shell mismatches are therefore no longer the primary release blockers.

## Screen layout contracts

### Home — 1408×1056
- Room Progress: x **520–1130**, y **84–250**, target about **610×165**;
- avatar hero: x **520–930**, y **260–825**, character roughly **500–565px** high;
- Dream Goal: x **1138–1395**, y **118–680**, width about **255px**;
- Daily Quests: x **14–425**, y **705–1034**, width about **410px**;
- Customize: x **442–1045**, y **822–1035**, width about **600px**;
- Today I’m Learning: x **1062–1396**, y **772–930**, width about **334px**;
- motivation card: x **1062–1396**, y **938–1028**.

Five room-tier previews should remain visible at once. Home is intentionally asymmetric and avatar-led; it should never become a uniform dashboard grid.

**Navigation semantics are now an explicit visual contract:** the visible **Home** nav item must open the approved bedroom Home composition. The current branch has the reference bedroom Home mounted behind the visible **Room** navigation while Home opens Brightside City/world. That is a release-blocking hierarchy mismatch, not an acceptable labeling variant.

### Store — 1408×1056
- main Store chrome: x about **178–1020**, y **79–808**;
- avatar try-on stage: x **1030–1408**, y **160–630**, target about **378×470**;
- selected-item detail: x **1035–1398**, y **630–842**, target about **363×212**;
- lower collection strip: x **10–1098**, y **832–1048**;
- lower learning/value panel: x **1102–1398**, y **850–1048**.

Grid target:
- **6 columns** desktop;
- cards **128–142px** wide × **145–158px** high;
- gap **6–8px**;
- art **88–102px** high;
- **3 complete rows** visible in the 1056px reference viewport;
- **8 category tabs** visible;
- tier/filter row about **48–56px** high.

### Quest — 1408×1056
- header: x **390–1172**, y **82–153**;
- phase strip: x **390–1172**, y **153–224**;
- avatar zone: x **12–380**, y **205–960**;
- learning body: x **384–1173**, y **238–900**;
- mastery rail: x **1182–1398**, y **222–900**;
- earned summary: x **470–855**, y **925–1022**.

Central learning body target:
- passage/illustration: **57–60%**;
- answer/control: **40–43%**;
- passage surface predominantly light/white;
- answer rows **54–66px** high with **8–10px** gap;
- answer letter badge **30–34px**;
- primary Check/Continue action at least **190×54px** where that interaction model is actually used.

The visual phase strip may show Diagnose → Practice → Review → Transfer, but the actual five-action Quest and learning semantics remain untouched.

## Responsive contracts

### Wide desktop — `≥1280px`
Preserve floating logo/HUD/left rail and the three approved screen compositions. Use absolute/asymmetric reference framing where appropriate.

### Compact landscape — `1024–1279px`
- logo **210–260px**;
- left rail **120–138px**;
- keep Coins, Stars, XP, and Mastery visible;
- Store **4–5 columns**, right rail **240–290px**;
- Quest avatar zone **180–220px**, mastery rail **200–230px**.

### Tablet — `768–1023px`
Do not shrink the desktop canvas literally. Use a compact HUD and persistent five-destination bottom/horizontal dock. Store becomes **2–3 columns**; Quest evidence rail stacks inline; Home panels reflow by priority.

### Phone — `≤767px`
- safe gutter **10–12px**;
- all critical targets **≥44×44px**;
- preferred primary CTA height **50–56px**;
- bottom nav **64–72px**;
- Store **2 columns** at 390px where names fit, **1–2 columns** below ~360px;
- Quest answers single-column;
- instructional text **≥15px**, line-height **≥1.4**;
- no page-level horizontal scrolling;
- progression values remain accessible.

### Very narrow — `≤389px`
Prioritize current learning/action controls, retain nav reachability, and never let fixed chrome cover purchase/answer actions.

## First authoritative browser QA — measured state

Latest audited browser gate on head `224b0a1`:
- normal CI / production build: **PASS**;
- structural visual QA: **FAIL — 17 release-blocking checks**;
- desktop/tablet/phone page-level horizontal overflow: **PASS** on all exercised Home/Store/Quest viewports;
- five visible named primary nav controls: **PASS**;
- 390px and 320px critical touch-size checks: **PASS**;
- Store phone first row: **2 columns — PASS**;
- Quest phone answers: visible and touch/readability-safe — **PASS**;
- visible generic Store art fallback in the default desktop category: **0 — PASS**.

### Measured remaining mismatches

**Home**
1. P0 visual hierarchy/navigation: visible Home opens Brightside City/world; approved bedroom Home is behind Room.
2. Room Progress height measured **204.4px** vs **165px** target.
3. Customize y measured **787px** vs **822px** target.
4. Today’s Learning y measured **713px** vs **772px** target.
5. Dream Goal, Daily Quests, and motivation card are currently within the desktop tolerance envelope.

**Store**
1. Main Store chrome geometry: **PASS**.
2. Six-column product density/card size: **PASS**.
3. Avatar stage measured **360×455px** vs target about **378×470px**.
4. Selected detail height measured **261px** vs **212px** target.
5. Collection strip measured x **178**, y **1046.4**, width **912**, height **183** vs target x **10**, y **832**, width **1088**, height **216** — currently below the reference fold and too narrow.
6. Value panel measured y **1046.4**, height **183** vs target y **850**, height **198** — also below the reference fold.

**Quest**
1. Header height **83px** vs **71px** target.
2. Phase strip y **168px** vs **153px** target.
3. Avatar zone x **28px**, width **348px**, height **729px** vs target x **12px**, width **368px**, height **755px**.
4. Learning body y **261px**, height **642px** vs target y **238px**, height **662px**.
5. Mastery rail width **204px**, height **712px** vs target **216×678px**.
6. Earned summary measured x **486**, y **954**, width **619.5**, height **72** vs target x **470**, y **925**, width **385**, height **97**.
7. Lesson/answer split measured **54.7% / 39.6%** and is directionally close; preserve that relationship while correcting outer geometry.

## Visual acceptance tolerance

For the canonical 1408×1056 render:
- major panel x/y: **±14px or ±1% viewport**, whichever is larger;
- major panel width/height: **±3%**;
- repeated card size: **±6px**;
- no page-level horizontal scroll;
- selected/correct/equipped states must remain distinguishable without color alone;
- no emoji/initials/generic placeholders as final primary art;
- reduced-motion must preserve all information and action affordances.

A screen is not visually PASS merely because it builds or is responsive. It must satisfy the measured geometry/density contract and still look like the same premium illustrated children’s game as the approved references.

## Remaining art-direction mismatches

1. The current logo is still predominantly CSS/text treatment rather than a final authored illustrated logo asset.
2. Catalog-art coverage is not yet complete across the full 192-item store; visual release must not treat fallback/unfinished assets as final.
3. Avatar/equipment and companion placement still require screenshot-level crop/scale confirmation across equipped states, not only the default state.
4. Environment SVGs meet the warm scene-direction contract, but final QA must judge whether they need more volumetric/material depth to match the reference polish.
5. Final visual proof still requires side-by-side screenshot review in addition to the structural geometry gate; structural PASS alone cannot judge illustration quality, lighting, facial appeal, or perceived premium finish.

## Handoff

### Workstream 02 / Command Center
Preserve the current floating shell contract. Fix the visible navigation hierarchy so **Home opens the reference bedroom Home composition** without changing save or learning behavior.

### Home
Reduce Room Progress vertical footprint toward **165px**, move Customize down toward **y≈822**, and move Today’s Learning down toward **y≈772** while keeping Dream Goal/Daily/motivation geometry that already passes.

### Store
Keep the passing six-column grid/main chrome. Increase the try-on stage modestly, reduce selected-detail height, and pull the lower collection/value sections into the 1056px reference viewport at approximately **y=832–850** rather than after the main panel flow.

### Quest
Tighten header height, raise the phase strip and learning body, widen/shift the left avatar zone slightly, normalize the mastery rail, and return the earned summary to a compact centered **~385×97px** footprint near **y=925**. Do not alter question, answer, retry, mastery, or reward semantics.

### QA / visual regression
Keep the existing Playwright gate as a hard structural contract at 1408×1056, 1024×768, 390×844, and 320×568. Add/retain screenshot artifacts for human side-by-side inspection. Treat every NOT TESTED visual/art judgment as unresolved until browser proof exists.

**Do not update or publish Replit. Do not merge to `main`. All changes in this pass are documentation-only on `screenshot-match-preproduction`.**