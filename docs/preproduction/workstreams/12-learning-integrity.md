# Workstream 12 — Learning Integrity Guard

STATUS: **STATIC INTEGRITY AUDIT PASS / CONSOLIDATED TEST RUN PENDING**

Branch: `screenshot-match-preproduction`
Audited branch head before this pass: `b4b964ee844afcb10bddd007c9bcaf996bd9b1b2`
Learning-integrity test commit: `9bbf25831da6106762ceb0bfce6e29dc32c5f41f`
Replit: **untouched**
Main: **not merged**

## Scope audited

Read and cross-checked:
- `QUESTION_QA_LEDGER.md`
- `QUESTION_QA_RUN_LOG.md`
- `src/gameModel.js`
- `src/questionQualityRuntime.js`
- `src/semanticQuestionGuardRuntime.js`
- `src/diagnosticQuestionGuardRuntime.js`
- `src/questRewardPolicy.js`
- `src/App.jsx`
- `src/main.jsx`
- `src/questScreenshotMatchRuntime.js`
- `src/mobileAccessibilityRuntime.js`
- `src/mobileAccessibility.css`
- `docs/preproduction/SCREENSHOT_MATCH_TARGET.md`
- `docs/preproduction/COORDINATION.md`

Also compared `main` → `screenshot-match-preproduction` before this pass. The screenshot rebuild is additive around the learning engine: the comparison showed no branch edits to `src/gameModel.js`, `src/App.jsx`, `src/questRewardPolicy.js`, `src/questionQualityRuntime.js`, `src/semanticQuestionGuardRuntime.js`, or `src/diagnosticQuestionGuardRuntime.js`. The rebuild does change `src/main.jsx` and adds visual/accessibility runtimes and CSS.

## Findings

### P0 status

**P0 found this pass: 0.**

No screenshot-match change was found that:
- changes a production answer key;
- creates duplicate answer choices;
- removes the keyed answer from the three choices;
- changes the underlying source field;
- promotes clue-assisted retries into mastery/Stars/transfer evidence;
- changes the default Quest away from five actions;
- introduces nondeterministic question generation into the audited runtime path.

**P0 quarantine required: NO.** No family was quarantined because no current P0 defect was identified.

### P1 status

**New learning-content P1 found: 0.**

The previously recorded P1 hardening remains in force through the runtime guard stack:
- `hfw-use-*` — grammatical, meaning-led sentence choices;
- `hfw-cloze-*` — meaning-led cloze choices;
- `context-*` — spelling-in-context, not word-meaning evidence;
- `spell-vowel-*`, `spell-first-*`, `spell-last-*` — partial-word retrieval and `masteryEligible:false`;
- `rhyme-*` — direct phonics practice;
- `vowel-listen-*` — hardened same-middle-vowel diagnostic and `masteryEligible:false`;
- `hfw-recognize-*` — meaning/function diagnostic and `masteryEligible:false`;
- `story-main-*`, `story-infer-*`, `story-evidence-*` — passage-specific distractors;
- `religion-*` — source-bounded Unit 1 distractors;
- diagnostic grammar roles remain corrected for direct recognition items.

### UI / screenshot-refactor integrity

`questScreenshotMatchRuntime.js` decorates headings, breadcrumb, phase accessibility, answer labels, hint copy, mastery labels, encouragement, and reward-safe copy. It does **not** replace question prompts, answer text, keyed answers, explanations, or learning state.

`mobileAccessibilityRuntime.js` adds ARIA labels/roles and button types without changing answer content or selection semantics.

The final mobile accessibility CSS keeps Quest passage/question text at **15 px minimum** on phones, answer controls at **16 px** with at least **56 px** height, and read-aloud controls at least **44×48 px**. No screenshot-match rule was found that intentionally hides a critical Quest answer or prompt on phone widths.

### Assisted retry / mastery evidence

`App.jsx` computes `independent = ok && !wasRetry` and only increments `masteryCorrect` when the answer is both independent and `masteryEligible`. `questRewardPolicy.js` gives a correct retry 0 Coins, 0 Stars, 0 transfer evidence, and `masteryAwarded:false`; repeated wrong retries receive no additional reward. The screenshot rebuild did not modify either file.

### Default Quest / determinism

The application still starts a Quest with `gameModel.pickQuest(save.stats,5)`. The diagnostic guard's final selector returns `picked.slice(0,count)` from the deterministic daily pool. No screenshot-match module replaces that call or changes `count`.

## Family audit summary

- **Phonics/rhyme:** PASS by current ledger + guard review. `rhyme-*`, `sound-*`, and hardened `vowel-listen-*` retain one keyed answer and audited roles.
- **Vowels/spelling:** PASS by current ledger + guard review. The 36 missing-letter spelling items remain non-mastery practice; `context-*` remains controlled spelling-in-context.
- **Vocabulary-in-context:** PASS by current bank/guard review. Eight `vocab-transfer-*` items remain vocabulary transfer with one keyed example each; screenshot work does not mutate them.
- **Reading inference/evidence:** PASS by current hardened runtime review. Four inference and four evidence items retain passage-specific alternatives and their audited transfer/review roles.
- **Religion Unit 1:** PASS by current hardened runtime review. Five base Unit 1 items and five secondary application/review items retain source-bounded answers and the audited role sequence: transfer, review, transfer, review, practice.

## New release-gate regression

Added `src/screenshotLearningIntegrity.test.js` to consolidate the screenshot-rebuild learning gate. It asserts:
- hardened bank size remains 200 with 200 unique IDs;
- every production question has exactly three unique choices, exactly one keyed answer, and a non-empty source;
- audited phonics/rhyme/vowel/spelling constructs remain intact;
- vocabulary transfer, reading inference/evidence, and Religion Unit 1 families retain expected roles and keys;
- default Quest returns exactly five distinct deterministic actions for a fixed date;
- clue-assisted success/repeated misses cannot receive Stars, mastery, Coins, or transfer evidence beyond the established practice-XP rule.

## Tests / verification

- **PASS — branch diff review:** screenshot-match branch is additive around the learning core; no learning-engine/source-bank file changed in the preproduction diff before this pass.
- **PASS — import-order review:** `src/main.jsx` loads `questionQualityRuntime` → `semanticQuestionGuardRuntime` → `diagnosticQuestionGuardRuntime` before importing/rendering `App`, so the hardened runtime bank is active before Quest use.
- **PASS — static semantic review:** current guarded families match the QA ledger's repaired constructs and roles.
- **PASS — reward/evidence code review:** assisted retries cannot count as independent mastery or transfer evidence.
- **PASS — readability code review:** phone Quest prompt/answer minimums remain readable and touch-safe in the final accessibility layer.
- **ADDED — `src/screenshotLearningIntegrity.test.js`** as a consolidated regression gate.
- **NOT TESTED — full Vitest execution:** this automation environment has GitHub file/write access but no materialized repository dependency tree/runtime for executing the suite.
- **NOT TESTED — `npm run build`:** full consolidated branch build remains Workstream 14 / Command Center responsibility.
- **NOT TESTED — rendered browser proof:** Replit was intentionally not updated/published.

## Blockers

No learning-correctness release blocker was identified by static audit.

Remaining release-gate dependencies:
1. execute the complete Vitest suite including `screenshotLearningIntegrity.test.js` on the consolidated branch;
2. run the production build;
3. render Quest at 1408×1056, tablet, 390 px, and 320 px to confirm no actual browser/font/layout collision obscures prompt or answer text;
4. if any future workstream edits `gameModel`, any question guard, source mapping, Quest selector, or reward/evidence semantics, re-run this audit and quarantine any P0 family immediately rather than preserving pool size.

## Handoff

Workstream 14 / Command Center should treat learning integrity as **STATIC PASS / EXECUTION PENDING**, not final PASS, until the new consolidated regression and full suite execute successfully.

Any integration conflict should preserve this order and contract:
1. question-quality hardening;
2. semantic-family hardening;
3. diagnostic hardening + final five-action selector;
4. React Quest rendering;
5. visual/accessibility decoration only.

Do not resolve a visual conflict by editing keys, choices, source mapping, mastery eligibility, retry scoring, or Quest count. If a P0 appears, quarantine the affected family and ship with a smaller valid pool rather than retaining bad content.

**Do not update/publish Replit and do not merge to `main` from this workstream.**
