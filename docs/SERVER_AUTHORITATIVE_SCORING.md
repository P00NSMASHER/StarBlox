# Server-authoritative scoring boundary

Step 4 defines what a future StarBlox backend may trust.

The current app remains a client-only React/Vite application. This step does not invent a hosting provider or deploy an API before the backend decision exists. Instead it provides a Node/server-safe scoring core in `server/authoritativeScoring.js` that a later API adapter can call.

## Source lineage

The trust model is directly adapted from Atlas WorldGuesser at commit:

`419aad1fca7d50135c7123c9ad6da885873bd07d`

Primary paths:

- `convex/solo.ts`
- `convex/dailyChallenge.ts`
- `convex/challenges.ts`

Atlas's mature solo path follows the same rule adopted here: the server owns the hidden truth and the client submits only its choices/guesses.

The older challenge path also documents a skipped-round bug class. StarBlox therefore requires an exact contiguous ordinal set where a multi-item submission represents a server-issued sequence.

## Question submissions

Trusted server context owns:

- authenticated player ID;
- question session ID;
- canonical question ID;
- exact QuestionVersion;
- exact content hash;
- retry state;
- session start time;
- Daily/game context;
- current player progress/mastery state.

The client is allowed to submit only:

- `sessionId`;
- `attemptId` (idempotency key);
- `selectedAnswer`.

The client may **not** submit:

- correctness;
- canonical answer;
- reward amounts;
- mastery;
- score;
- player identity;
- question identity/version/hash.

Unknown fields are rejected instead of ignored so a future API cannot accidentally grow an unsafe trust surface.

Correctness, feedback, rewards, mastery evidence, transfer evidence, and progress deltas are recomputed from the canonical question and trusted player state.

## Gameplay submissions

Trusted server context owns:

- authenticated player ID;
- game session ID;
- seed;
- deterministic engine version;
- initial state;
- simulation budget/limits;
- reducer/rules;
- summary/scoring function.

The client may submit only:

- `sessionId`;
- the Step 3 replay recording.

The replay is evidence, not authority.

Before re-simulation the authority layer checks that the replay's seed and engine version exactly match the server-issued session. Step 3 then proves the initial-state hash and replays the action stream.

Leaderboard/progression code must consume `authoritativeSummary`, which is built from re-simulated server state. It must not consume a client-provided score or final state.

## Complete ordinal submissions

For server-issued multi-round content, StarBlox requires exactly one item for each ordinal in `1..N`.

Bounds + uniqueness are not enough. A submission such as rounds `1,2,4` is invalid even though every submitted round is unique.

This prevents clients from omitting a failed round while still claiming later success.

## Persistence requirements for the eventual API adapter

The pure scoring core cannot enforce database atomicity by itself. The backend adapter must:

1. authenticate the player independently of request fields;
2. load the server-owned session;
3. reject expired/consumed sessions;
4. rate-limit the player/action;
5. score using this authority module;
6. atomically persist the attempt/result and mark the session consumed;
7. use an idempotency key so retries cannot duplicate rewards.

No persistence implementation is added in Step 4 because StarBlox does not yet have a selected backend.

## Scope boundary

Step 4 does not:

- deploy a backend;
- migrate existing local saves;
- change the current Quest UI;
- create leaderboards;
- make punitive cheating decisions.

It creates the trust boundary those later systems can safely depend on.
