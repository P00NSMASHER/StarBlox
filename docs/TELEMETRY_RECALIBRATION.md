
# Automated telemetry-driven recalibration — Step 22

Step 22 closes the first StarBlox learning/balance feedback loop without allowing telemetry to silently rewrite production behavior.

## Source lineage

The recalibration workflow builds on already-pinned upstream implementations:

- Calculator5329/neon-vector-defense
  - commit: 48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4
  - src/game/runTelemetry.ts
  - scripts/balance.ts
  - scripts/balance-check.ts
- woodstocksoftware/adaptive-question-selector
  - commit: 4e3dc17bc98d8b777f3c5fc46302047283620e97
  - src/irt.py

The Neon pattern is important operationally: collect structured run evidence, generate quantitative balance reports, compare them with a known baseline, and make regression gates stop unsafe changes.

The IRT source provides the statistical item/ability model that StarBlox already adapted in Step 11.

## Trust boundary

Recalibration accepts only telemetry marked as:

server-authoritative-export

This is a domain contract, not cryptographic authentication. A production adapter must source these events from server-owned data produced after authoritative scoring/replay verification.

The recalibrator rejects telemetry containing direct player/content fields such as:

- player IDs / UIDs;
- names/usernames;
- email/phone/address;
- selected answers or canonical answers;
- prompts/choices;
- tokens/cookies/passwords/secrets/API keys.

The proposal stores no raw telemetry rows.

Its retained evidence is limited to:

- aggregate counts;
- rejection-reason counts;
- exact question-version refs;
- statistical calibration summaries;
- bounded proposed parameters;
- deterministic gate results;
- a deterministic fingerprint of normalized non-identifying evidence.

Step 20 diagnostic sessions are not authoritative recalibration inputs.

## Supported telemetry events

### question_response

Required evidence:

- exact Question Bank V2 ref;
- correctness;
- retry flag;
- current IRT ability estimate;
- ability standard error;
- timestamp/event ID.

Only the **current published exact QuestionVersion** is calibrated.

Retries are excluded because hints/guidance contaminate independent item difficulty evidence.

High-uncertainty ability estimates are excluded.

### policy_outcome

Carries the six normalized QuestionPolicy signals:

- memory;
- IRT;
- entropy;
- novelty;
- gameplay;
- quality.

It also carries a server-defined utility value in [0,1].

Utility is intentionally external to the recalibrator. Production should define it as a stable multi-objective outcome rather than simply "got the answer right," otherwise the system could learn to prefer trivially easy questions.

### session_summary

Carries aggregated per-session values:

- first-try rate;
- actions;
- Coins;
- XP;
- completion.

No player identifier is needed.

## Item recalibration

For each active exact question version:

1. gather non-retry responses with sufficiently precise ability estimates;
2. require a minimum sample size;
3. require both correct and incorrect outcomes;
4. compare observed correct rate with expected 2PL probability;
5. run the conservative Step 11 online item update;
6. shrink toward authored priors;
7. cap difficulty/discrimination movement per recalibration cycle.

Default safeguards:

- 30 usable responses minimum;
- at least 5 correct and 5 incorrect;
- ability SE <= 1.25;
- difficulty move <= 0.35 IRT units per cycle;
- discrimination move <= 0.20 per cycle.

Insufficient-data questions produce diagnostics, not parameter changes.

## QuestionPolicy weight recalibration

Policy weights only move after a substantial set of trusted policy-outcome records.

The pipeline measures Pearson association between each normalized signal and the caller-defined multi-objective utility.

Each weight may move only a small relative amount before re-normalization.

Default maximum relative movement is 10% per recalibration cycle.

This produces a **proposal**, not a new live policy.

## Balance/economy recalibration

Balance tuning requires explicit target bands supplied by the operator/configuration.

Example target bands may include:

- first-try rate range;
- average Coins per session;
- average XP per session.

The recalibrator does not invent product targets.

When observed metrics fall outside a configured band, the candidate can move only:

- Coins multiplier by a bounded relative amount;
- XP multiplier by a bounded relative amount;
- question difficulty multiplier by a bounded relative amount.

Defaults are intentionally tiny:

- economy: <= 3% per cycle;
- difficulty multiplier: <= 2% per cycle.

Stage count, optional-node count, Stars, mastery evidence, transfer evidence and other structural/progression signals are not automatically tuned.

The candidate is then compared against the current balance report using the existing deterministic balance matrix.

A failed balance gate blocks the proposal.

## Proposal lifecycle

buildTelemetryRecalibrationProposal() creates an immutable review artifact with:

- recalibration version;
- evidence fingerprint;
- accepted/rejected counts;
- item calibration proposals;
- item diagnostics;
- policy proposal;
- balance candidate + gate results;
- review blockers;
- deterministic proposal ID/hash.

Every proposal contains:

autoApply: false

There is intentionally no "apply proposal" function.

assertRecalibrationReviewable() only proves that:

- proposal integrity is valid;
- evidence/gates have no blockers;
- at least one supported change exists;
- the artifact is ready for human/release review.

It does not mutate Question Bank V2, rollout config, or remote balance.

## Operator command

A provider-neutral offline command is exposed:

npm run recalibrate:telemetry -- --telemetry telemetry-export.json --out recalibration-proposal.json

The input file may contain:

- events;
- existing itemCalibrations;
- current policyWeights;
- currentBalance;
- balanceTargets;
- recalibration options.

The output is a review artifact only.

## Recommended production flow

A future backend/analytics job should:

1. export only trusted authoritative non-identifying telemetry;
2. run the recalibrator on a fixed evidence window;
3. inspect rejection rate and sample coverage;
4. review item/policy/balance proposals;
5. run full CI/balance simulations;
6. publish accepted configuration as a new explicit version;
7. deploy through Step 18 cohorts/shadow mode;
8. monitor Step 20 diagnostics and authoritative outcome telemetry;
9. use kill switches if regressions appear;
10. feed the next evidence window into the next recalibration cycle.

This keeps the loop measurable, reversible and bounded.

## Scope boundary

Step 22 does not:

- automatically publish question calibrations;
- automatically change QuestionPolicy weights;
- automatically update remote balance;
- infer product targets;
- trust client diagnostics as learning evidence;
- collect personal identifiers;
- train an unrestricted model over raw player data.

It generates statistically supported, gate-checked proposals for explicit review and controlled rollout.
