# Catalog Sprint — Learning Integrity QA

STATUS: **PASS — NO CATALOG-INDUCED LEARNING REGRESSION FOUND**

Branch: `screenshot-match-preproduction`  
Audited branch head: `9a041e14f09e89b0000ae60eaf3172dd4e529dc3`  
Runtime/build evidence head: `f654431b2bb76d2eceb322dd35c613dfad17e7ae`  
Phase: `CATALOG_SPRINT`  
P0 found: **0**  
New learning P1 found: **0**  
P0 quarantine required: **NO**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## Change-aware result

The last full learning/build gate remains applicable. Comparing `f654431b...` through the audited branch head shows **no change to `src/`, `catalog-art-manifest.json`, `src/catalogArtRuntime.js`, or production catalog asset bytes**. Changes are catalog coordination/review evidence, the staged-art QA workflow, and CI push filtering. Therefore this run did **not** rerun the same full suite merely because the schedule fired.

Still-current execution evidence from GitHub Actions run `35641273312`, job `106470895718`, on `f654431b...`:

- **20/20 test files PASS**;
- **85/85 tests PASS**;
- production build **PASS**;
- hardened semantic families, deterministic five-action Quest and retry/mastery/reward regressions green.

The learning core remains byte-stable:

- `src/gameModel.js` — `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`;
- `src/questionQualityRuntime.js` — `3f47e96074c4d2e1e3f1e835aed27c654d8f072a`;
- `src/semanticQuestionGuardRuntime.js` — `f21bd7d9c55610bfe00c04c2e2f81efaa2e3f591`;
- `src/diagnosticQuestionGuardRuntime.js` — `81eba5b34384dbc7699dde70ce048e401458570f`;
- `src/questRewardPolicy.js` — `4ae853a7f4bb04a811ef04b4b9a306066e33829b`.

No canonical catalog mapping changed in this interval. Workstream 08 currently records **0 accepted current hashes and 0 canonical promotions**, so there is no new catalog integration path capable of mutating learning state.

## New evidence this run — actual browser Quest audit

Instead of repeating unchanged static checks, Workstream 12 downloaded and inspected the existing real Playwright Quest artifact from run `35631059432`, artifact `10654114272` (`preproduction-visual-qa`). Artifact runtime head: `276181274e2f11ed49b46e09852712d43899b538`; report generated `2026-09-21T17:18:22.489Z`.

Exact evidence hashes:

- `report.json` — `sha256:72333c166e28662aaea43ca464f42dec031ac63d479565e11cd7d749933122c7`;
- `quest-desktop-1408x1056.png` — `sha256:15bccde0c04e28cd4dc7fc488f0b921e3690325fc383109bde75cf6c4de71b20`;
- `quest-landscape-1024x768.png` — `sha256:2dc81518ece6ff732126a9dd5b55286aa0c591ef13fc6f8b3ab6e31ac46f30b3`;
- `quest-phone-390x844.png` — `sha256:c73b798f750548ea66565ba7532fc3b229fbd3541d03f091cd81acee6b33d299`;
- `quest-phone-320x568.png` — `sha256:77e443e0dabb06ffa1b2580aca5fe1059aafff66ceb562f16e766a6d81af628d`.

### Exact audited learning item

The rendered item is `religion-transfer-2`.

Approved Unit 1 source content encoded in the audited curriculum is the specific row:

> `Creation is a gift from God.` → `We show gratitude by caring for creation.`

That exact source content—not the broad `SOURCE` label—was used for semantic comparison.

Current item:

- prompt: `Creation is a gift from God. Which action best shows care for creation?`
- key: `Put litter in a trash can after a picnic.`
- distractor: `Leave paper on the grass for someone else to pick up.`
- distractor: `Pull plants out of a garden just to throw them away.`
- role: `transfer`
- skill: `religion-application`

**Semantic disposition: PASS.** The keyed action directly instantiates caring for creation. Each distractor instead depicts neglect/destruction, so neither is a defensible alternate answer under the approved Unit 1 statement.

### Actual browser findings

- Desktop 1408×1056: prompt, all three choices, Read aloud, Hint and mastery/evidence copy are visible; no `pageerror`, no `console.error`, no horizontal overflow.
- Phone 390×844: all three answers are present and measured at 344 px wide × 64.94 px high with **16 px** text; no overflow/runtime error.
- Phone 320×568: all three answers are present and measured at 278 px wide, 64.94–85.41 px high with **16 px** text; prompt remains readable in the captured viewport; no overflow/runtime error.
- 1024×768 landscape: Quest mounts with no runtime error or horizontal overflow.
- Initial answer state: the deterministic shuffle places the correct response at **B**, and actual pixels show no special correct/wrong highlight before selection. The keyed answer is therefore not visually cued by position or styling.
- Supportive evidence language is consistent with policy: `Only eligible first-try answers build mastery. Clue-assisted success never counts as mastery or transfer evidence.` Hint/reward copy says nothing is taken away and there is no speed bonus/loss for mistakes.

This is **new Workstream-12 browser evidence**; prior learning QA only had static readability review.

### Continuity from browser artifact to current branch

The browser evidence remains relevant to the current Quest learning surface:

- `questScreenshotMatchRuntime.js` is unchanged between the artifact head and current branch (`07725d00052a01152da09b98ef4e6ee20043442c` current hash).
- The later `mobileAccessibilityRuntime.js` change adds intrinsic width/height/async decode only to **Store images**; its Quest decorator is unchanged.
- The later `mobileAccessibility.css` change adds desktop **Store card** text floors; Quest prompt/answer/read-aloud rules are unchanged.
- No learning bank/guard/reward file changed after the execution-backed learning gate.

## New script/workflow review

`.github/workflows/catalog-staged-art-qa.yml` is QA-only: it checks out the repo, installs pinned Playwright, serves repository-root catalog SVGs on localhost, renders **lighting candidates**, and uploads screenshots/report. It is not imported by the child app and has **no learning-state mutation path**.

`.github/workflows/ci.yml` now ignores documentation-only push changes. The test/build commands themselves are unchanged. No learning correctness change found.

## PASS / FAIL / BLOCKED / NOT TESTED

| Area | Status | Evidence |
| --- | --- | --- |
| Learning core stable through audited branch head | **PASS** | No `src/`/canonical catalog runtime change since `f654431b...`; byte-stable learning hashes. |
| Phonics/rhyme/vowels/spelling | **PASS** | Existing 85-test execution applies; generators/hashes unchanged. |
| HFW/vocabulary context | **PASS** | Existing semantic regressions apply; generators/hashes unchanged. |
| Reading inference/evidence | **PASS** | Existing regressions apply; source/runtime unchanged. |
| Religion Unit 1 | **PASS + new browser evidence** | `religion-transfer-2` source/key/distractors audited semantically and rendered at 1408/1024/390/320. |
| Five-action deterministic Quest | **PASS** | Existing executed selector regression; selector hash unchanged. |
| Assisted retry vs independent mastery | **PASS** | Existing executed reward regression plus browser mastery copy consistent with policy. |
| Wrong/retry reward farming | **PASS** | Existing executed reward regression; scoring code unchanged. |
| Initial answer cue safety | **PASS for audited browser item** | Correct answer appears at B after deterministic shuffle; no preselection correct/wrong styling observed. |
| Quest phone readability for audited item | **PASS headless browser** | 3 answers visible, 16 px font, touch-safe sizes at 390 and 320. |
| Physical-device behavior | **NOT TESTED** | Browser artifact is Playwright Chromium, not physical iPhone/iPad/Android. |
| Screen reader | **NOT TESTED** | VoiceOver/TalkBack/NVDA not executed by Workstream 12. |
| Live correct/wrong/clue/retry click-through in browser | **NOT TESTED this run** | Automated reward/evidence tests remain applicable because relevant runtime hashes are unchanged. |
| Catalog art visual quality | **NOT TESTED BY WS12** | Owned by art reviewers / Workstream 14. |

## Severity

- P0 found: **0**
- P0 quarantined: **0**
- new learning P1 defects: **0**
- curriculum/source changes made: **0**

No Question QA Ledger row was added because the audited item, generator, source mapping and Quest selector did not change; per the ledger policy, unchanged settled semantics are recorded in `QUESTION_QA_RUN_LOG.md` rather than duplicated in the main defect ledger.

## Handoff

**08:** no new learning rerun is needed for documentation/review-only catalog work. After the first actual canonical catalog runtime/asset integration, rerun affected CI/build and keep integration strictly stable item-ID → image mapping.

**14:** preserve the no-answer-cue initial state and current 16 px phone answer floor when fixing Quest geometry. The exact browser artifact/hashes above are learning-legibility evidence, not screenshot-parity evidence.

**15:** no catalog-induced learning blocker exists through `9a041e14f09e89b0000ae60eaf3172dd4e529dc3`. Re-run Workstream 12 if `gameModel`, any question guard, Quest selector/scoring, reward policy, Quest decorator, or Quest-specific accessibility rules change.

Replit/Floot/`main`, player data and curriculum remain untouched.
