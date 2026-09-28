# Lane 03 executable integration contract — v1

Foreground kickoff owns the foundation files on `lantern-lane-03-20260928`. Reuse this branch/PR; do not recreate the protocol. The sole canonical integrator remains lane02. This foundation is NOT a finished mission and must not be represented as a playable six-mission game.

## Build boundary
`default.project.json` maps only `src/shared`, `src/server`, and `src/client` underneath this isolated directory. `servePlaceIds: [0]` restricts accidental live sync to an unpublished place. Do not edit that list to point to old StarBlox. The server additionally rejects its known old place and universe. No automatic publishing is included. The grass platform/spawn is only a safe bootstrap surface, not the finished island art.

## Transport
Protocol version 1. RemoteEvent folder `ReplicatedStorage.LanternIslandRemotes`, remotes `Action` and `State`. Every mutation is server-authoritative. Requests use `requestId` (1–64 identifier characters), `action`, and the action-specific fields below. Extra fields are rejected.

- `GetState`: no additional fields; read-only handshake, not a save or reward operation.
- `StartMission`, `RequestHint`, `CancelMission`: `missionId` only.
- `SubmitAnswer`: `missionId`, `payload = { activityId, contentVersion, answer }`. Answer is a bounded string, finite integer, or `{tens, ones}` with ones 0–9. Server owns the active activity, version, hint history, correctness, proximity and entitlement checks. Do not accept client success flags.
- `EquipItem`: `itemId`; RewardService checks ownership.

Packets: `{requestId?, ok, code, sequence, state}`. The monotonically increasing session `sequence` prevents late packets from reverting client state. Outcome codes are bounded identifiers, never raw error text or submitted answers. A 12-second client timeout means `ACK_UNCONFIRMED`, not that the server operation failed. No automatic mutation retry. `GetState` reads the latest state after uncertain acknowledgments. New mutations stay blocked until the uncertain result or an idle refreshed state arrives.

The runtime provides an eight-token/four-per-second per-player limiter and a 64-entry replay cache. **These are same-session transport protections, not proof of durable exactly-once rewards.** Lane08 must separately persist and test mission/reward entitlement IDs across reconnects and concurrent saves. Evicted request IDs must not permit a second entitlement.

## Server modules
Every module exports `.new(context)` and returns the instance below. Constructors must not read other instances before all constructors finish. Context contains `services`, `protocol`, `isStudio`, `buildId`, `serverRoot`, `dataStoreNamespace = "LanternIsland_DEV_v1"`, and `publish(player)` (safe state push). No production data store migration is authorized.

- `ProfileService`: `:load(player) -> boolean, code?`, `:publicState(player) -> {currency, ownedItemIds (array of strings), equippedItemId, saveStatus}`, `:release(player)`. A failed load blocks mutation; no default-overwrite fallback. Release must serialize with in-flight transactions and be idempotent for concurrent leave/close paths.
- `LessonService`: `:publicState(player) -> {id, version, title, sourceLabel, reviewStatus}`. Additional private methods can serve MissionService. Never replicate answer keys or private sources.
- `WorldBuilder`: `:build()`, optional `:removePlayer(player)`. MissionService calls any agreed world-result method directly only after validated outcomes. Once the real island exists, lane02 may remove the clearly named foundation platform/spawn.
- `RewardService`: `:handle(player, request) -> {ok:boolean, code:string}` for EquipItem. Expose a separate server-only, durable entitlement function for MissionService. Never accept a client-provided balance/award.
- `MissionService`: `:handle(player, request) -> {ok:boolean, code:string}`, `:publicState(player) -> public activity snapshot`. It coordinates answer checking, acknowledged world change and reward entitlement with the other services.

Public mission snapshot scalar fields: `missionId`, `activityId`, `contentVersion`, `activityType`, `title`, `objective`, `prompt`, `passage`, `status`, `hint`, `assistance`, `completedCount`. Optional public `representation` keys: `tensA`, `onesA`, `tensB`, `onesB`, `operation`, `displayWord`, `audioAssetId`. Optional `options` is at most 12 `{id,label}` entries. Source answer keys and arbitrary extra fields are stripped at the transport boundary. A displayed word must be marked as copied practice, not independent spelling. Request new public fields in this contract rather than serializing full server objects.

## Client modules
Each exports `.new(context)`, returns an instance with `:destroy()`, optional `:mount(playerGui)`. UIController also implements `:render(state)`. UIController and InteractionController are required before the startup diagnostic disappears. Spelling, Reading and Feedback controllers attach when present.

Client context: `player`, `playerGui`, `protocol`, `getState()`, `send(action, fields) -> requestId?, code`, and signals `stateChanged`, `resultReceived`, `pendingChanged`. Subscribe with `context.stateChanged:Connect(...)`; remove subscriptions in `:destroy()`. All button paths use `context.send` and wait for authoritative outcomes. UI owns layout; subject controllers must not make competing global screens. Main owns networking, timeout and duplicate suppression.

## Evidence limits
Luau CLI behavior tests can prove pure protocol functions; Rojo can prove packaging. Neither proves Roblox engine execution, actual UI input, DataStore persistence, physical-phone behavior or child fun. Those remain separate lane14/15 checks on the exact integrated candidate.
