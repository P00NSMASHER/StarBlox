# Workstream 07 — Progression / Dream Goal / Daily Quest Widgets

STATUS: **IMPLEMENTED FIRST SCREENSHOT-MATCH PASS / FULL BUILD + RENDER QA PENDING**

Branch: `screenshot-match-preproduction`

## Changes completed

- Read the screenshot-match target, coordination contract, measurable design-system contract, latest Home runtime/composition, current progression/economy state, and the current branch head before editing.
- Kept this workstream additive: no changes to learning answers, reward policy, save migrations, purchase logic, item IDs, or existing ownership/progress values.
- Added `src/progressionWidgetsRuntime.js` with a pure real-state progression model plus additive DOM decoration for the Home screenshot composition.
- Added `src/progressionWidgets.css` as a final widget layer loaded after the existing Home screenshot-match CSS.
- Added `src/progressionWidgetsRuntime.test.js` for progression-model invariants.
- Wired the runtime/CSS through `src/main.jsx` without touching Replit or `main`.

## Screenshot-match progression upgrades

### Three goal horizons
The Home now makes three time horizons explicit without adding fake progress:
- **NOW** — real Daily Quest completion (`0–3` existing tracked goals);
- **NEXT DREAM** — the real selected Dream Goal and exact remaining Coins, or owned state;
- **BIG DREAM** — real Star Worth progress toward the next Home tier and ultimately Star Mansion.

### Room Progress
- Preserves exactly five canonical Home tiers and their exact names:
  1. Tiny Starter Studio
  2. Cozy Loft
  3. Creator Bedroom
  4. Skyline Penthouse
  5. Star Mansion
- Uses real `starWorth` thresholds from `gameModel.roomTiers`.
- Distinguishes **CURRENT HOME**, **UNLOCKED**, and locked-at-Star-Worth states.
- Adds accessible progressbar semantics to the existing next-tier meter.
- Shows both Star Worth to the next tier and percentage progress toward Star Mansion.

### My Dream Goal
- Uses the actual `dreamGoalId`, current Coins, item price, and owned inventory.
- Adds a clear **NEXT DREAM** / **GOAL COMPLETE** chip.
- Goal completion is shown only when the selected item is actually in `owned`.
- Adds progressbar semantics without changing purchase requirements or Dream Goal routing.
- Keeps permanent-ownership language; no timer, urgency, scarcity, or fear-of-loss framing.

### Daily Quests
- Keeps the existing three real counters only:
  - Finish a 5-Action Quest;
  - Solve 2 Transfer Challenges;
  - Choose a Reward.
- Adds mini progress meters and concise real benefit copy.
- Does not invent a fourth quest, bonus, streak, or expiring reward.
- Explicitly states that daily counters reset for a fresh day while persistent progress does **not** reset: Coins, XP, Stars, owned items, mastery, and Home progress remain.

### Today I’m Learning + Mastery
- Adds real learning-state badges based on existing `stats`, `masteryCorrect`, `independentCorrect`, and `mastered` state.
- Adds a compact Mastery card showing:
  - real Mastery Stars (`save.stars`);
  - real mastered-skill count (`save.mastered.length`);
  - the strongest next not-yet-mastered skill by existing independent mastery evidence.
- Never converts assisted/retry evidence into invented mastery progress; it displays the already-recorded `masteryCorrect` field.
- If no evidence exists yet, the widget says the learner is ready rather than fabricating progress.

### Reward tiles + collection progress
- Adds real-state summary tiles for current Coins, Mastery Stars, and permanent collection ownership.
- Collection progress is derived from the actual `owned` array against the existing 192-item store.
- Adds real owned counts to the five Home customization groups: Outfit, Hair + Face, Gear, Buddy, and Room.
- Adds a permanent collection meter; no item is counted unless its existing item ID is actually owned.

## Safety / economy / persistence invariants

- No save reset or migration change.
- No item IDs, prices, Star requirements, or ownership semantics changed.
- No reward-policy code changed.
- No punitive streak loss or streak mechanic added.
- No FOMO, expiring rewards, timers, scarcity, random paid rewards, or fear-of-loss copy added.
- Daily-reset language explicitly separates temporary daily counters from persistent player progress.
- Existing Home/Dream/collection values remain the only source of truth.

## Files changed

- `src/progressionWidgetsRuntime.js`
- `src/progressionWidgets.css`
- `src/progressionWidgetsRuntime.test.js`
- `src/main.jsx`

## Tests / checks

- **PASS — branch isolation:** all edits were made only on `screenshot-match-preproduction`.
- **PASS — Replit untouched:** no Replit update/publish action was called.
- **PASS — model invariant review:** the added tests cover canonical five-tier names, Dream Goal real-state behavior, Daily Quest counters, independent mastery evidence, 192-item permanent collection accounting, and Star Worth Home progression.
- **PASS — observer loop guard:** progression DOM decoration now fingerprints real state and avoids repeatedly rewriting the same widgets on its own MutationObserver events.
- **PASS — integration inspection:** `src/main.jsx` loads the progression runtime after Home runtime layers and the progression stylesheet after the existing screenshot-match CSS.
- **NOT TESTED — full `npm test`:** the automation runtime does not have a materialized dependency tree; repository clone/install could not be performed from the isolated container because outbound GitHub DNS is unavailable.
- **NOT TESTED — `npm run build`:** same execution limitation. Workstream 14 / Command Center must run the consolidated branch build.
- **NOT TESTED — rendered screenshot comparison:** Replit was intentionally not updated/published, and no production preview was used.

## Visual gaps remaining

1. Final 1408×1056 rendered proof is still required to verify that the added three-horizon strip, reward tiles, Mastery card, and exact tier labels preserve the intended panel envelopes without crowding.
2. Workstream 09 environment art and Workstream 06 final avatar/buddy fidelity remain dependencies for full screenshot parity, but progression widgets are not blocked on their state model.
3. Workstream 10 should verify 390 px / 320 px reflow, especially the single-column horizon strip, readable Mastery copy, horizontal customization tabs, and 44 px interaction targets.
4. Workstream 14 should verify that the Home Daily panel remains within the target vertical envelope after the added persistent-progress summary and real-state reward tiles.
5. The Home Today’s Learning panel intentionally displays recent real evidence rather than fabricating five subject-progress percentages merely to mirror the reference artwork.

## Blockers

- **No progression-state or persistence blocker found.**
- Release-quality visual PASS is blocked on consolidated build/tests and actual rendered visual comparison.

## Handoff

- Workstream 10: validate accessibility, overflow, and 390/320 px widget reflow.
- Workstream 12: ensure the displayed `masteryCorrect` / mastered state continues to match learning-integrity semantics after final integration.
- Workstream 13: verify no persistence regression around daily reset versus permanent progress language/state.
- Workstream 14 / Command Center: run the full test/build suite and rendered screenshot comparison, then make only measured spacing/density fixes if needed.
- Keep the three-horizon contract intact: **current Quest/daily action → Dream Goal → long-term Home/world/collection progress**.
- **Do not update/publish Replit and do not merge to `main` until coordinated preproduction sign-off.**
