
# Authoritative Roblox Action Netcode — Step 9

Step 9 adds a server-authoritative action substrate for competitive StarBlox minigames without replacing ordinary Roblox movement everywhere.

It is intended for modes where fairness, rewindable hit validation and replay-compatible authority matter enough to justify client prediction and reconciliation.

## Source lineage

Primary patterns:

### Chickynoid

Repository: easy-games/chickynoid  
Commit: 8c3b643526f2cd4f3b682a148f654071d530c004  
License: MIT

Relevant paths:

- src/ServerScriptService/Packages/Chickynoid/Server/ServerChickynoid.lua
- src/ServerScriptService/Packages/Chickynoid/Server/Antilag.lua
- src/ReplicatedFirst/Packages/Chickynoid/Client/ClientChickynoid.lua
- src/ReplicatedFirst/Packages/Chickynoid/Shared/Simulation/Simulation.lua

Useful ideas retained:

- client sends input commands, not authoritative position/outcome;
- server sanitizes command timing and movement;
- local prediction for responsiveness;
- server acknowledgement;
- rollback/replay of unacknowledged commands;
- bounded position history for lag compensation;
- simulation state should be derived from explicit command inputs rather than leaking unrelated client state.

### Rewind

Repository: text21/Rewind  
Commit: 1bb0703f20d3b6670f849d08be7a5f7a9977dbfb  
Repository license metadata: unasserted

Relevant paths:

- src/shared/Rewind/Server/SnapshotStore.lua
- src/shared/Rewind/Server/Rewinder.lua
- src/shared/Rewind/Server/Validator.lua
- src/shared/Rewind/Server/MovementValidator.lua
- src/shared/Rewind/Replication/StateBuffer.lua

Useful ideas retained:

- bounded ring-buffer history;
- interpolated rewind sampling;
- server-owned ray/sphere/capsule-style validation;
- movement anomaly bounds;
- one state history usable for both interpolation and rewind.

## Authority boundary

The client may submit only input intent.

### ActionInput

Client -> server, unreliable:

- sequence number;
- client clock sample;
- dt;
- move X/Z;
- jump intent.

The client does not submit:

- position;
- velocity;
- health;
- target;
- damage;
- score;
- outcome.

The server movement adapter processes the bounded input and returns the authoritative state.

### FireAction

Client -> server, reliable:

- request ID;
- server-known weapon ID;
- shot timestamp;
- origin;
- direction.

The client does not submit a target, damage, hit result or health result.

The server:

1. validates the request ID and weapon against server-owned definitions;
2. verifies the shot timestamp is within the rewind window;
3. rewinds the shooter's authoritative position;
4. rejects forged origins;
5. rewinds target positions;
6. performs server geometry occlusion through the WorldRaycast adapter;
7. chooses the nearest valid target;
8. applies damage through a server-owned ApplyDamage adapter;
9. creates the authoritative event.

## Prediction and reconciliation

ActionPredictionController provides a deliberately small client abstraction.

On each local input:

1. assign a monotonically increasing sequence;
2. retain it in a bounded pending buffer;
3. predict locally through an injected cosmetic simulation adapter;
4. send the input intent.

When ActionSnapshot arrives:

1. remove every command acknowledged by the server;
2. apply the authoritative snapshot;
3. replay only unacknowledged commands.

Prediction never becomes gameplay authority.

## Server adapters

AuthoritativeActionService is provider-neutral.

Competitive modes can inject:

### ApplyInput(player, command)

Runs the actual server-owned movement simulation.

It must return:

- Position;
- Velocity;
- Health.

### GetPlayerState(player)

Returns current server-owned state for history initialization/explicit snapshots.

### GetWeaponDefinition(player, weaponId)

Returns server-owned:

- Damage;
- CooldownSeconds;
- MaxRange;
- HitRadius;
- OriginTolerance.

### WorldRaycast(player, origin, vector, shotTime)

Checks current/static world geometry and returns the nearest obstruction.

A fire request fails closed if this adapter is unavailable.

### ApplyDamage(shooter, target, damage, metadata)

Applies the already server-selected damage effect.

The client never controls this value.

## History

The default history window is one second.

Each server player record retains bounded timestamped:

- position;
- velocity;
- health.

Rewind uses linear interpolation between the surrounding server samples.

This is sufficient as a contract layer for competitive minigames; a future high-fidelity character package may substitute Chickynoid's complete collision simulation behind ApplyInput.

## Movement guards

The domain verifier and Roblox service enforce:

- monotonically increasing input sequence;
- bounded client lead;
- bounded old-input lag;
- minimum/maximum dt;
- finite input numbers;
- movement vector magnitude <= configured maximum;
- no client position/health/outcome fields.

The pure JavaScript verifier additionally provides deterministic tests for these rules.

## Hit-validation guards

Step 9 tests prove:

- client target/damage/health/score fields are rejected;
- fire request IDs deduplicate;
- shot timestamps cannot exceed the rewind window;
- future shots are rejected;
- server cooldown is enforced;
- forged origins are rejected;
- world occlusion caps target range;
- target selection comes from server rewind state;
- health change comes from the server weapon definition.

## Matter / Zap integration

Matter gains ephemeral component names:

- ActionActor;
- CombatState;
- Hitbox.

They are not durable ProfileStore state and are not part of the normal ReplicaService player profile.

Zap adds:

- ActionInput — unreliable client intent;
- FireAction — reliable client intent;
- ActionSnapshot — unreliable server state;
- ActionEvent — reliable server result.

## Bootstrap

AuthoritativeActionService is composed by Bootstrap but ActionAdapters are not mandatory for the whole game to boot.

If a mode calls movement/combat methods without the required authoritative adapters, the action service fails closed.

This allows StarBlox social/quest gameplay to remain lightweight while competitive action modes opt into stricter netcode.

## Scope boundary

Step 9 does not:

- replace all Roblox Humanoid movement;
- auto-install the full Chickynoid package;
- trust client character positions;
- trust client hit/damage claims;
- make combat progression/rewards client-controlled;
- award Coins/XP/mastery from an ActionEvent;
- create PvP matchmaking;
- publish a competitive mode automatically.

It establishes the authoritative networking substrate those modes can use.
