# Roblox Social World — Step 7

Step 7 turns StarBlox from a quest-only runtime into a persistent social-world foundation while preserving the Step 3 authority boundaries.

## Source lineage

The social-service architecture is informed by roblox-flex-with-friends:

- repository: bsantanna/roblox-flex-with-friends
- commit: f23ff0b06c759e60aa651a6618a8d81692719fc9
- src/server/services/FollowerService.lua
- src/server/services/NpcService.lua
- src/server/services/PhotoService.lua
- src/server/services/MinigameService.lua

Server-side placement concepts are informed by PlacementService:

- repository: zblox164/PlacementService
- commit: 7e414eb8fa406eb2376a01d478236e206c733a5f
- PlacementService.lua
- Apache-2.0

StarBlox adapts the patterns to ProfileStore, ReplicaService, Matter ECS, typed Zap networking and the Step 6 LiveOps shell.

## Persistent home state

Player profiles now contain:

- selected plot ID;
- placed furniture/world items;
- NPC affinity;
- unlocked social items;
- photo/minigame statistics;
- completed social-minigame session IDs.

The player replica exposes visible housing/friendship state while completed session IDs stay server-side.

## Placement authority

The pure social-world engine validates:

- known placeable item IDs;
- per-home item limits;
- global placement limits;
- plot ownership consistency;
- placement radius;
- unique placement IDs.

The Roblox SocialWorldService accepts an injected PlacementValidator so the live game can add collision, plot bounds, ownership and Brookhaven-specific placement rules.

Clients submit placement intent only.

The server chooses whether a placement is accepted and writes the durable placement record.

## NPC friendship

NPC affinity changes only through AwardNpcAffinity.

Affinity thresholds unlock social items such as:

- photo poses;
- follower behavior;
- cosmetics;
- minigame access;
- dialog branches.

Event IDs can be used by the pure domain layer to deduplicate affinity awards.

The Roblox service can forward authoritative friendship progress into Step 6 LiveOps.

## Social minigames

Only one social minigame may be active for a player at a time.

Sessions have a server-generated ID.

A minigame result must come from the server/plugin implementation rather than a client-provided reward.

Completed session IDs are retained to prevent replaying the same session for rewards.

Winning can emit the authoritative social_minigame_win LiveOps event.

## Photo / co-op hooks

The pure engine includes a server-observation co-op predicate based on:

- player positions;
- maximum distance;
- facing-vector similarity.

The client does not choose who qualifies as a co-op participant.

The Roblox service records photo statistics from a server observation and emits photo/coop_photo LiveOps events.

## Matter ECS

Placed objects and NPC/world presentation remain compatible with the Step 3 ECS boundary.

Durable ownership, affinity and home layout remain in ProfileStore rather than ECS.

## Network contract

Zap now includes narrow intents for:

- RequestPlaceItem
- RequestRemoveItem
- RequestSocialMinigame

and a server-owned SocialWorldState notification.

No client message contains authoritative reward values or NPC affinity changes.

## Brookhaven relationship

Step 5 migration units tagged housing, vehicles, UI, social or placement can now target this social-world layer.

The migration layer still stages/quarantines licensed systems first.

Step 7 does not automatically activate a migrated Brookhaven model or trust its legacy persistence/remotes.

## Scope boundary

Step 7 establishes social-world state and authority contracts.

It does not yet add LLM-driven NPC dialog; that is Step 8.

It also does not replace character networking with an authoritative action stack; that is Step 9.
