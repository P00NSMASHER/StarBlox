# Roblox Intelligence Shadow Services — Step 4

Step 4 moves the latency-sensitive StarBlox learning intelligence into Roblox server-side Luau while keeping the live selector on the existing control path.

## What runs inside Roblox

The Roblox runtime now contains ports of:

- FSRS-compatible retrievability;
- memory-need scoring;
- authored difficulty -> IRT prior mapping;
- 2PL probability of correctness;
- Fisher information;
- ability-fit scoring;
- concept information gain;
- the six-signal QuestionPolicy;
- recent-question cooldown;
- repeated-wrong-answer recovery guard.

The default policy weights remain:

- memory 0.28
- IRT 0.24
- entropy 0.18
- novelty 0.12
- gameplay 0.12
- quality 0.06

## Exact question identity

The JavaScript bridge exports only current published exact QuestionVersion identities into the Roblox shadow candidate set:

- questionId;
- version;
- contentHash;
- subject/district/skill/role;
- concept IDs;
- authored difficulty;
- current IRT calibration;
- quality confidence.

Prompt, answer, choices, explanation and hint are deliberately excluded from the shadow-selector payload.

The authoritative server question/scoring service can keep the full content separately.

## Shadow-only contract

IntelligenceShadowService receives:

- the control selector's chosen question;
- exact candidate refs;
- player concept memory state;
- current IRT theta;
- recent-question/concept history;
- wrong streak;
- game context;
- explicit current timestamp.

It computes the experimental ranking and produces comparison telemetry, but always returns:

authoritative = control

and:

selectedQuestionId = controlQuestionId

This means the Roblox port cannot change player behavior merely because it exists.

A later Step 18 rollout decision must explicitly permit experimental use at the actual callsite before a selector result can become authoritative.

## What stays offline

These existing StarBlox capabilities remain outside the hot Roblox request path:

- offline AI question generation;
- evidence/review/dedup validation;
- Question Bank authoring lifecycle;
- Daily generation and certification;
- Daily release/scheduling control plane;
- balance gates;
- feature-rollout configuration authoring;
- telemetry-driven recalibration.

Roblox consumes versioned artifacts produced by those systems instead of recreating their administrative logic in-game.

## Conformance

A Studio-runnable ModuleScript spec is included under:

ServerScriptService/StarBlox/Tests/IntelligenceConformance.spec

It verifies representative invariants:

- authored difficulty 3 maps to IRT difficulty 0;
- theta == item difficulty produces 50% predicted correctness;
- one stability interval produces 90% retrievability;
- an ability-matched item outranks a much harder item in a controlled fixture.

The Step 2 Studio test runner can execute this after the Roblox project is connected.

Node tests additionally verify:

- exact published question hashes are exported;
- prompt/answer/choices are absent from shadow payloads;
- durable Roblox profile state maps into the shadow contract;
- Luau constants/formulas remain pinned to the JavaScript versions;
- the service cannot become authoritative in shadow mode.

## Scope boundary

Step 4 does not yet replace the current Quest selector.

It establishes a low-latency Roblox implementation suitable for shadow comparisons and later controlled rollout.
