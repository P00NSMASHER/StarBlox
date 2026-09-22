# Workstream 05 — Quest Screen

STATUS: **IMPLEMENTED / STATIC CHECK PASS / FULL BUILD + RENDER QA PENDING**

Branch: `screenshot-match-preproduction`

## Changes completed

- Read the screenshot-match target, coordination contract, measurable design-system contract, current `QUESTION_QA_LEDGER.md`, Quest learning/reward regression tests, current Quest visual/runtime layers, and the latest branch before editing.
- Kept the Quest implementation additive rather than rewriting `src/App.jsx`.
- Added `src/questScreenshotMatchRuntime.js` to decorate the existing Quest with screenshot-reference hierarchy while preserving React-owned learning behavior:
  - explicit gold **QUEST** screen identity;
  - district → skill → pedagogical-role breadcrumb;
  - accessible `Action N/5` labeling without changing the five-action Quest contract;
  - stage strip accessibility (`aria-current`) for Diagnose → Practice → Review → Transfer;
  - **READ · THINK · PROVE IT** learning rhythm above the source-grounded prompt;
  - answer-area heading and clear instant-check expectation;
  - answer pressed-state accessibility while preserving existing immediate-answer behavior;
  - non-punitive HINT language that correctly states the clue appears after a calm first try;
  - polite live-region feedback semantics;
  - reading-specific **READING MASTERY** label only for reading evidence, otherwise **SKILL MASTERY**;
  - **TODAY’S LEARNING** rail normalization;
  - original StarBlox encouragement/buddy card;
  - bounded reward copy: earned rewards stay owned, mistakes do not remove anything, no speed bonus.
- Added `src/questScreenshotMatch.css` as the final Quest-specific visual layer:
  - converted the passage/question presentation from the earlier dark slab to the approved predominantly white/light reading surface;
  - deep navy/cobalt chrome, cyan rim lighting, gold Quest identity, green success, and pink/lilac encouragement accents aligned to shared tokens;
  - 1408×1056 wide-reference geometry targeted to the design contract: header near y≈80, stage strip near y≈154, large left avatar zone, central 58/42-ish lesson/answer split, right evidence rail, and bounded earned-reward footer;
  - answer controls remain large and tactile, with strong focus and selected-state treatment;
  - desktop passage typography raised for readability and phone instructional type kept at 15 px minimum;
  - existing tablet/phone reflow is preserved, with additional compact header/breadcrumb rules rather than shrinking the desktop layout literally;
  - `prefers-reduced-motion` removes transitions/animation in this final layer.
- Wired the runtime and CSS through `src/main.jsx` after existing Quest layers so this workstream converges them rather than modifying their underlying behavior.
- Added `src/questScreenshotMatchRuntime.test.js` for pure presentation-helper regressions.
- Corrected the answer-heading insertion strategy so it is visually first via flex order while remaining after the three React answer buttons in the DOM; this preserves the existing `nth-child` A/B/C badge mapping.

## Learning / reward invariants preserved

- Default Quest selection remains exactly **5 actions** (`gameModel.pickQuest(save.stats,5)`).
- No answer key, prompt, choice, source mapping, role, difficulty, mastery eligibility, scheduler, or question-bank data was changed.
- Read-aloud remains the existing `speechSynthesis` path and still reads the current source-grounded prompt.
- Existing clue + retry behavior is preserved: a wrong first attempt reveals the question hint, then the learner retries.
- Existing reward/evidence policy is untouched: clue-assisted success cannot receive Coins, Mastery Star, or transfer evidence; first-wrong learning is non-punitive; repeated wrong retries do not generate extra reward.
- Existing question QA state remains authoritative: changed visual code does not reclassify or re-audit question families.
- No currency, possessions, progress, mastery, or save-state fields are removed or reset.

## Checks

- **PASS — runtime JavaScript syntax:** `questScreenshotMatchRuntime.js` checked with `node --check` in an isolated local syntax check.
- **PASS — presentation helper assertions:** local Node assertions verified district/role parsing and reading-vs-general mastery labeling.
- **PASS — import-path inspection:** latest `src/main.jsx` contains `questScreenshotMatchRuntime` and `questScreenshotMatch.css` while preserving concurrent Home/Store imports.
- **PASS — structural learning inspection:** current `App.jsx` still starts Quest with `gameModel.pickQuest(save.stats,5)`, retains read-aloud, clue/retry, and the existing `scoreQuestAttempt` path; this workstream did not edit those files.
- **NOT TESTED — full `npm test`:** the available GitHub CI runs only for `main` push/PR, and this automation environment could not materialize/install the branch dependency tree for a full Vitest run.
- **NOT TESTED — `npm run build`:** same execution limitation; release QA/Command Center must run the consolidated branch build.
- **NOT TESTED — rendered pixel comparison at 1408×1056 / 1024 / tablet / 390 / 320:** Replit was intentionally not updated, and no production render was used during this workstream.

## Visual gaps / remaining QA

1. Final screenshot-level fidelity still depends on Workstream 06’s avatar/buddy art pass; this workstream keeps the current original Quest guide asset and scales it to the approved left-vignette envelope.
2. Browser rendering must confirm the wide-reference central panel fits the target vertical envelope without collision with the fixed shared HUD on shorter 1366×768 laptops.
3. The game intentionally checks an answer immediately when the child taps it; the reference’s large green manual **Check My Answer** control is therefore not copied as a fake button. A manual check CTA should only be introduced if the underlying interaction model is deliberately changed and re-QA’d later.
4. Hint remains pedagogically gated behind the first miss, matching the established clue+retry contract. The pre-answer panel explains this rather than revealing the clue early.
5. Final contextual illustration selection remains owned by `questContextArtRuntime.js`; visual QA should verify all five adaptive daily selections receive sensible, non-stretched art.
6. Full visual acceptance needs actual rendered comparison; static CSS geometry alone is not a PASS for screenshot parity.

## Blockers

- **No functional blocker identified in this workstream.**
- Consolidated full tests/build and rendered visual comparison remain release-gate dependencies.
- Do not merge to `main` or update/publish Replit from this workstream.

## Handoff

- Workstream 06 may replace/improve the left guide avatar and buddy presentation but should preserve `.questCharacterStage`, `.questGuideAvatar`, `.questGuideSpeech`, and `.questBuddyPanel` contracts or update this CSS deliberately.
- Workstream 09 may improve `learning-room.svg`/Quest scene depth without darkening the light reading surface.
- Workstream 10 should validate the final 44×44+ touch targets, 15 px phone instructional text, focus visibility, reduced motion, and no horizontal overflow.
- Workstream 12 should rerun semantic/Quest learning regressions after all UI integration is complete; no visual change should be allowed to alter the current five adaptive selections, answer keys, mastery eligibility, or source provenance.
- Workstream 14 / Command Center must run `npm test`, `npm run build`, and rendered screenshot comparison before marking Quest visually complete.

**Replit remains untouched.**

## ART_AND_VISUALS_ONLY reference composition specification — 2026-09-22

This section is a **visual review specification only**. It does not change Quest runtime, learning content, answer behavior, rewards, state, economy, shared entrypoints, or release gates. The authoritative source is the preserved original Quest screenshot at `docs/preproduction/reference-screenshots/originals/quest-1448x1086.jpeg` (SHA-256 `70f1b952709a85c77bb11851ffe9ae704acf8b97640355e908b6ec537b5c73c9`) and its uniform, uncropped 1408×1056 comparison derivative (SHA-256 `359ee4b24dbe2a3a3ef89327115fc70927d3d3eab1fb349c43d5c1020ea0ba8d`). Measurements below are **target envelopes read from the reference**, not claims about current runtime geometry.

### Six composition targets at the 1408×1056 reference size

| Region | Reference target envelope | Visual requirement |
| --- | --- | --- |
| Quest header | approximately `x 375–1145`, `y 78–149` | Deep cobalt/navy identity band with clear Quest title, compact secondary context, cyan edge light and restrained gold/star accents. It must remain visually subordinate to the global HUD rather than collide with it. |
| Stage strip | approximately `x 375–1145`, `y 150–222` | Four-stage Diagnose → Practice → Review → Transfer progression immediately under the header; active state must read in one glance without stealing vertical space from the lesson. |
| Avatar stage | approximately `x 0–375`, `y 490–1056` | Large, expressive lower-left character vignette with face/hands readable, no important clipping, and no overlap into passage or answer controls. Keep navigation legible above/alongside it. |
| Learning body | approximately `x 372–1143`, `y 231–900` | Dominant light/white reading surface. Preserve a roughly 58/42 lesson-to-answer split, generous passage leading, high-contrast answer controls and one clear focal hierarchy. Environmental art must never sit directly behind instructional text at competing contrast. |
| Mastery / learning rail | approximately `x 1148–1368`, `y 216–625`, with encouragement below | Narrow right rail for mastery and current learning evidence. Keep the rail visually dense but structurally separate so it does not squeeze or darken the main learning surface. |
| Earned summary | approximately `x 460–845`, `y 904–1000` | Compact earned-state summary anchored below the learning body. It must reflect real earned state only and must not obscure the avatar vignette or imply rewards that were not earned. |

These envelopes intentionally preserve the reference's strong three-column read: character/world on the left, bright learning work in the center, evidence/progression on the right. Later runtime matching should solve spacing/cropping inside these envelopes rather than flattening the screen into one full-width card.

### Current Quest environment candidates — actual-pixel review

The current visual QA artifact `10678720279` contains two 1408×1056 Workstream-13 Quest room candidates that were inspected at actual pixels:

- `quest-learning-room-w13-v1-1-221add18.png` — SHA-256 `29ac951ad39ae5fd10ed77db407e4a05726dde58607efec58d79363112e22cd9`. **Preferred composition base.** It has coherent three-dimensional bookshelf depth on both sides, a soft chair/reading nook at lower left, a small desk and plant at lower right, two luminous star pendants, a bright right window, and a deliberately quiet central rounded panel. The warm clay/orange material family is cohesive and readable, while cyan tape/accent details provide small StarBlox-compatible contrast. Use it as an environmental/background layer only; do not replace the interactive light lesson surface with the room image.
- `quest-learning-room-w13-v1-2-d7b39a38.png` — SHA-256 `de22102a291e8da9f0847ee8b90ce4485b29a1a5d41827f61a2c621b165f6615`. **Hold for crop/edge repair if selected.** Its room construction is similarly strong, but actual pixels contain dark navy vertical bars at both extreme edges and a tighter crop. Those bars are not present in the intended warm room construction and should not survive into a full-bleed Quest scene. This is a scene-composition finding only, not a catalog disposition.

Recommended use: let shelving, window light, chair, desk and plant create peripheral depth around the UI; keep the central lesson body visually light and clean. The room's orange illumination should not wash the white reading surface or reduce answer contrast. Star pendants can echo the game's star identity, but should remain background accents rather than compete with the Quest header or earned-state stars.

### Fidelity safeguards for the next actual runtime render

1. Preserve the exact five-action source-grounded Quest flow, read-aloud, clue-after-first-miss/retry behavior, correct keys, and independent-versus-assisted evidence. This visual spec does not authorize content or scoring changes.
2. Do **not** reproduce the reference screenshot's illustrated question/answer wording, displayed balances, or reward amounts. Use the screenshot for geometry, hierarchy, materials and lighting only.
3. Do **not** add a decorative **Check My Answer** button over the existing immediate-scoring interaction. A visible control must perform the real action it promises.
4. Keep wrong-answer feedback non-celebratory and non-punitive; earned-summary visuals must bind to actual earned state.
5. At 1408×1056, the header, stage strip, learning body, mastery rail and earned summary must have visible breathing room and no overlaps; the avatar must remain fully staged at left without covering instructional content.
6. At narrower desktop/tablet/phone sizes, preserve readable passage/answers and touch-safe controls by reflowing, not by shrinking the full desktop composition or cropping essential controls. There are no authoritative mobile reference screenshots, so mobile acceptance must be based on readability and coherent StarBlox visual hierarchy rather than invented pixel parity.
7. Full visual PASS still requires a real current-runtime render against the reference plus affected tests/build. This documentation pass does not mark any deferred release gate as passed.

### Current catalog-review intake note

A newly surfaced Workstream-06 Companion batch is hash-bound on the branch for `companions-2` (`88d10d6f8c412d0ab7fde6ac7a7ff202858077db`), `companions-5` (`1ae7b431e519563ee1dbbdb0ae762bfee6f95ac0`), `companions-6` (`28cb411201d8ec30dae2f70b740efe1e86985386`) and `companions-7` (`39d35ea40a0a138ae99ddcdc09f8f2a3683fa49d`). Their branch card derivatives are also hash-bound, but the inspected shared render artifacts do not currently expose these four exact candidates, and the available public-browser fallback is unavailable in this non-interactive run. **No ACCEPT/REWORK was recorded without independent actual-pixel inspection.** Workstream 14/15's smallest next action is to expose these already-stored exact detail/card pixels through the shared inspectable render artifact; do not regenerate the images or transfer legacy Companion verdicts.
