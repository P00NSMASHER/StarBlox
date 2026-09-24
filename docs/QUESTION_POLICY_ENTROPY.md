
# Entropy Selection + Unified QuestionPolicy — Steps 12 and 13

Steps 12 and 13 complete the first version of StarBlox's question-selection intelligence stack.

## Step 12 — entropy-based question choice

Source lineage:

- repository: neeraj5050/apl-26
- commit: 6de2027f052aa7d95a691e86c30ef12e46bd58d3
- aki-cricket/lib/engine/entropy.ts
- aki-cricket/lib/engine/questions.ts

The upstream system chooses questions that split candidate hypotheses using Shannon entropy, supports answer-driven question invalidation, applies category weights, and preserves safe fallbacks.

StarBlox generalizes that approach from "which cricket player is it?" to "which latent knowledge state best explains this learner?"

### Generic hypothesis information gain

expectedInformationGain() accepts weighted latent hypotheses and a question-specific probability of a positive/correct response.

It computes:

- prior hypothesis entropy;
- predicted response probability;
- correct-answer posterior entropy;
- incorrect-answer posterior entropy;
- expected posterior entropy;
- information gain.

A question that produces the same response probability under every hypothesis has near-zero information gain. A question whose answer strongly separates hypotheses has high information gain.

### Concept knowledge hypotheses

buildConceptKnowledgeHypotheses() converts a concept's FSRS D/S/R state into three internal hypotheses:

- remembered;
- fragile;
- not-retrievable.

These are internal statistical states, not labels shown to players.

Unseen concepts start deliberately uncertain. Seen concepts use current FSRS retrievability to set the hypothesis weights.

conceptInformationGain() therefore answers:

> If StarBlox asks a good question about this concept now, how much can the result reduce uncertainty about the learner's knowledge state?

This signal differs from FSRS memory need.

- FSRS memory need rises when recall is predicted to be weak.
- Entropy information gain rises when the state is uncertain and an answer would be diagnostically useful.

### Dependency invalidation

invalidatedQuestionIds() and selectEntropyQuestion() retain the upstream answer-driven invalidation pattern.

A question can declare that a particular answer makes downstream questions irrelevant. Invalidated and already-asked questions are removed before entropy ranking.

## Step 13 — unified QuestionPolicy

questionPolicy.js combines the independently tested signals from Steps 10–12.

For each exact Question Bank V2 ref, it calculates:

### FSRS signal

memory

Maximum memory-need score across the concepts the question covers.

Unseen concepts use a controlled introduction score rather than automatically dominating review content.

### IRT signal

irt

A combination of:

- ability-fit score;
- normalized Fisher information.

This prefers questions that are appropriately difficult and useful for refining ability estimates.

### Entropy signal

entropy

Average concept-level diagnostic information gain.

This rewards questions whose outcomes can resolve uncertainty about the learner's current knowledge state.

### Novelty signal

novelty

Penalizes recently used questions and concepts.

An exact recent question is removed entirely when another eligible candidate exists. If the pool is exhausted, the policy can fall back rather than dead-end.

### Gameplay signal

gameplay

A game-design layer above the statistics.

It supports:

- soft role hints;
- hard subject/district/skill/role filters;
- strict concept targeting;
- boss-phase preferences;
- recovery-phase preferences.

A role hint is intentionally soft. If gameplay absolutely requires a role, callers use the hard roles filter.

### Quality signal

quality

A hook for validated question-quality metadata. Existing published bank questions default to full confidence.

## Combined priority

Signals are combined with a weighted geometric score.

Default weights:

- memory: 0.28
- IRT: 0.24
- entropy: 0.18
- novelty: 0.12
- gameplay: 0.12
- quality: 0.06

The geometric form ensures a question cannot compensate for being terrible on one dimension simply by being excellent on another.

The weights are normalized at runtime and are explicit policy inputs, so later experiments can vary them without changing the underlying FSRS, IRT, or entropy implementations.

## Frustration/recovery guard

Pure statistical optimization can produce bad gameplay.

After two consecutive wrong answers, the policy activates a recovery guard unless the caller disables it or the player is in a boss phase.

The recovery pool prefers:

- predicted success probability between 55% and 92%;
- practice, review, or diagnostic roles.

If no such candidate exists, the policy falls back to the broader eligible pool rather than failing.

## Determinism and explainability

rankQuestionsWithPolicy() is deterministic for the same:

- Question Bank snapshot;
- player memory state;
- IRT ability/calibration state;
- recent-history inputs;
- game context;
- policy weights;
- timestamp.

Each ranked question carries:

- final score;
- probability correct;
- retrievability;
- individual normalized signals;
- memory-need score;
- entropy information signal;
- ability fit;
- Fisher information;
- novelty;
- gameplay fit;
- quality confidence;
- IRT difficulty/discrimination.

This makes policy decisions inspectable in tests, telemetry, admin tooling, and future shadow-mode comparisons.

## Scope boundary

Steps 12 and 13 do not yet:

- replace the current live Quest selector;
- persist FSRS/IRT state to a backend;
- run player-facing experiments;
- bind QuestionPolicy into DailyBundles.

The policy is now ready for shadow evaluation and later controlled rollout without changing current player behavior.
