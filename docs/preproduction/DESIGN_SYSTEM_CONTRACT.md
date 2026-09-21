# StarBlox Screenshot-Match Design System Contract

Status: **VISUAL IMPLEMENTATION CONTRACT — v1**
Owner: Workstream 01 — Visual Target Director
Reference frame: the three approved 1408 × 1056 (4:3) screenshots supplied 2026-09-21.

This file turns the approved screenshots into measurable implementation rules. It does **not** change learning, economy, persistence, catalog identity, or child-safety behavior. All visual workstreams should use these values as the shared target rather than inventing per-screen colors, radii, spacing, or proportions.

## 1. Visual acceptance principle

The reference is a dense premium children’s game, not a conventional web dashboard. At desktop/landscape sizes, scene art fills the viewport and UI floats on top of it. Major chrome must read as dimensional cobalt/navy plastic/glass with cyan rim light, white inner highlights, deep lower bevels, and saturated gold/pink/green accents.

For a 1408 × 1056 reference render:
- major panel x/y position tolerance: **±14 px** or **±1.0% viewport**, whichever is larger;
- major panel width/height tolerance: **±3%**;
- repeated grid/card size tolerance: **±6 px**;
- desktop shell must show the major reference regions without browser-page horizontal scrolling;
- no desktop primary content region may collapse into a sparse centered SaaS card;
- background scene must remain visible through/around chrome: target visible-scene area is roughly **35–48% on Home**, **22–35% on Store**, and **20–32% on Quest**.

## 2. Core color tokens

### Game chrome
| Token | Value | Use |
|---|---|---|
| `--sb-navy-950` | `#051741` | deepest bevel/shadow |
| `--sb-navy-900` | `#071E57` | dark panel foot / rail |
| `--sb-navy-800` | `#0A2D73` | panel body dark |
| `--sb-blue-700` | `#0D439D` | core chrome |
| `--sb-blue-600` | `#1266CF` | bright chrome |
| `--sb-blue-500` | `#2387EE` | selected state / active tabs |
| `--sb-cyan-400` | `#63D9F4` | standard rim light |
| `--sb-cyan-300` | `#8AE9FF` | strong selected rim |
| `--sb-cyan-100` | `#D6F8FF` | inner highlight |
| `--sb-ice` | `#F8FDFF` | light card surface |

### Achievement and personality
| Token | Value | Use |
|---|---|---|
| `--sb-gold-500` | `#FFD84F` | stars, achievement, reward |
| `--sb-gold-300` | `#FFF09A` | gold highlight |
| `--sb-gold-700` | `#C77A12` | gold lower bevel |
| `--sb-pink-500` | `#FF78B7` | personality, heart, fashion |
| `--sb-pink-300` | `#FFC0DD` | pink highlight |
| `--sb-lilac-500` | `#A77AF3` | secondary personality accent |
| `--sb-violet-700` | `#5A3BBE` | dream/rare accent |
| `--sb-green-500` | `#35CC6A` | primary success/action |
| `--sb-green-300` | `#91F0AD` | success highlight |
| `--sb-green-700` | `#168846` | button lower bevel |

### Text
| Token | Value | Use |
|---|---|---|
| `--sb-text-on-dark` | `#FFFFFF` | panel headings/buttons |
| `--sb-text-on-light` | `#17366B` | light-card copy |
| `--sb-text-muted-dark` | `#CDE6FF` | secondary text on blue |
| `--sb-text-muted-light` | `#667DA4` | secondary text on light cards |

### Scene support palette
Scene art should bias warm, not blue-only:
- warm blush `#F3AFC4`
- peach `#F6C28F`
- lilac `#C9A7F2`
- daylight cyan `#9EDFFF`
- warm cream `#FFF0D2`
- plant green `#70B86F`

Blue chrome should contrast against a warm pink/lilac/cream environment rather than becoming the whole screen.

## 3. Gradient contracts

- **Primary dark panel:** `linear-gradient(180deg, #155FCB 0%, #0D439D 48%, #082A70 100%)`
- **Deep rail:** `linear-gradient(180deg, #0D439D 0%, #071E57 100%)`
- **Selected nav/tab:** `linear-gradient(180deg, #2C94FF 0%, #0E5FCC 58%, #0949A5 100%)`
- **Gold CTA:** `linear-gradient(180deg, #FFF181 0%, #FFD044 45%, #F5A91B 100%)`
- **Green CTA:** `linear-gradient(180deg, #73EA96 0%, #32C968 50%, #18A652 100%)`
- **Pink accent:** `linear-gradient(180deg, #FF9BC9 0%, #F16FB0 55%, #C94B9C 100%)`
- **Light card:** `linear-gradient(180deg, #FFFFFF 0%, #EEF7FF 100%)`

Do not use one flat fill for a major piece of chrome. A major panel/button/tab should show at least two of: gradient, inner highlight, lower bevel, rim light, outer glow.

## 4. Borders, bevels, glow, and shadow

### Standard game panel
- border: **3 px solid `--sb-cyan-400`** at wide desktop;
- inner keyline: **1–2 px white at 18–28% opacity**;
- top inner highlight: **0 2px 0 rgba(255,255,255,.28)**;
- lower bevel: **0 6–8px 0 `--sb-navy-950`** for major panels, **0 3–5px 0** for small controls;
- outer depth shadow: **0 14px 30px rgba(3,20,63,.34)**;
- selected glow: **0 0 0 2px rgba(150,235,255,.38), 0 0 18px rgba(74,207,255,.55)**.

### Surface hierarchy
- `panel-major`: radius **22–26 px**;
- `panel-medium`: radius **16–20 px**;
- `card`: radius **13–16 px**;
- `button`: radius **13–16 px**;
- `pill/meter`: radius **999 px**.

At ≤767 px, major panel borders may reduce to 2 px and bevel depth by ~25%, but selected-state contrast must remain obvious.

### Backdrop/glass
Use backdrop blur only where it improves scene legibility:
- major translucent panel: **8–14 px blur**;
- never blur the central avatar or primary item art;
- opacity target for dark blue panel surfaces: **88–96%**.

## 5. Typography contract

Preferred family: a rounded, friendly sans such as `Nunito Sans`, `Nunito`, or a bundled equivalent. System fallback: `ui-rounded, "Trebuchet MS", system-ui, sans-serif`. Avoid an Inter-first appearance for final game chrome.

Desktop reference scale:
- micro/status: **10–11 px**, 800–900 weight, line-height 1.15;
- small label: **12–13 px**, 800–1000;
- body: **14–16 px**, 700–850, line-height 1.35–1.5;
- control label: **16–19 px**, 900–1000;
- panel title: **20–26 px**, 900–1000;
- screen title: **30–42 px**, 900–1000;
- large story title: **28–34 px**;
- logo: use original illustrated logo asset rather than plain text.

Heading treatment on dark surfaces: white with **1–2 px dark outline/shadow** and subtle blue or gold highlight where appropriate. Do not use thin/gray text for important child-facing labels.

Minimum final reading sizes after responsive reflow:
- body: **15 px** phone / **16 px** tablet where content is instructional;
- button text: **16 px** phone;
- micro/status may be 11–12 px only when non-instructional.

## 6. Spacing scale and density

Base unit: **4 px**.
Canonical spaces: `4, 8, 12, 16, 20, 24, 32`.

Desktop density targets:
- global edge gutter: **12–18 px**;
- major panel internal padding: **12–18 px**;
- card internal padding: **8–12 px**;
- repeated card gap: **6–10 px**;
- nav button gap: **8–10 px**;
- avoid desktop whitespace gaps > **32 px** inside the active game shell unless they are intentionally exposing scene/avatar art.

## 7. Wide desktop shell geometry (reference mode)

Reference viewport: **1408 × 1056**. Use proportions so 1366×768 through 1600×1200 preserve the same hierarchy.

### Logo
- target box: x **28–380**, y **8–180**;
- width: **24–26vw**, max **355 px**;
- height: about **145–170 px**;
- it floats over the scene and should not force a solid full-width header bar.

### Top HUD
- target region: x **410–1310**, y **12–82**;
- height: **56–68 px**;
- counters are individual floating chrome modules, not one flat navbar;
- order: Coins → Stars → XP/Level → Mastery → Settings;
- gaps: **10–16 px**;
- settings target: **54–64 px square**.

### Left navigation
- x **12–182**;
- starts around y **205–215 px** on reference desktop so it clears the logo;
- width **160–172 px**;
- button height **57–64 px**;
- gap **7–9 px**;
- icon visual box **38–45 px**;
- label **17–20 px**;
- selected item gets stronger cyan outline/glow and a brighter blue gradient.

### Scene rule
Desktop scene begins at viewport top and continues beneath all floating shell elements. Do **not** reserve a 72 px opaque header strip plus a separate content canvas in reference mode.

## 8. Home layout contract

At 1408×1056 reference size:
- Room Progress: x **520–1130**, y **84–250**, width ≈ **610 px**, height ≈ **165 px**;
- avatar hero visual envelope: x **520–930**, y **260–825**, with character height ≈ **500–565 px**;
- Dream Goal rail: x **1138–1395**, y **118–680**, width ≈ **255 px**;
- Daily Quests: x **14–425**, y **705–1034**, width ≈ **410 px**;
- Customize tray: x **442–1045**, y **822–1035**, width ≈ **600 px**;
- Today I’m Learning: x **1062–1396**, y **772–930**, width ≈ **334 px**;
- motivational card: x **1062–1396**, y **938–1028**;
- buddy speech bubble: near avatar lower-left, about **155–180 px** wide.

Home content coverage is intentionally asymmetric: the avatar/environment remain the hero. Panels should frame the character rather than make a uniform dashboard grid.

Five room-tier previews must be visible simultaneously on wide desktop. Preview cards should be roughly **105–118 px wide × 76–90 px high**, with current tier gold-highlighted and later tiers visibly locked.

## 9. Store layout contract

At 1408×1056:
- left nav remains x **12–170**, y ≈ **150–480**;
- main Store chrome begins around x **178–1020**, y **79–808**;
- right avatar stage occupies x **1030–1408**, y **160–630**;
- selected item detail occupies x **1035–1398**, y **630–842**;
- lower collection strip occupies x **10–1098**, y **832–1048**;
- lower learning/value panel occupies x **1102–1398**, y **850–1048**.

Product-grid target on wide desktop:
- **6 columns** visible;
- card width **128–142 px**;
- card height **145–158 px**;
- card gap **6–8 px**;
- art area **88–102 px** high;
- item name one or two short lines, visually heavier than price;
- 3 full rows should be visible without scrolling in a 1056 px-high viewport;
- category tabs: **8** visible across main panel;
- tier filter row: compact, about **48–56 px** tall.

Selected card: cyan/white glow at least 1.5× normal rim intensity. Owned/equipped/locked states must remain visually distinct without relying on color alone.

No timed sale language, fake scarcity, random reward, or expiring discount treatment even if the screenshot uses sale stickers.

## 10. Quest layout contract

At 1408×1056:
- quest title/header: x **390–1172**, y **82–153**;
- phase strip: x **390–1172**, y **153–224**;
- left avatar/encouragement zone: x **12–380**, y **205–960**;
- central lesson/question body: x **384–1173**, y **238–900**;
- right mastery rail: x **1182–1398**, y **222–900**;
- earned summary: x **470–855**, y **925–1022**;
- lower non-punitive motivation/reward cards may fill the remaining bottom-right area.

Central learning body on wide desktop:
- passage/illustration side: **57–60%**;
- answer/control side: **40–43%**;
- passage surface in the approved target is predominantly **light/white**, with dark navy/purple text, not a large solid dark-blue reading slab;
- answer rows: **54–66 px** high, **8–10 px** gap;
- option letter badge: **30–34 px**;
- primary Check/Continue action: at least **190 × 54 px**;
- phase strip must visually show Diagnose → Practice → Review → Transfer while the real Quest remains the existing five-action learning contract.

## 11. Avatar and buddy scale contract

The avatar is a primary illustration, not an icon.
- Home: character visual height **47–54% of viewport height**;
- Store: **40–48% of viewport height** in try-on stage;
- Quest: **42–52%** in the left vignette;
- head/face must remain large enough to read expression at normal laptop scale;
- equipped tops, bottoms, shoes, headwear, face gear, back gear, hand gear, aura, and companion should each produce visible state correspondence where relevant.

Buddy target: visible scene presence around **110–170 px** wide on wide desktop, with speech bubble only when it adds meaning.

## 12. Breakpoints and reflow contracts

### A. Wide reference: `min-width: 1280px`
- preserve floating logo + top HUD + left rail;
- Home uses reference-style absolute/asymmetric composition;
- Store shows 6 product columns plus right try-on rail;
- Quest shows left avatar + center learning body + right evidence rail simultaneously.

### B. Compact landscape: `1024–1279px`
- logo width **210–260 px**;
- left nav width **120–138 px**;
- top HUD may compress labels but must keep Coins, Stars, XP, Mastery visible;
- Store: **4–5 columns**, right rail **240–290 px**;
- Quest: left avatar narrows to **180–220 px**, right rail **200–230 px**;
- major body text stays ≥14 px, instructional text ≥15 px.

### C. Tablet: `768–1023px`
- stop trying to reproduce the desktop 3-rail geometry literally;
- top HUD may become a compact two-row overlay;
- navigation may become a persistent bottom dock or compact horizontal rail with all 5 destinations visible;
- Home: avatar scene first, Room Progress second, Dream Goal + Daily/Customize/Today panels stacked in priority order;
- Store: **3 columns** in landscape / **2–3** in portrait; selected detail becomes sticky/inline below selected row rather than squeezing art;
- Quest: avatar vignette above or beside a two-column question card when space allows; mastery rail becomes stacked inline;
- gutters **12–16 px**.

### D. Phone: `max-width: 767px`
- one-column page flow; do not scale the desktop canvas down;
- safe horizontal gutter **10–12 px**;
- all critical touch targets **≥44 × 44 CSS px**, preferred primary CTA height **50–56 px**;
- bottom nav target height **64–72 px**;
- Store grid: **2 columns** down to 390 px, **1–2 columns** below 360 px depending item-name fit;
- Quest answers: single column, full width;
- keep avatar/environment art visually prominent before utility panels;
- Coins/Stars/XP/Mastery must remain accessible; they may become compact chips or horizontally scrollable non-critical HUD, but do not silently erase progression data;
- instructional copy minimum **15 px** and line-height **≥1.4**.

### E. Very narrow: `max-width: 389px`
- prioritize learning content and current-action controls;
- non-critical stat labels may shorten, but values/icons remain;
- avoid any element requiring horizontal page scroll;
- fixed/bottom navigation must not cover answer or purchase actions.

## 13. Interaction and motion visual rules

- hover lift, when available: **2–4 px** only;
- press state: translateY **2–3 px** and reduce lower-bevel depth;
- selected/equip transition: **120–180 ms**;
- panel transition: **180–260 ms**;
- celebration effects around learning: **0.5–2.0 s**, never blocking the next learning action;
- `prefers-reduced-motion`: remove travel/parallax/pulse and keep color/outline/static sparkle equivalents.

No critical state may be hover-only, drag-only, or animation-only.

## 14. Icon and art rules

- final primary navigation and catalog item art: illustrated/pictographic assets, not emoji characters;
- icons use thick silhouette, white or pale rim, saturated center fill, and small deep-blue shadow;
- item thumbnails use consistent 3/4 studio framing, pastel/bright background, centered silhouette, soft 3D lighting;
- all shipped character/item/environment art must be original StarBlox material or independently cleared;
- do not ship recognizable Roblox/Brookhaven or other third-party character/environment assets.

## 15. Visual QA checklist

A visual workstream should not claim screenshot-match PASS unless:
1. major desktop region positions are within the tolerance above;
2. active nav/HUD counters read as game chrome rather than flat app bars;
3. scene art remains visible and warm;
4. desktop content density is comparable to reference (Store 6-column target, Quest 3-zone target, Home asymmetric panel frame);
5. titles/body/control text meet the scale contract;
6. selected/correct/equipped states remain clear in grayscale as well as color;
7. no emoji/generic initials remain as final primary art;
8. phone/tablet reflow is usable rather than a shrunk desktop canvas;
9. no visual implementation changes learning/economy/persistence semantics;
10. reduced motion keeps all information and controls understandable.

## 16. Current-branch visual deltas at contract creation

Observed in current branch CSS, not release assertions:
- the base shell still defines a solid 72 px full-width `.hud` and a 145 px `.sidebar`, while the desktop target requires floating top modules, a much larger overlaid logo, and ~160–172 px left navigation;
- base typography is Inter-first; target calls for a more rounded game-display treatment;
- base phone CSS hides `.levelBox` under 560 px; the target instead requires XP/level remain accessible in compact form;
- Home has already moved toward the reference composition, but several labels/previews are 7–10 px and are below the final instructional/readability target;
- Quest has the correct multi-zone concept, but its current lesson card is predominantly dark-blue; the approved screenshot’s passage surface is predominantly light/white and should be treated as the closer target;
- style values are currently repeated across several CSS files. New visual work should converge on this shared contract and, where practical, shared CSS custom properties rather than creating another independent palette.

These deltas are handoff targets, not permission to rewrite unrelated behavior.