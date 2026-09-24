# Workstream 16 — Learning Factory / Adaptive Shadow Stack

STATUS: **PROMOTION SHADOW COMPLETE / FINAL HOLDOUT NOT SUPPORTIVE / LIVE SELECTOR V2 BLOCKED**

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

Exactly one registered source remains unresolved for **strict external-original provenance**:

- `abvm-grade2-current-source-pack`

The six claims used by StarBlox are now represented by a canonical in-repo
fallback snapshot with SHA-256
`119b69175b2995357fd18d9502f78259bcfe9ab7b336d71ab5cd8aaa88297c4a`.
That closes reproducibility/snapshot coverage for the current question bank, so
`snapshotReady=true`. It does **not** prove that the fallback is the original
ABVM artifact, so `strictReady=false` remains correct.

Repository, connected Google Drive, connected Gmail, exact-claim phrase searches,
and a public web search for the Assumption BVM Grade-2 grammar material did not
locate an original source artifact. Do not relabel the fallback as an external
original merely to clear this gate.

## Promotion blockers

Selector V2 must remain shadow-only until all of the following are satisfied:

1. the external original behind `abvm-grade2-current-source-pack` is verified, or strict external-original provenance is explicitly redefined through a separate review;
2. EdGameClaw-generated candidates are bound to approved evidence spans before QA/release;
3. PSI-KT is trained and evaluated on an authorized StarBlox-shaped dataset and compared against the existing heuristic/BKT baseline;
4. Riff/FSRS review commands are executed through an actual FSRS engine and calibrated for StarBlox cadence;
5. deterministic simulations continue to pass under broader learner-model distributions;
6. reward, retry, persistence, accessibility, semantic-question, learning-integrity, and build gates remain green;
7. any real-learner evaluation is separately authorized and privacy-reviewed.

## Phase 2 — Promotion evidence and hold decision

Completed promotion-shadow decision run: `35954276735` at GitHub SHA
`cba3389ce05d51a4c343d60d734d36c4ae6d1210`.

### ABVM snapshot status

The six current grammar/language questions now have a canonical in-repo fallback
source representation in `src/currentAbvmGrade2SourcePack.js`.

- fallback snapshot SHA-256:
  `119b69175b2995357fd18d9502f78259bcfe9ab7b336d71ab5cd8aaa88297c4a`
- all registered source representations are now snapshot-ready;
- the fallback explicitly states that it is **not** asserted to be the external
  original ABVM artifact;
- repository, connected Google Drive, and connected Gmail searches did not
  locate an external original ABVM source artifact;
- therefore `snapshotReady=true` but `strictReady=false`, with
  `abvm-grade2-current-source-pack` retained as
  `external-original-unverified`.

This distinction must not be collapsed merely to make strict provenance pass.

### Actual FSRS execution

The promotion pipeline executes StarBlox review commands through the real pinned
`github.com/open-spaced-repetition/go-fsrs/v3` engine, version `v3.3.1`.

Completed decision-run evidence:

- observed-prefix review commands: **864**;
- learner+concept FSRS cards: **528**;
- engine receipt SHA-256:
  `a15f3fc323f20a1d0a5d8fd1013fce389015276296f2791911f302f711d9f7e2`;
- card IDs are learner-scoped, so synthetic learners do not share review state.

### Pinned PSI-KT execution

The pipeline clones and checks out
`mlcolab/psi-kt@ecada10cedb3237ba55f4277af0bdbd8d5d4a68e`,
then trains/inferes `AmortizedPSIKT` on the deterministic
`synthetic-only-no-real-player-data` StarBlox-shaped dataset.

The pinned upstream commit required compatibility handling for verified upstream
implementation defects. The StarBlox wrapper records each shim in the receipt:

- bypass an unused sampled-tensor reshape that references undefined `bsn`;
- return the objective dictionary that upstream `forward()` computes before
  overwriting it with a debug subset;
- expose GMVAE `logits` and `prob_cat` tensors already returned by the
  inference network but dropped before upstream `loss()`;
- skip the missing `gen_network_transition_s` prior-entropy diagnostic only
  while its configured weight is exactly zero;
- audit and repair the pinned DataReader's `correct_seq` chronological
  misalignment. In the evaluated dataset **48/48** learner sequences required
  that repair.

These shims preserve the upstream model/loss mathematics that are actually
enabled in this experiment and are part of the auditable model receipt.

### Development selector comparison (superseded for final acceptance)

The original promotion benchmark in
`docs/preproduction/learning-factory/locked-promotion-benchmark.json` used
seed **20260924**, 48 source learners, a 32-learner comparison cohort, an
18-interaction observed prefix, and a 12-interaction held-out suffix.

That cohort was useful development evidence, but it is **not** the final untouched
acceptance benchmark because the PSI-KT training/evaluation protocol was hardened
after its result was observed (longer validation-selected training and fixed
forked evaluation RNG streams). Its results remain preserved for audit history
but are superseded for final acceptance by Phase 3 below.

### Completed candidate result: DO NOT PROMOTE

Decision run `35954276735` persisted
`starblox-learning-promotion-decision-v1` with
`liveSelectorV2Allowed:false`.

PSI-KT held-out predictive metrics in that completed candidate:

- accuracy: **0.4479167**;
- AUC: **0.4469494**;
- Brier score: **0.2560778**;
- prediction count: **384**.

Targeting results on the locked 32-learner cohort:

| Policy | Mean hidden need | Weakest-skill hit | Due-skill coverage | Unique skills | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current heuristic | 0.5985735 | 0.75000 | 0.4979482 | 5 | 1.0 |
| BKT-backed shadow | 0.5855737 | 0.78125 | 0.4910038 | 5 | 1.0 |
| PSI-KT + FSRS Selector V2 | 0.5520589 | 0.65625 | 0.4844066 | 5 | 1.0 |

PSI-KT + FSRS deltas vs current heuristic:

- mean hidden need: **-0.0465146**;
- weakest-skill hit rate: **-0.09375**;
- due-skill coverage: **-0.0135417**.

PSI-KT + FSRS deltas vs BKT-backed shadow:

- mean hidden need: **-0.0335148**;
- weakest-skill hit rate: **-0.12500**;
- due-skill coverage: **-0.0065972**.

The synthetic benchmark therefore reports `supportive:false`.

The persisted blockers are:

1. `synthetic-only-evaluation`;
2. `abvm-external-original-unverified`;
3. `real-learner-efficacy-not-evaluated`;
4. `privacy-review-not-complete`;
5. `synthetic-selector-benchmark-not-supportive`.

The live-code boundary assertion scans the live Quest entry points for
`selectorV2Shadow` / `pickQuestV2Shadow` and is currently clean.

### Model-development rule after the development rejection

Seed `20260924` is retained as development evidence and must not be described
as the final untouched holdout. The model/training protocol was frozen after
that phase:

- upstream PSI-KT commit fixed;
- 200-epoch maximum budget;
- patience-10 early stopping selected by validation predictive BCE;
- 0.6 observed temporal prefix;
- fixed forked validation/test Monte Carlo RNG offsets;
- FSRS pinned to `v3.3.1`;
- selector weights unchanged.

After freezing that protocol, a **new unseen cohort** was locked before any
result was observed. That final holdout is Phase 3 below and must never be used
for tuning and then re-evaluated.


## Phase 3 — Untouched final holdout / authoritative hold decision

Authoritative final-holdout run: `35955086920`  
GitHub SHA: `e4d6e1a0fabec3a70d0f79a032b7f8190282f8ca`  
Evidence artifact: `learning-model-promotion-shadow` (artifact ID
`10790386287`).

### Final benchmark governance

`docs/preproduction/learning-factory/final-promotion-benchmark.json` locks:

- benchmark ID: `starblox-psi-fsrs-final-holdout-v2`;
- authorization: `synthetic-only-no-real-player-data`;
- `finalHoldout:true`;
- seed: **20261103**;
- source learners: **48**;
- evaluated PSI-held-out learners: **32**;
- observed decision boundary: **18** interactions;
- held-out suffix: **12** interactions;
- core metrics: `meanHiddenNeed` and `weakestSkillHitRate`;
- `tuneAgainstThisCohort:false`;
- training protocol frozen from commit
  `3ef48c0b60f8ad229fbc5cc82231026ff6c2c1dc`.

The final CI assertion verified the seed, learner counts, temporal boundary,
metrics, PSI upstream commit, 200-epoch budget, patience 10, 0.6 temporal prefix,
fixed evaluation RNG offsets, FSRS `v3.3.1`, and
`liveSelectorV2Allowed:false`.

### Actual FSRS evidence on the final holdout

The same first 18 observations available to every selector were converted into
Riff-compatible reviews and executed through the actual
`open-spaced-repetition/go-fsrs/v3` engine:

- engine version: **v3.3.1**;
- review commands: **864** = 48 learners × 18 observed interactions;
- learner+concept cards: **528** = 48 × 11 skills;
- evaluation time: `2026-09-06T18:47:00Z`;
- FSRS payload SHA-256:
  `65d8fa3abfca4319e566c49724bc127cf7e0704c4183b626bf42e7d5d1657eb8`.

No held-out interaction was fed into FSRS selector state.

### Validation-selected pinned PSI-KT evidence

Pinned upstream model:

`mlcolab/psi-kt@ecada10cedb3237ba55f4277af0bdbd8d5d4a68e`

Training/evaluation:

- model: `AmortizedPSIKT`;
- epochs requested: **200**;
- epochs completed before patience stop: **21**;
- early-stopping patience: **10**;
- best epoch: **10**;
- best validation predictive BCE: **0.6902820468**;
- observed temporal prefix: **0.6 / 18 interactions**;
- held-out test predictions: **384**;
- accuracy: **0.4791667**;
- AUC: **0.4689565**;
- Brier score: **0.2583837**;
- full selector state: **32 learners × 11 skills**;
- model-state SHA-256:
  `a207cdb61e143c4bd18926f3c3b1d3f962b0222cd85bba9f76352703db7a9059`;
- validation RNG seed: **20361104**;
- test RNG seed: **20461106**;
- evaluation RNG runs in forked streams and does not perturb training RNG.

The pinned upstream implementation required auditable StarBlox-side compatibility
shims for verified defects:

1. bypass an unused sampled reshape that references undefined `bsn`;
2. return the upstream objective dictionary before its debug overwrite;
3. expose the upstream GMVAE `logits` / `prob_cat` already produced but
   discarded before loss evaluation;
4. skip a nonexistent prior-entropy diagnostic only because its configured
   weight is exactly zero (nonzero weight is rejected);
5. repair chronological `correct_seq` alignment after verifying skill,
   problem, and time sequences against the source TSV.

The alignment audit checked **48/48** learners and repaired **48/48** affected
`correct_seq` histories before upstream corpus loading.

### Final selector comparison

All policies were evaluated at the **same step-18 decision boundary** on the
same 32 PSI-held-out learners. Hidden truth, heuristic stats, BKT state, PSI
state, and FSRS review state were frozen at that point; the final 12 outcomes
were not used as selector inputs.

| Policy | Mean hidden need | Weakest-skill hit | Due-skill coverage | Unique skills | Transfer |
| --- | ---: | ---: | ---: | ---: | ---: |
| Current heuristic | **0.5658294** | **0.71875** | 0.5130242 | 5 | 1.0 |
| BKT-backed shadow | **0.5770240** | **0.78125** | 0.5161492 | 5 | 1.0 |
| PSI-KT + FSRS Selector V2 | **0.5489398** | **0.65625** | 0.5161492 | 5 | 1.0 |

PSI-KT + FSRS versus current heuristic:

- mean hidden need: **-0.0168896**;
- weakest-skill hit rate: **-0.0625**;
- due-skill coverage: **+0.003125**;
- skill diversity: no change;
- transfer inclusion: no change.

PSI-KT + FSRS versus BKT-backed shadow:

- mean hidden need: **-0.0280842**;
- weakest-skill hit rate: **-0.125**;
- due-skill coverage: **0**;
- skill diversity: no change;
- transfer inclusion: no change.

The locked final benchmark therefore records
`syntheticBenchmark.supportive:false`.

### Authoritative promotion decision

The persisted
`starblox-learning-promotion-decision-v1` at SHA
`e4d6e1a0fabec3a70d0f79a032b7f8190282f8ca` records:

`liveSelectorV2Allowed:false`

with blockers:

1. `synthetic-only-evaluation`;
2. `abvm-external-original-unverified`;
3. `real-learner-efficacy-not-evaluated`;
4. `privacy-review-not-complete`;
5. `synthetic-selector-benchmark-not-supportive`.

The static live-code assertion found **zero** references to
`selectorV2Shadow` / `pickQuestV2Shadow` in `App.jsx`, `main.jsx`, or
`gameModel.js`.

**Do not tune against seed `20261103` and rerun it.** Any future PSI-KT or
Selector V2 development requires a separate development cohort and, if a new
candidate is eventually frozen, a new untouched final holdout. Until then, the
current heuristic/BKT shadow path remains the appropriate baseline and Selector
V2 stays out of live Quests.

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
