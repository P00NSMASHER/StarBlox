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
