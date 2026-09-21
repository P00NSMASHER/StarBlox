# StarBlox Question QA Run Log

This file is the append-only per-run companion to `QUESTION_QA_LEDGER.md`. The main ledger remains the canonical family/defect history. This run log records repeated release-gate audits without duplicating settled family entries in the main ledger.

Severity: **P0** = wrong key, multiple defensible answers, source contradiction, nonsense/unanswerable, malformed generation. **P1** = too easy/giveaway/ambiguous/construct mismatch/inappropriate evidence role. **PASS** = one defensible key, appropriate Grade-2 wording/distractors/construct, and correct evidence role.

## 2026-09-18 19:04 America/New_York — Quest visual + QA run

### Exact IDs audited

- Grammar: `grammar-0`, `grammar-1`, `grammar-2`, `grammar-3`, `grammar-4`, `grammar-5`.
- Fixed audit-day adaptive Quest: `vocab-transfer-invited`, `spell-first-tub`, `story-character-park-care`, `religion-transfer-0`, `story-infer-crayons`.

### Findings

| IDs | Result | Finding | Disposition |
| --- | --- | --- | --- |
| `grammar-0`, `grammar-1` | PASS | Each plural item has one orthographically correct key, two plausible-but-wrong Grade-2 spellings, and an appropriate practice role. | Cleared unchanged; exact regression added. |
| `grammar-2`, `grammar-3`, `grammar-5` | PASS | Command, exclamation, and complete-sentence items each have one defensible key. The diagnostic guard correctly keeps these direct-recognition items at review rather than overstating transfer evidence. | Cleared unchanged; exact role/key regression added. |
| `grammar-4` | PASS re-audit | The previously repaired show-don’t-tell item still has one text-supported nervousness cue. Neutral/happy distractors are not alternate correct answers; transfer role remains defensible. | Cleared unchanged; exact regression added. |
| `vocab-transfer-invited`, `spell-first-tub`, `story-character-park-care`, `religion-transfer-0`, `story-infer-crayons` | PASS re-audit | Fixed 2026-09-18 fresh-save selector still returns five distinct actions from the hardened bank, with one keyed answer per item and the intended transfer/practice/review semantics preserved by the runtime guards. | Exact five-ID regression retained and duplicated in the grammar audit gate so selector drift fails CI. |

### Severity summary

- P0 found this run: **0**.
- P0 fixed this run: **0**.
- P0 quarantined this run: **0**.
- P1 found this run: **0 new**.
- P1 fixed this run: **0**; the prior grammar evidence-role correction remains intact.
- P1 quarantined this run: **0**.

### Evidence rules re-checked

The Quest contract remains non-punitive: a first wrong answer may receive modest learning credit, repeated wrong retries do not farm rewards, and clue-assisted correct retries remain practice-XP-only with no Coins, Stars, mastery award, or transfer evidence. No streak-loss pressure is introduced by this run.

## 2026-09-21 11:49 America/New_York — Screenshot-match learning-integrity guard

### Scope

Audited the latest `screenshot-match-preproduction` branch against the persistent QA ledger, runtime guard stack, Quest reward/evidence flow, screenshot-match Quest decorator, mobile accessibility layer, and the main-to-preproduction diff.

### Findings

| Area | Result | Finding | Disposition |
| --- | --- | --- | --- |
| Screenshot rebuild vs learning core | PASS | The preproduction diff is additive around the learning engine. `gameModel.js`, `App.jsx`, `questRewardPolicy.js`, and the three question guard modules were not changed by screenshot-match work before this audit. | No learning-core rollback or quarantine needed. |
| Answer/key structural integrity | PASS | Current hardened runtime preserves three unique choices with one keyed answer and a non-empty source for production questions. | Added consolidated regression gate. |
| Phonics/rhyme/vowels/spelling | PASS | Existing audited roles and mastery exclusions remain intact, including non-mastery diagnostic/missing-letter families. | Added cross-family regression coverage. |
| Vocabulary + reading inference/evidence | PASS | Transfer/review semantics remain intact; screenshot decorators do not rewrite prompt/choice/key content. | Added family count/role/key coverage. |
| Religion Unit 1 | PASS | Five base items plus five secondary items remain source-bounded with the audited role sequence transfer/review/transfer/review/practice. | Added regression coverage. |
| Assisted retry evidence | PASS | Correct retries remain practice-XP-only with 0 Coins, 0 Stars, 0 transfer evidence and no mastery award; repeated misses earn nothing extra. | Added explicit consolidated assertions. |
| Quest size/determinism | PASS by code review | App still requests `pickQuest(...,5)` and final hardened selector remains date-deterministic and capped to five distinct actions. | Added fixed-date regression assertion. |
| Mobile Quest readability | PASS by static CSS review | Phone passage/question text remains at least 15 px; answers are 16 px and at least 56 px tall; read-aloud remains touch-safe. | Render proof still required in release QA. |

### Severity summary

- P0 found this run: **0**.
- P0 fixed this run: **0**.
- P0 quarantined this run: **0**.
- P1 found this run: **0 new learning-content defects**.
- P1 fixed this run: **0**.
- P1 quarantined this run: **0**.

### Regression added

Added `src/screenshotLearningIntegrity.test.js` to fail the release gate if the hardened bank, audited families, five-action deterministic Quest contract, or assisted-retry evidence rules drift during the screenshot rebuild.

### Execution status

Static review and branch-diff checks passed. Full Vitest/build/browser execution was **not run** in this automation environment because only GitHub file/write access is available here; Workstream 14 / Command Center must execute the consolidated suite before final sign-off.
