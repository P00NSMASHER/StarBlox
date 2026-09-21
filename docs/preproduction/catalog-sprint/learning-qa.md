# Catalog Sprint — Learning Integrity QA

STATUS: **PASS — TARGETED EXECUTION AFTER QUEST PERSISTENCE REFACTOR**

Branch: `screenshot-match-preproduction`  
Audited input head: `344635508e00fd1ae8f2bb5028d4c200d0789c5e`  
Latest applicable runtime/build evidence head: `81bbf06dc070b0f72f942dde9c14ac4bba476922`  
Phase: `CATALOG_SPRINT`  
P0 found: **0**  
P0 quarantined: **0**  
New learning P1 found: **0**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## Why this run required fresh execution evidence

The previous Workstream-12 audit was bound to older runtime bytes. Since then `App.jsx`, persistence/storage code and mobile accessibility changed. Those changes did **not** alter `gameModel`, question generators/guards, `questRewardPolicy`, the Quest screenshot decorator or the canonical catalog mapping, but the new Quest-completion persistence path could have affected reward/evidence correctness. I therefore did not merely reuse the older 85-test gate.

GitHub Actions run `35652513911`, job `106508054992`, executed on runtime head `81bbf06dc070b0f72f942dde9c14ac4bba476922` and passed:

- **22/22 test files**;
- **98/98 tests**;
- production build **PASS**;
- 1,613 modules transformed;
- CSS 167.39 kB / 35.69 kB gzip;
- JS 304.14 kB / 93.34 kB gzip.

A branch comparison from that tested runtime head through the audited input head contains catalog art, QA, review and coordination changes only: **no `src/`, `catalog-art-manifest.json` or `src/catalogArtRuntime.js` change**. The test/build evidence therefore remains byte-applicable to the learning runtime at this audit point.

## Exact learning protections executed

The 98-test run directly passed the consolidated screenshot-learning gate for:

- the hardened production bank;
- phonics/rhyme/vowels/spelling audited constructs;
- vocabulary, reading inference/evidence and Religion Unit 1 source-bounded behavior;
- exactly **five distinct deterministic default Quest actions**;
- exclusion of clue-assisted retries from independent mastery and transfer evidence.

It also passed the lower-level semantic families: HFW use/cloze/recognition, spelling-in-context, all 36 letter-building items, rhyme/sound/vowel diagnostics, passage-specific main-idea/inference/evidence, six audited grammar IDs, and the exact fresh-save adaptive selection:

`vocab-transfer-invited`, `spell-first-tub`, `story-character-park-care`, `religion-transfer-0`, `story-infer-crayons`.

Those semantic findings are reused because their generators, source mapping and selector are unchanged. Per the persistent ledger policy, unchanged settled items are not duplicated as new defect rows.

## Source-bounded Religion check

The approved Unit 1 content already used for item-level audit remains unchanged:

- `Creation is a gift from God.`
- `We show gratitude by caring for creation.`

`religion-transfer-2` remains bound to that exact teaching rather than being justified by the broad `SOURCE` string. Its prior real-browser semantic disposition remains valid because `gameModel`, its source mapping and its Quest presentation logic have not changed. The keyed action—putting litter in a trash can after a picnic—is the sole defensible answer against the two neglect/destruction distractors.

## New cross-layer finding — persistence change is learning-safe

The new App flow still computes answer correctness by exact `choice === currentQ.answer`. It does not rewrite the prompt, choices, key or source.

On a first miss, `independent` is false and the wrong count increments once. On a later correct retry, `wasRetry` forces `independent=false`; `independentCorrect` and `masteryCorrect` do not increment, and the executed reward policy returns **0 Coins, 0 Stars, 0 transfer evidence, and no mastery award** for the assisted success.

The final-question completion bonus is now committed through a durable per-Quest receipt. Executed tests prove that:

- only the active receipt can complete;
- stale/unknown receipts receive no award;
- completion survives persistence/reload;
- replaying the same receipt cannot award the +30 Coins/+30 XP/Quest/Bond/daily completion twice.

This is an improvement in reward idempotency without changing the distinction between independent learning evidence and assisted practice.

## False-success and accessibility checks

The same CI run passed the motion regression that recognizes positive answer feedback **without celebrating negative feedback**. It also passed the mobile accessibility regression that preserves Quest read-aloud, answer, feedback and XP semantics after the Store keyboard-focus changes.

The prior Playwright evidence for `religion-transfer-2` at 1408/1024/390/320 remains applicable to the unchanged Quest surface, including neutral pre-answer styling and 16 px phone answer text. That older browser artifact is retained as rendered evidence; it was not relabeled as a new browser interaction test.

## PASS / FAIL / BLOCKED / NOT TESTED

| Area | Status |
| --- | --- |
| Phonics/rhyme/vowels/spelling semantics | **PASS — executed at `81bbf06...`** |
| HFW/vocabulary context | **PASS — executed** |
| Reading inference/evidence | **PASS — executed** |
| Religion Unit 1 | **PASS — executed + unchanged source-bounded browser evidence** |
| Exactly five deterministic Quest actions | **PASS — executed** |
| Assisted retry excluded from independent mastery/transfer | **PASS — executed** |
| Repeated wrong/retry reward farming | **PASS — executed** |
| Final Quest completion replay/idempotency | **PASS — executed** |
| False positive celebration of wrong feedback | **PASS — executed** |
| Quest read-aloud/answer/feedback accessibility semantics | **PASS — executed** |
| Fresh browser click-through of correct → auto-advance / wrong → clue → retry after persistence refactor | **NOT TESTED** |
| Physical-device Quest behavior | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA | **NOT TESTED** |
| Catalog art quality | **NOT TESTED BY WS12** |

No verified P0 family exists, so **no quarantine is required**. If a future source, generator, key, selector, reward/evidence, App answer-flow or Quest presentation change creates a P0, quarantine that family even if the bank becomes smaller than the historical 200-question baseline.

## Handoff

**08 Catalog integration:** catalog/review-only work is not a learning blocker. After an actual canonical manifest/runtime integration, rerun affected CI/build and keep the integration strictly stable item-ID → image path.

**13 Persistence/economy:** the durable Quest receipt path is now execution-backed as learning-safe. Preserve assisted-vs-independent evidence separation; the remaining real-browser timing/concurrency gap remains yours.

**14 Visual QA:** preserve neutral initial answer styling and the existing phone answer readability while fixing geometry. The motion test now explicitly protects against negative-feedback celebration.

**15 Command Center:** learning is PASS through input head `344635508e00fd1ae8f2bb5028d4c200d0789c5e`, with runtime execution evidence on `81bbf06dc070b0f72f942dde9c14ac4bba476922` and no subsequent runtime/canonical mapping change. Re-run Workstream 12 on any change to `gameModel`, question guards, Quest selector/scoring, reward policy, App answer flow, Quest decorator, Quest-specific accessibility or motion feedback.

No curriculum, player data, Replit/Floot, `main`, deployment or paid settings were touched.
