# Workstream 12 — Learning Integrity Guard

STATUS: **LEARNING PASS / POST-CATALOG-INTEGRATION REGRESSION PASS / FULL CI BLOCKED BY CATALOG QA**

Branch: `screenshot-match-preproduction`  
Audited learning head: `8a2c53aa2133baef23e263d8dda8b2a180dffe19`  
Phase: `CATALOG_SPRINT`  
Replit/Floot/main: **untouched**

## Current learning gate

- P0 learning defects: **0**.
- P0 families quarantined: **0**.
- New learning-content P1 defects: **0**.
- Curriculum changes: **0**.
- Real player-data changes: **0**.

The first V2 accepted companion batch was canonically integrated before this pass, so the older 98/98 evidence could not simply be carried forward as proof of the integrated head. Workstream 12 ran current-head regressions after the manifest/runtime change.

GitHub Actions run `35659760320`, job `106531955313`, on `8a2c53aa2133baef23e263d8dda8b2a180dffe19` produced **96/99 tests PASS, 21/22 files PASS**. Every learning-specific test passed. Three catalog-manifest QA tests failed, so production build was skipped. The current integrated candidate is therefore **not full-CI green**, even though the learning gate itself is green.

## New exact semantic evidence

A new exact regression now locks `vocab-transfer-invited` inside the established fixed audit-day five-action Quest (`2026-09-18T18:00:00Z`).

- source meaning: `invited = asked to come to an event or join an activity`
- prompt: `Which new example best fits “invited”?`
- key: `Jada gets a message asking her to join the game.`
- distractors: `A child begs earnestly for one more chance.` / `A family celebrates with traditional music and foods.`

**PASS — one defensible answer.** The key alone depicts being asked to join; the distractors represent `plead` and `culture`.

The first assertion used the wrong calendar day and failed because that day's deterministic five-action Quest did not contain `vocab-transfer-invited`. The test was corrected to the persistent ledger's exact September 18 audit date. This was a test-authoring error, not a content/runtime defect.

## Learning protections executed on the integrated head

Current-head tests passed:

- 200-question hardened bank validity;
- phonics/rhyme/short-vowel/spelling audited constructs;
- HFW recognition/use/cloze and vocabulary transfer/context;
- passage-specific inference/evidence;
- Religion Unit 1 base/application roles and source-bound semantics;
- exactly five distinct deterministic default Quest actions;
- one keyed answer per three-choice set;
- first-wrong and retry evidence rules;
- no assisted Coins/Stars/mastery/transfer evidence;
- no repeated-wrong reward farming;
- durable final-Quest completion reload/replay protection;
- negative feedback is not celebrated;
- Quest read-aloud, answers, feedback and XP accessibility semantics.

The earlier exact-source Religion browser audit remains applicable because Religion source/generator and Quest presentation did not change: `Creation is a gift from God.` → `We show gratitude by caring for creation.` The broad source label is not being treated as semantic proof.

## External catalog release failures

Three failing tests are outside Workstream 12 but are release-relevant:

1. `beds-1` manifest theme is `Aqua Wave`; stable `gameModel` metadata expects `Garden Glow`.
2. `companions-3` uses an accepted WebP candidate path under `/assets/catalog-candidates/...`, while the old QA assertion only permits `/assets/catalog/*.svg`.
3. `companions-3` is now independently accepted/final-portable, while the old family-wide assertion still requires companions 2–12 to remain interim.

Workstream 08/14 should fix the metadata and modernize the path/status invariants around exact-hash review evidence. Do **not** weaken stable item metadata, uniqueness, file existence, or independent-review requirements merely to make the suite green.

## PASS / FAIL / NOT TESTED

| Area | Status |
| --- | --- |
| Phonics/rhyme/vowels/spelling | **PASS — current-head execution** |
| HFW/vocabulary | **PASS — current-head execution + exact invited transfer case** |
| Reading inference/evidence | **PASS — current-head execution** |
| Religion Unit 1 fidelity | **PASS — current-head execution + prior exact-source browser audit** |
| Exactly five deterministic default Quest actions | **PASS — current-head execution** |
| Assisted retry vs independent mastery/transfer | **PASS — current-head execution** |
| Repeated wrong reward farming | **PASS — current-head execution** |
| Final Quest completion replay | **PASS — current-head execution** |
| False success motion | **PASS — current-head execution** |
| Quest read-aloud/answer/feedback semantics | **PASS — current-head execution** |
| Full repository test/build gate | **FAIL — 3 catalog QA failures; build skipped** |
| Fresh browser correct → auto-advance / wrong → clue → retry on current integrated head | **NOT TESTED** |
| Physical-device Quest behavior | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA | **NOT TESTED** |

## Ledger / quarantine

No P0 family needs quarantine. `QUESTION_QA_LEDGER.md` remains unchanged because no production question/template/source mapping/selector changed and no new defect was found. The new exact semantic execution belongs in the append-only run log.

## Handoff

**08:** learning is green after the first canonical companion batch, but full CI is red. Correct `beds-1` metadata and reconcile accepted WebP path/status rules with exact-hash review evidence, then rerun full CI/build.

**13:** current reward/evidence and completion-replay tests remain green; preserve assisted-vs-independent separation while closing browser timing/concurrency stress.

**14:** preserve neutral initial choices, readable answers/read-aloud semantics and negative-feedback non-celebration; coordinate the canonical WebP path/status invariant with 08.

**15:** report Workstream 12 as **PASS**, but do not report the current integrated candidate as full CI/build PASS until the catalog invariant failures are cleared.

When `catalogGate.status` becomes PASS and phase becomes `GAME_FINISHING`, resume fresh browser learning interaction tests: five actions, correct auto-advance, supportive wrong → clue → retry, TTS/read-aloud, evidence/mastery separation, no farming/replay and target-width legibility.

**Never update/publish Replit, use Floot, merge `main`, deploy, expand curriculum without approval, or use real player data from this workstream.**
