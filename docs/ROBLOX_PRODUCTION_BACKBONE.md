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

## ReplicaService projection

The full persisted learning profile is never replicated to clients.

ReplicaStateService creates a player-specific projection containing only data needed by the client:

- economy;
- visible progress;
- current Daily identity/streak;
- cosmetics/equipment;
- rollout assignments.

FSRS concept state, IRT ability state, completed-Daily history and settings remain server-only.

The replicated table is a separate projection, not the same table reference as Profile.Data, so ReplicaService mutators cannot accidentally corrupt persistent state.

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

## Rojo boundary

roblox/default.project.json maps:

- ReplicatedStorage/StarBlox -> shared modules
- ServerScriptService/StarBlox -> server modules
- StarterPlayerScripts/StarBlox -> client modules

External libraries are dependency-injected into adapters. StarBlox domain code therefore does not depend directly on package installation paths.

## Upstream lineage

ProfileStore:
- MadStudioRoblox/ProfileStore
- 45c9847cbcf1fc260369c50eb335aba7c35aecdd

ReplicaService:
- MadStudioRoblox/ReplicaService
- aaeb1c6bae232b428b07d15f260a0c97b3ef1569

Zap:
- red-blox/zap 0.6.x
- 8cd17ab78192217600eec6f688ed8f8aab18d707

Matter:
- matter-ecs/matter
- f31981ba5dbc481f637c08e9fa3765419d566501

## Scope boundary

Step 3 provides production-ready adapters/contracts but does not vendor or install the third-party Roblox packages into a live place.

That installation can be performed through the Step 2 Studio factory once the actual Roblox project is connected.
