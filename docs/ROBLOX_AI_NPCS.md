
# Roblox AI NPC Runtime — Step 8

Step 8 adds AI-driven NPC dialogue to StarBlox without giving the model authority over progression, rewards, publishing, moderation, or executable code.

## Source lineage

Primary Roblox-native source patterns:

- repository: cortex-rbx/roblox-ai-kit
- commit: 5ffb0191879f631c86426de063671b3ed031993d
- src/Cortex.lua
- examples/npc.server.lua
- MIT

StarBlox retains the useful production patterns:

- server-side model calls;
- per-player cooldowns;
- bounded memory;
- input moderation;
- mandatory Roblox-safe output filtering;
- multiplayer-correct per-player state.

StarBlox deliberately narrows model authority beyond the upstream example.

## Runtime boundary

AiNpcService is server-only.

The Roblox client submits only:

- NPC ID;
- request ID;
- player message.

The client does not supply:

- system prompt;
- memory;
- quest answer/correctness;
- rewards;
- progression;
- tool permissions;
- model identity;
- moderation decisions.

The server returns only the filtered NPC text plus request/NPC identity.

## Required adapters

AI NPC behavior is optional at boot.

The server does not require an AI vendor for the rest of StarBlox to start.

When RequestTurn is used, it fails closed unless the injected AiNpcAdapters provide:

### ModelProvider.Generate(request)

Receives the server-owned model request.

Secrets/API keys remain inside the provider implementation or backend.

AiNpcService itself performs no direct HTTP call.

### TextPolicy.ModerateInput(player, message)

Must return an approved bounded input or reject the turn.

### TextPolicy.FilterOutput(player, text)

Must return the display-safe Roblox-filtered response.

Unfiltered model output is never accepted as a successful turn.

## Model context

The model receives a bounded server-owned projection:

- NPC system prompt;
- NPC ID;
- request ID;
- approved persistent memory facts;
- knowledge tags;
- allowlisted tool names;
- a narrow game-state projection.

Permitted game context fields are limited to:

- district;
- questId;
- dailyId;
- npcAffinity;
- friendshipLevel;
- activeMinigame;
- learningNeed;
- roleHint.

Player IDs, canonical answers, selected answers, rewards and other authority-bearing state are not part of the model request.

## Tools

Each NPC declares an explicit allowlist.

Recommended tool vocabulary includes read/navigation/action-request operations such as:

- quest_hint;
- social_status;
- start_minigame;
- set_waypoint;
- open_ui.

The model cannot invent tools.

Tool names associated with authoritative or dangerous capabilities are rejected, including reward/currency/XP/mastery, purchase/spend, publish/deploy, executable script/code, DataStore/admin/moderation, direct HTTP, secrets or credentials.

Tool arguments and tool results are recursively checked for authority-bearing keys.

The current flow permits one bounded tool phase followed by a final model response.

The final response may not request another tool, preventing unbounded autonomous loops.

Tool handlers are server-owned injected functions. A model tool call is only a request to those functions.

## Persistent memory

ProfileStore gains server-only:

AiNpc.Memories
AiNpc.ProcessedRequestIds

Raw conversation history is not persisted.

The model may propose short memory facts, but no fact is persisted unless:

1. it passes StarBlox's basic sensitive-data filter;
2. the injected MemoryPolicy.AllowFact explicitly approves it;
3. the player's ProfileStore session is still active.

Current built-in rejection patterns cover obvious:

- URLs;
- email/handle-like strings;
- long numeric identifiers;
- Discord/Snapchat contact details;
- phone/address requests;
- real-name/school-name facts;
- passwords.

Memory is bounded per NPC.

Processed request IDs are bounded and provide durable replay/deduplication protection.

Neither memories nor request receipts are included in the player ReplicaService projection.

## Concurrency

The service guards:

- per-player/per-NPC cooldowns;
- in-flight duplicate request IDs;
- durable completed request IDs.

After external model/tool work completes, the service re-fetches the player's ProfileStore session and verifies that the exact session is still active before persisting memory.

## Two-phase tools

A model response can request bounded tools.

StarBlox:

1. validates each requested tool;
2. executes its server-owned handler;
3. validates the tool result;
4. asks the model for one final answer with those results;
5. rejects any additional tool requests in that final answer;
6. filters the final output through the server text policy.

The model never receives a general code-execution primitive.

## Relationship to Step 7

AI NPC dialogue can use Step 7 social state through the ContextBuilder and safe tool handlers.

Examples:

- a guide can read friendship level;
- an NPC can request the server to start a permitted social minigame;
- a quest-giver can ask the authoritative quest system for a hint;
- a guide can set a client waypoint through a bounded handler.

NPC dialogue itself does not award affinity, Coins, XP, mastery or quest completion.

Those remain server-authoritative events.

## Network contract

Typed Zap contracts add:

RequestNpcTurn
- client -> server
- NpcId
- RequestId
- Message

NpcTurn
- server -> client
- NpcId
- RequestId
- filtered Text

No memory or tool payload is sent to the client.

## Tests

Step 8 tests prove:

- model context excludes player/answer authority;
- dangerous tool vocabularies are rejected;
- tool arguments cannot carry reward/correctness/code authority;
- tool loops are bounded;
- final responses cannot request additional tools;
- persistent memory rejects obvious contact/sensitive facts;
- raw conversation is not persisted by the domain layer;
- request IDs deduplicate memory commits;
- Roblox runtime requires model/moderation/filter adapters;
- AI state is server-only;
- ProfileStore session is revalidated after asynchronous model work;
- Bootstrap does not make an external AI provider mandatory for the rest of the game.

## Scope boundary

Step 8 does not:

- configure a production AI API key;
- make an external vendor mandatory;
- grant NPCs arbitrary Luau execution;
- allow AI-generated rewards or correctness decisions;
- publish AI-generated quests directly;
- expose player learning state to the model;
- store raw chat transcripts;
- bypass Roblox text filtering.

Production model/vendor selection remains an injected adapter and can be controlled with the existing Step 18-style rollout/kill-switch foundations.
