# Workstream 16 — Learning Factory / Adaptive Shadow Stack

STATUS: **IMPLEMENTED + CI GREEN IN SHADOW MODE / LIVE QUEST SELECTOR UNCHANGED**

Branch: `starblox-learning-factory-v1`  
Base at branch creation: `screenshot-match-preproduction`  
Latest fully verified implementation head before this documentation-only commit: `2d0b58c3dd8f1f3af4d265046b89d6a9977af083`  
Learning Factory Shadow QA run: `35946960060`

## Goal

Combine the useful boundaries of EdGameClaw, PSI-KT, Riff/FSRS, unanswerable-question generation, and Critical Window-style deterministic evidence gates around StarBlox without allowing generated content or adaptive research code to bypass existing learning-integrity rules.

## Implemented

### Canonical question/event contracts

- `src/learningContracts.js`
  - normalizes current questions into `QuestionV2`;
  - defines canonical `LearningEvent`;
  - assisted/retry observations cannot become mastery-eligible.
- `src/learningEventLedger.js`
  - bounded append-only shadow ledger;
  - deterministic event-ID dedupe.
- `src/learningEventBridge.js`
  - bridge from the real answer transaction.
- `src/App.jsx`
  - records the canonical event only when `VITE_STARBLOX_LEARNING_FACTORY_SHADOW=1`;
  - default/off behavior does not add the shadow ledger;
  - one timestamp is captured outside the state updater so React updater replays dedupe safely.

### Source provenance / Critical Window-style gate

- `src/learningSourceRegistry.js`
  - stable source IDs and explicit provenance states.
- `src/currentLearningSourceSnapshots.js`
  - canonical in-repo payloads for current spelling, HFW, vocabulary, Religion Unit 1, and StarBlox practice passages.
- `src/contentProvenanceRuntime.js`
  - deterministic content bundles;
  - source snapshot hashes carried inside the bundle;
  - strict provenance rejects snapshot-required sources without a hash;
  - stable content fingerprint.
- `scripts/validateLearningContent.mjs`
  - validates the hardened 200-question bank;
  - generates a SHA-256 receipt;
  - persists the individual source hashes and remaining provenance debt.

### Adversarial QA / unanswerable-QG boundary

- `src/adversarialQuestionQa.js`
  - deterministic entity and antonym counterfactuals;
  - hard structural findings separated from heuristic findings;
  - generated counterfactuals are QA inputs only and never player content.

### EdGameClaw boundary

- `src/edGameClawShadowAdapter.js`
  - converts course/chunk structure into non-executable StarBlox interaction candidates;
  - retains concept, source, mechanic, and simulation metadata;
  - does not import generated HTML/JavaScript into StarBlox.
- `scripts/adaptEdGameClawCourse.mjs`
  - executable offline adapter.

### PSI-KT boundary

- `src/psiKtShadowAdapter.js`
  - emits PSI-KT sequence arrays;
  - excludes assisted/non-mastery observations by default;
  - exports DataReader-compatible TSV columns:
    `user_id`, `skill_id`, `correct`, `timestamp`, `problem_id`.
- `scripts/exportPsiKtDataset.mjs`
  - executable offline exporter.

No PSI-KT model output affects live StarBlox selection yet.

### Riff / FSRS boundary

- `src/riffShadowAdapter.js`
  - emits per-concept review commands;
  - wrong -> Again;
  - assisted/retry correct -> Hard;
  - independent correct -> Good.
- `scripts/exportRiffReviews.mjs`
  - executable offline exporter.

No Riff/FSRS due state affects live StarBlox selection yet.

### Selector V2 shadow

- `src/selectorV2Shadow.js`
  - combines PSI-style mastery/uncertainty, FSRS-style due state, recency, role, district, and diversity constraints;
  - deterministic tie-breaking;
  - deliberately not wired into `gameModel.pickQuest()`.
- `scripts/selectorV2ShadowSimulation.mjs`
  - deterministic synthetic-population regression harness.

## Verified evidence

Run `35946960060` completed successfully with all gates green:

- Learning Factory tests: **5 files / 15 tests PASS**.
- Existing StarBlox learning/persistence regression subset: **9 files / 45 tests PASS**.
- Hardened question bank: **200 questions**, **0 existing-runtime issues**.
- Adversarial QA: **79 generated variants**, **0 hard findings**.
- Content fingerprint: `fnv1a32:f01dc5d8`.
- Content bundle SHA-256: `07b51b743762c53e29205ce2e614d8a922b0e4683ebe39ffefa43b3505915460`.
- Selector simulation: **250 synthetic learners**, **11 skills**, **0 failures**.
- Current synthetic harness top-modeled-need skill representation: **100%**.
- EdGameClaw fixture: **2 candidates / 0 adapter issues**.
- PSI-KT fixture: **1 exported interaction row** from mastery-eligible evidence.
- Riff fixture: **2 review commands**.
- Full Vite production build: **PASS**.

The synthetic selector result is a deterministic regression/safety result, not evidence of real-world learning efficacy.

## Source snapshot evidence

The validation receipt now carries these canonical SHA-256 source snapshots:

- `current-week-spelling-list`: `sha256:f875c52eb6a94e3220ae3c364dc5beef10c7d371bd6b3824849760c6c372da45`
- `current-week-hfw-list`: `sha256:4edc3247d0c169138d5e62daab40ae3ee4212a0c6a145fae7573ca5fc3667964`
- `current-week-vocabulary`: `sha256:e725f6f69832860a7106366aa9a6f11d509250b745e3b0cc500f9e2bf29f0458`
- `approved-religion-unit-1`: `sha256:c0a9feb3de8c70f88ce084b501e538d5811229254b0c6040b00ed6f64a7b01ef`
- `starblox-practice-passages`: `sha256:8d4b1f7a61e68bc4925b34d9813366d953705600b6aecab55a568f39b852e182`

## Remaining provenance debt

Exactly one registered source remains unresolved for strict provenance:

- `abvm-grade2-current-source-pack`

Therefore `provenanceDebt().strictReady` remains **false by design**. Do not mark strict provenance ready until the approved underlying ABVM source artifact itself is available in a stable snapshot/hashable representation.

## Promotion blockers

Selector V2 must remain shadow-only until all of the following are satisfied:

1. the broad `abvm-grade2-current-source-pack` source artifact is snapshot/hash-bound;
2. EdGameClaw-generated candidates are bound to approved evidence spans before QA/release;
3. PSI-KT is trained and evaluated on an authorized StarBlox-shaped dataset and compared against the existing heuristic/BKT baseline;
4. Riff/FSRS review commands are executed through an actual FSRS engine and calibrated for StarBlox cadence;
5. deterministic simulations continue to pass under broader learner-model distributions;
6. reward, retry, persistence, accessibility, semantic-question, learning-integrity, and build gates remain green;
7. any real-learner evaluation is separately authorized and privacy-reviewed.

## Integration note

At the latest comparison during this workstream, `screenshot-match-preproduction` had advanced concurrently and this branch was **2 commits behind** it. Reconcile/rebase those concurrent preproduction changes before opening or merging a PR; do not blindly merge the moving branch.

## Commands

```bash
npm run test:learning-factory
npm run test:learning-regression
npm run validate:learning
npm run simulate:learning-shadow
npm run build

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
- no deployment;
- no main/preproduction merge from this workstream.
