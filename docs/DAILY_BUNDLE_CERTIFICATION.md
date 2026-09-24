
# Daily Bundle Generation + Certification — Steps 14 and 15

Steps 14 and 15 create the immutable Daily artifact that later scheduling and activation systems can publish without regenerating content.

## Source lineage

### Purdle

Commit:

1678a1ec7d4b9a21e065c9b27a5fa233332210cf

Primary paths:

- scripts/generate_puzzle.py
- .github/workflows/daily-puzzle.yml

The Purdle contribution is the operational rule that Daily content should degrade gracefully. Optional model/services may improve generation, but a deterministic fallback must still be able to produce a valid date-specific artifact.

### Neon Vector Defense

Commit:

48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4

Primary path:

- src/game/dailyChallenge.ts

The Neon contribution is the explicit compatibility layer. Daily modifiers are not assumed to compose safely; incompatible combinations are detected and corrected/rejected before release.

## Step 14 — Daily Bundle factory

generateDailyBundleArtifact() produces a self-contained generated artifact for one YYYY-MM-DD date.

The date deterministically produces the Daily seed.

The artifact freezes:

- Daily ID/date/seed;
- deterministic engine version;
- Daily generator version;
- exact Question Bank snapshot;
- exact published question refs;
- exact frozen QuestionVersion content for every selected question;
- node-to-question bindings;
- exact balance config snapshot + hash;
- deterministic certified level;
- solution certificate;
- generator/fallback metadata;
- artifact manifest hash.

### Question selection

The factory optionally accepts a primary questionSelector.

If no selector is supplied, it uses the deterministic role-compatible fallback.

If the primary selector throws, returns no bindings, returns an incomplete/duplicate/wrong-slot binding set, or returns bindings that cannot be resolved to exact QuestionVersion hashes, the factory falls back to deterministic selection.

The fallback:

- uses only published refs from the frozen Question Bank snapshot;
- never repeats a question ID within the Daily;
- prefers the role expected by each level question slot;
- uses deterministic seeded rotation to avoid one fixed static Daily set.

### Level fallback

The preferred level uses the requested grid.

If that grid cannot contain the configured certified route, the factory chooses a deterministic safe square grid large enough for all required + optional nodes and reruns solution-first generation.

A fallback is recorded in generator metadata; it is not hidden.

### Balance freeze

The exact resolved balance config is embedded into balanceSnapshot and hashed.

The canonical DailyBundle records the balance version.

An identity balance is represented as identity-v1 so the bundle never depends on an empty version field.

## Step 15 — independent Daily certification

inspectDailyBundleArtifact() independently checks the generated artifact.

Certification verifies:

1. artifact schema and lifecycle state;
2. date-derived seed;
3. Daily ID/date;
4. generator/engine versions;
5. reconstructable canonical DailyBundle hash;
6. reconstructable artifact manifest hash;
7. solution-first level certificate;
8. bundle certificate copy matches the level certificate;
9. every frozen QuestionVersion reconstructs its exact content hash;
10. frozen Question Bank snapshot hash;
11. Daily question refs are inside the frozen snapshot;
12. bundle/questionSet/binding refs are identical and ordered;
13. every question slot has exactly one compatible binding;
14. duplicate exact question refs are rejected;
15. frozen balance snapshot hash/version;
16. balance structure matches the generated level;
17. unresolved balance clamp diagnostics are rejected;
18. declarative capability/modifier rules;
19. optional cross-check against the source Question Bank.

certifyDailyBundleArtifact() only returns a certified artifact when all checks pass.

It then rebuilds the canonical DailyBundle with:

compatibility.ok = true

and regenerates the Daily manifest hash.

## Declarative compatibility constraints

The Daily spec can declare:

- availableCapabilities;
- requiredCapabilities;
- requiresRecoveryNode;
- maxQuestionDifficulty;
- modifiers.

A modifier may declare:

- requiresCapabilities;
- forbidsCapabilities;
- forbidsRoles;
- requiresAnyRole;
- maxQuestionDifficulty.

This gives later LiveOps work a generic compatibility framework instead of hardcoding each future event directly into the Daily generator.

## Question-role compatibility

Solution-first level slots use role hints such as practice, review, transfer and challenge.

Certification accepts only compatible content for each slot.

For example:

- transfer slots accept transfer or diagnose;
- challenge slots accept transfer, diagnose or review;
- practice slots accept practice, review or diagnose.

A generated fallback is not allowed to ignore this rule.

## Publication boundary

assertDailyPublishable() rejects any artifact that is not already certified.

Later scheduling/activation steps should only accept artifacts that pass this boundary.

Generation, certification and publication remain separate operations.

## Current scope

Steps 14 and 15 do not:

- schedule the Daily;
- activate it for players;
- send notifications;
- replace the current Quest UI;
- persist the artifact to a backend.

They produce the immutable, certified release object those later systems can safely activate.
