# Schoolwork Evidence Hierarchy — Block 4

Block 4 gives privacy-safe schoolwork evidence a bounded role in question priority.

## Source hierarchy

The sanitized observation may carry one abstract source class:

1. `teacher-marked-schoolwork` — strongest;
2. `completed-schoolwork` — medium;
3. `ungraded-schoolwork` — weakest.

This is only a source-strength label. No teacher comment, checkmark, written correction, grade, score, or raw worksheet content is stored.

## Priority behavior

The schoolwork evidence pressure combines:

- likely-error rate when correctness is actually known;
- repeated exposure/attempt evidence;
- confidence;
- source strength.

The result is clamped to `0..1` and multiplied by a bounded runtime weight.

Policy constants:

- schoolwork evidence weight: **0.42**;
- teacher-marked multiplier: **1.00**;
- completed-schoolwork multiplier: **0.65**;
- ungraded-schoolwork multiplier: **0.35**;
- correctness/error share: **0.75**;
- exposure/presence share: **0.25**;
- full attempt-pressure target: **3 observations**.

A high-confidence teacher-marked likely miss can therefore outrank one ordinary in-game miss. A correct item or an item with unknown correctness contributes mainly a small current-material/presence signal.

## Not a diagnosis

Schoolwork evidence is used only to rank which skill should receive practice sooner. It does not:

- write to `MasteredSkills`;
- mutate `SkillStats`;
- change spaced-mastery stage directly;
- lower adaptive difficulty directly;
- create a diagnosis or permanent weakness label;
- replicate private evidence to clients.

One mistake is capped and remains reversible as newer evidence arrives.

## Current legacy batch

The September 26 photo batch is classified as `teacher-marked-schoolwork`, but its earlier sanitized source pack did not preserve per-item correctness. Therefore its 12 observations remain:

- attempted: yes;
- likely correct/incorrect: unknown;
- confidence: 0.5.

The current batch receives stronger **source** standing without fabricating mistakes.

## Future photo batches

Structured intake can include:

```json
{
  "generatorKey": "reading-setting",
  "confidence": 0.94,
  "attempted": true,
  "likelyCorrect": false,
  "evidenceClass": "teacher-marked-schoolwork"
}
```

Only the abstract booleans/classification survive. Raw worksheet/teacher content remains outside the source pack and runtime evidence.
