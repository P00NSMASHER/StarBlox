# Deterministic simulation core

Step 2 establishes the deterministic kernel that future StarBlox gameplay, bots, replay playback and server verification will share.

## Source lineage

The implementation directly adapts the deterministic-engine patterns from:

- repository: `Calculator5329/neon-vector-defense`
- commit: `48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4`
- primary source: `src/game/engine.ts`

The project owner has confirmed direct reuse rights. The local implementation intentionally extracts the engine invariants rather than tower-defense domain rules.

## Invariants

### One seeded gameplay random stream

Simulation code receives randomness from the engine's Mulberry32 instance. It must not call `Math.random()` for gameplay-affecting behavior.

Cosmetic-only rendering may use nondeterministic randomness if it never enters canonical simulation state.

### Per-simulation entity IDs

Entity IDs start at 1 for each simulation instance. Module-global counters are forbidden because they make an otherwise identical run depend on what happened previously in the JavaScript process.

### Fixed timestep

Game rules advance only through fixed ticks. The default is 60Hz.

The rendering adapter accumulates elapsed frame time and converts it into whole simulation ticks. It never forwards a variable frame `dt` into game rules.

Authoritative replay/server work should use `advanceTicks()`, not wall-clock frame timing.

### Action boundary

Actions are assigned a simulation tick and an insertion sequence.

For a tick:

1. scheduled actions are applied in insertion order;
2. the fixed tick update runs;
3. the simulation tick advances.

No action may be scheduled in the past.

### Deterministic state identity

`stateHash()` binds:

- engine version;
- seed;
- simulation tick;
- PRNG state;
- next entity ID;
- canonical game state.

A future replay verifier can therefore distinguish a true gameplay divergence from a replay recorded under a different engine version.

## Reducer contract

`DeterministicSimulation` is domain-neutral. A gameplay reducer receives:

`(state, event, context)`

The reducer may mutate `state` in place or return a replacement state.

The context owns deterministic side effects:

- `random()`
- `randomInt(min,max)`
- `nextEntityId()`
- fixed `dt`
- current tick/time
- seed and engine version

This keeps future StarBlox gameplay rules testable without importing rendering, React, browser storage or network code.

## Scope boundary

Step 2 does **not** implement:

- replay encoding;
- action compression;
- server re-simulation;
- anti-cheat verification;
- procedural level rules;
- StarBlox UI integration.

Those build on this kernel in later approved steps.
