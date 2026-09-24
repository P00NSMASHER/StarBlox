# Workstream 16 — Learning Factory / Adaptive Shadow Stack

STATUS: **PROMOTION RESEARCH HOLD / NO EXPERIMENTAL SELECTOR CLEARED REQUIRED GATES / CURRENT HEURISTIC REMAINS LIVE**

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


## Phase 4 — BKT + continuous FSRS risk candidate / second final rejection

After the PSI-KT + FSRS candidate failed the authoritative Phase-3 holdout, all
subsequent model/selector development moved to separate development-only cohorts.
The Phase-3 seed `20261103` was never reused for tuning.

### Component diagnosis on development-only seed 20261217

The component ablation showed why the PSI candidate failed:

- PSI selector-state MAE versus synthetic latent truth: **0.1704452**;
- PSI Pearson correlation versus latent truth: **-0.0582287**;
- BKT MAE versus latent truth: **0.2274908**;
- BKT Pearson correlation versus latent truth: **+0.4357636**.

PSI was closer in absolute calibration but did not preserve useful skill ranking.
BKT was less calibrated in absolute probability but had materially better ranking
signal for Quest targeting.

The same development cohort showed:

- current heuristic: hidden need **0.5770456**, weakest-skill hit **0.71875**;
- BKT-only: hidden need **0.5753979**, weakest-skill hit **0.78125**;
- PSI-only: hidden need **0.5146980**, weakest-skill hit **0.50000**;
- oracle truth: hidden need **0.6538500**, weakest-skill hit **1.00000**.

That established two facts:

1. the Quest selector itself has substantial headroom if mastery ranking improves;
2. current PSI-KT state should remain research telemetry rather than the primary
   ranking signal.

A BKT/PSI blend sweep selected alpha **0.5** on the tuning cohort, but a separately
locked development-validation cohort at seed `20261229` rejected it:

- hidden need versus BKT: **-0.0186052**;
- weakest-skill hit versus BKT: **-0.09375**;
- `validationSupportive:false`.

The PSI blend was therefore rejected without creating another final holdout.

### FSRS signal diagnosis

Binary FSRS `due/not due` was too coarse. On the tuning cohort, the mean learner
had **9.7083 of 11 skills due**, and changing the binary due bonus from 0 through
80 produced identical BKT selector results.

Using continuous forgetting risk, defined as `1 - retrievability`, produced
meaningful variation. With BKT mastery fixed, the development sweep selected
risk weight **40**:

- no risk bonus: hidden need **0.5734447**, weakest-skill hit **0.7708333**;
- risk weight 40: hidden need **0.5793498**, weakest-skill hit **0.8333333**.

The risk-40 candidate then passed a separately locked development-validation
cohort at seed `20270113`:

- versus BKT: hidden need **+0.0034526**, weakest-skill hit **+0.0625**;
- versus current heuristic: hidden need **+0.0042053**, weakest-skill hit **0**;
- `validationSupportive:true`.

Only after that independent validation was the candidate frozen in:

- `src/selectorBktFsrsRiskShadow.js`;
- selector version `starblox-bkt-fsrs-risk-v1`;
- frozen FSRS risk weight **40**;
- locked candidate SHA
  `ac69722e791e8b89ffbd51958302aaa10f77fd7e`.

### New untouched final holdout

A new final holdout was locked **before evaluation**:

- benchmark ID: `starblox-bkt-fsrs-risk40-final-holdout-v1`;
- seed: **20270217**;
- source learners: **48**;
- decision boundary: **18 / 30 interactions**;
- candidate code was diff-checked against the frozen SHA;
- actual FSRS engine: `open-spaced-repetition/go-fsrs/v3 v3.3.1`;
- final-holdout run: `35957281134`;
- run head SHA:
  `dea2bad861c46b97456dfaffcf91514db1fe567e`;
- evidence artifact ID: `10790059664`;
- artifact digest:
  `sha256:371c710aa7843ef301c83b83dd8bbba35cf3ba91c6ca2e55f7edd4e18de64603`;
- FSRS payload SHA-256:
  `07da57bf4d9bdd4e6380112f8cc971010d67506b70d01d5fbe05b3983baa69df`.

Acceptance thresholds were predeclared before the holdout was run:

- hidden-need gain versus heuristic >= **0.002**;
- weakest-skill-hit gain versus heuristic >= **0**;
- hidden-need gain versus BKT >= **0.002**;
- weakest-skill-hit gain versus BKT >= **0.02**;
- due-skill-coverage loss versus heuristic no worse than **-0.02**.

Final results:

| Policy | Mean hidden need | Weakest-skill hit | Due-skill coverage |
| --- | ---: | ---: | ---: |
| Current heuristic | 0.5527061 | 0.7083333 | 0.5063026 |
| BKT, no FSRS risk | 0.5628061 | 0.7291667 | 0.5130734 |
| Frozen BKT + FSRS risk 40 | 0.5619097 | 0.7708333 | 0.5130734 |

Candidate deltas versus current heuristic:

- hidden need: **+0.0092037**;
- weakest-skill hit: **+0.0625**;
- due-skill coverage: **+0.0067708**.

Candidate deltas versus BKT:

- hidden need: **-0.0008964**;
- weakest-skill hit: **+0.0416667**;
- due-skill coverage: **0**.

Acceptance vector:

- hidden need versus heuristic: **PASS**;
- weakest-skill hit versus heuristic: **PASS**;
- hidden need versus BKT: **FAIL**;
- weakest-skill hit versus BKT: **PASS**;
- due-coverage guardrail: **PASS**.

Therefore:

`finalHoldoutSupportive:false`

and:

`liveSelectorAllowed:false`.

Persisted blockers remain:

1. `synthetic-only-evaluation`;
2. `abvm-external-original-unverified`;
3. `real-learner-efficacy-not-evaluated`;
4. `privacy-review-not-complete`;
5. `new-final-holdout-not-supportive`.

**Do not relax the threshold post hoc or reuse seed `20270217` to tune risk
weight 40.** The candidate is rejected under the predeclared final-holdout rule.

The live-code assertion remained clean: the frozen candidate is not referenced
from `App.jsx`, `main.jsx`, or `gameModel.js`.


## Phase 5 — Heuristic-anchored candidate / independent validation rejection

After the BKT+continuous-FSRS risk candidate missed its predeclared final-holdout
threshold, a BKT+FSRS near-tie candidate was explored on new development-only
cohorts. Its frozen margin-3 candidate failed independent validation at seed
`20270307`:

- candidate vs BKT hidden need: **+0.0014828**;
- candidate vs BKT weakest-skill hit: **+0.0208333**;
- candidate vs current heuristic hidden need: **-0.0039085**;
- candidate vs current heuristic weakest-skill hit: **0**;
- `validationSupportive:false`.

It therefore never received another final holdout.

A separate development direction then anchored the existing live heuristic and
allowed BKT + continuous FSRS risk to reorder only questions within a bounded
heuristic-score margin.

### Fresh tuning cohort

Development-only seed: **20270419**  
Diagnostic run: `35975987584`  
Actual FSRS payload SHA-256:
`97a0b03d6a72aae3df6bc08b367c8532d80a7d86327c373dd3094a69c8ad5af0`.

The sweep selected:

- heuristic score margin: **3**;
- FSRS forgetting-risk weight: **16**.

On the tuning cohort the selected pair produced:

- candidate hidden need: **0.5987994**;
- candidate weakest-skill hit: **0.8333333**;
- candidate due-skill coverage: **0.5231993**;
- versus current heuristic hidden need: **+0.0015824**;
- versus current heuristic weakest-skill hit: **+0.0208333**;
- versus BKT hidden need: **+0.0166538**;
- versus BKT weakest-skill hit: **+0.1666667**.

This was tuning evidence only. The parameters were frozen in
`src/selectorHeuristicBktFsrsAnchorShadow.js` before independent validation.

### Independent no-tuning validation

Validation seed: **20270511**  
Validation run: `35976293553`  
Actual FSRS payload SHA-256:
`7e331cf9c04d08b30252b74bec7478d021da4ebd36a4cffd818502440a764204`.

Predeclared requirements included:

- no hidden-need regression versus the current heuristic;
- no weakest-skill-hit regression versus the current heuristic;
- no hidden-need regression versus BKT;
- weakest-skill-hit gain versus BKT >= **0.02**;
- due-skill-coverage loss versus the heuristic no worse than **-0.01**;
- five-skill diversity and transfer inclusion preserved.

Independent results:

| Policy | Mean hidden need | Weakest-skill hit | Due-skill coverage |
| --- | ---: | ---: | ---: |
| Current heuristic | **0.5838681** | **0.81250** | 0.5146254 |
| BKT-backed shadow | **0.5920151** | **0.9166667** | 0.5143361 |
| Frozen heuristic/BKT/FSRS anchor | **0.5835776** | **0.7916667** | 0.5146254 |

Frozen candidate deltas:

- versus heuristic hidden need: **-0.0002904**;
- versus heuristic weakest-skill hit: **-0.0208333**;
- versus BKT hidden need: **-0.0084375**;
- versus BKT weakest-skill hit: **-0.125**;
- versus heuristic due coverage: **0**.

Therefore:

`validationSupportive:false`

and the candidate is **retired without a final holdout**. The validation cohort
must not be used to retune the same frozen candidate and then described as
independent evidence.

### Consolidated live decision

`docs/preproduction/learning-factory/current-promotion-decision.json` now
records the consolidated state:

- live selector remains `gameModel.pickQuest`;
- PSI-KT remains research telemetry only;
- actual FSRS remains a validated research signal only;
- PSI-KT+FSRS Selector V2: rejected final holdout;
- BKT+FSRS risk-40: rejected final holdout;
- BKT+FSRS near-tie-3: rejected independent validation;
- heuristic/BKT/FSRS anchor margin-3/risk-16: rejected independent validation.

`scripts/assertLearningLiveSelectorBoundary.mjs` now scans `App.jsx`,
`main.jsx`, and `gameModel.js` for every experimental selector family. CI
fails if any rejected/research selector is wired into the live Quest path.

The remaining live-promotion blockers are:

1. external-original ABVM provenance remains unverified;
2. no real-learner efficacy evaluation has been authorized/completed;
3. privacy review for real-learner adaptive modeling is not complete;
4. no research selector has cleared the required development-validation and
   untouched-final-holdout sequence.

Further synthetic research may continue only on fresh development cohorts.
Prior validation/final-holdout seeds must remain frozen and must not be reused
for tuning.


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
