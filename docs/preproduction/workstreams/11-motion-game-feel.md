# Workstream 11 — Motion + Game Feel

STATUS: **IMPLEMENTED FIRST PREMIUM-MOTION PASS / FULL BUILD + RENDER QA PENDING**

Branch: `screenshot-match-preproduction`
Replit: **untouched**
Main: **not merged**

## Changes completed

- Read the screenshot-match target, coordination contract, measurable design-system contract, current Home/Store/Quest presentation layers, and the latest preproduction branch before editing.
- Added `src/motionGameFeelRuntime.js` as an additive, presentation-only motion coordinator. It does not write save state, change rewards, alter question logic, change ownership, or delay learning interactions.
- Added `src/motionGameFeel.css` as the final game-feel layer, loaded after responsive/accessibility styling so reduced-motion rules remain authoritative.
- Added `src/motionGameFeelRuntime.test.js` with bounded-duration, reduced-motion, and positive/negative feedback helper coverage.
- Wired runtime + CSS from `src/main.jsx` while preserving the concurrently landed mobile/accessibility workstream imports.

## Premium motion added

### Panel energy
- Added a very slow, low-amplitude glow/bloom pulse to a deliberately small set of premium anchors: Home Room Progress, Home Dream Goal, Store hero, and Quest top chrome.
- The effect is decorative only and does not move controls or instructional copy.

### Star Spark travel
- Added short-lived original star/spark particles that travel between meaningful interaction points:
  - Store card → try-on stage on item selection;
  - Buy/Try-On action → avatar stage;
  - Home customization item → avatar mount;
  - correct-answer selection → feedback region.
- Spark layers are pointer-events-none, aria-hidden, automatically removed, and never block input.

### Hover / press depth
- Added fine-pointer-only hover lift/brightness to nonessential interactive surfaces.
- Touch/keyboard users do not depend on hover for state or meaning.
- Press feedback uses a short 180ms depth response and remains decorative.

### Avatar + Buddy idle celebration
- Added tiny, slow idle float/sway to the Home avatar mount and Home/Quest buddy surfaces.
- Motion is intentionally low-amplitude and does not shift learning controls or text.
- Existing Store preview bounce remains intact and is supplemented with a short stage highlight rather than replaced.

### Selection / equip feedback
- Selection gets a 520ms brightness/saturation settle.
- Newly equipped Store cards and the avatar stage receive a 720ms confirmation pulse plus a brief Star Spark burst.
- Existing selected/owned/equipped state styling remains the source of truth.

### Correct-answer micro-celebration
- Positive Quest feedback triggers a 920ms question-card celebration and short spark travel.
- Negative feedback phrases (`incorrect`, `not correct`, `wrong`, `try again`) are explicitly excluded from celebration detection.
- No answer handling, clue/retry logic, mastery evidence, rewards, or progression semantics were changed.
- The animation never gates the next learning action.

### Room-progress reveal
- Home Room Progress receives a one-time 760ms reveal when the Home scene mounts.
- Five tier cards settle with small staggered offsets; the total visible sequence remains under one second.
- This is a reveal of existing real progress only; no fake tier unlock or progress value is introduced.

### Gentle screen transitions
- Home, Store, Quest and compatible Study/Room/Avatar roots receive a 420ms opacity/vertical-settle entrance when newly mounted.
- The transition does not delay interactivity, navigation, or content availability.

## Learning-spectacle limits

Custom event-driven spectacle durations are bounded as follows:
- press: **180ms**
- screen entrance: **420ms**
- selection: **520ms**
- equip feedback: **720ms**
- room reveal: **760ms**
- Star Spark travel: **860ms**
- correct-answer celebration: **920ms**

All are within the requested ~0.5–2 second learning-polish envelope except the deliberately faster press/screen micro-feedback. Ambient idle/panel loops are subtle continuous scene polish, not learning gates or reward spectacle.

## Reduced-motion behavior

- `prefers-reduced-motion: reduce` disables every custom animation introduced by this workstream.
- Star Spark layers are not emitted for reduced-motion users; the destination receives a short static outline cue instead.
- Selected/equipped/correct/progression states retain static outline/glow equivalents so meaning is not lost when animation is disabled.
- No critical action, correctness cue, ownership state, progress value, or navigation state is communicated only through motion.

## Performance notes

- Most transient motion uses `transform` + `opacity`; spark particles use `translate3d` and are removed immediately after the burst.
- Ambient panel glow is limited to four premium anchor surfaces rather than every panel/card.
- Particle layers are created only on meaningful interaction events and have no pointer hit-testing.
- A single queued MutationObserver coordinates mount/correct/equip detection rather than installing an observer per component.
- No timers exceed the lifetime of the associated visual burst; transient classes and spark DOM are cleaned up automatically.
- Final browser profiling is still required to verify aggregate paint/composite cost on low-end phones and tablets.

## Safety / product constraints preserved

- No countdowns, urgency, scarcity, streak-loss, punishment, FOMO, or fear-of-loss effects were added.
- Wrong answers receive no punitive animation and never remove currency or possessions.
- No save, economy, inventory, mastery, curriculum, answer-key, source-provenance, or persistence behavior changed.
- Replit was not updated/published and `main` was not merged or modified.

## Tests / checks

- **PASS — branch isolation:** all Workstream 11 changes are on `screenshot-match-preproduction` only.
- **PASS — additive integration review:** motion is implemented through new runtime/CSS/test files plus two imports in `src/main.jsx`; existing screen/economy/learning modules were not rewritten.
- **PASS — reduced-motion design review:** every custom keyframe introduced here has a `prefers-reduced-motion` static equivalent or is suppressed entirely.
- **PASS — duration contract review:** correct/equip/room/spark event durations are all below 2 seconds.
- **ADDED — targeted Vitest coverage:** helper tests cover bounded duration, reduced-motion zero-duration behavior, and positive-vs-negative feedback classification.
- **NOT RUN — full `npm test`:** this workstream did not have a materialized repository dependency tree in its execution environment.
- **NOT RUN — `npm run build`:** consolidated branch build remains a Workstream 14 / Command Center release gate.
- **NOT TESTED — rendered motion QA:** Replit remains intentionally untouched; actual 1408×1056/tablet/390px/320px browser proof is pending.

## Visual / motion gaps remaining

1. Actual browser QA must confirm that the slow panel glow does not produce excessive paint cost on lower-end mobile hardware.
2. Correct-answer detection is presentation-layer text/class observation; Workstream 12 should verify it never produces a false-positive celebration against the final Quest feedback vocabulary.
3. Final rendered QA should verify that Home avatar/buddy idle motion does not collide with speech bubbles or responsive panel edges at 390px and 320px.
4. Store card → avatar-stage Spark travel should be checked against nested scrolling at phone widths; it is viewport-coordinate based and should remain correct, but real-device proof is still required.
5. If Workstream 14 finds motion visually too strong relative to the approved screenshots, tune amplitudes/durations in `motionGameFeel.css` rather than changing underlying app behavior.

## Blockers

- **No functional blocker found in Workstream 11.**
- Release-quality PASS is blocked on consolidated `npm test`, `npm run build`, browser performance profiling, reduced-motion browser proof, and rendered screenshot/motion comparison.

## Handoff

- Workstream 12: verify positive-feedback detection against the final learning feedback vocabulary and confirm no UI mutation changes answer/evidence semantics.
- Workstream 13: confirm motion runtime remains read-only with respect to save/economy state.
- Workstream 14: run full build/tests; render Home/Store/Quest at 1408×1056, tablet, 390px and 320px; profile paint/composite cost; test `prefers-reduced-motion` and keyboard/touch paths.
- Command Center: keep `motionGameFeel.css` last among visual polish layers unless a measured integration conflict requires a narrower selector fix.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction sign-off.**
