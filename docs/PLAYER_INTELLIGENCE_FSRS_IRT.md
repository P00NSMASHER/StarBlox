
# Player Intelligence — Steps 10 and 11

Steps 10 and 11 add two independent intelligence layers that later selection policy can combine.

## Step 10 — FSRS-compatible concept memory

Source lineage:

- ankitects/anki
- commit: 2ef2f7cac9673b697c4b9924a4135bfcbe3269b4
- rslib/src/scheduler/fsrs/memory_state.rs
- rslib/src/scheduler/fsrs/simulator.rs
- rslib/src/scheduler/fsrs/retention.rs

StarBlox now maintains the same core memory-state concepts used by FSRS:

- difficulty
- stability
- retrievability
- exposures
- lapses
- last review time

The persisted shape uses the canonical PlayerConceptState established in Step 1.

### Stability interpretation

StarBlox v1 defines stability as the number of elapsed days at which predicted retrievability reaches 90%.

The compatibility curve is:

R(t) = 1 / (1 + t / (9 * S))

So R(S) = 0.9.

This lets the system answer useful production questions immediately:

- how likely is this concept to be remembered now?
- when does it cross the desired-retention threshold?
- which concepts have the highest memory need?
- how should a lapse alter priority?

### Review updates

Successful recall:

- slightly lowers estimated memory difficulty;
- increases stability;
- gives a larger stability gain when recall happened after meaningful forgetting.

Failure:

- increments lapses;
- raises memory difficulty;
- sharply reduces stability without erasing all prior learning.

This is intentionally a **versioned FSRS-compatible adapter**, not a claim that these local coefficients are Anki's current fitted FSRS parameter vector.

Anki delegates state updates to the external FSRS engine and can fit user-specific parameters. StarBlox preserves D/S/R state in a compatible shape so an exact parameter-fitted engine can replace the v1 coefficients later without a persistence migration.

## Step 11 — 2PL IRT ability and question difficulty

Source lineage:

- woodstocksoftware/adaptive-question-selector
- commit: 4e3dc17bc98d8b777f3c5fc46302047283620e97
- src/irt.py
- src/server.py

The JavaScript engine implements the same 2-parameter logistic model:

P(correct | theta) = 1 / (1 + exp(-a * (theta - b)))

Where:

- theta = player ability
- b = item difficulty
- a = item discrimination

### Question priors

Question Bank V2 authored difficulty maps onto the IRT scale as:

- 1 -> -2
- 2 -> -1
- 3 -> 0
- 4 -> +1
- 5 -> +2

Discrimination begins at 1.0 unless a calibrated value exists.

### Ability estimation

The upstream Python implementation uses bounded scalar optimization.

StarBlox performs dependency-free Newton MAP updates with a weak zero-centered prior and keeps the same edge guards:

- no responses -> theta 0, SE 1
- all correct -> estimate above the hardest administered item
- all wrong -> estimate below the easiest administered item

Standard error is derived from total Fisher information.

### Candidate metrics

The engine exposes:

- probability correct
- Fisher information
- ability-fit score
- maximum-information selection
- target-50-percent selection

Step 12 can use these signals without changing the underlying IRT implementation.

### Online item calibration

Question difficulty and discrimination can be conservatively nudged from real response telemetry using the 2PL log-likelihood gradients with shrinkage toward the authored priors.

This means early data cannot immediately overpower authored difficulty, while repeated surprising responses can gradually correct a bad prior.

## Why FSRS and IRT remain separate

They answer different questions.

FSRS-like memory state answers:

> What concept is becoming forgettable?

IRT answers:

> At what difficulty level is this player currently performing, and which item is most informative?

The next policy layer can combine them while preserving independent state, testing and calibration.

## Scope boundary

Steps 10 and 11 do not:

- change the live Quest selector;
- use entropy/information gain across misconception states yet;
- publish learner labels to the UI;
- make high-stakes assessment claims;
- fit Anki FSRS parameter vectors from production history.

They establish the memory and ability primitives only.
