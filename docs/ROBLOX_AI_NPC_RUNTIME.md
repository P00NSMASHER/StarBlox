# Roblox AI NPC Runtime — Step 8

Step 8 adds provider-neutral AI NPC conversation and tool-calling without giving the model gameplay authority.

## Source lineage

The Roblox-side reliability patterns are adapted from cortex-rbx/roblox-ai-kit:

- commit: 5ffb0191879f631c86426de063671b3ed031993d
- src/Cortex.lua
- examples/npc.server.lua

Useful upstream ideas retained:

- server-only provider credentials;
- per-player cooldowns;
- bounded per-player memory;
- transient provider failure handling;
- moderation before model use;
- Roblox text filtering before display.

StarBlox adds a stricter tool authority boundary.

## Catalog

Each NPC defines:

- npcId;
- display name;
- personality/system role;
- explicitly allowed tools;
- cooldown;
- memory-turn limit;
- input/output character limits.

The runtime rejects duplicate NPC IDs and rejects dangerous tool names at configuration time.

## Tool policy

The initial safe tool vocabulary is limited to intents such as:

- offerQuest
- explainHint
- startMinigame
- openShop
- setWaypoint
- showCollection
- requestPhotoPose

The model cannot directly call tools that:

- award Coins, XP or Stars;
- change mastery or IRT ability;
- write ProfileStore/DataStore state;
- execute Luau/arbitrary code;
- publish Roblox places;
- claim a Marketplace purchase.

Even allowed tool calls are only requests. The injected server ToolExecutor re-validates them against current StarBlox state.

## Prompt contract

The provider receives:

- NPC personality;
- filtered/bounded player input;
- bounded server-selected player context;
- approved lore rows;
- bounded memory;
- the exact allowed-tool list;
- explicit forbidden-behavior instructions.

The model must return structured JSON containing:

- text
- toolCalls[]

At most three tool calls are accepted per turn.

## Moderation and output filtering

Input moderation is performed before the provider call when a moderator is configured.

Output filtering is mandatory.

The Roblox adapter requires FilterOutput, intended to wrap Roblox TextService filtering before any text is sent to the player.

If filtering fails or produces empty output, the turn fails closed.

## Memory

The pure runtime stores only the configured number of bounded player/NPC turns.

The Roblox runtime stores AiNpc.Memory in ProfileStore.

AiNpc.Memory is classified as durable server-only state and is not present in the player replica.

## Cooldowns

Cooldowns are per player/NPC pair rather than global.

A busy player therefore cannot block NPC responses for other players.

The pure runtime also supports deterministic timestamp-driven cooldown tests.

## Roblox service

AiNpcService is dependency-injected with:

- Provider
- Moderator
- FilterOutput
- ToolExecutor
- NPC Config

The provider is called only on the server.

The service itself does not make direct HTTP requests, so provider secrets and transport implementation remain outside the domain service.

## Network contract

Zap adds:

RequestNpcTalk:
- NpcId
- Message

NpcTalkResponse:
- NpcId
- TurnId
- filtered Text

Clients cannot submit tool calls or reward outcomes.

## Relationship to earlier steps

Step 7 owns persistent NPC friendship/unlocks.

Step 8 can ask the Step 7 server service to start minigames, offer social interactions or set waypoints through approved tools.

Step 6 LiveOps may observe successful server-side outcomes after those tools execute.

The model itself never writes those systems directly.

## Scope boundary

Step 8 does not select a specific commercial LLM vendor or ship an API key.

A production provider may wrap Cortex, an OpenAI-backed server, another hosted model, or a local backend as long as it satisfies the provider contract and server-only filtering/tool rules.
