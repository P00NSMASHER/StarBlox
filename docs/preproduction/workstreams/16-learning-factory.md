# Workstream 16 — Learning Factory / Adaptive Shadow Stack

STATUS: **SHADOW IMPLEMENTATION ACTIVE / LIVE QUEST SELECTOR UNCHANGED**

Branch: `starblox-learning-factory-v1`  
Base: `screenshot-match-preproduction`

## Goal

Combine the useful boundaries of EdGameClaw, PSI-KT, Riff/FSRS, unanswerable-question generation, and Critical Window-style deterministic evidence gates around StarBlox without allowing generated content or adaptive research code to bypass existing learning-integrity rules.

## Implemented

### Canonical contracts

- `src/learningSourceRegistry.js`
  - stable source IDs for the current StarBlox learning families;
  - explicit provenance status instead of pretending every source is snapshotted.
- `src/learningContracts.js`
  - `QuestionV2` normalization;
  - canonical `LearningEvent`;
  - assisted/retry evidence cannot become mastery-eligible.
- `src/learningEventLedger.js`
  - append-only bounded shadow ledger;
  - deterministic dedupe by event ID.
- `src/learningEventBridge.js`
  - feature-flagged bridge from the real StarBlox answer seam;
  - disabled unless `VITE_STARBLOX_LEARNING_FACTORY_SHADOW=1`.

### Content/provenance gate

- `src/contentProvenanceRuntime.js`
  - deterministic content bundles;
  - stable runtime fingerprint;
  - source coverage validation;
  - explicit strict-provenance debt.
- `scripts/validateLearningContent.mjs`
  - evaluates the hardened production-shaped question bank;
  - emits SHA-256 validation receipts.

### Adversarial QA

- `src/adversarialQuestionQa.js`
  - shadow counterfactual entity/antonym perturbations;
  - hard structural findings separated from heuristic/soft findings.
- The adversarial layer is a release-test input only. Generated counterfactuals are not player content.

### PSI-KT boundary

- `src/psiKtShadowAdapter.js`
  - converts mastery-eligible first-attempt StarBlox events into PSI-KT sequence arrays;
  - excludes assisted retries by default;
  - exports a tab-separated interaction table with the columns consumed by PSI-KT's `DataReader`: `user_id`, `skill_id`, `correct`, `timestamp`, `problem_id`.
- `scripts/exportPsiKtDataset.mjs`
  - executable offline exporter for a ledger JSON.

No PSI-KT model output affects live StarBlox behavior.

### Riff / FSRS boundary

- `src/riffShadowAdapter.js`
  - emits per-concept review commands;
  - wrong -> Again;
  - assisted/retry correct -> Hard;
  - independent correct -> Good.
- `scripts/exportRiffReviews.mjs`
  - executable offline exporter.

No Riff/FSRS due date affects live StarBlox behavior.

### EdGameClaw boundary

- `src/edGameClawShadowAdapter.js`
  - accepts EdGameClaw course/chunk structure;
  - converts it into non-executable StarBlox interaction candidates;
  - strips the integration boundary down to content/concept/mechanic metadata;
  - never imports generated HTML/JavaScript into the StarBlox runtime.
- `scripts/adaptEdGameClawCourse.mjs`
  - executable offline adapter.

### Selector V2 shadow

- `src/selectorV2Shadow.js`
  - combines PSI-style mastery/uncertainty and FSRS-style due state with StarBlox role/district constraints;
  - deterministic tie breaking;
  - not wired into `gameModel.pickQuest()`.
- `scripts/selectorV2ShadowSimulation.mjs`
  - deterministic synthetic-population simulation.

## Verified evidence

Green Learning Factory Shadow QA evidence on this branch includes:

- 200 hardened questions validated;
- deterministic content fingerprint `fnv1a32:b2084ac2`;
- content SHA-256 `231a3a751abe0b3194c87d84c6e95194a23979b84434a8e4d90f80aea2a3ea3a`;
- 79 generated adversarial variants;
- 0 adversarial hard findings;
- 250 deterministic synthetic learners in Selector V2 simulation;
- Selector V2 simulation failure count: 0;
- top modeled-need skill represented in the selected Quest: 100% in the current synthetic fixture population;
- adapter and feature-flagged event-bridge tests green.

The synthetic simulation is a regression/safety harness, not evidence of real-world learning gains.

## Current provenance debt

The current bootstrap bank still contains declared curriculum sources that are represented by stable IDs but are not yet backed by immutable source snapshot hashes inside this branch. Strict provenance therefore remains intentionally **not ready**.

Do not change `provenanceDebt().strictReady` to true until the underlying approved source artifacts are snapshotted/hash-bound.

## Promotion blockers

Selector V2 must remain shadow-only until all of the following are true:

1. approved curriculum/source artifacts have immutable snapshot hashes;
2. EdGameClaw-generated candidates are evidence-bound before QA;
3. PSI-KT is trained/evaluated on an authorized StarBlox-shaped dataset and compared against the existing BKT/heuristic baseline;
4. Riff/FSRS scheduling is run through an actual FSRS engine and calibrated for the StarBlox interaction cadence;
5. deterministic simulation continues to pass;
6. existing reward, retry, persistence, accessibility, semantic-question, and learning-integrity tests remain green;
7. any evaluation on real learner data is separately authorized and privacy-reviewed.

## Commands

```bash
npm run test:learning-factory
npm run validate:learning
npm run simulate:learning-shadow

npm run interop:edgameclaw -- --input=<course.json> --out=<candidates.json> --source-ids=<source-id>
npm run interop:psikt -- --input=<learning-ledger.json> --out=<interactions_N.csv>
npm run interop:riff -- --input=<learning-ledger.json> --out=<riff-reviews.json>
```

## Non-goals / protections

- no live selector replacement;
- no external API calls from the child-facing runtime;
- no generated JavaScript/HTML execution from EdGameClaw;
- no assisted retry can manufacture mastery evidence;
- no PSI-KT or Riff output can award Coins, Stars, mastery, or transfer evidence;
- no deployment or main-branch merge from this workstream.
