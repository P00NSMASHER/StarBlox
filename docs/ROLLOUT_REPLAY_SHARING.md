
# Controlled Rollout + Replay Ghost Sharing — Steps 18 and 19

Steps 18 and 19 add two independent production-facing capabilities while preserving the current player experience by default.

## Step 18 — deterministic cohorts and kill switches

Source lineage:

- getsentry/sentry
- commit: 67610b2a57909ca921d6a52dcbf7410bc851b100
- src/sentry/utils/rollout.py
- src/sentry/killswitches.py
- src/sentry/features/temporary.py

The Sentry rollout pattern is preserved conceptually:

1. keep a trusted control path;
2. evaluate an experimental path in shadow;
3. compare control and experimental behavior;
4. explicitly authorize experimental use only after confidence is earned;
5. retain immediate kill switches and callsite blocklists.

StarBlox makes cohort selection deterministic rather than random.

### Deterministic cohorts

deterministicCohortBucket() hashes:

- feature ID;
- stable subject/player ID;
- rollout salt.

The result is a stable bucket in 0..9999.

The same player stays in the same cohort across workers, sessions and devices as long as the rollout salt remains unchanged.

A feature has separate percentages for:

- evaluatePercent — run the experimental path;
- usePercent — actually use the experimental result.

usePercent is always bounded by evaluatePercent.

This creates three modes:

- control — experimental path is not evaluated;
- shadow — both paths run, but control remains authoritative;
- experimental — both paths run and the experimental value may be used.

### Callsite control

A feature can:

- block specific callsites from evaluation;
- permit experimental use only at explicitly approved callsites;
- explicitly allow individual subjects.

This allows, for example, QuestionPolicy V2 to run in shadow in live Quests while being fully enabled first in a Daily factory or internal simulation.

### Kill-switch precedence

The evaluation order is intentionally fail-safe:

1. invalid rollout configuration -> control;
2. global kill switch -> killed;
3. contextual kill switch -> killed;
4. feature kill switch -> killed;
5. subject/callsite blocklists -> control;
6. allowlist/cohort decision.

Contextual kill switches can match fields such as platform, build, region or other caller-supplied operational context.

A kill switch always overrides cohort membership and explicit allowlists.

### Safe branch evaluation

runSafeRollout() always computes the trusted control result.

If the decision permits evaluation, it also runs the experimental branch.

- shadow mode returns control;
- experimental mode returns experimental;
- an experimental exception always falls back to control.

Comparison metadata records exact/reasonable match status. Payload values remain omitted unless a caller deliberately supplies a serializer.

This follows Sentry's separation between comparing experimental behavior and deciding when it becomes a source of truth.

## Step 19 — replay ghosts and shareable challenges

Source lineage:

- Calculator5329/neon-vector-defense
- commit: 48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4
- src/game/replayReconstruct.ts
- src/DossierShare.tsx
- src/game/dossier.ts

StarBlox already had deterministic replay recording and server-safe re-simulation from Steps 2–4.

Step 19 turns that recording into two reusable social/gameplay artifacts.

### Ghost tracks

createGhostTrack() derives a read-only timeline from the exact replay action stream.

A ghost freezes:

- source replay ID;
- replay manifest hash;
- engine version;
- seed;
- tick rate;
- final tick;
- ordered tick-addressed gameplay actions;
- deterministic ghost track hash.

The ghost does not invent intermediate state that was never recorded.

ghostActionsBetween() exposes actions in a tick window.

ghostCursorAtTick() exposes:

- number of completed actions;
- next recorded action;
- timeline progress;
- terminal status.

A future renderer can use these primitives to draw a translucent rival path or action overlay without affecting the authoritative simulation.

### Shareable challenge packages

createShareableChallenge() builds a self-contained package around an exact source replay.

It freezes:

- challenge ID/version;
- exact replay setup identity;
- source action/final-state hashes;
- optional benchmark summary;
- optional frozen Daily release identity;
- full replay recording;
- full ghost track;
- deterministic challenge hash.

The package can be serialized as stable JSON with serializeShareableChallenge() and restored with parseShareableChallenge().

This makes a challenge portable as a file/blob/text artifact even before StarBlox has selected a social-sharing backend.

### Challenger verification

A challenger does **not** need to reproduce the source player's action stream.

verifyShareableChallengeAttempt() requires the challenger replay to use the exact same:

- engine version;
- seed;
- trusted initial-state hash;
- tick rate.

The challenger replay is then independently re-simulated through the Step 3 verifier.

Only a verified replay produces an attempt summary suitable for comparison with the source benchmark.

This means a shared challenge cannot make a client-reported score authoritative.

### Daily release binding

A challenge may carry the exact immutable Daily release identity:

- release ID;
- date;
- artifact hash;
- manifest hash;
- bundle hash.

When a release registry is supplied, validation checks that identity against the frozen registry.

This prevents a link/package from silently changing which Daily configuration it refers to.

## Integrity vs authenticity

stableHash uses the project-wide FNV identity hash.

It is useful for deterministic identity, drift detection and corruption detection.

It is **not a cryptographic signature** and must not be treated as proof that a package originated from a trusted server.

For ranked/public competition, the backend must still:

1. resolve trusted challenge/release data;
2. authenticate the player;
3. independently validate/re-simulate the submitted replay;
4. apply server-authoritative scoring.

## Current rollout state

No live feature is enabled by this step.

The rollout configuration defaults to no exposure unless explicitly configured.

The replay ghost/share modules are domain primitives only; the current Quest UI is unchanged.

## Scope boundary

Steps 18 and 19 do not:

- enable QuestionPolicy V2 for live players;
- publish a remote feature-flag service;
- upload shared challenges to a backend;
- render ghosts in the current game UI;
- create public leaderboards;
- cryptographically sign challenge packages.

They establish the controlled rollout and replay-sharing foundations for later integration.
