# Solution-first level generation

Step 5 gives StarBlox a procedural-generation rule that can be stated simply:

> Build a winning route first. Build the visible level around it second. Ship only if the route still verifies.

## Source lineage

Directly adapted from the cleared Fruit Box generator:

- repository: `weizixiao/fruit-box-game`
- commit: `de7b1f59bff021d76f5138af17bed37220f7783e`
- generator: `engine.js`
- generator proof tests: `tests/engine.test.mjs`
- algorithm notes: `docs/ALGORITHM.md`

Fruit Box first generates groups that are known to sum to the target, places those groups into a board, retains the complete solution trail, and then proves in tests that every certified step clears the full board.

StarBlox applies the same philosophy to quest-level structure.

## Generation order

`generateCertifiedQuestLevel()` performs these conceptual phases.

### 1. Create the winning plan

Before any visual coordinates exist, the generator creates:

`start -> challenge-1 -> ... -> challenge-N -> boss`

Each challenge grants one Spark. The boss requires all `N` Sparks.

This means the generator knows what a valid completion looks like before presentation/layout randomness begins.

### 2. Place the winning path

The required route is embedded into a grid as a simple orthogonally-adjacent path using deterministic seeded search/backtracking.

The route never relies on accidental geometric adjacency: explicit solution edges are recorded between consecutive required nodes.

### 3. Add optional content

Only after the winning path exists does the generator add optional recovery/bonus nodes.

Optional nodes are attached to already reachable cells but are not inserted into the certified winning path, so decoration cannot invalidate the required route.

### 4. Produce the certificate

The solution certificate stores:

- exact ordered winning path;
- expected final Spark count;
- boss completion identity;
- deterministic certificate hash.

### 5. Verify before returning

Generation is considered failed unless `verifySolutionCertificate()` proves:

- unique valid coordinates;
- all required nodes occur in the certificate;
- no certificate node repeats;
- every consecutive path node is grid-adjacent;
- every solution edge exists;
- prerequisites are satisfied in order;
- resource requirements are satisfied;
- the boss is reached with the expected final resource total;
- the certificate itself has not been altered.

The returned level is marked `certificateVerified:true` only after that replay passes.

## Why this matters for later StarBlox content

The current generator is intentionally question-content agnostic.

Required challenge nodes carry a `questionSlot` with an ordinal and role hint. Later question-selection work can bind exact QuestionVersion hashes into those slots without changing the solvability model.

That allows the Daily factory to eventually do:

1. create a certified gameplay route;
2. bind appropriate questions to its challenge slots;
3. run compatibility/balance checks;
4. freeze the DailyBundle.

## Hint/recovery support

`certifiedNextNode()` returns the next required node in the stored solution trail.

A future hint system can use the certificate first and fall back to a live solver if the player is allowed to alter the board enough to invalidate the original trail, matching the same certified-first/live-fallback idea used by Fruit Box.

## Scope boundary

Step 5 does not:

- alter the current Quest UI;
- select production questions;
- create Daily bundles;
- add balance simulation;
- add remote configuration.

It establishes the provably-solvable procedural level primitive those later steps will use.
