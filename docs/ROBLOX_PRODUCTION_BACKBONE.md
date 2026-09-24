# Roblox Production Backbone — Step 3

Step 3 establishes the Roblox runtime boundaries for durable data, replication, typed networking and high-volume world entities.

## ProfileStore persistence

StarBlox player data is stored behind a ProfileStore adapter using:

- StartSessionAsync
- AddUserId
- Reconcile
- OnSessionEnd
- EndSession

The adapter deliberately avoids raw SetAsync/UpdateAsync calls in application code.

The profile contains economy, district/mastery progress, learning state, Daily state, inventory, settings and rollout assignments.

## Replica projection

The full persisted learning profile is never replicated to clients.

StarBlox now uses the maintained `MadStudioRoblox/Replica` runtime, vendored at an exact upstream revision. `ReplicaStateService` creates a player-specific projection containing only data needed by the client:

- economy;
- visible progress;
- current Daily identity/streak;
- cosmetics/equipment;
- rollout assignments.

FSRS concept state, IRT ability state, completed-Daily history and settings remain server-only.

The replicated table is a separate projection, not the same table reference as Profile.Data, so Replica mutators cannot accidentally corrupt persistent state.

Selective subscription is readiness-aware. A player replica is created immediately, but `Subscribe(player)` is only called after `Replica.ReadyPlayers[player]` is true or `Replica.NewReadyPlayer` fires. This prevents the maintained Replica API from dropping an early selective subscription before the client has called `RequestData()`.

The client connects `Replica.OnNew("StarBloxPlayerState", ...)` before the single global `Replica.RequestData()` call.

## Zap network contract

roblox/network/starblox.zap defines narrow messages for:

- SubmitQuestionAttempt
- SubmitReplayChunk
- QuestState
- DailyState
- GhostSample

Client submissions carry intent/evidence, not authoritative outcomes.

Ghost samples are explicitly unreliable because dropping an interpolation sample should not block reliable gameplay traffic.

## Matter ECS

Matter owns ephemeral/high-volume world entities such as:

- NPCs;
- vehicles;
- transforms;
- health;
- quest markers;
- district/world entities;
- replication dirtiness.

Durable player learning/economy state is not stored in ECS.

## Reproducible package and Rojo boundary

`roblox/wally.toml` pins the runtime package aliases to exact versions:

- `Matter = "matter-ecs/matter@0.8.4"`
- `ProfileStore = "lm-loleris/profilestore@1.0.3"`

`roblox/toolchain.lock.json` additionally records the exact upstream revisions, the pinned Wally version, the vendored Replica file Git-blob identities and the Zap v0.6.29 release artifact SHA-256 values.

`roblox/default.project.json` maps:

- `ReplicatedStorage/Packages` -> optional Wally shared packages;
- `ServerScriptService/ServerPackages` -> optional Wally server packages;
- `ReplicatedStorage/ReplicaClient` and `ReplicaShared` -> the pinned vendored Replica client runtime;
- `ServerScriptService/ReplicaServer` -> the pinned vendored Replica server runtime;
- `ReplicatedStorage/StarBlox` -> shared StarBlox modules;
- `ServerScriptService/StarBlox` -> server StarBlox modules;
- `StarterPlayerScripts/StarBlox` -> client StarBlox modules.

`Runtime.server.luau` resolves the installed ProfileStore/Matter packages plus vendored Replica and starts `Bootstrap`. `Runtime.client.luau` starts the client bootstrap against the pinned ReplicaClient.

The domain services remain dependency-injected; only the composition root knows package installation paths.

## Upstream lineage

ProfileStore:
- MadStudioRoblox/ProfileStore
- 45c9847cbcf1fc260369c50eb335aba7c35aecdd

Replica:
- MadStudioRoblox/Replica
- 9cae236aee840b1f436b6b1a63c76f4384e285b7
- vendored with Apache-2.0 license

Zap:
- red-blox/zap v0.6.29
- 8cd17ab78192217600eec6f688ed8f8aab18d707

Matter:
- matter-ecs/matter v0.8.4
- 2604284eca9a67c55c69d180ece4247731f825dd

Wally:
- UpliftGames/wally v0.3.2
- 8fcb1d862fe490909fa21d392b1a6c5cccafdfa8

## Installation / scope boundary

Replica is vendored and mounted directly. ProfileStore and Matter remain package-manager dependencies so their generated package directories stay out of source control.

From the `roblox/` directory, install the exact Wally dependencies before Rojo sync:

```sh
wally install
```

The repository verification command is:

```sh
npm run roblox:backbone:verify
```

It fails if a vendored Replica file drifts from the pinned upstream Git blob, a Wally version pin changes unexpectedly, a required Rojo mount disappears, or the Zap release/toolchain lock becomes malformed.

Zap is pinned as a generator and the `starblox.zap` contract remains authoritative; generated Zap transport modules are the next networking integration layer rather than being treated as handwritten runtime authority.
