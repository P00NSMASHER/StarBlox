# Replay codec and deterministic re-simulation

Step 3 builds the transport/integrity/reconstruction layer on top of the Step 2 deterministic simulation core.

## Source lineage

Directly adapted from the cleared Neon Vector Defense replay stack at commit:

`48ecf31509d73dd8fb2c5f25f1fc57cfa6d03eb4`

Primary upstream paths:

- `src/game/replayCodec.ts`
- `src/game/reSimulate.ts`
- `functions/src/replayIntegrity.ts`

## Replay action stream

StarBlox records only gameplay actions needed to reconstruct deterministic state.

Each replay entry contains:

- fixed simulation tick;
- insertion sequence;
- JSON-compatible action.

The `starblox-r1` codec:

- delta-encodes simulation ticks with the same compact 64-character varint approach as Neon;
- stores a small action-type table;
- stores canonical JSON action payloads;
- chunks at a maximum of 650 actions per pack;
- hashes the root/chunk packs as one integrity unit.

The codec deliberately does not encode rendering/UI events.

## Integrity before simulation

A replay recording has two complementary integrity layers.

The canonical `ReplayManifest` from Step 1 binds:

- replay ID;
- engine version;
- seed;
- trusted initial-state hash;
- codec;
- total action count;
- action hash;
- summary hash;
- creation time.

The action manifest binds:

- complete=true;
- exact chunk event counts;
- the same action hash.

Missing chunks, reordered chunks, mismatched counts, malformed packs, or action-hash changes are **unverifiable**.

## Re-simulation verdicts

`reSimulateReplay()` has three verdicts.

### verified

The recording is structurally complete and re-running its action stream from the caller-supplied trusted initial state produces:

- the exact final deterministic state hash; and
- the exact summary hash when a summary builder is supplied.

### divergent

The recording is structurally coherent, but deterministic execution does not reproduce the recorded result.

Examples:

- a coherently re-packed action was changed;
- an action is rejected by current deterministic rules;
- final state or summary differs.

Divergent is a technical signal. Step 3 does not make policy claims about intent or cheating.

### unverifiable

There is no safe basis to compare the run.

Examples:

- action/manifest corruption;
- missing chunk;
- engine-version mismatch;
- trusted setup mismatch;
- unsupported tick rate;
- wall-clock budget exhausted;
- simulation tick cap exceeded.

A timeout is never labeled divergent.

## Server-safe boundary

The re-simulation module has no React, DOM, localStorage or network dependencies. A future server endpoint can import the same reducer and replay machinery.

The caller supplies the **trusted** initial state. The verifier never accepts a replay-supplied initial state as authoritative.

This is the boundary Step 4 will use for server-authoritative scoring.

## Scope boundary

Step 3 does not yet:

- define StarBlox production gameplay actions;
- trust or score client submissions;
- deploy a backend endpoint;
- make leaderboard/anti-cheat decisions;
- change the current Quest UI.

Those belong to later approval-gated steps.
