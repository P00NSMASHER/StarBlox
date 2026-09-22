# Workstream 11 — Motion + Game Feel

STATUS: **AURA FAMILY CLOSED / ART-ONLY VISUAL-FINISHING SPEC READY / SHARED-RUNTIME IMPLEMENTATION HELD FOR WORKSTREAM 15**

Branch: `screenshot-match-preproduction`  
Visual sprint: `ART_AND_VISUALS_ONLY`  
Replit/Floot/main/deploy: **untouched**  
Player state / learning / persistence / economy: **unchanged**

## Current coordination state

Aura production is closed. Reviewer 05 independently accepted `auras-11` Dream Aurora at exact Git blob `7f3372c1584e07f18a3abfc7818013190fff1560` from actual card/detail pixels, completing exact-hash ACCEPT coverage for Auras 1–12. Workstream 08 then canonically wired Dream Aurora on branch commit `ad8867efc70d1b123cbc5e2f157766bec58e510d`; the current manifest is version 27 and maps `auras-11` to `/assets/catalog/auras-11-w11-v3.jpg` as `final-portable`.

No Aura may be regenerated, altered, or re-reviewed without a later exact-hash defect. Workstream 11 is not claiming another catalog family. Until Workstream 15 explicitly reassigns ownership/shared entrypoints, this file is the bounded art/visual deliverable: a reference-grounded recipe for the later finishing pass. **No runtime, CSS, gameplay, state, or shared entrypoint was edited in this pass.**

## Authoritative visual references

The recipes below are anchored to the verified user originals in `docs/preproduction/reference-screenshots/originals/` and their measured design contract, not to later mockups:

- Home original: `home-1448x1086.jpeg`, SHA-256 `6a4b110aeaf12a6ab0c629f9181cc6cfa8d4f55a518d4f2a6adb3ac6e756c457`, normalized comparison `home-desktop-1408x1056.png`.
- Store original: `store-1448x1086.jpeg`, SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`, normalized comparison `store-desktop-1408x1056.png`.
- Quest original: `quest-1448x1086.jpeg`, SHA-256 `70f1b952709a85c77bb11851ffe9ae704acf8b97640355e908b6ec537b5c73c9`, normalized comparison `quest-desktop-1408x1056.png`.

Reference identity is verified for Home/Store/Quest. There are no authoritative tablet or phone reference pixels, so mobile behavior must preserve hierarchy and accessibility without inventing “pixel-match” claims.

Shared material target from the measured contract: dimensional cobalt/navy chrome (`#051741`, `#071E57`, `#0A2D73`, `#0D439D`, `#1266CF`) with cyan rim light (`#63D9F4` / `#8AE9FF`), pale inner highlights, deep lower bevels, warm pink/lilac/cream scene support, gold achievement light (`#FFD84F`), green success (`#35CC6A`), and restrained bloom. Major surfaces should read as premium game plastic/glass, not flat SaaS cards.

## Visual-finishing material recipes — specification only

These are implementation recipes for the later coordinated finishing pass. Values are bounded visual targets, **not claims that the branch currently renders them or that performance has been measured**.

### 1. Premium panel energy

**Base material**
- Keep the contract’s dark-panel gradient and existing 3 px cyan rim as the stable surface.
- Add one non-interactive pseudo-element per *selected premium anchor only*, using a soft cyan/ice radial or edge gradient at roughly 12–22% resting opacity.
- If motion is enabled later, animate only the pseudo-element opacity between a restrained resting/high state; never animate border width, blur radius, box size, or layout geometry.
- Do not place an animated glow on scrolling card grids or every panel.

**Reference placement**
- Home: Room Progress and Dream Goal are the only recommended ambient premium anchors. Preserve the reference’s large exposed avatar/room area; do not turn the screen into a wall of glowing panels.
- Store: keep ambient energy on the selected-item detail/try-on stage, not the full six-column grid. The selected card may receive stronger cyan/white rim light than neighbors, matching the reference contract.
- Quest: keep the learning body visually stable while reading. Ambient energy belongs on surrounding chrome or a completed-success surface, not on passage text or unanswered options.

**Reduced motion**
- No pulse. Render the high-quality dimensional surface as a static cyan rim + inner white keyline + fixed soft halo.

### 2. Bounded Star Spark material

**Particle language**
- Use original five-point stars / tiny diamond glints / round light motes, not emoji or confetti glyphs.
- Palette: ice white, `#D6F8FF`, cyan `#63D9F4`, gold `#FFD84F`; pink/lilac may appear only as secondary personality accents.
- Depth hierarchy: near 8–12 px high-opacity sparks, mid 5–8 px, far 2–4 px lower-opacity motes. Vary scale and blur *statically* by layer so the field reads spatially rather than as identical dots.
- Keep bursts sparse enough that item art, answer text, avatar face, and buttons remain unobscured.

**Later motion envelope**
- Selection travel: 6–9 particles, approximately 520–760 ms.
- Equip confirmation: 8–12 particles, approximately 620–820 ms.
- Correct-answer celebration: 8–14 particles, approximately 760–980 ms.
- Never keep an emitted particle layer alive beyond the visible burst; never let spark travel gate navigation, input, or the next learning action.

**Reduced motion**
- Emit no traveling particles. Use a static three-to-five-star cluster near the destination plus a stronger fixed rim/highlight while the semantic state is visible.

### 3. Selection / equip material

- Selected Store card: cyan/white rim at least visually stronger than ordinary cards, a small inner ice highlight, and a fixed lower bevel. No size change is required for state readability.
- Try-on stage: one brief destination halo may accompany a valid selection/equip event later, but the item/avatar must be immediately available before spectacle finishes.
- Equipped state must remain legible with non-motion cues: persistent outline, state badge/icon/text already owned by the screen, and material contrast. Motion is garnish, never the source of truth.
- Do not animate the whole six-column Store grid when one item changes.

**Reduced motion**: instant selected/equipped rim + fixed destination halo; no scale, travel, bounce, or pulsing.

### 4. Correct-answer visual recipe

This effect is authorized only from a reliable semantic `correct` state supplied/verified with Workstream 12. Text scraping or generic MutationObserver phrase matching is not sufficient release evidence.

- Correct: green success edge (`#35CC6A` / `#91F0AD`) plus gold/ice spark accents. Keep the question/answer geometry stationary.
- Recommended visible spectacle: about 760–980 ms, with one bounded spark burst and one short card-edge emphasis.
- Wrong / clue / retry: **no celebration particles, gold reward flare, bounce, or success bloom**. Preserve clear instructional feedback only.
- Never reveal or visually bias the right answer before the player’s correctness is established by the existing learning semantics.

**Reduced motion**: instant static green success keyline + small fixed gold star cluster; wrong/clue/retry retain their normal static instructional treatment.

### 5. Home room-progress reveal

The Home reference keeps five room-tier previews visible together and makes the avatar/environment the hero.

- Later motion may reveal the existing five tiles with opacity plus a very small vertical settle; no fake progress values, fabricated unlocks, or fake room states.
- Total reveal should remain about 650–850 ms, with any stagger small enough that the final tile is not withheld from interaction.
- Current tier may use a gold highlight; locked later tiers remain visibly locked exactly according to real state.

**Reduced motion**: render all five real tiles immediately with current-tier gold and locked-state materials already present; no stagger.

### 6. Avatar / Buddy visual life

- The reference treats the avatar as a primary illustration: Home roughly 47–54% viewport height, Store 40–48%, Quest 42–52%. Any idle treatment must not reduce face readability or collide with speech/answer panels.
- Preferred later motion is a tiny transform-only float/sway on the illustration wrapper, not position/layout changes. Keep amplitude around a few CSS pixels and avoid synchronized perpetual motion across avatar + buddy + every panel.
- Buddy may use a slightly offset timing so the scene feels alive rather than mechanically pulsing.
- Do not move the avatar while the player is reading an answer choice if it causes distraction at phone widths.

**Reduced motion**: no idle transforms. Use fixed rim light, contact shadow, and a static buddy highlight to retain depth/liveliness.

### 7. Gentle screen-transition recipe

- Home/Store/Quest content must be interactive immediately. Later entry polish may use opacity plus a 2–6 px transform settle over roughly 300–420 ms.
- Never delay mount, focus, pointer events, question availability, or screen-reader exposure while animation finishes.
- Avoid full-screen blur/zoom transitions; they fight the reference’s crisp dense console-game shell and increase paint cost.

**Reduced motion**: no entrance animation. Render the destination in its final state immediately.

## Screen-specific restraint map

### Home
Keep visible-scene area in the contract’s roughly **35–48%** range. Concentrate energy around Room Progress, Dream Goal, avatar/buddy and the current-state accents. Daily Quests, Customize and Today I’m Learning should stay readable and comparatively calm. Spark effects should not cross instructional copy or obscure the avatar face.

### Store
Keep visible-scene area roughly **22–35%** while retaining dense premium cards. At the wide reference, six columns and three rows are the density target. Therefore: selected-card rim, selected-detail halo and a bounded card→stage spark path are appropriate; blanket animated shadows/filters on every card are not. Scroll should remain visually stable while effects are idle.

### Quest
Keep visible-scene area roughly **20–32%** and protect the light central passage/answer surfaces. The learning body should be the calmest large region. Correct-answer polish happens only after reliable correctness. Incorrect/clue/retry states get no celebratory material. Mastery/reward chrome may use static premium depth, but no urgency, countdown, streak-loss or FOMO treatment.

## Proposed performance/material budgets for later implementation

These are constraints for the implementation owner and Workstream 14 measurement pass, not measured results:

- Favor `transform` and `opacity` for moving elements; do not animate layout properties.
- No animated `backdrop-filter` on scrolling or large surfaces.
- Avoid continuously animating large soft `box-shadow` / blur kernels; use precomposed pseudo-element gradients whose opacity can be composited when possible.
- Keep event particle count bounded to the recipe above; no persistent particle canvas behind the whole game.
- Do not leave `will-change` permanently on large containers; apply only during a known event if needed.
- One screen should not run multiple large-area ambient pulses simultaneously; the visual hierarchy should have one or two anchors, not every surface competing for attention.
- Store scroll QA must specifically look for repaint storms from selected/equipped styling and particle overlays.
- Quest QA must verify feedback cleanup when the question advances, retries, clue use, screen navigation, and reduced-motion preference changes.

## Actual evidence state this pass

- **PASS — Aura exact-hash review closure:** reviewer 05 ACCEPT on Dream Aurora blob `7f3372c1584e07f18a3abfc7818013190fff1560`; Auras 1–12 now all have current exact-hash ACCEPT evidence.
- **PASS — Aura 11 canonical mapping readback:** branch head `ad8867efc70d1b123cbc5e2f157766bec58e510d`; manifest v27 and `src/catalogArtRuntime.js` both map `auras-11` to `/assets/catalog/auras-11-w11-v3.jpg`.
- **PASS — authoritative-reference provenance:** all three original 1448×1086 screenshots have verified repository hashes and normalized 1408×1056 comparison files.
- **NOT EXECUTED — new motion runtime implementation:** intentionally held because Workstream 15 owns shared entrypoint coordination and the user prohibited unrelated/shared runtime changes while catalog ownership is not reassigned.
- **NOT EXECUTED — normal/reduced-motion browser profiling:** no claim of paint/composite/scroll performance is made by this specification-only pass.
- **NOT EXECUTED — new rendered motion QA:** requires a coordinated later visual-finishing implementation and Workstream 14 evidence.

## Historical first-pass implementation already present on the branch

Earlier Workstream-11 work introduced a presentation-only motion runtime/CSS/test layer with panel energy, Star Spark travel, fine-pointer hover/press depth, avatar/Buddy idle polish, selection/equip feedback, a bounded correct-answer micro-celebration, room-progress reveal, screen entrances, reduced-motion suppression/static cues, and helper tests. That earlier implementation remains historical branch state and is **not changed or newly validated by this pass**.

Before release, its legacy correctness detection must be reconciled with Workstream 12’s reliable correct/wrong/clue/retry semantics rather than relying on text alone, and Workstream 14 must measure actual normal/reduced rendering and scrolling.

## Blockers / ownership handoff

- **No Aura blocker remains.** Aura 11 is independently accepted and canonically integrated; all Auras 1–12 must remain byte-stable unless a later exact-hash defect is recorded.
- Workstream 11 has **no authorization to claim another catalog family** until Workstream 15 explicitly reassigns it.
- Shared motion/runtime changes remain held for Workstream 15 coordination. When authorized, Workstream 12 should supply/verify reliable learning-state hooks and Workstream 14 should perform actual paint/composite/scroll/reduced-motion QA at 1408×1056, 1024×768, 390×844 and 320×568 as applicable.
- Release/deployment gates remain open. Do not update/publish Replit, touch Floot, merge `main`, deploy, or change player data.
