
# Authoritative Multiplayer / Action Runtime — Step 9

Step 9 adds an opt-in competitive/action networking boundary for StarBlox.

It is designed for races, action minigames, PvP-like modes, projectile/raycast interactions, or other shared-world mechanics where default client-owned Roblox character state would be too easy to trust accidentally.

Normal Quest, social, LiveOps, AI NPC, housing, and noncompetitive modes do **not** require this service.

## Source lineage

The networking model is adapted from:

- `MonzterDev/chickynoid-example`
- commit: `87eee0f478c91ef390cba96bc016c49e27d2c3ae`
- MIT

Pinned implementation paths:

- `src/Server/ServerChickynoid.lua`
- `src/Server/Antilag.lua`
- `src/Server/WeaponsServer.lua`
- `src/Client/ClientChickynoid/init.lua`

The concepts retained are:

1. clients submit **input commands**, not authoritative movement results;
2. the server owns accepted sequence/timing state;
3. the server owns authoritative simulation state;
4. clients may predict locally for responsiveness;
5. server snapshots acknowledge the last processed command;
6. clients reset to server truth and replay unconfirmed commands after disagreement;
7. the server keeps a bounded historical position buffer;
8. action validation may rewind to the bounded historical snapshot;
9. weapon specification, line-of-sight checks, damage and outcomes remain server-owned.

StarBlox does not vendor the complete Chickynoid controller in this step. The runtime is adapter-driven so a later experience can use Chickynoid proper, another custom controller, or a StarBlox-specific deterministic movement adapter.

## Server service

`roblox/src/server/MultiplayerActionService.luau` owns the action session.

The service uses a fixed 60 Hz authority clock with bounded catch-up.

For each player it tracks only ephemeral server runtime state:

- last accepted sequence;
- last processed sequence;
- pending commands;
- rolling command-rate receipts;
- bounded command history.

None of this is stored in ProfileStore.

### Input contract

A client command may contain only:

- `Sequence`
- `ClientTick`
- `MoveX`
- `MoveZ`
- `Jump`
- `AimX`
- `AimY`
- `AimZ`
- `ActionCode`
- `TargetUserId`

The client does not send:

- position;
- velocity;
- health;
- damage;
- hit result;
- score;
- reward;
- Coins;
- XP;
- Stars;
- mastery;
- correctness.

Unknown command keys fail closed.

Movement and aim vectors are normalized before they reach a movement/combat adapter.

### Timing / rate protection

The server enforces:

- monotonic sequences;
- bounded sequence gaps;
- a rolling command-per-second limit;
- maximum rewind age;
- small maximum future-tick tolerance;
- future commands remain queued until their server tick.

The client cannot make the server simulate arbitrary time by sending an authored delta time.

## Movement adapter

A competitive mode supplies `MultiplayerAdapters.Movement`.

Required methods:

- `ProcessInput(player, command, fixedDt, serverTick)`
- `GetState(player)`

Optional:

- `Attach(player)`
- `Detach(player)`

`GetState` returns server-owned authoritative state such as:

- `Position`
- `Velocity`
- optional hit radius.

The server never consumes client-authored positions.

This adapter is the seam where a full Chickynoid/custom controller can be installed later.

## Prediction client

`roblox/src/client/ActionPredictionClient.luau` is cosmetic responsiveness only.

The client:

1. creates a numbered input;
2. applies it to its local prediction adapter;
3. transmits the input;
4. retains unconfirmed commands;
5. receives authoritative server state + acknowledgement;
6. resets local state to the server snapshot;
7. replays only commands the server has not acknowledged.

Prediction cannot award damage, score, economy or progression.

## Rollback / anti-lag history

The server records bounded snapshots of server-owned player positions and velocities.

For action validation it selects the latest snapshot at or before the bounded client tick.

History is intentionally finite.

Old client ticks outside the rewind window are rejected rather than allowing arbitrary historical queries.

## Combat validation

A primary action can carry an aim direction and optional target ID as **intent**.

Before damage is possible the server requires:

1. valid player/target session;
2. a server historical snapshot;
3. a server-owned weapon specification;
4. server-calculated distance within range;
5. aim direction inside the server threshold;
6. a combat adapter line-of-sight decision;
7. server-owned damage amount.

Only after all checks pass may the adapter's `ApplyDamage` method run.

The client's target is not treated as a hit claim.

The pure JavaScript authority model additionally tests rewind geometry independently of Roblox.

### Combat adapter

A competitive mode can supply:

- `GetWeaponSpec(player, actionCode)`
- `ValidateLineOfSight(shooter, target, origin, aim, range, rewindTick)`
- `ApplyDamage(shooter, target, serverDamage, context)`

The line-of-sight adapter is responsible for the actual Roblox-world query.

A full Chickynoid integration can use the rewind tick to temporarily position authoritative server hitboxes using its anti-lag implementation before raycasting.

## Typed Zap messages

Step 9 adds:

### SubmitActionInput

Client → Server, unreliable.

High-frequency movement/input does not block reliable state channels if a packet is lost.

### AuthoritativeActionState

Server → Client, unreliable.

Carries:

- server tick;
- acknowledged input sequence;
- server-owned position;
- server-owned velocity.

The client uses it for correction/reconciliation.

### ConfirmedAction

Server → Client, reliable.

Used only for server-confirmed discrete outcomes such as an accepted primary action.

The client never sends the outcome.

## Bootstrap behavior

The multiplayer runtime is optional.

`Bootstrap.start()` creates and starts the authority service only when `dependencies.MultiplayerAdapters` exists.

This matters because StarBlox should not incur FPS-style rollback complexity for ordinary educational/social gameplay.

The client similarly creates `ActionPredictionClient` only when both prediction and network adapters are supplied.

## Pure authority model

`src/robloxMultiplayer/actionAuthorityEngine.js` provides a dependency-free reference implementation used in CI.

It proves:

- intent-only inputs;
- rejection of outcome/state fields;
- movement/aim normalization;
- monotonic command sequences;
- rolling rate budgets;
- bounded rewind/future ticks;
- bounded server snapshot history;
- lag-compensated historical geometry;
- aim/range/target mismatch rejection;
- deterministic/tamper-evident authority state.

This model is not the Roblox physics implementation. It is the trust-contract oracle for the adapter-driven Roblox service.

## Trust boundary

Step 9 intentionally does not:

- trust Humanoid client position for competitive outcomes;
- accept client hit/damage claims;
- let action messages mutate Coins/XP/Stars/mastery;
- let action messages publish content;
- let action messages create marketplace purchases;
- persist rollback snapshots in player profiles;
- force all StarBlox modes to use custom movement.

Competitive modes opt into authority deliberately.

## Step 10 handoff

Step 10 can now build the automated content expansion pipeline on top of:

- Step 1 capability catalog;
- Step 2 AI Development Factory;
- Steps 3–4 Roblox backbone/intelligence runtime;
- Step 5 migration compiler;
- Step 6 LiveOps;
- Step 7 social world;
- Step 8 AI NPCs;
- Step 9 authoritative action runtime.

That pipeline can generate/import a district, wire quest/social/action content, run Studio verification, certify StarBlox intelligence artifacts, and produce a release candidate without granting the agent publish authority.
