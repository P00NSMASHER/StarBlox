# Workstream 12 — Learning Integrity Guard

STATUS: **EXECUTION-BACKED PASS / REAL-BROWSER RELIGION CASE PASS / CATALOG_SPRINT ACTIVE**

Branch: `screenshot-match-preproduction`  
Current audited branch head: `9a041e14f09e89b0000ae60eaf3172dd4e529dc3`  
Runtime/build evidence head: `f654431b2bb76d2eceb322dd35c613dfad17e7ae`  
Phase: `CATALOG_SPRINT`  
Replit/Floot: **untouched**  
Main: **not merged or modified**

## Current learning gate

Workstream 12 has **0 current P0 learning defects, 0 quarantined families, and 0 new learning-content P1 defects**.

The prior consolidated CI/build evidence is still applicable because branch comparison from `f654431b...` through the current audited head contains no learning/runtime or canonical catalog mapping change:

- **20/20 test files PASS**;
- **85/85 tests PASS**;
- production build **PASS**;
- workflow run `35641273312`, job `106470895718`.

Stable learning/runtime hashes:

- `gameModel.js` — `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`;
- `questionQualityRuntime.js` — `3f47e96074c4d2e1e3f1e835aed27c654d8f072a`;
- `semanticQuestionGuardRuntime.js` — `f21bd7d9c55610bfe00c04c2e2f81efaa2e3f591`;
- `diagnosticQuestionGuardRuntime.js` — `81eba5b34384dbc7699dde70ce048e401458570f`;
- `questRewardPolicy.js` — `4ae853a7f4bb04a811ef04b4b9a306066e33829b`.

No canonical catalog integration occurred during this interval; Workstream 08 currently reports zero qualified ACCEPTs/promotions. Catalog review/rework churn therefore has not entered the learning runtime.

## New real-browser evidence

This pass did not waste another full CI run on unchanged runtime bytes. It instead closed a previously untested browser learning case using the existing Playwright release artifact from run `35631059432`, artifact `10654114272`.

The rendered question is **`religion-transfer-2`**.

Specific approved Religion Unit 1 source content used for semantic comparison:

- `Creation is a gift from God.`
- `We show gratitude by caring for creation.`

Rendered transfer item:

- prompt: `Creation is a gift from God. Which action best shows care for creation?`
- keyed answer: `Put litter in a trash can after a picnic.`
- distractors: leaving paper on the grass / pulling garden plants out just to discard them.

**Semantic result: PASS.** The key directly applies the approved teaching; the two distractors contradict it and are not reasonable alternate correct answers.

Browser findings:

- 1408×1056: prompt, all three choices, Read aloud, Hint, mastery/evidence copy and reward-safe copy are visible; no browser/runtime error or horizontal overflow.
- 390×844: all three answers are visible, 344 px wide × 64.94 px high, **16 px** answer text.
- 320×568: all three answers are visible, 278 px wide, 64.94–85.41 px high, **16 px** answer text; prompt remains readable in the captured viewport.
- 1024×768: Quest mounts without runtime error or horizontal overflow.
- Initial state has **no answer-key visual cue**. The deterministic shuffled correct answer is B, while A/B/C share the same initial presentation.
- Visible policy copy is consistent with scoring rules: only eligible first-try answers build mastery; clue-assisted success does not count as mastery/transfer evidence; mistakes do not remove rewards and there is no speed bonus.

Evidence hashes are stored in `docs/preproduction/catalog-sprint/learning-qa.json` / `.md` and `QUESTION_QA_RUN_LOG.md`.

Continuity check from that browser artifact to current branch:

- `questScreenshotMatchRuntime.js` is unchanged;
- later mobile-accessibility runtime edits only reserve intrinsic dimensions for Store artwork;
- later mobile-accessibility CSS edits only raise Store-card text floors;
- Quest-specific prompt/answer/read-aloud rules are unchanged.

## Family status

- **Phonics/rhyme/vowels/spelling — PASS.** Existing executed regressions remain applicable; audited generators/guards did not change.
- **High-frequency words/vocabulary — PASS.** Meaning-led HFW and vocabulary guards unchanged; no new family mutation.
- **Reading inference/evidence/character reasoning — PASS.** Hardened family and source mapping unchanged.
- **Religion Unit 1 — PASS.** Executed family regression remains green, plus `religion-transfer-2` now has source-bounded real-browser verification.
- **Five-action deterministic Quest — PASS.** Executed fixed-date selector test remains applicable; selector code unchanged.
- **First-try vs assisted evidence — PASS.** Executed reward regression unchanged, and browser mastery copy agrees with it.
- **Wrong/retry farming prevention — PASS.** Reward policy unchanged and existing regression remains applicable.

## Catalog/import safety relevance

`.github/workflows/catalog-staged-art-qa.yml` was newly reviewed. It is a QA-only Playwright fixture that serves catalog **lighting SVGs** from localhost and uploads screenshots/report. It is not imported into the game and cannot rewrite questions, keys, choices, sources, Quest selection or rewards.

The CI workflow now ignores documentation-only pushes; the test/build commands themselves are unchanged. No learning correctness regression was introduced.

The previously added `catalogAssetSafety.test.js` remains the executable SVG active-content/external-reference guard. Workstream 12 does not duplicate Workstream 14's visual-art QA.

## PASS / FAIL / BLOCKED / NOT TESTED

| Area | Status |
| --- | --- |
| Answer keys / unique choices / source mapping | **PASS** |
| Phonics/rhyme/vowel/spelling semantics | **PASS** |
| HFW/vocabulary semantics | **PASS** |
| Reading inference/evidence | **PASS** |
| Religion Unit 1 | **PASS** |
| Five default Quest actions / determinism | **PASS** |
| Assisted retry excluded from independent mastery/transfer | **PASS** |
| Wrong/retry reward farming | **PASS** |
| Browser readability/cue check for `religion-transfer-2` at 1408/1024/390/320 | **PASS — headless Chromium** |
| Physical-device Quest behavior | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA | **NOT TESTED** |
| Fresh browser click-through of correct/wrong/clue/retry states this pass | **NOT TESTED**; existing automated reward/evidence regression remains applicable |

## Ledger / quarantine

No new row was added to `QUESTION_QA_LEDGER.md`: the audited item, generator, source mapping and Quest selector are unchanged, and the ledger explicitly says unchanged settled items should not be re-entered. The new browser evidence was appended to `QUESTION_QA_RUN_LOG.md`.

No P0 family required quarantine. If a future verified P0 appears, quarantine the affected family even if that makes the production pool smaller.

## Handoff

**08 Catalog integration:** keep art integration as stable item-ID → image mapping only. Documentation/review-only catalog changes do not require redundant learning CI. The first actual canonical runtime/asset integration must rerun affected CI/build before release.

**14 Visual QA:** preserve the neutral answer state and current phone readability floor while fixing Quest geometry. The browser hashes recorded by Workstream 12 are learning-legibility evidence, not screenshot-parity evidence.

**15 Command Center:** no learning blocker exists through audited head `9a041e14f09e89b0000ae60eaf3172dd4e529dc3`. Trigger a fresh Workstream-12 audit if `gameModel`, any question guard, Quest selector/scoring, reward policy, Quest decorator, or Quest-specific accessibility rules change.

When the catalog gate eventually changes phase to `GAME_FINISHING`, resume full browser learning checks: actual five-action progression, correct auto-advance, wrong→clue→retry, TTS/read-aloud, independent/assisted evidence, reward idempotency and final legibility at target widths.

**Never update/publish Replit, use Floot, merge to `main`, deploy, expand curriculum without approval, or modify real player data from this workstream.**
