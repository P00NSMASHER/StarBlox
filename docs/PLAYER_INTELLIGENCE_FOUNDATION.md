
# Player Intelligence Foundation — Steps 10 and 11

Steps 10 and 11 add two complementary learner models.

- FSRS answers: **what knowledge is becoming forgettable?**
- IRT answers: **what difficulty level is appropriate and informative?**

Neither model changes live Quest selection yet. Step 12 will combine them with entropy/information policy.

## Step 10 — FSRS concept memory

### Source lineage

Anki commit:

2ef2f7cac9673b697c4b9924a4135bfcbe3269b4

Relevant paths:

- rslib/src/scheduler/fsrs/memory_state.rs
- rslib/src/scheduler/fsrs/retention.rs
- rslib/src/scheduler/fsrs/simulator.rs

Anki delegates the mathematical model to fsrs-rs. The exact FSRS-6 equations/default parameters used here are pinned from:

open-spaced-repetition/fsrs-rs
commit c137ee6e096f9217632397a8fb2bdb6f6e1b92ae

Relevant paths:

- src/model_v6.rs
- src/inference.rs
- src/inference_v6.rs
- src/simulation.rs

### Memory state

StarBlox uses the existing canonical PlayerConceptState fields:

- fsrsDifficulty
- stability
- retrievability
- exposures
- lapses
- lastSeenAt
- updatedAt

The model is concept-level, not question-level. Multiple questions can provide evidence for the same concept.

### Ratings

Initial mapping:

- incorrect first/retry response → Again (1)
- correct guided retry → Hard (2)
- correct independent answer → Good (3)
- explicitly fluent independent answer → Easy (4)

This mapping is policy and can later be refined without changing the FSRS math.

### Exact FSRS-6 invariants

The implementation ports:

- default 21 FSRS-6 parameters;
- initial stability/difficulty;
- retrievability forgetting curve;
- success/failure/short-term stability transitions;
- difficulty mean reversion;
- desired-retention interval solving.

For FSRS-6, stability is S90: after exactly stability days, retrievability is 0.9.

## Step 11 — 2PL IRT ability + item calibration

### Source lineage

Repository:

woodstocksoftware/adaptive-question-selector
commit 4e3dc17bc98d8b777f3c5fc46302047283620e97

Relevant paths:

- src/irt.py
- tests/test_irt.py

### 2PL model

The model is:

P(correct | theta) = 1 / (1 + exp(-a(theta - b)))

where:

- theta = player ability
- b = item difficulty
- a = item discrimination

Fisher information is:

a^2 * P * (1 - P)

### Ability estimation

The implementation follows the upstream behavior:

- no responses → theta 0, SE 1;
- all correct → bounded heuristic above the hardest administered item;
- all incorrect → bounded heuristic below the easiest administered item;
- mixed responses → bounded maximum-likelihood search with the same weak theta prior;
- standard error → inverse square root of total Fisher information.

### Question priors

Existing StarBlox difficulty 1..5 maps initially to IRT difficulty -2..2:

- 1 → -2
- 2 → -1
- 3 → 0
- 4 → 1
- 5 → 2

Initial discrimination is 1.0.

Every calibration record is pinned to exact question ID, QuestionVersion, and content hash. A future revision therefore receives a new calibration identity instead of silently inheriting stale item parameters.

### Online calibration

updateItemCalibration performs a bounded stochastic likelihood update.

- unexpected correct answers move the item easier;
- unexpected incorrect answers move the item harder;
- discrimination receives a much smaller regularized update;
- b remains within -3..3;
- a remains within 0.1..3.

This is intentionally conservative until production response counts are large enough for more sophisticated batch calibration.

## Scope boundary

Steps 10–11 do not yet:

- choose the next live StarBlox question;
- replace existing mastery rules;
- infer ability from retries as independent evidence;
- persist learner models to a backend;
- expose ability labels to children.

The models remain internal signals for the unified selection policy built next.
