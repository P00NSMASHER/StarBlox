# Catalog Sprint — Learning Integrity QA

STATUS: **LEARNING PASS / CURRENT FULL CI FAILS EXTERNAL CATALOG INVARIANTS**

Branch: `screenshot-match-preproduction`  
Audited learning head: `8a2c53aa2133baef23e263d8dda8b2a180dffe19`  
Phase: `CATALOG_SPRINT`  
P0 learning defects: **0**  
P0 families quarantined: **0**  
New learning P1 defects: **0**  
Replit/Floot/main/player data: **untouched**

## Why this pass ran

The first independently accepted companion batch was canonically integrated, moving the catalog manifest to v13 and wiring `companions-3`, `companions-4`, `companions-10`, and `companions-11`. Although `gameModel`, question guards, Quest reward policy, App answer flow, motion learning feedback, and Quest accessibility semantics did not change, canonical catalog bytes did. Workstream 12 therefore ran current-head learning regressions instead of simply carrying forward the prior 98/98 result.

GitHub Actions run `35659760320`, job `106531955313`, on `8a2c53aa2133baef23e263d8dda8b2a180dffe19` produced **96/99 tests PASS, 21/22 test files PASS**. Every learning-specific regression passed. The suite as a whole failed three catalog-manifest release invariants, so the production build was correctly skipped. This head must **not** be described as a full CI/build PASS.

## New semantic evidence — `vocab-transfer-invited`

This pass added an exact semantic regression for the actual fixed audit-day five-action Quest (`2026-09-18T18:00:00Z`). The item is:

- prompt: `Which new example best fits “invited”?`
- approved current-week meaning: `invited = asked to come to an event or join an activity`
- key: `Jada gets a message asking her to join the game.`
- distractor: `A child begs earnestly for one more chance.` — this is `plead`, not `invited`
- distractor: `A family celebrates with traditional music and foods.` — this is `culture`, not `invited`

**Disposition: PASS — one defensible answer.** The test also proves this exact item appears in the established deterministic five-action audit selection.

The first version of the new test accidentally used the September 21 date instead of the ledger's September 18 audit date. That made the item absent from that day's five-action Quest and failed the assertion. This was a test-date error, not a product/content defect. The assertion was corrected to the persistent ledger's exact audit date and now passes.

## Current learning protections executed

The current-head run passed all of these learning checks:

- hardened 200-question bank structural/semantic validity;
- phonics, rhyme, short-vowel and spelling constructs;
- HFW recognition/use/cloze and vocabulary context/transfer;
- passage-specific inference and text evidence;
- approved Religion Unit 1 base/application roles;
- exactly five distinct deterministic default Quest actions;
- one keyed answer per three-choice set and varied deterministic answer position;
- first-wrong/retry reward policy and no repeated-wrong farming;
- assisted retries excluded from Coins, Stars, mastery and transfer evidence;
- durable final-Quest completion reload/replay protection;
- negative answer feedback is not celebrated;
- Quest read-aloud, answer, feedback live-region and XP accessibility semantics.

The prior exact-source Religion browser audit remains applicable because its source, generator and Quest presentation are unchanged: `Creation is a gift from God.` → `We show gratitude by caring for creation.` The broad source label alone is not treated as semantic proof.

## External catalog failures discovered by the current run

The full suite is red for three **catalog**, not learning, reasons:

1. **Stable metadata mismatch:** `beds-1` manifest theme is `Aqua Wave`, while stable `gameModel` metadata expects `Garden Glow`. Workstream 08 should correct the canonical metadata; do not weaken this invariant.
2. **Accepted WebP path vs legacy path rule:** `companions-3` now points to `/assets/catalog-candidates/.../companions-3-detail.webp`, while `catalogManifestQa.test.js` still only allows `/assets/catalog/*.svg`. Workstreams 08/14 should reconcile the canonical asset-path contract with accepted WebP support while retaining existence/uniqueness/exact-hash checks.
3. **Accepted companion vs blanket interim rule:** `companions-3` is now `final-portable` after exact-hash independent review, while the legacy test assumes companions 2–12 must all remain `interim-not-verified`. Update the invariant to use review/integration evidence rather than blanket family status.

These failures do not indicate changed answer keys, question text, source provenance, evidence scoring, or learning feedback. They do block calling the current integrated head release-green.

## PASS / FAIL / NOT TESTED

| Area | Status |
| --- | --- |
| Phonics/rhyme/vowels/spelling | **PASS — current-head execution** |
| HFW/vocabulary context | **PASS — current-head execution + exact `vocab-transfer-invited` semantic case** |
| Reading inference/evidence | **PASS — current-head execution** |
| Religion Unit 1 | **PASS — current-head execution + unchanged exact-source browser evidence** |
| Five deterministic default Quest actions | **PASS — current-head execution** |
| Assisted retry vs independent mastery/transfer | **PASS — current-head execution** |
| Repeated wrong reward farming | **PASS — current-head execution** |
| Final Quest completion replay/idempotency | **PASS — current-head execution** |
| Negative feedback falsely celebrated | **PASS — current-head execution** |
| Quest read-aloud/answer/feedback semantics | **PASS — current-head execution** |
| Overall full test/build gate | **FAIL — 3 external catalog invariant failures; build skipped** |
| Fresh browser correct → auto-advance / wrong → clue → retry on current integrated head | **NOT TESTED** |
| Physical-device Quest behavior | **NOT TESTED** |
| VoiceOver/TalkBack/NVDA | **NOT TESTED** |

No P0 family requires quarantine. If a future wrong key, multiple-defensible-answer, source contradiction, malformed generator, or evidence-policy P0 is verified, quarantine that family even if the usable bank falls below the historical 200-question baseline.

## Handoff

**08 Catalog integration:** Workstream-12 learning is green after the first canonical companion integration, but full CI is not. Fix `beds-1` metadata and reconcile accepted WebP path/status invariants without weakening stable metadata, unique-path/content, or independent exact-hash review requirements. Then rerun full CI/build.

**13 Persistence/economy:** current learning/reward/replay regressions remain green. Preserve assisted-vs-independent separation while closing the real-browser timing/concurrency gate.

**14 Visual QA:** preserve neutral initial answer styling, readable answers, read-aloud semantics and negative-feedback non-celebration. Coordinate the canonical WebP path/status contract with 08.

**15 Command Center:** report learning as **PASS**, but report the current integrated candidate as **full CI FAIL / build not run** until the three catalog manifest failures are cleared.

No curriculum expansion, Replit/Floot use, main merge, deployment, paid setting, or real player-data change occurred.
