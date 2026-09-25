# Brookhaven Research — Step 10 of 12: Progression / Reward Integration Shadow

Status: **COMPLETE — hardened read-only progression shadow; runtime remains not wired live**

Step 10 is complete at the research boundary.

## Core shadow runtime

The existing StarBlox progression shadow runtime remains unchanged:

- `docs/preproduction/brookhaven-research/life-sim-progression-blueprint-v1.json`
- `src/lifeSimProgressionShadowRuntime.js`
- `src/lifeSimProgressionShadowRuntime.test.js`

It consumes only four existing StarBlox progression signals:

- completed Quests (`questsCompleted`);
- Stars (`stars`);
- lifetime Star Worth (`starWorth`);
- unique mastered-skill count (`masteredCount`).

It derives candidate unlock state for 42 targets:

- 14 residential features;
- 13 current vehicles;
- 15 player-facing town locations.

The thresholds are original StarBlox research design and are not claims about source-game progression or economy.

## Hardened neutral rule layer

Step 10 now includes a closed neutral progression-rule contract:

- `docs/preproduction/brookhaven-research/neutral-progression-rule-schema-v1.json`
- `docs/preproduction/brookhaven-research/neutral-progression-rule-catalog-v1.json`
- `src/neutralProgressionRuleCatalog.js`
- `src/neutralProgressionRuleCatalog.test.js`

The catalog contains exactly 42 deterministic rules with the exact 14/13/15 target split.

The loader returns an independent deeply frozen snapshot and fails closed on:

- unsupported metrics such as Coins;
- negative or non-finite thresholds;
- duplicate rule targets;
- duplicate criterion metrics;
- unknown targets;
- the two research-deferred town locations;
- source progression/economy parity claims;
- any save/economy/reward mutation flag;
- open-contract fields.

## Read-only evaluator and parity proof

The final Step 10 hardening layer is:

- `src/neutralProgressionRuntimePreview.js`
- `src/neutralProgressionRuntimePreview.test.js`

This evaluator independently reproduces the current shadow math without importing `lifeSimProgressionShadowRuntime.js` or the residential, vehicle, or town runtimes.

Parity tests prove:

- exact 42-rule target/threshold parity;
- identical progression metrics;
- identical per-target unlock and progress calculations;
- identical unlocked counts;
- identical next-unlock guidance;
- identical zero economy mutation;
- identical behavior across baseline, early, advanced, and malformed input saves.

The preview is deeply frozen and read-only.

## Economy and persistence boundary

The hardened Step 10 contract may read existing progression state, but it does **not**:

- write the existing save;
- award or deduct Coins;
- award Stars;
- change Star Worth;
- change XP;
- change mastery;
- change Quest rewards;
- introduce a second economy;
- mutate persistence.

Both source-progression parity and source-economy parity are explicitly false.

## Town target boundary

Only the 15 player-facing Step 9 town locations may appear in progression rules.

The two deferred locations remain excluded:

- `mystery-zone`
- `restricted-zone`

## Completion receipt

Machine-readable completion proof:

- `docs/preproduction/brookhaven-research/step-10-progression-completion-v2.json`

The Brookhaven research validator independently enforces the rule schema, exact blueprint parity, valid target registries, mutation boundary, deferred-town exclusion, artifact isolation, and completion receipt.

## Live-product boundary

Step 10 completion does **not** authorize or perform live integration.

There is no live `App.jsx` wiring, no persistence mutation, no economy/reward mutation, no networking change, and no deployment.
