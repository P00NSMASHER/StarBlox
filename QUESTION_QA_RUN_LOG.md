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

## 2026-09-21 15:45 America/New_York — Real-browser Religion Unit 1 learning audit

### Scope

This run was change-aware. Full CI was **not** repeated because compare evidence from runtime-proven head `f654431b2bb76d2eceb322dd35c613dfad17e7ae` through audited branch head `9a041e14f09e89b0000ae60eaf3172dd4e529dc3` showed no `src/`, canonical catalog runtime/manifest, or production catalog-asset change. Existing run `35641273312` therefore remains the applicable executed 20/20-file, 85/85-test + production-build proof.

Instead, Workstream 12 closed a previously untested browser-legibility/cue case by downloading and inspecting Playwright artifact `10654114272` from run `35631059432`.

### Exact ID audited

- `religion-transfer-2` — Religion Unit 1 / `religion-application` / transfer.

Specific approved Unit 1 source content used for semantic comparison:

- `Creation is a gift from God.`
- `We show gratitude by caring for creation.`

Rendered item:

- Prompt: `Creation is a gift from God. Which action best shows care for creation?`
- Key: `Put litter in a trash can after a picnic.`
- Distractors: `Leave paper on the grass for someone else to pick up.` / `Pull plants out of a garden just to throw them away.`

### Findings

| Area | Result | Finding | Disposition |
| --- | --- | --- | --- |
| Semantic correctness | PASS | The key directly demonstrates caring for creation. Both distractors depict neglect/destruction and are not defensible alternate answers under the approved Unit 1 source. | No quarantine or content change. |
| Initial answer cue | PASS | In the actual browser screenshot, deterministic choice shuffle places the key at **B**. A/B/C share the same initial visual treatment; no `correctChoice`/`wrongChoice` cue is visible before a response. | Preserve this neutral initial state. |
| Desktop readability | PASS | At 1408×1056 the prompt, all three answers, Read aloud, Hint, mastery/evidence copy and reward-safe copy are visible; no pageerror/console.error/horizontal overflow reported. | No learning UI fix required. |
| 390px answer readability | PASS | All 3 answers measured 344 px wide × 64.94 px high at 16 px font; no overflow/runtime error. | Browser render closes prior static-only evidence gap. |
| 320px answer readability | PASS | All 3 answers measured 278 px wide, 64.94–85.41 px high at 16 px font; prompt remains readable in captured viewport; no overflow/runtime error. | Browser render closes prior static-only evidence gap. |
| Assisted mastery copy | PASS | Browser UI states that only eligible first-try answers build mastery and clue-assisted success never counts as mastery/transfer evidence; hint/reward copy says nothing is taken away and there is no speed bonus/loss for mistakes. | Consistent with executed reward-policy tests. |
| 1024px runtime sanity | PASS | Quest mounted with no runtime error and no horizontal overflow. | No action. |

### Browser evidence

Workflow run `35631059432`, artifact `10654114272`, artifact runtime head `276181274e2f11ed49b46e09852712d43899b538`.

- `report.json`: `sha256:72333c166e28662aaea43ca464f42dec031ac63d479565e11cd7d749933122c7`
- `quest-desktop-1408x1056.png`: `sha256:15bccde0c04e28cd4dc7fc488f0b921e3690325fc383109bde75cf6c4de71b20`
- `quest-landscape-1024x768.png`: `sha256:2dc81518ece6ff732126a9dd5b55286aa0c591ef13fc6f8b3ab6e31ac46f30b3`
- `quest-phone-390x844.png`: `sha256:c73b798f750548ea66565ba7532fc3b229fbd3541d03f091cd81acee6b33d299`
- `quest-phone-320x568.png`: `sha256:77e443e0dabb06ffa1b2580aca5fe1059aafff66ceb562f16e766a6d81af628d`

The browser evidence remains applicable to the current Quest surface: `questScreenshotMatchRuntime.js` is unchanged; later mobile accessibility runtime changes are Store-image-only, and later accessibility CSS additions are Store-card-only. Quest-specific accessibility rules did not change.

### New workflow review

`.github/workflows/catalog-staged-art-qa.yml` was inspected. It is QA-only, serves catalog lighting SVGs on localhost, renders them with Playwright and uploads artifacts; it has no game-runtime or question-bank import path. The CI workflow's new docs-only push filter changes triggering only; test/build commands remain unchanged.

### Severity summary

- P0 found: **0**
- P0 fixed: **0**
- P0 quarantined: **0**
- new learning P1 found: **0**

No `QUESTION_QA_LEDGER.md` row was added because the audited item, generator, source mapping and selector are unchanged. Per ledger policy, the new browser evidence is recorded here rather than duplicating a settled semantic-family entry.

### Remaining not tested

- Physical iPhone/iPad/Android Quest behavior.
- VoiceOver/TalkBack/NVDA.
- A fresh live click-through of correct → wrong → clue → retry transitions in Playwright during this run. Existing automated reward/evidence tests remain applicable because the relevant runtime hashes are unchanged.
