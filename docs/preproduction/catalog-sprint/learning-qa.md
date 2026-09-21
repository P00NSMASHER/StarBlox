# Catalog Sprint — Learning Integrity QA

STATUS: **PASS — NO CATALOG-INDUCED LEARNING REGRESSION FOUND**

Branch: `screenshot-match-preproduction`  
Audited source head: `f654431b2bb76d2eceb322dd35c613dfad17e7ae`  
Phase: `CATALOG_SPRINT`  
P0 found: **0**  
New learning P1 found: **0**  
P0 quarantine required: **NO**  
Replit/Floot: **untouched**  
`main`: **not merged or modified**

## What changed since the prior learning gate

The branch accumulated catalog assets, candidate-import/QA tooling, accessibility/persistence hardening and visual integration work after the learning-integrity baseline commit `9bbf25831da6106762ceb0bfce6e29dc32c5f41f`. A commit comparison confirmed that the learning core itself did **not** change during those catalog changes:

- `src/gameModel.js` — unchanged blob `79fdb8c3bed4d715e0b1c770f34db0037a7f7c3b`;
- `src/questionQualityRuntime.js` — unchanged blob `3f47e96074c4d2e1e3f1e835aed27c654d8f072a`;
- `src/semanticQuestionGuardRuntime.js` — unchanged blob `f21bd7d9c55610bfe00c04c2e2f81efaa2e3f591`;
- `src/diagnosticQuestionGuardRuntime.js` — unchanged blob `81eba5b34384dbc7699dde70ce048e401458570f`;
- `src/questRewardPolicy.js` — unchanged blob `4ae853a7f4bb04a811ef04b4b9a306066e33829b`.

`catalogArtRuntime.js` remains limited to assigning exact stable Store item IDs to image paths. It does not mutate the question bank, keys, choices, source provenance, selector, mastery eligibility or reward state.

The Quest screenshot and mobile-accessibility runtimes were re-read because they changed during the rebuild. They decorate labels, breadcrumb/phase UI, ARIA semantics, hint/reward-safe copy and accessibility behavior; no prompt, answer text, key, source or score computation is rewritten.

## Exact execution evidence

GitHub Actions CI on exact audited source head `f654431b2bb76d2eceb322dd35c613dfad17e7ae`:

- workflow run `35641273312`;
- job `106470895718`;
- **20/20 test files PASS**;
- **85/85 tests PASS**;
- production build **PASS**;
- Vite transformed **1,612 modules**;
- CSS 167.22 kB / 35.66 kB gzip;
- JS 300.96 kB / 92.19 kB gzip.

The executed learning regressions cover:

- the 200-question hardened production bank;
- exactly one keyed answer and the persistent semantic QA families;
- phonics, rhyme, vowel and spelling constructs;
- HFW use/cloze/recognition;
- vocabulary transfer/context;
- reading main idea, inference, evidence and character reasoning;
- Religion Unit 1 source-bounded content;
- exactly five distinct deterministic Quest actions;
- independent versus clue-assisted mastery/transfer evidence;
- repeated-wrong reward farming prevention.

No family needed quarantine.

## New catalog safety regression

Added `src/catalogAssetSafety.test.js` in commit `f654431b2bb76d2eceb322dd35c613dfad17e7ae`.

The test scans every current `public/assets/catalog/*.svg` and fails CI on:

- executable/embed tags (`script`, `foreignObject`, `iframe`, `object`, `embed`);
- inline event-handler attributes;
- `javascript:` URIs;
- CSS `@import`;
- non-fragment `url(...)` references;
- non-fragment `href`, `xlink:href`, or `src` references.

Result on the audited head: **PASS**. This converts the catalog sprint's active-content/external-reference rule from a producer claim into an executable release regression.

## New script / import review

`docs/preproduction/catalog-sprint/import_chat_intake01.py` was inspected because it introduces network-backed candidate intake. It uses HTTPS Adobe endpoints only while staging candidate image bytes; those endpoints are **not runtime dependencies** of StarBlox. The import pins the outer archive SHA, verifies per-file hashes and sizes, validates safe paths, PNG CRC/dimensions and WebP container structure, rejects symlinks and refuses differing-file overwrites. It writes candidate art/evidence only and does not modify the question bank or final manifest.

`scripts/catalogMobileQa.mjs` is browser QA instrumentation for Store category navigation, scrolling, image/layout/accessibility checks and screenshots; it is not imported into the game runtime and no learning mutation was found.

## PASS / FAIL / BLOCKED / NOT TESTED

| Area | Status | Evidence |
| --- | --- | --- |
| Question-bank/key/source stability during catalog sprint | **PASS** | Learning core hashes unchanged; full CI green. |
| Phonics/rhyme/vowels/spelling | **PASS** | Executed family regressions green. |
| HFW/vocabulary context | **PASS** | Executed hardening/semantic regressions green. |
| Reading inference/evidence | **PASS** | Executed screenshot-integrity and question-quality regressions green. |
| Religion Unit 1 | **PASS** | Source-bounded family regression green. |
| Five-action deterministic Quest | **PASS** | Fixed-date/deterministic selector tests green; exactly five distinct actions. |
| Clue/retry vs independent mastery/evidence | **PASS** | Reward-policy and screenshot-integrity tests green. |
| Catalog SVG executable/external-content safety | **PASS** | New catalog asset safety test green across current SVG set. |
| Candidate-import learning isolation | **PASS** | Static script/workflow review; candidate paths only. |
| Production build | **PASS** | CI job `106470895718`. |
| Physical-device/screen-reader Quest legibility in this run | **NOT TESTED** | Separate release/browser accessibility gate; catalog changes did not modify Quest learning text. |
| Independent visual quality of catalog assets | **NOT TESTED BY WS12** | Owned by Workstreams 01/14. |

## Handoff

**Workstream 08:** keep canonical catalog integration limited to stable item-ID → image mapping. Do not couple art availability to question selection, source mapping, mastery, rewards or player ownership. Re-run full CI after canonical integration.

**Workstream 14:** the learning gate is execution-backed PASS at `f654431b...`, not merely static review. The new SVG safety test is part of the green suite. Any later runtime-affecting catalog or Quest integration must earn a fresh exact-head CI/readback before release.

**Command Center:** there is no catalog-induced P0 learning blocker on this audited head. This does **not** by itself clear the catalog gate; independent visual, integration, persistence/economy and remaining release evidence still apply.

No curriculum was expanded, no school-calendar-derived quiz content was added, no player progress was changed, and Replit/Floot/`main` remain untouched.
