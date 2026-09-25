# Same-Day StarBlox Goldmine Search — Pass 10

## Search scope

Reviewed 470 Exa result slots across 38 distinct search workstreams, then validated the strongest public GitHub candidates directly against repository metadata, licenses, trees, READMEs and selected implementation files.

Goal: identify repositories that materially improve the odds of producing a convincing StarBlox playable vertical slice in one day or less.

This is a same-day prototype target, not a claim that a production-ready, secure, fully polished commercial release can be completed in one day.

## Strongest new find: bsantanna/roblox-flex-with-friends

Repository: https://github.com/bsantanna/roblox-flex-with-friends
License: GPL-3.0
Status: technically exceptional; direct incorporation requires GPL compatibility review.

Verified implementation:
- 119 Luau source files
- 17 test files
- 6 explorable zones
- WorldService builds terrain/world structure from source
- TrafficService implements spline-based ambient road traffic
- AirTrafficService implements takeoff/cruise/landing aircraft
- HeliTrafficService implements ambient helicopter routes
- QuestService plus data-driven Quest config
- five server-authoritative minigames
- NPC services and customizable NPCs
- phone menu / travel
- ProfileStore-backed persistence
- economy, co-op and anti-exploit systems
- Lune tests, Rojo build, CI, Studio MCP verification
- project-specific AI development skills

This is the closest public GitHub architectural match to StarBlox found so far.

The license is the constraint. GPLv3 is not a permissive drop-in license for a proprietary codebase. Treat as:
1. direct donor only if GPL obligations are acceptable and reviewed; or
2. high-value clean-room architecture/reference source.

## New goldmine: Rorooms/Rorooms

Repository: https://github.com/Rorooms/Rorooms
License: MPL-2.0
Status: strong social-system donor; file-level copyleft obligations apply.

Verified:
- 121 Luau files
- profiles
- avatar selector
- friends UI
- items
- emotes
- settings
- world browser/network
- world teleporters
- player data/session store
- leveling
- reusable UI screens/components
- server/client API
- locked zones and reusable components

Use case:
Rorooms could erase much of the social/profile/emote/items/world-navigation UI layer that StarBlox would otherwise polish separately.

## New goldmine: cortex-rbx/roblox-ai-kit

Repository: https://github.com/cortex-rbx/roblox-ai-kit
License: MIT
Status: small but high-leverage optional module.

Verified:
- server-side AI API
- per-player cooldowns
- retry/backoff
- response cache
- semantic moderation
- Roblox text filtering
- NPC per-player memory
- adaptive dialogue/quest examples

Caveat:
Depends on an external beta service and therefore should not become a hard runtime dependency for the same-day prototype. StarBlox should retain deterministic fallback behavior.

## Major acceleration tool: Meganugger/roblox-studio-mcp

Repository: https://github.com/Meganugger/roblox-studio-mcp
License: MIT

Already discovered earlier, but this search increases its strategic importance.

It can:
- create/open place files
- launch Studio
- create geometry/terrain/UI
- install gameplay scaffolds
- write/patch Luau
- run playtests
- inspect server/client runtime
- read errors/logs
- capture screenshots
- save projects

For a one-day build, this should be treated as an execution backend for the existing StarBlox AI Development Factory rather than as another gameplay donor.

## Official Roblox automation signal

Repository: https://github.com/Roblox/studio-rust-mcp-server
License: MIT

The public reference implementation is no longer actively developed. Roblox states that active development moved to the MCP server built directly into Roblox Studio and recommends the built-in Studio MCP going forward.

Implication:
Prefer Roblox Studio's built-in MCP as the lowest-risk base connection where it provides the required capability; use more capable third-party MCP layers only for missing automation features.

## Useful modern complete-game references

### dnouri/infarmous

Repository: https://github.com/dnouri/infarmous
GitHub license metadata: none
README claims MIT.

Verified:
- 123 Luau files
- 32 tests
- multiplayer player plots
- farming/fishing loops
- NPC shops
- upgrades
- economy
- achievements
- daily gifts
- persistence
- MCPBridge
- Rojo/Lune/Selene/publish workflow

This is a strong code/reference donor but license status should be clarified before direct incorporation because the repository does not expose a recognized LICENSE file through GitHub metadata.

### dnouri/roblox-pi-template

Repository: https://github.com/dnouri/roblox-pi-template
GitHub license metadata: none

High-value workflow:
- AI coding agent
- Rojo live sync
- Lune tests
- Selene/StyLua
- Studio MCP
- asset upload/publish tooling
- AI skill files for Rojo, cloud, asset upload and Studio debugging

Use its workflow ideas unless licensing is clarified.

### WillieTheWhale/Brick_Studio

Repository: https://github.com/WillieTheWhale/Brick_Studio
GitHub license metadata: none

Potential:
- natural-language game generation
- multi-agent planner/builder/scripter/validator
- social, simulator, racing, RPG and tycoon templates
- direct .rbxl/.rbxlx serialization
- 25 test files

Do not make this a dependency until license and practical output quality are verified.

## Existing permissive full-game donor worth elevating

### berezaa/minershaven

Repository: https://github.com/berezaa/minershaven
License: Apache-2.0

Why it matters to same-day StarBlox:
- complete shipped game
- actual .rbxl
- extracted source
- production economy/progression
- item placement
- shops
- daily rewards
- data systems
- large content catalogs

It is less visually aligned with Brookhaven than the other donors, but it is one of the cleanest legally documented complete Roblox game sources available.

## Same-day stack recommendation

### Primary path

1. Existing StarBlox production backbone
   - keep ProfileStore, learning/mastery, Star Coin/XP, authoritative networking and release gates.

2. Authorized Brookhaven source
   - use as the visual/world/content base.

3. Arnis
   - only where additional roads/world/streaming are needed.

4. Robbing Simulator
   - selectively reuse security-reviewed NPC/event/housing server patterns.

5. Roblox built-in Studio MCP + Meganugger MCP capabilities
   - automate build, playtest, inspect, screenshot, repair.

6. Flex-with-Friends as architecture reference
   - reproduce the useful quest, traffic, minigame, phone/travel and child-social patterns natively unless GPL use is explicitly acceptable.

7. Rorooms selectively
   - social/profile/items/emotes/world UI where MPL obligations fit.

## What can plausibly fit in one day

A convincing vertical slice could reasonably target:
- one polished Brookhaven-derived district
- player spawn + avatar
- one home
- one usable vehicle
- ambient traffic
- 3–5 NPCs
- 2–3 educational missions
- Star Coin/XP rewards
- one shop
- one minigame
- save/rejoin
- mobile HUD
- parent-facing evidence hook
- automated playtest/screenshot verification

Do not target in the same day:
- complete Brookhaven-scale content parity
- dozens of jobs
- full build-mode editor
- complete live-ops economy
- exhaustive mobile/performance certification
- public production release without security/provenance review

## Bottom-line finding

The fastest credible route is no longer to keep searching for a single complete StarBlox clone.

The best acceleration is a hybrid:

AUTHORIZED BROOKHAVEN WORLD
+ STARBLOX BACKBONE
+ ROBBING SIMULATOR SERVER PATTERNS
+ FLEX-WITH-FRIENDS ARCHITECTURE
+ ROBLOX / MEGANUGGER STUDIO MCP AUTOMATION
= SAME-DAY VERTICAL-SLICE TARGET

The most valuable new discovery in this pass is **Flex-with-Friends**, because its gameplay shape is unusually close to StarBlox and its source verifies the README claims. Its GPL-3.0 license is the reason it should default to reference architecture rather than direct proprietary incorporation.
