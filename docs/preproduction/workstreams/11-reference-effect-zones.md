# Workstream 11 — Reference-Grounded Effect Zoning

STATUS: **ART_AND_VISUALS_ONLY / SPECIFICATION ONLY / NO SHARED RUNTIME WRITE**

Branch: `screenshot-match-preproduction`  
Owner: Workstream 11  
Shared-entrypoint coordinator: Workstream 15  
Independent Aura reviewer: Workstream 05  
Canonical catalog writer: Workstream 08

## Scope and freeze

Aura production is closed. Auras 1–12 retain their current independently accepted exact hashes, including Dream Aurora `/assets/catalog/auras-11-w11-v3.jpg` at Git blob `7f3372c1584e07f18a3abfc7818013190fff1560`. This document does not regenerate, alter, review, or re-map any Aura and does not claim another catalog family.

This is a bounded art-direction handoff for later Workstream-15-coordinated visual finishing. It changes no gameplay, learning, persistence, economy, catalog metadata, player data, shared runtime, CSS entrypoint, Replit/Floot state, deployment state, paid setting, or release gate.

## Authoritative reference basis

Use only the verified originals and the measured design contract:

- Home original: `docs/preproduction/reference-screenshots/originals/home-1448x1086.jpeg`, SHA-256 `6a4b110aeaf12a6ab0c629f9181cc6cfa8d4f55a518d4f2a6adb3ac6e756c457`.
- Store original: `docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg`, SHA-256 `b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d`.
- Quest original: `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg`, SHA-256 `70f1b952709a85c77bb11851ffe9ae704acf8b97640355e908b6ec537b5c73c9`.
- Normalized comparison size: `1408 × 1056`.
- Shared measured geometry/material source: `docs/preproduction/DESIGN_SYSTEM_CONTRACT.md`.

The coordinate masks below are derived from that measured contract against the normalized authoritative references. They are implementation targets, not claims that new runtime pixels or performance measurements were produced in this pass. There are no authoritative tablet/phone reference pixels; those sizes remain hierarchy/readability/performance targets only.

## Material hierarchy

Later effects should preserve the reference’s hierarchy instead of adding equal-energy glow everywhere.

1. **Scene atmosphere — lowest visual energy.** Warm blush/peach/lilac/cream environment remains visible behind chrome. Any atmospheric mote layer belongs behind panels and must not compete with the avatar face, item art, or instructional text.
2. **Stable chrome — always readable.** Primary dark panel gradient `#155FCB → #0D439D → #082A70`, 3 px cyan rim (`#63D9F4`), pale inner keyline, deep navy lower bevel, restrained outer depth shadow.
3. **Selected/active material — localized.** Strong cyan/ice rim (`#8AE9FF` / `#D6F8FF`) and one controlled halo around the active destination. Do not animate every card or panel.
4. **Event accent — shortest lived.** Star Sparks / glints / motes appear only for a real selection, equip, room reveal, or semantic correct state. They never become the only indicator of state.
5. **Text/control layer — visually protected.** Event effects must sit behind labels, prices, answer copy, CTA text, focus outlines, and semantic status cues. `pointer-events: none` is required for any later presentation-only overlay.

### Proposed desktop glow envelope

For later implementation/QA, keep persistent halo spill visually tight: approximately 10–18 px beyond the owning panel/card edge at the 1408×1056 reference. A one-shot event may briefly reach farther, but should not create a large-screen bloom field or wash neighboring text. This is a proposed visual budget to be validated by Workstream 14, not a measured PASS.

## Home — effect zoning at 1408×1056

Measured reference regions:

- Room Progress: `x 520–1130`, `y 84–250`.
- Avatar hero envelope: `x 520–930`, `y 260–825`.
- Dream Goal: `x 1138–1395`, `y 118–680`.
- Daily Quests: `x 14–425`, `y 705–1034`.
- Customize tray: `x 442–1045`, `y 822–1035`.
- Today I’m Learning: `x 1062–1396`, `y 772–930`.
- Motivational card: `x 1062–1396`, `y 938–1028`.

### Home ambient-light mask

**Primary ambient anchors:** Room Progress and Dream Goal only. A very low-energy static/pulsing cyan-ice halo may hug these two panels later. Do not add persistent ambient glow to Daily Quests, Customize, Today I’m Learning, and the motivational card simultaneously; those panels are support surfaces and should remain calmer than the avatar/room hero area.

**Avatar protection rule:** the avatar envelope is a visual hero zone, not a particle canvas. Any later Buddy/avatar idle treatment is wrapper-transform-only and must keep the face and equipped-item silhouette clean. If a Star Spark path would cross the head/face or speech copy, route it behind the illustration layer or do not emit it.

**Room Progress reveal:** five real tier previews remain present according to real state. A later reveal may use only shallow opacity/translate settling with the final tile available immediately. Current-tier gold emphasis is allowed only from true progress state. Locked tiers keep truthful lock treatment.

### Home reduced-motion still

- Room Progress and Dream Goal retain fixed cyan/ice rim depth, no pulse.
- Avatar/Buddy are completely static, with fixed contact shadow/rim light supplying depth.
- Five actual room-tier tiles render immediately; no stagger, delayed visibility, or motion-dependent information.
- Daily Quests / Customize / Today I’m Learning remain unchanged and readable, with no decorative sparkle field over copy.

## Store — effect zoning at 1408×1056

Measured reference regions:

- Main Store chrome / grid envelope: approximately `x 178–1020`, `y 79–808`.
- Avatar try-on stage: `x 1030–1408`, `y 160–630`.
- Selected-item detail: `x 1035–1398`, `y 630–842`.
- Lower collection strip: `x 10–1098`, `y 832–1048`.
- Lower learning/value panel: `x 1102–1398`, `y 850–1048`.
- Wide-reference density: 6 columns × 3 full rows; card width 128–142 px, card height 145–158 px, art area 88–102 px.

### Store selection material

A later selected card gets the strongest local cyan/white rim in the grid, but the card must not change size or shift neighbors. Use the design-system selected glow as the baseline (`0 0 0 2px rgba(150,235,255,.38), 0 0 18px rgba(74,207,255,.55)`) and verify card-name/price readability rather than increasing blur until it looks bright.

A selection Star-Spark path may connect the selected card’s **art area** to the try-on/detail destination, but it should avoid routing through the item-name/price text band. Prefer a short edge-to-stage trajectory over a sweeping diagonal across multiple cards. The destination art/state is available immediately; the path is garnish and may finish afterward.

### Store equip material

On real equipped state, preserve a persistent non-motion cue first: equipped outline/badge/text/material already owned by the Store. A one-shot 8–12-particle destination burst may sit around the avatar/item silhouette, with near/mid/far scale hierarchy. Do not obscure the avatar face or newly equipped object.

### Store scroll exclusion mask

The main grid and lower collection strip are scrolling/dense regions. No persistent particle canvas, animated backdrop blur, or large animated shadow should be attached to every card. When the user scrolls, only the selected/equipped stable material remains; transient particles should already be cleaned up or clipped to their owning local overlay.

### Store reduced-motion stills

**Selected:** exact selected card has the stronger cyan/ice rim and the try-on/detail destination has one fixed soft halo. No traveling path, scale-up, bounce, or pulse.

**Equipped:** equipped state remains persistent through existing semantic state styling; add at most a restrained fixed three-to-five-star cluster near the destination art. Scrolling must not create changing glow intensity or animated filters.

## Quest — effect zoning at 1408×1056

Measured reference regions:

- Quest header: `x 390–1172`, `y 82–153`.
- Phase strip: `x 390–1172`, `y 153–224`.
- Left avatar/encouragement zone: `x 12–380`, `y 205–960`.
- Central lesson/question body: `x 384–1173`, `y 238–900`.
- Right mastery rail: `x 1182–1398`, `y 222–900`.
- Earned summary: `x 470–855`, `y 925–1022`.

### Quest low-motion sanctuary

While unanswered/reading, the central lesson/question body is a **low-motion sanctuary**. Do not run ambient sparkle fields, pulsing answer borders, moving gradients, or attention-steering glows inside it. The passage and answer choices must remain equally neutral until the existing learning semantics establish a result.

The left avatar zone may retain static premium depth; any later idle drift should be extremely small and should pause or be suppressed if it distracts from reading at compact widths. The right mastery rail may use stable bevel/rim treatment but no urgency, countdown, streak-loss, or FOMO animation.

### Correct-answer material

Only a reliable existing semantic `correct` state may activate the celebration recipe. Do not infer correctness from visible text or generic DOM phrase matching.

- Local green success keyline using `#35CC6A` / `#91F0AD`.
- One bounded 8–14-particle gold/ice burst, roughly 760–980 ms later if implemented.
- Keep question/answer geometry stationary.
- Keep the next action immediately available; animation cannot delay continuation.
- Do not send particles across passage text or other answer choices.

Wrong / clue / retry states receive **zero** Star Sparks, gold reward flare, bounce, success bloom, or celebratory avatar reaction. They keep instructional feedback only and must remain visually distinguishable from correct.

### Quest reduced-motion states

- **Unanswered:** calm light lesson surface, no celebratory emphasis on any choice.
- **Correct:** instant static green keyline + small fixed gold/ice star cluster positioned outside answer copy.
- **Wrong / clue / retry:** existing instructional treatment only; no gold cluster or success halo.
- **Next question:** all prior success decoration is removed before the new unanswered frame is judged.

## Cross-screen static reduced-motion invariants

These invariants are required for the later reduced-motion implementation to feel intentionally designed rather than merely “animations disabled.”

| Visual purpose | Normal-motion option | Required static equivalent |
| --- | --- | --- |
| Premium anchor | restrained halo opacity change | fixed cyan/ice rim + inner keyline + fixed soft halo |
| Store selected | bounded card→destination spark travel | stronger selected-card rim + fixed destination halo |
| Store equipped | one destination burst | persistent equipped state + restrained fixed star cluster |
| Quest correct | bounded green/gold success emphasis | static green success keyline + fixed gold/ice cluster |
| Home room reveal | shallow opacity/translate settle | all true tiles visible immediately with truthful current/locked materials |
| Avatar/Buddy life | tiny wrapper-only drift/sway | fixed contact shadow + rim light + static Buddy highlight |
| Screen entry | short opacity/2–6 px settle | destination renders immediately in final position |

Reduced-motion must not remove selected/equipped/correct distinctions, hide content, change state, or substitute a different information hierarchy.

## Occlusion and compositing rules

1. Particle overlays are presentation-only and must never receive pointer/focus events.
2. Text, button labels, focus rings, answer copy, item names/prices, and semantic badges stay above decorative particles/glow.
3. Event overlays must have a deterministic owner and cleanup trigger; no orphan layer may persist after screen navigation, item change, Quest advance/retry, or `prefers-reduced-motion` change.
4. Persistent ambient effects should be limited to one or two hierarchy anchors per screen, not every panel.
5. Prefer transform/opacity for later moving elements. Do not animate panel dimensions, border width, layout positions, or large backdrop-filter kernels.
6. No persistent full-screen particle canvas. Effects are local to the owning panel/art destination and disappear when the event is over.
7. No effect may cover or imply a fake catalog state, fake reward, fake room unlock, fake progress, or answer hint.

## Later Workstream-14 evidence packet

This specification creates **no render/performance PASS**. When Workstream 15 authorizes shared-entrypoint implementation, Workstream 14 should capture actual evidence rather than infer from CSS:

- Home at 1408×1056: room-progress pre/final state plus reduced-motion still; verify avatar face and five room tiles remain unobscured.
- Store at 1408×1056: selection pre/peak/settled, equip pre/peak/settled, one grid scroll with selected/equipped state visible, and equivalent reduced-motion stills.
- Quest at 1408×1056: unanswered, correct peak/settled, wrong, clue, retry, next-question cleanup, plus the reduced-motion equivalents.
- Repeat readability/cleanup checks at 1024×768, 390×844, and 320×568, explicitly treating them as responsive QA rather than authoritative pixel-match references.
- Record actual paint/composite behavior during one Store selection/equip event and one Store scroll; verify no layout shift or scroll-position jump from effects.
- Verify no celebratory visual remains when Quest moves from correct to next question or into wrong/clue/retry.

Until those captures/traces exist, normal-motion render QA, reduced-motion render QA, and paint/composite/scroll profiling remain **OPEN / NOT EXECUTED**.

## Coordination handoff

- **11:** preserve all accepted Aura bytes; do not claim another catalog family. Maintain this visual recipe only until 15 coordinates implementation or reassigns work.
- **12:** later implementation must consume reliable existing correct/wrong/clue/retry semantics; no text-derived correctness.
- **14:** later judge actual rendered normal/reduced states and paint/composite/scroll behavior against the bounded masks above.
- **15:** coordinate any shared runtime/CSS entrypoint changes and resolve ownership before implementation.
- **08:** no action from this document; Aura canonical mappings remain untouched.

`ART_VISUALS_COMPLETE` is not declared by this spec. Deployment remains frozen pending separate final approval and all applicable release evidence.